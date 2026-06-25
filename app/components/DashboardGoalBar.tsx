"use client"

/**
 * Slim 3-number summary that sits above the dashboard view tabs.
 * Replaces the giant "Projected 12 Month Stack" hero — the projection
 * itself moves behind a tab; this bar keeps the numbers glanceable.
 */
export default function DashboardGoalBar({
  projection36mo,
  inProgress,
  lifetimeEarned,
}: {
  projection36mo: number
  inProgress: number
  lifetimeEarned: number
}) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0d7c5f 0%, #0a5c47 100%)",
        borderRadius: 12,
        padding: "16px 22px",
        color: "#fff",
        marginBottom: 14,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "stretch",
        boxShadow: "0 3px 14px rgba(13, 124, 95, 0.16)",
      }}
      className="goal-bar"
    >
      <Stat label="Stack potential · 3 yr" value={projection36mo} emphasis />
      <Divider />
      <Stat label="In progress" value={inProgress} />
      <Divider />
      <Stat label="Lifetime earned" value={lifetimeEarned} />
      <style>{`
        @media (max-width: 520px) {
          .goal-bar { padding: 14px 16px !important; gap: 8px !important; }
          .goal-bar .goal-divider { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function Stat({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.75 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: emphasis ? 26 : 20,
          fontWeight: 800,
          marginTop: 2,
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div
      className="goal-divider"
      style={{ width: 1, background: "rgba(255,255,255,0.18)", alignSelf: "stretch" }}
    />
  )
}
