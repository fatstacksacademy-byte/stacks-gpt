"use client"

// PHASE 2: wire tier computation + active modifiers per card. Today this is
// a visual placeholder showing the layout shape ("Front / Stash / Lab / Rep")
// with tier stubbed at the user's rank and no real modifiers attached.

import { useLabels } from "../../../lib/stackhouse/useLabels"

export default function OperationLoadoutStub() {
  const labels = useLabels()
  const cards: { key: string; title: string; sublabel: string; tier: string; accent?: boolean }[] = [
    { key: "front", title: labels.paycheck, sublabel: "Income routing", tier: "Tier II" },
    { key: "stash", title: labels.savings, sublabel: "Cash on hand", tier: "Tier I" },
    { key: "lab", title: labels.spending, sublabel: "Equipment", tier: "Tier III", accent: true },
    { key: "rep", title: labels.creditScore, sublabel: "Standing", tier: "Tier II" },
  ]

  return (
    <section style={{ marginTop: 22 }} aria-label={labels.operation}>
      <div className="sh-eyebrow" style={{ marginBottom: 10 }}>
        {labels.operation}
      </div>
      <div
        className="sh-four-col"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.key}
            className="sh-card"
            style={{
              padding: "14px 16px",
              borderColor: c.accent ? "var(--sh-amber)" : "var(--sh-divider)",
              borderWidth: c.accent ? "1.5px" : "1px",
              borderStyle: "solid",
            }}
          >
            <div className="sh-eyebrow" style={{ fontSize: 10 }}>
              {c.title}
            </div>
            <div
              className="sh-numeric"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--sh-text-primary)",
                marginTop: 4,
              }}
            >
              {c.tier}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--sh-text-muted)",
                marginTop: 2,
              }}
            >
              {c.sublabel}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span className="sh-pill">◆ No {labels.modifier.toLowerCase()}s</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "var(--sh-text-muted)", marginTop: 8 }}>
        Loadout tiers and modifiers go live in the next release.
      </div>
    </section>
  )
}
