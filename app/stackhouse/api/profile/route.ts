import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

/**
 * PATCH /stackhouse/api/profile
 * Body: partial stackhouse_profiles row. Only safe fields are allowed —
 * anything rank/xp related must go through /xp-events.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if ("preferences" in body && typeof body.preferences === "object" && body.preferences !== null) {
    patch.preferences = body.preferences
  }
  if ("onboarded_at" in body && (typeof body.onboarded_at === "string" || body.onboarded_at === null)) {
    patch.onboarded_at = body.onboarded_at
  }
  if ("class" in body && typeof body.class === "string") {
    patch.class = body.class
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no allowed fields" }, { status: 400 })
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("stackhouse_profiles")
    .update(patch)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
