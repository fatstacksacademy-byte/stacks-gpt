import { bonuses } from "../lib/data/bonuses"
import { savingsBonuses } from "../lib/data/savingsBonuses"

type Row = {
  id: string
  bank_name: string
  product_type: string
  bonus_amount: number | null
  expired: boolean
  source_links: string[]
  hasDoc: boolean
  file: "bonuses" | "savings"
}

function rowsFrom(list: any[], file: "bonuses" | "savings"): Row[] {
  return list.map((b: any) => {
    const links: string[] = Array.isArray(b.source_links) ? b.source_links : []
    const hasDoc = links.some((u) => /doctorofcredit\.com/i.test(u))
    const amount =
      typeof b.bonus_amount === "number"
        ? b.bonus_amount
        : Array.isArray(b.tiers) && b.tiers.length > 0
          ? Math.max(...b.tiers.map((t: any) => t.bonus_amount ?? 0))
          : null
    return {
      id: b.id,
      bank_name: b.bank_name,
      product_type: b.product_type,
      bonus_amount: amount,
      expired: !!b.expired,
      source_links: links,
      hasDoc,
      file,
    }
  })
}

const all = [...rowsFrom(bonuses, "bonuses"), ...rowsFrom(savingsBonuses as any[], "savings")]

const active = all.filter((r) => !r.expired)
const missingDoc = active.filter((r) => !r.hasDoc)

console.log(`Total bonuses: ${all.length}`)
console.log(`  bonuses.ts:       ${all.filter((r) => r.file === "bonuses").length}`)
console.log(`  savingsBonuses.ts: ${all.filter((r) => r.file === "savings").length}`)
console.log(`Active (non-expired): ${active.length}`)
console.log(`  with DoC URL:    ${active.filter((r) => r.hasDoc).length}`)
console.log(`  missing DoC URL: ${missingDoc.length}`)
console.log()
console.log(`=== Active bonuses missing DoC URL ===`)
for (const r of missingDoc) {
  const amt = r.bonus_amount ?? "?"
  console.log(`- ${r.id} | ${r.bank_name} | ${r.product_type} | $${amt}`)
}

// Emit a machine-readable manifest for the backfill script
import { writeFileSync } from "node:fs"
writeFileSync(
  "/Users/nathaniel/stacks-gpt/scripts/backfill-doc/_missing.json",
  JSON.stringify(missingDoc, null, 2),
)
console.log(`\nManifest written to scripts/backfill-doc/_missing.json`)
