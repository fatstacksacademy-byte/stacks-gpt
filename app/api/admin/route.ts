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

  if (action === "card-verifications") {
    // Latest unreviewed row per card_id. Postgres DISTINCT ON keeps only
    // the newest run for each card; reviewed=false filters out cleared issues.
    const { data, error } = await supabase
      .from("card_verifications")
      .select("*")
      .eq("reviewed", false)
      .order("run_at", { ascending: false })
    if (error) {
      console.error("[admin] card_verifications query failed:", error.message)
      return NextResponse.json({ error: error.message, verifications: [] })
    }
    // Dedupe to latest per card_id (data is already sorted by run_at desc)
    const seen = new Set<string>()
    const latest = (data ?? []).filter((r) => {
      if (seen.has(r.card_id)) return false
      seen.add(r.card_id)
      return true
    })
    // Most recent run timestamp for the "last verified" header
    const lastRunAt = data?.[0]?.run_at ?? null
    return NextResponse.json({ verifications: latest, last_run_at: lastRunAt })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const action = req.nextUrl.searchParams.get("action")
  const supabase = createServiceClient()

  if (action === "review-card-verification") {
    const body = await req.json().catch(() => ({}))
    const { id, notes } = body as { id?: string; notes?: string }
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { error } = await supabase
      .from("card_verifications")
      .update({ reviewed: true, reviewed_at: new Date().toISOString(), reviewer_notes: notes ?? null })
      .eq("id", id)
    if (error) {
      console.error("[admin] review-card-verification failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
