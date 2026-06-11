"use client"

import { useState } from "react"

type StateOption = {
  code: string
  name: string
  slug: string
}

export default function StateBonusFinder({
  states,
  currentSlug,
  compact = false,
}: {
  states: ReadonlyArray<StateOption>
  currentSlug?: string
  compact?: boolean
}) {
  const [selected, setSelected] = useState(currentSlug ?? "")

  function openState() {
    if (!selected) return
    window.location.href = `/bank-bonuses-by-state/${selected}`
  }

  return (
    <div style={{
      background: compact ? "#fff" : "linear-gradient(135deg, #edf9f4 0%, #fff 100%)",
      border: "1px solid #b7e4d2",
      borderRadius: 16,
      padding: compact ? 16 : 24,
    }}>
      {!compact && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Start here
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", marginBottom: 6 }}>
            Find bonuses available where you live
          </div>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.55, margin: "0 0 16px" }}>
            Choose your state. We&apos;ll mix nationwide offers with local and regional bonuses, then show ten at a time.
          </p>
        </>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
        <label style={{ flex: "1 1 260px", minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5 }}>
            Your state
          </span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "10px 12px",
              border: "1px solid #d8ddd9",
              borderRadius: 9,
              background: "#fff",
              color: "#111",
              fontSize: 14,
            }}
          >
            <option value="">Select your state</option>
            {states.map(state => (
              <option key={state.code} value={state.slug}>
                {state.name} ({state.code})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={openState}
          disabled={!selected}
          style={{
            alignSelf: "flex-end",
            minHeight: 44,
            padding: "10px 20px",
            border: 0,
            borderRadius: 9,
            background: selected ? "#0d7c5f" : "#b9c7c1",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          Show my bonuses →
        </button>
      </div>
    </div>
  )
}
