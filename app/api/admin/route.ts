import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const ADMIN_EMAIL = "booth.nathaniel@gmail.com"

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const action = req.nextUrl.searchParams.get("action")
  const supabase = createServiceClient()

  if (action === "users") {
    // Start from auth users (source of truth) rather than profiles
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers()
    if (authErr) {
      console.error("[admin] auth.admin.listUsers failed:", authErr.message)
      return NextResponse.json({ error: authErr.message, users: [] })
    }

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, pay_frequency, paycheck_amount, created_at")
    if (profErr) console.error("[admin] profiles query failed:", profErr.message)

    const { data: subs, error: subErr } = await supabase
      .from("subscriptions")
      .select("user_id, status, plan")
    if (subErr) console.error("[admin] subscriptions query failed:", subErr.message)

    const { data: completed } = await supabase
      .from("completed_bonuses")
      .select("user_id, bonus_id, bonus_amount, started_date, closed_date")

    const { data: customs } = await supabase
      .from("custom_bonuses")
      .select("user_id, bank_name, bonus_amount, current_step")

    const profileMap: Record<string, any> = {}
    for (const p of profiles ?? []) profileMap[p.user_id] = p

    const subMap: Record<string, { status: string; plan: string }> = {}
    for (const s of subs ?? []) {
      subMap[s.user_id] = { status: s.status, plan: s.plan }
    }

    const completedMap: Record<string, any[]> = {}
    for (const c of completed ?? []) {
      if (!completedMap[c.user_id]) completedMap[c.user_id] = []
      completedMap[c.user_id].push(c)
    }

    const customMap: Record<string, any[]> = {}
    for (const c of customs ?? []) {
      if (!customMap[c.user_id]) customMap[c.user_id] = []
      customMap[c.user_id].push(c)
    }

    // Build user list from auth users (every signed-up user), enriched with profile/bonus data
    const users = (authUsers?.users ?? []).map(u => {
      const prof = profileMap[u.id]
      return {
        user_id: u.id,
        email: u.email ?? "unknown",
        pay_frequency: prof?.pay_frequency ?? null,
        paycheck_amount: prof?.paycheck_amount ?? 0,
        created_at: prof?.created_at ?? u.created_at,
        subscription: subMap[u.id] ?? null,
        completed_bonuses: completedMap[u.id] ?? [],
        custom_bonuses: customMap[u.id] ?? [],
      }
    })

    return NextResponse.json({ users })
  }

  if (action === "user-detail") {
    const userId = req.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

    const [
      { data: profile },
      { data: completed },
      { data: customs },
      { data: deposits },
      { data: notes },
      { data: spending },
      { data: ownedCards },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("completed_bonuses").select("*").eq("user_id", userId).order("started_date", { ascending: false }),
      supabase.from("custom_bonuses").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("bonus_deposits").select("*").eq("user_id", userId).order("deposit_date", { ascending: false }),
      supabase.from("bonus_notes").select("*").eq("user_id", userId),
      supabase.from("spending_profile").select("*").eq("user_id", userId).single(),
      supabase.from("owned_cards").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ])

    return NextResponse.json({
      profile,
      completed_bonuses: completed ?? [],
      custom_bonuses: customs ?? [],
      deposits: deposits ?? [],
      notes: notes ?? [],
      spending_profile: spending,
      owned_cards: ownedCards ?? [],
    })
  }

  if (action === "custom-insights") {
    const { data: customs } = await supabase
      .from("custom_bonuses")
      .select("bank_name, bonus_amount, current_step, dd_required, min_dd_total, deposit_window_days, notes")
      .order("created_at", { ascending: false })

    // Aggregate by bank name
    const bankCounts: Record<string, { count: number; avg_bonus: number; total_bonus: number; statuses: Record<string, number> }> = {}
    for (const c of customs ?? []) {
      const name = c.bank_name?.trim() || "Unknown"
      if (!bankCounts[name]) bankCounts[name] = { count: 0, avg_bonus: 0, total_bonus: 0, statuses: {} }
      bankCounts[name].count++
      bankCounts[name].total_bonus += c.bonus_amount ?? 0
      const status = c.current_step ?? "unknown"
      bankCounts[name].statuses[status] = (bankCounts[name].statuses[status] ?? 0) + 1
    }
    for (const name in bankCounts) {
      bankCounts[name].avg_bonus = Math.round(bankCounts[name].total_bonus / bankCounts[name].count)
    }

    const sorted = Object.entries(bankCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      total_custom_bonuses: customs?.length ?? 0,
      unique_banks: sorted.length,
      top_banks: sorted,
      raw: customs ?? [],
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
