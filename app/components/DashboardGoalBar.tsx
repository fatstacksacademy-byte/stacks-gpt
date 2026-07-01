"use client"

import InfoTip from "./InfoTip"
import type { GlossaryKey } from "../../lib/glossary"

/**
 * Dashboard hero stat strip — the 3-number summary that sits under the
 * FatStackMeter and above the view tabs.
 *
 * Styled to MATCH the dark 3-up stat cards the module sections (Paycheck /
 * Savings / Spending) render under their own FatStackMeter, so the dashboard's
 * hero reads as the same card treatment across the whole app. The stats stay
 * dashboard-specific (the 3-yr Stack potential projection lives here — the
 * sections point back to the Dashboard for it), but the shell is identical:
 * dark panels, hairline borders, gold/blue value colors.
 */

// Mirrors the RoadmapClient "DK" tokens the section stat cards use so the two
// heros are pixel-consistent.
const C = {
  panel: "#161922",
  border: "#23262e",
  text: "#ffffff",
  textFaint: "#6b7280",
  accentFg: "#60a5fa", // blue — "in progress"
  greenFg: "#34d399",  // green — the marquee projection
  gold: "#f7d774",     // gold — "lifetime earned"
}

export default function DashboardGoalBar({
  projection36mo,
  inProgress,
  lifetimeEarned,
  potentialLocked = false,
}: {
  projection36mo: number
  inProgress: number
  lifetimeEarned: number
  /** Free tier: the 3-yr "Stack potential" is a Pro projection — show it locked,
   *  not the dollar figure (the underlying sequenced bonuses are Pro-only). */
  potentialLocked?: boolean
}) {
  return (
    <>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}
        className="goal-bar"
      >
        <StatCard
          label="Stack potential"
          value={projection36mo}
          color={C.greenFg}
          locked={potentialLocked}
          tipTerm="stackPotential"
          sub="3-year projection"
        />
        <StatCard label="In progress" value={inProgress} color={C.accentFg} />
        <StatCard label="Lifetime earned" value={lifetimeEarned} color={C.gold} />
      </div>
      {/* Keep the three stat cards on ONE row on phones (they used to wrap 2+1,
          which read as broken). Compact the padding/type so they fit cleanly. */}
      <style>{`
        @media (max-width: 480px) {
          .goal-bar { gap: 6px; }
          .goal-bar .sdb-card { padding: 10px 10px !important; }
          .goal-bar .sdb-label { font-size: 9.5px !important; letter-spacing: 0.03em !important; }
          .goal-bar .sdb-val { font-size: 16px !important; }
          .goal-bar .sdb-sub { display: none !important; }
        }
      `}</style>
    </>
  )
}

function StatCard({
  label,
  value,
  color,
  locked = false,
  tipTerm,
  sub,
}: {
  label: string
  value: number
  color: string
  locked?: boolean
  tipTerm?: GlossaryKey
  sub?: string
}) {
  return (
    <div
      className="sdb-card"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      <div
        className="sdb-label"
        style={{
          fontSize: 11,
          color: C.textFaint,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
        }}
      >
        {label}
        {tipTerm ? <InfoTip term={tipTerm} size={12} /> : null}
      </div>
      <div className="sdb-val" style={{ fontSize: 22, fontWeight: 800, color: locked ? C.text : color, marginTop: 2, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
        {locked ? (
          <span style={{ fontSize: 18 }}>🔒 Pro</span>
        ) : (
          `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        )}
      </div>
      {sub ? <div className="sdb-sub" style={{ fontSize: 11, color: C.textFaint, marginTop: 3 }}>{sub}</div> : null}
    </div>
  )
}
