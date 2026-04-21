import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export type CustomBonus = {
  id: string
  user_id: string
  bank_name: string
  bonus_amount: number
  opened_date: string
  closed_date: string | null
  bonus_received: boolean
  actual_amount: number | null
  current_step: string | null
  notes: string | null
  cooldown_months: number | null
  created_at: string
  dd_required: boolean | null
  min_dd_total: number | null
  min_dd_per_deposit: number | null
  dd_count_required: number | null
  deposit_window_days: number | null
  holding_period_days: number | null
}

export async function getCustomBonuses(userId: string): Promise<CustomBonus[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("custom_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("opened_date", { ascending: false })
  if (error) { console.error("getCustomBonuses error:", error); return [] }
  return data ?? []
}

export type CustomBonusRequirements = {
  ddRequired?: boolean
  minDdTotal?: number | null
  minDdPerDeposit?: number | null
  ddCountRequired?: number | null
  depositWindowDays?: number | null
  holdingPeriodDays?: number | null
}

export async function addCustomBonus(
  userId: string,
  bankName: string,
  bonusAmount: number,
  openedDate: string,
  notes?: string,
  cooldownMonths?: number | null,
  reqs?: CustomBonusRequirements
): Promise<CustomBonus | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("custom_bonuses")
    .insert({
      user_id: userId,
      bank_name: bankName,
      bonus_amount: bonusAmount,
      opened_date: openedDate,
      current_step: "pending",
      notes: notes || null,
      cooldown_months: cooldownMonths ?? null,
      dd_required: reqs?.ddRequired ?? false,
      min_dd_total: reqs?.minDdTotal ?? null,
      min_dd_per_deposit: reqs?.minDdPerDeposit ?? null,
      dd_count_required: reqs?.ddCountRequired ?? null,
      deposit_window_days: reqs?.depositWindowDays ?? null,
      holding_period_days: reqs?.holdingPeriodDays ?? null,
    })
    .select()
    .single()
  if (error) { reportError("Could not save custom bonus", error); return null }
  return data
}

export async function updateCustomBonus(
  id: string,
  updates: Partial<Pick<CustomBonus,
    | "closed_date" | "bonus_received" | "actual_amount" | "current_step" | "notes"
    | "bank_name" | "bonus_amount" | "opened_date" | "cooldown_months"
    | "dd_required" | "min_dd_total" | "min_dd_per_deposit" | "dd_count_required"
    | "deposit_window_days" | "holding_period_days"
  >>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("custom_bonuses")
    .update(updates)
    .eq("id", id)
  if (error) { reportError("Could not update custom bonus", error); return false }
  return true
}

export async function closeCustomBonus(
  id: string,
  closedDate: string,
  bonusReceived: boolean,
  actualAmount?: number
): Promise<boolean> {
  return updateCustomBonus(id, {
    closed_date: closedDate,
    bonus_received: bonusReceived,
    actual_amount: actualAmount ?? null,
  })
}

export async function deleteCustomBonus(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("custom_bonuses")
    .delete()
    .eq("id", id)
  if (error) { reportError("Could not delete custom bonus", error); return false }
  return true
}
