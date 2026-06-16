"use client"

import React, { useEffect, useState, useCallback } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import ElevatedBadge from "../../components/ElevatedBadge"
import { getOwnedCards, addOwnedCard, updateOwnedCard, deleteOwnedCard, OwnedCard } from "../../../lib/ownedCards"
import {
  CATEGORY_LABELS,
  SPENDING_CATEGORIES_EXTRA,
  SPENDING_CATEGORIES_PRIMARY,
  type SpendingCategory,
} from "../../../lib/spendingCategories"
import { computeCategoryGaps, GAP_MIN_MONTHLY_SPEND } from "../../../lib/categoryGaps"
import { getSpendingProfile, upsertSpendingProfile, SpendingProfile, DEFAULT_SPENDING_PROFILE } from "../../../lib/spendingProfile"
import { creditCardBonuses, type CreditCardBonus } from "../../../lib/data/creditCardBonuses"
import { getPostByBonusId } from "../../../lib/data/blogPosts"
import { cardVisibleInRewardsMode } from "../../../lib/cardCategorization"
import { matchOwnedCardCandidates } from "../../../lib/catalogMatching"
import CatalogMatchPicker from "../../components/CatalogMatchPicker"
import AlreadyHaveForm from "../../components/AlreadyHaveForm"
import VerifiedBadge from "../../components/VerifiedBadge"
import { applyUrl } from "../../../lib/affiliateLinks"
import { getVerificationStateMap, type VerificationState } from "../../../lib/verificationState"
import { sequenceCards, formatCurrency, DEFAULT_MAX_CARDS_PER_YEAR, type CardRankingMode } from "../../../lib/ccSequencer"
import { track } from "../../../lib/analytics"
import { TRAVEL_CPP } from "../../../lib/travelCpp"
import { signupBonusValue, signupYearOneValue } from "../../../lib/data/cardSpendValue"
import { TRANSFER_PROGRAMS, US_STATES, findTransferProgram } from "../../../lib/data/catalogTaxonomy"
import { transferKind } from "../../../lib/data/travelValue"
import { DEFAULT_BENEFIT_PROFILE, type UserBenefitProfile } from "../../../lib/cardBenefits"
import { computeWalletSlots } from "../../../lib/walletSlots"
import CreditCardProgress from "../../components/CreditCardProgress"
import { useProfile as useUserProfile } from "../../components/ProfileProvider"
import SpendingCategoryPicker from "../../components/SpendingCategoryPicker"

const money = (n: number) => `$${n.toLocaleString()}`
const todayStr = () => new Date().toISOString().split("T")[0]

const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%" }
const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }

const STATUS_OPTIONS = ["planned", "active", "completed", "canceled"] as const

export default function SpendingClient({ userEmail, userId, isPaid }: { userEmail: string; userId: string; isPaid: boolean }) {
  const { profile: userProfile, setProfile: setUserProfile } = useUserProfile()
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [profile, setProfile] = useState<SpendingProfile>({ user_id: userId, ...DEFAULT_SPENDING_PROFILE, updated_at: "" })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [addedProfileCategories, setAddedProfileCategories] = useState<SpendingCategory[]>([])
  const [addedModalCategories, setAddedModalCategories] = useState<SpendingCategory[]>([])
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [expandedRecCard, setExpandedRecCard] = useState<string | null>(null)
  // Application pace cap. Defaults to 4 cards/yr (≈90-day spacing).
  // Persisted to localStorage so the chosen pace survives reloads and
  // stays in sync with the dashboard's spending projection.
  const [maxCardsPerYear, setMaxCardsPerYear] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_MAX_CARDS_PER_YEAR
    const v = Number(localStorage.getItem("stacks_cc_pace") ?? "")
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_MAX_CARDS_PER_YEAR
  })
  // Rewards Mode (Cash | Travel). Default Cash. Travel mode swaps the
  // sequencer's cpp valuations to TRAVEL_CPP (with optional per-currency
  // overrides from spendingProfile.cpp_overrides).
  const [rewardsMode, setRewardsMode] = useState<"cash" | "travel">(() => {
    if (typeof window === "undefined") return "cash"
    const v = localStorage.getItem("stacks_cc_rewards_mode")
    return v === "travel" ? "travel" : "cash"
  })
  const [rankingMode, setRankingMode] = useState<Extract<CardRankingMode, "max_bonus" | "return_on_spend">>(() => {
    if (typeof window === "undefined") return "return_on_spend"
    return localStorage.getItem("stacks_cc_ranking_mode") === "max_bonus" ? "max_bonus" : "return_on_spend"
  })
  const [travelProgram, setTravelProgram] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem("stacks_cc_travel_program") ?? ""
  })
  const [showCppOverrides, setShowCppOverrides] = useState(false)
  const [cppResetFlash, setCppResetFlash] = useState(false)
  const [recSearch, setRecSearch] = useState("")
  // Recommendation list is capped at the top 15 by merit rank so the page
  // doesn't render the entire catalog. Low-value regional cards unlocked by
  // a state selection rank below that cutoff, so the cap was silently hiding
  // the very cards the status strip advertises as "unlocked". This toggle
  // reveals the full ranked list on demand.
  const [showAllRecs, setShowAllRecs] = useState(false)
  const [matchingCardId, setMatchingCardId] = useState<string | null>(null)
  const [alreadyHaveCardId, setAlreadyHaveCardId] = useState<string | null>(null)
  const [verificationStates, setVerificationStates] = useState<Map<string, VerificationState>>(new Map())

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
  // State and military eligibility live in the shared user profile used by
  // Paycheck, Savings, and the dashboard. Updating them here immediately
  // updates every sequencer instead of maintaining a second local copy.
  const userState = userProfile.state ?? null
  const selectedState = userState ? US_STATES.find(state => state.code === userState) ?? null : null
  const militaryAffiliated = userProfile.military_affiliated === true
  const regionalCardCount = userState
    ? creditCardBonuses.filter(c => !c.expired && c.state_restricted?.includes(userState)).length
    : 0

  function updateUserState(stateCode: string) {
    setUserProfile({ state: stateCode || null })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [c, p, vStates] = await Promise.all([
      getOwnedCards(userId),
      getSpendingProfile(userId),
      getVerificationStateMap(),
    ])
    setCards(c)
    setProfile(p)
    setVerificationStates(vStates)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setFCardName(""); setFIssuer(""); setFSignupBonus(""); setFAnnualFee(""); setFSpendReq("")
    setFSpendDeadline(""); setFOpenedDate(todayStr()); setFExpectedValue(""); setFActualValue("")
    setFStatus("planned"); setFNotes(""); setFMultipliers({}); setEditingId(null); setShowAdvancedModal(false); setAddedModalCategories([])
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
    setAddedModalCategories(Object.keys(mults).filter((key): key is SpendingCategory => SPENDING_CATEGORIES_EXTRA.includes(key as SpendingCategory)))
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
      const card = await addOwnedCard(userId, payload)
      if (card) track("bonus_started", { module: "spending", source: "manual_add", card_name: payload.card_name, status: fStatus, expected_value: payload.expected_value ?? 0 })
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
  const selectedProfileCategories = [
    ...SPENDING_CATEGORIES_PRIMARY,
    ...SPENDING_CATEGORIES_EXTRA.filter(category =>
      addedProfileCategories.includes(category) ||
      Boolean(profile.category_spend?.[category]) ||
      Boolean(profile.current_cards?.[category]) ||
      Boolean(profile.current_multipliers?.[category]),
    ),
  ]
  const selectedModalCategories = [
    ...SPENDING_CATEGORIES_PRIMARY,
    ...SPENDING_CATEGORIES_EXTRA.filter(category =>
      addedModalCategories.includes(category) || Boolean(fMultipliers[category]),
    ),
  ]

  function removeProfileCategory(category: SpendingCategory) {
    if (SPENDING_CATEGORIES_PRIMARY.includes(category)) return
    const categorySpend = { ...profile.category_spend }
    const currentCards = { ...profile.current_cards }
    const currentMultipliers = { ...profile.current_multipliers }
    delete categorySpend[category]
    delete currentCards[category]
    delete currentMultipliers[category]
    setAddedProfileCategories(current => current.filter(item => item !== category))
    updateProfile({ category_spend: categorySpend, current_cards: currentCards, current_multipliers: currentMultipliers })
  }

  const totalEarned = completedCards.reduce((s, c) => s + (c.actual_value ?? c.expected_value ?? 0), 0)
  const inProgressValue = activeCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)
  const plannedValue = plannedCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)

  // Sequencer: filter out cards user is already tracking + cash/travel mode.
  //
  // Cash mode shows cards with a cash redemption path. Travel mode includes
  // flexible currencies plus airline and hotel co-brands. A text search acts
  // as a full-catalog lookup rather than silently staying inside the mode.
  const trackedNames = new Set(cards.map(c => c.card_name.toLowerCase()))
  const recSearchQ = recSearch.trim().toLowerCase()
  const isTravel = rewardsMode === "travel"
  const selectedTravelProgram = travelProgram ? findTransferProgram(travelProgram) : null
  const cppOverrides = profile?.cpp_overrides ?? null
  const benefitProfile: UserBenefitProfile = profile?.benefit_usage ?? DEFAULT_BENEFIT_PROFILE
  const ccSequence = sequenceCards(
    creditCardBonuses,
    monthlySpend || 2000,
    userState,
    maxCardsPerYear,
    isTravel,
    cppOverrides,
    militaryAffiliated,
    benefitProfile,
    rankingMode,
    travelProgram || null,
  )
    .filter(sc => !trackedNames.has(sc.card.card_name.toLowerCase()))
    .filter(sc => cardVisibleInRewardsMode(sc.card, rewardsMode, recSearchQ.length > 0))
    .filter(sc => !recSearchQ || sc.card.card_name.toLowerCase().includes(recSearchQ) || sc.card.issuer.toLowerCase().includes(recSearchQ))

  // Wallet-slot view: compute the best card per spending category from the
  // user's owned cards, and the catalog-best for upgrade opportunities.
  const ownedCardObjs = cards
    .map(c => creditCardBonuses.find(cc => cc.card_name.toLowerCase() === c.card_name.toLowerCase()))
    .filter((c): c is CreditCardBonus => !!c)
  const walletSlots = computeWalletSlots(ownedCardObjs, creditCardBonuses)

  function addFromRecommendation(sc: (typeof ccSequence)[0]) {
    const c = sc.card
    const deadlineDate = new Date()
    deadlineDate.setMonth(deadlineDate.getMonth() + c.spend_months)
    resetForm()
    setFCardName(c.card_name)
    setFIssuer(c.issuer)
    setFSignupBonus(String(signupBonusValue(c)))
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

  // Logout lives in the shared StacksAccountMenu rendered by CheckpointNav.

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", textDecoration: "none" }}>Stacks OS</a>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#0d7c5f", background: "#e7f7f0", border: "1px solid #a7f3d0", borderRadius: 99, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spending Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select aria-label="Home state" value={userState ?? ""} onChange={e => updateUserState(e.target.value)}
            style={{ fontSize: 12, color: userState ? "#0d7c5f" : "#999", fontWeight: userState ? 700 : 400, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
            <option value="">Select state</option>
            {US_STATES.map(state => (
              <option key={state.code} value={state.code}>{state.name} ({state.code})</option>
            ))}
          </select>
          <button onClick={() => setShowProfile(s => !s)} style={topBtn}>{showProfile ? "Close" : "Spending Profile"}</button>
          <button onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          }} style={topBtn}>Subscription</button>
        </div>
      </div>

      {/* System status strip — mirrors the paycheck/savings status header */}
      <div style={{ background: "#f0faf5", borderBottom: "1px solid #d1fae5", padding: "8px 0", width: "100%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#555" }}>
            Tracking <strong>{creditCardBonuses.filter(c => !c.expired).length}</strong> credit cards
          </span>
          <span style={{ fontSize: 12, color: "#aaa" }}>·</span>
          <span style={{ fontSize: 12, color: "#555" }}>Sequenced by your chosen bonus-return strategy</span>
          {userState && (
            <>
              <span style={{ fontSize: 12, color: "#aaa" }}>·</span>
              <span style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600 }}>
                {userState}: {regionalCardCount} regional card{regionalCardCount === 1 ? "" : "s"} unlocked
              </span>
            </>
          )}
        </div>
      </div>

      <CheckpointNav />

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* Spending Profile Panel */}
        {showProfile && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Spending Profile</div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ minWidth: 220 }}>
                <div style={label}>Home state</div>
                <select aria-label="Home state in spending profile" value={userState ?? ""} onChange={e => updateUserState(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                  <option value="">— select state —</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>{state.name} ({state.code})</option>
                  ))}
                </select>
                <div style={{ fontSize: 10, color: userState ? "#0d7c5f" : "#999", marginTop: 5 }}>
                  {selectedState
                    ? `${selectedState.name} selected · ${regionalCardCount} regional cards included`
                    : "Shared with Paycheck and used for regional card eligibility"}
                </div>
              </div>
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

            <details style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer" }}>Advanced rewards setup</summary>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>Break down your monthly spend by category. Categories with $50+/month feed the Portfolio Gaps analysis above the recommendations.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                  {selectedProfileCategories.map(cat => (
                    <CategorySpendRow
                      key={cat}
                      cat={cat}
                      label={CATEGORY_LABELS[cat]}
                      profile={profile}
                      updateProfile={updateProfile}
                      inputStyle={inputStyle}
                      removable={!SPENDING_CATEGORIES_PRIMARY.includes(cat)}
                      onRemove={() => removeProfileCategory(cat)}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f3f3f3" }}>
                  <SpendingCategoryPicker
                    selected={selectedProfileCategories}
                    onAdd={category => setAddedProfileCategories(current => current.includes(category) ? current : [...current, category])}
                    placeholder="Add travel, household, or business spend"
                  />
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

        {/* ── Portfolio Gaps (additive, doesn't affect recommendations sort) ──
            Compares the best multiplier across the user's owned cards to the
            best multiplier in the catalog for each category they spend $50+/mo
            on. Surfaces only when there's a 2x+ gap AND ≥$25/yr uplift, so
            tiny edge cases don't clutter the page. */}
        <PortfolioGaps
          ownedCards={cards}
          categorySpend={profile.category_spend ?? {}}
          userId={userId}
          onAdded={loadData}
        />

        {!isPaid && (
          <div style={{
            background: "#fff", border: "2px solid #e8e8e8", borderRadius: 14,
            padding: "20px 22px", marginBottom: 24,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Pro feature
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4 }}>
                Get the ranked credit card queue
              </div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>
                Stacks ranks every signup bonus for your spend — net value, 5/24, cooldowns — and tells you which card to apply for next.
              </div>
            </div>
            <a href="/onboarding" style={{
              fontSize: 13, fontWeight: 700, color: "#fff", background: "#0d7c5f",
              padding: "11px 18px", borderRadius: 10, textDecoration: "none", flexShrink: 0,
            }}>
              Upgrade to Pro →
            </a>
          </div>
        )}

        {/* ── Recommended Cards (sequencer) ── */}
        {isPaid && (
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
              {/* Rewards Mode — Cash uses cash-floor cpp from the catalog.
                  Travel can target a specific transfer program, matching the
                  public site's award-travel finder. */}
              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>
                    Rewards Mode
                    {isTravel && (
                      <span style={{ fontSize: 9, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", borderRadius: 99, fontWeight: 700, marginLeft: 6, letterSpacing: "0.05em" }}>
                        BETA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    {isTravel
                      ? "Valuing points at travel-redemption ceilings. Estimates only — your mileage will vary."
                      : "Cash-floor valuation: 1¢ per point, 0.5¢ per hotel point."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: 2 }}>
                  {(["cash", "travel"] as const).map(mode => {
                    const active = rewardsMode === mode
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setRewardsMode(mode)
                          if (typeof window !== "undefined") localStorage.setItem("stacks_cc_rewards_mode", mode)
                        }}
                        style={{
                          padding: "5px 14px", fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? "#fff" : "#666",
                          background: active ? "#0d7c5f" : "transparent",
                          border: "none", borderRadius: 4, cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {mode}
                      </button>
                    )
                  })}
                </div>
              </div>
              {isTravel && (
                <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Point currency target</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                      Filter to cards that earn that currency directly or can transfer into it.
                    </div>
                  </div>
                  <select
                    value={travelProgram}
                    onChange={e => {
                      setTravelProgram(e.target.value)
                      if (typeof window !== "undefined") localStorage.setItem("stacks_cc_travel_program", e.target.value)
                    }}
                    style={{ ...selectStyle, minWidth: 210 }}
                  >
                    <option value="">All travel currencies</option>
                    <optgroup label="Airlines">
                      {TRANSFER_PROGRAMS.filter(p => p.kind === "airline").map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                    </optgroup>
                    <optgroup label="Hotels">
                      {TRANSFER_PROGRAMS.filter(p => p.kind === "hotel").map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                    </optgroup>
                  </select>
                </div>
              )}
              {isTravel && (
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => setShowCppOverrides(s => !s)}
                    style={{ fontSize: 11, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 600 }}
                  >
                    {showCppOverrides ? "− Hide" : "+ Advanced"} valuation setup
                  </button>
                  {showCppOverrides && (
                    <div style={{ marginTop: 8, padding: "12px 14px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 10, lineHeight: 1.5 }}>
                        Override our default travel-cpp estimates per currency. Enter cents-per-point (e.g. <code>2.2</code> for 2.2¢). Leave blank to use the default.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {Object.keys(TRAVEL_CPP).filter(c => c !== "cash").map(currency => {
                          const def = TRAVEL_CPP[currency]
                          const override = profile?.cpp_overrides?.[currency]
                          const value = override != null ? (override * 100).toString() : ""
                          return (
                            <label key={currency} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555" }}>
                              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currency}</span>
                              <input
                                type="number"
                                step="0.1"
                                value={value}
                                placeholder={(def * 100).toFixed(1)}
                                onChange={async (e) => {
                                  const next = { ...(profile?.cpp_overrides ?? {}) }
                                  if (e.target.value === "") {
                                    delete next[currency]
                                  } else {
                                    const cents = parseFloat(e.target.value)
                                    if (Number.isFinite(cents) && cents > 0) {
                                      next[currency] = cents / 100
                                    }
                                  }
                                  await updateProfile({ cpp_overrides: Object.keys(next).length ? next : null })
                                }}
                                style={{ width: 60, padding: "4px 6px", fontSize: 11, border: "1px solid #e0e0e0", borderRadius: 4, color: "#111" }}
                              />
                              <span style={{ color: "#bbb", fontSize: 10 }}>¢</span>
                            </label>
                          )
                        })}
                      </div>
                      {/* Reset link — clears cpp_overrides to null. Inputs all
                          read from profile.cpp_overrides, so they fall back to
                          placeholder defaults automatically once cleared. */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          onClick={async () => {
                            await updateProfile({ cpp_overrides: null })
                            setCppResetFlash(true)
                            setTimeout(() => setCppResetFlash(false), 2500)
                          }}
                          disabled={!profile?.cpp_overrides || Object.keys(profile.cpp_overrides).length === 0}
                          style={{
                            fontSize: 11, color: "#7c3aed", background: "none", border: "none",
                            padding: 0, cursor: profile?.cpp_overrides && Object.keys(profile.cpp_overrides).length > 0 ? "pointer" : "not-allowed",
                            fontWeight: 600, opacity: profile?.cpp_overrides && Object.keys(profile.cpp_overrides).length > 0 ? 1 : 0.4,
                            textDecoration: "underline",
                          }}
                        >
                          Reset to defaults
                        </button>
                        {cppResetFlash && (
                          <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600 }}>
                            ✓ Valuations reset
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Application pace — caps how many cards land in the active
                  sequence and enforces 90-day spacing between applications. */}
              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Application pace</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    Applying too frequently can temporarily lower your credit score.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: 2 }}>
                  {[2, 3, 4, 6, 8].map(n => {
                    const active = maxCardsPerYear === n
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          setMaxCardsPerYear(n)
                          if (typeof window !== "undefined") localStorage.setItem("stacks_cc_pace", String(n))
                        }}
                        style={{
                          padding: "5px 10px", fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? "#fff" : "#666",
                          background: active ? "#0d7c5f" : "transparent",
                          border: "none", borderRadius: 4, cursor: "pointer",
                        }}
                      >
                        {n}/yr
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Ranking priority</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    Choose the biggest welcome bonus per application or the strongest net return per dollar required.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: 2 }}>
                  {([
                    ["max_bonus", "Max SUB / app"],
                    ["return_on_spend", "Max return / spend"],
                  ] as const).map(([mode, text]) => {
                    const active = rankingMode === mode
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          setRankingMode(mode)
                          if (typeof window !== "undefined") localStorage.setItem("stacks_cc_ranking_mode", mode)
                        }}
                        style={{
                          padding: "5px 10px", fontSize: 12, fontWeight: active ? 700 : 500,
                          color: active ? "#fff" : "#666", background: active ? "#0d7c5f" : "transparent",
                          border: "none", borderRadius: 4, cursor: "pointer",
                        }}
                      >
                        {text}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {rankingMode === "max_bonus" ? "Ranked by welcome-bonus value per application" : "Ranked by net value divided by required spend"} at {money(monthlySpend || 2000)}/mo spend.
                  {selectedTravelProgram && <> Targeting <strong>{selectedTravelProgram.name}</strong>.</>}
                  {recSearchQ && <> · <strong>{ccSequence.length}</strong> match{ccSequence.length !== 1 ? "es" : ""} for &ldquo;{recSearch}&rdquo;</>}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={militaryAffiliated}
                    onChange={e => {
                      const enabled = e.target.checked
                      setUserProfile({ military_affiliated: enabled })
                    }}
                    style={{ accentColor: "#0d7c5f" }}
                  />
                  <span style={{ fontSize: 12, color: "#555" }}>Show USAA / Navy Federal offers</span>
                </label>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(showAllRecs ? ccSequence : ccSequence.slice(0, 15)).map((sc, idx) => {
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
                            <ElevatedBadge card={sc.card} compact />
                            {sc.card.card_type === "business" && (
                              <span style={{ fontSize: 9, color: "#7c3aed", background: "#ede9fe", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>BIZ</span>
                            )}
                            {travelProgram && transferKind(sc.card, travelProgram) === "indirect" && (
                              <span title="These points reach the selected program when pooled into a premium card in the same rewards family" style={{ fontSize: 9, color: "#7c3aed", background: "#f5f3ff", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>POOL</span>
                            )}
                            <VerifiedBadge state={verificationStates.get(sc.card.id)} compact />
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
                          {isTravel && sc.card.bonus_currency !== "cash" && (
                            <div style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>
                              = {sc.card.bonus_amount.toLocaleString()} {sc.card.bonus_currency}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: "#999" }}>
                            {rankingMode === "return_on_spend"
                              ? `${(sc.return_on_spend * 100).toFixed(1)}% return on required spend`
                              : `${formatCurrency(sc.return_per_month)}/mo`}
                            {` · ${sc.months_to_complete.toFixed(1)}mo`}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <a href={applyUrl(sc.card.id)} target="_blank" rel="noreferrer"
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 700, background: accentColor, color: "#fff", border: "none", borderRadius: 6, textDecoration: "none", display: "inline-block" }}>
                          Apply
                        </a>
                        <button onClick={() => addFromRecommendation(sc)}
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#0d7c5f", background: "none", border: "1px solid #0d7c5f", borderRadius: 6, cursor: "pointer" }}>
                          + Add to planned
                        </button>
                        <button onClick={() => setAlreadyHaveCardId(alreadyHaveCardId === sc.card.id ? null : sc.card.id)}
                          title="Record this card as already held so we stop recommending it"
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#555", background: "none", border: "1px solid #d0d0d0", borderRadius: 6, cursor: "pointer" }}>
                          {alreadyHaveCardId === sc.card.id ? "Cancel" : "Already have"}
                        </button>
                        <button onClick={() => setExpandedRecCard(isExpanded ? null : sc.card.id)}
                          style={{ padding: "5px 12px", fontSize: 11, color: "#999", background: "none", border: "1px solid #e8e8e8", borderRadius: 6, cursor: "pointer" }}>
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                      {alreadyHaveCardId === sc.card.id && (
                        <AlreadyHaveForm
                          itemLabel={sc.card.card_name}
                          onSave={async (payload) => {
                            await addOwnedCard(userId, {
                              card_name: sc.card.card_name,
                              issuer: sc.card.issuer,
                              signup_bonus_value: payload.actual_amount ?? null,
                              annual_fee: sc.card.annual_fee,
                              opened_date: payload.opened_date,
                              spend_deadline: null,
                              expected_value: signupYearOneValue(sc.card),
                              actual_value: payload.bonus_received ? payload.actual_amount ?? null : null,
                              status: "completed",
                              role: "daily-driver",
                              source_type: "catalog",
                              canonical_offer_id: sc.card.id,
                              notes: payload.incomplete_info ? "Added via 'Already have' — dates unknown" : null,
                              incomplete_info: payload.incomplete_info,
                            })
                            setAlreadyHaveCardId(null)
                            await loadData()
                          }}
                          onCancel={() => setAlreadyHaveCardId(null)}
                        />
                      )}
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
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Value breakdown — explains *why* this card's net value is what it is */}
                          <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                              Value breakdown
                            </div>
                            <BreakdownRow label="Welcome bonus" value={Math.round(sc.value_breakdown.welcome_bonus)} />
                            {sc.value_breakdown.statement_credits > 0 && (
                              <BreakdownRow label="Statement credits (catalog)" value={sc.value_breakdown.statement_credits} />
                            )}
                            {sc.value_breakdown.benefits_value > 0 && (
                              <BreakdownRow label={`Benefits you'd use (${sc.value_breakdown.included_benefits.length})`} value={sc.value_breakdown.benefits_value} />
                            )}
                            {sc.value_breakdown.annual_fee !== 0 && (
                              <BreakdownRow label="Annual fee" value={sc.value_breakdown.annual_fee} />
                            )}
                            <div style={{ borderTop: "1px solid #e8e8e8", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                              <span>Net year 1</span>
                              <span style={{ color: "#0d7c5f" }}>{formatCurrency(sc.net_value)}</span>
                            </div>
                          </div>
                          {/* Per-benefit list — included + excluded so user can see what they're leaving on table */}
                          {sc.value_breakdown.included_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.05em" }}>Counted</div>
                              {sc.value_breakdown.included_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#666" }}>✓ ${b.annualValue} — {b.label}</div>
                              ))}
                            </div>
                          )}
                          {sc.value_breakdown.excluded_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Not counted (you said you wouldn&apos;t use)</div>
                              {sc.value_breakdown.excluded_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#bbb" }}>○ ${b.annualValue} — {b.label}</div>
                              ))}
                            </div>
                          )}
                          {sc.card.key_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Other features</div>
                              {sc.card.key_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#666" }}>• {b}</div>
                              ))}
                            </div>
                          )}
                          {sc.card.is_hotel_card && (
                            <div style={{ fontSize: 10, color: "#d97706" }}>Hotel points valued at 0.5&cent; per point</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {ccSequence.length > 15 && (
                  <button
                    onClick={() => setShowAllRecs(s => !s)}
                    style={{ width: "100%", fontSize: 12, color: "#0d7c5f", fontWeight: 600, textAlign: "center", padding: 8, background: "none", border: "none", cursor: "pointer" }}>
                    {showAllRecs
                      ? "Show top 15 only ▲"
                      : `+ ${ccSequence.length - 15} more cards available ▼`}
                  </button>
                )}
              </div>

              {/* ─── Benefits I'd use panel ─── */}
              <BenefitsPanel
                profile={benefitProfile}
                onChange={async (next) => {
                  await upsertSpendingProfile({ user_id: userId, benefit_usage: next })
                  await loadData()
                }}
              />

              {/* ─── Wallet-slot view: best card per category ─── */}
              <WalletSlotView slots={walletSlots} ownedCount={ownedCardObjs.length} />
            </>
          )}
        </div>
        )}

        {/* Empty state when no cards at all */}
        {cards.length === 0 && (
          <div style={{
            background: "linear-gradient(135deg, #f3f0ff 0%, #faf8ff 100%)",
            border: "1px solid #ddd6fe",
            borderRadius: 12,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#7c3aed", fontWeight: 700, marginBottom: 4 }}>
              Start here
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#5b21b6", margin: "0 0 6px" }}>
              Add your first credit card
            </h2>
            <p style={{ fontSize: 13, color: "#5b21b6", margin: 0, lineHeight: 1.5 }}>
              {isPaid
                ? "The recommended cards above are sequenced for your spend. Pick one and click “Start” — or use “+ Add a card I already have” to log cards already in your wallet."
                : "Use “+ Add a card I already have” below to track signup bonuses, spend deadlines, and net value across your wallet."}
            </p>
          </div>
        )}

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
                    {selectedModalCategories.map(cat => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#555", width: 130 }}>{CATEGORY_LABELS[cat]}</span>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input type="number" step="0.1" value={fMultipliers[cat] ?? ""} onChange={e => setFMultipliers(prev => ({ ...prev, [cat]: e.target.value }))}
                            style={{ ...inputStyle, fontSize: 12 }} placeholder="1" />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 11 }}>x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <SpendingCategoryPicker
                      selected={selectedModalCategories}
                      onAdd={category => setAddedModalCategories(current => current.includes(category) ? current : [...current, category])}
                      placeholder="Add another multiplier category"
                    />
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
            {c.incomplete_info && (
              <span title="Dates weren't filled in — click Edit to complete, or this card will be excluded from cooldown/churn math"
                style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: "#d97706", background: "#fffbeb", border: "1px solid #fed7aa", cursor: "help" }}>
                ⚠ Needs info
              </span>
            )}
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

// ── Per-category spending row (used by both the legacy 7 and the
//    extra 11). Three inputs in a flex row: $/mo, current card name,
//    multiplier. Hoisted into a reusable component so the form-body
//    doesn't have to duplicate the JSX for the more-categories panel. ──
function CategorySpendRow({
  cat,
  label,
  profile,
  updateProfile,
  inputStyle,
  removable,
  onRemove,
}: {
  cat: SpendingCategory
  label: string
  profile: SpendingProfile
  updateProfile: (updates: Partial<SpendingProfile>) => void
  inputStyle: React.CSSProperties
  removable?: boolean
  onRemove?: () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#999" }}>
        <span>{label}</span>
        {removable && <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} style={{ border: 0, padding: 0, color: "#aaa", background: "transparent", cursor: "pointer" }}>×</button>}
      </div>
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
  )
}

// ── Portfolio Gaps section.
//    Sits above the Recommended Next Cards list. For each spending category
//    where the user reports $50+/mo, compares their best owned-card multiplier
//    to the best multiplier in the catalog they don't already own. Renders one
//    row per category, sorted by annual $ uplift descending. Also embeds a
//    "My current cards" pill list + a quick "+ Add card" search with separate
//    actions for a bonus in progress versus a wallet-only card. ──
function PortfolioGaps({
  ownedCards,
  categorySpend,
  userId,
  onAdded,
}: {
  ownedCards: OwnedCard[]
  categorySpend: Record<string, number>
  userId: string
  onAdded: () => void | Promise<void>
}) {
  const [showAddCard, setShowAddCard] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [adding, setAdding] = React.useState<string | null>(null)

  const gaps = React.useMemo(
    () => computeCategoryGaps(creditCardBonuses, ownedCards, categorySpend),
    [ownedCards, categorySpend],
  )
  const flagged = gaps.filter(g => g.flagged)
  const ownedActive = ownedCards.filter(c => c.status === "active" || c.status === "completed")

  const ownedNameSet = React.useMemo(
    () => new Set(ownedCards.map(c => c.card_name.toLowerCase())),
    [ownedCards],
  )
  const searchResults = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return creditCardBonuses
      .filter(cc => !cc.expired && !ownedNameSet.has(cc.card_name.toLowerCase()))
      .filter(cc =>
        cc.card_name.toLowerCase().includes(q) ||
        cc.issuer.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [search, ownedNameSet])

  async function quickAddOwned(card: CreditCardBonus, status: "active" | "completed") {
    setAdding(card.id)
    const openedDate = status === "active" ? todayStr() : null
    const deadlineDate = new Date(`${openedDate ?? todayStr()}T00:00:00`)
    deadlineDate.setMonth(deadlineDate.getMonth() + card.spend_months)
    await addOwnedCard(userId, {
      card_name: card.card_name,
      issuer: card.issuer,
      annual_fee: card.annual_fee,
      signup_bonus_value: status === "active" ? signupBonusValue(card) : null,
      spend_requirement: status === "active" ? card.min_spend : null,
      spend_deadline: status === "active" ? deadlineDate.toISOString().split("T")[0] : null,
      opened_date: openedDate,
      expected_value: status === "active" ? signupYearOneValue(card) : null,
      status,
      role: status === "active" ? "sub-in-progress" : "daily-driver",
      source_type: "catalog",
      canonical_offer_id: card.id,
      incomplete_info: status === "completed",
      notes: status === "active"
        ? "Added via Portfolio Gaps — actively working on welcome bonus"
        : "Added via Portfolio Gaps — wallet card, dates not entered",
    })
    setSearch("")
    setShowAddCard(false)
    setAdding(null)
    await onAdded()
  }

  // No owned cards AND no spend entered yet — render a gentle prompt instead
  // of a blank section. Pre-empts user confusion ("nothing here?").
  const hasAnySpend = Object.values(categorySpend).some(v => (v ?? 0) >= GAP_MIN_MONTHLY_SPEND)
  if (ownedActive.length === 0 && !hasAnySpend) {
    return (
      <div style={{ marginBottom: 28, background: "#fafafa", border: "1px dashed #e0e0e0", borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>Portfolio Gaps</div>
        <div style={{ fontSize: 12, color: "#999" }}>
          Open <strong>Spending Profile</strong> at the top right and enter monthly spend by category, then add the cards you currently use to see where your portfolio has gaps worth filling.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Portfolio Gaps</div>
        <div style={{ fontSize: 11, color: "#999" }}>
          {flagged.length > 0
            ? <><strong style={{ color: "#d97706" }}>{flagged.length}</strong> categor{flagged.length === 1 ? "y" : "ies"} earning below catalog best</>
            : "No major gaps in categories you spend $50+/mo on"}
        </div>
      </div>

      {/* My current cards pill list — single source of truth is owned_cards. */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          My current cards ({ownedActive.length})
        </div>
        {ownedActive.length === 0 ? (
          <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
            None added. Add the cards you currently use so we can compute where your portfolio has gaps.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {ownedActive.map(c => (
              <span key={c.id} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: 600,
                color: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe",
              }}>
                {c.card_name}
              </span>
            ))}
          </div>
        )}
        {!showAddCard ? (
          <button onClick={() => setShowAddCard(true)}
            style={{ fontSize: 11, color: "#0d7c5f", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700 }}>
            + Add card
          </button>
        ) : (
          <div>
            <input
              type="search"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by card name or issuer…"
              style={{
                width: "100%", padding: "7px 10px", fontSize: 12, color: "#111",
                border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff",
                boxSizing: "border-box",
              }}
            />
            {search.trim().length >= 2 && (
              <div style={{ marginTop: 6, maxHeight: 240, overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: 6 }}>
                {searchResults.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#999", padding: "8px 10px" }}>No matches.</div>
                ) : searchResults.map(card => (
                  <div key={card.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#fff", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#111", fontWeight: 600 }}>{card.card_name}</div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>
                        {card.issuer}
                        {signupBonusValue(card) > 0 && <> · ${signupBonusValue(card).toLocaleString()} after ${card.min_spend.toLocaleString()}</>}
                      </div>
                    </div>
                    {signupBonusValue(card) > 0 && card.min_spend > 0 && (
                      <button onClick={() => quickAddOwned(card, "active")} disabled={adding !== null}
                        style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#2563eb", border: "none", borderRadius: 5, padding: "5px 8px", cursor: adding ? "not-allowed" : "pointer" }}>
                        Track SUB
                      </button>
                    )}
                    <button onClick={() => quickAddOwned(card, "completed")} disabled={adding !== null}
                      style={{ fontSize: 10, fontWeight: 600, color: "#555", background: "#fff", border: "1px solid #ddd", borderRadius: 5, padding: "5px 8px", cursor: adding ? "not-allowed" : "pointer" }}>
                      {adding === card.id ? "Adding…" : "Add to wallet"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowAddCard(false); setSearch("") }}
              style={{ marginTop: 6, fontSize: 11, color: "#999", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Gap rows — only flagged ones surface; unflagged categories are silent. */}
      {gaps.length === 0 ? (
        <div style={{ fontSize: 12, color: "#999", padding: "8px 0" }}>
          Add monthly spend amounts in your Spending Profile (top right) for the categories you actually use.
        </div>
      ) : flagged.length === 0 ? (
        <div style={{ fontSize: 12, color: "#0d7c5f", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 14px" }}>
          Your portfolio covers every $50+/mo category at or above catalog best. Nothing to fill.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {flagged.map(g => (
            <GapRow key={g.spendingCategory} gap={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function GapRow({ gap }: { gap: ReturnType<typeof computeCategoryGaps>[number] }) {
  const label = CATEGORY_LABELS[gap.spendingCategory as keyof typeof CATEGORY_LABELS] ?? gap.spendingCategory
  const ownedName = gap.ownedBest.card?.card_name ?? null
  const ownedMult = gap.ownedBest.multiplier
  const bestName = gap.bestAvailable.card?.card_name ?? "—"
  const bestMult = gap.bestAvailable.multiplier
  const unitLabel = (tierUnit: string | undefined) =>
    tierUnit === "%" || tierUnit === "cashback" ? "%" : "x"
  return (
    <div style={{
      background: "#fff", border: "1px solid #fed7aa", borderLeft: "3px solid #d97706", borderRadius: 10,
      padding: "12px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
            {ownedName
              ? <>Your best: <strong>{ownedName}</strong> earns {ownedMult}{unitLabel(gap.ownedBest.tier?.unit)}.</>
              : <>You don&rsquo;t have a card earning above base on this category.</>}
            {" "}
            <strong>{bestName}</strong> earns {bestMult}{unitLabel(gap.bestAvailable.tier?.unit)}.
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>
            ${gap.monthlySpend.toLocaleString()}/mo on {label.toLowerCase()}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#999" }}>est. uplift</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>
            +${gap.annualGap.toLocaleString()}/yr
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Value-breakdown row (used inside the expanded card section) ──────
function BreakdownRow({ label, value }: { label: string; value: number }) {
  const positive = value >= 0
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#444", padding: "2px 0" }}>
      <span>{label}</span>
      <span style={{ color: positive ? "#0d7c5f" : "#b91c1c", fontVariantNumeric: "tabular-nums" }}>
        {positive ? "+" : "-"}${Math.abs(value).toLocaleString()}
      </span>
    </div>
  )
}

// ── Benefits I'd use panel ───────────────────────────────────────────
// Lifestyle toggles that personalize each card's benefits value. Changes
// save immediately. Default profile in lib/cardBenefits.ts pre-fills
// reasonable defaults so new users aren't staring at all-off checkboxes.
function BenefitsPanel({
  profile,
  onChange,
}: {
  profile: UserBenefitProfile
  onChange: (next: UserBenefitProfile) => void | Promise<void>
}) {
  function toggle(key: keyof UserBenefitProfile) {
    onChange({ ...profile, [key]: !profile[key] })
  }

  const groups: { title: string; items: { key: keyof UserBenefitProfile; label: string; help: string }[] }[] = [
    {
      title: "Travel benefits",
      items: [
        { key: "uses_travel_credit", label: "Flexible travel credits", help: "$300 CSR / VX-style credits — you book a flight or hotel each year" },
        { key: "uses_hotel_credit", label: "Hotel-specific credits", help: "$100 Citi Strata / $200 FHR Amex Plat credits" },
        { key: "uses_airline_credit", label: "Airline incidental credits", help: "$200 Amex Plat / $100 BofA Premium Rewards" },
        { key: "uses_lounge_access", label: "Lounge access (Priority Pass, Centurion, etc.)", help: "Only valuable if you fly 4+ times/year" },
        { key: "needs_global_entry", label: "I still need Global Entry / TSA PreCheck", help: "Most active churners already have this — turn off if covered" },
        { key: "uses_clear", label: "I'd use CLEAR Plus", help: "Worth ~$189/yr if you fly through CLEAR-equipped airports" },
        { key: "flies_enough_for_insurance", label: "Trip insurance + primary rental coverage matters", help: "Only meaningful if you fly or rent cars enough to use it" },
      ],
    },
    {
      title: "Spending credits",
      items: [
        { key: "uses_uber_credit", label: "Uber Cash credits", help: "$120-$200 across various cards" },
        { key: "uses_dining_credit", label: "Dining / Resy credits", help: "Amex Gold $120 dining, Brilliant $300 dining" },
        { key: "uses_doordash_credit", label: "DoorDash / DashPass", help: "Chase Sapphire DashPass + monthly credit" },
        { key: "uses_entertainment_credit", label: "Digital entertainment (Disney+, NYT, etc.)", help: "Amex Plat $240 — depends on which streams you pay for" },
        { key: "uses_saks_credit", label: "Saks Fifth Avenue credit", help: "Amex Plat $100/yr — only valuable if you shop there" },
        { key: "uses_walmart_plus", label: "Walmart+", help: "Amex Plat covers ~$98 membership" },
      ],
    },
    {
      title: "Hotel perks",
      items: [
        { key: "uses_free_night", label: "Annual free-night certificates", help: "Hyatt $150 / Marriott $200-400 / IHG $250 — most users value these" },
      ],
    },
  ]

  return (
    <details style={{ marginTop: 20, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 18px" }}>
      <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Benefits I&apos;d use</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
            Lifestyle inputs that personalize each card&apos;s value. Toggle anything you wouldn&apos;t actually use so the math reflects reality.
          </div>
        </div>
      </summary>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g, gi) => (
          <div key={gi}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
              {g.items.map(item => {
                const on = profile[item.key]
                return (
                  <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: on ? "#f0faf5" : "#fafafa", border: `1px solid ${on ? "#a7f3d0" : "#eee"}`, borderRadius: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(item.key)}
                      style={{ marginTop: 2, accentColor: "#0d7c5f" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111", lineHeight: 1.3 }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2, lineHeight: 1.4 }}>{item.help}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

// ── Wallet-slot view ─────────────────────────────────────────────────
// "What card should I swipe for groceries?" per category, with the
// catalog's best alternative shown for upgrade context.
function WalletSlotView({
  slots,
  ownedCount,
}: {
  slots: ReturnType<typeof computeWalletSlots>
  ownedCount: number
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#111", margin: 0 }}>Wallet slots — best card per category</h3>
        <span style={{ fontSize: 11, color: "#999" }}>{ownedCount} tracked card{ownedCount === 1 ? "" : "s"} in your wallet</span>
      </div>
      <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px", lineHeight: 1.5 }}>
        What to swipe for each category. &ldquo;Your best&rdquo; comes from cards you already own; &ldquo;Catalog best&rdquo; shows the biggest upgrade if you opened a new card.
      </p>
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Category", "Your best", "Catalog best", "Upgrade gain"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e8e8e8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => {
              const ownedRate = slot.ownedBest?.rate ?? 0
              const catRate = slot.catalogBest?.rate ?? 0
              const isUpgrade = slot.upgradeGain > 0.1
              return (
                <tr key={slot.category} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#111" }}>{slot.label}</td>
                  <td style={{ padding: "10px 14px", color: slot.ownedBest ? "#111" : "#bbb" }}>
                    {slot.ownedBest ? (
                      <>
                        <div style={{ fontSize: 12 }}>{slot.ownedBest.card.card_name}</div>
                        <div style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>{ownedRate.toFixed(1)}¢/$</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {slot.catalogBest ? (
                      <>
                        <div style={{ fontSize: 12, color: "#111" }}>{slot.catalogBest.card.card_name}</div>
                        <div style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700 }}>{catRate.toFixed(1)}¢/$</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {isUpgrade ? (
                      <span style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>+{slot.upgradeGain.toFixed(1)}¢/$</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#0d7c5f" }}>✓ optimal</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
