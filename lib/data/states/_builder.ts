import type { CreditCardBonus } from "../creditCardBonuses"

/**
 * Shared builder for state-specific regional card modules.
 *
 * Each state module (./colorado.ts, ./texas.ts, …) is the verified inventory of
 * LOCAL and REGIONAL bank / credit-union cards available in that state — the
 * cards a nationwide catalog can't surface. They mirror the Hawaii reference
 * module (../hawaiiCreditCardBonuses.ts) but route the repetitive defaulting +
 * `state_restricted` / `offer_verified_at` stamping through here so a module
 * only has to spell out the fields it actually verified.
 *
 * Pattern, per module:
 *   1. An `eligibility` map: institution slug → membership/geography provenance
 *      (scope + human note + the official page that proves it). Many cards from
 *      one institution share one entry — no copy-paste of the same note.
 *   2. A `seeds` array: one entry per verified card, referencing an eligibility
 *      key. Required fields are identity (id/name/issuer), the official
 *      offer_link, key_benefits, and the eligibility key. Everything else is
 *      optional and defaults to a no-bonus, no-fee personal card.
 *   3. `buildStateCards({ state, verifiedAt, eligibility, seeds })`.
 *
 * Rules that keep the data honest (see ./RESEARCH.md for methodology):
 *   - Never invent a bonus. Omit `bonus_amount` (defaults to 0) unless the
 *     issuer officially advertises one.
 *   - `offer_link` and `eligibility_source` must be official issuer URLs.
 *   - Don't mark a card state-restricted if it's actually nationwide.
 */

/** The membership / geography provenance block every regional card carries. */
export type EligibilityInfo = Pick<
  CreditCardBonus,
  "eligibility_scope" | "eligibility_notes" | "eligibility_source"
>

/**
 * One verified regional card. Required fields are identity, the official link,
 * benefits, and which `eligibility` entry (institution) it belongs to. Every
 * other field is optional and defaults via {@link buildStateCards}, so a seed
 * only carries what was actually confirmed on an official page.
 */
export type StateCardSeed<EKey extends string = string> = {
  id: string
  card_name: string
  issuer: string
  offer_link: string
  key_benefits: string[]
  /** Key into the module's `eligibility` map. */
  eligibility: EKey
  /**
   * Override the module's default `state_restricted`. Use when an institution
   * genuinely serves more states than the module's primary one (e.g. a CU whose
   * field of membership spans a metro that crosses a state line).
   */
  state_restricted?: string[]
  card_type?: CreditCardBonus["card_type"]
  bonus_amount?: number
  bonus_currency?: string
  cpp_value?: number
  min_spend?: number
  spend_months?: number
  annual_fee?: number
  annual_fee_waived_first_year?: boolean
  statement_credits_year1?: number
  is_hotel_card?: boolean
  military_only?: boolean
  rewards?: CreditCardBonus["rewards"]
  intro_apr?: CreditCardBonus["intro_apr"]
  travel?: CreditCardBonus["travel"]
  travel_insurance?: CreditCardBonus["travel_insurance"]
  lounge_network?: CreditCardBonus["lounge_network"]
  protections?: CreditCardBonus["protections"]
  credit_score_required?: CreditCardBonus["credit_score_required"]
  foreign_tx_fee_pct?: number
  companion_benefit?: CreditCardBonus["companion_benefit"]
  anniversary_bonus?: CreditCardBonus["anniversary_bonus"]
  annual_credits_detail?: CreditCardBonus["annual_credits_detail"]
  bonus_tiers?: CreditCardBonus["bonus_tiers"]
}

export type StateModuleInput<E extends Record<string, EligibilityInfo>> = {
  /** Two-letter postal code, or codes when an institution genuinely serves several. */
  state: string | string[]
  /** ISO date the offers were verified against official pages. */
  verifiedAt: string
  /** Institution slug → membership / geography provenance. */
  eligibility: E
  /** The verified cards. */
  seeds: StateCardSeed<Extract<keyof E, string>>[]
}

/**
 * Expand a state module's seeds into full {@link CreditCardBonus} records,
 * applying the same defaults the Hawaii module applies inline: a no-bonus,
 * no-fee personal card, stamped with `state_restricted` and `offer_verified_at`,
 * with the seed's eligibility entry merged in (seed fields win).
 */
export function buildStateCards<E extends Record<string, EligibilityInfo>>(
  input: StateModuleInput<E>,
): CreditCardBonus[] {
  const restricted = Array.isArray(input.state) ? input.state : [input.state]
  return input.seeds.map(({ eligibility: key, ...seed }) => ({
    card_type: "personal",
    bonus_amount: 0,
    bonus_currency: "cash",
    is_hotel_card: false,
    cpp_value: 0.01,
    min_spend: 0,
    spend_months: 3,
    annual_fee: 0,
    annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    expired: false,
    state_restricted: restricted,
    offer_verified_at: input.verifiedAt,
    ...input.eligibility[key],
    ...seed,
  }))
}
