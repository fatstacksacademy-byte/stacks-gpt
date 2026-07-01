"use client"

import { DK, moduleGradient } from "../../lib/stacksTheme"

/**
 * Staged / multi-payout bonus tracker (e.g. Four Leaf FCU: $350 on the first
 * $500 DD, then +$100 after 12 consecutive months of $500 DDs, then +$100 after
 * 24). Unlike a normal bonus that ends at "received," this one keeps the account
 * open and tracks monthly direct deposits over ~2 years toward the later
 * payouts. Presentation-only: the parent owns the data (banked-so-far derived
 * from the record's actual_amount; monthsLogged derived from logged deposits)
 * and the mutations.
 */

export type StagedPayout = { amount: number; label: string; months: number }

export default function StagedPayoutTracker({
  stages,
  totalBanked,
  monthsLogged,
  busy = false,
  onLogMonth,
  onClaim,
  onClose,
}: {
  stages: StagedPayout[]
  /** Total $ banked so far across stages (e.g. 350 → 450 → 550). */
  totalBanked: number
  /** Consecutive months with a qualifying $500+ DD logged. */
  monthsLogged: number
  busy?: boolean
  onLogMonth: () => void
  onClaim: (stageIndex: number) => void
  onClose: () => void
}) {
  const grad = moduleGradient("paycheck")
  // Cumulative $ threshold for each stage to count as "banked".
  let cum = 0
  const rows = stages.map((s, i) => {
    cum += s.amount
    const banked = totalBanked >= cum - 0.01
    // A monthly milestone is claimable once you've logged enough months and
    // haven't banked it yet. The $350 (months 0) is claimed via the normal flow.
    const claimable = !banked && s.months > 0 && monthsLogged >= s.months
    return { ...s, index: i, banked, claimable, cumulative: cum }
  })
  const total = stages.reduce((a, s) => a + s.amount, 0)
  const stage1Banked = rows[0]?.banked
  const allDone = totalBanked >= total - 0.01
  // The next monthly milestone still to reach (for the progress bar).
  const nextMilestone = rows.find(r => r.months > 0 && !r.banked)

  return (
    <div style={{ background: DK.panel2, border: `1px solid ${DK.border}`, borderRadius: 12, padding: "14px 16px", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: DK.textFaint }}>Payout schedule</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: DK.gold }}>${Math.round(totalBanked).toLocaleString()} / ${total.toLocaleString()} banked</span>
      </div>

      {/* Stage rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.index} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: r.banked ? "none" : `2px solid ${r.claimable ? DK.gold : DK.border2}`,
              background: r.banked ? DK.green : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {r.banked && (
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: r.banked ? DK.textFaint : DK.text }}>+${r.amount}</span>
                <span style={{ fontSize: 12, color: r.banked ? DK.textFaint : DK.textMute, textDecoration: r.banked ? "line-through" : "none" }}>{r.label}</span>
              </div>
              {r.claimable && (
                <button onClick={() => onClaim(r.index)} disabled={busy}
                  style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#1a1204", background: `linear-gradient(135deg, ${DK.gold}, ${DK.goldDeep})`, border: "none", borderRadius: 8, padding: "7px 13px", cursor: busy ? "wait" : "pointer" }}>
                  {busy ? "…" : `💰 Claim +$${r.amount}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Keep-open, monthly-DD section — only after the first payout lands and
          while there are still monthly milestones left. */}
      {stage1Banked && !allDone && nextMilestone && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DK.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: DK.textDim }}>Keep it open · log a $500 DD each month</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: DK.accentFg }}>{Math.min(monthsLogged, nextMilestone.months)} / {nextMilestone.months} months</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: DK.panel, border: `1px solid ${DK.border}`, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${Math.min(100, Math.round((monthsLogged / nextMilestone.months) * 100))}%`, borderRadius: 99, background: grad, transition: "width .5s ease" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={onLogMonth} disabled={busy}
              style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: grad, border: "none", borderRadius: 9, padding: "9px 15px", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "…" : "＋ Log this month's $500 DD"}
            </button>
            <button onClick={onClose} disabled={busy}
              title="Close the account now — you keep what's banked but forfeit the remaining payouts"
              style={{ fontSize: 12.5, fontWeight: 600, color: DK.textMute, background: "none", border: `1px solid ${DK.border2}`, borderRadius: 9, padding: "9px 14px", cursor: "pointer" }}>
              Close &amp; stop
            </button>
          </div>
          <div style={{ fontSize: 11, color: DK.amber, marginTop: 8, lineHeight: 1.5 }}>
            ⚠ Miss a month and both remaining $100 payouts are forfeited — a monthly reminder will keep you on track.
          </div>
        </div>
      )}

      {allDone && (
        <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: DK.greenFg }}>
          🎉 All ${total.toLocaleString()} banked — safe to close &amp; withdraw.
        </div>
      )}
    </div>
  )
}
