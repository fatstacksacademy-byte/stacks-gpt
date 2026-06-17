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
import { runIntroAprArbitrage } from "./introAprArbitrage"

/** Default high-yield savings APY used for the float estimate (editable in UI). */
export const DEFAULT_HYSA_APY = 0.04

export type CardValueOptions = {
  /** Factor in the 0% intro-APR float benefit (only applies if the card offers it). */
  zeroApr?: boolean
  /** HYSA APY as a decimal (0.04 = 4%). Defaults to DEFAULT_HYSA_APY. */
  hysaApy?: number
}

export type CardValueResult = {
  /** Cash-equivalent value of the welcome bonus. */
  signupBonus: number
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
  /** 0% APR float net interest (year 1 only); 0 when toggled off or unavailable. */
  floatBenefit: number
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
  const signupBonus = signupBonusValue(card)
  const year1Credits = card.statement_credits_year1
  const firstYearFee = card.annual_fee_waived_first_year ? 0 : card.annual_fee
  const recurringCredits = recurringAnnualCredits(card)
  const rewardsAnnual = est.annualRewards

  const promoMonths = card.intro_apr?.purchase_apr_months ?? 0
  const hasIntroApr = promoMonths > 0

  let floatBenefit = 0
  if (opts.zeroApr && hasIntroApr) {
    const totalMonthly = Object.values(spend).reduce((a, b) => a + (b || 0), 0)
    // Zero out rewards/bonus/fee so the result is pure float interest — the
    // everyday rewards and welcome bonus are already counted above.
    const r = runIntroAprArbitrage({
      monthlySpend: totalMonthly,
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
    })
    floatBenefit = Math.round(r.netInterest)
  }

  const year1 = Math.round(signupBonus + year1Credits - firstYearFee + rewardsAnnual + floatBenefit)
  const year2 = Math.round(rewardsAnnual + recurringCredits - card.annual_fee)

  return {
    signupBonus,
    year1Credits,
    firstYearFee,
    annualFee: card.annual_fee,
    rewardsAnnual,
    recurringCredits,
    floatBenefit,
    breakdown: est.breakdown,
    hasIntroApr,
    promoMonths,
    year1,
    year2,
  }
}
