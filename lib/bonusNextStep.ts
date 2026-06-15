/**
 * Per-module helpers that turn a started bonus into a short "next step"
 * label + deadline + urgency, so the dashboard can show
 *
 *   Next: Hit $1,000 DD · by Aug 5 (4 days left)   [URGENT]
 *
 * Urgency tiers (driven by days-until-deadline):
 *   overdue  — deadline already passed
 *   urgent   — ≤ 7 days away
 *   soon     — ≤ 30 days away
 *   none     — > 30 days or no deadline
 */

import type { CompletedBonus } from "./churn"
import type { CustomBonus } from "./customBonuses"
import type { OwnedCard } from "./ownedCards"
import type { SavingsEntry } from "./savingsEntries"

export type BonusUrgency = "overdue" | "urgent" | "soon" | "none"

export type NextStepInfo = {
  nextStep: string | null
  deadline: string | null      // ISO yyyy-mm-dd
  urgency: BonusUrgency
  /**
   * Optional identifier for the milestone the next step is driving toward.
   * Lets the deadline-reminder cron dedupe per-stage instead of per-bonus:
   * once an "open account" reminder fires, the user can still receive a
   * separate "fund the account" reminder later without the dedupe key
   * blocking it.
   */
  stage?: string | null
}

export const URGENCY_RANK: Record<BonusUrgency, number> = {
  overdue: 0,
  urgent: 1,
  soon: 2,
  none: 3,
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysUntil(deadlineISO: string | null): number | null {
  if (!deadlineISO) return null
  const d = new Date(deadlineISO + "T00:00:00")
  const now = new Date(todayISO() + "T00:00:00")
  if (Number.isNaN(d.getTime())) return null
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export function urgencyFor(deadlineISO: string | null): BonusUrgency {
  const days = daysUntil(deadlineISO)
  if (days == null) return "none"
  if (days < 0) return "overdue"
  if (days <= 7) return "urgent"
  if (days <= 30) return "soon"
  return "none"
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function money(n: number | null | undefined): string {
  if (n == null) return ""
  return `$${Math.round(n).toLocaleString()}`
}

// ─── Catalog checking bonuses ────────────────────────────────────────
// We don't track partial DD progress here, so the "next step" is a
// passive reminder of what still needs to happen by the deposit window.
//
// Stages (used by the deadline-reminder cron for per-stage dedupe):
//   stage="dd"      → inside deposit window, asking for direct deposit
//   stage="hold"    → past deposit window but holding period still running
//   stage="posting" → waiting for the cash bonus to post
//   stage="confirm" → past expected posting date, nudge to confirm
//
// Note: `stage` is the dedupe granularity, not the user-facing label. Two
// different bonuses both in stage="dd" get independent reminder slots
// because the cron's bonus_key incorporates the record id.
export function checkingBonusStep(
  record: CompletedBonus,
  bonus: unknown,
): NextStepInfo {
  if (!bonus || typeof bonus !== "object") {
    return { nextStep: null, deadline: null, urgency: "none" }
  }
  const b = bonus as {
    requirements?: {
      direct_deposit_required?: boolean | null
      min_direct_deposit_total?: number | null
      dd_count_required?: number | null
      deposit_window_days?: number | null
      holding_period_days?: number | null
    }
    timeline?: {
      bonus_posting_days_est?: number | null
      must_remain_open_days?: number | null
    }
  }
  const reqs = b.requirements ?? {}
  const tl = b.timeline ?? {}
  const opened = record.opened_date
  if (!opened) return { nextStep: null, deadline: null, urgency: "none" }

  const depositDeadline = reqs.deposit_window_days
    ? addDays(opened, reqs.deposit_window_days)
    : null
  const inDepositWindow = depositDeadline ? (daysUntil(depositDeadline) ?? 0) >= 0 : true

  if (reqs.direct_deposit_required && inDepositWindow) {
    const total = reqs.min_direct_deposit_total
    const count = reqs.dd_count_required
    const label = count && total
      ? `${count} DD${count > 1 ? "s" : ""} totaling ${money(total)}`
      : total
      ? `Hit ${money(total)} direct deposit`
      : "Set up direct deposit"
    return { nextStep: label, deadline: depositDeadline, urgency: urgencyFor(depositDeadline), stage: "dd" }
  }

  // Past deposit window or no DD required — waiting on bonus posting
  // and/or the holding period.
  const postDeadline = tl.bonus_posting_days_est
    ? addDays(opened, tl.bonus_posting_days_est)
    : null
  const holdDeadline =
    reqs.holding_period_days || tl.must_remain_open_days
      ? addDays(opened, reqs.holding_period_days ?? tl.must_remain_open_days ?? 0)
      : null

  const remainingHold = daysUntil(holdDeadline)
  if (holdDeadline && remainingHold != null && remainingHold > 0) {
    return {
      nextStep: `Keep account open ${remainingHold} more day${remainingHold !== 1 ? "s" : ""}`,
      deadline: holdDeadline,
      urgency: urgencyFor(holdDeadline),
      stage: "hold",
    }
  }

  // Bonus already confirmed received and no hold remaining — nothing left to do.
  if (record.bonus_received) {
    return { nextStep: null, deadline: null, urgency: "none" }
  }

  if (postDeadline) {
    const remaining = daysUntil(postDeadline)
    const isOverdue = !(remaining != null && remaining > 0)
    const lbl = !isOverdue
      ? `Wait for bonus to post (~${remaining} day${remaining !== 1 ? "s" : ""})`
      : "Bonus should have posted — confirm"
    return {
      nextStep: lbl,
      deadline: postDeadline,
      urgency: urgencyFor(postDeadline),
      stage: isOverdue ? "confirm" : "posting",
    }
  }

  return { nextStep: "Confirm bonus posted", deadline: null, urgency: "none", stage: "confirm" }
}

// ─── Custom-tracked checking bonuses ─────────────────────────────────
// Stages mirror checkingBonusStep so the cron's dedupe key shape is
// uniform across modules:
//   stage="dd"      → asking for direct deposit (or generic "Meet requirements"
//                      when DD isn't required for this user-tracked bonus)
//   stage="posting" → requirements met, waiting for bonus to post
//   stage="hold"    → bonus posted, holding period still running
//   stage="close"   → ready to close the account
export function customBonusStep(c: CustomBonus): NextStepInfo {
  const opened = c.opened_date
  const depositDeadline = opened && c.deposit_window_days
    ? addDays(opened, c.deposit_window_days)
    : null
  const holdDeadline = opened && c.holding_period_days
    ? addDays(opened, c.holding_period_days)
    : null

  switch (c.current_step) {
    case null:
    case "account_opened": {
      if (c.dd_required) {
        const total = c.min_dd_total
        const count = c.dd_count_required
        const label = count && total
          ? `${count} DD${count > 1 ? "s" : ""} totaling ${money(total)}`
          : total
          ? `Hit ${money(total)} direct deposit`
          : "Set up direct deposit"
        return { nextStep: label, deadline: depositDeadline, urgency: urgencyFor(depositDeadline), stage: "dd" }
      }
      return { nextStep: "Meet requirements", deadline: depositDeadline, urgency: urgencyFor(depositDeadline), stage: "dd" }
    }
    case "requirements_met":
      return { nextStep: "Wait for bonus to post", deadline: holdDeadline, urgency: urgencyFor(holdDeadline), stage: "posting" }
    case "bonus_posted": {
      const remaining = daysUntil(holdDeadline)
      if (holdDeadline && remaining != null && remaining > 0) {
        return {
          nextStep: `Hold ${remaining} more day${remaining !== 1 ? "s" : ""}`,
          deadline: holdDeadline,
          urgency: urgencyFor(holdDeadline),
          stage: "hold",
        }
      }
      return { nextStep: "Safe to close", deadline: null, urgency: "none", stage: "close" }
    }
    default:
      return { nextStep: null, deadline: null, urgency: "none" }
  }
}

// ─── Spending cards ──────────────────────────────────────────────────
export function spendingCardStep(c: OwnedCard): NextStepInfo {
  if (c.spend_requirement && c.spend_deadline) {
    return {
      nextStep: `Spend ${money(c.spend_requirement)}`,
      deadline: c.spend_deadline,
      urgency: urgencyFor(c.spend_deadline),
    }
  }
  if (c.spend_deadline) {
    return { nextStep: "Hit spend requirement", deadline: c.spend_deadline, urgency: urgencyFor(c.spend_deadline) }
  }
  return { nextStep: null, deadline: null, urgency: "none" }
}

// ─── Savings entries ─────────────────────────────────────────────────
// Milestone-aware: progresses through five stages tied to the three
// `*_at` columns on savings_entries. Each stage has its own deadline and
// `stage` identifier so the deadline-reminder cron sends one reminder per
// stage rather than one per bonus for its lifetime.
//
//   stage="open"     → account_opened_at is null
//   stage="fund"     → opened ✓ but funded_at is null
//   stage="hold"     → funded ✓ but holding period still running
//   stage="confirm"  → hold complete but bonus_posted_at is null
//   stage="close"    → bonus posted, ready to rotate cash (no deadline)
//
// Falls back to legacy behavior (Hold until deadline) when none of the
// milestone columns are populated AND no opened_date is set, which keeps
// pre-migration rows working.
//
// Soft deadlines used when the catalog/user didn't supply one:
//   open  → opened_date + 14 days (or null if no opened_date)
//   fund  → account_opened_at + 14 days
//   confirm → expected payout date + 7 days
const SOFT_OPEN_DAYS = 14
const SOFT_FUND_DAYS = 14
const SOFT_CONFIRM_DAYS = 7

function isoDay(value: string | null | undefined): string | null {
  if (!value) return null
  // Tolerate both date and timestamptz strings.
  return value.slice(0, 10)
}

export function savingsEntryStep(e: SavingsEntry): NextStepInfo {
  const openedAt = isoDay(e.account_opened_at)
  const fundedAt = isoDay(e.funded_at)
  const bonusPostedAt = isoDay(e.bonus_posted_at)

  // Stage 1 — account not opened yet
  if (!openedAt) {
    const softDeadline = e.opened_date ? addDays(e.opened_date, SOFT_OPEN_DAYS) : null
    return {
      nextStep: `Open the ${e.institution_name} account`,
      deadline: softDeadline,
      urgency: urgencyFor(softDeadline),
      stage: "open",
    }
  }

  // Stage 2 — opened but not funded
  if (!fundedAt) {
    const softDeadline = addDays(openedAt, SOFT_FUND_DAYS)
    const amountLabel = e.deposit_required ? `Move ${money(e.deposit_required)} into the account` : "Fund the account"
    return {
      nextStep: amountLabel,
      deadline: softDeadline,
      urgency: urgencyFor(softDeadline),
      stage: "fund",
    }
  }

  // Stage 3 — funded, holding period running
  const holdDeadline = e.holding_period_days
    ? addDays(fundedAt, e.holding_period_days)
    : (e.deadline ?? (e.opened_date && e.holding_period_days
        ? addDays(e.opened_date, e.holding_period_days)
        : null))
  if (holdDeadline && (daysUntil(holdDeadline) ?? 0) > 0) {
    const label = e.deposit_required
      ? `Hold ${money(e.deposit_required)} until deadline`
      : "Hold until deadline"
    return {
      nextStep: label,
      deadline: holdDeadline,
      urgency: urgencyFor(holdDeadline),
      stage: "hold",
    }
  }

  // Stage 4 — hold complete but bonus not yet confirmed posted
  if (!bonusPostedAt) {
    const expected = holdDeadline ?? fundedAt
    const softDeadline = expected ? addDays(expected, SOFT_CONFIRM_DAYS) : null
    return {
      nextStep: `Confirm bonus posted at ${e.institution_name}`,
      deadline: softDeadline,
      urgency: urgencyFor(softDeadline),
      stage: "confirm",
    }
  }

  // Stage 5 — bonus posted; nothing time-sensitive left, just a nudge to
  // rotate the cash. No deadline so the cron stays quiet.
  return {
    nextStep: "Safe to close — rotate this cash into your next bonus",
    deadline: null,
    urgency: "none",
    stage: "close",
  }
}
