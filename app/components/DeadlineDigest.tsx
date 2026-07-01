"use client"

import { DK } from "../../lib/stacksTheme"
import { daysUntil } from "../../lib/bonusNextStep"

/**
 * A one-line "what's due soon" rollup that sits above the dashboard to-do list.
 * With 5+ bonuses in flight, per-card urgency chips are easy to miss — this
 * surfaces the counts (overdue / due this week) at a glance so nothing slips.
 */
export default function DeadlineDigest({
  items,
}: {
  items: { deadline?: string | null }[]
}) {
  if (items.length === 0) return null

  let overdue = 0
  let thisWeek = 0
  let soonest: { days: number } | null = null
  for (const it of items) {
    const d = daysUntil(it.deadline ?? null)
    if (d == null) continue
    if (d < 0) overdue++
    else if (d <= 7) thisWeek++
    if (d >= 0 && (soonest == null || d < soonest.days)) soonest = { days: d }
  }

  // All calm — a quiet, positive confirmation rather than an empty gap.
  if (overdue === 0 && thisWeek === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        fontSize: 12.5, color: DK.greenFg, background: DK.panel, border: `1px solid ${DK.border}`,
        borderRadius: 10, padding: "9px 14px",
      }}>
        <span>✓</span>
        <span style={{ color: DK.textDim }}>Nothing due in the next 7 days — you&apos;re nicely paced.</span>
      </div>
    )
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap",
      background: DK.panel, border: `1px solid ${overdue > 0 ? DK.redBorder : DK.amberBorder}`,
      borderLeft: `4px solid ${overdue > 0 ? DK.red : DK.amber}`,
      borderRadius: 10, padding: "10px 14px",
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: DK.textFaint }}>
        Due soon
      </span>
      {overdue > 0 && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: DK.red, background: DK.redBg, border: `1px solid ${DK.redBorder}`, borderRadius: 99, padding: "3px 10px" }}>
          ⚠️ {overdue} overdue
        </span>
      )}
      {thisWeek > 0 && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: DK.amber, background: DK.amberBg, border: `1px solid ${DK.amberBorder}`, borderRadius: 99, padding: "3px 10px" }}>
          ⏱ {thisWeek} due this week
        </span>
      )}
      {soonest && soonest.days >= 0 && (
        <span style={{ fontSize: 12, color: DK.textMute }}>
          · next deadline {soonest.days === 0 ? "today" : `in ${soonest.days}d`}
        </span>
      )}
    </div>
  )
}
