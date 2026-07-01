/**
 * Tiered bonuses (e.g. Bank of America: $100 / $300 / $500, each gated by a
 * different DD target AND a different account type + monthly fee) let the user
 * pick which tier they're chasing. The pick is stored as a catalog term
 * override (bonus_amount + min_dd_total); everything else about the tier —
 * account name, monthly fee, fee-waiver text — is DERIVED from the tier's own
 * data at display time via `resolveTier`, so a single selection drives the
 * amount, the DD requirement, AND the correct fee/waiver everywhere the bonus
 * renders (hero card, working card, queue card).
 */

export type BonusTier = {
  bonus: number
  min_dd_total: number
  account?: string
  monthly_fee?: number | null
  monthly_fee_waiver_text?: string | null
}

export type TermOverride = {
  bonus_amount?: number
  min_dd_total?: number
  deposit_window_days?: number
  notes?: string
}

export type ResolvedTier = {
  /** All tiers on the bonus, if any. */
  tiers: BonusTier[] | null
  /** True when there's a real choice to make (2+ tiers). */
  hasTiers: boolean
  /** The tier matching the currently-selected amount, if the bonus is tiered. */
  tier: BonusTier | null
  /** Effective bonus amount (selected tier, or override, or base). */
  amount: number
  /** Effective DD requirement for the selected tier. */
  ddTotal: number | null
  /** Effective monthly fee for the selected tier (falls back to base fee). */
  fee: number
  /** Effective fee-waiver text for the selected tier (falls back to base). */
  waiverText: string | null
  /** Account type the selected tier requires, if the tier specifies one. */
  account: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveTier(bonus: any, catO?: TermOverride | null): ResolvedTier {
  const rawTiers = bonus?.tiers
  const tiers: BonusTier[] | null = Array.isArray(rawTiers) && rawTiers.length > 0 ? rawTiers : null
  const hasTiers = !!tiers && tiers.length > 1

  const amount = catO?.bonus_amount ?? bonus?.bonus_amount ?? 0
  const tier = tiers ? (tiers.find(t => t.bonus === amount) ?? null) : null

  const ddTotal =
    catO?.min_dd_total ??
    tier?.min_dd_total ??
    bonus?.requirements?.min_direct_deposit_total ??
    null

  const fee = tier?.monthly_fee ?? bonus?.fees?.monthly_fee ?? 0
  const waiverText = tier?.monthly_fee_waiver_text ?? bonus?.fees?.monthly_fee_waiver_text ?? null
  const account = tier?.account ?? null

  return { tiers, hasTiers, tier, amount, ddTotal: ddTotal ?? null, fee: fee ?? 0, waiverText, account }
}
