/**
 * Apply DoC URL backfill to lib/data/bonuses.ts and lib/data/savingsBonuses.ts.
 *
 * Input:  scripts/backfill-doc/_research-result.json — array of
 *         {id, doc_url, confidence, note} produced by the research agent.
 * Output: in-place edits to the two data files. Only high+medium-confidence
 *         URLs are applied. Already-present URLs are skipped silently.
 *
 * Strategy: surgical text edit. For each target bonus, locate its object by
 * matching `"id": "<id>"` and scan forward for `"source_links": [ ... ]`,
 * then splice in the new URL just before `]`. This preserves the file's
 * existing formatting (mixed indentation, comments, etc.) instead of
 * round-tripping through JSON.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"

type ResearchEntry = {
  id: string
  doc_url: string | null
  confidence: "high" | "medium" | null
  note: string
}

const MANIFEST = "/Users/nathaniel/stacks-gpt/scripts/backfill-doc/_research-result.json"
const FILES = [
  "/Users/nathaniel/stacks-gpt/lib/data/bonuses.ts",
  "/Users/nathaniel/stacks-gpt/lib/data/savingsBonuses.ts",
]

if (!existsSync(MANIFEST)) {
  console.error(`Missing ${MANIFEST}`)
  process.exit(1)
}

const entries: ResearchEntry[] = JSON.parse(readFileSync(MANIFEST, "utf8"))
const applyable = entries.filter(
  (e) => e.doc_url && (e.confidence === "high" || e.confidence === "medium"),
)
console.log(
  `[backfill] ${entries.length} research entries, ${applyable.length} applyable (high/medium confidence with URL)`,
)

type EditReport = {
  id: string
  file: string | null
  status: "applied" | "already-present" | "not-found" | "parse-error"
  doc_url: string
  note: string
}

const report: EditReport[] = []

for (const file of FILES) {
  let text = readFileSync(file, "utf8")
  let changed = false

  for (const e of applyable) {
    if (!e.doc_url) continue
    // Find id anchor. bonuses.ts uses `"id": "x"` (quoted JSON-style);
    // savingsBonuses.ts uses `id: "x"` (TS property style). Support both.
    const idPattern = new RegExp(`"?id"?\\s*:\\s*"${escapeRegex(e.id)}"`)
    const idMatch = text.match(idPattern)
    if (!idMatch || idMatch.index === undefined) continue // try next file

    // Find the next source_links array (same dual syntax).
    const from = idMatch.index
    const slPattern = /"?source_links"?\s*:\s*\[/g
    slPattern.lastIndex = from
    const slMatch = slPattern.exec(text)
    if (!slMatch) {
      report.push({
        id: e.id,
        file,
        status: "parse-error",
        doc_url: e.doc_url,
        note: `found id anchor but no source_links block`,
      })
      continue
    }

    // Scan forward to find the matching `]`. Source links contain strings
    // only (no nested arrays/objects), so we just walk forward tracking
    // string state and depth=1 until we hit the closing bracket.
    const arrayStart = slMatch.index + slMatch[0].length
    const closeIdx = findArrayClose(text, arrayStart)
    if (closeIdx < 0) {
      report.push({
        id: e.id,
        file,
        status: "parse-error",
        doc_url: e.doc_url,
        note: `unterminated source_links array`,
      })
      continue
    }

    const arrayBody = text.slice(arrayStart, closeIdx)
    if (arrayBody.includes(e.doc_url)) {
      report.push({
        id: e.id,
        file,
        status: "already-present",
        doc_url: e.doc_url,
        note: e.note,
      })
      continue
    }

    // Determine insertion style. If the existing entries end with a comma
    // (trailing comma), just append `\n  "url"`. Otherwise append `,\n  "url"`.
    // Also detect leading indentation from the line of the first list entry.
    const trimmed = arrayBody.replace(/\s+$/, "")
    const needsComma = trimmed.length > 0 && !trimmed.endsWith(",") && !trimmed.endsWith("[")
    // Find indentation: look at the line containing the closing bracket and
    // add a level.
    const lineStart = text.lastIndexOf("\n", closeIdx) + 1
    const closeLineIndent = text.slice(lineStart, closeIdx).match(/^\s*/)?.[0] ?? "  "
    const itemIndent = closeLineIndent + "  "
    const inserted = `${needsComma ? "," : ""}\n${itemIndent}"${e.doc_url}"\n${closeLineIndent}`

    text =
      text.slice(0, closeIdx) +
      (needsComma
        ? `,\n${itemIndent}"${e.doc_url}"\n${closeLineIndent}`
        : `\n${itemIndent}"${e.doc_url}"\n${closeLineIndent}`) +
      text.slice(closeIdx).replace(/^\s*/, "")

    void inserted // keep type happy
    changed = true
    report.push({
      id: e.id,
      file,
      status: "applied",
      doc_url: e.doc_url,
      note: e.note,
    })
  }

  if (changed) {
    writeFileSync(file, text)
    console.log(`[backfill] wrote ${file}`)
  }
}

// Any applyable entry whose id was not found in either file
const found = new Set(report.map((r) => r.id))
for (const e of applyable) {
  if (!found.has(e.id)) {
    report.push({
      id: e.id,
      file: null,
      status: "not-found",
      doc_url: e.doc_url ?? "",
      note: e.note,
    })
  }
}

writeFileSync(
  "/Users/nathaniel/stacks-gpt/scripts/backfill-doc/_apply-report.json",
  JSON.stringify(report, null, 2),
)

const applied = report.filter((r) => r.status === "applied")
const already = report.filter((r) => r.status === "already-present")
const missing = report.filter((r) => r.status === "not-found")
const errs = report.filter((r) => r.status === "parse-error")

console.log()
console.log(`=== Backfill summary ===`)
console.log(`  Applied:         ${applied.length}`)
console.log(`  Already present: ${already.length}`)
console.log(`  Not found:       ${missing.length}`)
console.log(`  Parse error:     ${errs.length}`)
console.log(`  Skipped (null or low confidence): ${entries.length - applyable.length}`)
if (applied.length) {
  console.log(`\nApplied:`)
  for (const r of applied) console.log(`  ✓ ${r.id} → ${r.doc_url}`)
}
if (errs.length) {
  console.log(`\nParse errors:`)
  for (const r of errs) console.log(`  ✗ ${r.id} — ${r.note}`)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findArrayClose(src: string, start: number): number {
  let depth = 1
  let i = start
  let inString = false
  let escape = false
  while (i < src.length) {
    const c = src[i]
    if (inString) {
      if (escape) escape = false
      else if (c === "\\") escape = true
      else if (c === '"') inString = false
    } else {
      if (c === '"') inString = true
      else if (c === "[") depth++
      else if (c === "]") {
        depth--
        if (depth === 0) return i
      }
    }
    i++
  }
  return -1
}
