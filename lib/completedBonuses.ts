import { createClient } from "./supabase/client"
import type { CompletedBonus } from "./churn"

export async function getCompletedBonuses(userId: string): Promise<CompletedBonus[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("completed_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { console.error("[completedBonuses] fetch failed:", error.message); return [] }
  return (data ?? []) as CompletedBonus[]
}

export async function markBonusStarted(
  userId: string, bonusId: string, openedDate: string
): Promise<CompletedBonus | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("completed_bonuses")
    .insert({ user_id: userId, bonus_id: bonusId, opened_date: openedDate, bonus_received: false })
    .select().single()
  if (error) { console.error("[completedBonuses] insert failed:", error.message); return null }
  return data as CompletedBonus
}

export async function markBonusClosed(
  recordId: string, closedDate: string, bonusReceived: boolean, actualAmount?: number
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({
      closed_date: closedDate,
      bonus_received: bonusReceived,
      actual_amount: actualAmount,
      current_step: "close",
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
  if (error) console.error("[completedBonuses] update failed:", error.message)
}

export async function updateBonusStep(
  recordId: string, step: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({ current_step: step, updated_at: new Date().toISOString() })
    .eq("id", recordId)
  if (error) console.error("[completedBonuses] step update failed:", error.message)
}

export async function deleteCompletedBonus(recordId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("completed_bonuses").delete().eq("id", recordId)
  if (error) console.error("[completedBonuses] delete failed:", error.message)
}

/**
 * Promote a user's custom bonus entry to a first-class checking bonus tied to
 * a catalog id. Copies the tracking state (opened/closed dates, bonus_received,
 * actual_amount, current_step) so the user doesn't lose progress, inserts a
 * completed_bonuses row for the targeted catalog bonus, then deletes the
 * original custom_bonuses row.
 */
export async function migrateCustomToCompleted(
  userId: string,
  custom: {
    id: string
    opened_date: string
    closed_date: string | null
    bonus_received: boolean
    actual_amount: number | null
    current_step: string | null
  },
  targetBonusId: string,
): Promise<boolean> {
  const supabase = createClient()
  const { error: insertErr } = await supabase
    .from("completed_bonuses")
    .insert({
      user_id: userId,
      bonus_id: targetBonusId,
      opened_date: custom.opened_date,
      closed_date: custom.closed_date,
      bonus_received: custom.bonus_received,
      actual_amount: custom.actual_amount,
      current_step: custom.current_step ?? null,
    })
  if (insertErr) {
    console.error("[completedBonuses] migrateCustom insert failed:", insertErr.message)
    return false
  }
  const { error: delErr } = await supabase
    .from("custom_bonuses")
    .delete()
    .eq("id", custom.id)
  if (delErr) {
    console.error("[completedBonuses] migrateCustom delete failed:", delErr.message)
    return false
  }
  return true
}
