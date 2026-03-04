import { createClient } from "./supabase/client"

export async function markKeptOpen(recordId: string, keptOpen: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({ kept_open: keptOpen })
    .eq("id", recordId)
  if (error) console.error("[keptOpen] update failed:", error.message)
}
