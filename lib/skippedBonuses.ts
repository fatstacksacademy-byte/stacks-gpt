import { createClient } from "./supabase/client"

export async function getSkippedBonuses(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("skipped_bonuses")
    .select("bonus_id")
    .eq("user_id", userId)
  if (error) {
    console.error("[skips] fetch failed:", error.message)
    return []
  }
  return (data ?? []).map((d: any) => d.bonus_id)
}

export async function skipBonus(userId: string, bonusId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("skipped_bonuses")
    .upsert({ user_id: userId, bonus_id: bonusId }, { onConflict: "user_id,bonus_id" })
  if (error) console.error("[skips] insert failed:", error.message)
}

export async function unskipBonus(userId: string, bonusId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("skipped_bonuses")
    .delete()
    .eq("user_id", userId)
    .eq("bonus_id", bonusId)
  if (error) console.error("[skips] delete failed:", error.message)
}
