"use client"

import { useMemo, useState } from "react"
import type { CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { computeCardValue, DEFAULT_HYSA_APY } from "../../lib/cardValueCalculator"
import { subHeadline } from "../../lib/data/cardSpendValue"
import { SPENDING_CATEGORY_DEFINITIONS } from "../../lib/spendingCategories"

const ACCENT = "#0d7c5f"
const CORE = SPENDING_CATEGORY_DEFINITIONS.filter((c) => c.core)

// A sensible starting profile so the calculator shows real numbers immediately.
const DEFAULT_SPEND: Record<string, number> = {
  dining: 300, groceries: 500, gas: 150, travel: 200, utilities: 200, online_shopping: 200, other: 400,
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20 }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }

export default function CardValueCalculator({
  cards,
  initialCardId,
}: {
  cards: CreditCardBonus[]
  initialCardId?: string
}) {
  const liveCards = useMemo(
    () => cards.filter((c) => !c.expired).sort((a, b) => a.card_name.localeCompare(b.card_name)),
    [cards]
  )
  const [cardId, setCardId] = useState(() =>
    initialCardId && liveCards.some((c) => c.id === initialCardId) ? initialCardId : liveCards[0]?.id ?? ""
  )
  const [spend, setSpend] = useState<Record<string, number>>(DEFAULT_SPEND)
  const [zeroApr, setZeroApr] = useState(false)
  const [hysaApyPct, setHysaApyPct] = useState(DEFAULT_HYSA_APY * 100)
  const [cardQuery, setCardQuery] = useState("")

  const selected = liveCards.find((c) => c.id === cardId) ?? liveCards[0]
  const result = useMemo(
    () => (selected ? computeCardValue(selected, spend, { zeroApr, hysaApy: hysaApyPct / 100 }) : null),
    [selected, spend, zeroApr, hysaApyPct]
  )

  if (!selected || !result) {
    return <div style={{ color: "#999", padding: 24 }}>No cards available.</div>
  }

  const totalMonthly = CORE.reduce((s, c) => s + (spend[c.key] || 0), 0)
  const bonusLabel = subHeadline(selected)

  const q = cardQuery.trim().toLowerCase()
  const cardMatches = q
    ? liveCards.filter((c) => c.card_name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)).slice(0, 50)
    : []

  function setCat(key: string, v: string) {
    const n = Math.max(0, Number(v.replace(/[^\d]/g, "")) || 0)
    setSpend((prev) => ({ ...prev, [key]: n }))
  }

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* ── Inputs ── */}
      <div style={{ ...card, flex: "1 1 320px", minWidth: 300 }}>
        <div style={{ ...label, marginBottom: 8 }}>Card</div>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            type="text"
            value={cardQuery}
            onChange={(e) => setCardQuery(e.target.value)}
            placeholder={`${selected.card_name}  (type to change)`}
            aria-label="Search for a card"
            style={{ width: "100%", padding: "10px 12px", fontSize: 15, fontWeight: 500, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#111", outline: "none", boxSizing: "border-box" }}
          />
          {q && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.10)", maxHeight: 280, overflowY: "auto", zIndex: 30 }}>
              {cardMatches.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>No cards match “{cardQuery.trim()}”.</div>
              ) : cardMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCardId(c.id); setCardQuery("") }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 14, background: c.id === cardId ? "#f0faf5" : "#fff", border: "none", borderBottom: "1px solid #f4f4f4", cursor: "pointer", color: "#111", fontFamily: "inherit" }}
                >
                  <span style={{ fontWeight: 500 }}>{c.card_name}</span>
                  <span style={{ fontSize: 11, color: "#bbb", textTransform: "capitalize", flexShrink: 0 }}>{c.issuer.replace(/-/g, " ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...label, marginBottom: 4 }}>Your monthly spend</div>
        <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12 }}>
          Enter what you spend per month in each category — ${totalMonthly.toLocaleString()}/mo total.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CORE.map((c) => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: "#bbb" }}>{c.hint}</div>
              </div>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={spend[c.key] ?? 0}
                  onChange={(e) => setCat(c.key, e.target.value)}
                  style={{ width: 100, padding: "8px 10px 8px 20px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", textAlign: "right", boxSizing: "border-box" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 0% APR float toggle — only when this card offers an intro purchase APR */}
        {result.hasIntroApr && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={zeroApr} onChange={(e) => setZeroApr(e.target.checked)} style={{ accentColor: ACCENT, width: 16, height: 16 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                Factor in the 0% intro-APR float
                <span style={{ fontWeight: 400, color: "#888" }}> ({result.promoMonths} mo)</span>
              </span>
            </label>
            <div style={{ fontSize: 12, color: "#999", marginTop: 6, lineHeight: 1.5 }}>
              Pay the minimum, park the cash you&apos;d have used in a HYSA, and pocket the interest while the bank floats your balance at 0%.
            </div>
            {zeroApr && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 13, color: "#666" }}>HYSA APY</span>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.1"
                    value={hysaApyPct}
                    onChange={(e) => setHysaApyPct(Math.max(0, Number(e.target.value) || 0))}
                    style={{ width: 80, padding: "6px 22px 6px 10px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", textAlign: "right", boxSizing: "border-box" }}
                  />
                  <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>%</span>
                </div>
                <a href="/stacksos/intro-apr" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none", marginLeft: "auto" }}>
                  Full 0% strategy →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      <div style={{ flex: "1 1 320px", minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ ...card, flex: "1 1 140px", background: ACCENT, border: "none" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Year 1 value</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 4 }}>{money(result.year1)}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>bonus + credits + rewards{result.floatBenefit > 0 ? " + float" : ""} − fee</div>
          </div>
          <div style={{ ...card, flex: "1 1 140px" }}>
            <div style={label}>Year 2 value</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#111", lineHeight: 1.1, marginTop: 4 }}>{money(result.year2)}</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>rewards + recurring credits − fee</div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={card}>
          <div style={{ ...label, marginBottom: 12 }}>How Year 1 adds up</div>
          <Row title="Welcome bonus" sub={`${bonusLabel} sign-up bonus`} value={`+${money(result.signupBonus)}`} />
          {result.year1Credits > 0 && <Row title="First-year credits" value={`+${money(result.year1Credits)}`} />}
          <Row title="Rewards on your spend" sub="ongoing category earnings / yr" value={`+${money(result.rewardsAnnual)}`} />
          {result.floatBenefit > 0 && <Row title="0% APR float" sub={`${result.promoMonths} mo at ${hysaApyPct}% APY`} value={`+${money(result.floatBenefit)}`} accent />}
          {result.firstYearFee > 0 && <Row title="Annual fee" value={`−${money(result.firstYearFee)}`} negative />}
          {result.firstYearFee === 0 && selected.annual_fee > 0 && <Row title="Annual fee" sub="waived first year" value="$0" />}
          <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, color: "#111" }}>
            <span>Year 1 total</span><span>{money(result.year1)}</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div style={card}>
          <div style={{ ...label, marginBottom: 12 }}>Rewards by category</div>
          {CORE.filter((c) => (spend[c.key] || 0) > 0).map((c) => (
            <Row key={c.key} title={c.label} sub={`${money(spend[c.key] || 0)}/mo`} value={money(result.breakdown[c.key] ?? 0)} muted />
          ))}
          <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, color: "#111" }}>
            <span>Ongoing rewards / yr</span><span>{money(result.rewardsAnnual)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ title, sub, value, negative, accent, muted }: { title: string; sub?: string; value: string; negative?: boolean; accent?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
      <div>
        <span style={{ fontSize: 14, color: muted ? "#666" : "#333", fontWeight: 500 }}>{title}</span>
        {sub && <span style={{ fontSize: 11, color: "#bbb", marginLeft: 8 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: negative ? "#b91c1c" : accent ? ACCENT : "#111", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  )
}
