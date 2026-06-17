"use client"

import React, { useEffect, useMemo, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import { runIntroAprArbitrage } from "../../../lib/introAprArbitrage"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"
import { getSavingsProfile } from "../../../lib/savingsProfile"
import { applyUrl } from "../../../lib/affiliateLinks"
import { track } from "../../../lib/analytics"

const ACCENT = "#0d7c5f"
const money = (n: number) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`)
const money2 = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`

// Cards that actually carry a 0% intro APR on *purchases* — the ones this
// strategy runs on. (Balance-transfer-only intro offers don't help you float
// everyday spend.)
type AprCard = (typeof creditCardBonuses)[number]
function purchaseIntroCards(): AprCard[] {
  return creditCardBonuses
    .filter(c => !c.expired && (c.intro_apr?.purchase_apr_months ?? 0) > 0)
    .sort((a, b) => (b.intro_apr!.purchase_apr_months ?? 0) - (a.intro_apr!.purchase_apr_months ?? 0))
}

const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, display: "block" }
const input: React.CSSProperties = { padding: "8px 10px", fontSize: 14, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%" }
const select: React.CSSProperties = { ...input }
const fieldWrap: React.CSSProperties = { flex: 1, minWidth: 140 }
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20 }

export default function IntroAprClient({ userId }: { userId: string; isPaid: boolean }) {
  const cards = useMemo(() => purchaseIntroCards(), [])

  // ── Inputs (UI units: APY/tax as %, cpp as cents) ──
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [monthlySpend, setMonthlySpend] = useState(2000)
  const [spendMonths, setSpendMonths] = useState(6)
  const [promoMonths, setPromoMonths] = useState(12)
  const [hysaApyPct, setHysaApyPct] = useState(4.5)
  const [pointsPerDollar, setPointsPerDollar] = useState(2)
  const [cppCents, setCppCents] = useState(1)
  const [welcomeBonusPoints, setWelcomeBonusPoints] = useState(15000)
  const [welcomeBonusMinSpend, setWelcomeBonusMinSpend] = useState(3000)
  const [welcomeBonusWindowMonths, setWelcomeBonusWindowMonths] = useState(3)
  const [taxRatePct, setTaxRatePct] = useState(15)
  const [annualFee, setAnnualFee] = useState(0)

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null

  // Prefill the user's real HYSA APY from their Savings profile.
  useEffect(() => {
    let cancelled = false
    getSavingsProfile(userId)
      .then(p => { if (!cancelled && p.current_apy != null && p.current_apy > 0) setHysaApyPct(Math.round(p.current_apy * 1000) / 10) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  function applyCard(cardId: string) {
    setSelectedCardId(cardId)
    const c = cards.find(x => x.id === cardId)
    if (!c) return
    const ia = c.intro_apr
    if (ia?.purchase_apr_months) setPromoMonths(ia.purchase_apr_months)
    setWelcomeBonusPoints(c.bonus_amount || 0)
    setWelcomeBonusMinSpend(c.min_spend || 0)
    setWelcomeBonusWindowMonths(c.spend_months || 3)
    setCppCents(Math.round((c.cpp_value || 0.01) * 1000) / 10)
    setAnnualFee(c.annual_fee_waived_first_year ? 0 : (c.annual_fee || 0))
    track("intro_apr_card_selected", { card: c.card_name })
  }

  const result = useMemo(() => runIntroAprArbitrage({
    monthlySpend,
    spendMonths,
    promoMonths,
    hysaApy: hysaApyPct / 100,
    pointsPerDollar,
    cpp: cppCents / 100,
    welcomeBonusPoints,
    welcomeBonusMinSpend,
    welcomeBonusWindowMonths,
    taxRateOnInterest: taxRatePct / 100,
    annualFee,
  }), [monthlySpend, spendMonths, promoMonths, hysaApyPct, pointsPerDollar, cppCents, welcomeBonusPoints, welcomeBonusMinSpend, welcomeBonusWindowMonths, taxRatePct, annualFee])

  const goToApr = selectedCard?.intro_apr?.go_to_apr_high

  return (
    <div>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6 }}>0% Intro-APR Float Calculator</h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24, maxWidth: 720, lineHeight: 1.55 }}>
          Ride a card&apos;s 0% intro APR, pay only the minimum, and leave the cash that would have paid the bill
          in your HYSA earning interest. The bank floats your balance for free. This shows what that float is worth —
          stacked on top of your everyday earn and welcome bonus — and how the interest <b>decays</b> the later in the
          promo you spend (which is why re-upping a fresh card every ~6 months keeps the rate high).
        </p>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* ── Inputs ── */}
          <div style={{ ...card, flex: "1 1 380px", minWidth: 320 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Prefill from a 0%-purchase card</label>
              <select style={select} value={selectedCardId} onChange={e => applyCard(e.target.value)}>
                <option value="">Manual entry (Blue Business Plus defaults)</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} — {c.intro_apr?.purchase_apr_months}mo 0%
                  </option>
                ))}
              </select>
              {goToApr != null && (
                <div style={{ fontSize: 11, color: "#b45309", marginTop: 6 }}>
                  ⚠ Go-to APR after the promo is ~{goToApr}%. Pay the full balance a few days before it ends or this all evaporates.
                </div>
              )}
            </div>

            <Row>
              <Field label="Spend / month" suffix="$" value={monthlySpend} onChange={setMonthlySpend} />
              <Field label="Months you'll spend" value={spendMonths} onChange={setSpendMonths} />
            </Row>
            <Row>
              <Field label="0% promo length (mo)" value={promoMonths} onChange={setPromoMonths} />
              <Field label="Your HYSA APY" suffix="%" step={0.1} value={hysaApyPct} onChange={setHysaApyPct} />
            </Row>

            <div style={{ borderTop: "1px solid #f0f0f0", margin: "16px 0", paddingTop: 4 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Rewards</div>
            <Row>
              <Field label="Points per $" value={pointsPerDollar} onChange={setPointsPerDollar} step={0.5} />
              <Field label="Point value" suffix="¢" value={cppCents} onChange={setCppCents} step={0.1} />
            </Row>
            <Row>
              <Field label="Welcome bonus (pts)" value={welcomeBonusPoints} onChange={setWelcomeBonusPoints} step={1000} />
              <Field label="Bonus min spend" suffix="$" value={welcomeBonusMinSpend} onChange={setWelcomeBonusMinSpend} step={500} />
            </Row>
            <Row>
              <Field label="Bonus window (mo)" value={welcomeBonusWindowMonths} onChange={setWelcomeBonusWindowMonths} />
              <Field label="Tax on interest" suffix="%" value={taxRatePct} onChange={setTaxRatePct} />
            </Row>
            <Row>
              <Field label="Annual fee" suffix="$" value={annualFee} onChange={setAnnualFee} />
              <div style={fieldWrap} />
            </Row>
          </div>

          {/* ── Results ── */}
          <div style={{ flex: "1 1 380px", minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#f0faf5", border: `2px solid ${ACCENT}`, borderRadius: 14, padding: "22px 26px" }}>
              <div style={{ fontSize: 11, color: ACCENT, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Blended return on spend</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: ACCENT, marginTop: 2, letterSpacing: "-0.02em" }}>
                {pct1(result.returnOnSpend)}
                <span style={{ fontSize: 18, color: "#7bbfa6", fontWeight: 700, marginLeft: 8 }}>≈ {result.blendedMultiplier.toFixed(1)}x</span>
              </div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {money(result.totalProfit)} profit on {money(result.totalSpend)} of spend
                {result.welcomeBonusEarned ? " · welcome bonus earned ✓" : welcomeBonusPoints > 0 ? " · ⚠ bonus min spend not met in window" : ""}
              </div>
            </div>

            <div style={card}>
              <BreakdownRow k="Welcome bonus" v={money(result.welcomeBonusValue)} sub={result.welcomeBonusEarned ? `${result.welcomeBonusPoints.toLocaleString()} pts @ ${cppCents}¢` : "not earned"} />
              <BreakdownRow k="Everyday earn" v={money(result.baseRewardsValue)} sub={`${result.basePoints.toLocaleString()} pts @ ${cppCents}¢`} />
              <BreakdownRow k="Float interest (gross)" v={money(result.grossInterest)} sub={`@ ${hysaApyPct}% APY, decaying`} />
              <BreakdownRow k="− Tax on interest" v={`-${money(result.taxOnInterest)}`} sub={`${taxRatePct}% of interest (1099-INT)`} muted />
              {result.annualFee > 0 && <BreakdownRow k="− Annual fee" v={`-${money(result.annualFee)}`} muted />}
              <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 800, color: "#111" }}>Net profit</span>
                <span style={{ fontWeight: 800, color: ACCENT, fontSize: 18 }}>{money(result.totalProfit)}</span>
              </div>
            </div>

            {selectedCard?.offer_link && (
              <a href={applyUrl(selectedCard.id)} target="_blank" rel="noreferrer"
                 onClick={() => track("intro_apr_apply_click", { card: selectedCard.card_name })}
                 style={{ display: "block", textAlign: "center", background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 0", borderRadius: 8, textDecoration: "none" }}>
                Apply for {selectedCard.card_name} →
              </a>
            )}
          </div>
        </div>

        {/* ── Decaying-interest schedule ── */}
        {result.schedule.length > 0 && (
          <div style={{ ...card, marginTop: 22 }}>
            <div style={{ fontWeight: 700, color: "#111", marginBottom: 4 }}>The decaying float curve</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
              Each month&apos;s spend floats in your HYSA until you pay the balance at the end of the promo. Spend early and it earns the
              full APY; spend late and there&apos;s barely any runway left — this is the whole reason to start a fresh 0% card mid-promo.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e8e8e8", textAlign: "left", color: "#888" }}>
                    <th style={th}>Month</th>
                    <th style={{ ...th, textAlign: "right" }}>Spend</th>
                    <th style={{ ...th, textAlign: "right" }}>Floats (mo)</th>
                    <th style={{ ...th, textAlign: "right" }}>Eff. rate on spend</th>
                    <th style={{ ...th, textAlign: "right" }}>Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map(r => (
                    <tr key={r.month} style={{ borderBottom: "1px solid #f4f4f4" }}>
                      <td style={td}>{r.month + 1}</td>
                      <td style={{ ...td, textAlign: "right" }}>{money(r.spend)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{r.floatMonths}</td>
                      <td style={{ ...td, textAlign: "right", color: r.effectiveRateOnSpend > 0.02 ? ACCENT : "#999" }}>{pct1(r.effectiveRateOnSpend)}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money2(r.interest)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f0faf5" }}>
                    <td style={{ ...td, fontWeight: 700 }}>Total</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(result.totalSpend)}</td>
                    <td style={td} />
                    <td style={td} />
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: ACCENT }}>{money2(result.grossInterest)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Guardrails ── */}
        <div style={{ marginTop: 22, padding: "16px 20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
          <b>Before you run this:</b> only do it if the cash to repay is already sitting in the HYSA — one or two months of go-to-APR
          interest will wipe out the whole gain. Mark your calendar for the promo end date and pay the full balance a few days early.
          Business cards (Amex Blue Business Plus/Cash) are ideal because the balance doesn&apos;t report to your personal credit, so a
          high utilization won&apos;t dent your score. The HYSA interest is taxable (1099-INT) — that&apos;s the tax field above.
        </div>
      </div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>{children}</div>
}

function Field({ label: lbl, value, onChange, suffix, step }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; step?: number }) {
  return (
    <div style={fieldWrap}>
      <label style={label}>{lbl}</label>
      <div style={{ position: "relative" }}>
        {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#bbb", fontSize: 13 }}>{suffix}</span>}
        <input
          type="number"
          inputMode="decimal"
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...input, paddingRight: suffix ? 26 : 10 }}
        />
      </div>
    </div>
  )
}

function BreakdownRow({ k, v, sub, muted }: { k: string; v: string; sub?: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
      <div>
        <span style={{ fontSize: 13, color: muted ? "#999" : "#333" }}>{k}</span>
        {sub && <span style={{ fontSize: 11, color: "#bbb", marginLeft: 8 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: muted ? "#999" : "#111" }}>{v}</span>
    </div>
  )
}

const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "8px", color: "#444" }
