/**
 * Portfolio gap analysis for the Spending tab.
 *
 * Bridges two vocabularies:
 *   1. The user-facing spending category keys (lib/ownedCards.ts SPENDING_CATEGORIES)
 *   2. The reward-tier tokens that creditCardBonuses.ts cards advertise
 *      (e.g. "gas_stations", "cell_phone_carriers", "online_retail")
 *
 * For each spending category where the user has $50+/mo, we compare the best
 * multiplier on a card the user *owns* to the best multiplier available on
 * any card in the catalog. If the gap is 2x+, the gap is surfaced as a
 * portfolio-fill opportunity — distinct from the SUB-driven sequencer list.
 */

import type { CreditCardBonus, RewardsTier } from "./data/creditCardBonuses"
import type { OwnedCard } from "./ownedCards"
import type { SpendingCategory } from "./ownedCards"

/**
 * One spending key can map to multiple catalog tokens (e.g. ridesharing →
 * uber + lyft + ridesharing) — we take the max multiplier across all of them
 * when matching cards. Order doesn't matter; this is a set check.
 */
export const SPENDING_TO_CATALOG_TOKENS: Record<string, string[]> = {
  dining: ["dining"],
  groceries: ["groceries", "groceries_online"],
  gas: ["gas_stations"],
  travel: ["travel"],
  utilities: ["utilities"],
  online_shopping: ["online_retail"],
  other: ["everything_else", "all_other"],
  streaming_services: ["streaming_services"],
  ridesharing: ["ridesharing", "uber", "lyft"],
  transit: ["transit"],
  drug_stores: ["drug_stores"],
  ev_charging: ["ev_charging"],
  cell_phone_internet: ["cell_phone_carriers", "internet_and_cable"],
  home_improvement: ["home_improvement_stores"],
  wholesale_clubs: ["wholesale_clubs", "costco_wholesale"],
  amazon: ["amazon"],
  hotels_direct: ["hotels"],
  flights_direct: ["airfare"],
}

/** Min monthly spend that triggers gap surfacing. Below this, the row is hidden. */
export const GAP_MIN_MONTHLY_SPEND = 50
/** Min multiplier delta (in raw multiplier units) before a row is "flagged". */
export const GAP_FLAG_THRESHOLD = 1

/**
 * Given a card's rewards tiers, return the highest multiplier whose categories
 * overlap any of the requested catalog tokens. Returns 0 (and a fallback to
 * "everything_else" tier if available) when nothing matches. The unit and
 * cpp_value are returned alongside so callers can compute $/yr.
 */
export function bestTierForCategory(
  card: CreditCardBonus,
  catalogTokens: string[],
): { multiplier: number; tier: RewardsTier | null } {
  if (!card.rewards || card.rewards.length === 0) return { multiplier: 0, tier: null }
  const tokenSet = new Set(catalogTokens)
  let best: RewardsTier | null = null
  for (const tier of card.rewards) {
    const overlap = tier.categories.some((c) => tokenSet.has(c))
    if (!overlap) continue
    if (!best || tier.multiplier > best.multiplier) best = tier
  }
  if (best) return { multiplier: best.multiplier, tier: best }
  // Fallback: cards almost always have an "everything_else" tier; if our
  // category isn't earning a bonus, the user gets the base rate. Returning
  // that lets the UI distinguish "no rewards data" from "1x base earn".
  const baseline = card.rewards.find((t) => t.categories.includes("everything_else"))
    ?? card.rewards.find((t) => t.categories.includes("all_other"))
    ?? null
  return { multiplier: baseline?.multiplier ?? 0, tier: baseline }
}

/**
 * Convert a (multiplier, tier, card) trio into approximate $/yr at a given
 * monthly spend. Honors the tier's unit ("%" stays as percent, points/miles
 * use the card's cpp_value). 1¢-per-point cap when cpp is unset.
 */
export function tierAnnualValue(
  monthlySpend: number,
  multiplier: number,
  tier: RewardsTier | null,
  cardCpp: number,
): number {
  if (multiplier <= 0 || monthlySpend <= 0) return 0
  const annual = monthlySpend * 12
  // Cashback tier: multiplier already a percent (3 = 3%).
  if (tier?.unit === "%" || tier?.unit === "cashback") {
    return (annual * multiplier) / 100
  }
  // Points/miles tier: multiplier × cpp gives effective return rate.
  // cpp_value is dollars-per-point (0.01 = 1¢), so multiply directly.
  const cpp = cardCpp > 0 ? cardCpp : 0.01
  return annual * multiplier * cpp
}

/**
 * The user's effective multiplier for a category from a card they already
 * have. Prefers the explicit category_multipliers JSON (set in the per-card
 * "Advanced" form) over the catalog lookup, since users sometimes record
 * promo-tier rates the catalog doesn't track.
 */
export function ownedMultiplierForCategory(
  ownedCard: OwnedCard,
  spendingCategory: string,
  catalogTokens: string[],
  catalog: CreditCardBonus[],
): { multiplier: number; tier: RewardsTier | null; catalogMatch: CreditCardBonus | null } {
  const explicit = ownedCard.category_multipliers?.[spendingCategory]
  if (explicit && explicit > 0) {
    return { multiplier: explicit, tier: null, catalogMatch: null }
  }
  // Fall back to catalog lookup by name (case-insensitive exact match).
  const catalogMatch = catalog.find(
    (c) => c.card_name.toLowerCase() === ownedCard.card_name.toLowerCase(),
  )
  if (!catalogMatch) return { multiplier: 0, tier: null, catalogMatch: null }
  const { multiplier, tier } = bestTierForCategory(catalogMatch, catalogTokens)
  return { multiplier, tier, catalogMatch }
}

export type CategoryGap = {
  spendingCategory: SpendingCategory
  monthlySpend: number
  catalogTokens: string[]
  ownedBest: {
    multiplier: number
    tier: RewardsTier | null
    card: OwnedCard | null
    catalogMatch: CreditCardBonus | null
  }
  bestAvailable: {
    multiplier: number
    tier: RewardsTier | null
    card: CreditCardBonus | null
  }
  /** Annual $ uplift from switching to bestAvailable for this category. */
  annualGap: number
  /** True when the gap is large enough to surface as a fix-this opportunity. */
  flagged: boolean
}

export function computeCategoryGaps(
  catalog: CreditCardBonus[],
  ownedCards: OwnedCard[],
  categorySpend: Record<string, number>,
): CategoryGap[] {
  const out: CategoryGap[] = []

  // Pre-filter the catalog: ignore expired cards and cards the user already
  // owns. Using a name set keeps this O(n) instead of O(n×m).
  const ownedNames = new Set(
    ownedCards
      .filter((c) => c.status === "active" || c.status === "completed")
      .map((c) => c.card_name.toLowerCase()),
  )
  const eligible = catalog.filter((c) => !c.expired && !ownedNames.has(c.card_name.toLowerCase()))

  for (const [spendingCategory, monthly] of Object.entries(categorySpend)) {
    if (!monthly || monthly < GAP_MIN_MONTHLY_SPEND) continue
    const catalogTokens = SPENDING_TO_CATALOG_TOKENS[spendingCategory]
    if (!catalogTokens) continue

    // Best owned multiplier across the user's portfolio (active + completed).
    let ownedBest: CategoryGap["ownedBest"] = {
      multiplier: 0,
      tier: null,
      card: null,
      catalogMatch: null,
    }
    for (const oc of ownedCards) {
      if (oc.status === "canceled") continue
      const r = ownedMultiplierForCategory(oc, spendingCategory, catalogTokens, catalog)
      if (r.multiplier > ownedBest.multiplier) {
        ownedBest = { multiplier: r.multiplier, tier: r.tier, card: oc, catalogMatch: r.catalogMatch }
      }
    }

    // Best available card the user does *not* own.
    let bestAvailable: CategoryGap["bestAvailable"] = { multiplier: 0, tier: null, card: null }
    for (const card of eligible) {
      const r = bestTierForCategory(card, catalogTokens)
      if (r.multiplier > bestAvailable.multiplier) {
        bestAvailable = { multiplier: r.multiplier, tier: r.tier, card }
      }
    }

    if (!bestAvailable.card) continue

    // Annual $ value calc uses the best-available card's cpp for a fair
    // apples-to-apples redemption assumption (most users redeem at par on a
    // dedicated category card, not for travel-ceiling cpp).
    const cpp = bestAvailable.card.cpp_value || 0.01
    const ownedAnnual = tierAnnualValue(monthly, ownedBest.multiplier, ownedBest.tier, cpp)
    const bestAnnual = tierAnnualValue(monthly, bestAvailable.multiplier, bestAvailable.tier, cpp)
    const annualGap = Math.max(0, Math.round(bestAnnual - ownedAnnual))

    out.push({
      spendingCategory: spendingCategory as SpendingCategory,
      monthlySpend: monthly,
      catalogTokens,
      ownedBest,
      bestAvailable,
      annualGap,
      flagged:
        bestAvailable.multiplier - ownedBest.multiplier >= GAP_FLAG_THRESHOLD &&
        annualGap >= 25,
    })
  }

  // Sort by largest annual gap first so the most lucrative fixes land at top.
  out.sort((a, b) => b.annualGap - a.annualGap)
  return out
}
