import { bonuses } from "./data/bonuses"
import { savingsBonuses } from "./data/savingsBonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"

/**
 * Lightweight search index over the three public catalogs.
 *
 * The raw catalogs are ~580KB combined — way too heavy to ship to the
 * browser. We project each entry down to just the fields the search
 * dropdown needs, then ship that slim array into the client SearchBox.
 *
 * Anything `expired` is excluded so dead offers don't pollute results.
 */

export type SearchEntry = {
  id: string
  kind: "checking" | "savings" | "card"
  label: string
  subtitle: string
  /** Lowercased, joined keywords used for substring matching in the dropdown. */
  searchText: string
  /** Where a click takes the user to read more (catalog page). */
  href: string
  /** Direct apply redirect via /go/{id}. */
  applyHref: string
}

function compactBank(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim()
}

const bankEntries: SearchEntry[] = (bonuses as Array<{
  id: string
  bank_name: string
  product_type: string
  bonus_amount: number
  expired?: boolean
}>)
  .filter((b) => !b.expired)
  .map((b) => {
    const bank = compactBank(b.bank_name)
    const productLabel =
      b.product_type === "checking"
        ? "Checking"
        : b.product_type === "business_checking"
        ? "Business Checking"
        : b.product_type === "savings"
        ? "Savings"
        : b.product_type
    return {
      id: b.id,
      kind: "checking" as const,
      label: `${bank} — $${b.bonus_amount} ${productLabel}`,
      subtitle: `${productLabel} bonus`,
      searchText:
        `${b.bank_name} ${productLabel} ${b.bonus_amount} ${b.id}`.toLowerCase(),
      href: "/bank-bonuses-by-state",
      applyHref: `/go/${b.id}`,
    }
  })

const savingsEntries: SearchEntry[] = savingsBonuses
  .filter((s) => !s.expired)
  .map((s) => {
    const topTier = s.tiers[s.tiers.length - 1]
    const bank = compactBank(s.bank_name)
    const amount = topTier?.bonus_amount ?? 0
    return {
      id: s.id,
      kind: "savings" as const,
      label: `${bank} — $${amount} Savings`,
      subtitle: `Savings · ${(s.base_apy * 100).toFixed(2)}% APY`,
      searchText: `${s.bank_name} savings ${amount} ${s.id}`.toLowerCase(),
      href: "/savings",
      applyHref: `/go/${s.id}`,
    }
  })

const cardEntries: SearchEntry[] = creditCardBonuses
  .filter((c) => !c.expired)
  .map((c) => ({
    id: c.id,
    kind: "card" as const,
    label: c.card_name,
    subtitle: `Credit Card · ${c.bonus_amount.toLocaleString()} ${
      c.bonus_currency ?? "pts"
    }`,
    searchText:
      `${c.card_name} ${c.issuer} ${c.bonus_amount} ${c.id}`.toLowerCase(),
    href: "/spending",
    applyHref: `/go/${c.id}`,
  }))

export const searchableEntries: SearchEntry[] = [
  ...bankEntries,
  ...savingsEntries,
  ...cardEntries,
]
