import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export type BonusDeposit = {
  id: string
  user_id: string
  bonus_id: string
  amount: number
  deposit_date: string
  /** Where this deposit came from — "Employer / payroll" or an account name.
   *  Requires migration 040; null on legacy rows and when the user skips it. */
  source?: string | null
  created_at: string
}

export async function getDeposits(userId: string): Promise<BonusDeposit[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bonus_deposits")
    .select("*")
    .eq("user_id", userId)
    .order("deposit_date", { ascending: true })
  if (error) {
    console.error("[deposits] fetch failed:", error.message)
    return []
  }
  return (data ?? []) as BonusDeposit[]
}

export async function addDeposit(
  userId: string,
  bonusId: string,
  amount: number,
  depositDate: string,
  source?: string | null
): Promise<BonusDeposit | null> {
  const supabase = createClient()
  const base = { user_id: userId, bonus_id: bonusId, amount, deposit_date: depositDate }
  const cleanedSource = source && source.trim() ? source.trim() : null
  // source lives behind migration 040 — try the insert WITH it first and fall
  // back to the same insert without it if the column isn't present yet, so the
  // action never breaks when code ships ahead of the migration.
  const attempts = cleanedSource
    ? [{ ...base, source: cleanedSource }, base]
    : [base]
  for (let i = 0; i < attempts.length; i++) {
    const { data, error } = await supabase
      .from("bonus_deposits")
      .insert(attempts[i])
      .select()
      .single()
    if (!error) return data as BonusDeposit
    if (i === attempts.length - 1) {
      reportError("Could not add deposit", error)
      return null
    }
  }
  return null
}

export async function deleteDeposit(depositId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("bonus_deposits")
    .delete()
    .eq("id", depositId)
  if (error) reportError("Could not delete deposit", error)
}
