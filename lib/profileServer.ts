import { createClient } from "./supabase/server"
export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"
export type IncomeSource = {
  pay_frequency: PayFrequency
  paycheck_amount: number
}
export type UserProfile = {
  user_id: string
  dd_slots: number
  pay_frequency: PayFrequency
  paycheck_amount: number
  income_2_frequency?: PayFrequency | null
  income_2_amount?: number | null
  income_3_frequency?: PayFrequency | null
  income_3_amount?: number | null
  updated_at?: string
}
export const DEFAULT_PROFILE: Omit<UserProfile, "user_id"> = {
  dd_slots: 2,
  pay_frequency: "biweekly",
  paycheck_amount: 1500,
  income_2_frequency: null,
  income_2_amount: null,
  income_3_frequency: null,
  income_3_amount: null,
}

/** Get all active income sources as an array */
export function getIncomeSources(profile: UserProfile): IncomeSource[] {
  const sources: IncomeSource[] = [
    { pay_frequency: profile.pay_frequency, paycheck_amount: profile.paycheck_amount },
  ]
  if (profile.income_2_frequency && profile.income_2_amount && profile.income_2_amount > 0) {
    sources.push({ pay_frequency: profile.income_2_frequency, paycheck_amount: profile.income_2_amount })
  }
  if (profile.income_3_frequency && profile.income_3_amount && profile.income_3_amount > 0) {
    sources.push({ pay_frequency: profile.income_3_frequency, paycheck_amount: profile.income_3_amount })
  }
  return sources
}

/** Calculate total monthly income across all sources */
export function getTotalMonthlyIncome(profile: UserProfile): number {
  const PAYS_PER_MONTH: Record<string, number> = {
    weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1,
  }
  const sources = getIncomeSources(profile)
  return sources.reduce((total, s) => {
    const paysPerMonth = PAYS_PER_MONTH[s.pay_frequency] ?? 2.17
    return total + s.paycheck_amount * paysPerMonth
  }, 0)
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
