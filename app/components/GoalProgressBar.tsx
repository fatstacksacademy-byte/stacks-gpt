"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Gamified "building your plan" progress bar — shared across the Paycheck,
 * Spending, and Savings trackers so all three modules feel consistent.
 *
 * The treatment (ported from the card-preview prototype, re-themed for the
 * app's light surfaces):
 *  - rounded gradient fill that scales toward the goal
 *  - a light shimmer sweep CLIPPED to the filled region (so it never spills
 *    past the colored part and scales with progress)
 *  - a cash-stack "finish line" 💵 that wakes up at 70% and glows/pulses at 100%
 *  - a gold meter flash + a floating "+$amount" coin bubble each time the
 *    tracked total ticks UP (i.e. a deposit / purchase is logged)
 *  - a "% there / $ to go" read-out
 *
 * Pure presentation: pass the running total and the target; the celebratory
 * feedback fires automatically when `current` increases between renders.
 * Keyframes live in app/globals.css (goalShimmer / goalMeterFlash /
 * goalFloatUp / goalPulse).
 */
export default function GoalProgressBar({
  current,
  target,
  accent = "#2563eb",
  unit = "$",
  label = "to the stack",
  dark = false,
}: {
  current: number
  target: number
  /** Fill / accent color while in progress (turns green at 100%). */
  accent?: string
  /** "$" prepends a dollar sign on the remaining read-out; "" for counts. */
  unit?: "$" | ""
  /** Trailing word on the progress caption, e.g. "to the stack" / "of spend". */
  label?: string
  /** Dark-theme surfaces: use an inset dark track instead of the light one. */
  dark?: boolean
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const remaining = Math.max(0, target - current)
  const done = pct >= 100
  const near = pct >= 70
  const fill = done ? "#0d7c5f" : accent

  // Celebrate only on genuine upward ticks — not on the initial mount or the
  // async data-load jump from 0 → loaded value (which would flash on every
  // page load). We seed the ref on first run and flash on later increases.
  const prev = useRef<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [pop, setPop] = useState<number | null>(null)

  useEffect(() => {
    if (prev.current === null) {
      prev.current = current
      return
    }
    if (current > prev.current) {
      setPop(current - prev.current)
      setFlash(true)
      prev.current = current
      const t = setTimeout(() => {
        setFlash(false)
        setPop(null)
      }, 1300)
      return () => clearTimeout(t)
    }
    prev.current = current
  }, [current])

  const fmtRemaining = unit === "$" ? `$${remaining.toLocaleString()}` : remaining.toLocaleString()

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Track */}
        <div
          style={{
            flex: 1,
            height: 12,
            borderRadius: 99,
            background: dark ? "#0f1219" : "#eef0f2",
            overflow: "visible",
            position: "relative",
            boxShadow: dark ? "inset 0 0 0 1px #2a2e38" : "inset 0 0 0 1px #e3e6ea",
            animation: flash ? "goalMeterFlash 0.9s ease-out" : "none",
          }}
        >
          {/* clip wrapper so the fill's rounded ends + shimmer stay inside */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 99, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${pct}%`,
                borderRadius: 99,
                background: `linear-gradient(90deg, ${fill}, ${fill}cc)`,
                boxShadow: pct > 0 ? `0 0 10px ${fill}55` : "none",
                overflow: "hidden",
                transition: "width 0.45s cubic-bezier(.2,.9,.3,1)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  height: "100%",
                  width: "30%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                  animation: "goalShimmer 2.2s linear infinite",
                }}
              />
            </div>
          </div>

          {/* floating "+$amount" coin bubble, anchored at the fill's leading edge */}
          {pop != null && (
            <div
              style={{
                position: "absolute",
                left: `${Math.min(92, Math.max(8, pct))}%`,
                top: -6,
                transform: "translate(-50%, 0)",
                fontSize: 13,
                fontWeight: 800,
                color: "#b8860b",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                animation: "goalFloatUp 1.3s ease-out forwards",
                zIndex: 3,
              }}
            >
              +{unit === "$" ? `$${pop.toLocaleString()}` : pop.toLocaleString()}
            </div>
          )}
        </div>

        {/* Cash-stack finish line */}
        <div
          title="The payout"
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            background: near ? "linear-gradient(135deg,#f7d774,#d4a017)" : dark ? "#12151c" : "#f1f3f5",
            border: near ? "1px solid #e0b53d" : dark ? "1px solid #2a2e38" : "1px solid #e3e6ea",
            filter: near ? "none" : "grayscale(0.6) opacity(0.65)",
            boxShadow: done ? "0 0 14px rgba(212,160,23,0.85)" : near ? "0 0 8px rgba(212,160,23,0.4)" : "none",
            animation: done ? "goalPulse 1.2s ease-in-out infinite" : "none",
            transition: "filter .3s ease, background .3s ease",
          }}
        >
          💵
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, paddingRight: 36 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: done ? "#0d7c5f" : accent }}>
          {done ? "🎯 Goal reached" : `${pct}% ${label}`}
        </span>
        {!done && remaining > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#999" }}>{fmtRemaining} to go</span>
        )}
      </div>
    </div>
  )
}
