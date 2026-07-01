"use client"

import { freshnessTier, type VerificationState } from "../../lib/verificationState"

// Neutral, low-key palette. We no longer shout "Verified"/"Needs review" —
// the badge is just a factual "last verified on <date>" stamp. The dot color
// is a subtle recency cue (green = recent, amber = getting old, grey = old or
// not yet checked); the wording stays the same regardless of tier.
//
// Dark "mission board" palette — every surface that mounts this badge
// (Paycheck, Spending, Savings) is now the dark reskin, so it sits on a
// dark inset instead of a white pill.
const PALETTE = {
  fresh: { dot: "#34d399", bg: "#12151c", fg: "#9aa1ad", border: "#23262e" },
  stale: { dot: "#f59e0b", bg: "#12151c", fg: "#9aa1ad", border: "#23262e" },
  warn:  { dot: "#6b7280", bg: "#12151c", fg: "#9aa1ad", border: "#23262e" },
} as const

function fmtVerifiedDate(verifiedAt: string): string {
  const d = new Date(verifiedAt)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function labelFor(state: VerificationState | undefined): string {
  if (!state) return "Not yet verified"
  return `Last verified ${fmtVerifiedDate(state.verified_at)}`
}

function tooltipFor(state: VerificationState | undefined): string {
  if (!state) {
    return "This offer hasn't been auto-verified yet. The weekly Stacks OS verifier will check it on the next run."
  }
  const src = state.verification_source === "bank_page" ? "the bank's offer page" : state.verification_source
  const when = new Date(state.verified_at).toLocaleString()
  const conf = state.confidence
  const mm = state.mismatch_count
  const base = `Auto-checked against ${src} on ${when}.`
  if (conf === "high") return `${base} Every field matched the stored values.`
  if (conf === "medium") return `${base} ${mm} field${mm === 1 ? "" : "s"} didn't match — usually regex drift, being reviewed.`
  return `${base} Page signal: ${state.page_signal ?? "unknown"}. Offer may be dead, moved, or blocked from automated checks.`
}

export default function VerifiedBadge({
  state,
  compact = false,
}: {
  state: VerificationState | undefined
  compact?: boolean
}) {
  const tier = freshnessTier(state)
  const p = PALETTE[tier]
  const label = labelFor(state)

  return (
    <span
      title={tooltipFor(state)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        padding: compact ? "2px 6px" : "3px 8px",
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.border}`,
        borderRadius: 999,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: p.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  )
}
