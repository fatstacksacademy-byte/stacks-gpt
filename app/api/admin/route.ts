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

  if (action === "bonus-verifications") {
    // Sister to card-verifications — same shape, different table.
    const { data, error } = await supabase
      .from("bonus_verifications")
      .select("*")
      .eq("reviewed", false)
      .order("run_at", { ascending: false })
    if (error) {
      console.error("[admin] bonus_verifications query failed:", error.message)
      return NextResponse.json({ error: error.message, verifications: [] })
    }
    const seen = new Set<string>()
    const latest = (data ?? []).filter((r) => {
      if (seen.has(r.bonus_id)) return false
      seen.add(r.bonus_id)
      return true
    })
    const lastRunAt = data?.[0]?.run_at ?? null
    return NextResponse.json({ verifications: latest, last_run_at: lastRunAt })
  }

  if (action === "triage-queue") {
    // Walk the latest verify run, explode every proposed_edits[] row into
    // a flat queue entry, drop entries the admin has already approved or
    // dismissed (snoozed entries re-surface on the next run on purpose),
    // and decorate each one with the matching consensus state + snippet.

    // 1. Find the latest run timestamp across all rows in this run.
    const { data: latestRow } = await supabase
      .from("bonus_verifications")
      .select("run_at")
      .order("run_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastRunAt = latestRow?.run_at ?? null
    if (!lastRunAt) return NextResponse.json({ last_run_at: null, queue: [] })

    // 2. Pull every problem row from that run.
    const { data: rows, error: rowsErr } = await supabase
      .from("bonus_verifications")
      .select("bonus_id, bank_name, url, page_signal, proposed_edits, field_mismatches")
      .eq("run_at", lastRunAt)
    if (rowsErr) {
      console.error("[admin] triage-queue rows query failed:", rowsErr.message)
      return NextResponse.json({ error: rowsErr.message, queue: [] })
    }

    // 3. Pull all prior decisions; we'll use the latest verdict per
    //    (bonus_id, field_path) to filter the queue.
    const bonusIds = Array.from(new Set((rows ?? []).map((r) => r.bonus_id)))
    const decisionsByKey = new Map<string, { verdict: string; decided_at: string }>()
    if (bonusIds.length > 0) {
      const { data: decisions, error: decErr } = await supabase
        .from("verification_decisions")
        .select("bonus_id, field_path, verdict, decided_at")
        .in("bonus_id", bonusIds)
        .order("decided_at", { ascending: false })
      if (decErr) {
        console.error("[admin] triage-queue decisions query failed:", decErr.message)
      }
      for (const d of decisions ?? []) {
        const key = `${d.bonus_id}::${d.field_path}`
        // Only keep the most recent verdict per key (rows are sorted desc).
        if (!decisionsByKey.has(key)) {
          decisionsByKey.set(key, { verdict: d.verdict, decided_at: d.decided_at })
        }
      }
    }

    // 4. Pull consensus state for the bonuses involved.
    const consensusByBonus = new Map<string, {
      sources_agree: boolean | null
      secondary_source_url: string | null
      confidence: string | null
    }>()
    if (bonusIds.length > 0) {
      const { data: states } = await supabase
        .from("catalog_verification_state")
        .select("catalog_id, sources_agree, secondary_source_url, confidence")
        .in("catalog_id", bonusIds)
      for (const s of states ?? []) {
        consensusByBonus.set(s.catalog_id, {
          sources_agree: s.sources_agree ?? null,
          secondary_source_url: s.secondary_source_url ?? null,
          confidence: s.confidence ?? null,
        })
      }
    }

    // 4b. Pull active URL overrides so the UI can show "this bonus already
    //     has a URL override" and pre-fill the form when the admin updates it.
    const overrideByBonus = new Map<string, string>()
    if (bonusIds.length > 0) {
      const { data: overrides } = await supabase
        .from("bonus_url_overrides")
        .select("bonus_id, override_url")
        .in("bonus_id", bonusIds)
        .eq("is_active", true)
      for (const o of overrides ?? []) {
        overrideByBonus.set(o.bonus_id, o.override_url)
      }
    }

    // 5. fieldPath uses dotted form ("requirements.min_direct_deposit_total"),
    //    field_mismatches uses the leaf name ("min_direct_deposit_total"). Map
    //    one to the other so we can attach the snippet that was extracted.
    const pathToField = (path: string): string => {
      const idx = path.lastIndexOf(".")
      return idx === -1 ? path : path.slice(idx + 1)
    }

    type ProposedEdit = {
      id: string
      path: string
      from: unknown
      to: unknown
      reason: string
    }
    type FieldMismatch = {
      field: string
      stored: unknown
      extracted: unknown
      status: string
      snippet?: string
    }

    const queue: Array<{
      bonus_id: string
      bank_name: string
      url: string | null
      page_signal: string
      field_path: string
      from_value: unknown
      to_value: unknown
      reason: string
      snippet: string | null
      consensus: { agrees: boolean | null; secondary_url: string | null; confidence: string | null }
      current_override_url: string | null
    }> = []

    for (const row of rows ?? []) {
      const edits = (row.proposed_edits as ProposedEdit[]) ?? []
      const mismatches = (row.field_mismatches as FieldMismatch[]) ?? []
      const consensus = consensusByBonus.get(row.bonus_id)
      for (const edit of edits) {
        const key = `${row.bonus_id}::${edit.path}`
        const prior = decisionsByKey.get(key)
        // Skip if already approved or dismissed; snoozed re-surfaces.
        if (prior && (prior.verdict === "approved" || prior.verdict === "dismissed")) continue

        const fieldName = pathToField(edit.path)
        const mismatch = mismatches.find((m) => m.field === fieldName)
        queue.push({
          bonus_id: row.bonus_id,
          bank_name: row.bank_name,
          url: row.url ?? null,
          page_signal: row.page_signal,
          field_path: edit.path,
          from_value: edit.from,
          to_value: edit.to,
          reason: edit.reason,
          snippet: mismatch?.snippet ?? null,
          consensus: {
            agrees: consensus?.sources_agree ?? null,
            secondary_url: consensus?.secondary_source_url ?? null,
            confidence: consensus?.confidence ?? null,
          },
          current_override_url: overrideByBonus.get(row.bonus_id) ?? null,
        })
      }
    }

    return NextResponse.json({ last_run_at: lastRunAt, queue })
  }

  if (action === "bonus-url-overrides") {
    // Audit table for the triage page footer. Returns the active overrides
    // the admin has recorded, newest first.
    const { data, error } = await supabase
      .from("bonus_url_overrides")
      .select("id, bonus_id, override_url, previous_url, discovery_method, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[admin] bonus-url-overrides query failed:", error.message)
      return NextResponse.json({ error: error.message, overrides: [] })
    }
    return NextResponse.json({ overrides: data ?? [] })
  }

  if (action === "flag-issue-reports") {
    // Audit feed for the triage footer + future heuristic-improvement workflow.
    const { data, error } = await supabase
      .from("flag_issue_reports")
      .select("id, bonus_id, field_path, issue_category, issue_description, suggested_fix, reported_at, resolved")
      .order("reported_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("[admin] flag-issue-reports query failed:", error.message)
      return NextResponse.json({ error: error.message, reports: [] })
    }
    return NextResponse.json({ reports: data ?? [] })
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

  if (action === "review-bonus-verification") {
    const body = await req.json().catch(() => ({}))
    const { id, notes } = body as { id?: string; notes?: string }
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { error } = await supabase
      .from("bonus_verifications")
      .update({ reviewed: true, reviewed_at: new Date().toISOString(), reviewer_notes: notes ?? null })
      .eq("id", id)
    if (error) {
      console.error("[admin] review-bonus-verification failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === "triage-decide") {
    // Insert one row per (bonus_id, field_path) verdict. The verify pipeline
    // (Phase 6 follow-up) will read these to skip cases the admin already
    // triaged. snippet_fingerprint lets us tell same-page from changed-page.
    const body = await req.json().catch(() => ({}))
    const {
      bonus_id,
      field_path,
      verdict,
      from_value,
      to_value,
      snippet_fingerprint,
      notes,
    } = body as {
      bonus_id?: string
      field_path?: string
      verdict?: "approved" | "dismissed" | "snoozed"
      from_value?: unknown
      to_value?: unknown
      snippet_fingerprint?: string
      notes?: string
    }
    if (!bonus_id || !field_path || !verdict) {
      return NextResponse.json({ error: "bonus_id, field_path, verdict required" }, { status: 400 })
    }
    if (!["approved", "dismissed", "snoozed"].includes(verdict)) {
      return NextResponse.json({ error: "invalid verdict" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("verification_decisions")
      .insert({
        bonus_id,
        field_path,
        verdict,
        from_value: from_value ?? null,
        to_value: to_value ?? null,
        snippet_fingerprint: snippet_fingerprint ?? null,
        notes: notes ?? null,
        decided_by: admin.email ?? null,
      })
      .select("id")
      .single()
    if (error) {
      console.error("[admin] triage-decide failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (action === "bonus-url-override") {
    // Record a manually-discovered URL override. The verify pipeline (Phase 6
    // follow-up) will use override_url in place of bonuses.source_links[0].
    // Force-deactivates any prior active override for the same bonus_id so
    // there's only ever one active row per bonus.
    const body = await req.json().catch(() => ({}))
    const {
      bonus_id,
      override_url,
      previous_url,
      discovery_method,
    } = body as {
      bonus_id?: string
      override_url?: string
      previous_url?: string
      discovery_method?: string
    }
    if (!bonus_id || !override_url || !discovery_method) {
      return NextResponse.json(
        { error: "bonus_id, override_url, discovery_method required" },
        { status: 400 },
      )
    }
    // Validate override_url is a real http(s) URL.
    try {
      const parsed = new URL(override_url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json({ error: "override_url must be http(s)" }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: "override_url is not a valid URL" }, { status: 400 })
    }
    // Force the admin to actually describe how they found the page.
    if (discovery_method.trim().length < 10) {
      return NextResponse.json(
        { error: "discovery_method must be at least 10 characters" },
        { status: 400 },
      )
    }

    // Deactivate any prior active override for this bonus first. We do this
    // before the insert so the partial unique index doesn't bite us.
    const { error: deactErr } = await supabase
      .from("bonus_url_overrides")
      .update({ is_active: false })
      .eq("bonus_id", bonus_id)
      .eq("is_active", true)
    if (deactErr) {
      console.error("[admin] bonus-url-override deactivate failed:", deactErr.message)
      return NextResponse.json({ error: deactErr.message }, { status: 500 })
    }

    const { data, error } = await supabase
      .from("bonus_url_overrides")
      .insert({
        bonus_id,
        override_url,
        previous_url: previous_url ?? null,
        discovery_method: discovery_method.trim(),
        is_active: true,
        created_by: admin.email ?? null,
      })
      .select("id, bonus_id, override_url")
      .single()
    if (error) {
      console.error("[admin] bonus-url-override insert failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ id: data.id, bonus_id: data.bonus_id, override_url: data.override_url })
  }

  if (action === "report-flag-issue") {
    // Capture the admin's diagnosis of why a flag was wrong + how the
    // pipeline should change to stop emitting it. Insert always also
    // writes a parallel "dismissed" decision so reporting clears the
    // queue in a single click.
    const body = await req.json().catch(() => ({}))
    const {
      bonus_id,
      field_path,
      from_value,
      to_value,
      url,
      page_signal,
      snippet,
      issue_category,
      issue_description,
      suggested_fix,
      snippet_fingerprint,
    } = body as {
      bonus_id?: string
      field_path?: string
      from_value?: unknown
      to_value?: unknown
      url?: string | null
      page_signal?: string | null
      snippet?: string | null
      issue_category?: string
      issue_description?: string
      suggested_fix?: string
      snippet_fingerprint?: string
    }
    if (!bonus_id || !field_path || !issue_category || !issue_description || !suggested_fix) {
      return NextResponse.json(
        { error: "bonus_id, field_path, issue_category, issue_description, suggested_fix required" },
        { status: 400 },
      )
    }
    const allowedCategories = [
      "regex_false_positive",
      "wrong_page",
      "tier_mismatch",
      "conditional_value",
      "snippet_too_narrow",
      "expired_misread",
      "other",
    ]
    if (!allowedCategories.includes(issue_category)) {
      return NextResponse.json({ error: "invalid issue_category" }, { status: 400 })
    }
    if (issue_description.trim().length < 20) {
      return NextResponse.json({ error: "issue_description must be at least 20 characters" }, { status: 400 })
    }
    if (suggested_fix.trim().length < 20) {
      return NextResponse.json({ error: "suggested_fix must be at least 20 characters" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("flag_issue_reports")
      .insert({
        bonus_id,
        field_path,
        from_value: from_value ?? null,
        to_value: to_value ?? null,
        url: url ?? null,
        page_signal: page_signal ?? null,
        snippet: snippet ?? null,
        issue_category,
        issue_description: issue_description.trim(),
        suggested_fix: suggested_fix.trim(),
        reported_by: admin.email ?? null,
      })
      .select("id")
      .single()
    if (error) {
      console.error("[admin] report-flag-issue insert failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parallel dismiss so the flag leaves the queue. The notes column
    // points back at the report id so we can later cross-reference.
    const { error: decErr } = await supabase
      .from("verification_decisions")
      .insert({
        bonus_id,
        field_path,
        verdict: "dismissed",
        from_value: from_value ?? null,
        to_value: to_value ?? null,
        snippet_fingerprint: snippet_fingerprint ?? null,
        notes: `Flag issue reported (${issue_category}) — see flag_issue_reports.${data.id}`,
        decided_by: admin.email ?? null,
      })
    if (decErr) {
      // Non-fatal — report is recorded. Surface the error so admin can retry decide manually.
      console.error("[admin] report-flag-issue parallel dismiss failed:", decErr.message)
      return NextResponse.json({ id: data.id, dismissed: false, dismiss_error: decErr.message })
    }

    return NextResponse.json({ id: data.id, dismissed: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
