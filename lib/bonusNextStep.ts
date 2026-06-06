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
    return { nextStep: label, deadline: depositDeadline, urgency: urgencyFor(depositDeadline) }
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
    return { nextStep: `Keep account open ${remainingHold} more day${remainingHold !== 1 ? "s" : ""}`, deadline: holdDeadline, urgency: urgencyFor(holdDeadline) }
  }

  if (postDeadline) {
    const remaining = daysUntil(postDeadline)
    const lbl = remaining != null && remaining > 0
      ? `Wait for bonus to post (~${remaining} day${remaining !== 1 ? "s" : ""})`
      : "Bonus should have posted — confirm"
    return { nextStep: lbl, deadline: postDeadline, urgency: urgencyFor(postDeadline) }
  }

  return { nextStep: "Confirm bonus posted", deadline: null, urgency: "none" }
}

// ─── Custom-tracked checking bonuses ─────────────────────────────────
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
        return { nextStep: label, deadline: depositDeadline, urgency: urgencyFor(depositDeadline) }
      }
      return { nextStep: "Meet requirements", deadline: depositDeadline, urgency: urgencyFor(depositDeadline) }
    }
    case "requirements_met":
      return { nextStep: "Wait for bonus to post", deadline: holdDeadline, urgency: urgencyFor(holdDeadline) }
    case "bonus_posted": {
      const remaining = daysUntil(holdDeadline)
      if (holdDeadline && remaining != null && remaining > 0) {
        return { nextStep: `Hold ${remaining} more day${remaining !== 1 ? "s" : ""}`, deadline: holdDeadline, urgency: urgencyFor(holdDeadline) }
      }
      return { nextStep: "Safe to close", deadline: null, urgency: "none" }
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
export function savingsEntryStep(e: SavingsEntry): NextStepInfo {
  const holdDeadline = e.deadline ?? (e.opened_date && e.holding_period_days
    ? addDays(e.opened_date, e.holding_period_days)
    : null)

  if (e.deposit_required && holdDeadline) {
    return {
      nextStep: `Hold ${money(e.deposit_required)} until deadline`,
      deadline: holdDeadline,
      urgency: urgencyFor(holdDeadline),
    }
  }
  if (holdDeadline) {
    return { nextStep: "Hold until deadline", deadline: holdDeadline, urgency: urgencyFor(holdDeadline) }
  }
  return { nextStep: null, deadline: null, urgency: "none" }
}
