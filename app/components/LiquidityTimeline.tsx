"use client"

import type { SavingsEntry } from "../../lib/savingsEntries"

/**
 * Liquidity timeline for a single savings bonus entry. Renders the
 * six milestones every savings bonus passes through, with the date of
 * each known one and a current-state indicator on the next pending
 * step.
 *
 *   Account opened → Funded → Holding period → Bonus posted →
 *   Safe to withdraw → Recommended next move
 *
 * User-actionable steps (opened, funded, bonus posted) call back into
 * the parent so the parent can persist the milestone timestamp. The
 * holding-period and safe-to-withdraw steps are auto-derived from the
 * entry's dates + holding window.
 */

export type LiquidityMilestoneKey =
  | "account_opened_at"
  | "funded_at"
  | "bonus_posted_at"
  | "transactions_done_at"

type Props = {
  entry: SavingsEntry
  onToggle: (milestone: LiquidityMilestoneKey, hit: boolean) => void
  recommendation?: string | null
  /** When set, the bonus requires debit/electronic transactions or card spend
   *  during the hold — renders an extra checkable "Transactions" step. */
  transactionsRequired?: { description: string; count?: number } | null
}

type StepStatus = "done" | "current" | "future"

type Step = {
  key: string
  label: string
  date: string | null            // user-facing label "Aug 4" or "Day 15"
  status: StepStatus
  detail?: string | null         // smaller second-line
  clickable?: boolean            // user can toggle (open/funded/posted)
  milestone?: LiquidityMilestoneKey
  done: boolean                  // for the click-handler's expected post-state
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function addDaysISO(iso: string | null, days: number): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const ad = new Date(a + "T00:00:00").getTime()
  const bd = new Date(b + "T00:00:00").getTime()
  return Math.floor((bd - ad) / 86400000)
}

export default function LiquidityTimeline({ entry, onToggle, recommendation, transactionsRequired }: Props) {
  const opened = entry.account_opened_at != null
  const funded = entry.funded_at != null
  const bonusPosted = entry.bonus_posted_at != null
  const txnsDone = entry.transactions_done_at != null

  const holdDays = entry.holding_period_days ?? 0
  const fundedDateISO = entry.funded_at ? entry.funded_at.slice(0, 10) : entry.opened_date

  // Holding ends `holdDays` after the funding date (or opened_date if
  // funding isn't logged yet). When neither is known, leave as null.
  const holdEndISO = fundedDateISO ? addDaysISO(fundedDateISO, holdDays) : null
  const todayISO = new Date().toISOString().slice(0, 10)
  const holdComplete = holdEndISO != null && holdEndISO <= todayISO
  const daysIntoHold = fundedDateISO ? Math.max(0, daysBetween(fundedDateISO, todayISO) ?? 0) : 0
  const holdProgressPct = holdDays > 0 ? Math.min(100, Math.round((daysIntoHold / holdDays) * 100)) : 0

  // ── Compose the six steps ─────────────────────────────────────────
  const steps: Step[] = [
    {
      key: "opened",
      label: "Account opened",
      date: fmtDate(entry.account_opened_at) ?? fmtDate(entry.opened_date),
      status: opened ? "done" : "current",
      clickable: true,
      milestone: "account_opened_at",
      done: opened,
    },
    {
      key: "funded",
      label: entry.deposit_required ? `Funded ($${entry.deposit_required.toLocaleString()})` : "Funded",
      date: fmtDate(entry.funded_at),
      status: funded ? "done" : opened ? "current" : "future",
      clickable: true,
      milestone: "funded_at",
      done: funded,
    },
    // Transaction/spend requirement — only present for bonuses that need it.
    // Sits between funding and the end of the hold because the swipes happen
    // while the balance is parked. Forgetting this is the #1 silent forfeit.
    ...(transactionsRequired
      ? [{
          key: "txns",
          label: transactionsRequired.count ? `${transactionsRequired.count} transactions` : "Transactions / spend",
          date: fmtDate(entry.transactions_done_at),
          status: (txnsDone ? "done" : funded ? "current" : "future") as StepStatus,
          detail: transactionsRequired.description,
          clickable: true,
          milestone: "transactions_done_at" as LiquidityMilestoneKey,
          done: txnsDone,
        }]
      : []),
    {
      key: "hold",
      label: `Holding period (${holdDays}d)`,
      date: holdEndISO ? fmtDate(holdEndISO + "T00:00:00") : null,
      status: holdComplete ? "done" : funded ? "current" : "future",
      detail: funded && !holdComplete && holdDays > 0
        ? `${daysIntoHold} of ${holdDays} days · ${holdProgressPct}%`
        : null,
      clickable: false,
      done: holdComplete,
    },
    {
      key: "posted",
      label: "Bonus posted",
      date: fmtDate(entry.bonus_posted_at),
      status: bonusPosted ? "done" : holdComplete ? "current" : "future",
      clickable: true,
      milestone: "bonus_posted_at",
      done: bonusPosted,
    },
    {
      key: "safe",
      label: "Safe to withdraw",
      date: holdEndISO ? fmtDate(holdEndISO + "T00:00:00") : null,
      status: holdComplete && bonusPosted ? "done" : holdComplete ? "current" : "future",
      detail: holdComplete && !bonusPosted ? "Holding complete — waiting on bonus" : null,
      clickable: false,
      done: holdComplete && bonusPosted,
    },
    {
      key: "next",
      label: "Next move",
      date: null,
      status: entry.status === "completed" ? "done" : (holdComplete && bonusPosted) ? "current" : "future",
      detail: recommendation ?? (holdComplete && bonusPosted ? "Close & rotate cash into the next bonus" : null),
      clickable: false,
      done: entry.status === "completed",
    },
  ]

  return (
    <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 12, padding: "16px 18px", marginTop: 14 }}>
      <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12, fontWeight: 700 }}>
        Liquidity timeline
      </div>

      {/* Horizontal track on desktop, stacked on mobile via CSS below */}
      <div className="liq-track" style={{ display: "flex", gap: 0, position: "relative" }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const isClickable = step.clickable
          const color =
            step.status === "done" ? "#0d7c5f" :
            step.status === "current" ? "#2563eb" :
            "#d4d4d4"
          const labelColor =
            step.status === "done" ? "#111" :
            step.status === "current" ? "#111" :
            "#bbb"

          return (
            <div
              key={step.key}
              className="liq-step"
              style={{
                flex: 1,
                minWidth: 0,
                position: "relative",
                paddingRight: isLast ? 0 : 8,
              }}
            >
              {/* connector line */}
              {!isLast && (
                <div
                  className="liq-connector"
                  style={{
                    position: "absolute",
                    top: 11,
                    left: 22,
                    right: -8,
                    height: 2,
                    background: step.status === "done" && steps[i + 1]?.status !== "future" ? "#0d7c5f" : "#e0e0e0",
                  }}
                />
              )}

              <div
                onClick={isClickable && step.milestone
                  ? () => onToggle(step.milestone!, !step.done)
                  : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  cursor: isClickable ? "pointer" : "default",
                  position: "relative",
                  zIndex: 1,
                }}
                title={isClickable ? (step.done ? "Click to undo" : "Click when done") : undefined}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  background: step.status === "done" ? "#0d7c5f" : "#fff",
                  border: `2px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: step.status === "done" ? "#fff" : color,
                  flexShrink: 0,
                  boxShadow: step.status === "current" ? "0 0 0 4px rgba(37, 99, 235, 0.12)" : "none",
                  transition: "all 0.15s",
                }}>
                  {step.status === "done" ? "✓" : step.status === "current" ? "•" : ""}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, lineHeight: 1.3 }}>
                  {step.label}
                </div>
                {step.date && (
                  <div style={{ fontSize: 10, color: "#999" }}>
                    {step.date}
                  </div>
                )}
                {step.detail && (
                  <div style={{ fontSize: 10, color: step.status === "current" ? "#2563eb" : "#999", lineHeight: 1.4 }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .liq-track { flex-direction: column; gap: 12px; }
          .liq-step { padding-right: 0 !important; }
          .liq-connector { display: none; }
        }
      `}</style>
    </div>
  )
}
