"use client"

import { DK, MODULE } from "../../lib/stacksTheme"

export type DashboardView = "active" | "projection" | "history"

/**
 * Three-way segmented control swapping the dashboard's main panel between
 * the active to-do, the 12-month projection breakdown, and historical wins.
 */
export default function DashboardViewTabs({
  view,
  onChange,
  counts,
}: {
  view: DashboardView
  onChange: (v: DashboardView) => void
  counts: { active: number; history: number }
}) {
  const tabs: { id: DashboardView; label: string; badge?: number }[] = [
    { id: "active", label: "Next actions", badge: counts.active },
    { id: "projection", label: "Projection" },
    { id: "history", label: "History", badge: counts.history },
  ]
  return (
    <div
      style={{
        display: "inline-flex",
        background: DK.panel2,
        border: `1px solid ${DK.border}`,
        borderRadius: 10,
        padding: 3,
        marginBottom: 16,
        gap: 2,
      }}
    >
      {tabs.map(t => {
        const active = view === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              border: "none",
              background: active ? DK.panel : "transparent",
              color: active ? DK.text : DK.textMute,
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              padding: "7px 14px",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.35)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s",
            }}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: active ? MODULE.savings.soft : DK.board,
                  color: active ? DK.greenFg : DK.textMute,
                  borderRadius: 99,
                  padding: "1px 7px",
                  minWidth: 14,
                  textAlign: "center",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
