import { createClient } from "./supabase/client"
import { reportError } from "./toast"

export const OWNED_ACCOUNT_TYPES = ["checking", "savings", "brokerage"] as const
export type OwnedAccountType = (typeof OWNED_ACCOUNT_TYPES)[number]

export const ACCOUNT_TYPE_LABELS: Record<OwnedAccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  brokerage: "Brokerage",
}

export type OwnedAccount = {
  id: string
  user_id: string
  institution: string
  account_type: OwnedAccountType
  nickname: string | null
  current_balance: number
  apy: number | null
  role: string | null
  notes: string | null
  opened_date: string | null
  created_at: string
  updated_at: string
}

export async function getOwnedAccounts(userId: string): Promise<OwnedAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("owned_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("account_type", { ascending: true })
    .order("current_balance", { ascending: false })
  if (error) { console.error("getOwnedAccounts error:", error); return [] }
  return data ?? []
}

export async function addOwnedAccount(
  userId: string,
  account: Partial<Omit<OwnedAccount, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<OwnedAccount | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("owned_accounts")
    .insert({
      user_id: userId,
      institution: account.institution ?? "",
      account_type: account.account_type ?? "checking",
      nickname: account.nickname ?? null,
      current_balance: account.current_balance ?? 0,
      apy: account.apy ?? null,
      role: account.role ?? null,
      notes: account.notes ?? null,
      opened_date: account.opened_date ?? null,
    })
    .select()
    .single()
  if (error) { reportError("Could not save account", error); return null }
  return data
}

export async function updateOwnedAccount(
  id: string,
  updates: Partial<Omit<OwnedAccount, "id" | "user_id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("owned_accounts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) { reportError("Could not update account", error); return false }
  return true
}

export async function deleteOwnedAccount(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("owned_accounts")
    .delete()
    .eq("id", id)
  if (error) { reportError("Could not delete account", error); return false }
  return true
}
