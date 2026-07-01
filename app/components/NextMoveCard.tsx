"use client"

import { DK, MODULE, moduleGradient, type ModuleKey } from "../../lib/stacksTheme"

/**
 * NextMoveCard — the "spine" of Stacks OS. The whole app exists to answer ONE
 * question: what is my single most profitable move right now, and what do I tap?
 * This card renders that answer front-and-center so the user never has to hunt
 * through tabs to know what to do next.
 *
 * It's presentation-only: the parent computes the single highest-priority move
 * (most-urgent in-progress step, or "start your first bonus" when empty) and
 * passes it in. Null renders nothing.
 */

export type NextMove = {
  module: ModuleKey
  /** Bank / card / institution name. */
  title: string
  /** The one action, e.g. "Set up your recurring direct deposit". */
  action: string
  /** Reward on the line, if known. */
  amount?: number | null
  /** ISO yyyy-mm-dd of the next deadline, if any. */
  deadline?: string | null
  daysLeft?: number | null
  urgency?: "overdue" | "urgent" | "soon" | "none"
  href: string
  /** Button label, e.g. "Continue →" or "Start →". */
  cta: string
  /** Optional dim context line under the action. */
  sub?: string | null
}

function fmtDeadline(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function NextMoveCard({ move }: { move: NextMove | null }) {
  if (!move) return null
  const m = MODULE[move.module]
  const urgent = move.urgency === "urgent" || move.urgency === "overdue"
  const deadlineLabel = fmtDeadline(move.deadline)
  const daysLeft = move.daysLeft

  return (
    <a
      href={move.href}
      className="next-move-card"
      style={{
        display: "block",
        position: "relative",
        textDecoration: "none",
        background: `radial-gradient(150% 130% at 0% 0%, ${m.soft}, ${DK.panel})`,
        border: `1px solid ${m.fg}55`,
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 14,
        overflow: "hidden",
        boxShadow: `0 8px 26px rgba(0,0,0,0.35), 0 0 0 1px ${m.fg}18`,
      }}
    >
      {/* module accent rail */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: moduleGradient(move.module) }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8, paddingLeft: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: m.fg }}>
          ◆ Your next move
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: moduleGradient(move.module), padding: "3px 9px", borderRadius: 99 }}>
          {m.label}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, paddingLeft: 6 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: DK.text, lineHeight: 1.25 }}>
            {move.action}
          </div>
          <div style={{ fontSize: 13, color: DK.textMute, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: DK.textDim }}>{move.title}</span>
            {deadlineLabel && (
              <span style={{ color: urgent ? DK.amber : DK.textMute, fontWeight: urgent ? 700 : 400 }}>
                · ⏱ {daysLeft != null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "due today" : `${daysLeft}d left`) : `by ${deadlineLabel}`}
                {daysLeft != null && daysLeft > 0 ? ` · by ${deadlineLabel}` : ""}
              </span>
            )}
          </div>
          {move.sub && <div style={{ fontSize: 12, color: DK.textFaint, marginTop: 4 }}>{move.sub}</div>}
        </div>
        {move.amount != null && move.amount > 0 && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: DK.textFaint }}>Reward</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: DK.gold, lineHeight: 1 }}>${Math.round(move.amount).toLocaleString()}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, paddingLeft: 6 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 800,
            color: "#fff",
            background: moduleGradient(move.module),
            padding: "10px 20px",
            borderRadius: 11,
            boxShadow: `0 5px 16px ${m.glow}`,
          }}
        >
          {move.cta}
        </span>
      </div>
    </a>
  )
}
