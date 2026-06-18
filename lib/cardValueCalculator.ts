/**
 * Single-card value calculator — composes Year 1 and Year 2 dollar value for a
 * credit card given the user's monthly spend by category.
 *
 * Reuses the established pieces rather than reinventing them:
 *   • estimateCard()           — ongoing category rewards (lib/data/cardSpendValue)
 *   • signupBonusValue()       — cash-equivalent welcome bonus
 *   • runIntroAprArbitrage()   — the 0% intro-APR float benefit (lib/introAprArbitrage)
 *
 * Year 1  = welcome bonus + year-1 statement credits − first-year fee
 *           + ongoing category rewards (+ 0% APR float, if toggled & offered)
 * Year 2  = ongoing category rewards + recurring annual credits − annual fee
 *
 * The 0% APR float is a year-1-only benefit (it rides the intro promo window),
 * which is exactly why it belongs on Year 1 and not Year 2.
 */
import type { CreditCardBonus } from "./data/creditCardBonuses"
import { estimateCard, signupBonusValue, type SpendInput, type SpendBucket } from "./data/cardSpendValue"
import { runIntroAprArbitrage, type IntroAprResult } from "./introAprArbitrage"

/** Default high-yield savings APY used for the float estimate (editable in UI). */
export const DEFAULT_HYSA_APY = 0.04

/** Months of spend inputs the 0%-APR float calculator collects. */
export const APR_SCHEDULE_MONTHS = 12

export type CardValueOptions = {
  /**
   * Total spend you'll actually make inside the welcome-bonus window. The bonus
   * is GATED on this: below the card's `min_spend` you don't earn it. Defaults to
   * the card's `min_spend` (i.e. "assume the bonus is met").
   */
  subWindowSpend?: number
  /** Factor the 0% intro-APR float into Year 1 (only applies if the card offers it). */
  zeroApr?: boolean
  /** HYSA APY as a decimal (0.04 = 4%). Defaults to DEFAULT_HYSA_APY. */
  hysaApy?: number
  /**
   * Per-month purchase schedule for the 0%-APR float, index 0 = first promo
   * month. Overrides the flat estimate. Truncated to the promo window by the
   * underlying arbitrage model.
   */
  aprSchedule?: number[]
}

/**
 * Build the default 0%-APR spend schedule: front-load the welcome-bonus minimum
 * across the months you're given to hit it (min_spend ÷ spend_months), then $0
 * for the rest of the year. Spend that clears the bonus is exactly the spend you
 * float first, so this is also a sensible float starting point.
 */
export function defaultAprSchedule(
  minSpend: number,
  spendMonths: number,
  months: number = APR_SCHEDULE_MONTHS,
): number[] {
  const window = Math.max(1, Math.floor(spendMonths) || 3)
  const per = minSpend > 0 ? Math.round(minSpend / window) : 0
  return Array.from({ length: months }, (_, i) => (i < Math.min(window, months) ? per : 0))
}

/**
 * The 0%-APR float for a single card, isolated to pure interest (no rewards,
 * bonus, or fee — those are counted elsewhere in computeCardValue). Returns null
 * for cards without a 0% intro purchase APR. When `schedule` is omitted it falls
 * back to a flat `flatMonthlySpend` across the whole promo.
 */
export function introAprFloat(
  card: CreditCardBonus,
  opts: { schedule?: number[]; flatMonthlySpend?: number; hysaApy?: number } = {},
): IntroAprResult | null {
  const promoMonths = card.intro_apr?.purchase_apr_months ?? 0
  if (promoMonths <= 0) return null
  return runIntroAprArbitrage({
    monthlySpend: opts.flatMonthlySpend ?? 0,
    spendMonths: promoMonths,
    promoMonths,
    hysaApy: opts.hysaApy ?? DEFAULT_HYSA_APY,
    pointsPerDollar: 0,
    cpp: 0,
    welcomeBonusPoints: 0,
    welcomeBonusMinSpend: 0,
    welcomeBonusWindowMonths: 0,
    taxRateOnInterest: 0,
    annualFee: 0,
    spendSchedule: opts.schedule && opts.schedule.length > 0 ? opts.schedule : undefined,
  })
}

export type CardValueResult = {
  /** Cash-equivalent value of the welcome bonus that's actually counted (0 if the min spend isn't met). */
  signupBonus: number
  /** Full cash-equivalent welcome bonus regardless of whether the min spend is met — for "you'd miss out on $X" copy. */
  signupBonusPotential: number
  /** Welcome-bonus minimum spend the card requires. */
  minSpend: number
  /** Months allowed to hit the minimum spend. */
  spendMonths: number
  /** Whether the bonus is earned given the SUB-window spend (always true when there's no minimum). */
  bonusEarned: boolean
  /** First-year statement credits. */
  year1Credits: number
  /** Annual fee actually charged in year 1 (0 if waived first year). */
  firstYearFee: number
  /** Ongoing annual fee (years 2+). */
  annualFee: number
  /** Ongoing category rewards per year. */
  rewardsAnnual: number
  /** Recurring annual statement credits that keep paying in year 2+. */
  recurringCredits: number
  /** 0% APR float net interest folded into Year 1; 0 when toggled off or unavailable. */
  floatBenefit: number
  /** 0% APR float net interest from the schedule, regardless of whether it's folded into Year 1 (for the float section display). */
  floatValue: number
  /** Per-category ongoing reward dollars, for the breakdown UI. */
  breakdown: Partial<Record<SpendBucket, number>>
  hasIntroApr: boolean
  promoMonths: number
  year1: number
  year2: number
}

/**
 * Recurring annual statement credits (year 2+). An explicit annual_credits_detail
 * — even an empty array — is authoritative: it means the recurring credits have
 * been itemized (an empty list = the year-1 credits were one-time, so $0 recurs).
 * When the field is absent we assume the year-1 statement credits recur, true for
 * the large majority of cards whose travel/dining/etc. credits reset yearly.
 */
function recurringAnnualCredits(card: CreditCardBonus): number {
  if (card.annual_credits_detail) {
    return Math.round(
      card.annual_credits_detail.reduce((sum, c) => {
        const mult = c.cadence === "monthly" ? 12 : c.cadence === "biennial" ? 0.5 : 1
        return sum + c.amount * mult
      }, 0)
    )
  }
  return card.statement_credits_year1
}

export function computeCardValue(
  card: CreditCardBonus,
  spend: SpendInput,
  opts: CardValueOptions = {}
): CardValueResult {
  const est = estimateCard(card, spend)

  // Welcome bonus is gated on actually hitting the minimum spend in the window.
  const minSpend = card.min_spend ?? 0
  const subWindowSpend = opts.subWindowSpend ?? minSpend
  const bonusEarned = minSpend <= 0 || subWindowSpend >= minSpend
  const signupBonusPotential = signupBonusValue(card)
  const signupBonus = bonusEarned ? signupBonusPotential : 0

  const year1Credits = card.statement_credits_year1
  const firstYearFee = card.annual_fee_waived_first_year ? 0 : card.annual_fee
  const recurringCredits = recurringAnnualCredits(card)
  const rewardsAnnual = est.annualRewards

  const promoMonths = card.intro_apr?.purchase_apr_months ?? 0
  const hasIntroApr = promoMonths > 0

  // Always price the float (so the 0%-APR section can show it); only fold it into
  // Year 1 when the user opts in via `zeroApr`. With no explicit schedule, fall
  // back to the user's flat monthly spend across the whole promo.
  const totalMonthly = Object.values(spend).reduce((a, b) => a + (b || 0), 0)
  const float = introAprFloat(card, {
    schedule: opts.aprSchedule,
    flatMonthlySpend: totalMonthly,
    hysaApy: opts.hysaApy,
  })
  const floatValue = float ? Math.round(float.netInterest) : 0
  const floatBenefit = opts.zeroApr ? floatValue : 0

  const year1 = Math.round(signupBonus + year1Credits - firstYearFee + rewardsAnnual + floatBenefit)
  const year2 = Math.round(rewardsAnnual + recurringCredits - card.annual_fee)

  return {
    signupBonus,
    signupBonusPotential,
    minSpend,
    spendMonths: card.spend_months ?? 0,
    bonusEarned,
    year1Credits,
    firstYearFee,
    annualFee: card.annual_fee,
    rewardsAnnual,
    recurringCredits,
    floatBenefit,
    floatValue,
    breakdown: est.breakdown,
    hasIntroApr,
    promoMonths,
    year1,
    year2,
  }
}
