import { createClient } from "./supabase/client"

/**
 * Monthly snapshots of a Pro user's recommended-queue projection, so we can
 * show them the plan getting more profitable over time as the catalog and
 * sequencer improve. See migrations/041_queue_snapshots.sql. All reads/writes
 * are best-effort: if the table isn't there yet the functions degrade to a
 * quiet no-op, so shipping code ahead of the migration never breaks the app.
 */

export type QueueSnapshot = {
  id: string
  user_id: string
  captured_at: string // yyyy-mm-dd, first of month
  paycheck_total: number
  savings_total: number
  spending_total: number
  portfolio_36mo: number
  top_bonuses: { label: string; amount: number }[] | null
  profile_hash: string | null
  created_at: string
}

/** First-of-current-month bucket, so we keep exactly one row per user per month. */
function monthBucket(): string {
  return new Date().toISOString().slice(0, 7) + "-01"
}

export async function getQueueSnapshots(userId: string): Promise<QueueSnapshot[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("queue_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("captured_at", { ascending: true })
  if (error) return [] // table may not exist yet (pre-migration) — degrade quietly
  return (data ?? []) as QueueSnapshot[]
}

export async function recordQueueSnapshot(
  userId: string,
  s: {
    paycheckTotal: number
    savingsTotal: number
    spendingTotal: number
    portfolio36mo: number
    topBonuses?: { label: string; amount: number }[] | null
    profileHash?: string | null
  },
): Promise<void> {
  if (!(s.portfolio36mo > 0)) return // nothing meaningful to record yet
  const supabase = createClient()
  const row = {
    user_id: userId,
    captured_at: monthBucket(),
    paycheck_total: Math.round(s.paycheckTotal),
    savings_total: Math.round(s.savingsTotal),
    spending_total: Math.round(s.spendingTotal),
    portfolio_36mo: Math.round(s.portfolio36mo),
    top_bonuses: s.topBonuses ?? null,
    profile_hash: s.profileHash ?? null,
  }
  // Idempotent per (user, month): re-running with a fresher recompute overwrites
  // this month's row rather than piling up duplicates.
  const { error } = await supabase
    .from("queue_snapshots")
    .upsert(row, { onConflict: "user_id,captured_at" })
  if (error) console.warn("[queueSnapshots] record skipped:", error.message)
}
