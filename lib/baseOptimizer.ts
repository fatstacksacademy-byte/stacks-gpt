/**
 * Base Optimizer — static "set and forget" recommendations.
 *
 * Given what the user has already entered (owned_accounts, savings &
 * spending profiles), surface opportunities to earn more without
 * running through the active sequencer. Output is a ranked list of
 * one-line "you could be earning $X more" prompts, each with a single
 * CTA.
 *
 * Three flavors to start:
 *   1. Savings rate gap   — current_apy vs. top catalog bonuses
 *   2. Checking fee audit — monthly_fee > 0 on an owned checking account
 *   3. Card category gap  — top multiplier per category the user spends
 *                           on, vs. what they already hold
 *
 * All functions are pure and cheap; recompute on the client at render time.
 */

import { savingsBonuses } from "./data/savingsBonuses"
import { bonuses } from "./data/bonuses"
import { creditCardBonuses, type RewardsTier } from "./data/creditCardBonuses"
import type { OwnedAccount } from "./ownedAccounts"
import type { SavingsProfile } from "./savingsProfile"
import type { SpendingProfile } from "./spendingProfile"

export type BaseOpportunity = {
  id: string
  kind: "savings-rate" | "checking-fee" | "card-category"
  title: string            // "You could be earning $X more"
  detail: string           // The explanation
  annualImpact: number     // Estimated dollars gained (or saved) per year
  cta: { label: string; href: string }
}

// Savings APY must beat current by this much to bother recommending.
const SAVINGS_APY_GAP = 0.005  // 0.5%
// Card category multiplier must exceed user's best by this factor.
const CARD_MULTIPLIER_FACTOR = 2
// Min monthly spend per category before we bother recommending a card.
const MIN_CATEGORY_SPEND = 50

// ─────────────────────────────────────────────────────────────────────────
// 1. Savings rate gap
// ─────────────────────────────────────────────────────────────────────────

/**
 * Compare the user's self-reported current_apy against the top 3 savings
 * bonuses by effective APY. Flag any bonus whose effective APY beats the
 * user's current by more than 0.5%.
 *
 * Earnings model is one-time, NOT annualized — the elevated APY only
 * applies during the hold period:
 *   interest_during_hold = current_balance × bonus.base_apy × (hold_days / 365)
 *   total_earnings       = bonus_amount + interest_during_hold
 *
 * total_earnings flows through the BaseOpportunity.dollarImpact field;
 * fee + card opportunities continue to populate it with annualized
 * values. The Base UI sums the field as a rough "potential gain"
 * summary and per-line copy makes the time period explicit.
 *
 * Skip rules:
 *   - current_balance null/0 → return [] (no money to deposit)
 *   - current_apy null       → treated as 0% (still surface opportunities)
 */
export function recommendSavingsRateGaps(
  savingsProfile: SavingsProfile | null,
): BaseOpportunity[] {
  if (!savingsProfile) return []
  const balance = savingsProfile.current_balance
  if (balance == null || balance <= 0) return []
  const currentApy = savingsProfile.current_apy ?? 0  // null → 0% (don't skip)

  // Compute effective APY for every non-expired savings bonus, using the
  // top tier (biggest bonus) whose min_deposit the user can afford.
  // Effective APY is just the comparator for ranking + threshold gate;
  // the dollar value the user sees is one-time total earnings.
  type Candidate = {
    bonus: typeof savingsBonuses[number]
    effectiveApy: number
    bonusAmount: number
    deposit: number
    interestDuringHold: number
    totalEarnings: number
  }
  const candidates: Candidate[] = []
  for (const b of savingsBonuses) {
    if ((b as { expired?: boolean }).expired) continue
    const affordable = b.tiers.filter(t => t.min_deposit <= balance)
    if (affordable.length === 0) continue
    const tier = affordable.reduce((best, t) => t.bonus_amount > best.bonus_amount ? t : best)
    const interestForRanking = tier.min_deposit * b.base_apy * (b.total_hold_days / 365)
    const effectiveApy = (tier.bonus_amount + interestForRanking) / tier.min_deposit * (365 / b.total_hold_days)
    // The user-facing dollar figure assumes their whole balance flows
    // into the bonus account (capped by tier.min_deposit only when the
    // tier itself caps deposits — most bonuses don't, so use balance).
    const interestDuringHold = balance * b.base_apy * (b.total_hold_days / 365)
    const totalEarnings = tier.bonus_amount + interestDuringHold
    candidates.push({
      bonus: b,
      effectiveApy,
      bonusAmount: tier.bonus_amount,
      deposit: tier.min_deposit,
      interestDuringHold: Math.round(interestDuringHold),
      totalEarnings: Math.round(totalEarnings),
    })
  }

  const top3 = candidates.sort((a, b) => b.effectiveApy - a.effectiveApy).slice(0, 3)
  const out: BaseOpportunity[] = []
  for (const c of top3) {
    const gap = c.effectiveApy - currentApy
    if (gap < SAVINGS_APY_GAP) continue
    const days = c.bonus.total_hold_days
    out.push({
      id: `savings-rate:${c.bonus.id}`,
      kind: "savings-rate",
      title: `You could earn $${c.totalEarnings.toLocaleString()} in ${days} days`,
      detail: `${c.bonus.bank_name} — $${c.bonusAmount.toLocaleString()} bonus on a $${c.deposit.toLocaleString()} minimum deposit, plus ~$${c.interestDuringHold.toLocaleString()} interest at ${(c.bonus.base_apy * 100).toFixed(2)}% APY over the hold. Effective APY ${(c.effectiveApy * 100).toFixed(2)}% vs. your ${(currentApy * 100).toFixed(2)}%.`,
      annualImpact: c.totalEarnings,  // one-time, not annualized — see file header
      cta: { label: "Open in Savings", href: "/stacksos/savings" },
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Checking fee audit
// ─────────────────────────────────────────────────────────────────────────

/**
 * Surface any owned checking account whose institution has a monthly_fee
 * recorded in the catalog. We cross-reference bonuses.ts by bank_name
 * (case-insensitive substring match) since owned_accounts doesn't store
 * fee data on the row itself.
 *
 * Annual impact estimate: 12 × monthly_fee.
 */
export function recommendCheckingFees(
  accounts: OwnedAccount[],
): BaseOpportunity[] {
  const out: BaseOpportunity[] = []
  const checking = accounts.filter(a => a.account_type === "checking")
  if (checking.length === 0) return out

  const catalogFees: { bank: string; monthlyFee: number; waiverText: string | null }[] = []
  for (const b of bonuses as { bank_name: string; fees?: { monthly_fee?: number; monthly_fee_waiver_text?: string } }[]) {
    const fee = b.fees?.monthly_fee
    if (typeof fee === "number" && fee > 0) {
      catalogFees.push({
        bank: b.bank_name,
        monthlyFee: fee,
        waiverText: b.fees?.monthly_fee_waiver_text ?? null,
      })
    }
  }

  for (const acct of checking) {
    const inst = acct.institution.trim().toLowerCase()
    if (!inst) continue
    // Pick the lowest-fee entry for this institution (users with the
    // fee-free variant shouldn't be flagged on the pricier tier).
    const matches = catalogFees.filter(f => {
      const bank = f.bank.toLowerCase()
      return bank.includes(inst) || inst.includes(bank.split("(")[0].trim())
    })
    if (matches.length === 0) continue
    const cheapest = matches.reduce((best, f) => f.monthlyFee < best.monthlyFee ? f : best)
    const annualImpact = cheapest.monthlyFee * 12
    out.push({
      id: `checking-fee:${acct.id}`,
      kind: "checking-fee",
      title: `You could save $${annualImpact}/yr on checking fees`,
      detail: `${acct.institution}${acct.nickname ? ` (${acct.nickname})` : ""} has a $${cheapest.monthlyFee}/mo fee in our catalog${cheapest.waiverText ? ` — ${cheapest.waiverText}` : "."} Consider waiver options or switching to a no-fee account.`,
      annualImpact,
      cta: { label: "Review in Base", href: "/stacksos/base" },
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Credit card category gap
// ─────────────────────────────────────────────────────────────────────────

function bestCatalogMultiplierForCategory(category: string): { card: typeof creditCardBonuses[number]; multiplier: number; tier: RewardsTier } | null {
  let best: { card: typeof creditCardBonuses[number]; multiplier: number; tier: RewardsTier } | null = null
  for (const c of creditCardBonuses) {
    if (c.expired) continue
    if (!c.rewards) continue
    for (const tier of c.rewards) {
      if (!tier.categories.some(cat => cat.toLowerCase() === category.toLowerCase())) continue
      if (!best || tier.multiplier > best.multiplier) {
        best = { card: c, multiplier: tier.multiplier, tier }
      }
    }
  }
  return best
}

/**
 * For each category the user spends meaningfully on, compare their stored
 * current_multiplier against the catalog's top multiplier. Flag when a
 * non-owned card earns at least 2× what the user gets today.
 *
 * Annual impact estimate: monthly_spend × 12 × (bestMultiplier − currentMultiplier).
 * Treated as "raw units per year" — we don't attempt to convert point
 * multipliers to dollar equivalents here (cpp varies by card and is
 * handled in the active sequencer).
 */
export function recommendCardCategoryGaps(
  spendingProfile: SpendingProfile | null,
): BaseOpportunity[] {
  if (!spendingProfile) return []
  const categorySpend = spendingProfile.category_spend ?? {}
  const currentMultipliers = spendingProfile.current_multipliers ?? {}
  const currentCards = spendingProfile.current_cards ?? {}
  const ownedNames = new Set(Object.values(currentCards).map(n => n.toLowerCase()))

  const out: BaseOpportunity[] = []
  for (const [category, monthlySpend] of Object.entries(categorySpend)) {
    if (!monthlySpend || monthlySpend < MIN_CATEGORY_SPEND) continue
    if (category === "other") continue  // fallback bucket — not worth recommending on

    const userMult = currentMultipliers[category] ?? currentMultipliers["base"] ?? 1
    const catalogBest = bestCatalogMultiplierForCategory(category)
    if (!catalogBest) continue
    // Skip if the user already owns the top catalog card for this category.
    if (ownedNames.has(catalogBest.card.card_name.toLowerCase())) continue
    if (catalogBest.multiplier < userMult * CARD_MULTIPLIER_FACTOR) continue

    const liftPerDollar = catalogBest.multiplier - userMult
    const annualLift = Math.round(monthlySpend * 12 * liftPerDollar / 100)
    out.push({
      id: `card-category:${catalogBest.card.id}:${category}`,
      kind: "card-category",
      title: `You could earn ~$${annualLift}/yr more on ${category.replace(/_/g, " ")}`,
      detail: `${catalogBest.card.card_name} earns ${catalogBest.multiplier}${catalogBest.tier.unit === "%" ? "%" : "x"} on ${category.replace(/_/g, " ")} vs. your current ${userMult}${catalogBest.tier.unit === "%" ? "%" : "x"} — on ~$${monthlySpend.toLocaleString()}/mo of spend in that category.`,
      annualImpact: annualLift,
      cta: { label: "View in Spending", href: "/stacksos/spending" },
    })
  }

  // Dedupe by card so a multi-category winner only shows once.
  const seen = new Set<string>()
  return out
    .sort((a, b) => b.annualImpact - a.annualImpact)
    .filter(o => {
      const cardId = o.id.split(":")[1]
      if (seen.has(cardId)) return false
      seen.add(cardId)
      return true
    })
    .slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────
// Combined
// ─────────────────────────────────────────────────────────────────────────

export function runBaseOptimizer(input: {
  accounts: OwnedAccount[]
  savingsProfile: SavingsProfile | null
  spendingProfile: SpendingProfile | null
}): BaseOpportunity[] {
  const all: BaseOpportunity[] = [
    ...recommendSavingsRateGaps(input.savingsProfile),
    ...recommendCheckingFees(input.accounts),
    ...recommendCardCategoryGaps(input.spendingProfile),
  ]
  return all.sort((a, b) => b.annualImpact - a.annualImpact)
}
