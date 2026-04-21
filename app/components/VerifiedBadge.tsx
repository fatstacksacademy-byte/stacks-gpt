"use client"

import { formatFreshness, freshnessTier, type VerificationState } from "../../lib/verificationState"

const PALETTE = {
  fresh: { dot: "#10b981", bg: "#ecfdf5", fg: "#065f46", border: "#a7f3d0" },
  stale: { dot: "#f59e0b", bg: "#fffbeb", fg: "#92400e", border: "#fde68a" },
  warn:  { dot: "#ef4444", bg: "#fef2f2", fg: "#991b1b", border: "#fecaca" },
} as const

function labelFor(state: VerificationState | undefined): string {
  if (!state) return "Unverified"
  if (state.confidence === "low") return `Needs review · ${formatFreshness(state.verified_at)}`
  return `Verified ${formatFreshness(state.verified_at)}`
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
