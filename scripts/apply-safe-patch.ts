/**
 * Apply verification-output/safe-patch.json to lib/data/bonuses.ts (and
 * savingsBonuses.ts). Each entry targets a single field on a single bonus id
 * and swaps the from → to value. Intended to be run AFTER human review of
 * verification-output/triage.md — this script does not re-judge anything.
 *
 * Usage:
 *   npx tsx scripts/apply-safe-patch.ts              # dry run, prints diff
 *   npx tsx scripts/apply-safe-patch.ts --write      # actually edit files
 *
 * Safety:
 *   - Refuses to apply if stored value in the file doesn't match `from`.
 *   - Leaves a report at verification-output/apply-safe-patch-report.json.
 *   - Does NOT touch source_links (that's handled by backfill-doc).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"

type Edit = { id: string; path: string; from: unknown; to: unknown; reason?: string }

const PATCH = "/Users/nathaniel/stacks-gpt/verification-output/safe-patch.json"
const FILES = [
  "/Users/nathaniel/stacks-gpt/lib/data/bonuses.ts",
  "/Users/nathaniel/stacks-gpt/lib/data/savingsBonuses.ts",
]
const WRITE = process.argv.includes("--write")

if (!existsSync(PATCH)) {
  console.error(`Missing ${PATCH} — run scripts/triage-edits.ts first.`)
  process.exit(1)
}

const edits: Edit[] = JSON.parse(readFileSync(PATCH, "utf8"))
console.log(`Loaded ${edits.length} safe edits from ${PATCH}`)
console.log(`Mode: ${WRITE ? "WRITE (modifies files)" : "DRY RUN (no changes)"}\n`)

type Report = {
  id: string
  path: string
  file: string | null
  status: "applied" | "from-mismatch" | "not-found" | "parse-error" | "dry-run"
  from: unknown
  to: unknown
  actualStored?: unknown
}

const report: Report[] = []

for (const file of FILES) {
  let text = readFileSync(file, "utf8")
  let changed = false

  for (const e of edits) {
    // Find the bonus object by id (dual syntax: "id": "x" or id: "x").
    const idRe = new RegExp(`"?id"?\\s*:\\s*"${escapeRegex(e.id)}"`)
    const idMatch = text.match(idRe)
    if (!idMatch || idMatch.index === undefined) continue

    // Find the object boundary: next top-level "{" that starts the bonus object
    // and its matching "}". We anchor by walking back from the id to the nearest
    // opening brace, then forward to the matching close.
    const idIdx = idMatch.index
    const objStart = findObjectStart(text, idIdx)
    const objEnd = findObjectEnd(text, objStart)
    if (objStart < 0 || objEnd < 0) {
      report.push({ id: e.id, path: e.path, file, status: "parse-error", from: e.from, to: e.to })
      continue
    }
    const obj = text.slice(objStart, objEnd + 1)

    // Find the exact field expression inside the object.
    const leaf = e.path.split(".").pop()!
    const fieldRe = new RegExp(
      `"?${escapeRegex(leaf)}"?\\s*:\\s*(true|false|null|-?\\d+(?:\\.\\d+)?|"(?:[^"\\\\]|\\\\.)*")`,
    )
    const fm = obj.match(fieldRe)

    // Special case: a "from: false → to: X" edit for a field that doesn't yet
    // exist. Treat as insert. Only auto-insertable for simple top-level flags
    // at dotted-path depth=1 (e.g. `expired`), never for nested paths.
    if (!fm && e.path.split(".").length === 1 && e.from === false) {
      const newLiteral = serializeLiteral(e.to)
      // Insert before the closing `}`. Preserve existing indentation style
      // by peeking at the line preceding the close brace.
      const lineBeforeClose = text.slice(text.lastIndexOf("\n", objEnd - 1) + 1, objEnd)
      const closeIndent = lineBeforeClose.match(/^\s*/)?.[0] ?? "  "
      const itemIndent = closeIndent + "  "
      const tailNeedsComma = !/[,{]\s*$/.test(text.slice(objStart, objEnd).trimEnd())
      const insertion = `${tailNeedsComma ? "," : ""}\n${itemIndent}${leaf}: ${newLiteral}\n${closeIndent}`
      text = text.slice(0, objEnd) + insertion + text.slice(objEnd)
      changed = true
      report.push({
        id: e.id,
        path: e.path,
        file,
        status: WRITE ? "applied" : "dry-run",
        from: e.from,
        to: e.to,
      })
      continue
    }

    if (!fm || fm.index === undefined) {
      report.push({ id: e.id, path: e.path, file, status: "parse-error", from: e.from, to: e.to })
      continue
    }
    const rawValue = fm[1]
    const parsed = parseLiteral(rawValue)

    if (!sameValue(parsed, e.from)) {
      report.push({
        id: e.id,
        path: e.path,
        file,
        status: "from-mismatch",
        from: e.from,
        to: e.to,
        actualStored: parsed,
      })
      continue
    }

    const newLiteral = serializeLiteral(e.to)
    const before = fm[0]
    const after = before.replace(rawValue, newLiteral)
    const fieldIdx = objStart + fm.index
    text = text.slice(0, fieldIdx) + after + text.slice(fieldIdx + before.length)
    changed = true
    report.push({
      id: e.id,
      path: e.path,
      file,
      status: WRITE ? "applied" : "dry-run",
      from: e.from,
      to: e.to,
    })
  }

  if (changed && WRITE) {
    writeFileSync(file, text)
    console.log(`wrote ${file}`)
  }
}

// Any edit id that wasn't found in either file
const seen = new Set(report.map((r) => r.id + "|" + r.path))
for (const e of edits) {
  const k = e.id + "|" + e.path
  if (!seen.has(k)) {
    report.push({ id: e.id, path: e.path, file: null, status: "not-found", from: e.from, to: e.to })
  }
}

writeFileSync(
  "/Users/nathaniel/stacks-gpt/verification-output/apply-safe-patch-report.json",
  JSON.stringify(report, null, 2),
)

const counts = {
  applied: report.filter((r) => r.status === "applied").length,
  dryRun: report.filter((r) => r.status === "dry-run").length,
  fromMismatch: report.filter((r) => r.status === "from-mismatch").length,
  notFound: report.filter((r) => r.status === "not-found").length,
  parseError: report.filter((r) => r.status === "parse-error").length,
}
console.log(`\n=== Report ===`)
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(15)} ${v}`)
console.log(`\nFull report: verification-output/apply-safe-patch-report.json`)

if (counts.fromMismatch > 0) {
  console.log(`\n⚠ ${counts.fromMismatch} edit(s) skipped because stored value doesn't match "from":`)
  for (const r of report.filter((x) => x.status === "from-mismatch")) {
    console.log(`   ${r.id} ${r.path}: stored=${JSON.stringify(r.actualStored)} expected=${JSON.stringify(r.from)}`)
  }
}

// ── helpers ───────────────────────────────────────────────────────────────
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findObjectStart(text: string, from: number): number {
  let depth = 0
  for (let i = from; i >= 0; i--) {
    const c = text[i]
    if (c === "}") depth++
    else if (c === "{") {
      if (depth === 0) return i
      depth--
    }
  }
  return -1
}

function findObjectEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (esc) esc = false
      else if (c === "\\") esc = true
      else if (c === '"') inString = false
    } else {
      if (c === '"') inString = true
      else if (c === "{") depth++
      else if (c === "}") {
        depth--
        if (depth === 0) return i
      }
    }
  }
  return -1
}

function parseLiteral(raw: string): unknown {
  if (raw === "true") return true
  if (raw === "false") return false
  if (raw === "null") return null
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw)
    } catch {
      return raw.slice(1, -1)
    }
  }
  return raw
}

function serializeLiteral(v: unknown): string {
  if (v === null) return "null"
  if (typeof v === "boolean") return v ? "true" : "false"
  if (typeof v === "number") return String(v)
  if (typeof v === "string") return JSON.stringify(v)
  throw new Error(`unsupported literal: ${JSON.stringify(v)}`)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === "number" && typeof b === "number") return a === b
  // null vs null
  if (a === null && b === null) return true
  return false
}
