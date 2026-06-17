/**
 * 0% intro-APR float (arbitrage) calculator.
 *
 * Models the "Blue Business Plus catch-all" strategy Nathaniel teaches:
 * instead of paying a credit card balance in full each month, you ride a
 * 0% intro-APR promo, pay only the minimum, and leave the cash that *would*
 * have paid the bill sitting in a high-yield savings account. The bank floats
 * your bill interest-free while your cash earns 4–5% APY. You pay the full
 * balance a few days before the promo ends.
 *
 * The signature insight (and the thing the calculator has to get right) is the
 * DECAYING interest curve. A purchase made in the first promo month sits in the
 * HYSA for the full promo length, so it earns the headline APY. A purchase made
 * late in the promo only earns a sliver before payoff. So the *effective* APY on
 * spend declines linearly across the promo — which is exactly why the strategy
 * works best when you re-up a fresh 0% card every ~6 months.
 *
 *   floatMonths(m) = promoMonths - m         (m = 0-indexed billing cycle)
 *   interest(m)    = spend(m) * apy/12 * floatMonths(m)
 *
 * The first month (m=0) floats the whole promo (e.g. 12 months → full APY);
 * each later month earns proportionally less. This matches the on-camera model:
 * "November purchases earn the full 4.5%; April purchases effectively earn 2.6%"
 * → 4.5% × (12-5)/12 = 2.6%.
 *
 * Total return on spend then blends three things the strategy stacks:
 *   1. the float interest (net of tax — HYSA interest is 1099-INT income),
 *   2. the card's everyday points/cash-back earn, and
 *   3. the welcome bonus (if the min-spend is met inside its window).
 *
 * All math is pure and deterministic (no Date.now / Math.random) so it unit-tests
 * cleanly and is safe to run inside the deterministic workflow harness.
 */

export type IntroAprInputs = {
  /** $ you put on the card each *active* spending month. */
  monthlySpend: number
  /** How many months you actively put spend on the card. Clamped to [0, promoMonths]. */
  spendMonths: number
  /** Length of the 0% intro-APR window, in billing cycles/months. */
  promoMonths: number
  /** Your HYSA APY as a decimal (4.5% → 0.045). */
  hysaApy: number
  /** Everyday earn rate as points (or %) per dollar. BBP = 2. A 2% cash card = 2. */
  pointsPerDollar: number
  /** Dollar value of one point. MR ≈ 0.01 cash floor; a 2% cash card uses 0.01. */
  cpp: number
  /** Welcome-bonus size in points. For a $ cash SUB, pass dollars×100 and keep cpp at 0.01. */
  welcomeBonusPoints: number
  /** Spend required to earn the welcome bonus. 0 = no bonus / already earned. */
  welcomeBonusMinSpend: number
  /** Window (months) to hit the welcome-bonus min spend. */
  welcomeBonusWindowMonths: number
  /** Marginal tax rate applied to the float interest (1099-INT). 15% → 0.15. */
  taxRateOnInterest: number
  /** Annual fee, if any. BBP/BBC = 0. */
  annualFee?: number
  /**
   * Optional explicit per-month spend, overriding the flat monthlySpend×spendMonths
   * schedule. Index 0 = first promo month. Useful for ramping spend like the real
   * BBP example ($4 the first month, growing over six months).
   */
  spendSchedule?: number[]
}

export type IntroAprMonth = {
  /** 0-indexed billing cycle. */
  month: number
  spend: number
  /** Months this cycle's cash keeps earning in the HYSA before you pay it off. */
  floatMonths: number
  /** Gross float interest earned on this cycle's spend. */
  interest: number
  /** interest / spend — the decaying effective rate on this month's spend. */
  effectiveRateOnSpend: number
}

export type IntroAprResult = {
  schedule: IntroAprMonth[]
  totalSpend: number

  // Float interest
  grossInterest: number
  taxOnInterest: number
  netInterest: number

  // Rewards
  basePoints: number
  welcomeBonusEarned: boolean
  welcomeBonusPoints: number
  totalPoints: number
  baseRewardsValue: number
  welcomeBonusValue: number
  rewardsValue: number

  // Totals
  annualFee: number
  totalProfit: number
  /** totalProfit / totalSpend, as a decimal (0.0754 = 7.54%). */
  returnOnSpend: number
  /**
   * Same number framed the way the videos do — "7.54x" means a 7.54% blended
   * return on every dollar swiped. (1x == 1% back.)
   */
  blendedMultiplier: number
}

function clampNonNeg(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Build the month-by-month spend schedule. Either the explicit override or a
 * flat monthlySpend across the first `spendMonths` months. Spend never extends
 * past the promo window (cash spent after payoff has no float to harvest).
 */
function buildSchedule(input: IntroAprInputs): number[] {
  const promo = Math.max(0, Math.floor(input.promoMonths))
  if (input.spendSchedule && input.spendSchedule.length > 0) {
    return input.spendSchedule.slice(0, promo).map(clampNonNeg)
  }
  const activeMonths = Math.min(promo, Math.max(0, Math.floor(input.spendMonths)))
  const monthly = clampNonNeg(input.monthlySpend)
  return Array.from({ length: activeMonths }, () => monthly)
}

export function runIntroAprArbitrage(input: IntroAprInputs): IntroAprResult {
  const promo = Math.max(0, Math.floor(input.promoMonths))
  const apy = clampNonNeg(input.hysaApy)
  const taxRate = Math.min(1, clampNonNeg(input.taxRateOnInterest))
  const annualFee = clampNonNeg(input.annualFee ?? 0)
  const cpp = clampNonNeg(input.cpp)

  const spendByMonth = buildSchedule(input)

  const schedule: IntroAprMonth[] = spendByMonth.map((spend, m) => {
    // A purchase in cycle m floats until payoff at the end of the promo.
    const floatMonths = Math.max(0, promo - m)
    const effectiveRateOnSpend = (apy * floatMonths) / 12
    const interest = spend * effectiveRateOnSpend
    return { month: m, spend, floatMonths, interest, effectiveRateOnSpend }
  })

  const totalSpend = schedule.reduce((s, r) => s + r.spend, 0)
  const grossInterest = schedule.reduce((s, r) => s + r.interest, 0)
  const taxOnInterest = grossInterest * taxRate
  const netInterest = grossInterest - taxOnInterest

  // Everyday earn on all spend.
  const basePoints = totalSpend * clampNonNeg(input.pointsPerDollar)

  // Welcome bonus: did cumulative spend clear the min inside the window?
  const minSpend = clampNonNeg(input.welcomeBonusMinSpend)
  const window = Math.max(0, Math.floor(input.welcomeBonusWindowMonths))
  let spendInWindow = 0
  for (let m = 0; m < schedule.length && m < window; m++) spendInWindow += schedule[m].spend
  const welcomeBonusEarned = minSpend > 0 && input.welcomeBonusPoints > 0 && spendInWindow >= minSpend
  const welcomeBonusPoints = welcomeBonusEarned ? clampNonNeg(input.welcomeBonusPoints) : 0

  const totalPoints = basePoints + welcomeBonusPoints
  const baseRewardsValue = basePoints * cpp
  const welcomeBonusValue = welcomeBonusPoints * cpp
  const rewardsValue = baseRewardsValue + welcomeBonusValue

  const totalProfit = rewardsValue + netInterest - annualFee
  const returnOnSpend = totalSpend > 0 ? totalProfit / totalSpend : 0

  return {
    schedule,
    totalSpend,
    grossInterest,
    taxOnInterest,
    netInterest,
    basePoints,
    welcomeBonusEarned,
    welcomeBonusPoints,
    totalPoints,
    baseRewardsValue,
    welcomeBonusValue,
    rewardsValue,
    annualFee,
    totalProfit,
    returnOnSpend,
    blendedMultiplier: returnOnSpend * 100,
  }
}
