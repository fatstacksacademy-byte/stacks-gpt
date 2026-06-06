import { NextResponse } from "next/server"
import { createAdminClient } from "../../../../lib/stackhouse/supabaseAdmin"
import { sendEmail } from "../../../../lib/email/client"
import { weeklyDigestHTML, weeklyDigestText, type DigestRow } from "../../../../lib/email/templates"
import { alreadySent, recordSent } from "../../../../lib/email/preferences"
import { bonuses as catalogBonuses } from "../../../../lib/data/bonuses"
import {
  checkingBonusStep,
  customBonusStep,
  spendingCardStep,
  savingsEntryStep,
  daysUntil,
} from "../../../../lib/bonusNextStep"

/**
 * Weekly digest cron — same auth pattern as deadline-reminders.
 * Designed to run once on Monday mornings. Idempotency key is
 * `weekly_digest` + the ISO week (e.g. "2026-W23"), so re-running on
 * the same week is a no-op even if you change the schedule.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fatstacksacademy.com"

function isoWeek(d: Date): string {
  const t = new Date(d.getTime())
  t.setUTCHours(0, 0, 0, 0)
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const url = new URL(req.url)
  const headerSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const querySecret = url.searchParams.get("secret")
  return headerSecret === expected || querySecret === expected
}

function fmtDeadlineLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  const days = daysUntil(iso) ?? 0
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return `${date} (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `${days}d`})`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = createAdminClient()
  const weekKey = isoWeek(new Date())

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("user_id, weekly_digest, unsubscribe_token")
    .eq("weekly_digest", true)

  const { data: allUsersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const allUsers = allUsersData?.users ?? []
  const haveRow = new Map((prefs ?? []).map(p => [p.user_id, p]))

  let sentCount = 0
  let skippedCount = 0

  for (const u of allUsers) {
    if (!u.email) continue
    let token = haveRow.get(u.id)?.unsubscribe_token ?? null
    if (!haveRow.has(u.id)) {
      const { data: created } = await supabase
        .from("email_preferences")
        .insert({ user_id: u.id })
        .select("unsubscribe_token")
        .single()
      token = created?.unsubscribe_token ?? null
    }
    if (!token) continue

    if (await alreadySent(u.id, "weekly_digest", weekKey)) {
      skippedCount++
      continue
    }

    const rows = await buildDigestRows(supabase, u.id)
    if (rows.length === 0) continue

    const totalInProgress = rows.reduce((s, r) => s + r.amount, 0)
    const firstName = (u.user_metadata as { first_name?: string } | null)?.first_name ?? null
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${token}`
    const dashboardUrl = `${SITE_URL}/stacksos`

    const subject = `Your Stacks week — $${Math.round(totalInProgress).toLocaleString()} in progress`
    const html = weeklyDigestHTML({ firstName, rows, totalInProgress, dashboardUrl, unsubscribeUrl })
    const text = weeklyDigestText({ firstName, rows, totalInProgress, dashboardUrl, unsubscribeUrl })

    const result = await sendEmail({ to: u.email, subject, html, text, unsubscribeUrl })
    if (result.error) {
      console.error(`digest send failed for ${u.email}:`, result.error)
      continue
    }
    await recordSent(u.id, "weekly_digest", weekKey, result.id)
    sentCount++
  }

  return NextResponse.json({ ok: true, weekKey, sent: sentCount, skipped: skippedCount, users: allUsers.length })
}

async function buildDigestRows(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<DigestRow[]> {
  const out: DigestRow[] = []

  const [checking, custom, cards, savings] = await Promise.all([
    supabase.from("completed_bonuses").select("*").eq("user_id", userId).is("closed_date", null),
    supabase.from("custom_bonuses").select("*").eq("user_id", userId).is("closed_date", null),
    supabase.from("owned_cards").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("savings_entries").select("*").eq("user_id", userId).eq("status", "active"),
  ])

  for (const r of checking.data ?? []) {
    const b = catalogBonuses.find(x => (x as { id?: string }).id === r.bonus_id)
    if (!b) continue
    const step = checkingBonusStep(r, b)
    out.push({
      bonusName: (b as { bank_name?: string }).bank_name ?? r.bonus_id,
      amount: r.actual_amount ?? (b as { bonus_amount?: number }).bonus_amount ?? 0,
      nextStep: step.nextStep,
      deadlineLabel: step.deadline ? fmtDeadlineLabel(step.deadline) : null,
      urgency: step.urgency,
    })
  }

  const NON_ACTIVE = new Set(["pending", "kept_open", "skipped", "bonus_posted"])
  for (const c of custom.data ?? []) {
    if (c.current_step && NON_ACTIVE.has(c.current_step)) continue
    const step = customBonusStep(c)
    out.push({
      bonusName: c.bank_name,
      amount: c.actual_amount ?? c.bonus_amount,
      nextStep: step.nextStep,
      deadlineLabel: step.deadline ? fmtDeadlineLabel(step.deadline) : null,
      urgency: step.urgency,
    })
  }

  for (const c of cards.data ?? []) {
    const step = spendingCardStep(c)
    out.push({
      bonusName: c.card_name,
      amount: c.expected_value ?? c.signup_bonus_value ?? 0,
      nextStep: step.nextStep,
      deadlineLabel: step.deadline ? fmtDeadlineLabel(step.deadline) : null,
      urgency: step.urgency,
    })
  }

  for (const e of savings.data ?? []) {
    const step = savingsEntryStep(e)
    out.push({
      bonusName: e.institution_name,
      amount: e.expected_total_value ?? e.bonus_amount ?? 0,
      nextStep: step.nextStep,
      deadlineLabel: step.deadline ? fmtDeadlineLabel(step.deadline) : null,
      urgency: step.urgency,
    })
  }

  // Urgent/overdue first, then by deadline.
  return out.sort((a, b) => {
    const ua = a.urgency === "overdue" ? 0 : a.urgency === "urgent" ? 1 : a.urgency === "soon" ? 2 : 3
    const ub = b.urgency === "overdue" ? 0 : b.urgency === "urgent" ? 1 : b.urgency === "soon" ? 2 : 3
    return ua - ub
  })
}
