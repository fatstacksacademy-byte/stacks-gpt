"use client"

import { useState } from "react"
import { URGENCY_RANK, daysUntil, type BonusUrgency } from "../../lib/bonusNextStep"
import PortalStacksBadge from "./PortalStacksBadge"

/**
 * Unified list of every currently-started bonus across paycheck,
 * spending, and savings. Each card surfaces the next required action
 * + deadline + urgency, so the dashboard reads like a prioritized
 * to-do.
 *
 * Cards are interactive: each carries an optional `advance` action that
 * moves the bonus to its next step (mark DD met → bonus posted → safe to
 * close, etc.) and a `checklist` so you can work the bonus right from the
 * dashboard without opening each module page. The card body expands to
 * show the full checklist + a link into the module for deeper edits.
 */

export type AdvanceAction = {
  /** Button label, e.g. "Mark bonus received". */
  label: string
  /** Performs the mutation. The list calls onChanged() after it resolves. */
  run: () => Promise<void>
}

export type ChecklistItem = {
  label: string
  done: boolean
  /** The next not-yet-done step (highlighted). */
  current: boolean
}

export type StartedBonus = {
  module: "paycheck" | "spending" | "savings"
  name: string
  amount: number                // expected or projected value
  started_date: string | null   // ISO yyyy-mm-dd
  nextStep?: string | null      // e.g. "Hit $2,000 spend" or "Hold for 60 more days"
  deadline?: string | null      // ISO yyyy-mm-dd for the next required action
  urgency?: BonusUrgency        // overdue | urgent | soon | none
  href: string
  bonus_id?: string | null      // catalog ID for portal-stack lookup; null when no catalog match
  /** ISO yyyy-mm-dd of when the cash bonus is expected to post. */
  expected_payout_date?: string | null
  /** ISO yyyy-mm-dd of when the account can be safely closed. */
  safe_close_date?: string | null
  /** One-tap action to advance this bonus to its next step. */
  advance?: AdvanceAction | null
  /** Ordered milestone checklist shown when the card is expanded. */
  checklist?: ChecklistItem[]
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

function keyOf(b: StartedBonus): string {
  return `${b.module}:${b.bonus_id ?? b.name}:${b.started_date ?? ""}`
}

export default function StartedBonusesList({
  bonuses,
  onChanged,
}: {
  bonuses: StartedBonus[]
  /** Called after an inline advance so the dashboard can reload its data. */
  onChanged?: () => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function runAdvance(key: string, advance: AdvanceAction) {
    if (busyKey) return
    setBusyKey(key)
    try {
      await advance.run()
      onChanged?.()
    } finally {
      setBusyKey(null)
    }
  }

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
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>Next actions</h2>
        <div style={{ fontSize: 11, color: "#888" }}>
          {sorted.length} bonus{sorted.length !== 1 ? "es" : ""} active
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="started-bonuses-list">
        {sorted.map((b) => {
          const key = keyOf(b)
          const isOpen = expanded.has(key)
          const isBusy = busyKey === key
          const color = MODULE_COLORS[b.module]
          const urgency = b.urgency ?? "none"
          const urg = URGENCY_STYLE[urgency]
          const days = daysSince(b.started_date)
          const daysLeft = daysUntil(b.deadline ?? null)
          const deadlineLabel = fmtDeadline(b.deadline)
          return (
            <div
              key={key}
              style={{
                background: "#fff",
                border: `1px solid ${urg.border}`,
                borderLeft: urgency === "overdue" || urgency === "urgent"
                  ? `4px solid ${urg.border}`
                  : `1px solid ${urg.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Header row — click to expand */}
              <div
                onClick={() => toggle(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  cursor: "pointer",
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
                      <PortalStacksBadge bonusId={b.bonus_id} />
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#999", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {days != null && (
                      <span>Started {days} day{days !== 1 ? "s" : ""} ago</span>
                    )}
                    {b.expected_payout_date && (
                      <span style={{ color: "#666" }}>
                        Estimated payout {fmtDeadline(b.expected_payout_date)}
                      </span>
                    )}
                    {b.safe_close_date && (
                      <span style={{ color: "#666" }}>
                        Estimated safe date {fmtDeadline(b.safe_close_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <div className="sbl-amount" style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0d7c5f",
                  }}>
                    ${Math.round(b.amount).toLocaleString()}
                  </div>
                  {b.advance && (
                    <button
                      onClick={(e) => { e.stopPropagation(); runAdvance(key, b.advance!) }}
                      disabled={isBusy}
                      className="sbl-advance"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        background: color.fg,
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 12px",
                        cursor: isBusy ? "wait" : "pointer",
                        opacity: isBusy ? 0.6 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isBusy ? "Saving…" : b.advance.label}
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 16, color: "#bbb", flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                  ›
                </span>
              </div>

              {/* Expanded drawer — full checklist + link into the module */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa", padding: "14px 18px 16px" }}>
                  {b.checklist && b.checklist.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                      {b.checklist.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: item.done ? "none" : `2px solid ${item.current ? color.fg : "#d4d4d4"}`,
                            background: item.done ? "#0d7c5f" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {item.done && (
                              <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: item.done ? "#999" : item.current ? "#111" : "#bbb",
                            fontWeight: item.current ? 600 : 400,
                            textDecoration: item.done ? "line-through" : "none",
                          }}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {b.advance && (
                      <button
                        onClick={(e) => { e.stopPropagation(); runAdvance(key, b.advance!) }}
                        disabled={isBusy}
                        style={{
                          fontSize: 13, fontWeight: 700, color: "#fff", background: color.fg,
                          border: "none", borderRadius: 8, padding: "9px 16px",
                          cursor: isBusy ? "wait" : "pointer", opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        {isBusy ? "Saving…" : b.advance.label}
                      </button>
                    )}
                    <a
                      href={b.href}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: 13, fontWeight: 600, color: color.fg,
                        padding: "9px 14px", border: `1px solid ${color.fg}`, borderRadius: 8,
                        textDecoration: "none",
                      }}
                    >
                      Open in {color.label} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <style>{`
        @media (max-width: 380px) {
          .started-bonuses-list > div > div { padding: 12px 14px !important; gap: 10px !important; }
          .started-bonuses-list .sbl-amount { font-size: 15px !important; }
        }
      `}</style>
    </div>
  )
}
