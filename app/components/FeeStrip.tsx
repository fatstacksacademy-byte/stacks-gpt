"use client"

import { useState, type ReactNode } from "react"

/**
 * FeeStrip — net-after-fees + "is dodging the fee actually worth it vs a HYSA?"
 * math, ported from the card-preview north-star prototype. Bank-account bonuses
 * (savings / paycheck) often carry a monthly maintenance fee and/or an early
 * closure fee; this strip does the honest accounting the sequencer does and
 * surfaces it inline so the bonus's REAL net is never a surprise.
 *
 * Many banks give SEVERAL ways to dodge the same fee (e.g. BofA: under-25 /
 * student, OR a $500+ daily balance, OR Preferred Rewards). When more than one
 * exists the strip shows a dropdown so the user can pick the path that fits
 * them — and the net/insight re-runs the math for whichever they choose.
 *
 * Fully presentational + self-contained: pass the raw fee inputs (and either a
 * single `waiver` or a `waivers[]` list) and it renders the chips, the picker,
 * and the plain-English recommendation.
 */
export type FeeWaiver =
  | { type: "dd"; label: string }
  | { type: "balance"; label: string; balance: number }
  | { type: "other"; label: string }

const DEFAULT_HYSA_APY = 0.043

/**
 * Legacy single-waiver analysis kept for API stability. The component now does
 * its own per-method math to support multiple waivers, but external callers may
 * still rely on this shape.
 */
export function analyzeFees(input: {
  bonusAmount: number
  monthlyFee: number
  earlyClosureFee: number
  holdingDays: number
  waiver: FeeWaiver | null
  accountApy?: number
  bestHysaApy?: number
}) {
  const bestHysaApy = input.bestHysaApy && input.bestHysaApy > 0 ? input.bestHysaApy : DEFAULT_HYSA_APY
  const months = Math.max(1, Math.round((input.holdingDays || 30) / 30))
  const monthly = input.monthlyFee ?? 0
  const totalFees = +(monthly * months).toFixed(2)
  const waiver = input.waiver
  const parked = waiver?.type === "balance" ? waiver.balance : 0
  // Yield you give up by parking cash here (low APY) instead of a HYSA.
  const oppCost = +(parked * (bestHysaApy - (input.accountApy ?? 0)) * (months / 12)).toFixed(2)
  const netIfPay = input.bonusAmount - totalFees
  const netIfWaive = waiver?.type === "balance" ? input.bonusAmount - oppCost : input.bonusAmount
  const canWaive = !!waiver
  const recommend: "waive" | "pay" =
    !canWaive ? "pay" : waiver!.type !== "balance" ? "waive" : oppCost > totalFees ? "pay" : "waive"
  return { months, monthly, totalFees, parked, oppCost, netIfPay, netIfWaive, canWaive, recommend, waiver, bestHysaApy }
}

export default function FeeStrip({
  bonusAmount,
  monthlyFee,
  earlyClosureFee,
  holdingDays,
  waiver = null,
  waivers,
  accountApy,
  bestHysaApy,
  safeCloseLabel,
}: {
  bonusAmount: number
  monthlyFee: number
  earlyClosureFee: number
  holdingDays: number
  /** A single fee-avoidance method (legacy). Ignored if `waivers` is set. */
  waiver?: FeeWaiver | null
  /** Multiple ways to dodge the same fee — surfaces a picker dropdown. */
  waivers?: FeeWaiver[]
  accountApy?: number
  bestHysaApy?: number
  safeCloseLabel?: string | null
}) {
  const bestHysaApyR = bestHysaApy && bestHysaApy > 0 ? bestHysaApy : DEFAULT_HYSA_APY
  const months = Math.max(1, Math.round((holdingDays || 30) / 30))
  const monthly = monthlyFee ?? 0
  const totalFees = +(monthly * months).toFixed(2)
  const oppCostFor = (balance: number) => +(balance * (bestHysaApyR - (accountApy ?? 0)) * (months / 12)).toFixed(2)

  // Every way to dodge the monthly fee. Prefer the explicit list; fall back to
  // the single legacy waiver so existing callers keep working untouched.
  const allWaivers: FeeWaiver[] = waivers && waivers.length ? waivers : waiver ? [waiver] : []
  const canWaive = monthly > 0 && allWaivers.length > 0

  // Net for a given method — `null` means "just pay the fee".
  const netFor = (w: FeeWaiver | null) =>
    !w ? bonusAmount - totalFees
    : w.type === "balance" ? bonusAmount - oppCostFor(w.balance)
    : bonusAmount

  // Options = each waiver, then the "pay" fallback at the end.
  const options: (FeeWaiver | null)[] = [...allWaivers, null]
  const payIdx = options.length - 1
  let bestIdx = payIdx
  let bestNet = -Infinity
  options.forEach((w, i) => {
    const n = netFor(w)
    if (n > bestNet) { bestNet = n; bestIdx = i }
  })

  const [selectedIdx, setSelectedIdx] = useState(canWaive ? bestIdx : payIdx)
  const idx = Math.min(selectedIdx, payIdx)
  const selected = options[idx]
  const isPaying = selected === null
  const net = netFor(selected)
  const netNeg = net <= 0
  const stackProtected = !isPaying && canWaive
  const gold = "#d4a017"
  const hysaPct = (bestHysaApyR * 100).toFixed(1)

  const bestOpt = options[bestIdx]
  const bestLabel = bestOpt === null ? "just paying the fee" : bestOpt.label

  let insight: { tone: "good" | "warn"; text: string }
  if (isPaying) {
    insight = !canWaive
      ? { tone: "good", text: `No waiver available — the $${totalFees} fee is unavoidable. Still nets $${net.toLocaleString()}.` }
      : bestIdx === payIdx
      ? { tone: "good", text: `Paying is actually cheapest here — every waiver ties up more value than the $${totalFees} in fees.` }
      : { tone: "warn", text: `You're eating $${totalFees} in fees. Switch to "${bestLabel}" to net ~$${bestNet.toLocaleString()} instead.` }
  } else if (selected!.type === "balance") {
    const opp = oppCostFor(selected!.balance)
    insight = opp <= totalFees
      ? { tone: "good", text: `Parking $${selected!.balance.toLocaleString()} costs ~$${opp} in lost ${hysaPct}% HYSA yield — still beats the $${totalFees} in fees.` }
      : { tone: "warn", text: `Parking $${selected!.balance.toLocaleString()} loses ~$${opp} vs a ${hysaPct}% HYSA — more than the $${totalFees} in fees. ${bestIdx === payIdx ? "Cheaper to just pay." : `Try "${bestLabel}".`}` }
  } else {
    insight = { tone: "good", text: `Free dodge — ${selected!.label}. No fees, no parked cash.` }
  }

  return (
    <div style={{ marginTop: 12, borderRadius: 12, background: "#15130c", border: "1px solid #2e2713", padding: "11px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#e7c34a", letterSpacing: "0.04em" }}>⚠ FEES</span>
        {monthlyFee > 0 && <FeeChip>${monthlyFee}/mo · ${totalFees} over {months}mo</FeeChip>}
        {earlyClosureFee > 0 && <FeeChip>${earlyClosureFee} if closed{safeCloseLabel ? ` before ${safeCloseLabel}` : " early"}</FeeChip>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {stackProtected && (
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", color: "#1f4d34", background: "linear-gradient(135deg,#7fe3b0,#3fae74)", padding: "3px 9px", borderRadius: 99 }}>
              🛡 STACK PROTECTED
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 800, color: netNeg ? "#f87171" : "#3fae74" }}>
            {netNeg ? "⚠ " : ""}Nets ≈ ${net.toLocaleString()}
          </span>
        </span>
      </div>

      {/* Fee-avoidance picker. Multiple ways to dodge the same fee → a dropdown;
          a single way → the simpler on/off toggle. */}
      {canWaive && allWaivers.length >= 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#d7cfae", flexShrink: 0 }}>
            Dodge the ${monthlyFee}/mo fee by
          </span>
          <select
            value={idx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            style={{
              flex: 1,
              minWidth: 180,
              fontSize: 12.5,
              fontWeight: 600,
              color: isPaying ? "#e7c97a" : "#f2e6b8",
              background: "#221c0c",
              border: `1px solid ${isPaying ? "#4a3a16" : gold}`,
              borderRadius: 8,
              padding: "7px 10px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {allWaivers.map((w, i) => (
              <option key={i} value={i}>{w.label}</option>
            ))}
            <option value={payIdx}>Just pay the ${monthlyFee}/mo fee</option>
          </select>
        </div>
      )}

      {canWaive && allWaivers.length === 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
          <Switch on={!isPaying} onToggle={() => setSelectedIdx(isPaying ? 0 : payIdx)} color={gold} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#d7cfae" }}>
            Avoid the ${monthlyFee}/mo fee — {allWaivers[0].label}
          </span>
        </div>
      )}

      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: insight.tone === "good" ? "#9fd9b8" : "#e7c97a", display: "flex", gap: 6 }}>
        <span style={{ flexShrink: 0 }}>{insight.tone === "good" ? "✓" : "💡"}</span>
        <span>{insight.text}</span>
      </div>
    </div>
  )
}

function FeeChip({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: "#cdb87a", background: "#211c0e", border: "1px solid #3a3016", padding: "3px 8px", borderRadius: 7 }}>
      {children}
    </span>
  )
}

function Switch({ on, onToggle, color }: { on: boolean; onToggle: () => void; color: string }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 42,
        height: 24,
        borderRadius: 99,
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
        position: "relative",
        background: on ? color : "#2a2e38",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 99,
          background: "#fff",
          transition: "left .15s",
          boxShadow: "0 1px 3px rgba(0,0,0,.4)",
        }}
      />
    </button>
  )
}
