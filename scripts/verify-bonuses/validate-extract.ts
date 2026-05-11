/**
 * Replay extractBonusAmount over every cached page and print a before/after
 * diff. Uses the current (updated) extractor, so the column shows only what
 * the new logic produces. Tests the real-world improvement from the
 * plausibility + non-bonus-phrase filters without needing a full verify run.
 */
import { readdirSync, readFileSync } from "node:fs"
import { extractBonusAmount } from "./extract"

const CACHE_DIR = "/Users/nathaniel/stacks-gpt/.cache/verify-bonuses"
const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"))

// Import stored records so we can compare stored vs extracted.
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
const byId = new Map<string, any>()
for (const b of bonuses as any[]) byId.set(b.id, b)
for (const b of savingsBonuses as any[]) byId.set(b.id, b)

let total = 0
let matched = 0
let rejectedByPlausibility = 0
let rejectedByContext = 0
const diffs: Array<{ id: string; stored: number; extracted: number | null; storedMatches: boolean }> = []

for (const f of files) {
  const id = f.replace(/\.json$/, "")
  const rec = byId.get(id)
  if (!rec) continue
  const cache = JSON.parse(readFileSync(`${CACHE_DIR}/${f}`, "utf8"))
  const text = cache.textContent as string
  if (!text) continue
  total++

  const r = extractBonusAmount(text)
  if (r.value) {
    matched++
    const stored =
      typeof rec.bonus_amount === "number"
        ? rec.bonus_amount
        : Array.isArray(rec.tiers)
          ? Math.max(...rec.tiers.map((t: any) => t.bonus_amount ?? 0))
          : null
    if (stored) {
      diffs.push({
        id,
        stored,
        extracted: r.value,
        storedMatches: r.value === stored,
      })
    }
  }
}

const agreeing = diffs.filter((d) => d.storedMatches).length
const disagreeing = diffs.filter((d) => !d.storedMatches).length

console.log(`Cache entries: ${total}`)
console.log(`Extracted a value: ${matched}`)
console.log()
console.log(`Against stored record:`)
console.log(`  Matches stored: ${agreeing}`)
console.log(`  Disagrees w/ stored: ${disagreeing}`)
console.log()
console.log(`=== Disagreements (new extractor) ===`)
for (const d of diffs.filter((x) => !x.storedMatches).sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`  ${d.id.padEnd(50)} stored=$${d.stored}, extracted=$${d.extracted}`)
}
