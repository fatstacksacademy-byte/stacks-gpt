"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import InfoTip from "../../components/InfoTip"
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

// ── Best-0%-cards finder ──────────────────────────────────────────────
// Browse and rank every live 0% card by the metric that matters for *this*
// strategy — length of the 0% window — with a purchase-vs-balance-transfer
// lens, no-annual-fee filter, and a few alternate sorts (lowest go-to APR,
// lowest annual/BT fee).
type AprMode = "purchase" | "bt"
type AprSort = "length" | "goto" | "af" | "btfee"

function introMonths(c: AprCard, mode: AprMode): number {
  return (mode === "purchase" ? c.intro_apr?.purchase_apr_months : c.intro_apr?.bt_apr_months) ?? 0
}

function gotoLow(c: AprCard): number {
  return c.intro_apr?.go_to_apr_low ?? c.intro_apr?.go_to_apr_high ?? Infinity
}

function gotoDisplay(c: AprCard): string {
  const lo = c.intro_apr?.go_to_apr_low
  const hi = c.intro_apr?.go_to_apr_high
  if (lo != null && hi != null) return `${lo}–${hi}%`
  if (hi != null) return `up to ${hi}%`
  if (lo != null) return `${lo}%+`
  return "—"
}

function hasOfferLink(c: AprCard): boolean {
  // Many catalog entries (esp. small credit unions) ship without an offer URL.
  // /go/<id> 404s for those, so only render an Apply link when it's real.
  return /^https?:\/\//i.test(c.offer_link?.trim() ?? "")
}

function bonusDisplay(c: AprCard): string {
  if (!c.bonus_amount || c.bonus_amount <= 0) return "—"
  return c.bonus_currency === "cash"
    ? `$${c.bonus_amount.toLocaleString()}`
    : `${c.bonus_amount.toLocaleString()} pts`
}

// Business cards from most issuers DON'T report to your personal credit bureaus,
// so a 0% balance carried on one won't raise personal utilization or dent your
// score — the ideal place to park the float. These issuers are the known
// exceptions that DO report business activity to personal credit, so exclude them.
const REPORTS_TO_PERSONAL = new Set(["capital-one", "capital one", "discover", "td-bank", "td", "brex"])
function offPersonalCredit(c: AprCard): boolean {
  return c.card_type === "business" && !REPORTS_TO_PERSONAL.has((c.issuer || "").trim().toLowerCase())
}

function rankIntroCards(mode: AprMode, sort: AprSort, noAF: boolean, bizOnly: boolean, query: string): AprCard[] {
  const q = query.trim().toLowerCase()
  const byLength = (a: AprCard, b: AprCard) => introMonths(b, mode) - introMonths(a, mode)
  return creditCardBonuses
    .filter(c => !c.expired && introMonths(c, mode) > 0)
    .filter(c => (noAF ? (c.annual_fee ?? 0) === 0 : true))
    .filter(c => (bizOnly ? offPersonalCredit(c) : true))
    .filter(c => (q ? `${c.card_name} ${c.issuer}`.toLowerCase().includes(q) : true))
    .sort((a, b) => {
      switch (sort) {
        case "goto": return gotoLow(a) - gotoLow(b) || byLength(a, b)
        case "af": return (a.annual_fee ?? 0) - (b.annual_fee ?? 0) || byLength(a, b)
        case "btfee": return (a.intro_apr?.bt_fee_pct ?? Infinity) - (b.intro_apr?.bt_fee_pct ?? Infinity) || byLength(a, b)
        default: return byLength(a, b) || (a.annual_fee ?? 0) - (b.annual_fee ?? 0)
      }
    })
}

const ISSUER_COLORS: Record<string, string> = {
  chase: "#117aca", amex: "#2671b9", american_express: "#2671b9",
  citi: "#003a72", capital_one: "#004977", wells_fargo: "#b3122a", bofa: "#012169",
  bank_of_america: "#012169", discover: "#f37021", us_bank: "#0c2074", barclays: "#00aeef",
}
function thumbColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 42%, 38%)`
}
function CardArt({ card }: { card: AprCard }) {
  const box: React.CSSProperties = { width: 46, height: 30, borderRadius: 5, flexShrink: 0, overflow: "hidden", border: "1px solid #ececec" }
  if (card.image_url) {
    return (
      <div style={{ ...box, background: "#f7f7f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={card.image_url} alt="" aria-hidden loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    )
  }
  const key = card.issuer?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const bg = ISSUER_COLORS[key] || thumbColor(card.issuer || card.card_name)
  const initials = (card.issuer || card.card_name).split(/[\s_]+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("")
  return (
    <div aria-hidden style={{ ...box, background: bg, color: "#fff", display: "flex", alignItems: "flex-end", padding: 4, fontSize: 10, fontWeight: 800 }}>
      {initials}
    </div>
  )
}

const ABS_CAP = 40

function BestZeroAprCards({ onUse }: { onUse: (cardId: string) => void }) {
  const [mode, setMode] = useState<AprMode>("purchase")
  const [sort, setSort] = useState<AprSort>("length")
  const [noAF, setNoAF] = useState(false)
  const [bizOnly, setBizOnly] = useState(false)
  const [query, setQuery] = useState("")

  const ranked = useMemo(() => rankIntroCards(mode, sort, noAF, bizOnly, query), [mode, sort, noAF, bizOnly, query])
  const shown = ranked.slice(0, ABS_CAP)

  function pickMode(next: AprMode) {
    setMode(next)
    if (next === "purchase" && sort === "btfee") setSort("length")
    track("intro_apr_finder_mode", { mode: next })
  }

  const metricLabel = mode === "purchase" ? "0% purchases" : "0% balance transfer"

  return (
    <div style={{ ...card, marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0 }}>Best 0% cards right now</h2>
          <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
            Ranked by the length of the 0% window — the metric that actually drives this play. {ranked.length} live cards.
          </div>
        </div>
        {/* Purchase vs balance-transfer lens */}
        <div style={{ display: "flex", gap: 4, background: "#f4f4f4", border: "1px solid #e6e6e6", borderRadius: 7, padding: 3 }}>
          {(["purchase", "bt"] as const).map(m => {
            const active = mode === m
            return (
              <button key={m} onClick={() => pickMode(m)}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#666", background: active ? ACCENT : "transparent", border: "none", borderRadius: 5, cursor: "pointer" }}>
                {m === "purchase" ? "0% Purchases" : "0% Balance Transfer"}
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search card or issuer…"
          style={{ ...input, width: "auto", flex: "1 1 200px", minWidth: 160 }}
        />
        <select value={sort} onChange={e => setSort(e.target.value as AprSort)} style={{ ...select, width: "auto", minWidth: 170 }}>
          <option value="length">Sort: longest 0% window</option>
          <option value="goto">Sort: lowest go-to APR</option>
          <option value="af">Sort: lowest annual fee</option>
          {mode === "bt" && <option value="btfee">Sort: lowest transfer fee</option>}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={noAF} onChange={e => setNoAF(e.target.checked)} />
          No annual fee
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={bizOnly}
            onChange={e => { setBizOnly(e.target.checked); track("intro_apr_finder_biz", { on: e.target.checked }) }}
          />
          Won&apos;t hit personal credit
          <InfoTip term="businessNoPersonalReport" label="business cards & personal credit" size={14} />
        </label>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e8e8e8", textAlign: "left", color: "#888" }}>
              <th style={th}>Card</th>
              <th style={{ ...th, textAlign: "right" }}>{metricLabel}</th>
              <th style={{ ...th, textAlign: "right" }}>Go-to APR</th>
              <th style={{ ...th, textAlign: "right" }}>Annual fee</th>
              {mode === "bt"
                ? <th style={{ ...th, textAlign: "right" }}>Transfer fee</th>
                : <th style={{ ...th, textAlign: "right" }}>Welcome</th>}
              <th style={{ ...th, textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {shown.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CardArt card={c} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 230 }}>{c.card_name}</div>
                      <div style={{ fontSize: 11, color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ textTransform: "capitalize" }}>{(c.issuer || "").replace(/_/g, " ")}</span>
                        {offPersonalCredit(c) && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", borderRadius: 99, padding: "1px 6px", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                            BUSINESS · OFF PERSONAL CREDIT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ ...td, textAlign: "right" }}>
                  <span style={{ fontWeight: 800, color: ACCENT, fontSize: 15 }}>{introMonths(c, mode)}</span>
                  <span style={{ fontSize: 11, color: "#bbb" }}> mo</span>
                </td>
                <td style={{ ...td, textAlign: "right", color: "#666" }}>{gotoDisplay(c)}</td>
                <td style={{ ...td, textAlign: "right", color: (c.annual_fee ?? 0) === 0 ? ACCENT : "#444" }}>
                  {(c.annual_fee ?? 0) === 0 ? "None" : `$${c.annual_fee}`}
                </td>
                {mode === "bt"
                  ? <td style={{ ...td, textAlign: "right", color: "#666" }}>{c.intro_apr?.bt_fee_pct != null ? `${c.intro_apr.bt_fee_pct}%` : "—"}</td>
                  : <td style={{ ...td, textAlign: "right", color: "#666" }}>{bonusDisplay(c)}</td>}
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {mode === "purchase" && (
                    <button onClick={() => onUse(c.id)}
                      style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "#eef9f4", border: `1px solid ${ACCENT}33`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", marginRight: 6 }}>
                      Model it →
                    </button>
                  )}
                  {hasOfferLink(c) && (
                    <a href={applyUrl(c.id)} target="_blank" rel="noreferrer"
                       onClick={() => track("intro_apr_finder_apply", { card: c.card_name, mode })}
                       style={{ fontSize: 12, fontWeight: 600, color: "#666", textDecoration: "none" }}>
                      Apply
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td style={{ ...td, color: "#999", padding: "20px 8px" }} colSpan={6}>No 0% cards match those filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {ranked.length > ABS_CAP && (
        <div style={{ fontSize: 12, color: "#999", marginTop: 10 }}>
          Showing the top {ABS_CAP} of {ranked.length}. Search or add a filter to narrow it down.
        </div>
      )}
    </div>
  )
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
  // Minimum payment — paying it each cycle pulls cash out of the float early, so
  // it earns less. Default to the common max($40, 1% of balance).
  const [minPayFloor, setMinPayFloor] = useState(40)
  const [minPayPct, setMinPayPct] = useState(1)

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null
  const calcRef = useRef<HTMLHeadingElement>(null)

  function modelCard(cardId: string) {
    applyCard(cardId)
    track("intro_apr_finder_use", { card: cardId })
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

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
    // cpp_value is dollars per point (~0.01–0.05 for points cards). Cash/no-reward
    // cards use the sentinel cpp_value: 1 ("a point is a dollar") — map that to 1¢
    // per point, NOT 100¢, or everyday-earn values every point at $1 (the 204% bug).
    setCppCents(c.cpp_value && c.cpp_value < 0.5 ? Math.round(c.cpp_value * 1000) / 10 : 1)
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
    minPaymentFloor: minPayFloor,
    minPaymentPct: minPayPct / 100,
  }), [monthlySpend, spendMonths, promoMonths, hysaApyPct, pointsPerDollar, cppCents, welcomeBonusPoints, welcomeBonusMinSpend, welcomeBonusWindowMonths, taxRatePct, annualFee, minPayFloor, minPayPct])

  const goToApr = selectedCard?.intro_apr?.go_to_apr_high

  return (
    <div>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          0% APR Cards <InfoTip term="introApr" label="0% intro APR" size={16} />
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24, maxWidth: 720, lineHeight: 1.55 }}>
          The play in plain English: put everyday spending on a 0% intro-APR card, pay only the minimum, and keep the cash
          you&apos;d have spent in your HYSA earning interest — then pay the card off in full before the 0% ends. Below, find the
          longest 0% cards (for purchases or balance transfers), ranked by the length of the no-interest window, then model
          exactly what that float is worth.
        </p>

        <BestZeroAprCards onUse={modelCard} />

        <h2 ref={calcRef} style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 32, marginBottom: 6, scrollMarginTop: 16 }}>
          What a 0% window is worth — float calculator
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 12, maxWidth: 720, lineHeight: 1.55 }}>
          Ride a card&apos;s 0% intro APR, pay only the minimum, and leave the cash that would have paid the bill
          in your HYSA earning interest. The bank floats your balance for free. This shows what that float is worth —
          stacked on top of your everyday earn and welcome bonus — and how the interest <b>decays</b> the later in the
          promo you spend (which is why re-upping a fresh card every ~6 months keeps the rate high).
        </p>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24, maxWidth: 720, lineHeight: 1.55 }}>
          The 0% period usually starts when you open the card. Any balance left when it ends jumps to the regular APR —
          pay it off before then.
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
              <Field label="Min payment" suffix="$" value={minPayFloor} onChange={setMinPayFloor} />
            </Row>
            <Row>
              <Field label="…or % of balance" suffix="%" step={0.5} value={minPayPct} onChange={setMinPayPct} />
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
              {result.minPaymentDrag > 0 && (
                <BreakdownRow k="− Minimum payments" v={`-${money(result.minPaymentDrag)}`} sub={`${money(result.minPaymentTotal)} paid down early @ $${minPayFloor} or ${minPayPct}%`} muted />
              )}
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
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
              Cash spent earlier in the 0% window sits in your savings longer, earning more — so spending later earns less.
              That&apos;s why the return &ldquo;decays&rdquo; toward the end.
            </div>
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
