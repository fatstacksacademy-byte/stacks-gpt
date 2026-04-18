"use client"

// PHASE 2: real daily-round tracking (last claim timestamp on profile,
// action-points economy, streak counter). Today the button is a visual
// placeholder — no XP is awarded.

import { useLabels } from "../../../lib/stackhouse/useLabels"

export default function DailyRoundBanner() {
  const labels = useLabels()

  return (
    <div
      className="sh-daily-round"
      style={{
        marginTop: 22,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
      aria-label={labels.dailyQuest}
    >
      <div>
        <div className="sh-eyebrow" style={{ color: "var(--sh-amber)" }}>
          {labels.dailyQuest}
        </div>
        <div
          className="sh-numeric"
          style={{ fontSize: 17, fontWeight: 600, color: "var(--sh-text-primary)", marginTop: 3 }}
        >
          +10 XP · check in today
        </div>
      </div>
      <button
        disabled
        style={{
          padding: "9px 18px",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "var(--sh-font-mono)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "var(--sh-amber)",
          color: "#1a1816",
          border: "none",
          borderRadius: "var(--sh-radius)",
          cursor: "not-allowed",
          opacity: 0.75,
        }}
        title="Coming in the next release"
      >
        {labels.cta_collect_daily}
      </button>
    </div>
  )
}
