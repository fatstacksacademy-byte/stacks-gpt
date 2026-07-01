import { NextResponse } from "next/server"
import { createAdminClient } from "../../../../lib/stackhouse/supabaseAdmin"
import { sendEmail } from "../../../../lib/email/client"
import { deadlineReminderHTML, deadlineReminderText } from "../../../../lib/email/templates"
import { alreadySent, recordSent } from "../../../../lib/email/preferences"
import { sendToUser as sendPushToUser } from "../../../../lib/push/server"
import { bonuses as catalogBonuses } from "../../../../lib/data/bonuses"
import { savingsBonusForEntry } from "../../../../lib/data/savingsBonuses"
import {
  checkingBonusStep,
  stagedPayoutStep,
  customBonusStep,
  spendingCardStep,
  savingsEntryStep,
  daysUntil,
} from "../../../../lib/bonusNextStep"

/**
 * Daily reminder cron. Walks every user with deadline_reminders=true,
 * computes next-step info for each in-progress bonus across all 4
 * modules, and emails reminders at the T-7 and T-1 thresholds.
 *
 * Idempotency: email_sent_log enforces one send per (user, kind,
 * bonus_key). The cron is safe to re-run within a day.
 *
 * Auth: Vercel Cron injects an Authorization header; we also accept a
 * shared-secret query param so the route is callable from any
 * scheduler (Supabase pg_cron, GitHub Actions, manual curl).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fatstacksacademy.com"

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const url = new URL(req.url)
  const headerSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const querySecret = url.searchParams.get("secret")
  return headerSecret === expected || querySecret === expected
}

type Candidate = {
  bonusKey: string
  bonusName: string
  bonusAmount: number
  nextStep: string
  deadline: string
  module: "paycheck" | "spending" | "savings"
}

function fmtDeadlineLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  const days = daysUntil(iso) ?? 0
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  return `${days <= 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`} · ${date}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Pull every user who hasn't unsubscribed from deadline reminders.
  const { data: prefs, error: prefsErr } = await supabase
    .from("email_preferences")
    .select("user_id, deadline_reminders, unsubscribe_token")
    .eq("deadline_reminders", true)
  if (prefsErr) {
    return NextResponse.json({ error: "Failed to load preferences", details: prefsErr.message }, { status: 500 })
  }

  // Also include users with no prefs row yet (defaults to opted-in).
  // We need the auth user list to do that — service role can read auth.users via the admin API.
  const { data: allUsersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const allUsers = allUsersData?.users ?? []
  const haveRow = new Set((prefs ?? []).map(p => p.user_id))

  type UserMeta = { id: string; email: string | null; firstName: string | null; unsubToken: string | null }
  const users: UserMeta[] = []
  for (const u of allUsers) {
    if (!u.email) continue
    if (haveRow.has(u.id)) {
      const p = (prefs ?? []).find(p => p.user_id === u.id)!
      users.push({
        id: u.id, email: u.email,
        firstName: ((u.user_metadata as { first_name?: string } | null)?.first_name ?? null),
        unsubToken: p.unsubscribe_token,
      })
    } else {
      // No prefs row yet — create one so we have a token to send.
      const { data: created } = await supabase
        .from("email_preferences")
        .insert({ user_id: u.id })
        .select("unsubscribe_token")
        .single()
      users.push({
        id: u.id, email: u.email,
        firstName: ((u.user_metadata as { first_name?: string } | null)?.first_name ?? null),
        unsubToken: created?.unsubscribe_token ?? null,
      })
    }
  }

  let sentCount = 0
  let skippedCount = 0

  for (const user of users) {
    if (!user.email || !user.unsubToken) continue

    const candidates = await collectCandidates(supabase, user.id)
    for (const c of candidates) {
      const days = daysUntil(c.deadline)
      if (days == null) continue
      const kind = days <= 1 ? "deadline_t1" : days <= 7 ? "deadline_t7" : null
      if (!kind) continue

      if (await alreadySent(user.id, kind, c.bonusKey)) {
        skippedCount++
        continue
      }

      const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${user.unsubToken}`
      const dashboardUrl = `${SITE_URL}/stacksos`
      const subject =
        days <= 1
          ? `Tomorrow: ${c.nextStep} (${c.bonusName})`
          : `${days} days: ${c.nextStep} (${c.bonusName})`

      const html = deadlineReminderHTML({
        firstName: user.firstName,
        bonusName: c.bonusName,
        bonusAmount: c.bonusAmount,
        nextStep: c.nextStep,
        deadlineLabel: fmtDeadlineLabel(c.deadline),
        daysLeft: days,
        module: c.module,
        dashboardUrl,
        unsubscribeUrl,
      })
      const text = deadlineReminderText({
        firstName: user.firstName,
        bonusName: c.bonusName,
        bonusAmount: c.bonusAmount,
        nextStep: c.nextStep,
        deadlineLabel: fmtDeadlineLabel(c.deadline),
        daysLeft: days,
        module: c.module,
        dashboardUrl,
        unsubscribeUrl,
      })

      const result = await sendEmail({ to: user.email, subject, html, text, unsubscribeUrl })
      if (result.error) {
        console.error(`send failed for ${user.email}:`, result.error)
        continue
      }
      await recordSent(user.id, kind, c.bonusKey, result.id)
      sentCount++

      // Best-effort push.  Failure here doesn't undo the email send; we
      // log + move on so a misconfigured push setup never breaks the
      // primary reminder channel.
      try {
        await sendPushToUser(supabase, user.id, {
          title: subject,
          body: `${c.nextStep} — ${fmtDeadlineLabel(c.deadline)}`,
          url: dashboardUrl,
          tag: `${kind}:${c.bonusKey}`,
        })
      } catch (err) {
        console.warn(`push failed for ${user.id}:`, err instanceof Error ? err.message : err)
      }
    }
  }

  return NextResponse.json({ ok: true, sent: sentCount, skipped: skippedCount, users: users.length })
}

async function collectCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<Candidate[]> {
  const out: Candidate[] = []

  const [checking, custom, cards, savings, depositRows] = await Promise.all([
    supabase.from("completed_bonuses").select("*").eq("user_id", userId).is("closed_date", null),
    supabase.from("custom_bonuses").select("*").eq("user_id", userId).is("closed_date", null),
    supabase.from("owned_cards").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("savings_entries").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("bonus_deposits").select("bonus_id, amount, deposit_date").eq("user_id", userId),
  ])
  const deposits = depositRows.data ?? []
  const thisMonth = new Date().toISOString().slice(0, 7)

  // Suffix bonusKey with `step.stage` (when present) so a single bonus
  // can receive reminders for each distinct milestone instead of
  // burning its one-and-only dedupe slot on the first stage that fires.
  function keyOf(prefix: string, id: string, stage: string | null | undefined): string {
    return stage ? `${prefix}:${id}:${stage}` : `${prefix}:${id}`
  }

  for (const r of checking.data ?? []) {
    const b = catalogBonuses.find(x => (x as { id?: string }).id === r.bonus_id)
    if (!b) continue

    // Staged / multi-payout bonuses (Four Leaf FCU etc.): once the first
    // tranche has banked, the recurring nudge that matters is "log this
    // month's $500 DD" — miss a month and the later tranches are forfeited.
    const stagedList = (b as { staged_payouts?: { amount: number; label: string; months: number }[] | null }).staged_payouts
    if (Array.isArray(stagedList) && stagedList.length > 0) {
      const perDd = (b as { requirements?: { min_direct_deposit_per_deposit?: number | null } }).requirements?.min_direct_deposit_per_deposit ?? 500
      const mine = deposits.filter(d => d.bonus_id === r.bonus_id && (d.amount ?? 0) >= perDd)
      const monthsLogged = new Set(mine.map(d => String(d.deposit_date).slice(0, 7))).size
      const loggedThisMonth = mine.some(d => String(d.deposit_date).slice(0, 7) === thisMonth)
      const staged = stagedPayoutStep(r, { staged_payouts: stagedList }, { loggedThisMonth, monthsLogged })
      if (staged.nextStep && staged.deadline) {
        out.push({
          bonusKey: keyOf("checking", r.id, staged.stage),
          bonusName: (b as { bank_name?: string }).bank_name ?? r.bonus_id,
          bonusAmount: r.actual_amount ?? (b as { bonus_amount?: number }).bonus_amount ?? 0,
          nextStep: staged.nextStep,
          deadline: staged.deadline,
          module: "paycheck",
        })
        continue
      }
    }

    const step = checkingBonusStep(r, b)
    if (!step.nextStep || !step.deadline) continue
    out.push({
      bonusKey: keyOf("checking", r.id, step.stage),
      bonusName: (b as { bank_name?: string }).bank_name ?? r.bonus_id,
      bonusAmount: r.actual_amount ?? (b as { bonus_amount?: number }).bonus_amount ?? 0,
      nextStep: step.nextStep,
      deadline: step.deadline,
      module: "paycheck",
    })
  }

  const NON_ACTIVE = new Set(["pending", "kept_open", "skipped", "bonus_posted"])
  for (const c of custom.data ?? []) {
    if (c.current_step && NON_ACTIVE.has(c.current_step)) continue
    const step = customBonusStep(c)
    if (!step.nextStep || !step.deadline) continue
    out.push({
      bonusKey: keyOf("custom", c.id, step.stage),
      bonusName: c.bank_name,
      bonusAmount: c.actual_amount ?? c.bonus_amount,
      nextStep: step.nextStep,
      deadline: step.deadline,
      module: "paycheck",
    })
  }

  for (const c of cards.data ?? []) {
    const step = spendingCardStep(c)
    if (!step.nextStep || !step.deadline) continue
    out.push({
      bonusKey: keyOf("card", c.id, step.stage),
      bonusName: c.card_name,
      bonusAmount: c.expected_value ?? c.signup_bonus_value ?? 0,
      nextStep: step.nextStep,
      deadline: step.deadline,
      module: "spending",
    })
  }

  for (const e of savings.data ?? []) {
    const step = savingsEntryStep(e, { requiresTransactions: savingsBonusForEntry(e)?.requires_transactions ?? null })
    if (!step.nextStep || !step.deadline) continue
    out.push({
      bonusKey: keyOf("savings", e.id, step.stage),
      bonusName: e.institution_name,
      bonusAmount: e.expected_total_value ?? e.bonus_amount ?? 0,
      nextStep: step.nextStep,
      deadline: step.deadline,
      module: "savings",
    })
  }

  return out
}
