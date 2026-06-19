/**
 * "Best card for my daily spend" — reward estimation.
 *
 * Given a user's monthly spend across a few simple buckets, estimate how much
 * each card returns per year in ongoing rewards (NOT the signup bonus). The
 * signup bonus is layered on separately by the UI so users can weigh a big
 * first-year haul against steady long-term earning.
 *
 * The catalog stores granular reward categories (76+ tokens). The shared
 * spending taxonomy exposes a compact core plus precise searchable add-ons,
 * then picks the card's best-earning tier for every category the user enters.
 */
import type { CreditCardBonus, RewardsTier } from "./creditCardBonuses"
import {
  SPENDING_CATEGORY_BY_KEY,
  SPENDING_CATEGORY_DEFINITIONS,
  type SpendingCategory,
} from "../spendingCategories"

export type SpendBucket = SpendingCategory
export type SpendInput = Partial<Record<SpendBucket, number>>

export const SPEND_BUCKETS = SPENDING_CATEGORY_DEFINITIONS

/** Fallback "base" tier tokens — what unbucketed spend earns. */
const BASE_TOKENS = ["all_other", "everything_else"]

/**
 * The cents-per-point to use for *reward-rate* math.
 *
 * Cashback cards store `cpp_value: 1` so their face-value cash signup bonus
 * (`bonus_amount × cpp_value`) comes out right — but their reward `multiplier`
 * is a percent (5 = 5% back), so multiplier × 1 would imply $5 per $1 spent.
 * Real points cards never exceed ~$0.01/pt, so any cpp above 0.02 is that cash
 * artifact; normalize it to 0.01 (turning multiplier 5 → $0.05/$ = 5%). Signup
 * valuation is untouched and still uses the true cpp_value.
 */
function rewardCpp(card: CreditCardBonus): number {
  return card.cpp_value > 0.02 ? 0.01 : card.cpp_value
}

/** Dollar value of $1 of spend at a given tier on a given card. */
function dollarPerDollar(card: CreditCardBonus, tier: RewardsTier): number {
  if (tier.unit === "%") return tier.multiplier / 100
  // points / miles / cashback are all valued through the (normalized) cpp.
  return tier.multiplier * rewardCpp(card)
}

/** The card's base earn rate ($/$) for unbucketed spend. Defaults to 1pt × cpp. */
function baseRate(card: CreditCardBonus): number {
  const base = (card.rewards ?? []).find(t => t.categories.some(c => BASE_TOKENS.includes(c)))
  if (base) return dollarPerDollar(card, base)
  return rewardCpp(card) // assume 1x if no explicit base tier
}

/** Best $/$ rate a card earns for a given bucket, and whether it beat base. */
function bestRateForBucket(card: CreditCardBonus, bucket: SpendBucket): { rate: number; capped?: number } {
  const tokens = SPENDING_CATEGORY_BY_KEY[bucket].catalogTokens
  let best = baseRate(card)
  let cap: number | undefined
  for (const tier of card.rewards ?? []) {
    if (tier.categories.some(c => tokens.includes(c))) {
      const r = dollarPerDollar(card, tier)
      if (r > best) {
        best = r
        cap = tier.annual_cap
      }
    }
  }
  return { rate: best, capped: cap }
}

/**
 * Best $/$ earn rate a card returns for a given spending bucket — the card's
 * best matching tier, or its base ("everything else") rate when nothing matches.
 * Exposed for valuing one-off spend (e.g. the sign-up-bonus-window spend, once
 * the user says which category they put it on). Ignores annual caps — it's a
 * marginal rate, not an annualized estimate.
 */
export function categoryEarnRate(card: CreditCardBonus, bucket: SpendBucket): number {
  return bestRateForBucket(card, bucket).rate
}

export type SpendEstimate = {
  card: CreditCardBonus
  /** Ongoing annual reward value in dollars (excludes signup bonus). */
  annualRewards: number
  /** Per-bucket annual reward dollars, for the breakdown UI. */
  breakdown: Partial<Record<SpendBucket, number>>
  /** First-year signup value (points × cpp + credits − effective annual fee). */
  signupValue: number
  /** annualRewards − annual fee (effective ongoing value after year one). */
  netAnnual: number
}

// ─── Sign-up-bonus headline ─────────────────────────────────────────────────
// The actual advertised SUB ("100K UR", "$200", "Up to 90K MR") — NOT a
// cents-per-point dollar valuation. The cpp-based dollar value is editorial and
// belongs in the article analysis, not on the card headline where it confuses.

const CURRENCY_ABBR: Record<string, string> = {
  "Ultimate Rewards": "UR",
  "Membership Rewards": "MR",
  "ThankYou Points": "TYP",
  "ThankYou": "TYP",
  "Capital One miles": "C1 miles",
}

function compactAmount(n: number): string {
  return n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : n.toLocaleString()
}

/** Variable/targeted offer → headline should hedge with "Up to". */
export function isVariableBonus(card: CreditCardBonus): boolean {
  if (typeof card.bonus_variable === "boolean") return card.bonus_variable
  return card.issuer === "amex" || (card.bonus_tiers?.length ?? 0) > 0
}

/** Raw welcome-bonus headline: "100K UR", "$200", or "Up to 90K MR". */
export function subHeadline(card: CreditCardBonus): string {
  const amt = card.bonus_amount ?? 0
  if (amt <= 0) return "No current bonus"
  const core = card.bonus_currency === "cash"
    ? `$${amt.toLocaleString()}`
    : `${compactAmount(amt)} ${CURRENCY_ABBR[card.bonus_currency] ?? card.bonus_currency}`
  return isVariableBonus(card) ? `Up to ${core}` : core
}

/** Cash-equivalent value of the welcome bonus before fees or credits. */
export function signupBonusValue(card: CreditCardBonus, cppOverride?: number): number {
  // True cashback offers are stored as face-value dollars. A few legacy rows
  // still say "cash" while carrying points-shaped amounts (20,000+); keep
  // those on cpp math until the catalog cleanup reaches them.
  if (card.bonus_currency === "cash" && card.bonus_amount < 2000) return card.bonus_amount
  return Math.round(card.bonus_amount * (cppOverride ?? card.cpp_value))
}

/** Signup year-one value, mirroring the /spending page's yearOneValue. */
export function signupYearOneValue(card: CreditCardBonus): number {
  const points = signupBonusValue(card)
  const fee = card.annual_fee_waived_first_year ? 0 : card.annual_fee
  return Math.round(points + card.statement_credits_year1 - fee)
}

export function estimateCard(card: CreditCardBonus, spend: SpendInput): SpendEstimate {
  const breakdown: Partial<Record<SpendBucket, number>> = {}
  let annualRewards = 0
  for (const key of Object.keys(spend) as SpendBucket[]) {
    if (!SPENDING_CATEGORY_BY_KEY[key]) continue
    const monthly = Math.max(0, spend[key] || 0)
    const annualSpend = monthly * 12
    const { rate, capped } = bestRateForBucket(card, key)
    let value: number
    if (capped != null && annualSpend > capped) {
      // Spend above the cap drops to base rate.
      value = capped * rate + (annualSpend - capped) * baseRate(card)
    } else {
      value = annualSpend * rate
    }
    breakdown[key] = Math.round(value)
    annualRewards += value
  }
  annualRewards = Math.round(annualRewards)
  const fee = card.annual_fee
  return {
    card,
    annualRewards,
    breakdown,
    signupValue: signupYearOneValue(card),
    netAnnual: annualRewards - fee,
  }
}

export type RankMode = "ongoing" | "first_year"

/**
 * Rank cards for a spend profile.
 *  - "ongoing": net annual rewards after the annual fee (long-term keeper).
 *  - "first_year": ongoing rewards + signup value (best year-one total).
 */
export function rankCardsForSpend(
  cards: CreditCardBonus[],
  spend: SpendInput,
  mode: RankMode = "ongoing",
): SpendEstimate[] {
  const totalMonthly = Object.values(spend).reduce((a, b) => a + (b || 0), 0)
  const estimates = cards
    .filter(c => !c.expired)
    .map(c => estimateCard(c, spend))
  estimates.sort((a, b) => {
    if (mode === "first_year") {
      return (b.netAnnual + b.signupValue) - (a.netAnnual + a.signupValue)
    }
    return b.netAnnual - a.netAnnual
  })
  // If the user entered no spend, ranking by rewards is meaningless — caller
  // should fall back to signup value. Surface that via the totalMonthly hint.
  void totalMonthly
  return estimates
}
