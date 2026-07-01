"use client"

import { DK, MODULE } from "../../lib/stacksTheme"

/**
 * Completed-bonus list shown under the "History" dashboard tab.
 * Unified across all four sources (checking, custom, spending cards,
 * savings entries) and sorted newest-first by completion date.
 */

export type HistoricalWin = {
  module: "paycheck" | "spending" | "savings"
  name: string
  amount: number
  date: string | null   // ISO yyyy-mm-dd, completion date
  href: string
}

const MODULE_COLORS: Record<HistoricalWin["module"], { fg: string; bg: string; label: string }> = {
  paycheck: { fg: MODULE.paycheck.fg, bg: MODULE.paycheck.soft, label: "Paycheck" },
  spending: { fg: MODULE.spending.fg, bg: MODULE.spending.soft, label: "Spending" },
  savings: { fg: MODULE.savings.fg, bg: MODULE.savings.soft, label: "Savings" },
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function HistoricalWinsList({ wins }: { wins: HistoricalWin[] }) {
  if (wins.length === 0) {
    return (
      <div
        style={{
          background: DK.panel,
          border: `1px dashed ${DK.border2}`,
          borderRadius: 12,
          padding: "32px 24px",
          textAlign: "center",
          color: DK.textMute,
          fontSize: 13,
        }}
      >
        No completed bonuses yet. Finish one and it&apos;ll show up here.
      </div>
    )
  }

  const total = Math.round(wins.reduce((s, w) => s + w.amount, 0))

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: DK.text, margin: 0 }}>Completed wins</h2>
        <div style={{ fontSize: 11, color: DK.textMute }}>
          {wins.length} win{wins.length !== 1 ? "s" : ""} · ${total.toLocaleString()}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {wins.map((w, i) => {
          const color = MODULE_COLORS[w.module]
          return (
            <a
              key={i}
              href={w.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: DK.panel,
                border: `1px solid ${DK.border}`,
                borderRadius: 12,
                padding: "14px 18px",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = DK.border2)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = DK.border)}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: color.fg,
                  background: color.bg,
                  padding: "3px 9px",
                  borderRadius: 99,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}
              >
                {color.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: DK.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {w.name}
                </div>
                <div style={{ fontSize: 11, color: DK.textMute, marginTop: 2 }}>
                  Completed {fmtDate(w.date)}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: DK.gold, flexShrink: 0 }}>
                ${Math.round(w.amount).toLocaleString()}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
