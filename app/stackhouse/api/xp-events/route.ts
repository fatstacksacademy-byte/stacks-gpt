import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { createAdminClient } from "../../../../lib/stackhouse/supabaseAdmin"
import { rankFromXp } from "../../../../lib/stackhouse/rank"

/**
 * POST /stackhouse/api/xp-events
 *
 * The single authoritative server-side path for awarding XP. The
 * stackhouse_xp_events table denies all writes from the authenticated
 * role, so this route (using the service-role admin client) is the only
 * way rows land in the ledger.
 *
 * Validates source_type against an allow-list before awarding. Specifically
 * blocks the kinds where the client must not self-grant:
 *
 *   cook_completion       — requires a matching completed_bonuses row that
 *                           the user actually closed with bonus_received=true
 *                           and hasn't already been counted (dedupe on source_id).
 *   milestone_hit         — only routed through /side-hustles/[id] PATCH
 *                           above, never directly here.
 *   side_hustle_complete  — same.
 *   daily_round           — requires the user's last daily_round event to
 *                           be >20 hours old (phase 2 enforcement).
 *   street_win            — awarded by achievement unlock pipeline (phase 2).
 *   admin_adjust          — permitted only if NEXT_PUBLIC_STACKHOUSE_DEBUG=1
 *                           OR the caller's email matches a debug allow-list.
 *
 * Current phase 1 policy:
 *   - cook_completion: validate against completed_bonuses row existence + no
 *                      duplicate event for that record_id.
 *   - admin_adjust:    allowed only when NEXT_PUBLIC_STACKHOUSE_DEBUG=1.
 *   - all others:      rejected from this endpoint (they come from internal
 *                      server code with service-role access, not the client).
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    source_type?: string
    source_id?: string | null
    amount?: number
    note?: string | null
  }

  const sourceType = body.source_type
  const amount = Number(body.amount)
  if (!sourceType || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "source_type and amount required" }, { status: 400 })
  }

  // ── Per-source validation ────────────────────────────────────────────
  if (sourceType === "admin_adjust") {
    const debugOn = (process.env.NEXT_PUBLIC_STACKHOUSE_DEBUG ?? "") === "1"
    if (!debugOn) {
      return NextResponse.json(
        { error: "admin_adjust requires NEXT_PUBLIC_STACKHOUSE_DEBUG=1" },
        { status: 403 },
      )
    }
  } else if (sourceType === "cook_completion") {
    // Must reference a real completed_bonuses row owned by this user
    // with bonus_received=true, and must not have been counted yet.
    const recordId = body.source_id
    if (!recordId) {
      return NextResponse.json({ error: "source_id (completed_bonuses.id) required" }, { status: 400 })
    }
    const { data: record } = await supabase
      .from("completed_bonuses")
      .select("id, bonus_received, closed_date")
      .eq("id", recordId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!record) {
      return NextResponse.json({ error: "no matching completed_bonuses row" }, { status: 404 })
    }
    if (!record.bonus_received || !record.closed_date) {
      return NextResponse.json(
        { error: "bonus not marked received + closed" },
        { status: 400 },
      )
    }
    // Dedupe: admin client only for existence check
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from("stackhouse_xp_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_type", "cook_completion")
      .eq("source_id", recordId)
      .limit(1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: "already counted", already: true },
        { status: 409 },
      )
    }
  } else {
    // milestone_hit / side_hustle_complete / daily_round / street_win
    // are server-internal in phase 1; do not accept from the client.
    return NextResponse.json(
      { error: `source_type "${sourceType}" is not awardable via this endpoint in phase 1` },
      { status: 400 },
    )
  }

  // ── Award + recompute ────────────────────────────────────────────────
  const admin = createAdminClient()
  const { error: insertErr } = await admin.from("stackhouse_xp_events").insert({
    user_id: user.id,
    source_type: sourceType,
    source_id: body.source_id ?? null,
    amount,
    note: body.note ?? null,
  })
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Sum from ledger (source of truth), refresh profile cache
  const { data: all } = await admin
    .from("stackhouse_xp_events")
    .select("amount")
    .eq("user_id", user.id)
  const currentXp = Math.max(0, (all ?? []).reduce((s, r) => s + Number(r.amount || 0), 0))
  const rank = rankFromXp(currentXp)

  const { data: profile, error: profileErr } = await admin
    .from("stackhouse_profiles")
    .update({
      current_xp: currentXp,
      rank,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single()
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
