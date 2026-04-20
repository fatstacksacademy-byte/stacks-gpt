"use client"

/**
 * Unified list of every currently-started bonus across paycheck,
 * spending, and savings. Shown on the dashboard as the replacement for
 * the per-module summary grid — the user wants one place to see what's
 * active right now, not three.
 */

export type StartedBonus = {
  module: "paycheck" | "spending" | "savings"
  name: string
  amount: number                // expected or projected value
  started_date: string | null   // ISO yyyy-mm-dd
  nextStep?: string | null      // e.g. "Hit $2,000 spend" or "Hold for 60 more days"
  href: string
}

const MODULE_COLORS: Record<StartedBonus["module"], { fg: string; bg: string; label: string }> = {
  paycheck: { fg: "#2563eb", bg: "#eff6ff", label: "Paycheck" },
  spending: { fg: "#7c3aed", bg: "#ede9fe", label: "Spending" },
  savings: { fg: "#0d7c5f", bg: "#e6f5f0", label: "Savings" },
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const then = new Date(dateStr + "T00:00:00")
  return Math.floor((Date.now() - then.getTime()) / 86400000)
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

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>In progress</h2>
        <div style={{ fontSize: 11, color: "#888" }}>
          {bonuses.length} bonus{bonuses.length !== 1 ? "es" : ""} active
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bonuses.map((b, i) => {
          const color = MODULE_COLORS[b.module]
          const days = daysSince(b.started_date)
          return (
            <a
              key={i}
              href={b.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 12,
                padding: "14px 18px",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ccc")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e8e8e8")}
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
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {days != null && `Started ${days} day${days !== 1 ? "s" : ""} ago`}
                  {b.nextStep && <> · {b.nextStep}</>}
                </div>
              </div>
              <div style={{
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
    </div>
  )
}
