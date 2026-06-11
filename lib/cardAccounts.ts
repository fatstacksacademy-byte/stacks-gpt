// Persistence for the held-card inventory (card_accounts table).
// Mirrors lib/completedBonuses.ts: client Supabase + reportError toasts.

import { createClient } from "./supabase/client"
import { reportError } from "./toast"
import type { CardAccountDraft } from "./creditReportImport"

export type CardAccount = CardAccountDraft & {
  id: string
  user_id: string
  created_at?: string
  updated_at?: string
}

export async function getCardAccounts(userId: string): Promise<CardAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("card_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("open_date", { ascending: false })
  if (error) {
    console.error("[cardAccounts] fetch failed:", error.message)
    return []
  }
  return (data ?? []) as CardAccount[]
}

/** Insert one or more drafts for the user. Returns the inserted rows. */
export async function insertCardAccounts(
  userId: string,
  drafts: CardAccountDraft[],
): Promise<CardAccount[]> {
  if (drafts.length === 0) return []
  const supabase = createClient()
  const rows = drafts.map(d => ({ user_id: userId, ...d }))
  const { data, error } = await supabase.from("card_accounts").insert(rows).select()
  if (error) {
    reportError("Could not save cards", error)
    return []
  }
  return (data ?? []) as CardAccount[]
}

export async function deleteCardAccount(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("card_accounts").delete().eq("id", id)
  if (error) {
    reportError("Could not delete card", error)
    return false
  }
  return true
}
