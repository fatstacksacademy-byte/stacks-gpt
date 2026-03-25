import { createClient } from "./supabase/client"

export type SpendingProfile = {
  user_id: string
  monthly_spend: number | null
  category_spend: Record<string, number>
  current_cards: Record<string, string>
  current_multipliers: Record<string, number>
  rewards_valuation: "cashback" | "points"
  cpp_valuation: number | null
  updated_at: string
}

export const DEFAULT_SPENDING_PROFILE: Omit<SpendingProfile, "user_id" | "updated_at"> = {
  monthly_spend: null,
  category_spend: {},
  current_cards: {},
  current_multipliers: {},
  rewards_valuation: "cashback",
  cpp_valuation: null,
}

export async function getSpendingProfile(userId: string): Promise<SpendingProfile> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spending_profile")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error || !data) {
    return { user_id: userId, ...DEFAULT_SPENDING_PROFILE, updated_at: "" }
  }
  return data as SpendingProfile
}

export async function upsertSpendingProfile(
  profile: Partial<SpendingProfile> & { user_id: string }
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("spending_profile")
    .upsert(
      { ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
  if (error) console.error("[spending_profile] upsert failed:", error.message)
}
