import { markBonusStarted } from "./completedBonuses"
import { addSavingsEntry } from "./savingsEntries"
import { addOwnedCard } from "./ownedCards"
import { savingsBonuses } from "./data/savingsBonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"

export type TrackKind =
  | "personal-checking"
  | "business" // business checking — same table as personal-checking
  | "personal-savings"
  | "brokerage"
  | "credit-card"

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Add a catalog bonus to the correct Stacks OS table based on its kind.
 * - personal-checking → completed_bonuses (paycheck module)
 * - personal-savings + brokerage → savings_entries (savings module)
 * - credit-card → owned_cards (spending module)
 *
 * Returns true on success, false on failure (including unknown bonusId).
 */
export async function trackCatalogBonus(
  userId: string,
  bonusId: string,
  kind: TrackKind,
): Promise<boolean> {
  if (kind === "personal-checking" || kind === "business") {
    const result = await markBonusStarted(userId, bonusId, today())
    return result !== null
  }

  if (kind === "personal-savings" || kind === "brokerage") {
    const bonus = savingsBonuses.find(b => b.id === bonusId)
    if (!bonus) return false
    const tier = bonus.tiers[0]
    const interestEarned = Math.round(tier.min_deposit * bonus.base_apy * (bonus.total_hold_days / 365))
    const expectedTotal = tier.bonus_amount + interestEarned
    const result = await addSavingsEntry(userId, {
      institution_name: bonus.bank_name,
      bonus_name: bonus.id,
      bonus_amount: tier.bonus_amount,
      deposit_required: tier.min_deposit,
      holding_period_days: bonus.total_hold_days,
      offer_apy: bonus.base_apy,
      promo_apy: null,
      estimated_yield: interestEarned,
      expected_total_value: expectedTotal,
      actual_value: null,
      opened_date: today(),
      deadline: null,
      status: "active",
      notes: bonus.notes || null,
      source_type: "system",
      canonical_offer_id: null,
    })
    return result !== null
  }

  if (kind === "credit-card") {
    const card = creditCardBonuses.find(c => c.id === bonusId)
    if (!card) return false
    const signupCash = Math.round(card.bonus_amount * card.cpp_value)
    const feeY1 = card.annual_fee_waived_first_year ? 0 : card.annual_fee
    const expected = signupCash + card.statement_credits_year1 - feeY1
    const openedDate = today()
    const result = await addOwnedCard(userId, {
      card_name: card.card_name,
      issuer: card.issuer,
      signup_bonus_value: signupCash,
      annual_fee: card.annual_fee,
      spend_requirement: card.min_spend,
      spend_deadline: addDays(openedDate, card.spend_months * 30),
      opened_date: openedDate,
      expected_value: expected,
      actual_value: null,
      status: "active",
      role: null,
      notes: null,
      incomplete_info: false,
    })
    return result !== null
  }

  return false
}
