import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"

/**
 * POST /api/push/unsubscribe
 *
 * Body: { endpoint }
 *
 * Deletes the row matching the caller's auth.uid() + endpoint. We hard-delete
 * on user request (rather than soft-delete) so unsubscribe is final — the
 * row only sticks around (via expired_at) when the push provider declares it
 * dead automatically.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null) as { endpoint?: string } | null
  if (!body?.endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", body.endpoint)
  if (error) {
    console.error("[push/unsubscribe] delete failed:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
