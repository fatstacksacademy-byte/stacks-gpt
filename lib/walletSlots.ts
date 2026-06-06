/**
 * Wallet-slot view — RWP-style "best card for groceries / dining / etc."
 *
 * Looks at the catalog's `rewards: RewardsTier[]` data per card, finds the
 * top multiplier per spending category, and returns the user's optimal
 * card for each category. Comes in two flavors:
 *
 *   bestFromOwned  — restricted to the cards the user already tracks.
 *                    Answers "what should I swipe for groceries with the
 *                    cards I own right now?"
 *   bestFromAll    — full catalog. Answers "what card would be best for
 *                    groceries if I had any card in existence?"
 *
 * The diff between the two is the upgrade opportunity per category.
 *
 * Multiplier × cpp gives the effective cash-equivalent rate so cash cards
 * and points cards can be compared apples-to-apples.
 */

import type { CreditCardBonus } from "./data/creditCardBonuses"

export type WalletSlot = {
  category: string
  label: string
  ownedBest?: { card: CreditCardBonus; multiplier: number; rate: number; note?: string }
  catalogBest?: { card: CreditCardBonus; multiplier: number; rate: number; note?: string }
  upgradeGain: number   // (catalog rate - owned rate). 0 means user already has best.
}

/** Categories displayed in the wallet-slot view, with friendly labels.
 *  Order = display order. */
export const WALLET_CATEGORIES: { token: string; label: string }[] = [
  { token: "groceries", label: "Groceries" },
  { token: "dining", label: "Dining + restaurants" },
  { token: "gas_stations", label: "Gas" },
  { token: "travel", label: "Travel (general)" },
  { token: "airfare", label: "Flights" },
  { token: "hotels", label: "Hotels" },
  { token: "transit", label: "Transit + ridesharing" },
  { token: "streaming_services", label: "Streaming" },
  { token: "all_other", label: "Everything else (base spend)" },
]

const TRANSIT_TOKENS = new Set(["transit", "ridesharing", "toll_fees", "parking"])
const ALL_OTHER_TOKENS = new Set(["all_other", "everything_else", "all_purchases"])

function tierMatchesCategory(tier: { categories: string[] }, category: string): boolean {
  if (category === "transit") {
    return tier.categories.some(c => TRANSIT_TOKENS.has(c))
  }
  if (category === "all_other") {
    return tier.categories.some(c => ALL_OTHER_TOKENS.has(c))
  }
  return tier.categories.includes(category)
}

/**
 * For one card, return the best matching tier for a given category.
 * Returns null if the card has no rewards data or no matching tier.
 */
function bestTierForCard(
  card: CreditCardBonus,
  category: string,
): { multiplier: number; rate: number; note?: string } | null {
  if (!card.rewards || card.rewards.length === 0) return null

  // Find tiers that match this category.
  const matches = card.rewards.filter(t => tierMatchesCategory(t, category))
  if (matches.length === 0) {
    // Fall back to the card's everything-else / all-other rate if present.
    const base = card.rewards.find(t => tierMatchesCategory(t, "all_other"))
    if (!base) return null
    return tierMatchesCategory(base, category) ? { multiplier: base.multiplier, rate: rateFor(base, card), note: base.note } : null
  }

  // Highest multiplier wins.
  const top = matches.reduce((a, b) => (b.multiplier > a.multiplier ? b : a))
  return { multiplier: top.multiplier, rate: rateFor(top, card), note: top.note }
}

/** Effective cash-equivalent rate for a tier (in cents per dollar). */
function rateFor(tier: { multiplier: number; unit?: string }, card: CreditCardBonus): number {
  // Cashback cards: multiplier is already percent.
  if (tier.unit === "%" || tier.unit === "cashback" || card.bonus_currency === "cash") {
    return tier.multiplier
  }
  // Points cards: multiplier × cpp × 100 → percent equivalent.
  return tier.multiplier * card.cpp_value * 100
}

export function computeWalletSlots(
  ownedCards: CreditCardBonus[],
  catalog: CreditCardBonus[],
): WalletSlot[] {
  return WALLET_CATEGORIES.map(({ token, label }) => {
    const ownedBest = pickBest(ownedCards, token)
    const catalogBest = pickBest(catalog.filter(c => !c.expired && c.offer_link), token)
    const upgradeGain = (catalogBest?.rate ?? 0) - (ownedBest?.rate ?? 0)
    return { category: token, label, ownedBest, catalogBest, upgradeGain }
  })
}

function pickBest(
  cards: CreditCardBonus[],
  category: string,
): WalletSlot["ownedBest"] {
  let best: { card: CreditCardBonus; multiplier: number; rate: number; note?: string } | null = null
  for (const card of cards) {
    const tier = bestTierForCard(card, category)
    if (!tier) continue
    if (!best || tier.rate > best.rate) {
      best = { card, ...tier }
    }
  }
  return best ?? undefined
}
