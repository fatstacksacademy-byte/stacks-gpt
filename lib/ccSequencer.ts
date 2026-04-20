/**
 * Credit card bonus sequencer — orders cards by return on spend.
 *
 * Valuation: 1 cpp for general/airline points, 0.5 cpp for hotel points.
 * Net value = (bonus * cpp) + statement_credits_year1 - annual_fee
 * Return per month = net_value / months_to_complete
 * months_to_complete = min_spend / monthly_budget (capped at spend_months)
 */

import { CreditCardBonus } from "./data/creditCardBonuses"

export type SequencedCard = {
  card: CreditCardBonus
  net_value: number
  months_to_complete: number
  return_per_month: number
  cumulative_value: number
  cumulative_months: number
}

/** Default cap on credit card applications per year. 4 ≈ one every 90 days,
 *  the rough churning consensus for keeping new-account inquiries under
 *  control without tripping issuer velocity rules. Each card application
 *  also dings the credit score temporarily, so spreading them out matters. */
export const DEFAULT_MAX_CARDS_PER_YEAR = 4

export function sequenceCards(
  cards: CreditCardBonus[],
  monthlyBudget: number,
  userState?: string | null,
  maxCardsPerYear: number = DEFAULT_MAX_CARDS_PER_YEAR,
): SequencedCard[] {
  // Exclude cards with no actionable apply link — recommending them would
  // be misleading (the user has nowhere to click). The RWP-imported batch
  // ships with offer_link === "" until issuer URLs are filled in via
  // follow-up; the verify:cards admin queue will surface them.
  //
  // Also respect state_restricted when userState is provided. The CC
  // catalog schema uses a single state_restricted string[] as the
  // allow-list (mirrors checking-bonus filter semantics but with the
  // opposite shape — checking uses eligibility.states_allowed alongside
  // a boolean gate). Card-level state restriction is currently unused
  // in the catalog but wired here so adding region-locked cards later
  // doesn't require an additional code change.
  const available = cards.filter(c => {
    if (c.expired) return false
    if (!c.offer_link || c.offer_link.length === 0) return false
    if (userState && c.state_restricted && c.state_restricted.length > 0) {
      if (!c.state_restricted.includes(userState)) return false
    }
    return true
  })

  // Step 1: filter to feasible cards. A card is infeasible if the user
  // cannot realistically hit its min_spend within the bank's deadline at
  // their monthly budget — recommending Amex Business Platinum ($20k in
  // 3mo) to a $2k/mo spender was the bug here. We allow a small buffer
  // (1.05x) so a card requiring $5,000 in 3 months at exactly $1,667/mo
  // doesn't get knocked out by floating-point noise.
  const FEASIBILITY_BUFFER = 1.05
  const feasible = available.filter(card => {
    if (card.min_spend <= 0) return true
    const monthsNeeded = card.min_spend / monthlyBudget
    return monthsNeeded <= card.spend_months * FEASIBILITY_BUFFER
  })

  const scored = feasible.map(card => {
    const bonus_value = card.cpp_value >= 1
      ? card.bonus_amount * 1         // cash cards: bonus_amount IS the dollar value
      : card.bonus_amount * card.cpp_value  // points cards

    const net_value = bonus_value + card.statement_credits_year1
      - (card.annual_fee_waived_first_year ? 0 : card.annual_fee)

    // How many months to hit minimum spend at this budget. Floor at 0.5
    // so an instant-qualify card doesn't divide-by-zero, but no longer
    // cap at card.spend_months — the feasibility filter above already
    // guarantees raw_months <= card.spend_months * 1.05, so capping was
    // hiding the real "you can't actually do this" cases.
    const months_to_complete = Math.max(
      card.min_spend > 0 ? card.min_spend / monthlyBudget : 0.5,
      0.5,
    )

    const return_per_month = months_to_complete > 0
      ? net_value / months_to_complete
      : net_value

    return { card, net_value, months_to_complete, return_per_month, cumulative_value: 0, cumulative_months: 0 }
  })

  // Sort by return per month descending — highest value per month of spend first
  scored.sort((a, b) => b.return_per_month - a.return_per_month)

  // Filter to only positive-value cards
  const positive = scored.filter(s => s.net_value > 0)

  // Build cumulative timeline with application-pace spacing.
  //
  // Each card needs at least `minGapMonths` between its application date
  // and the previous card's application date (12/maxCardsPerYear → e.g.
  // 4 cards/year = 3-month gap). If the previous card needed longer than
  // that gap to complete its min_spend, the next card waits until the
  // previous one is done (so the user isn't juggling two open SUBs).
  //
  //   nextStart = prevStart + max(minGapMonths, prevMonthsToComplete)
  //   completion = nextStart + currentMonthsToComplete
  //
  // cumulative_months therefore = the month at which this card's spend
  // is complete; cumulative_value = total net value through this card.
  // The 12-month projection upstream filters by cumulative_months <= 12,
  // which falls out to ≤ maxCardsPerYear cards by construction.
  const minGapMonths = 12 / Math.max(1, maxCardsPerYear)
  let prevStart = 0
  let prevMonths = 0
  let cumValue = 0
  positive.forEach((s, i) => {
    const startMonth = i === 0 ? 0 : prevStart + Math.max(minGapMonths, prevMonths)
    const completionMonth = startMonth + s.months_to_complete
    cumValue += s.net_value
    s.cumulative_months = Math.round(completionMonth * 10) / 10
    s.cumulative_value = Math.round(cumValue)
    prevStart = startMonth
    prevMonths = s.months_to_complete
  })

  return positive
}

export function formatCurrency(n: number): string {
  return n >= 0
    ? `$${Math.round(n).toLocaleString()}`
    : `-$${Math.round(Math.abs(n)).toLocaleString()}`
}
