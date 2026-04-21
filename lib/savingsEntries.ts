import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export type SavingsEntry = {
  id: string
  user_id: string
  institution_name: string
  bonus_name: string | null
  bonus_amount: number | null
  deposit_required: number | null
  holding_period_days: number | null
  offer_apy: number | null
  promo_apy: number | null
  estimated_yield: number | null
  expected_total_value: number | null
  actual_value: number | null
  opened_date: string | null
  deadline: string | null
  status: "planned" | "active" | "completed" | "canceled"
  source_type: string
  canonical_offer_id: string | null
  notes: string | null
  /** User said "already have" but skipped entering dates. */
  incomplete_info: boolean
  created_at: string
  updated_at: string
}

export async function getSavingsEntries(userId: string): Promise<SavingsEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("savings_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { console.error("getSavingsEntries error:", error); return [] }
  return data ?? []
}

export async function addSavingsEntry(
  userId: string,
  entry: Partial<Omit<SavingsEntry, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<SavingsEntry | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("savings_entries")
    .insert({
      user_id: userId,
      institution_name: entry.institution_name ?? "",
      bonus_name: entry.bonus_name ?? null,
      bonus_amount: entry.bonus_amount ?? null,
      deposit_required: entry.deposit_required ?? null,
      holding_period_days: entry.holding_period_days ?? null,
      offer_apy: entry.offer_apy ?? null,
      promo_apy: entry.promo_apy ?? null,
      estimated_yield: entry.estimated_yield ?? null,
      expected_total_value: entry.expected_total_value ?? null,
      actual_value: entry.actual_value ?? null,
      opened_date: entry.opened_date ?? null,
      deadline: entry.deadline ?? null,
      status: entry.status ?? "planned",
      source_type: entry.source_type ?? "system",
      canonical_offer_id: entry.canonical_offer_id ?? null,
      notes: entry.notes ?? null,
      incomplete_info: entry.incomplete_info ?? false,
    })
    .select()
    .single()
  if (error) { reportError("Could not save savings entry", error); return null }
  return data
}

export async function updateSavingsEntry(
  id: string,
  updates: Partial<Omit<SavingsEntry, "id" | "user_id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("savings_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) { reportError("Could not update savings entry", error); return false }
  return true
}

export async function deleteSavingsEntry(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("savings_entries")
    .delete()
    .eq("id", id)
  if (error) { reportError("Could not delete savings entry", error); return false }
  return true
}
