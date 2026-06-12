/**
 * State availability for credit cards.
 *
 * Most cards are nationwide (no `state_restricted`). Regional bank and
 * credit-union cards can have statewide, county-level, employer, family, or
 * association membership paths. `state_restricted` means the card may be
 * available in that state; the card's eligibility note carries the finer rule.
 * With no state selected, regional cards stay hidden.
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
