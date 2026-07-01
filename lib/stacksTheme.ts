/**
 * Stacks OS — shared "mission board" theme tokens.
 *
 * Single source of truth for the dark, game-like aesthetic defined by the
 * card-preview north-star (app/card-preview/page.tsx) and shipped in the
 * Paycheck / Savings / Spending tabs. Before this module the palette was
 * copy-pasted inline in RoadmapClient, SavingsClient, SpendingClient,
 * CheckpointNav and DashboardGoalBar — which is exactly why the Dashboard
 * drifted back to the old light theme. Import from here so every surface
 * stays pixel-consistent and future colour tweaks happen in one place.
 */

// ── Dark board palette ────────────────────────────────────────────────────
export const DK = {
  board: "#0a0c10", // page background
  panel: "#161922", // raised card surface
  panel2: "#0f1219", // inset surface (inputs, sub-panels)
  panel3: "#12151c", // alt row
  border: "#23262e", // hairline
  border2: "#2a2e38", // stronger hairline / input border
  text: "#ffffff",
  textDim: "#cdd2db", // primary body
  textMute: "#9aa1ad", // secondary
  textFaint: "#6b7280", // labels / captions
  accent: "#3b82f6", // paycheck blue (from)
  accent2: "#2563eb", // paycheck blue (to)
  accentFg: "#60a5fa", // blue text on dark
  accentGlow: "rgba(37,99,235,0.45)",
  green: "#0d9668",
  greenFg: "#34d399",
  gold: "#f7d774",
  goldDeep: "#d4a017",
  amber: "#f59e0b",
  amberBg: "#1c160a",
  amberBorder: "#4a3a16",
  red: "#f87171",
  redBg: "rgba(220,38,38,0.12)",
  redBorder: "#7f1d1d",
} as const

export type ModuleKey = "paycheck" | "spending" | "savings"

/**
 * Per-module accent. `from`/`to` build the gradient pill + progress fill; `fg`
 * is the accent text/border colour that reads on the dark board; `soft` is a
 * translucent tint for chip backgrounds (replaces the old light `#eff6ff`
 * pastels that only worked on white).
 */
export const MODULE: Record<
  ModuleKey,
  { label: string; from: string; to: string; fg: string; soft: string; glow: string }
> = {
  paycheck: { label: "Paycheck", from: "#3b82f6", to: "#2563eb", fg: "#60a5fa", soft: "rgba(37,99,235,0.16)", glow: "rgba(37,99,235,0.45)" },
  spending: { label: "Spending", from: "#7c3aed", to: "#6d28d9", fg: "#a78bfa", soft: "rgba(124,58,237,0.16)", glow: "rgba(124,58,237,0.45)" },
  savings: { label: "Savings", from: "#0d9668", to: "#0b7a55", fg: "#34d399", soft: "rgba(13,150,104,0.16)", glow: "rgba(13,150,104,0.45)" },
}

/**
 * Urgency styling for the dark board — the mission-board equivalent of the old
 * light `URGENCY_STYLE`. `border` is the card's left rail; `chipBg`/`chipFg`
 * the pill. Amber = due ≤14d, red = overdue, matching the north-star deadline
 * treatment ("⏱ 12d left" turns amber).
 */
export const URGENCY_DK: Record<
  "overdue" | "urgent" | "soon" | "none",
  { border: string; chipBg: string; chipFg: string; chipLabel: string | null }
> = {
  overdue: { border: DK.red, chipBg: DK.redBg, chipFg: DK.red, chipLabel: "Overdue" },
  urgent: { border: DK.amber, chipBg: DK.amberBg, chipFg: DK.amber, chipLabel: "Urgent" },
  soon: { border: DK.border2, chipBg: DK.panel2, chipFg: DK.textMute, chipLabel: "Soon" },
  none: { border: DK.border, chipBg: DK.panel2, chipFg: DK.textMute, chipLabel: null },
}

/** Convenience: the module gradient as a ready CSS value. */
export function moduleGradient(m: ModuleKey, deg = 135): string {
  const { from, to } = MODULE[m]
  return `linear-gradient(${deg}deg, ${from}, ${to})`
}
