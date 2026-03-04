import { createClient } from "./supabase/client"

export type OpenAccount = {
  id: string
  user_id: string
  bank_name: string
  opened_date: string | null
  notes: string | null
  created_at: string
}

export async function getOpenAccounts(userId: string): Promise<OpenAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("open_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("[open_accounts] fetch failed:", error.message)
    return []
  }
  return (data ?? []) as OpenAccount[]
}

export async function addOpenAccount(
  userId: string,
  bankName: string,
  openedDate?: string,
  notes?: string
): Promise<OpenAccount | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("open_accounts")
    .insert({
      user_id: userId,
      bank_name: bankName,
      opened_date: openedDate || null,
      notes: notes || null,
    })
    .select()
    .single()
  if (error) {
    console.error("[open_accounts] insert failed:", error.message)
    return null
  }
  return data as OpenAccount
}

export async function deleteOpenAccount(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("open_accounts")
    .delete()
    .eq("id", id)
  if (error) console.error("[open_accounts] delete failed:", error.message)
}