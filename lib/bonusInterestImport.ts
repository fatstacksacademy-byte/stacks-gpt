import { createAdminClient } from "./stackhouse/supabaseAdmin"

/**
 * Auto-import any pending bonus_interests for this user's email into
 * their completed_bonuses (as "started" rows with bonus_received=false).
 *
 * Called from the auth callback on successful session exchange so
 * anyone who clicked "Track this bonus" on /bonuses before signing up
 * gets those bonuses pre-populated in their account.
 *
 * Idempotent: bonus_interests rows already have claimed_at set on
 * import, and we skip any bonus_id that already exists for this user
 * in completed_bonuses so re-running this is safe.
 *
 * Failures are logged and swallowed — we don't want auth callback to
 * fail because of a bonus-import hiccup. The unclaimed rows will
 * stay unclaimed and can be retried on next session.
 */
export async function importBonusInterestsForUser(userId: string, email: string): Promise<{ imported: number }> {
  if (!email || !userId) return { imported: 0 }

  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()

  const { data: interests, error: fetchErr } = await admin
    .from("bonus_interests")
    .select("id, bonus_id")
    .eq("email", normalizedEmail)
    .is("claimed_at", null)
  if (fetchErr) {
    console.error("[bonusInterestImport] fetch failed:", fetchErr.message)
    return { imported: 0 }
  }
  if (!interests || interests.length === 0) {
    // Still mark the contact as a current customer if a row exists.
    await admin.from("contacts").update({
      stacks_os_user_id: userId,
      customer_status: "current",
      updated_at: new Date().toISOString(),
    }).eq("email", normalizedEmail)
    return { imported: 0 }
  }

  const { data: existing } = await admin
    .from("completed_bonuses")
    .select("bonus_id")
    .eq("user_id", userId)
  const existingIds = new Set((existing ?? []).map((r: { bonus_id: string }) => r.bonus_id))

  const today = new Date().toISOString().split("T")[0]
  const toInsert = interests
    .filter(i => !existingIds.has(i.bonus_id))
    .map(i => ({ user_id: userId, bonus_id: i.bonus_id, opened_date: today, bonus_received: false }))

  let imported = 0
  if (toInsert.length > 0) {
    const { error: insertErr } = await admin.from("completed_bonuses").insert(toInsert)
    if (insertErr) {
      console.error("[bonusInterestImport] insert failed:", insertErr.message)
    } else {
      imported = toInsert.length
    }
  }

  const interestIds = interests.map(i => i.id)
  await admin
    .from("bonus_interests")
    .update({ claimed_at: new Date().toISOString(), claimed_by_user_id: userId })
    .in("id", interestIds)

  await admin.from("contacts").update({
    stacks_os_user_id: userId,
    customer_status: "current",
    updated_at: new Date().toISOString(),
  }).eq("email", normalizedEmail)

  return { imported }
}
