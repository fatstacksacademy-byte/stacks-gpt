/**
 * Shared catalog file patcher. Extracted from scripts/apply-safe-patch.ts so
 * both that script and the new scripts/apply-decisions-to-catalog.ts can use
 * the same battle-tested mutation logic.
 *
 * Strategy: regex-find the bonus/card object by id, regex-find the leaf
 * field within, refuse to mutate if the existing literal doesn't match the
 * caller's `from` value, then surgical string replacement that preserves all
 * surrounding formatting + comments.
 *
 * Only supports scalar values (boolean / null / number / string). Array
 * indices and nested objects aren't handled — those would need a different
 * approach.
 */

export type Edit = {
  id: string
  path: string // leaf field name today (e.g. "bonus_amount", "fees.monthly_fee" — only leaf used)
  from: unknown
  to: unknown
  reason?: string
}

export type ApplyStatus =
  | "applied"
  | "from-mismatch"
  | "not-found"
  | "parse-error"
  | "dry-run"

export type ApplyResult = {
  status: ApplyStatus
  newText: string
  actualStored?: unknown
}

/**
 * Apply a single Edit to file text. Returns the new text + status.
 * If status is anything other than "applied" / "dry-run", newText === oldText.
 */
export function applyEditToText(text: string, edit: Edit, write: boolean): ApplyResult {
  // 1. Find the object whose id matches.
  const idRe = new RegExp(`"?id"?\\s*:\\s*"${escapeRegex(edit.id)}"`)
  const idMatch = text.match(idRe)
  if (!idMatch || idMatch.index === undefined) {
    return { status: "not-found", newText: text }
  }
  const objStart = findObjectStart(text, idMatch.index)
  const objEnd = findObjectEnd(text, objStart)
  if (objStart < 0 || objEnd < 0) {
    return { status: "parse-error", newText: text }
  }
  const obj = text.slice(objStart, objEnd + 1)

  // 2. Find the leaf field.
  const leaf = edit.path.split(".").pop()!
  const fieldRe = new RegExp(
    `"?${escapeRegex(leaf)}"?\\s*:\\s*(true|false|null|-?\\d+(?:\\.\\d+)?|"(?:[^"\\\\]|\\\\.)*")`,
  )
  const fm = obj.match(fieldRe)

  // 3a. Field missing AND `from` is the implicit-absent sentinel (false for
  // a flag field) — auto-insert. Only safe for top-level flags.
  if (!fm && edit.path.split(".").length === 1 && edit.from === false) {
    const newLiteral = serializeLiteral(edit.to)
    const lineBeforeClose = text.slice(text.lastIndexOf("\n", objEnd - 1) + 1, objEnd)
    const closeIndent = lineBeforeClose.match(/^\s*/)?.[0] ?? "  "
    const itemIndent = closeIndent + "  "
    const tailNeedsComma = !/[,{]\s*$/.test(text.slice(objStart, objEnd).trimEnd())
    const insertion = `${tailNeedsComma ? "," : ""}\n${itemIndent}${leaf}: ${newLiteral}\n${closeIndent}`
    const newText = write ? text.slice(0, objEnd) + insertion + text.slice(objEnd) : text
    return { status: write ? "applied" : "dry-run", newText }
  }

  if (!fm || fm.index === undefined) {
    return { status: "parse-error", newText: text }
  }
  const rawValue = fm[1]
  const parsed = parseLiteral(rawValue)

  // 3b. Refuse to mutate if the existing stored value isn't what the caller expected.
  if (!sameValue(parsed, edit.from)) {
    return { status: "from-mismatch", newText: text, actualStored: parsed }
  }

  // 3c. Replace.
  const newLiteral = serializeLiteral(edit.to)
  const before = fm[0]
  const after = before.replace(rawValue, newLiteral)
  const fieldIdx = objStart + fm.index
  const newText = write
    ? text.slice(0, fieldIdx) + after + text.slice(fieldIdx + before.length)
    : text
  return { status: write ? "applied" : "dry-run", newText }
}

// ───────── helpers ─────────

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function findObjectStart(text: string, from: number): number {
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

export function findObjectEnd(text: string, start: number): number {
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

export function parseLiteral(raw: string): unknown {
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

export function serializeLiteral(v: unknown): string {
  if (v === null) return "null"
  if (typeof v === "boolean") return v ? "true" : "false"
  if (typeof v === "number") return String(v)
  if (typeof v === "string") return JSON.stringify(v)
  throw new Error(`unsupported literal: ${JSON.stringify(v)}`)
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === "number" && typeof b === "number") return a === b
  if (a === null && b === null) return true
  return false
}
