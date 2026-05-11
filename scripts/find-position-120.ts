import { bonuses } from "../lib/data/bonuses"
import { savingsBonuses } from "../lib/data/savingsBonuses"

const all = [...bonuses, ...(savingsBonuses as any[])]
const active = all.filter((b: any) => !b.expired)
console.log(`Total active: ${active.length}`)
console.log(`\nLast 5:`)
for (const b of active.slice(-5)) {
  console.log(`  ${b.id} | ${b.bank_name} | primary: ${b.source_links?.[0]}`)
}
