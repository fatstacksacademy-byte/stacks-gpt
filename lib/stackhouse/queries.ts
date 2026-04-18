import { createClient as createServerClient } from "../supabase/server"
import { bonuses } from "../data/bonuses"
import { rankFromXp, xpForCook, purityPct } from "./rank"
import type {
  ActiveCook,
  SideHustle,
  StackhouseProfile,
  StreetWin,
} from "./types"

/**
 * Read-only queries against stackhouse_* tables + existing Stacks OS data.
 * All use the server-side Supabase client with cookie-based auth, so RLS
 * still applies — we never bypass it from this module.
 */

/** Get-or-create the current user's stackhouse profile. */
export async function getOrCreateProfile(userId: string): Promise<StackhouseProfile> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("stackhouse_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (data) return data as StackhouseProfile

  const defaults = {
    user_id: userId,
    class: "kingpin",
    current_xp: 0,
    rank: 1,
    purity_pct: 100,
    action_points: 3,
    preferences: { mode: "stackhouse" },
  }
  const { data: inserted, error } = await supabase
    .from("stackhouse_profiles")
    .insert(defaults)
    .select()
    .single()
  if (error) throw new Error(`getOrCreateProfile: ${error.message}`)
  return inserted as StackhouseProfile
}

/** List a user's active side hustles (newest first). */
export async function listSideHustles(userId: string): Promise<SideHustle[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("stackhouse_side_hustles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(`listSideHustles: ${error.message}`)
  return (data ?? []) as SideHustle[]
}

/**
 * Active cooks = open positions in completed_bonuses (no closed_date yet),
 * enriched with bank/amount info from lib/data/bonuses.ts and progress
 * from bonus_deposits.
 *
 * Note: we read existing Stacks OS tables here but never write to them.
 */
export async function listActiveCooks(userId: string): Promise<ActiveCook[]> {
  const supabase = await createServerClient()
  const [{ data: openBonuses }, { data: deposits }] = await Promise.all([
    supabase
      .from("completed_bonuses")
      .select("id, bonus_id, opened_date")
      .eq("user_id", userId)
      .is("closed_date", null),
    supabase
      .from("bonus_deposits")
      .select("bonus_id, amount"),
  ])

  const depositsByBonus: Record<string, number> = {}
  for (const d of deposits ?? []) {
    depositsByBonus[d.bonus_id] = (depositsByBonus[d.bonus_id] ?? 0) + Number(d.amount || 0)
  }

  const result: ActiveCook[] = []
  for (const row of openBonuses ?? []) {
    const bonus = bonuses.find((b) => b.id === row.bonus_id)
    if (!bonus) continue
    const opened = new Date((row.opened_date as string) + "T00:00:00")
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - opened.getTime()) / 86400000),
    )
    result.push({
      record_id: row.id as string,
      bonus_id: row.bonus_id as string,
      bank_name: bonus.bank_name,
      bonus_amount: bonus.bonus_amount ?? 0,
      opened_date: row.opened_date as string,
      deposit_progress: depositsByBonus[row.bonus_id as string] ?? 0,
      deposit_required: bonus.requirements?.min_direct_deposit_total ?? null,
      days_elapsed: daysElapsed,
      window_days: bonus.requirements?.deposit_window_days ?? null,
      xp_reward: xpForCook(bonus.bonus_amount ?? 0),
    })
  }
  return result
}

/**
 * Derive headline stats from existing Stacks OS data:
 *   - jobs_run: completed bonuses where bonus_received = true
 *   - clean_rate: jobs_run / bonuses_started
 *   - purity_pct: same formula, with 20% floor
 * The profile table caches these but the source of truth is completed_bonuses.
 */
export async function computeHeadlineStats(userId: string): Promise<{
  jobsRun: number
  bonusesStarted: number
  purity: number
  lifetimeEarned: number
}> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("completed_bonuses")
    .select("bonus_id, bonus_received, actual_amount, closed_date")
    .eq("user_id", userId)

  const rows = data ?? []
  const started = rows.length
  const received = rows.filter((r) => r.bonus_received === true).length
  const lifetimeEarned = rows.reduce((sum, r) => {
    if (!r.bonus_received) return sum
    if (typeof r.actual_amount === "number") return sum + r.actual_amount
    const b = bonuses.find((x) => x.id === r.bonus_id)
    return sum + (b?.bonus_amount ?? 0)
  }, 0)

  return {
    jobsRun: received,
    bonusesStarted: started,
    purity: purityPct(started, received),
    lifetimeEarned,
  }
}

/** Street wins for display. */
export async function listStreetWins(userId: string): Promise<StreetWin[]> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from("stackhouse_street_wins")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })
  return (data ?? []) as StreetWin[]
}

/** Rank from an XP number — re-export for server components. */
export { rankFromXp } from "./rank"
