import { createClient } from "./supabase/client"

export type BonusDeposit = {
  id: string
  user_id: string
  bonus_id: string
  amount: number
  deposit_date: string
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
  depositDate: string
): Promise<BonusDeposit | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bonus_deposits")
    .insert({ user_id: userId, bonus_id: bonusId, amount, deposit_date: depositDate })
    .select()
    .single()
  if (error) {
    console.error("[deposits] insert failed:", error.message)
    return null
  }
  return data as BonusDeposit
}

export async function deleteDeposit(depositId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("bonus_deposits")
    .delete()
    .eq("id", depositId)
  if (error) console.error("[deposits] delete failed:", error.message)
}
