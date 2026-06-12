/**
 * "Best card for my daily spend" — reward estimation.
 *
 * Given a user's monthly spend across a few simple buckets, estimate how much
 * each card returns per year in ongoing rewards (NOT the signup bonus). The
 * signup bonus is layered on separately by the UI so users can weigh a big
 * first-year haul against steady long-term earning.
 *
 * The catalog stores granular reward categories (76+ tokens). We collapse them
 * into the handful of buckets a normal person actually budgets by, then for
 * each bucket pick the card's best-earning tier that covers it.
 */
import type { CreditCardBonus, RewardsTier } from "./creditCardBonuses"

/** User-facing spend buckets. Keep this list short — it's a form, not a survey. */
export type SpendBucket = "groceries" | "gas" | "dining" | "travel" | "online" | "other"

export type SpendInput = Record<SpendBucket, number> // monthly $ per bucket

export const SPEND_BUCKETS: { key: SpendBucket; label: string; hint: string }[] = [
  { key: "groceries", label: "Groceries", hint: "supermarkets, warehouse clubs" },
  { key: "gas", label: "Gas & EV", hint: "gas stations, charging" },
  { key: "dining", label: "Dining", hint: "restaurants, takeout, delivery" },
  { key: "travel", label: "Travel", hint: "flights, hotels, transit, rideshare" },
  { key: "online", label: "Online shopping", hint: "Amazon, online retail" },
  { key: "other", label: "Everything else", hint: "all other purchases" },
]

/**
 * Which granular catalog tokens roll up into each user bucket. A card tier
 * "counts" for a bucket if any of its categories appears here. Portal-gated
 * tiers (e.g. "airfare_(portal)") are intentionally EXCLUDED — they require
 * booking through the issuer's travel portal, so they overstate everyday earn.
 */
const BUCKET_TOKENS: Record<SpendBucket, string[]> = {
  groceries: ["groceries", "groceries_online", "wholesale_clubs", "walmart", "target", "costco_wholesale", "sam's_club", "department_stores"],
  gas: ["gas_stations", "gas", "ev_charging"],
  dining: ["dining"],
  travel: ["travel", "airfare", "hotels", "car_rentals", "cruises", "transit", "ridesharing", "uber", "lyft", "parking", "toll_fees"],
  online: ["amazon", "online_retail", "paypal", "digital_wallet_payments", "apple"],
  other: ["all_other", "everything_else"],
}

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
  const tokens = BUCKET_TOKENS[bucket]
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

export type SpendEstimate = {
  card: CreditCardBonus
  /** Ongoing annual reward value in dollars (excludes signup bonus). */
  annualRewards: number
  /** Per-bucket annual reward dollars, for the breakdown UI. */
  breakdown: Record<SpendBucket, number>
  /** First-year signup value (points × cpp + credits − effective annual fee). */
  signupValue: number
  /** annualRewards − annual fee (effective ongoing value after year one). */
  netAnnual: number
}

/** Signup year-one value, mirroring the /spending page's yearOneValue. */
export function signupYearOneValue(card: CreditCardBonus): number {
  const points = card.bonus_amount * card.cpp_value
  const fee = card.annual_fee_waived_first_year ? 0 : card.annual_fee
  return Math.round(points + card.statement_credits_year1 - fee)
}

export function estimateCard(card: CreditCardBonus, spend: SpendInput): SpendEstimate {
  const breakdown = {} as Record<SpendBucket, number>
  let annualRewards = 0
  for (const { key } of SPEND_BUCKETS) {
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
