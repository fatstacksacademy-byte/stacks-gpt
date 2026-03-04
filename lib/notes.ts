import { createClient } from "./supabase/client"

export type BonusNote = {
  id: string
  user_id: string
  bonus_id: string
  note: string
}

export async function getNotes(userId: string): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bonus_notes")
    .select("*")
    .eq("user_id", userId)
  if (error) { console.error("[notes] fetch failed:", error.message); return {} }
  const map: Record<string, string> = {}
  for (const row of (data ?? [])) {
    map[row.bonus_id] = row.note
  }
  return map
}

export async function upsertNote(userId: string, bonusId: string, note: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("bonus_notes")
    .upsert(
      { user_id: userId, bonus_id: bonusId, note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,bonus_id" }
    )
  if (error) console.error("[notes] upsert failed:", error.message)
}
