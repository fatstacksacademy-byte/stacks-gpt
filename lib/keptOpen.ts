import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export async function markKeptOpen(recordId: string, keptOpen: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({ kept_open: keptOpen })
    .eq("id", recordId)
  if (error) reportError("Could not update kept-open flag", error)
}
