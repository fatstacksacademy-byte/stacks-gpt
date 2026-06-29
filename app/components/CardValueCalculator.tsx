"use client"

import { useEffect, useMemo, useState } from "react"
import type { CreditCardBonus } from "../../lib/data/creditCardBonuses"
import {
  computeCardValue,
  introAprFloat,
  defaultAprSchedule,
  APR_SCHEDULE_MONTHS,
  DEFAULT_HYSA_APY,
} from "../../lib/cardValueCalculator"
import { subHeadline } from "../../lib/data/cardSpendValue"
import {
  SPENDING_CATEGORY_DEFINITIONS,
  SPENDING_CATEGORY_BY_KEY,
  type SpendingCategory,
} from "../../lib/spendingCategories"
import SpendingCategoryPicker from "./SpendingCategoryPicker"
import InfoTip from "./InfoTip"

const ACCENT = "#0d7c5f"
const CORE = SPENDING_CATEGORY_DEFINITIONS.filter((c) => c.core)

// Every category, grouped, for the "what did you spend the bonus minimum on?" picker.
const CATEGORY_GROUPS: [string, (typeof SPENDING_CATEGORY_DEFINITIONS)[number][]][] = (() => {
  const m = new Map<string, (typeof SPENDING_CATEGORY_DEFINITIONS)[number][]>()
  for (const c of SPENDING_CATEGORY_DEFINITIONS) {
    const arr = m.get(c.group) ?? []
    arr.push(c)
    m.set(c.group, arr)
  }
  return Array.from(m)
})()

// A sensible starting profile so the calculator shows real numbers immediately.
const DEFAULT_SPEND: Record<string, number> = {
  dining: 300, groceries: 500, gas: 150, travel: 200, utilities: 200, online_shopping: 200, other: 400,
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`
const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20 }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#111" }

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
  const initialCard =
    (initialCardId && liveCards.find((c) => c.id === initialCardId)) || liveCards[0]

  const [cardId, setCardId] = useState(initialCard?.id ?? "")
  const [spend, setSpend] = useState<Record<string, number>>(DEFAULT_SPEND)
  const [addedCats, setAddedCats] = useState<SpendingCategory[]>([])
  const [subWindowSpend, setSubWindowSpend] = useState(() => initialCard?.min_spend ?? 0)
  const [subWindowCategory, setSubWindowCategory] = useState<SpendingCategory>("other")
  const [aprSchedule, setAprSchedule] = useState<number[]>(() =>
    defaultAprSchedule(initialCard?.min_spend ?? 0, initialCard?.spend_months ?? 3)
  )
  const [zeroApr, setZeroApr] = useState(false)
  const [hysaApyPct, setHysaApyPct] = useState(DEFAULT_HYSA_APY * 100)
  const [cardQuery, setCardQuery] = useState("")

  const selected = liveCards.find((c) => c.id === cardId) ?? liveCards[0]

  // The bonus requirement and the 0%-APR prefill are card-specific, so reset them
  // when the card changes. The category spend profile is the user's, so it stays.
  useEffect(() => {
    const c = liveCards.find((x) => x.id === cardId) ?? liveCards[0]
    if (!c) return
    setSubWindowSpend(c.min_spend ?? 0)
    setAprSchedule(defaultAprSchedule(c.min_spend ?? 0, c.spend_months ?? 3))
  }, [cardId, liveCards])

  const result = useMemo(
    () =>
      selected
        ? computeCardValue(selected, spend, { subWindowSpend, subWindowCategory, zeroApr, hysaApy: hysaApyPct / 100, aprSchedule })
        : null,
    [selected, spend, subWindowSpend, subWindowCategory, zeroApr, hysaApyPct, aprSchedule]
  )
  const aprDetail = useMemo(
    () => (selected ? introAprFloat(selected, { schedule: aprSchedule, hysaApy: hysaApyPct / 100 }) : null),
    [selected, aprSchedule, hysaApyPct]
  )

  // Core categories always show; extras are opt-in via the picker (as in Stacks OS).
  const displayedCats = useMemo(
    () => [...CORE, ...addedCats.map((k) => SPENDING_CATEGORY_BY_KEY[k]).filter(Boolean)],
    [addedCats]
  )
  const selectedKeys = useMemo(() => displayedCats.map((c) => c.key as SpendingCategory), [displayedCats])

  if (!selected || !result) {
    return <div style={{ color: "#999", padding: 24 }}>No cards available.</div>
  }

  const totalMonthly = displayedCats.reduce((s, c) => s + (spend[c.key] || 0), 0)
  const bonusLabel = subHeadline(selected)
  const shortfall = Math.max(0, result.minSpend - subWindowSpend)

  const q = cardQuery.trim().toLowerCase()
  const cardMatches = q
    ? liveCards.filter((c) => c.card_name.toLowerCase().includes(q) || c.issuer.toLowerCase().includes(q)).slice(0, 50)
    : []

  function setCat(key: string, v: string) {
    const n = Math.max(0, Number(v.replace(/[^\d]/g, "")) || 0)
    setSpend((prev) => ({ ...prev, [key]: n }))
  }
  function addCat(key: SpendingCategory) {
    if (SPENDING_CATEGORY_BY_KEY[key]?.core) return
    setAddedCats((cur) => (cur.includes(key) ? cur : [...cur, key]))
  }
  function removeCat(key: SpendingCategory) {
    setAddedCats((cur) => cur.filter((k) => k !== key))
    setSpend((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }
  function setAprMonth(i: number, v: string) {
    const n = Math.max(0, Number(v.replace(/[^\d]/g, "")) || 0)
    setAprSchedule((prev) => prev.map((x, idx) => (idx === i ? n : x)))
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ── Inputs ── */}
        <div style={{ ...card, flex: "1 1 340px", minWidth: 300 }}>
          <div style={{ ...label, marginBottom: 8 }}>Card</div>
          <div style={{ position: "relative", marginBottom: 22 }}>
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

          {/* ── Section 1: Sign-up bonus / SUB-window spend ── */}
          <div style={sectionTitle}>1 · Sign-up bonus</div>
          {result.minSpend > 0 ? (
            <>
              <div style={{ fontSize: 12, color: "#888", margin: "4px 0 12px", lineHeight: 1.5 }}>
                Earn the <strong style={{ color: "#111" }}>{bonusLabel}</strong> bonus by spending{" "}
                <strong style={{ color: "#111" }}>{money(result.minSpend)}</strong> in the first{" "}
                {result.spendMonths || 3} month{(result.spendMonths || 3) === 1 ? "" : "s"}. How much will you
                actually put on it in that window?
              </div>
              <div style={{ position: "relative", maxWidth: 200 }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={subWindowSpend}
                  onChange={(e) => setSubWindowSpend(Math.max(0, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
                  style={{ width: "100%", padding: "9px 10px 9px 20px", fontSize: 15, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", textAlign: "right", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 5 }}>
                  What will you mostly put that spend on? <span style={{ color: "#bbb" }}>(sets how much it earns)</span>
                </div>
                <select
                  value={subWindowCategory}
                  onChange={(e) => setSubWindowCategory(e.target.value as SpendingCategory)}
                  aria-label="Bonus-window spend category"
                  style={{ width: "100%", maxWidth: 280, padding: "9px 10px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#111", outline: "none", boxSizing: "border-box" }}
                >
                  {CATEGORY_GROUPS.map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div
                style={{
                  marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                  background: result.bonusEarned ? "#f0faf5" : "#fffbeb",
                  border: `1px solid ${result.bonusEarned ? "#bfe6d4" : "#fde68a"}`,
                  color: result.bonusEarned ? "#0d7c5f" : "#92400e",
                }}
              >
                {result.bonusEarned ? (
                  <>✓ You hit the minimum — the full {bonusLabel} bonus counts in Year 1.</>
                ) : (
                  <>⚠ You&apos;re {money(shortfall)} short. As is, you&apos;d forfeit the {bonusLabel} bonus
                    ({money(result.signupBonusPotential)} of value). Bump your spend to {money(result.minSpend)} to earn it.</>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#888", margin: "4px 0 4px", lineHeight: 1.5 }}>
              {result.signupBonusPotential > 0
                ? <>No minimum spend — the <strong style={{ color: "#111" }}>{bonusLabel}</strong> bonus posts automatically.</>
                : <>This card has no current sign-up bonus.</>}
            </div>
          )}

          <div style={{ borderTop: "1px solid #f0f0f0", margin: "20px 0 16px" }} />

          {/* ── Section 2: Monthly spend by category ── */}
          <div style={sectionTitle}>2 · Your monthly spend by category</div>
          <div style={{ fontSize: 12, color: "#888", margin: "4px 0 12px", lineHeight: 1.5 }}>
            What you&apos;ll put on the card every month, ongoing — this drives your everyday rewards
            (${totalMonthly.toLocaleString()}/mo total).
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displayedCats.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "#333", fontWeight: 500 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "#bbb" }}>{c.hint}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={spend[c.key] ?? 0}
                      onChange={(e) => setCat(c.key, e.target.value)}
                      style={{ width: 100, padding: "8px 10px 8px 20px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none", textAlign: "right", boxSizing: "border-box" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCat(c.key)}
                    aria-label={`Remove ${c.label}`}
                    title={c.core ? "Core category" : `Remove ${c.label}`}
                    disabled={!!c.core}
                    style={{ width: 22, height: 22, lineHeight: "20px", textAlign: "center", border: "none", background: "transparent", color: c.core ? "#e8e8e8" : "#bbb", cursor: c.core ? "default" : "pointer", fontSize: 16, fontFamily: "inherit", flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#999", marginTop: 8, lineHeight: 1.5 }}>
            These are example amounts — change them to match your real monthly spending for an accurate estimate.
          </div>

          <div style={{ marginTop: 14 }}>
            <SpendingCategoryPicker
              selected={selectedKeys}
              onAdd={addCat}
              placeholder="Add a category (Amazon, transit, streaming…)"
            />
          </div>
        </div>

        {/* ── Results ── */}
        <div style={{ flex: "1 1 340px", minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ ...card, flex: "1 1 140px", background: ACCENT, border: "none" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Year 1 value</span>
                <InfoTip term="blendedReturn" label="blended return" />
              </div>
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
            {result.bonusEarned ? (
              <Row title="Welcome bonus" sub={`${bonusLabel} sign-up bonus`} value={`+${money(result.signupBonus)}`} />
            ) : (
              <Row title="Welcome bonus" sub="min spend not met — not earned" value="$0" muted />
            )}
            {result.subRewards > 0 && <Row title="Rewards on bonus-window spend" sub={`${money(subWindowSpend)} on ${SPENDING_CATEGORY_BY_KEY[subWindowCategory].label}`} value={`+${money(result.subRewards)}`} />}
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
            {displayedCats.filter((c) => (spend[c.key] || 0) > 0).map((c) => (
              <Row key={c.key} title={c.label} sub={`${money(spend[c.key] || 0)}/mo`} value={money(result.breakdown[c.key] ?? 0)} muted />
            ))}
            <div style={{ borderTop: "1px solid #eee", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, color: "#111" }}>
              <span>Ongoing rewards / yr</span><span>{money(result.rewardsAnnual)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: 0% intro-APR float calculator ── */}
      <div style={{ ...card, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={sectionTitle}>3 · 0% intro-APR float calculator</div>
          {result.hasIntroApr && (
            <span style={{ fontSize: 12, color: "#888" }}>
              {selected.card_name} has 0% on purchases for <strong style={{ color: "#111" }}>{result.promoMonths} months</strong>
            </span>
          )}
        </div>

        {!result.hasIntroApr ? (
          <div style={{ fontSize: 13, color: "#999", marginTop: 8, lineHeight: 1.5 }}>
            This card doesn&apos;t carry a 0% intro APR on purchases, so there&apos;s no float to harvest. Pick a
            0%-purchase card to model it.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "#888", margin: "6px 0 16px", lineHeight: 1.55, maxWidth: 760 }}>
              Pay only the minimum, park the cash that would&apos;ve paid the bill in a HYSA, and pocket the interest while
              the bank floats your balance at 0%. Enter what you&apos;ll charge each of the first {APR_SCHEDULE_MONTHS} months —
              the first {selected.spend_months || 3} are prefilled to clear the sign-up bonus. Earlier spend floats longer,
              so the effective rate <em>decays</em> as the promo runs out.
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {/* Month-by-month inputs */}
              <div style={{ flex: "1 1 360px", minWidth: 300 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={label}>Spend per month</span>
                  <button
                    type="button"
                    onClick={() => setAprSchedule(defaultAprSchedule(selected.min_spend ?? 0, selected.spend_months ?? 3))}
                    style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    Reset to bonus minimum
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
                  {aprSchedule.map((amt, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, color: "#aaa", marginBottom: 3, fontWeight: 600 }}>Mo {i + 1}</div>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#bbb", fontSize: 12 }}>$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={amt}
                          onChange={(e) => setAprMonth(i, e.target.value)}
                          style={{ width: "100%", padding: "7px 8px 7px 18px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 7, outline: "none", textAlign: "right", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
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
              </div>

              {/* Float result */}
              <div style={{ flex: "1 1 240px", minWidth: 240 }}>
                <div style={{ background: "#f0faf5", border: `2px solid ${ACCENT}`, borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, color: ACCENT, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Float interest earned</div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: ACCENT, lineHeight: 1.1, marginTop: 2 }}>
                    +{money(result.floatValue)}
                  </div>
                  {aprDetail && (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 6, lineHeight: 1.5 }}>
                      on {money(aprDetail.totalSpend)} of spend over {result.promoMonths} mo
                      {aprDetail.totalSpend > 0 ? ` · ${pct1(aprDetail.returnOnSpend)} effective` : ""}
                    </div>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 14 }}>
                  <input type="checkbox" checked={zeroApr} onChange={(e) => setZeroApr(e.target.checked)} style={{ accentColor: ACCENT, width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Add this float to Year 1 value</span>
                </label>
                {selected.intro_apr?.go_to_apr_high != null && (
                  <div style={{ fontSize: 11, color: "#b45309", marginTop: 10, lineHeight: 1.5 }}>
                    ⚠ Go-to APR is ~{selected.intro_apr.go_to_apr_high}% after the promo. Pay the full balance a few
                    days before it ends or the interest wipes out the gain.
                  </div>
                )}
              </div>
            </div>

            {/* Decaying-interest schedule */}
            {aprDetail && aprDetail.schedule.length > 0 && aprDetail.totalSpend > 0 && (
              <div style={{ overflowX: "auto", marginTop: 18 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e8e8e8", textAlign: "left", color: "#999" }}>
                      <th style={th}>Month</th>
                      <th style={{ ...th, textAlign: "right" }}>Spend</th>
                      <th style={{ ...th, textAlign: "right" }}>Floats (mo)</th>
                      <th style={{ ...th, textAlign: "right" }}>Eff. rate</th>
                      <th style={{ ...th, textAlign: "right" }}>Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aprDetail.schedule.filter((r) => r.spend > 0).map((r) => (
                      <tr key={r.month} style={{ borderBottom: "1px solid #f4f4f4" }}>
                        <td style={td}>{r.month + 1}</td>
                        <td style={{ ...td, textAlign: "right" }}>{money(r.spend)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{r.floatMonths}</td>
                        <td style={{ ...td, textAlign: "right", color: r.effectiveRateOnSpend > 0.02 ? ACCENT : "#999" }}>{pct1(r.effectiveRateOnSpend)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(r.interest)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f0faf5" }}>
                      <td style={{ ...td, fontWeight: 700 }}>Total</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(aprDetail.totalSpend)}</td>
                      <td style={td} />
                      <td style={td} />
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: ACCENT }}>{money(aprDetail.grossInterest)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
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

const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 600 }
const td: React.CSSProperties = { padding: "8px", color: "#444" }
