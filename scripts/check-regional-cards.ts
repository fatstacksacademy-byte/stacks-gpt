/**
 * Sanity check for the state regional-card catalog.
 *
 *   npx tsx scripts/check-regional-cards.ts
 *
 * - Global ID uniqueness across the whole catalog.
 * - Every state-restricted (non-Hawaii) regional card has eligibility_notes,
 *   eligibility_source, an https offer_link, and offer_verified_at.
 * - Per-state coverage counts (cards available when each state is selected).
 */
import { creditCardBonuses } from "../lib/data/creditCardBonuses"
import { regionalStateCards } from "../lib/data/states"
import { stateSpecificCards } from "../lib/data/cardAvailability"
import { US_STATES } from "../lib/data/catalogTaxonomy"

let failures = 0
const fail = (msg: string) => {
  failures++
  console.error("  ✗ " + msg)
}

// 1) Global ID uniqueness
const idCounts = new Map<string, number>()
for (const c of creditCardBonuses) idCounts.set(c.id, (idCounts.get(c.id) ?? 0) + 1)
const dups = [...idCounts.entries()].filter(([, n]) => n > 1)
console.log(`Catalog size: ${creditCardBonuses.length} cards · regionalStateCards: ${regionalStateCards.length}`)
if (dups.length) dups.forEach(([id, n]) => fail(`duplicate id "${id}" appears ${n}×`))
else console.log("  ✓ all ids unique")

// 2) Provenance on every regional state card
for (const c of regionalStateCards) {
  if (!c.eligibility_notes) fail(`${c.id}: missing eligibility_notes`)
  if (!c.eligibility_source?.startsWith("https://")) fail(`${c.id}: eligibility_source not https`)
  if (!c.offer_link?.startsWith("https://")) fail(`${c.id}: offer_link not https`)
  if (!c.offer_verified_at) fail(`${c.id}: missing offer_verified_at`)
  if (!c.state_restricted?.length) fail(`${c.id}: missing state_restricted`)
  if (c.bonus_amount > 0 && c.min_spend === 0 && c.bonus_currency !== "points")
    console.warn(`  ! ${c.id}: bonus_amount ${c.bonus_amount} with min_spend 0 (verify it's a no-spend bonus)`)
}
if (!failures) console.log("  ✓ all regional cards carry eligibility_notes + source + https offer_link + verified_at")

// 3) Per-state coverage
console.log("\nState coverage (regional cards added when selected):")
const covered = US_STATES.map(s => ({ s, n: stateSpecificCards(creditCardBonuses, s.code).length }))
  .filter(x => x.n > 0)
  .sort((a, b) => b.n - a.n)
for (const { s, n } of covered) console.log(`  ${s.code} ${s.name.padEnd(22)} ${n}`)
console.log(`\nStates with regional coverage: ${covered.length} / ${US_STATES.length}`)

if (failures) {
  console.error(`\n${failures} FAILURE(S)`)
  process.exit(1)
}
console.log("\nAll checks passed.")
