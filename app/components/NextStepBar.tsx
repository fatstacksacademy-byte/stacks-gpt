"use client"

/**
 * NextStepBar — the "one clear objective + XP bar + one action" face from the
 * card-preview north-star prototype (ActiveFace). Instead of a wall of
 * checkboxes, the user sees exactly ONE next step and a shimmering progress
 * bar filling toward the payout. The full milestone detail lives below/behind
 * this — this is the at-a-glance "what do I do next" banner.
 */
export default function NextStepBar({
  objective,
  pct,
  actionLabel,
  onAction,
  daysLeft,
  deadlineLabel,
  accentFrom = "#1e7a52",
  accentTo = "#3fae74",
  glow = "rgba(52,211,153,0.5)",
}: {
  objective: string
  pct: number
  actionLabel?: string | null
  onAction?: () => void
  daysLeft?: number | null
  deadlineLabel?: string | null
  accentFrom?: string
  accentTo?: string
  glow?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const ready = clamped >= 100
  const urgent = daysLeft != null && daysLeft <= 14 && daysLeft > 0
  const cashNear = clamped >= 70

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e6e8ec" }}>🎯 {objective}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", flexShrink: 0 }}>{clamped}%</span>
      </div>

      {/* XP bar filling toward a fat stack of cash at the finish line */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 14, borderRadius: 99, background: "#0c0e13", border: "1px solid #23262e", overflow: "hidden", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${clamped}%`,
              background: ready ? "linear-gradient(90deg,#1e7a52,#f7d774)" : `linear-gradient(90deg, ${accentFrom}, ${accentTo})`,
              borderRadius: 99,
              boxShadow: `0 0 14px ${glow}`,
              transition: "width .6s cubic-bezier(.2,.7,.2,1)",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, height: "100%", width: "22%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", animation: "goalShimmer 2.2s linear infinite" }} />
          </div>
        </div>
        {/* the payout emoji lights up as you close in */}
        <div
          title="The payout"
          style={{
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            background: cashNear ? "linear-gradient(135deg,#f7d774,#d4a017)" : "#1a1d24",
            border: cashNear ? "1px solid #f7d774" : "1px solid #2a2e38",
            filter: cashNear ? "none" : "grayscale(0.7) brightness(0.85)",
            boxShadow: ready ? "0 0 16px rgba(247,215,116,0.9)" : cashNear ? "0 0 10px rgba(247,215,116,0.5)" : "none",
          }}
        >
          💵
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 10 }}>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              background: ready ? "linear-gradient(135deg,#f7d774,#d4a017)" : `linear-gradient(135deg, ${accentFrom}, ${accentTo})`,
              border: "none",
              borderRadius: 9,
              padding: "8px 14px",
              cursor: "pointer",
              boxShadow: `0 4px 14px ${glow}`,
            }}
          >
            {actionLabel}
          </button>
        ) : <span />}
        {daysLeft != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? "#f59e0b" : "#7b8290", flexShrink: 0 }}>
            ⏱ {daysLeft > 0 ? `${daysLeft}d left` : "hold complete"}{deadlineLabel ? ` · ${deadlineLabel}` : ""}
          </span>
        )}
      </div>
    </div>
  )
}
