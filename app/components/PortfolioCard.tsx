"use client"

import { useState } from "react"

export type BreakdownItem = {
  label: string
  amount: number
  /** Optional dim suffix, e.g. "~52% APY" for the spending effective-yield. */
  note?: string
}

type Breakdown = {
  label: string
  amount: number
  href: string
  /** Top items making up this number — shown when the user expands the breakdown row. */
  items?: BreakdownItem[]
  /** Optional dim suffix next to the module total, e.g. a blended effective APY. */
  note?: string
}

/**
 * 12-month projection breakdown — shown when the user toggles the
 * "Projection" tab on the dashboard. Lifetime/in-progress numbers live
 * in DashboardGoalBar now, so this card focuses on per-module breakdown.
 */
export default function PortfolioCard({
  total,
  breakdown,
}: {
  total: number
  breakdown: Breakdown[]
}) {
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null)

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0d7c5f 0%, #0a5c47 100%)",
        borderRadius: 14,
        padding: "24px 28px",
        color: "#fff",
        marginBottom: 24,
        boxShadow: "0 4px 18px rgba(13, 124, 95, 0.18)",
      }}
      className="portfolio-card"
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.75 }}>
        12-Month Projection
      </div>
      <div
        className="portfolio-total"
        style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 4 }}
      >
        ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>

      {breakdown.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          {breakdown.map(b => {
            const isExpanded = expandedLabel === b.label
            const hasItems = (b.items?.length ?? 0) > 0
            return (
              <div key={b.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <a
                    href={b.href}
                    style={{
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      opacity: 0.85,
                      minWidth: 90,
                      borderBottom: "1px dotted rgba(255,255,255,0.35)",
                    }}
                  >
                    {b.label}
                  </a>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>
                    ${b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  {b.note && (
                    <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>· {b.note}</span>
                  )}
                  {hasItems && (
                    <button
                      onClick={() => setExpandedLabel(isExpanded ? null : b.label)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.75)",
                        fontSize: 11,
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                      }}
                    >
                      {isExpanded ? "Hide breakdown ↑" : "Show breakdown →"}
                    </button>
                  )}
                </div>
                {isExpanded && hasItems && (
                  <div className="pc-breakdown" style={{ marginTop: 6, marginLeft: 100, display: "flex", flexDirection: "column", gap: 3 }}>
                    {b.items!.slice(0, 5).map((it, i) => (
                      <div
                        key={i}
                        style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85, gap: 10 }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.label}
                        </span>
                        <span style={{ fontWeight: 600, flexShrink: 0, textAlign: "right" }}>
                          ${it.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          {it.note && (
                            <span style={{ display: "block", fontWeight: 400, fontSize: 11, opacity: 0.7 }}>
                              {it.note}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {(b.items!.length > 5) && (
                      <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                        + {b.items!.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 520px) {
          .portfolio-card { padding: 20px 20px !important; border-radius: 12px !important; }
          .portfolio-total { font-size: 32px !important; }
          .pc-breakdown { margin-left: 0 !important; padding-left: 14px; border-left: 2px solid rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  )
}
