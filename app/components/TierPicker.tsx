"use client"

import { DK } from "../../lib/stacksTheme"
import InfoTip from "./InfoTip"

/**
 * Presentational tier chooser — a labeled row of pill buttons. Backing store is
 * the caller's concern (checking bonuses persist the pick as a localStorage
 * term override; savings entries write it to the DB row), so this component
 * only knows about display strings + which one is selected. Renders nothing
 * when there's fewer than two options (no real choice to make).
 */

export type TierOption = {
  key: string | number
  /** The headline for the pill, e.g. "$300". */
  primary: string
  /** The qualifier, e.g. "$5,000 DD" or "$20k deposit". */
  secondary?: string
  selected: boolean
}

export default function TierPicker({
  options,
  accent,
  onSelect,
  label = "Choose your tier — pick your target",
  footnote,
}: {
  options: TierOption[]
  accent: string
  onSelect: (key: string | number) => void
  label?: string
  /** Optional line under the pills, e.g. "Requires an Advantage Plus account". */
  footnote?: React.ReactNode
}) {
  if (options.length < 2) return null
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: DK.textMute, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
        {label} <InfoTip term="tier" label="bonus tiers" />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onSelect(o.key)}
            style={{
              fontSize: 11.5, padding: "6px 11px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
              border: o.selected ? `1.5px solid ${accent}` : `1px solid ${DK.border2}`,
              color: o.selected ? DK.accentFg : DK.textDim,
              fontWeight: o.selected ? 700 : 500,
              background: o.selected ? "rgba(37,99,235,0.12)" : DK.panel2,
            }}
          >
            {o.selected ? "✓ " : ""}{o.primary}{o.secondary ? ` · ${o.secondary}` : ""}
          </button>
        ))}
      </div>
      {footnote && (
        <div style={{ fontSize: 11.5, color: DK.textMute, marginTop: 6 }}>{footnote}</div>
      )}
    </div>
  )
}
