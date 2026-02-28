import { createClient } from "./supabase/server"
import { createClient as createBrowserClient } from "./supabase/client"

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"

export type UserProfile = {
  user_id: string
  dd_slots: number
  pay_frequency: PayFrequency
  paycheck_amount: number
  updated_at?: string
}

export const DEFAULT_PROFILE: Omit<UserProfile, "user_id"> = {
  dd_slots: 2,
  pay_frequency: "biweekly",
  paycheck_amount: 1000,
}

// ─── Server-side (use in server components / route handlers) ──────────────────

export async function getProfileServer(userId: string): Promise<UserProfile> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    // Profile doesn't exist yet — create it with defaults
    const defaults: UserProfile = { user_id: userId, ...DEFAULT_PROFILE }
    await supabase.from("user_profiles").upsert(defaults, { onConflict: "user_id" })
    return defaults
  }

  return data as UserProfile
}

// ─── Client-side (use in client components) ───────────────────────────────────

export async function upsertProfileClient(
  profile: Partial<UserProfile> & { user_id: string }
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      { ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )

  if (error) {
    console.error("[profile] upsert failed:", error.message)
  }
}