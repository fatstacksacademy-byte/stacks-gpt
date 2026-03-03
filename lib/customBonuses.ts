import { createClient } from "./supabase/client"

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
  created_at: string
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

export async function addCustomBonus(
  userId: string,
  bankName: string,
  bonusAmount: number,
  openedDate: string,
  notes?: string
): Promise<CustomBonus | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("custom_bonuses")
    .insert({
      user_id: userId,
      bank_name: bankName,
      bonus_amount: bonusAmount,
      opened_date: openedDate,
      notes: notes || null,
    })
    .select()
    .single()
  if (error) { console.error("addCustomBonus error:", error); return null }
  return data
}

export async function updateCustomBonus(
  id: string,
  updates: Partial<Pick<CustomBonus, "closed_date" | "bonus_received" | "actual_amount" | "current_step" | "notes">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("custom_bonuses")
    .update(updates)
    .eq("id", id)
  if (error) { console.error("updateCustomBonus error:", error); return false }
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
  if (error) { console.error("deleteCustomBonus error:", error); return false }
  return true
}
