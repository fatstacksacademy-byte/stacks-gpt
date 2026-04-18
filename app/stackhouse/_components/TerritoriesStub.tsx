"use client"

// PHASE 2: compute real territory standing from completed_bonuses + cooldown
// math. Today this is a visual placeholder showing the layout.

import { useLabels } from "../../../lib/stackhouse/useLabels"

export default function TerritoriesStub() {
  const labels = useLabels()
  const rows: { bank: string; status: "good" | "neutral" | "warning" | "banned"; note: string }[] =
    [
      { bank: "Chase", status: "good", note: "Family — last job closed clean" },
      { bank: "Citi", status: "neutral", note: "No history yet" },
      { bank: "Bank of America", status: "warning", note: "Recent heat — cool off 30 days" },
    ]
  const statusLabel: Record<(typeof rows)[0]["status"], string> = {
    good: labels.status_good,
    neutral: labels.status_neutral,
    warning: labels.status_warning,
    banned: labels.status_banned,
  }
  const badgeClass: Record<(typeof rows)[0]["status"], string> = {
    good: "sh-badge-good",
    neutral: "sh-badge-neutral",
    warning: "sh-badge-warning",
    banned: "sh-badge-banned",
  }

  return (
    <section className="sh-card" aria-label={labels.territories}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div className="sh-eyebrow">{labels.territories}</div>
        <span style={{ fontSize: 10, color: "var(--sh-text-muted)" }}>preview</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div
            key={r.bank}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              borderBottom: "1px solid var(--sh-divider)",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--sh-text-primary)" }}>
                {r.bank}
              </div>
              <div style={{ fontSize: 11, color: "var(--sh-text-muted)", marginTop: 1 }}>
                {r.note}
              </div>
            </div>
            <span className={`sh-pill ${badgeClass[r.status]}`} style={{ flexShrink: 0 }}>
              {statusLabel[r.status]}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
