/**
 * State availability for credit cards.
 *
 * Most cards are nationwide (no `state_restricted`). A few regional bank and
 * credit-union cards only accept residents of certain states. With no state
 * selected we can't know a user's eligibility, so state-restricted cards stay
 * hidden; picking a state adds the cards specific to it into the results.
 *
 * Ships dark today — zero cards carry `state_restricted` until regional cards
 * are populated, so default behavior (all nationwide cards) is unchanged.
 */
import type { CreditCardBonus } from "./creditCardBonuses"

/** Is this card open to residents of the given state? Nationwide cards always are. */
export function availableInState(card: CreditCardBonus, stateCode: string | null): boolean {
  const r = card.state_restricted
  if (!r || r.length === 0) return true // nationwide
  return stateCode != null && r.includes(stateCode)
}

/** Non-expired cards available in `stateCode`: nationwide + that state's restricted cards. */
export function cardsForState(cards: CreditCardBonus[], stateCode: string | null): CreditCardBonus[] {
  return cards.filter(c => !c.expired && availableInState(c, stateCode))
}

/** The cards that are *specific* to a state (restricted and including it) — what a state pick adds. */
export function stateSpecificCards(cards: CreditCardBonus[], stateCode: string): CreditCardBonus[] {
  return cards.filter(c => !c.expired && (c.state_restricted?.includes(stateCode) ?? false))
}
