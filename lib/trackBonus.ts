import { markBonusStarted, getCompletedBonuses } from "./completedBonuses"
import { addSavingsEntry, getSavingsEntries } from "./savingsEntries"
import { addOwnedCard } from "./ownedCards"
import { savingsBonuses } from "./data/savingsBonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"
import { signupBonusValue } from "./data/cardSpendValue"

export type TrackKind =
  | "personal-checking"
  | "business" // legacy alias for business-checking; both route to completed_bonuses
  | "business-checking" // explicit — same module as personal-checking
  | "personal-savings"
  | "business-savings" // explicit — same module as personal-savings
  | "brokerage"
  | "credit-card"

/**
 * Outcome of an attempted track. `duplicate` means the user already has
 * this bonus open — we surface that to the UI so it can render an
 * "Already tracking" state instead of a fake success.
 */
export type TrackResult = "added" | "duplicate" | "error"

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Routing table for every TrackKind:
 *  - checking variants     → completed_bonuses (paycheck module)
 *  - savings variants      → savings_entries  (savings module)
 *  - brokerage             → savings_entries  (savings module — sits in the same model)
 *  - credit-card           → owned_cards      (spending module)
 *
 * Returns "added" on success, "duplicate" when the user already has an
 * open record for this bonus, and "error" on failure or unknown bonusId.
 */
export async function trackCatalogBonus(
  userId: string,
  bonusId: string,
  kind: TrackKind,
): Promise<TrackResult> {
  if (kind === "personal-checking" || kind === "business" || kind === "business-checking") {
    // Duplicate guard: an existing open completed_bonuses row for this
    // catalog id means we should NOT create a second one.
    const existing = await getCompletedBonuses(userId)
    const open = existing.find(r => r.bonus_id === bonusId && !r.closed_date)
    if (open) return "duplicate"
    const result = await markBonusStarted(userId, bonusId, today())
    return result ? "added" : "error"
  }

  if (kind === "personal-savings" || kind === "business-savings" || kind === "brokerage") {
    const bonus = savingsBonuses.find(b => b.id === bonusId)
    if (!bonus) return "error"
    const existing = await getSavingsEntries(userId)
    const open = existing.find(e => e.bonus_name === bonus.id && e.status !== "completed" && e.status !== "canceled")
    if (open) return "duplicate"
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
    return result ? "added" : "error"
  }

  if (kind === "credit-card") {
    const card = creditCardBonuses.find(c => c.id === bonusId)
    if (!card) return "error"
    const signupCash = signupBonusValue(card)
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
      role: "sub-in-progress",
      source_type: "catalog",
      canonical_offer_id: card.id,
      notes: null,
      incomplete_info: false,
    })
    return result ? "added" : "error"
  }

  return "error"
}
