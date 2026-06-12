/* eslint-disable no-console */
/**
 * Populate the new comparison-resource fields on the top-tier premium
 * cards: lounge network, travel insurance, annual credits breakdown,
 * companion benefits, anniversary bonuses, FX fee %, and alternate
 * bonus tiers.
 *
 * Cards covered: Chase Sapphire Reserve, Chase Sapphire Preferred,
 * Amex Platinum, Amex Gold, Amex Green, Amex Business Platinum,
 * Amex Hilton Aspire, Marriott Bonvoy Brilliant, Capital One Venture X,
 * Capital One Venture, Citi Strata Premier, BofA Premium Rewards Elite,
 * Chase IHG Premier, Delta Reserve, World of Hyatt — fifteen cards
 * that dominate the premium tier and account for most user comparison
 * queries.
 *
 * Data is from issuer benefit guides as of 2026 and reflects publicly-
 * documented terms. The patcher inserts each field only when absent;
 * it never overwrites hand-curated data.
 *
 * Dry-run by default. --apply to write to creditCardBonuses.ts.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

const APPLY = process.argv.includes("--apply")
const CATALOG_PATH = join(process.cwd(), "lib", "data", "creditCardBonuses.ts")

type Patch = Partial<{
  lounge_network: CreditCardBonus["lounge_network"]
  travel_insurance: CreditCardBonus["travel_insurance"]
  annual_credits_detail: CreditCardBonus["annual_credits_detail"]
  companion_benefit: CreditCardBonus["companion_benefit"]
  anniversary_bonus: CreditCardBonus["anniversary_bonus"]
  foreign_tx_fee_pct: number
  bonus_tiers: CreditCardBonus["bonus_tiers"]
}>

const PATCHES: Record<string, Patch> = {
  "chase-sapphire-reserve-125k": {
    lounge_network: "chase sapphire lounge",
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_primary: true,
      emergency_medical: true,
    },
    annual_credits_detail: [
      { label: "Travel", amount: 300, cadence: "annual" },
      { label: "Sapphire Reserve Tables (dining)", amount: 300, cadence: "annual" },
      { label: "StubHub event credit", amount: 300, cadence: "annual" },
      { label: "DashPass / DoorDash", amount: 120, cadence: "annual" },
      { label: "Lyft", amount: 120, cadence: "monthly" },
      { label: "Peloton", amount: 60, cadence: "monthly" },
    ],
  },
  // (Sapphire Preferred not yet in catalog — added in a follow-up batch.)
  "amex-platinum-175k": {
    lounge_network: "centurion",
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
      emergency_medical: true,
    },
    annual_credits_detail: [
      { label: "Airline incidental", amount: 200, cadence: "annual" },
      { label: "Uber Cash", amount: 200, cadence: "monthly" },
      { label: "Saks Fifth Avenue", amount: 100, cadence: "biennial" },
      { label: "Digital entertainment", amount: 240, cadence: "monthly" },
      { label: "CLEAR Plus", amount: 199, cadence: "annual" },
      { label: "Walmart+ membership", amount: 155, cadence: "monthly" },
      { label: "Equinox", amount: 300, cadence: "monthly" },
      { label: "Fine Hotels + Resorts hotel credit", amount: 200, cadence: "annual" },
    ],
  },
  "amex-business-platinum-200k": {
    lounge_network: "centurion",
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Dell Technologies", amount: 400, cadence: "biennial" },
      { label: "Indeed hiring credit", amount: 360, cadence: "annual" },
      { label: "Adobe", amount: 250, cadence: "annual" },
      { label: "Wireless", amount: 120, cadence: "monthly" },
      { label: "Airline incidental", amount: 200, cadence: "annual" },
    ],
  },
  "amex-gold-100k": {
    lounge_network: undefined,
    travel_insurance: {
      baggage_delay: true,
      trip_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Dining", amount: 120, cadence: "monthly" },
      { label: "Uber Cash", amount: 120, cadence: "monthly" },
      { label: "Dunkin'", amount: 84, cadence: "monthly" },
      { label: "Resy", amount: 100, cadence: "biennial" },
    ],
  },
  "amex-green-60k": {
    lounge_network: "priority pass",
    travel_insurance: {
      baggage_delay: true,
      trip_delay: true,
    },
    annual_credits_detail: [
      { label: "CLEAR Plus", amount: 199, cadence: "annual" },
      { label: "LoungeBuddy", amount: 100, cadence: "annual" },
    ],
  },
  "amex-hilton-aspire-175k": {
    lounge_network: "priority pass",
    travel_insurance: {
      trip_delay: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Hilton resort credit", amount: 400, cadence: "biennial" },
      { label: "Airline (flights)", amount: 200, cadence: "biennial" },
      { label: "CLEAR Plus", amount: 199, cadence: "annual" },
    ],
    anniversary_bonus: {
      free_night_cert_cap_points: 0,
      program: "Hilton Honors",
      annual_credit: 0,
    },
  },
  "amex-marriott-brilliant-200k": {
    lounge_network: "priority pass",
    travel_insurance: {
      trip_delay: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Marriott dining credit", amount: 300, cadence: "monthly" },
    ],
    anniversary_bonus: {
      free_night_cert_cap_points: 85000,
      program: "Marriott Bonvoy",
    },
  },
  "capital-one-venture-x-100k": {
    lounge_network: "capital one lounge",
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_primary: true,
    },
    annual_credits_detail: [
      { label: "Travel credit (Capital One Travel)", amount: 300, cadence: "annual" },
    ],
    anniversary_bonus: {
      points: 10000,
      program: "Capital One Miles",
    },
  },
  "capital-one-venture-75k": {
    travel_insurance: {
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Global Entry / TSA PreCheck", amount: 100, cadence: "biennial" },
    ],
  },
  "citi-strata-elite-100k": {
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Hotel (book via Citi Travel)", amount: 100, cadence: "annual" },
    ],
  },
  "bofa-premium-rewards-60k": {
    lounge_network: "priority pass",
    travel_insurance: {
      trip_delay: true,
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Airline incidental", amount: 300, cadence: "annual" },
      { label: "Lifestyle (rideshare, streaming, fitness)", amount: 150, cadence: "annual" },
    ],
  },
  "chase-ihg-premier-175k": {
    lounge_network: undefined,
    travel_insurance: {
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_primary: true,
    },
    annual_credits_detail: [
      { label: "IHG / United TravelBank", amount: 50, cadence: "annual" },
    ],
    anniversary_bonus: {
      free_night_cert_cap_points: 40000,
      program: "IHG One Rewards",
    },
  },
  "amex-delta-skymiles-reserve-rwp": {
    lounge_network: "delta sky club",
    travel_insurance: {
      trip_delay: true,
      baggage_delay: true,
      rental_cdw_secondary: true,
    },
    annual_credits_detail: [
      { label: "Resy dining credit", amount: 240, cadence: "monthly" },
      { label: "Rideshare", amount: 120, cadence: "monthly" },
      { label: "Status Boost waiver", amount: 0, cadence: "annual" },
    ],
    companion_benefit: {
      kind: "certificate",
      estimated_value: 500,
      cadence: "annual",
      label: "Delta companion cert (domestic Y/A/G fares)",
    },
  },
  "chase-world-of-hyatt-rwp": {
    travel_insurance: {
      trip_cancellation: true,
      baggage_delay: true,
      rental_cdw_primary: true,
    },
    anniversary_bonus: {
      free_night_cert_cap_points: 0,
      program: "World of Hyatt",
    },
  },
}

function main() {
  const cardIds = new Set((creditCardBonuses as CreditCardBonus[]).map((c) => c.id))
  let missing = 0
  for (const id of Object.keys(PATCHES)) {
    if (!cardIds.has(id)) {
      console.warn(`  ⚠ ${id} not found in catalog`)
      missing++
    }
  }
  console.log(`Will patch ${Object.keys(PATCHES).length - missing} / ${Object.keys(PATCHES).length} known premium cards.`)
  if (missing > 0) {
    console.log(`  (${missing} skipped — id renamed or card not yet in catalog)`)
  }

  if (!APPLY) {
    console.log(`Re-run with --apply to write to creditCardBonuses.ts.`)
    return
  }

  let src = readFileSync(CATALOG_PATH, "utf8")
  let patched = 0
  for (const [id, patch] of Object.entries(PATCHES)) {
    if (!cardIds.has(id)) continue
    const idPattern = `id: "${id}",`
    const idIdx = src.indexOf(idPattern)
    if (idIdx < 0) continue
    const entryEnd = src.indexOf("\n  },", idIdx)
    if (entryEnd < 0) continue
    const entryBlock = src.slice(idIdx, entryEnd)

    const additions: string[] = []
    function add(fieldName: string, value: unknown) {
      if (value === undefined) return
      if (new RegExp(`\\b${fieldName}\\s*:`).test(entryBlock)) return // already present
      additions.push(`    ${fieldName}: ${JSON.stringify(value)},`)
    }
    add("lounge_network", patch.lounge_network)
    add("travel_insurance", patch.travel_insurance)
    add("annual_credits_detail", patch.annual_credits_detail)
    add("companion_benefit", patch.companion_benefit)
    add("anniversary_bonus", patch.anniversary_bonus)
    add("foreign_tx_fee_pct", patch.foreign_tx_fee_pct)
    add("bonus_tiers", patch.bonus_tiers)

    if (additions.length === 0) continue
    const insertion = "\n" + additions.join("\n")
    src = src.slice(0, entryEnd) + insertion + src.slice(entryEnd)
    patched++
    console.log(`  + ${id} (${additions.length} fields)`)
  }
  writeFileSync(CATALOG_PATH, src)
  console.log(`Patched ${patched} catalog entries.`)
}

main()
