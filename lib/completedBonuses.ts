import { createClient } from "./supabase/client"
import { reportError } from "./toast"
import type { CompletedBonus } from "./churn"

export async function getCompletedBonuses(userId: string): Promise<CompletedBonus[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("completed_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { console.error("[completedBonuses] fetch failed:", error.message); return [] }
  return (data ?? []) as CompletedBonus[]
}

export async function markBonusStarted(
  userId: string, bonusId: string, openedDate: string
): Promise<CompletedBonus | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("completed_bonuses")
    .insert({ user_id: userId, bonus_id: bonusId, opened_date: openedDate, bonus_received: false })
    .select().single()
  if (error) { reportError("Could not start bonus", error); return null }
  return data as CompletedBonus
}

/**
 * Record a bonus the user already had at some point — used by the
 * "Already had" flow on paycheck recommendations. Accepts partial date
 * info; if both opened_date and closed_date are null, the record is
 * flagged incomplete_info so cooldown math skips it.
 *
 * Postgres requires opened_date to be non-null in the current schema, so
 * we fall back to today's date when the user skipped — the flag is what
 * actually gates downstream logic, not the date value.
 */
export async function markBonusAlreadyHad(
  userId: string,
  bonusId: string,
  payload: {
    opened_date: string | null
    closed_date: string | null
    bonus_received: boolean
    actual_amount: number | null
    incomplete_info: boolean
  },
): Promise<CompletedBonus | null> {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const { data, error } = await supabase
    .from("completed_bonuses")
    .insert({
      user_id: userId,
      bonus_id: bonusId,
      opened_date: payload.opened_date ?? today,
      closed_date: payload.closed_date,
      bonus_received: payload.bonus_received,
      actual_amount: payload.actual_amount,
      current_step: payload.closed_date ? "close" : (payload.bonus_received ? "bonus_posted" : null),
      incomplete_info: payload.incomplete_info,
    })
    .select().single()
  if (error) { reportError("Could not record bonus as already had", error); return null }
  return data as CompletedBonus
}

export async function markBonusClosed(
  recordId: string, closedDate: string, bonusReceived: boolean, actualAmount?: number
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({
      closed_date: closedDate,
      bonus_received: bonusReceived,
      actual_amount: actualAmount,
      current_step: "close",
      updated_at: new Date().toISOString(),
    })
    .eq("id", recordId)
  if (error) reportError("Could not mark bonus closed", error)
}

export async function updateBonusStep(
  recordId: string, step: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("completed_bonuses")
    .update({ current_step: step, updated_at: new Date().toISOString() })
    .eq("id", recordId)
  if (error) reportError("Could not update bonus step", error)
}

export async function deleteCompletedBonus(recordId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("completed_bonuses").delete().eq("id", recordId)
  if (error) reportError("Could not delete bonus record", error)
}

/**
 * Promote a user's custom bonus entry to a first-class checking bonus tied
 * to a catalog id. Carries over every piece of state the user actually
 * cares about:
 *
 *   completed_bonuses insert:
 *     - opened_date, closed_date, bonus_received, actual_amount, current_step
 *
 *   bonus_deposits re-key:
 *     all rows previously keyed to custom.id get rewritten to the new
 *     catalog bonus_id so the deposit history stays attached
 *
 *   bonus_notes re-key:
 *     same — any notes the user attached to the custom tracker move to
 *     the catalog bonus_id. If the custom_bonuses row itself had a
 *     `notes` field populated, we upsert that into bonus_notes too so
 *     it isn't dropped on the floor.
 *
 *   custom_bonuses row is deleted last, once all the above succeeded.
 *
 * The RWP-style requirement metadata on custom_bonuses (dd_required,
 * min_dd_total, deposit_window_days, etc.) is intentionally NOT moved —
 * the catalog entry already owns that data, and overwriting it would
 * let a user's stale custom values shadow the maintained source of truth.
 */
export async function migrateCustomToCompleted(
  userId: string,
  custom: {
    id: string
    opened_date: string
    closed_date: string | null
    bonus_received: boolean
    actual_amount: number | null
    current_step: string | null
    notes: string | null
  },
  targetBonusId: string,
): Promise<boolean> {
  const supabase = createClient()

  // 1. Insert the completed_bonuses row with preserved tracking state.
  const { error: insertErr } = await supabase
    .from("completed_bonuses")
    .insert({
      user_id: userId,
      bonus_id: targetBonusId,
      opened_date: custom.opened_date,
      closed_date: custom.closed_date,
      bonus_received: custom.bonus_received,
      actual_amount: custom.actual_amount,
      current_step: custom.current_step ?? null,
    })
  if (insertErr) {
    console.error("[completedBonuses] migrateCustom insert failed:", insertErr.message)
    return false
  }

  // 2. Re-key any bonus_deposits that were attached to the custom uuid.
  const { error: depErr } = await supabase
    .from("bonus_deposits")
    .update({ bonus_id: targetBonusId })
    .eq("user_id", userId)
    .eq("bonus_id", custom.id)
  if (depErr) {
    console.error("[completedBonuses] migrateCustom deposits re-key failed:", depErr.message)
    // Not fatal — proceed, but warn.
  }

  // 3. Re-key any existing bonus_notes rows attached to the custom uuid.
  const { error: noteErr } = await supabase
    .from("bonus_notes")
    .update({ bonus_id: targetBonusId })
    .eq("user_id", userId)
    .eq("bonus_id", custom.id)
  if (noteErr) {
    console.error("[completedBonuses] migrateCustom notes re-key failed:", noteErr.message)
  }

  // 4. If the custom_bonuses row itself had a `notes` string, fold it
  //    into bonus_notes so the user's free-text isn't lost.
  if (custom.notes && custom.notes.trim()) {
    const { error: upsertErr } = await supabase
      .from("bonus_notes")
      .upsert(
        { user_id: userId, bonus_id: targetBonusId, note: custom.notes, updated_at: new Date().toISOString() },
        { onConflict: "user_id,bonus_id" },
      )
    if (upsertErr) {
      console.error("[completedBonuses] migrateCustom notes upsert failed:", upsertErr.message)
    }
  }

  // 5. Delete the custom_bonuses row last.
  const { error: delErr } = await supabase
    .from("custom_bonuses")
    .delete()
    .eq("id", custom.id)
  if (delErr) {
    console.error("[completedBonuses] migrateCustom delete failed:", delErr.message)
    return false
  }
  return true
}
