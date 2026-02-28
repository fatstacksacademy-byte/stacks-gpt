import { createClient } from "./supabase/client"
import type { UserProfile } from "./profileServer"

export async function upsertProfileClient(
  profile: Partial<UserProfile> & { user_id: string }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
  if (error) console.error("[profile] upsert failed:", error.message)
}