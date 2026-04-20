"use client"

import React, { useEffect, useState, useCallback } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import { getOwnedCards, addOwnedCard, updateOwnedCard, deleteOwnedCard, OwnedCard, SPENDING_CATEGORIES, CATEGORY_LABELS } from "../../../lib/ownedCards"
import { getSpendingProfile, upsertSpendingProfile, SpendingProfile, DEFAULT_SPENDING_PROFILE } from "../../../lib/spendingProfile"
import { createClient } from "../../../lib/supabase/client"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"
import { getPostByBonusId } from "../../../lib/data/blogPosts"
import { isAirlineOrHotelCard } from "../../../lib/cardCategorization"
import { matchOwnedCardCandidates } from "../../../lib/catalogMatching"
import CatalogMatchPicker from "../../components/CatalogMatchPicker"
import { sequenceCards, formatCurrency } from "../../../lib/ccSequencer"
import CreditCardProgress from "../../components/CreditCardProgress"

const money = (n: number) => `$${n.toLocaleString()}`
const todayStr = () => new Date().toISOString().split("T")[0]

const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%" }
const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }

const STATUS_OPTIONS = ["planned", "active", "completed", "canceled"] as const

export default function SpendingClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [profile, setProfile] = useState<SpendingProfile>({ user_id: userId, ...DEFAULT_SPENDING_PROFILE, updated_at: "" })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [expandedRecCard, setExpandedRecCard] = useState<string | null>(null)
  const [includeHotelAirline, setIncludeHotelAirline] = useState(false)
  const [recSearch, setRecSearch] = useState("")
  const [matchingCardId, setMatchingCardId] = useState<string | null>(null)

  // Form state
  const [fCardName, setFCardName] = useState("")
  const [fIssuer, setFIssuer] = useState("")
  const [fSignupBonus, setFSignupBonus] = useState("")
  const [fAnnualFee, setFAnnualFee] = useState("")
  const [fSpendReq, setFSpendReq] = useState("")
  const [fSpendDeadline, setFSpendDeadline] = useState("")
  const [fOpenedDate, setFOpenedDate] = useState(todayStr())
  const [fExpectedValue, setFExpectedValue] = useState("")
  const [fActualValue, setFActualValue] = useState("")
  const [fStatus, setFStatus] = useState<OwnedCard["status"]>("planned")
  const [fNotes, setFNotes] = useState("")
  const [fMultipliers, setFMultipliers] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    const [c, p] = await Promise.all([
      getOwnedCards(userId),
      getSpendingProfile(userId),
    ])
    setCards(c)
    setProfile(p)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setFCardName(""); setFIssuer(""); setFSignupBonus(""); setFAnnualFee(""); setFSpendReq("")
    setFSpendDeadline(""); setFOpenedDate(todayStr()); setFExpectedValue(""); setFActualValue("")
    setFStatus("planned"); setFNotes(""); setFMultipliers({}); setEditingId(null); setShowAdvancedModal(false)
  }

  function populateForm(c: OwnedCard) {
    setFCardName(c.card_name); setFIssuer(c.issuer ?? ""); setFSignupBonus(String(c.signup_bonus_value ?? ""))
    setFAnnualFee(String(c.annual_fee ?? "")); setFSpendReq(String(c.spend_requirement ?? ""))
    setFSpendDeadline(c.spend_deadline ?? ""); setFOpenedDate(c.opened_date ?? todayStr())
    setFExpectedValue(String(c.expected_value ?? "")); setFActualValue(String(c.actual_value ?? ""))
    setFStatus(c.status); setFNotes(c.notes ?? "")
    const mults: Record<string, string> = {}
    for (const [k, v] of Object.entries(c.category_multipliers ?? {})) mults[k] = String(v)
    setFMultipliers(mults)
    setShowAdvancedModal(Object.keys(mults).length > 0)
  }

  async function handleSave() {
    const multipliers: Record<string, number> = {}
    for (const [k, v] of Object.entries(fMultipliers)) {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) multipliers[k] = n
    }
    const payload = {
      card_name: fCardName,
      issuer: fIssuer || null,
      signup_bonus_value: fSignupBonus ? parseFloat(fSignupBonus) : null,
      annual_fee: fAnnualFee ? parseFloat(fAnnualFee) : 0,
      spend_requirement: fSpendReq ? parseFloat(fSpendReq) : null,
      spend_deadline: fSpendDeadline || null,
      opened_date: fOpenedDate || null,
      category_multipliers: multipliers,
      expected_value: fExpectedValue ? parseFloat(fExpectedValue) : null,
      actual_value: fActualValue ? parseFloat(fActualValue) : null,
      status: fStatus,
      notes: fNotes || null,
    }
    if (editingId) {
      await updateOwnedCard(editingId, payload)
    } else {
      await addOwnedCard(userId, payload)
    }
    resetForm()
    setShowAdd(false)
    await loadData()
  }

  async function handleDelete(id: string) {
    await deleteOwnedCard(id)
    await loadData()
  }

  // Profile save with debounce
  const profileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function updateProfile(updates: Partial<SpendingProfile>) {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (profileTimeout.current) clearTimeout(profileTimeout.current)
    profileTimeout.current = setTimeout(() => {
      upsertSpendingProfile({ user_id: userId, ...updates })
    }, 400)
  }

  // Calculations
  const activeCards = cards.filter(c => c.status === "active")
  const plannedCards = cards.filter(c => c.status === "planned")
  const completedCards = cards.filter(c => c.status === "completed")
  const canceledCards = cards.filter(c => c.status === "canceled")

  const monthlySpend = profile.monthly_spend ?? 0
  const baseRate = profile.current_multipliers?.["base"] ?? 2
  const baseAnnualRewards = (monthlySpend * baseRate * 12) / 100

  const totalEarned = completedCards.reduce((s, c) => s + (c.actual_value ?? c.expected_value ?? 0), 0)
  const inProgressValue = activeCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)
  const plannedValue = plannedCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)

  // Sequencer: filter out cards user is already tracking + airline/hotel toggle.
  // Default hides airline/hotel-loyalty cards because their points are not
  // straightforwardly redeemable for cash. Detection lives in lib/cardCategorization
  // (name-based keyword match — bonus_currency is too inconsistent post-RWP-import).
  const trackedNames = new Set(cards.map(c => c.card_name.toLowerCase()))
  const recSearchQ = recSearch.trim().toLowerCase()
  const ccSequence = sequenceCards(creditCardBonuses, monthlySpend || 2000)
    .filter(sc => !trackedNames.has(sc.card.card_name.toLowerCase()))
    .filter(sc => includeHotelAirline || !isAirlineOrHotelCard(sc.card))
    .filter(sc => !recSearchQ || sc.card.card_name.toLowerCase().includes(recSearchQ) || sc.card.issuer.toLowerCase().includes(recSearchQ))

  function addFromRecommendation(sc: (typeof ccSequence)[0]) {
    const c = sc.card
    const deadlineDate = new Date()
    deadlineDate.setMonth(deadlineDate.getMonth() + c.spend_months)
    resetForm()
    setFCardName(c.card_name)
    setFIssuer(c.issuer)
    setFSignupBonus(String(Math.round(c.bonus_amount * c.cpp_value)))
    setFAnnualFee(String(c.annual_fee_waived_first_year ? 0 : c.annual_fee))
    setFSpendReq(String(c.min_spend))
    setFSpendDeadline(deadlineDate.toISOString().split("T")[0])
    setFExpectedValue(String(Math.round(sc.net_value)))
    setFStatus("planned")
    setFNotes(`${c.bonus_amount.toLocaleString()} ${c.bonus_currency}${c.is_hotel_card ? " (hotel — 0.5 cpp)" : ""}\n${c.offer_link}`)
    setShowAdd(true)
  }

  // Can the user hit the spend requirement for active cards?
  function canHitSpend(c: OwnedCard): { canHit: boolean; monthsNeeded: number } {
    if (!c.spend_requirement || monthlySpend <= 0) return { canHit: false, monthsNeeded: 0 }
    const months = Math.ceil(c.spend_requirement / monthlySpend)
    if (c.spend_deadline) {
      const deadlineDate = new Date(c.spend_deadline + "T00:00:00")
      const now = new Date()
      const monthsAvailable = Math.max(0, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + deadlineDate.getMonth() - now.getMonth())
      return { canHit: months <= monthsAvailable, monthsNeeded: months }
    }
    return { canHit: true, monthsNeeded: months }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#999", fontSize: 14 }}>Loading...</div></div>
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", color: "#1a1a1a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .rm-topbar { padding: 14px 32px; }
        .rm-topbar-email { font-size: 12px; color: #bbb; }
        .rm-content { padding: 28px 32px 80px; }
        @media (max-width: 768px) {
          .rm-topbar { padding: 12px 16px; }
          .rm-topbar-email { display: none; }
          .rm-content { padding: 16px 16px 80px; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="rm-topbar" style={{ borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", background: "#fff" }}>
        <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", textDecoration: "none" }}>Stacks OS</a>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select value="" onChange={async e => {
            if (!e.target.value) return
            const sb = createClient()
            await sb.from("user_profiles").update({ state: e.target.value }).eq("user_id", userId)
          }}
            style={{ fontSize: 12, color: "#999", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
            <option value="">State</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setShowProfile(s => !s)} style={topBtn}>{showProfile ? "Close" : "Spending Profile"}</button>
          <button onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          }} style={topBtn}>Subscription</button>
          <button onClick={handleLogout} style={topBtn}>Log out</button>
        </div>
      </div>

      <CheckpointNav />

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* Spending Profile Panel */}
        {showProfile && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Spending Profile</div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={label}>Available monthly spend</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                  <input type="number" value={profile.monthly_spend ?? ""} onChange={e => updateProfile({ monthly_spend: Number(e.target.value) || null })}
                    style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                </div>
              </div>
              <div>
                <div style={label}>Current base earn rate (%)</div>
                <input type="number" step="0.1" value={baseRate}
                  onChange={e => updateProfile({ current_multipliers: { ...profile.current_multipliers, base: parseFloat(e.target.value) || 0 } })}
                  style={{ ...inputStyle, width: 80 }} placeholder="2" />
              </div>
              <div>
                <div style={label}>Rewards valuation</div>
                <select value={profile.rewards_valuation ?? "cashback"} onChange={e => updateProfile({ rewards_valuation: e.target.value as "cashback" | "points" })} style={selectStyle}>
                  <option value="cashback">Cashback</option>
                  <option value="points">Points</option>
                </select>
              </div>
              {profile.rewards_valuation === "points" && (
                <div>
                  <div style={label}>Cents per point</div>
                  <input type="number" step="0.1" value={profile.cpp_valuation ?? ""} onChange={e => updateProfile({ cpp_valuation: parseFloat(e.target.value) || null })}
                    style={{ ...inputStyle, width: 80 }} placeholder="1.5" />
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 12 }}>Changes save automatically</div>

            {/* Advanced: category breakdown */}
            <details style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer" }}>Advanced rewards setup</summary>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>Break down your monthly spend by category for more accurate tracking.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {SPENDING_CATEGORIES.map(cat => (
                    <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 11, color: "#999" }}>{CATEGORY_LABELS[cat]}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 12 }}>$</span>
                          <input type="number" value={profile.category_spend?.[cat] ?? ""}
                            onChange={e => updateProfile({ category_spend: { ...profile.category_spend, [cat]: Number(e.target.value) || 0 } })}
                            style={{ ...inputStyle, paddingLeft: 22, fontSize: 12 }} placeholder="0" />
                        </div>
                        <input type="text" value={profile.current_cards?.[cat] ?? ""}
                          onChange={e => updateProfile({ current_cards: { ...profile.current_cards, [cat]: e.target.value } })}
                          style={{ ...inputStyle, fontSize: 12, flex: 1 }} placeholder="Current card" />
                        <div style={{ position: "relative", width: 60 }}>
                          <input type="number" step="0.1" value={profile.current_multipliers?.[cat] ?? ""}
                            onChange={e => updateProfile({ current_multipliers: { ...profile.current_multipliers, [cat]: parseFloat(e.target.value) || 0 } })}
                            style={{ ...inputStyle, fontSize: 12, width: 60 }} placeholder="1x" />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 11 }}>x</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available spend</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>{money(monthlySpend)}<span style={{ fontSize: 12, fontWeight: 500, color: "#999" }}>/mo</span></div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{baseRate}% base earn = {money(Math.round(baseAnnualRewards))}/yr</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>In progress</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: inProgressValue > 0 ? "#2563eb" : "#111", marginTop: 2 }}>{money(inProgressValue)}</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{activeCards.length} active bonus{activeCards.length !== 1 ? "es" : ""}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", marginTop: 2 }}>{money(totalEarned)}</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{completedCards.length} completed</div>
          </div>
        </div>

        {/* ── Recommended Cards (sequencer) ── */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => setShowRecommendations(!showRecommendations)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showRecommendations ? 12 : 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Recommended Next Cards</div>
            <span style={{ fontSize: 10, color: "#999" }}>{showRecommendations ? "▲" : "▼"}</span>
            <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600, background: "#f0faf5", padding: "2px 8px", borderRadius: 99 }}>
              {formatCurrency(ccSequence.reduce((s, c) => s + c.net_value, 0))} available
            </span>
          </button>

          {showRecommendations && (
            <>
              <div style={{ marginBottom: 10, position: "relative" }}>
                <input
                  type="search"
                  value={recSearch}
                  onChange={e => setRecSearch(e.target.value)}
                  placeholder="Search cards by name or issuer…"
                  style={{
                    width: "100%",
                    padding: "9px 34px 9px 12px",
                    fontSize: 13,
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#111",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {recSearch && (
                  <button
                    onClick={() => setRecSearch("")}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
                    }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999" }}>
                  Ranked by return per month at {money(monthlySpend || 2000)}/mo spend. Points at 1&cent; (0.5&cent; hotel). Net = bonus - fee + year-1 credits.
                  {recSearchQ && <> · <strong>{ccSequence.length}</strong> match{ccSequence.length !== 1 ? "es" : ""} for &ldquo;{recSearch}&rdquo;</>}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                  <div onClick={() => setIncludeHotelAirline(!includeHotelAirline)}
                    style={{
                      width: 36, height: 20, borderRadius: 10, position: "relative",
                      background: includeHotelAirline ? "#0d7c5f" : "#ddd", transition: "background 0.2s", cursor: "pointer",
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2,
                      left: includeHotelAirline ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#555" }}>Include airline &amp; hotel cards</span>
                </label>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ccSequence.slice(0, 15).map((sc, idx) => {
                  const isExpanded = expandedRecCard === sc.card.id
                  const accentColor = sc.card.card_type === "business" ? "#7c3aed" : "#2563eb"
                  return (
                    <div key={sc.card.id} style={{
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 20px",
                      borderLeft: `3px solid ${accentColor}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: "#bbb", fontWeight: 700 }}>#{idx + 1}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{sc.card.card_name}</span>
                            {sc.card.card_type === "business" && (
                              <span style={{ fontSize: 9, color: "#7c3aed", background: "#ede9fe", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>BIZ</span>
                            )}
                            {(() => {
                              const post = getPostByBonusId(sc.card.id)
                              if (!post) return null
                              return (
                                <a href={`/blog/${post.slug}`} style={{ fontSize: 10, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                                  Read review ↗
                                </a>
                              )
                            })()}
                          </div>
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {sc.card.bonus_amount.toLocaleString()} {sc.card.bonus_currency}
                            {sc.card.min_spend > 0 && <span style={{ color: "#999" }}> · ${sc.card.min_spend.toLocaleString()} in {sc.card.spend_months}mo</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            AF: {sc.card.annual_fee === 0 ? <span style={{ color: "#0d7c5f" }}>$0</span> : <span>${sc.card.annual_fee}{sc.card.annual_fee_waived_first_year ? " (waived Y1)" : ""}</span>}
                            {sc.card.statement_credits_year1 > 0 && <span> · Credits: ${sc.card.statement_credits_year1}</span>}
                            <span> · Cum: {formatCurrency(sc.cumulative_value)} in {sc.cumulative_months}mo</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>{formatCurrency(sc.net_value)}</div>
                          <div style={{ fontSize: 10, color: "#999" }}>{formatCurrency(sc.return_per_month)}/mo · {sc.months_to_complete.toFixed(1)}mo</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <a href={sc.card.offer_link} target="_blank" rel="noreferrer"
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, background: accentColor, color: "#fff", border: "none", borderRadius: 6, textDecoration: "none", display: "inline-block" }}>
                          Apply
                        </a>
                        <button onClick={() => addFromRecommendation(sc)}
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#0d7c5f", background: "none", border: "1px solid #0d7c5f", borderRadius: 6, cursor: "pointer" }}>
                          + Add to planned
                        </button>
                        <button onClick={() => setExpandedRecCard(isExpanded ? null : sc.card.id)}
                          style={{ padding: "5px 12px", fontSize: 11, color: "#999", background: "none", border: "1px solid #e8e8e8", borderRadius: 6, cursor: "pointer" }}>
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                      {/* Rewards pills — shown inline on every card (not just expanded) so
                          users can size up earning categories at a glance. Upcoming spending
                          optimizer also reads sc.card.rewards for matching user spend. */}
                      {sc.card.rewards && sc.card.rewards.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {sc.card.rewards
                            .slice()
                            .sort((a, b) => b.multiplier - a.multiplier)
                            .slice(0, 5)
                            .map((r, i) => {
                              const cats = r.categories
                                .map((c) => c.replace(/_/g, " "))
                                .join(" + ")
                              const suffix = r.unit === "%" ? "%" : r.unit === "miles" ? "x miles" : "x"
                              return (
                                <span
                                  key={i}
                                  title={r.note ?? undefined}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: "#0d7c5f",
                                    background: "#ecf7f1",
                                    border: "1px solid #cce5d9",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    letterSpacing: "0.02em",
                                  }}
                                >
                                  {r.multiplier}
                                  {suffix} {cats}
                                </span>
                              )
                            })}
                        </div>
                      )}
                      {isExpanded && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 2 }}>
                          {sc.card.key_benefits.map((b, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#666" }}>• {b}</div>
                          ))}
                          {sc.card.is_hotel_card && (
                            <div style={{ fontSize: 10, color: "#d97706", marginTop: 4 }}>Hotel points valued at 0.5&cent; per point</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {ccSequence.length > 15 && (
                  <div style={{ fontSize: 12, color: "#999", textAlign: "center", padding: 8 }}>
                    + {ccSequence.length - 15} more cards available
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Active Cards */}
        {activeCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Active</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCards.map(c => <CardRow key={c.id} card={c} userId={userId} spendCheck={canHitSpend(c)} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateOwnedCard(c.id, { status: s }); await loadData() }}
                isMatching={matchingCardId === c.id}
                onMatchToggle={() => setMatchingCardId(matchingCardId === c.id ? null : c.id)}
                onMatchSelect={async (catalogName) => {
                  await updateOwnedCard(c.id, { card_name: catalogName })
                  setMatchingCardId(null)
                  await loadData()
                }}
              />)}
            </div>
          </div>
        )}

        {/* Planned Cards */}
        {plannedCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planned</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plannedCards.map(c => <CardRow key={c.id} card={c} userId={userId} spendCheck={canHitSpend(c)} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateOwnedCard(c.id, { status: s }); await loadData() }}
                isMatching={matchingCardId === c.id}
                onMatchToggle={() => setMatchingCardId(matchingCardId === c.id ? null : c.id)}
                onMatchSelect={async (catalogName) => {
                  await updateOwnedCard(c.id, { card_name: catalogName })
                  setMatchingCardId(null)
                  await loadData()
                }}
              />)}
            </div>
          </div>
        )}

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          style={{ fontSize: 13, fontWeight: 600, color: "#0d7c5f", background: "none", border: "1px solid #0d7c5f", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginBottom: 28 }}>
          + Add spending card / bonus
        </button>

        {/* Completed */}
        {completedCards.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Completed ({completedCards.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {completedCards.map(c => <CardRow key={c.id} card={c} userId={userId} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateOwnedCard(c.id, { status: s }); await loadData() }}
                isMatching={matchingCardId === c.id}
                onMatchToggle={() => setMatchingCardId(matchingCardId === c.id ? null : c.id)}
                onMatchSelect={async (catalogName) => {
                  await updateOwnedCard(c.id, { card_name: catalogName })
                  setMatchingCardId(null)
                  await loadData()
                }}
              />)}
            </div>
          </details>
        )}

        {/* Canceled */}
        {canceledCards.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Canceled ({canceledCards.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {canceledCards.map(c => <CardRow key={c.id} card={c} userId={userId} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateOwnedCard(c.id, { status: s }); await loadData() }}
                isMatching={matchingCardId === c.id}
                onMatchToggle={() => setMatchingCardId(matchingCardId === c.id ? null : c.id)}
                onMatchSelect={async (catalogName) => {
                  await updateOwnedCard(c.id, { card_name: catalogName })
                  setMatchingCardId(null)
                  await loadData()
                }}
              />)}
            </div>
          </details>
        )}

        {/* Add/Edit Modal */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); resetForm() } }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 20 }}>
                {editingId ? "Edit Card / Bonus" : "Add Spending Card / Bonus"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={label}>Card name *</div>
                  <input value={fCardName} onChange={e => setFCardName(e.target.value)} style={inputStyle} placeholder="e.g. Chase Sapphire Preferred" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Issuer</div>
                    <input value={fIssuer} onChange={e => setFIssuer(e.target.value)} style={inputStyle} placeholder="e.g. Chase" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Status</div>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value as OwnedCard["status"])} style={{ ...selectStyle, width: "100%" }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Sign-up bonus value</div>
                    <input type="number" value={fSignupBonus} onChange={e => setFSignupBonus(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Annual fee</div>
                    <input type="number" value={fAnnualFee} onChange={e => setFAnnualFee(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Spend requirement</div>
                    <input type="number" value={fSpendReq} onChange={e => setFSpendReq(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Spend deadline</div>
                    <input type="date" value={fSpendDeadline} onChange={e => setFSpendDeadline(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <div style={label}>Opened date</div>
                  <input type="date" value={fOpenedDate} onChange={e => setFOpenedDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Expected net value</div>
                    <input type="number" value={fExpectedValue} onChange={e => setFExpectedValue(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Actual value received</div>
                    <input type="number" value={fActualValue} onChange={e => setFActualValue(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>
                <div>
                  <div style={label}>Notes</div>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Any notes..." />
                </div>

                {/* Advanced: category multipliers */}
                <details open={showAdvancedModal} onToggle={e => setShowAdvancedModal((e.target as HTMLDetailsElement).open)}>
                  <summary style={{ fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer" }}>Advanced: category multipliers</summary>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    {SPENDING_CATEGORIES.map(cat => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#555", width: 100 }}>{CATEGORY_LABELS[cat]}</span>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input type="number" step="0.1" value={fMultipliers[cat] ?? ""} onChange={e => setFMultipliers(prev => ({ ...prev, [cat]: e.target.value }))}
                            style={{ ...inputStyle, fontSize: 12 }} placeholder="1" />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 11 }}>x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button onClick={() => { setShowAdd(false); resetForm() }}
                  style={{ padding: "10px 20px", fontSize: 13, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!fCardName}
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: fCardName ? "#0d7c5f" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: fCardName ? "pointer" : "default" }}>
                  {editingId ? "Save Changes" : "Add Card"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardRow({ card: c, spendCheck, userId, onEdit, onDelete, onStatusChange, isMatching, onMatchToggle, onMatchSelect }: {
  card: OwnedCard
  spendCheck?: { canHit: boolean; monthsNeeded: number }
  userId: string
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: OwnedCard["status"]) => void
  isMatching: boolean
  onMatchToggle: () => void
  onMatchSelect: (catalogCardName: string) => Promise<void>
}) {
  const netValue = c.expected_value ?? ((c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0))
  const statusColors: Record<string, string> = { planned: "#7c3aed", active: "#2563eb", completed: "#0d7c5f", canceled: "#999" }
  const catalogExact = creditCardBonuses.find(cc => cc.card_name.toLowerCase() === c.card_name.toLowerCase())

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.card_name}</span>
            {c.issuer && <span style={{ fontSize: 11, color: "#999" }}>{c.issuer}</span>}
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: statusColors[c.status] ?? "#999", background: c.status === "active" ? "#eff6ff" : c.status === "completed" ? "#e6f5f0" : c.status === "planned" ? "#ede9fe" : "#f5f5f5" }}>
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </span>
            {(() => {
              const post = catalogExact ? getPostByBonusId(catalogExact.id) : null
              if (!post) return null
              return (
                <a href={`/blog/${post.slug}`} style={{ fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 500 }}>
                  Read review ↗
                </a>
              )
            })()}
            {!catalogExact && (
              <button
                onClick={onMatchToggle}
                title="Link this card to its official catalog entry to unlock rewards, apply link, and review"
                style={{ fontSize: 10, padding: "2px 8px", border: "1px solid #a7f3d0", color: "#0d7c5f", background: "#f0faf5", borderRadius: 99, cursor: "pointer", fontWeight: 700 }}
              >
                {isMatching ? "Cancel" : "Match catalog"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {c.signup_bonus_value != null && <span>Bonus: <strong>${c.signup_bonus_value.toLocaleString()}</strong></span>}
            {(c.annual_fee ?? 0) > 0 && <span>Fee: ${c.annual_fee}/yr</span>}
            {c.spend_requirement != null && <span>Spend: ${c.spend_requirement.toLocaleString()} req</span>}
            {c.spend_deadline && <span>By: {c.spend_deadline}</span>}
          </div>
          {/* Spend feasibility indicator */}
          {spendCheck && c.spend_requirement != null && c.spend_requirement > 0 && (
            <div style={{ fontSize: 11, marginTop: 4, color: spendCheck.canHit ? "#0d7c5f" : "#d97706", fontWeight: 500 }}>
              {spendCheck.canHit
                ? `~${spendCheck.monthsNeeded} month${spendCheck.monthsNeeded !== 1 ? "s" : ""} to hit spend`
                : "May not hit spend in time"}
            </div>
          )}
          {c.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{c.notes}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: netValue >= 0 ? "#0d7c5f" : "#dc2626" }}>
            {netValue >= 0 ? "+" : ""}{money(Math.abs(netValue))}
          </div>
          <div style={{ fontSize: 10, color: "#999" }}>net of fee</div>
          {c.actual_value != null && (
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Actual: ${c.actual_value.toLocaleString()}</div>
          )}
        </div>
      </div>
      {c.status === "active" && (
        <CreditCardProgress
          userId={userId}
          cardId={c.id}
          spendRequirement={c.spend_requirement}
          spendDeadline={c.spend_deadline}
          openedDate={c.opened_date}
        />
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        {c.status === "planned" && (
          <button onClick={() => onStatusChange("active")}
            style={{ fontSize: 11, padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Start
          </button>
        )}
        {c.status === "active" && (
          <button onClick={() => onStatusChange("completed")}
            style={{ fontSize: 11, padding: "4px 12px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Complete
          </button>
        )}
        <button onClick={onEdit}
          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#555", background: "none", borderRadius: 6, cursor: "pointer" }}>
          Edit
        </button>
        <button onClick={onDelete}
          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 6, cursor: "pointer" }}>
          Remove
        </button>
      </div>
      {isMatching && (
        <CatalogMatchPicker
          sourceName={c.card_name}
          topCandidates={matchOwnedCardCandidates(c.card_name)}
          allCandidates={creditCardBonuses.filter(cc => !cc.expired).map(cc => ({ id: cc.id, name: cc.card_name }))}
          onMatch={async (_id, name) => {
            await onMatchSelect(name)
          }}
          onCancel={onMatchToggle}
          actionLabel="Match card"
        />
      )}
    </div>
  )
}
