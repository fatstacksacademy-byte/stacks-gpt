"use client"

import { useEffect, useRef, useState } from "react"

/**
 * FatStackMeter — the gamified "banked this year" total that lives at the top
 * of a Stacks OS module (Savings, Spending, …). Ported from the card-preview
 * north-star prototype so the real tabs get the same video-game feel:
 *
 *   • a count-up animated running total
 *   • a literal growing pile of "bills" (one layer per ~$250 banked)
 *   • a goal progress bar toward the realistic potential
 *   • a +$ pop + bill-drop + coin-spin + meter-flash burst whenever the
 *     banked total ticks UP (i.e. a bonus is marked received/complete)
 *
 * The pop is fully self-driven: the component tracks the previous `banked`
 * value and animates the delta on its own, so the parent only has to pass the
 * live number — no need to thread callbacks through every status handler.
 */
export default function FatStackMeter({
  banked,
  goal,
  label = "Banked this year",
  accent = "#f7d774",
  count,
  countLabel,
}: {
  banked: number
  goal: number
  label?: string
  accent?: string
  /** Optional secondary count (e.g. "3 completed") shown under the total. */
  count?: number
  countLabel?: string
}) {
  const display = useCountUp(banked)
  const safeGoal = Math.max(1, goal)
  const pct = Math.min(100, (banked / safeGoal) * 100)
  // The pile grows one "bill" layer per ~$250 banked, capped so it stays tidy.
  const layers = banked > 0 ? Math.min(14, Math.max(3, Math.round(banked / 250))) : 0

  // Self-driven pop: watch for the banked total ticking up and float the delta.
  const prev = useRef(banked)
  const popId = useRef(0)
  const [pops, setPops] = useState<{ id: number; amount: number }[]>([])
  useEffect(() => {
    if (banked > prev.current) {
      const amount = banked - prev.current
      const id = ++popId.current
      setPops(p => [...p, { id, amount }])
      const t = setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 1400)
      prev.current = banked
      return () => clearTimeout(t)
    }
    prev.current = banked
  }, [banked])

  const flashing = pops.length > 0

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: "16px 18px 14px",
        marginBottom: 22,
        background: "radial-gradient(140% 120% at 50% 0%, #1c2230, #12141b)",
        border: "1px solid #23262e",
        boxShadow: flashing
          ? "0 0 0 1px #f7d774, 0 0 34px rgba(247,215,116,.55)"
          : "0 0 0 1px #23262e, 0 10px 30px rgba(0,0,0,.4)",
        transition: "box-shadow .5s ease",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes fsmFloatUp { 0% { transform: translate(-50%, 8px) scale(.8); opacity: 0 } 18% { opacity: 1; transform: translate(-50%, 0) scale(1.1) } 75% { opacity: 1 } 100% { transform: translate(-50%, -54px) scale(1); opacity: 0 } }
        @keyframes fsmBillDrop { 0% { transform: translateY(-46px) scale(.7) rotate(-8deg); opacity: 0 } 55% { opacity: 1 } 70% { transform: translateY(4px) scale(1.04) } 100% { transform: translateY(0) scale(1) rotate(0); opacity: 1 } }
        @keyframes fsmCoinSpin { 0% { transform: rotateY(0) } 100% { transform: rotateY(360deg) } }
      `}</style>

      {/* floating +$ amount on receive */}
      {pops.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            zIndex: 5,
            fontSize: 26,
            fontWeight: 900,
            color: accent,
            textShadow: "0 2px 12px rgba(247,215,116,0.7)",
            animation: "fsmFloatUp 1.3s ease-out forwards",
            pointerEvents: "none",
          }}
        >
          +${p.amount.toLocaleString()}
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b919c" }}>
            {label}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              ${display.toLocaleString()}
            </span>
            <span style={{ display: "inline-block", fontSize: 22, animation: flashing ? "fsmCoinSpin .8s ease-out" : "none" }}>🪙</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6f7682", marginTop: 4 }}>
            of ${safeGoal.toLocaleString()} in play · <span style={{ color: "#e7c34a", fontWeight: 700 }}>{Math.round(pct)}%</span>
            {count != null && countLabel ? (
              <span style={{ color: "#6f7682" }}> · {count} {countLabel}</span>
            ) : null}
          </div>
        </div>

        {/* the literal growing pile of cash — each layer is a little banknote
            (portrait medallion, $ corners, engraving lines) stacked with a
            slight offset so it reads as a real stack of bills */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: 64 }}>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 30 }}>
            {Array.from({ length: layers }).map((_, i) => {
              const isTop = i === 0 // newest bill sits on top of the pile
              const jitter = [0, 2, -1, 1, -2, 1][i % 6]
              return (
                <div
                  key={i}
                  style={{
                    width: 60,
                    height: 24,
                    borderRadius: 3,
                    marginTop: i === 0 ? 0 : -18,
                    marginLeft: jitter,
                    zIndex: layers - i,
                    position: "relative",
                    overflow: "hidden",
                    background: isTop
                      ? "linear-gradient(135deg,#4cc088 0%,#238a58 55%,#1a6b48 100%)"
                      : "linear-gradient(135deg,#3fae74 0%,#1e7a52 55%,#186045 100%)",
                    border: "1px solid #0c3a27",
                    boxShadow: isTop && flashing ? "0 0 14px rgba(247,215,116,0.95)" : "0 2px 4px rgba(0,0,0,.45)",
                    animation: isTop && flashing ? "fsmBillDrop .6s cubic-bezier(.2,1.4,.4,1)" : "none",
                  }}
                >
                  {/* portrait medallion */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.09)" }} />
                  {/* $ corners */}
                  <span style={{ position: "absolute", top: 0.5, left: 3, fontSize: 7, fontWeight: 800, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>$</span>
                  <span style={{ position: "absolute", bottom: 0.5, right: 3, fontSize: 7, fontWeight: 800, color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>$</span>
                  {/* engraving lines */}
                  <div style={{ position: "absolute", top: 3.5, left: 9, right: 9, height: 1, background: "rgba(255,255,255,0.14)" }} />
                  <div style={{ position: "absolute", bottom: 3.5, left: 9, right: 9, height: 1, background: "rgba(255,255,255,0.14)" }} />
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 9, color: "#5b6170", marginTop: 6, fontWeight: 700 }}>THE STACK</div>
        </div>
      </div>

      {/* goal progress bar */}
      <div style={{ marginTop: 12, height: 8, borderRadius: 99, background: "#0c0e13", border: "1px solid #23262e", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: "linear-gradient(90deg,#1e7a52,#f7d774)",
            boxShadow: "0 0 12px rgba(247,215,116,0.5)",
            transition: "width .7s cubic-bezier(.2,.7,.2,1)",
          }}
        />
      </div>
    </div>
  )
}

/** rAF cubic-eased count-up. Animates whenever `target` changes. */
function useCountUp(target: number, ms = 700) {
  const [val, setVal] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = from.current
    if (start === target) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(start + (target - start) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return val
}
