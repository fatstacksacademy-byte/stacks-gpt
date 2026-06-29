// Persistence for the soft approval-odds inputs (credit_profiles table).
// Mirrors lib/savingsProfile.ts: client Supabase + reportError toasts, one
// row per user, graceful empty default when nothing is saved yet.

import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export type CreditProfile = {
  user_id: string
  score: number | null
  hard_inquiries_6mo: number | null
  hard_inquiries_12mo: number | null
  utilization_pct: number | null
  annual_income: number | null
  updated_at: string
}

export const DEFAULT_CREDIT_PROFILE: Omit<CreditProfile, "user_id" | "updated_at"> = {
  score: null,
  hard_inquiries_6mo: null,
  hard_inquiries_12mo: null,
  utilization_pct: null,
  annual_income: null,
}

export async function getCreditProfile(userId: string): Promise<CreditProfile> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("credit_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()
  if (error || !data) {
    return { user_id: userId, ...DEFAULT_CREDIT_PROFILE, updated_at: "" }
  }
  return data as CreditProfile
}

export async function upsertCreditProfile(
  profile: Partial<CreditProfile> & { user_id: string },
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("credit_profiles")
    .upsert(
      { ...profile, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
  if (error) reportError("Could not save credit profile", error)
}
