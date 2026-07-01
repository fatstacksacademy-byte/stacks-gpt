"use client"

import { DK } from "../../lib/stacksTheme"
import type { QueueSnapshot } from "../../lib/queueSnapshots"

/**
 * The Pro "your plan got smarter" card. Stacks re-sequences a user's queue every
 * time the catalog improves or they finish a bonus — but that value was
 * invisible because the queue is recomputed fresh each load. Backed by
 * queue_snapshots (one row/month), this shows the 3-year projection climbing
 * over time, which is the concrete thing a Pro subscription buys.
 */

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

export default function QueueTrendCard({
  snapshots,
  current,
}: {
  snapshots: QueueSnapshot[]
  /** Live portfolio_36mo — reflected as the freshest point so the trend is current. */
  current: number
}) {
  const series = snapshots.map((s) => ({ label: s.captured_at, value: s.portfolio_36mo }))
  if (series.length && current > 0) series[series.length - 1] = { ...series[series.length - 1], value: current }

  // Not enough history yet — set the expectation instead of hiding the feature.
  if (series.length < 2) {
    return (
      <div style={{ background: DK.panel, border: `1px solid ${DK.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: DK.gold }}>
          ◆ Your plan, over time
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: DK.text, marginTop: 8 }}>
          We just started tracking your plan&apos;s value.
        </div>
        <div style={{ fontSize: 13, color: DK.textMute, marginTop: 4, lineHeight: 1.5 }}>
          Each month, Stacks re-sequences your queue onto the most profitable offers. Check back to
          watch your 3-year projection climb as better bonuses appear and you bank the ones you&apos;re on.
        </div>
      </div>
    )
  }

  const first = series[0]
  const last = series[series.length - 1]
  const delta = last.value - first.value
  const up = delta >= 0
  const max = Math.max(...series.map((p) => p.value))
  const min = Math.min(...series.map((p) => p.value))
  const span = Math.max(1, max - min)
  const hashesDiffer =
    snapshots.length > 1 && snapshots[0].profile_hash != null &&
    snapshots[0].profile_hash !== snapshots[snapshots.length - 1].profile_hash

  return (
    <div style={{ background: DK.panel, border: `1px solid ${DK.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: DK.gold }}>
        ◆ Your plan, over time
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: up ? DK.greenFg : DK.textDim, lineHeight: 1 }}>
          {up ? "+" : "−"}${Math.abs(delta).toLocaleString()}
        </span>
        <span style={{ fontSize: 13, color: DK.textMute }}>since {fmtMonth(first.label)}</span>
      </div>
      <div style={{ fontSize: 13, color: DK.textMute, marginTop: 6, lineHeight: 1.5 }}>
        {up
          ? "That's what re-sequencing your queue onto better offers has added to your 3-year plan."
          : "Your projection shifted as offers changed — we keep it on the most profitable path available."}
        {hashesDiffer && <span style={{ color: DK.textFaint }}> · includes changes you made to your profile.</span>}
      </div>

      {/* mini sparkline of the 3-year projection each month */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 54, marginTop: 14 }}>
        {series.map((p, i) => {
          const h = 14 + Math.round(((p.value - min) / span) * 36)
          const isLast = i === series.length - 1
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
              <div
                title={`${fmtMonth(p.label)}: $${p.value.toLocaleString()}`}
                style={{
                  width: "100%", maxWidth: 34, height: h, borderRadius: 4,
                  background: isLast ? `linear-gradient(180deg, ${DK.gold}, ${DK.goldDeep})` : DK.border2,
                }}
              />
              <span style={{ fontSize: 9, color: DK.textFaint, whiteSpace: "nowrap" }}>
                {new Date(p.label + "T00:00:00").toLocaleDateString(undefined, { month: "short" })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
