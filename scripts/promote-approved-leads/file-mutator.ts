/**
 * Phase 3 — append a generated entry to the live catalog file.
 *
 * Strategy: read the file, find the closing `]` of the export array, insert
 * the new entry serialized as a comma-prefixed block just before it. Preserves
 * formatting + comments above the close. Idempotent insertion check by
 * scanning for the entry's id in the file before writing.
 */
import { readFileSync, writeFileSync } from "node:fs"

type TargetFile = "bonuses.ts" | "savingsBonuses.ts" | "creditCardBonuses.ts"

const ROOT = "/Users/nathaniel/stacks-gpt"
const FILE_PATHS: Record<TargetFile, string> = {
  "bonuses.ts": `${ROOT}/lib/data/bonuses.ts`,
  "savingsBonuses.ts": `${ROOT}/lib/data/savingsBonuses.ts`,
  "creditCardBonuses.ts": `${ROOT}/lib/data/creditCardBonuses.ts`,
}

export type AppendResult = { ok: true } | { ok: false; reason: string }

export function appendEntry(target: TargetFile, entry: Record<string, unknown>, write: boolean): AppendResult {
  const path = FILE_PATHS[target]
  const text = readFileSync(path, "utf8")

  const id = String(entry.id ?? "")
  if (!id) return { ok: false, reason: "Entry missing id." }
  if (text.includes(`"${id}"`) || text.includes(`id: "${id}"`)) {
    return { ok: false, reason: `Entry id "${id}" already present in ${target} — would create a duplicate.` }
  }

  // Find the LAST top-level `]` — the export array's close.  We anchor by
  // walking back from the end of the file past trailing whitespace.
  let i = text.length - 1
  while (i >= 0 && /\s/.test(text[i])) i--
  if (text[i] !== "]") {
    return { ok: false, reason: `${target}: expected file to end with ']'. Refusing to mutate.` }
  }
  const closeIdx = i

  // Find the preceding non-whitespace char to decide whether we need a leading comma.
  let j = closeIdx - 1
  while (j >= 0 && /\s/.test(text[j])) j--
  const needsComma = text[j] !== "[" && text[j] !== ","

  // Serialize the entry. Use 2-space indent inside the array. For card files
  // the existing convention is bare-key TypeScript object literals; for the
  // others it's mostly JSON-style strings. Match the file by detecting an
  // existing leading entry.
  const serialized = serializeEntry(entry, target)
  const insertion = `${needsComma ? "," : ""}\n  ${serialized}\n`

  const newText = text.slice(0, closeIdx) + insertion + text.slice(closeIdx)
  if (write) writeFileSync(path, newText)
  return { ok: true }
}

function serializeEntry(entry: Record<string, unknown>, target: TargetFile): string {
  // bonuses.ts uses JSON-style quoted keys. savingsBonuses.ts + creditCardBonuses.ts
  // use bare-key TypeScript object literals. JSON.stringify gives us quoted keys
  // and double-quoted strings, which is compatible with both syntaxes (TS
  // accepts quoted property names).
  return JSON.stringify(entry, null, 2).split("\n").map((l, i) => (i === 0 ? l : `  ${l}`)).join("\n")
}
