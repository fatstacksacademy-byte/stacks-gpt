import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export type SavingsProfile = {
  user_id: string
  current_balance: number | null
  current_apy: number | null
  current_institution: string | null
  emergency_fund: number | null
  cash_reserves: number | null
  updated_at: string
}

export const DEFAULT_SAVINGS_PROFILE: Omit<SavingsProfile, "user_id" | "updated_at"> = {
  current_balance: null,
  current_apy: null,
  current_institution: null,
  emergency_fund: null,
  cash_reserves: null,
}

export async function getSavingsProfile(userId: string): Promise<SavingsProfile> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("savings_profile")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error || !data) {
    return { user_id: userId, ...DEFAULT_SAVINGS_PROFILE, updated_at: "" }
  }
  return data as SavingsProfile
}

export async function upsertSavingsProfile(
  profile: Partial<SavingsProfile> & { user_id: string }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("savings_profile")
    .upsert(
      { ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
  if (error) reportError("Could not save savings profile", error)
}
