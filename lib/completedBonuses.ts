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
    .update({ closed_date: closedDate, bonus_received: bonusReceived, actual_amount: actualAmount, updated_at: new Date().toISOString() })
    .eq("id", recordId)
  if (error) console.error("[completedBonuses] update failed:", error.message)
}

export async function deleteCompletedBonus(recordId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("completed_bonuses").delete().eq("id", recordId)
  if (error) console.error("[completedBonuses] delete failed:", error.message)
}
