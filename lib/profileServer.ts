import { createClient } from "./supabase/server"
export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"
export type UserProfile = {
  user_id: string
  dd_slots: number
  pay_frequency: PayFrequency
  paycheck_amount: number
  secondary_pay_frequency?: PayFrequency | null
  secondary_paycheck_amount?: number | null
  updated_at?: string
}
export const DEFAULT_PROFILE: Omit<UserProfile, "user_id"> = {
  dd_slots: 2,
  pay_frequency: "biweekly",
  paycheck_amount: 1500,
  secondary_pay_frequency: null,
  secondary_paycheck_amount: null,
}
export async function getProfileServer(userId: string): Promise<UserProfile> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error || !data) {
    const defaults: UserProfile = { user_id: userId, ...DEFAULT_PROFILE }
    await supabase.from("user_profiles").upsert(defaults, { onConflict: "user_id" })
    return defaults
  }
  return data as UserProfile
}
