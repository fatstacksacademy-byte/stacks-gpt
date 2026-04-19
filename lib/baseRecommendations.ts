/**
 * Base tab — recommendation engine (rule-based MVP).
 *
 * Two stubs to start:
 *   1. APY-move: scan owned cash accounts, surface where money is sitting at
 *      a meaningfully lower yield than the user's best account in the same
 *      category. Suggests a move.
 *   2. Card acquisition: for each category the user spends meaningfully on,
 *      compare their current best owned card's multiplier against the catalog
 *      to see if there's a no-AF or AF-justified upgrade.
 *
 * Both functions are pure — easy to extend, easy to test. The Base UI just
 * concatenates the outputs.
 */

import type { OwnedAccount, OwnedAccountType } from "./ownedAccounts"
import type { OwnedCard } from "./ownedCards"
import type { CreditCardBonus, RewardsTier } from "./data/creditCardBonuses"

export type Recommendation = {
  id: string
  kind: "apy-move" | "card-acquisition"
  priority: number  // higher = surface first
  title: string
  detail: string
  cta?: { label: string; href: string }
}

// Considered "meaningful" APY gap before we suggest moving money.
const APY_GAP_THRESHOLD = 0.005   // 0.5%
// Min monthly spend per category before we bother recommending a card for it.
const MIN_CATEGORY_SPEND = 100

// ─────────────────────────────────────────────────────────────────────────
// APY-move recommendations
// ─────────────────────────────────────────────────────────────────────────
export function recommendApyMoves(accounts: OwnedAccount[]): Recommendation[] {
  const out: Recommendation[] = []
  const groups: OwnedAccountType[] = ["savings", "checking"]

  for (const type of groups) {
    const inType = accounts.filter(a => a.account_type === type && a.current_balance > 0 && a.apy != null)
    if (inType.length < 2) continue

    const best = inType.reduce((a, b) => (a.apy! >= b.apy!) ? a : b)
    const bestApy = best.apy!

    for (const acct of inType) {
      if (acct.id === best.id) continue
      const apy = acct.apy ?? 0
      const gap = bestApy - apy
      if (gap < APY_GAP_THRESHOLD) continue

      const annualLift = Math.round(acct.current_balance * gap)
      if (annualLift < 5) continue  // not worth the noise

      out.push({
        id: `apy-move:${acct.id}`,
        kind: "apy-move",
        priority: annualLift,
        title: `Move $${acct.current_balance.toLocaleString()} from ${acct.institution} → ${best.institution}`,
        detail: `${acct.institution} pays ${(apy * 100).toFixed(2)}% APY · ${best.institution} pays ${(bestApy * 100).toFixed(2)}%. Earns ~$${annualLift}/yr more if you move it.`,
        cta: { label: "Open Savings", href: "/stacksos/savings" },
      })
    }
  }

  return out.sort((a, b) => b.priority - a.priority)
}

// ─────────────────────────────────────────────────────────────────────────
// Card-acquisition recommendations
// ─────────────────────────────────────────────────────────────────────────

type SpendByCategory = Record<string, number>  // category name → monthly $

function bestMultiplierForCategory(
  category: string,
  rewards: RewardsTier[] | undefined,
): { multiplier: number; tier: RewardsTier | null } {
  if (!rewards || rewards.length === 0) return { multiplier: 1, tier: null }
  let best = 1
  let bestTier: RewardsTier | null = null
  for (const r of rewards) {
    if (r.categories.some(c => c.toLowerCase() === category.toLowerCase())) {
      const mult = r.unit === "%" ? r.multiplier : r.multiplier  // points and % both treated as raw multiplier
      if (mult > best) {
        best = mult
        bestTier = r
      }
    }
  }
  // Fall back to "everything_else" / "all" multiplier if no category match.
  if (best === 1) {
    for (const r of rewards) {
      if (r.categories.some(c => ["everything_else", "all", "everything"].includes(c.toLowerCase()))) {
        if (r.multiplier > best) {
          best = r.multiplier
          bestTier = r
        }
      }
    }
  }
  return { multiplier: best, tier: bestTier }
}

export function recommendCards(
  spend: SpendByCategory,
  ownedCards: OwnedCard[],
  catalog: CreditCardBonus[],
): Recommendation[] {
  const out: Recommendation[] = []
  // Map owned cards → catalog entries so we know their reward tiers.
  const ownedCatalog = ownedCards
    .map(o => catalog.find(c => c.card_name.toLowerCase() === o.card_name.toLowerCase()))
    .filter((c): c is CreditCardBonus => !!c && !c.expired)

  for (const [category, monthlySpend] of Object.entries(spend)) {
    if (monthlySpend < MIN_CATEGORY_SPEND) continue
    if (category === "other") continue  // too generic to recommend on

    // What's the user's current best for this category?
    let ownedBest = 1
    for (const c of ownedCatalog) {
      const { multiplier } = bestMultiplierForCategory(category, c.rewards)
      if (multiplier > ownedBest) ownedBest = multiplier
    }

    // What's the catalog's best non-owned card for this category?
    let catalogBest: { card: CreditCardBonus; multiplier: number } | null = null
    const ownedNames = new Set(ownedCards.map(o => o.card_name.toLowerCase()))
    for (const c of catalog) {
      if (c.expired) continue
      if (ownedNames.has(c.card_name.toLowerCase())) continue
      const { multiplier } = bestMultiplierForCategory(category, c.rewards)
      if (multiplier <= 1) continue
      if (!catalogBest || multiplier > catalogBest.multiplier) {
        catalogBest = { card: c, multiplier }
      }
    }

    if (!catalogBest) continue
    if (catalogBest.multiplier <= ownedBest) continue

    const lift = catalogBest.multiplier - ownedBest
    const annualLift = Math.round(monthlySpend * 12 * (lift / 100))
    // Lift in dollars depends on whether multiplier is % cashback or points/$.
    // We're being conservative — treating the diff as "raw extra units / year"
    // and not multiplying by cpp. For a real number, the optimizer will need
    // the user's cpp valuation. Good enough as a stub.

    out.push({
      id: `card:${catalogBest.card.id}:${category}`,
      kind: "card-acquisition",
      priority: monthlySpend * lift,
      title: `${catalogBest.card.card_name} for ${category}`,
      detail: `Spending ~$${monthlySpend.toLocaleString()}/mo on ${category}. Your current best earns ${ownedBest}x; ${catalogBest.card.card_name} earns ${catalogBest.multiplier}x. ~+${annualLift} units/yr lift before SUB.${catalogBest.card.annual_fee ? ` AF $${catalogBest.card.annual_fee}.` : " No AF."}`,
      cta: catalogBest.card.offer_link
        ? { label: "View offer", href: catalogBest.card.offer_link }
        : { label: "Open Spending", href: "/stacksos/spending" },
    })
  }

  // Dedupe by card id — one recommendation per card even if it tops multiple categories.
  const seen = new Set<string>()
  return out
    .sort((a, b) => b.priority - a.priority)
    .filter(r => {
      const cardId = r.id.split(":")[1]
      if (seen.has(cardId)) return false
      seen.add(cardId)
      return true
    })
    .slice(0, 5)
}
