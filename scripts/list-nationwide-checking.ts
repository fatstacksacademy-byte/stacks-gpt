import { bonuses } from "../lib/data/bonuses"

const nationwide = (bonuses as any[]).filter((b) => {
  const allowed = b.eligibility?.states_allowed ?? b.states_allowed ?? []
  return (
    b.product_type === "checking" &&
    !b.expired &&
    allowed.some((s: string) => /nationwide/i.test(s))
  )
})

console.log(`Total nationwide active checking bonuses: ${nationwide.length}`)
for (const b of nationwide) {
  console.log(`${b.id}\t${b.bank_name}\t$${b.bonus_amount}`)
}
