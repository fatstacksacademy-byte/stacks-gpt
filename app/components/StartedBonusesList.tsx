"use client"

import { URGENCY_RANK, daysUntil, type BonusUrgency } from "../../lib/bonusNextStep"

/**
 * Unified list of every currently-started bonus across paycheck,
 * spending, and savings. Each card surfaces the next required action
 * + deadline + urgency, so the dashboard reads like a prioritized
 * to-do.
 */

export type StartedBonus = {
  module: "paycheck" | "spending" | "savings"
  name: string
  amount: number                // expected or projected value
  started_date: string | null   // ISO yyyy-mm-dd
  nextStep?: string | null      // e.g. "Hit $2,000 spend" or "Hold for 60 more days"
  deadline?: string | null      // ISO yyyy-mm-dd for the next required action
  urgency?: BonusUrgency        // overdue | urgent | soon | none
  href: string
}

const MODULE_COLORS: Record<StartedBonus["module"], { fg: string; bg: string; label: string }> = {
  paycheck: { fg: "#2563eb", bg: "#eff6ff", label: "Paycheck" },
  spending: { fg: "#7c3aed", bg: "#ede9fe", label: "Spending" },
  savings: { fg: "#0d7c5f", bg: "#e6f5f0", label: "Savings" },
}

const URGENCY_STYLE: Record<BonusUrgency, { border: string; chipBg: string; chipFg: string; chipLabel: string | null }> = {
  overdue: { border: "#dc2626", chipBg: "#fee2e2", chipFg: "#b91c1c", chipLabel: "Overdue" },
  urgent:  { border: "#f59e0b", chipBg: "#fef3c7", chipFg: "#92400e", chipLabel: "Urgent" },
  soon:    { border: "#e8e8e8", chipBg: "#f3f4f6", chipFg: "#525252", chipLabel: "Soon" },
  none:    { border: "#e8e8e8", chipBg: "#f3f4f6", chipFg: "#666",    chipLabel: null },
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const then = new Date(dateStr + "T00:00:00")
  return Math.floor((Date.now() - then.getTime()) / 86400000)
}

function fmtDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function StartedBonusesList({ bonuses }: { bonuses: StartedBonus[] }) {
  if (bonuses.length === 0) {
    return (
      <div style={{
        background: "#fff",
        border: "1px dashed #e8e8e8",
        borderRadius: 12,
        padding: "32px 24px",
        textAlign: "center",
        color: "#888",
        fontSize: 13,
      }}>
        No bonuses in progress. Open the <a href="/stacksos/paycheck" style={{ color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>Paycheck</a>,{" "}
        <a href="/stacksos/spending" style={{ color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>Spending</a>, or{" "}
        <a href="/stacksos/savings" style={{ color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>Savings</a>{" "}
        tab to start one.
      </div>
    )
  }

  const sorted = [...bonuses].sort((a, b) => {
    const ua = URGENCY_RANK[a.urgency ?? "none"]
    const ub = URGENCY_RANK[b.urgency ?? "none"]
    if (ua !== ub) return ua - ub
    const da = daysUntil(a.deadline ?? null)
    const db = daysUntil(b.deadline ?? null)
    if (da != null && db != null) return da - db
    if (da != null) return -1
    if (db != null) return 1
    return (b.started_date || "").localeCompare(a.started_date || "")
  })

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>In progress</h2>
        <div style={{ fontSize: 11, color: "#888" }}>
          {sorted.length} bonus{sorted.length !== 1 ? "es" : ""} active
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="started-bonuses-list">
        {sorted.map((b, i) => {
          const color = MODULE_COLORS[b.module]
          const urgency = b.urgency ?? "none"
          const urg = URGENCY_STYLE[urgency]
          const days = daysSince(b.started_date)
          const daysLeft = daysUntil(b.deadline ?? null)
          const deadlineLabel = fmtDeadline(b.deadline)
          return (
            <a
              key={i}
              href={b.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "#fff",
                border: `1px solid ${urg.border}`,
                borderLeft: urgency === "overdue" || urgency === "urgent"
                  ? `4px solid ${urg.border}`
                  : `1px solid ${urg.border}`,
                borderRadius: 12,
                padding: "14px 18px",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (urgency === "none" || urgency === "soon") e.currentTarget.style.borderColor = "#ccc"
              }}
              onMouseLeave={(e) => {
                if (urgency === "none" || urgency === "soon") e.currentTarget.style.borderColor = urg.border
              }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: color.fg,
                background: color.bg,
                padding: "3px 9px",
                borderRadius: 99,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}>
                {color.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#111",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {b.name}
                </div>
                {b.nextStep && (
                  <div style={{ fontSize: 12, color: "#333", marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>Next:</span>
                    <span>{b.nextStep}</span>
                    {deadlineLabel && (
                      <span style={{ color: "#666" }}>
                        · by {deadlineLabel}
                        {daysLeft != null && (
                          <>
                            {" "}({daysLeft < 0
                              ? `${Math.abs(daysLeft)}d overdue`
                              : daysLeft === 0
                              ? "today"
                              : `${daysLeft}d left`})
                          </>
                        )}
                      </span>
                    )}
                    {urg.chipLabel && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: urg.chipBg,
                        color: urg.chipFg,
                        padding: "2px 7px",
                        borderRadius: 99,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                        {urg.chipLabel}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>
                  {days != null && `Started ${days} day${days !== 1 ? "s" : ""} ago`}
                </div>
              </div>
              <div className="sbl-amount" style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#0d7c5f",
                flexShrink: 0,
              }}>
                ${Math.round(b.amount).toLocaleString()}
              </div>
            </a>
          )
        })}
      </div>
      <style>{`
        @media (max-width: 380px) {
          .started-bonuses-list a { padding: 12px 14px !important; gap: 10px !important; }
          .started-bonuses-list .sbl-amount { font-size: 15px !important; }
        }
      `}</style>
    </div>
  )
}
