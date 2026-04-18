import { NextResponse } from "next/server"
import { createClient } from "../../../../../lib/supabase/server"
import { createAdminClient } from "../../../../../lib/stackhouse/supabaseAdmin"
import { rankFromXp } from "../../../../../lib/stackhouse/rank"
import type { Milestone, SideHustle } from "../../../../../lib/stackhouse/types"

type PatchBody =
  | { action: "mark_milestone"; milestone_id: string }
  | {
      action?: "update"
      title?: string
      target_amount?: number
      xp_reward?: number
      status?: "active" | "completed" | "abandoned"
      notes?: string | null
      milestones?: Milestone[]
    }

/** PATCH /stackhouse/api/side-hustles/[id] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as PatchBody

  // Fetch the hustle first so we own-check and can read current milestones.
  const { data: existing, error: fetchErr } = await supabase
    .from("stackhouse_side_hustles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })
  const hustle = existing as SideHustle

  if ("action" in body && body.action === "mark_milestone") {
    const milestoneId = body.milestone_id
    const milestones = (hustle.milestones ?? []).map((m) =>
      m.id === milestoneId && !m.completed_at
        ? { ...m, completed_at: new Date().toISOString() }
        : m,
    )
    const target = milestones.find((m) => m.id === milestoneId)
    if (!target) return NextResponse.json({ error: "milestone not found" }, { status: 404 })
    const isNewlyCompleted =
      target.completed_at &&
      !(hustle.milestones ?? []).find((m) => m.id === milestoneId)?.completed_at

    // Update milestones on the hustle
    const allCompleted = milestones.every((m) => m.completed_at)
    const nextStatus: SideHustle["status"] =
      allCompleted && hustle.status === "active" ? "completed" : hustle.status

    const { data: updated, error: updateErr } = await supabase
      .from("stackhouse_side_hustles")
      .update({
        milestones,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Award XP if this was a real transition (not idempotent re-fire)
    let profile = null
    if (isNewlyCompleted) {
      const xpToAward = target.xp_reward
      const bonusOnFinish = allCompleted && hustle.status === "active" ? hustle.xp_reward : 0
      profile = await awardXp(user.id, [
        {
          source_type: "milestone_hit",
          source_id: `${hustle.id}:${milestoneId}`,
          amount: xpToAward,
          note: target.label,
        },
        ...(bonusOnFinish > 0
          ? [
              {
                source_type: "side_hustle_complete" as const,
                source_id: hustle.id,
                amount: bonusOnFinish,
                note: `Side hustle complete: ${hustle.title}`,
              },
            ]
          : []),
      ])
    }

    return NextResponse.json({ side_hustle: updated, profile })
  }

  // Default: general update
  const patch: Record<string, unknown> = {}
  if (typeof body.title === "string") patch.title = body.title.trim()
  if (typeof body.target_amount === "number") patch.target_amount = body.target_amount
  if (typeof body.xp_reward === "number") patch.xp_reward = body.xp_reward
  if (typeof body.notes === "string" || body.notes === null) patch.notes = body.notes
  if (Array.isArray(body.milestones)) patch.milestones = body.milestones
  if (
    typeof body.status === "string" &&
    (["active", "completed", "abandoned"] as const).includes(body.status)
  ) {
    patch.status = body.status
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("stackhouse_side_hustles")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ side_hustle: data })
}

/** DELETE /stackhouse/api/side-hustles/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("stackhouse_side_hustles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * Internal XP award — writes via service-role client (required for the
 * stackhouse_xp_events table, which denies writes to the authenticated
 * role by design). Recomputes current_xp + rank from the event log so
 * the cache on stackhouse_profiles never drifts from the ledger.
 */
async function awardXp(
  userId: string,
  events: { source_type: string; source_id: string | null; amount: number; note: string | null }[],
) {
  if (events.length === 0) return null
  const admin = createAdminClient()
  const rows = events.map((e) => ({
    user_id: userId,
    source_type: e.source_type,
    source_id: e.source_id,
    amount: e.amount,
    note: e.note,
  }))
  const { error: insertErr } = await admin.from("stackhouse_xp_events").insert(rows)
  if (insertErr) throw new Error(`xp_events insert: ${insertErr.message}`)

  // Sum from the ledger (source of truth)
  const { data: all, error: sumErr } = await admin
    .from("stackhouse_xp_events")
    .select("amount")
    .eq("user_id", userId)
  if (sumErr) throw new Error(`xp_events sum: ${sumErr.message}`)
  const currentXp = (all ?? []).reduce((s, r) => s + Number(r.amount || 0), 0)
  const rank = rankFromXp(currentXp)

  const { data: profile, error: profileErr } = await admin
    .from("stackhouse_profiles")
    .update({
      current_xp: currentXp,
      rank,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single()
  if (profileErr) throw new Error(`profile update: ${profileErr.message}`)
  return profile
}
