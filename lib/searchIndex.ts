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
  .map((c) => {
    // Surface 0% APR cards under generic queries like "0% APR",
    // "intro APR", "balance transfer". When the card has those terms
    // the dropdown will surface it; cards without intro_apr stay
    // invisible to that query.
    const introAprTags: string[] = []
    if (c.intro_apr?.purchase_apr_months) {
      introAprTags.push(
        `0% apr intro apr purchases ${c.intro_apr.purchase_apr_months} months`,
      )
    }
    if (c.intro_apr?.bt_apr_months) {
      introAprTags.push(
        `0% apr balance transfer ${c.intro_apr.bt_apr_months} months`,
      )
    }
    const introSubtitleBits: string[] = []
    if (c.intro_apr?.purchase_apr_months) {
      introSubtitleBits.push(
        `0% APR ${c.intro_apr.purchase_apr_months}mo`,
      )
    } else if (c.intro_apr?.bt_apr_months) {
      introSubtitleBits.push(
        `0% APR ${c.intro_apr.bt_apr_months}mo BT`,
      )
    }
    const subtitle =
      introSubtitleBits.length > 0
        ? `Credit Card · ${c.bonus_amount.toLocaleString()} ${
            c.bonus_currency ?? "pts"
          } · ${introSubtitleBits.join(" / ")}`
        : `Credit Card · ${c.bonus_amount.toLocaleString()} ${
            c.bonus_currency ?? "pts"
          }`
    // Surface the new comparison-resource fields under intent-driven
    // queries: searching "lounge" or "Centurion" should pull premium
    // cards even when those words aren't in the card name. Same for
    // "companion fare", "credits", "Hyatt", etc.
    const featureTags: string[] = []
    if (c.lounge_network) featureTags.push("lounge", c.lounge_network)
    if (c.companion_benefit) featureTags.push("companion", c.companion_benefit.kind)
    if (c.anniversary_bonus?.free_night_cert_cap_points) {
      featureTags.push("free night certificate", c.anniversary_bonus.program ?? "")
    }
    if (c.anniversary_bonus?.points) featureTags.push("anniversary points")
    if (c.annual_credits_detail && c.annual_credits_detail.length > 0) {
      featureTags.push("credits")
      for (const cr of c.annual_credits_detail) featureTags.push(cr.label)
    }
    if (c.travel?.transfer_partners) {
      featureTags.push(...c.travel.transfer_partners)
    }
    if (c.travel_insurance?.rental_cdw_primary) featureTags.push("primary cdw rental")
    if (c.travel?.no_foreign_tx_fee) featureTags.push("no foreign transaction fee")
    return {
      id: c.id,
      kind: "card" as const,
      label: c.card_name,
      subtitle,
      searchText:
        `${c.card_name} ${c.issuer} ${c.bonus_amount} ${c.id} ${introAprTags.join(" ")} ${featureTags.join(" ")}`.toLowerCase(),
      href: "/spending",
      applyHref: `/go/${c.id}`,
    }
  })

export const searchableEntries: SearchEntry[] = [
  ...bankEntries,
  ...savingsEntries,
  ...cardEntries,
]
