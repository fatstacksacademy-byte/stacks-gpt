import { createAdminClient } from "./supabaseAdmin"
import { bonuses } from "../data/bonuses"
import { savingsBonuses } from "../data/savingsBonuses"

/**
 * The "Polite Heist Society" — a single collective number: every dollar Stacks
 * OS users have pulled back out of the banks so far, counting toward the
 * one-billion-dollar mission.
 *
 * The dollar figure per completed bonus is resolved the same way the app shows
 * a user's own "lifetime earned" (see computeHeadlineStats in queries.ts): use
 * the realized `actual_amount` when the user logged one, else fall back to the
 * catalog's headline amount. This module additionally covers savings bonuses
 * (whose amount lives in tiers, not a flat field) so the total doesn't
 * undercount savings rows that never had an actual_amount typed in.
 */

export const HEIST_GOAL = 1_000_000_000

export type HeistTotal = {
  /** Total dollars earned across all users' completed bonuses. */
  taken: number
  /** The mission target. */
  goal: number
  /** Distinct users who have banked at least one bonus. */
  contributors: number
}

/** Highest headline amount a savings offer can pay (its top tier). */
function savingsHeadline(id: string): number {
  const s = savingsBonuses.find((b) => b.id === id)
  if (!s) return 0
  return s.tiers.reduce((max, t) => Math.max(max, t.bonus_amount ?? 0), 0)
}

/**
 * Resolve the dollar value of a single completed-bonus row. Mirrors the app's
 * per-user "lifetime earned" logic, with a savings-catalog fallback added.
 */
export function resolveEarnedAmount(row: {
  bonus_id: string | null
  actual_amount: number | null
}): number {
  if (typeof row.actual_amount === "number") return row.actual_amount
  if (!row.bonus_id) return 0
  const checking = bonuses.find((b) => b.id === row.bonus_id)
  if (checking) return checking.bonus_amount ?? 0
  return savingsHeadline(row.bonus_id)
}

/**
 * Compute the global heist total across ALL users. Uses the service-role
 * client because completed_bonuses is RLS-scoped to each user; only the single
 * aggregate number and a contributor count leave this function — never any
 * per-user rows — so it's safe to expose publicly.
 */
export async function getHeistTotal(): Promise<HeistTotal> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("completed_bonuses")
    .select("user_id, bonus_id, actual_amount")
    .eq("bonus_received", true)
  if (error) throw new Error(`getHeistTotal: ${error.message}`)

  const rows = data ?? []
  const taken = rows.reduce((sum, r) => sum + resolveEarnedAmount(r), 0)
  const contributors = new Set(rows.map((r) => r.user_id)).size

  return { taken, goal: HEIST_GOAL, contributors }
}
