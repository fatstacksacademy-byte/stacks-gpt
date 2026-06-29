// Persistence for the held-card inventory (card_accounts table).
// Mirrors lib/completedBonuses.ts: client Supabase + reportError toasts.

import { createClient } from "./supabase/client"
import { reportError } from "./toast"
import type { CardAccountDraft } from "./creditReportImport"

export type CardAccount = CardAccountDraft & {
  id: string
  user_id: string
  // Welcome-bonus history for issuer lifetime / 48-month rules (migration 038).
  // Tri-state: true = earned, false = not earned, null/undefined = unknown.
  bonus_earned?: boolean | null
  bonus_earned_date?: string | null
  created_at?: string
  updated_at?: string
}

// Fields a user can edit in place after a card is saved (e.g. marking the
// welcome bonus earned for Amex lifetime / Citi 48-month rules).
export type CardAccountPatch = Partial<
  Pick<CardAccount, "bonus_earned" | "bonus_earned_date" | "closed_date" | "credit_limit" | "card_type">
>

export async function updateCardAccount(id: string, patch: CardAccountPatch): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("card_accounts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    reportError("Could not update card", error)
    return false
  }
  return true
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
