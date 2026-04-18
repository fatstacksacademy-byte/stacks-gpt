// Client-safe type-only exports from the profile system.
// Server-side helpers live in profileServer.ts (uses next/headers).

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
  state?: string | null
  income_2_frequency?: PayFrequency | null
  income_2_amount?: number | null
  income_3_frequency?: PayFrequency | null
  income_3_amount?: number | null
  updated_at?: string
}
