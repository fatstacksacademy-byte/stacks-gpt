import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"

/**
 * POST /api/push/subscribe
 *
 * Body: { endpoint, p256dh, auth, user_agent }
 *
 * Upserts on endpoint so a returning browser whose subscription rotated
 * doesn't accumulate duplicate rows.  Re-subscribes also clear any prior
 * expired_at stamp so a previously-dead subscription comes back alive
 * when the user re-grants permission.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { endpoint?: string; p256dh?: string; auth?: string; user_agent?: string }
    | null
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: "endpoint, p256dh, and auth are required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
        user_agent: body.user_agent ?? null,
        expired_at: null,
      },
      { onConflict: "endpoint" },
    )
  if (error) {
    console.error("[push/subscribe] insert failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
