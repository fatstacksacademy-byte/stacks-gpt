"use client"

import { getActiveCombos, getComboTotal, type LinkedBonus } from "../../lib/linkedBonuses"

/**
 * Horizontal strip of "bundle combos" — banks where opening checking + savings
 * at the same time is both allowed and worth extra money. Surfaced on the hub
 * so users can see combos at a glance instead of learning them one at a time.
 */
export default function CombosStrip() {
  const combos = getActiveCombos()
  if (combos.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Bundle combos</div>
        <div style={{ fontSize: 11, color: "#888" }}>
          Open checking + savings together for extra earnings
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        {combos.map((combo, idx) => (
          <ComboCard
            key={idx}
            members={combo.members}
            comboUrl={combo.group.combo_url}
          />
        ))}
      </div>
    </div>
  )
}

function ComboCard({
  members,
  comboUrl,
}: {
  members: LinkedBonus[]
  comboUrl?: string
}) {
  const bank = members[0]?.entry.bank_name ?? "Bank"
  const total = getComboTotal(members)
  // Prefer the curated combo URL (e.g. Chase's combo-only landing page)
  // over the hub route when present, since the bonus math only applies
  // via that URL.
  const href = comboUrl
    ? comboUrl
    : members.find((m) => m.kind === "checking")
      ? "/stacksos/paycheck"
      : "/stacksos/savings"
  const external = Boolean(comboUrl)
  const hasOverride = members.some((m) => m.override_note)

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid #d9ece5",
        borderRadius: 10,
        padding: "12px 14px",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0d7c5f")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d9ece5")}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{bank}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0d7c5f" }}>
          ${total.toLocaleString()}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
        {members
          .map((m) => {
            const label = m.kind === "checking" ? "Checking" : "Savings"
            return `${label} $${m.effective_bonus_amount.toLocaleString()}`
          })
          .join(" + ")}
      </div>
      {hasOverride && (
        <div style={{ fontSize: 10, color: "#888", marginTop: 4, lineHeight: 1.4 }}>
          Combo pricing differs from the standalone offer — use the combo link.
        </div>
      )}
      <div style={{ fontSize: 11, color: "#0d7c5f", marginTop: 6, fontWeight: 600 }}>
        Start this combo →
      </div>
    </a>
  )
}
