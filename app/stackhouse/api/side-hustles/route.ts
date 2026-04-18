import { NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"

/** GET /stackhouse/api/side-hustles — list the current user's hustles */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { data, error } = await supabase
    .from("stackhouse_side_hustles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ side_hustles: data ?? [] })
}

/** POST /stackhouse/api/side-hustles — create a new hustle */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const target = Number(body.target_amount)
  if (!title || !Number.isFinite(target) || target <= 0) {
    return NextResponse.json({ error: "title + positive target_amount required" }, { status: 400 })
  }

  const insert = {
    user_id: user.id,
    title,
    target_amount: target,
    xp_reward: Number(body.xp_reward) || 100,
    status: (["active", "completed", "abandoned"] as const).includes(body.status as "active")
      ? (body.status as string)
      : "active",
    notes: typeof body.notes === "string" ? body.notes : null,
    milestones: Array.isArray(body.milestones) ? body.milestones : [],
  }

  const { data, error } = await supabase
    .from("stackhouse_side_hustles")
    .insert(insert)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ side_hustle: data })
}
