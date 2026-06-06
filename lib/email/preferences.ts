import { createAdminClient } from "../stackhouse/supabaseAdmin"

export type EmailPreferences = {
  user_id: string
  deadline_reminders: boolean
  weekly_digest: boolean
  unsubscribe_token: string
  unsubscribed_at: string | null
}

/**
 * Get prefs for a user, creating defaults if absent. Cron only —
 * service-role required to bypass RLS on the upsert.
 */
export async function getOrCreatePrefsAdmin(userId: string): Promise<EmailPreferences | null> {
  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) return existing as EmailPreferences

  const { data, error } = await supabase
    .from("email_preferences")
    .insert({ user_id: userId })
    .select()
    .single()
  if (error) {
    console.error("getOrCreatePrefsAdmin insert failed:", error)
    return null
  }
  return data as EmailPreferences
}

export async function lookupUserByToken(token: string): Promise<EmailPreferences | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle()
  return (data as EmailPreferences) ?? null
}

export async function unsubscribeAllByToken(token: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("email_preferences")
    .update({
      deadline_reminders: false,
      weekly_digest: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token)
  return !error
}

/** Records that we sent (user, kind, bonus_key). Idempotent via the unique index. */
export async function recordSent(
  userId: string,
  kind: string,
  bonusKey: string,
  resendId: string | null,
): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("email_sent_log")
    .insert({ user_id: userId, kind, bonus_key: bonusKey, resend_message_id: resendId })
  if (error) {
    // unique violation = already sent, that's fine
    if ((error as { code?: string }).code === "23505") return false
    console.error("recordSent failed:", error)
    return false
  }
  return true
}

export async function alreadySent(
  userId: string,
  kind: string,
  bonusKey: string,
): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("email_sent_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("bonus_key", bonusKey)
    .maybeSingle()
  return !!data
}
