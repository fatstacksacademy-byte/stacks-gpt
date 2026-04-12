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

export function sequenceCards(
  cards: CreditCardBonus[],
  monthlyBudget: number,
): SequencedCard[] {
  const available = cards.filter(c => !c.expired)

  const scored = available.map(card => {
    const bonus_value = card.cpp_value >= 1
      ? card.bonus_amount * 1         // cash cards: bonus_amount IS the dollar value
      : card.bonus_amount * card.cpp_value  // points cards

    const net_value = bonus_value + card.statement_credits_year1
      - (card.annual_fee_waived_first_year ? 0 : card.annual_fee)

    // How many months to hit minimum spend at this budget
    const raw_months = card.min_spend > 0
      ? card.min_spend / monthlyBudget
      : 0.5  // instant-qualify cards get half a month

    // Can't exceed the bank's allowed timeframe
    const months_to_complete = Math.min(
      Math.max(raw_months, 0.5),
      card.spend_months,
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

  // Build cumulative timeline
  let cumMonths = 0
  let cumValue = 0
  for (const s of positive) {
    cumMonths += s.months_to_complete
    cumValue += s.net_value
    s.cumulative_months = Math.round(cumMonths * 10) / 10
    s.cumulative_value = Math.round(cumValue)
  }

  return positive
}

export function formatCurrency(n: number): string {
  return n >= 0
    ? `$${Math.round(n).toLocaleString()}`
    : `-$${Math.round(Math.abs(n)).toLocaleString()}`
}
