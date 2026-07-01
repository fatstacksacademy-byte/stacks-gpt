"use client"

import React, { useEffect, useMemo, useState, useCallback } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import InfoTip from "../../components/InfoTip"
import ElevatedBadge from "../../components/ElevatedBadge"
import { getOwnedCards, addOwnedCard, updateOwnedCard, deleteOwnedCard, OwnedCard } from "../../../lib/ownedCards"
import { getCardAccounts, type CardAccount } from "../../../lib/cardAccounts"
import { computeFive24, type Five24Status } from "../../../lib/five24"
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
import { sequenceCards, formatCurrency, DEFAULT_MAX_CARDS_PER_YEAR, type CardRankingMode, type SequencedCard } from "../../../lib/ccSequencer"
import { evaluateAllIssuers, type IssuerEligibility } from "../../../lib/issuerRules"
import { track } from "../../../lib/analytics"
import { TRAVEL_CPP } from "../../../lib/travelCpp"
import { signupBonusValue, signupYearOneValue, subHeadline } from "../../../lib/data/cardSpendValue"
import { TRANSFER_PROGRAMS, US_STATES, findTransferProgram } from "../../../lib/data/catalogTaxonomy"
import { transferKind } from "../../../lib/data/travelValue"
import { DEFAULT_BENEFIT_PROFILE, type UserBenefitProfile } from "../../../lib/cardBenefits"
import { computeWalletSlots } from "../../../lib/walletSlots"
import CreditCardProgress from "../../components/CreditCardProgress"
import FatStackMeter from "../../components/FatStackMeter"
import { useProfile as useUserProfile } from "../../components/ProfileProvider"
import SpendingCategoryPicker from "../../components/SpendingCategoryPicker"

const money = (n: number) => `$${n.toLocaleString()}`
const todayStr = () => new Date().toISOString().split("T")[0]

// Dark "mission board" palette — mirrors RoadmapClient's DK so the Spending
// tab matches the reskinned Paycheck flagship exactly. Extra *Bg/*Border
// tokens cover this file's tinted status surfaces.
const DK = {
  board: "#0a0c10",        // page background
  panel: "#161922",        // raised card surface
  panel2: "#0f1219",       // inset surface (inputs, sub-panels)
  panel3: "#12151c",       // alt row
  border: "#23262e",       // hairline
  border2: "#2a2e38",      // stronger hairline / input border
  text: "#ffffff",
  textDim: "#cdd2db",      // primary body
  textMute: "#9aa1ad",     // secondary
  textFaint: "#6b7280",    // labels / captions
  accent: "#3b82f6",
  accent2: "#2563eb",
  accentFg: "#60a5fa",     // blue text on dark
  accentGlow: "rgba(37,99,235,0.45)",
  green: "#0d9668",
  greenFg: "#34d399",
  greenBg: "rgba(13,150,104,0.12)",
  greenBorder: "rgba(13,150,104,0.35)",
  gold: "#f7d774",
  goldDeep: "#d4a017",
  amber: "#f59e0b",
  amberBg: "#1c160a",
  amberBorder: "#4a3a16",
  red: "#f87171",
  redBg: "rgba(220,38,38,0.12)",
  redBorder: "#7f1d1d",
  purple: "#c4b5fd",
  purpleBg: "rgba(124,58,237,0.14)",
  purpleBorder: "#6d28d9",
  blueBg: "rgba(37,99,235,0.14)",
  blueBorder: "rgba(37,99,235,0.4)",
}

const topBtn: React.CSSProperties = { fontSize: 12, color: DK.textMute, background: "none", border: `1px solid ${DK.border2}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const label: React.CSSProperties = { fontSize: 11, color: DK.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: DK.panel2, color: DK.text, border: `1px solid ${DK.border2}`, borderRadius: 6, width: "100%" }
const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: DK.panel2, color: DK.text, border: `1px solid ${DK.border2}`, borderRadius: 6 }

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
  // Card inventory drives the inline 5/24 check on Chase recommendations.
  // Sourced from the same table as the Cards tab so the two stay in sync.
  const [cardAccounts, setCardAccounts] = useState<CardAccount[]>([])

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

  // Load the card inventory once for the inline 5/24 eligibility check.
  useEffect(() => {
    getCardAccounts(userId).then(setCardAccounts).catch(() => {})
  }, [userId])

  // Personal-card 5/24 status (Chase approvals gate on this). Counts only
  // personal cards opened in the last 24 months — computeFive24 handles that.
  const five24: Five24Status = useMemo(
    () => computeFive24(
      cardAccounts.map(c => ({
        id: c.id,
        issuer: c.issuer,
        product_name: c.product_name,
        card_type: c.card_type,
        open_date: c.open_date,
      })),
      todayStr(),
    ),
    [cardAccounts],
  )

  // Issuers the user is hard-blocked with right now (5/24, 2/90, 7/12, 1/65…).
  // Drives both the sequencer's approval filter and the note above the list.
  const blockedIssuers: IssuerEligibility[] = useMemo(
    () => evaluateAllIssuers(cardAccounts, null, todayStr()).filter(e => e.verdict === "deny"),
    [cardAccounts],
  )

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
    { heldCards: cardAccounts, asOf: todayStr() },
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
    return <div style={{ minHeight: "100vh", background: DK.board, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: DK.textMute, fontSize: 14 }}>Loading...</div></div>
  }

  return (
    <div style={{ minHeight: "100vh", background: DK.board, color: DK.textDim, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .rm-topbar { padding: 14px 32px; }
        .rm-topbar-email { font-size: 12px; color: #6b7280; }
        .rm-content { padding: 28px 32px 80px; }
        .cardflip-face { animation: cardFlipIn 0.28s ease; transform-style: preserve-3d; }
        @keyframes cardFlipIn {
          from { opacity: 0; transform: rotateY(8deg) translateX(6px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 768px) {
          .rm-topbar { padding: 12px 16px; }
          .rm-topbar-email { display: none; }
          .rm-content { padding: 16px 16px 80px; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="rm-topbar" style={{ borderBottom: "1px solid #23262e", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", background: DK.panel }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#ffffff", textDecoration: "none" }}>Stacks OS</a>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(13,150,104,0.12)", border: "1px solid rgba(13,150,104,0.35)", borderRadius: 99, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spending Beta</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select aria-label="Home state" value={userState ?? ""} onChange={e => updateUserState(e.target.value)}
            style={{ fontSize: 12, color: userState ? "#34d399" : "#9aa1ad", fontWeight: userState ? 700 : 400, background: DK.panel, border: "1px solid #2a2e38", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
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
      <div style={{ background: "rgba(13,150,104,0.12)", borderBottom: "1px solid rgba(13,150,104,0.35)", padding: "8px 0", width: "100%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#9aa1ad" }}>
            Tracking <strong>{creditCardBonuses.filter(c => !c.expired).length}</strong> credit cards
          </span>
          <span style={{ fontSize: 12, color: "#9aa1ad" }}>·</span>
          <span style={{ fontSize: 12, color: "#9aa1ad" }}>Sequenced by your chosen bonus-return strategy</span>
          {userState && (
            <>
              <span style={{ fontSize: 12, color: "#9aa1ad" }}>·</span>
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>
                {userState}: {regionalCardCount} regional card{regionalCardCount === 1 ? "" : "s"} unlocked
              </span>
            </>
          )}
        </div>
      </div>

      <CheckpointNav />

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* The Stack — gamified running total of card bonuses banked this year,
            with in-progress + planned value as the goal. Ticks up + pops when a
            card is marked complete. */}
        <FatStackMeter
          banked={Math.round(totalEarned)}
          goal={Math.round(totalEarned + inProgressValue + plannedValue)}
          label="Banked this year"
          count={completedCards.length}
          countLabel="completed"
        />

        {/* Spending Profile Panel */}
        {showProfile && (
          <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 16 }}>Spending Profile</div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ minWidth: 220 }}>
                <div style={label}>Home state</div>
                <select aria-label="Home state in spending profile" value={userState ?? ""} onChange={e => updateUserState(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                  <option value="">— select state —</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>{state.name} ({state.code})</option>
                  ))}
                </select>
                <div style={{ fontSize: 10, color: userState ? "#34d399" : "#9aa1ad", marginTop: 5 }}>
                  {selectedState
                    ? `${selectedState.name} selected · ${regionalCardCount} regional cards included`
                    : "Shared with Paycheck and used for regional card eligibility"}
                </div>
              </div>
              <div>
                <div style={label}>Available monthly spend</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 14 }}>$</span>
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
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 12 }}>Changes save automatically</div>

            <details style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #23262e" }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#9aa1ad", cursor: "pointer" }}>Advanced rewards setup</summary>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#9aa1ad", marginBottom: 8 }}>Break down your monthly spend by category. Categories with $50+/month feed the Portfolio Gaps analysis above the recommendations.</div>
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
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #23262e" }}>
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
          <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available spend</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{money(monthlySpend)}<span style={{ fontSize: 12, fontWeight: 500, color: "#9aa1ad" }}>/mo</span></div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{baseRate}% base earn = {money(Math.round(baseAnnualRewards))}/yr</div>
          </div>
          <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>In progress</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: inProgressValue > 0 ? "#60a5fa" : "#ffffff", marginTop: 2 }}>{money(inProgressValue)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{activeCards.length} active bonus{activeCards.length !== 1 ? "es" : ""}</div>
          </div>
          <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399", marginTop: 2 }}>{money(totalEarned)}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{completedCards.length} completed</div>
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
            background: DK.panel, border: "2px solid #23262e", borderRadius: 14,
            padding: "20px 22px", marginBottom: 24,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Pro feature
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                Get the ranked credit card queue
              </div>
              <div style={{ fontSize: 13, color: "#9aa1ad", lineHeight: 1.5 }}>
                Stacks ranks every signup bonus for your spend — net value, 5/24, cooldowns — and tells you which card to apply for next.
              </div>
            </div>
            <a href="/onboarding" style={{
              fontSize: 13, fontWeight: 700, color: "#fff", background: DK.green,
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
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Recommended Next Cards</div>
            <span style={{ fontSize: 10, color: "#9aa1ad" }}>{showRecommendations ? "▲" : "▼"}</span>
            <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600, background: "rgba(13,150,104,0.12)", padding: "2px 8px", borderRadius: 99 }}>
              {formatCurrency(ccSequence.reduce((s, c) => s + c.net_value, 0))} available
            </span>
          </button>

          {showRecommendations && (
            <>
              {blockedIssuers.length > 0 && (
                <div style={{ marginBottom: 10, padding: "9px 12px", background: "rgba(220,38,38,0.12)", border: "1px solid #7f1d1d", borderRadius: 8, fontSize: 12.5, color: "#f87171", lineHeight: 1.5 }}>
                  Hiding cards from <b>{blockedIssuers.map(b => b.label).join(", ")}</b> — you&rsquo;re likely auto-declined there right now
                  ({blockedIssuers.map(b => b.reasons[0]?.rule).filter(Boolean).join(", ")}).{" "}
                  <a href="/stacksos/cards" style={{ color: "#f87171", fontWeight: 600 }}>See the approval matrix →</a>
                </div>
              )}
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
                    border: "1px solid #2a2e38",
                    borderRadius: 8,
                    background: DK.panel,
                    color: "#ffffff",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {recSearch && (
                  <button
                    onClick={() => setRecSearch("")}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      fontSize: 12, color: "#9aa1ad", background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
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
              <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>
                    Rewards Mode
                    {isTravel && (
                      <span style={{ fontSize: 9, color: "#c4b5fd", background: "rgba(124,58,237,0.14)", padding: "1px 6px", borderRadius: 99, fontWeight: 700, marginLeft: 6, letterSpacing: "0.05em" }}>
                        BETA
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 1 }}>
                    {isTravel
                      ? "Valuing points at travel-redemption ceilings. Estimates only — your mileage will vary."
                      : "Cash-floor valuation: 1¢ per point, 0.5¢ per hotel point."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: DK.panel, border: "1px solid #2a2e38", borderRadius: 6, padding: 2 }}>
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
                          color: active ? "#fff" : "#9aa1ad",
                          background: active ? "#0d9668" : "transparent",
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
                <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>Point currency target</div>
                    <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 1 }}>
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
                    style={{ fontSize: 11, color: "#c4b5fd", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 600 }}
                  >
                    {showCppOverrides ? "− Hide" : "+ Advanced"} valuation setup
                  </button>
                  {showCppOverrides && (
                    <div style={{ marginTop: 8, padding: "12px 14px", background: DK.panel, border: "1px solid #23262e", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: "#9aa1ad", marginBottom: 10, lineHeight: 1.5 }}>
                        Override our default travel-cpp estimates per currency. Enter cents-per-point (e.g. <code>2.2</code> for 2.2¢). Leave blank to use the default.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {Object.keys(TRAVEL_CPP).filter(c => c !== "cash").map(currency => {
                          const def = TRAVEL_CPP[currency]
                          const override = profile?.cpp_overrides?.[currency]
                          const value = override != null ? (override * 100).toString() : ""
                          return (
                            <label key={currency} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9aa1ad" }}>
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
                                style={{ width: 60, padding: "4px 6px", fontSize: 11, border: "1px solid #2a2e38", borderRadius: 4, color: "#ffffff" }}
                              />
                              <span style={{ color: "#6b7280", fontSize: 10 }}>¢</span>
                            </label>
                          )
                        })}
                      </div>
                      {/* Reset link — clears cpp_overrides to null. Inputs all
                          read from profile.cpp_overrides, so they fall back to
                          placeholder defaults automatically once cleared. */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #23262e", display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          onClick={async () => {
                            await updateProfile({ cpp_overrides: null })
                            setCppResetFlash(true)
                            setTimeout(() => setCppResetFlash(false), 2500)
                          }}
                          disabled={!profile?.cpp_overrides || Object.keys(profile.cpp_overrides).length === 0}
                          style={{
                            fontSize: 11, color: "#c4b5fd", background: "none", border: "none",
                            padding: 0, cursor: profile?.cpp_overrides && Object.keys(profile.cpp_overrides).length > 0 ? "pointer" : "not-allowed",
                            fontWeight: 600, opacity: profile?.cpp_overrides && Object.keys(profile.cpp_overrides).length > 0 ? 1 : 0.4,
                            textDecoration: "underline",
                          }}
                        >
                          Reset to defaults
                        </button>
                        {cppResetFlash && (
                          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>
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
              <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>Application pace</div>
                  <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 1 }}>
                    Applying too frequently can temporarily lower your credit score.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: DK.panel, border: "1px solid #2a2e38", borderRadius: 6, padding: 2 }}>
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
                          color: active ? "#fff" : "#9aa1ad",
                          background: active ? "#0d9668" : "transparent",
                          border: "none", borderRadius: 4, cursor: "pointer",
                        }}
                      >
                        {n}/yr
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>Ranking priority</div>
                  <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 1 }}>
                    Choose the biggest welcome bonus per application or the strongest net return per dollar required.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, background: DK.panel, border: "1px solid #2a2e38", borderRadius: 6, padding: 2 }}>
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
                          color: active ? "#fff" : "#9aa1ad", background: active ? "#0d9668" : "transparent",
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
                <div style={{ fontSize: 12, color: "#9aa1ad" }}>
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
                    style={{ accentColor: "#34d399" }}
                  />
                  <span style={{ fontSize: 12, color: "#9aa1ad" }}>Show USAA / Navy Federal offers</span>
                </label>
              </div>
              {!recSearchQ && <ChurnTimeline cards={ccSequence} maxCardsPerYear={maxCardsPerYear} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(showAllRecs ? ccSequence : ccSequence.slice(0, 15)).map((sc, idx) => {
                  const isExpanded = expandedRecCard === sc.card.id
                  const accentColor = sc.card.card_type === "business" ? "#c4b5fd" : "#60a5fa"
                  return (
                    <div key={sc.card.id} style={{
                      background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "14px 20px",
                      borderLeft: `3px solid ${accentColor}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>#{idx + 1}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{sc.card.card_name}</span>
                            <ElevatedBadge card={sc.card} compact />
                            {sc.card.card_type === "business" && (
                              <span style={{ fontSize: 9, color: "#c4b5fd", background: "rgba(124,58,237,0.14)", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>BIZ</span>
                            )}
                            {travelProgram && transferKind(sc.card, travelProgram) === "indirect" && (
                              <span title="These points reach the selected program when pooled into a premium card in the same rewards family" style={{ fontSize: 9, color: "#c4b5fd", background: "rgba(124,58,237,0.14)", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>POOL</span>
                            )}
                            <VerifiedBadge state={verificationStates.get(sc.card.id)} compact />
                            <Five24RecBadge issuer={sc.card.issuer} five24={five24} hasInventory={cardAccounts.length > 0} />
                            {(() => {
                              const post = getPostByBonusId(sc.card.id)
                              if (!post) return null
                              return (
                                <a href={`/blog/${post.slug}`} style={{ fontSize: 10, color: "#34d399", textDecoration: "none", fontWeight: 600 }}>
                                  Read review ↗
                                </a>
                              )
                            })()}
                          </div>
                          <div style={{ fontSize: 12, color: "#9aa1ad" }}>
                            {sc.card.bonus_amount.toLocaleString()} {sc.card.bonus_currency}
                            {sc.card.min_spend > 0 && <span style={{ color: "#9aa1ad" }}> · ${sc.card.min_spend.toLocaleString()} in {sc.card.spend_months}mo</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 2 }}>
                            AF: {sc.card.annual_fee === 0 ? <span style={{ color: "#34d399" }}>$0</span> : <span>${sc.card.annual_fee}{sc.card.annual_fee_waived_first_year ? " (waived Y1)" : ""}</span>}
                            {sc.card.statement_credits_year1 > 0 && <span> · Credits: ${sc.card.statement_credits_year1}</span>}
                            <span> · Cum: {formatCurrency(sc.cumulative_value)} in {sc.cumulative_months}mo</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#34d399" }}>{subHeadline(sc.card)}</div>
                          <div style={{ fontSize: 10, color: "#9aa1ad" }}>est. {formatCurrency(sc.net_value)} value</div>
                          <div style={{ fontSize: 10, color: "#9aa1ad" }}>
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
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#34d399", background: "none", border: "1px solid #34d399", borderRadius: 6, cursor: "pointer" }}>
                          + Add to planned
                        </button>
                        <button onClick={() => setAlreadyHaveCardId(alreadyHaveCardId === sc.card.id ? null : sc.card.id)}
                          title="Record this card as already held so we stop recommending it"
                          style={{ padding: "5px 14px", fontSize: 12, fontWeight: 600, color: "#9aa1ad", background: "none", border: "1px solid #2a2e38", borderRadius: 6, cursor: "pointer" }}>
                          {alreadyHaveCardId === sc.card.id ? "Cancel" : "Already have"}
                        </button>
                        <button onClick={() => setExpandedRecCard(isExpanded ? null : sc.card.id)}
                          style={{ padding: "5px 12px", fontSize: 11, color: "#9aa1ad", background: "none", border: "1px solid #23262e", borderRadius: 6, cursor: "pointer" }}>
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
                                    color: "#34d399",
                                    background: "rgba(13,150,104,0.12)",
                                    border: "1px solid rgba(13,150,104,0.35)",
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
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #23262e", display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Value breakdown — explains *why* this card's net value is what it is */}
                          <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
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
                            <div style={{ borderTop: "1px solid #23262e", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                              <span>Net year 1</span>
                              <span style={{ color: "#34d399" }}>{formatCurrency(sc.net_value)}</span>
                            </div>
                          </div>
                          {/* Per-benefit list — included + excluded so user can see what they're leaving on table */}
                          {sc.value_breakdown.included_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>Counted</div>
                              {sc.value_breakdown.included_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#9aa1ad" }}>✓ ${b.annualValue} — {b.label}</div>
                              ))}
                            </div>
                          )}
                          {sc.value_breakdown.excluded_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Not counted (you said you wouldn&apos;t use)</div>
                              {sc.value_breakdown.excluded_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#6b7280" }}>○ ${b.annualValue} — {b.label}</div>
                              ))}
                            </div>
                          )}
                          {sc.card.key_benefits.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Other features</div>
                              {sc.card.key_benefits.map((b, i) => (
                                <div key={i} style={{ fontSize: 11, color: "#9aa1ad" }}>• {b}</div>
                              ))}
                            </div>
                          )}
                          {sc.card.is_hotel_card && (
                            <div style={{ fontSize: 10, color: "#f59e0b" }}>Hotel points valued at 0.5&cent; per point</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {ccSequence.length > 15 && (
                  <button
                    onClick={() => setShowAllRecs(s => !s)}
                    style={{ width: "100%", fontSize: 12, color: "#34d399", fontWeight: 600, textAlign: "center", padding: 8, background: "none", border: "none", cursor: "pointer" }}>
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
            background: "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0.14) 100%)",
            border: "1px solid #6d28d9",
            borderRadius: 12,
            padding: "20px 22px",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#c4b5fd", fontWeight: 700, marginBottom: 4 }}>
              Start here
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#c4b5fd", margin: "0 0 6px" }}>
              Add your first credit card
            </h2>
            <p style={{ fontSize: 13, color: "#c4b5fd", margin: 0, lineHeight: 1.5 }}>
              {isPaid
                ? "Sorted best-first for you. Tap “Start” on any card above to begin tracking — or add one you already have."
                : "Sorted best-first for you. Use “+ Add spending card / bonus” below to begin tracking — or add one you already have."}
            </p>
          </div>
        )}

        {/* Active Cards */}
        {activeCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Active</div>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planned</div>
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
          style={{ fontSize: 13, fontWeight: 600, color: "#34d399", background: "none", border: "1px solid #34d399", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginBottom: 28 }}>
          + Add spending card / bonus
        </button>

        {/* Completed */}
        {completedCards.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", cursor: "pointer", padding: "6px 0" }}>Completed ({completedCards.length})</summary>
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
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", cursor: "pointer", padding: "6px 0" }}>Canceled ({canceledCards.length})</summary>
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
            <div style={{ background: DK.panel, borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 20 }}>
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
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 5, lineHeight: 1.4 }}>Most people leave this on Planned — it updates automatically as you progress.</div>
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
                    <div style={label}>Spend requirement <InfoTip tip="The total you must charge to the card within the deadline to earn the sign-up bonus (e.g. $4,000 in 3 months)." label="spend requirement" /></div>
                    <input type="number" value={fSpendReq} onChange={e => setFSpendReq(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Requirements deadline <InfoTip tip="The last day to finish the spend requirement and earn the bonus. Miss it and the bonus is forfeited." label="requirements deadline" /></div>
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
                  <summary style={{ fontSize: 12, fontWeight: 600, color: "#9aa1ad", cursor: "pointer" }}>Advanced: category multipliers</summary>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    {selectedModalCategories.map(cat => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#9aa1ad", width: 130 }}>{CATEGORY_LABELS[cat]}</span>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input type="number" step="0.1" value={fMultipliers[cat] ?? ""} onChange={e => setFMultipliers(prev => ({ ...prev, [cat]: e.target.value }))}
                            style={{ ...inputStyle, fontSize: 12 }} placeholder="1" />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 11 }}>x</span>
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
                  style={{ padding: "10px 20px", fontSize: 13, background: "transparent", color: "#9aa1ad", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!fCardName}
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: fCardName ? "#34d399" : "#6b7280", color: "#fff", border: "none", borderRadius: 8, cursor: fCardName ? "pointer" : "default" }}>
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
  const statusColors: Record<string, string> = { planned: "#c4b5fd", active: "#60a5fa", completed: "#34d399", canceled: "#9aa1ad" }
  const catalogExact = creditCardBonuses.find(cc => cc.card_name.toLowerCase() === c.card_name.toLowerCase())
  const post = catalogExact ? getPostByBonusId(catalogExact.id) : null
  const [flipped, setFlipped] = useState(false)

  const statusPill = (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: statusColors[c.status] ?? "#9aa1ad", background: c.status === "active" ? "rgba(37,99,235,0.14)" : c.status === "completed" ? "rgba(13,150,104,0.12)" : c.status === "planned" ? "rgba(124,58,237,0.14)" : "#23262e" }}>
      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
    </span>
  )

  const ghostBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", border: "1px solid #2a2e38", color: "#9aa1ad", background: "none", borderRadius: 6, cursor: "pointer" }
  const flipBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", border: "1px solid #2a2e38", color: "#9aa1ad", background: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }

  return (
    <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "16px 20px", perspective: 1200 }}>
      <div key={flipped ? "back" : "front"} className="cardflip-face">
        {!flipped ? (
          /* ── FRONT — minimal identity + net value + primary action ── */
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{c.card_name}</span>
                  {c.issuer && <span style={{ fontSize: 11, color: "#9aa1ad" }}>{c.issuer}</span>}
                  {statusPill}
                  {c.incomplete_info && (
                    <span title="Dates weren't filled in — click Edit to complete, or this card will be excluded from cooldown/churn math"
                      style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: "#f59e0b", background: "#1c160a", border: "1px solid #4a3a16", cursor: "help" }}>
                      ⚠ Needs info
                    </span>
                  )}
                </div>
                {/* Spend feasibility — the one at-a-glance signal worth keeping up front */}
                {spendCheck && c.spend_requirement != null && c.spend_requirement > 0 && (
                  <div style={{ fontSize: 11, marginTop: 4, color: spendCheck.canHit ? "#34d399" : "#f59e0b", fontWeight: 500 }}>
                    {spendCheck.canHit
                      ? `~${spendCheck.monthsNeeded} month${spendCheck.monthsNeeded !== 1 ? "s" : ""} to hit spend`
                      : "May not hit spend in time"}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: netValue >= 0 ? "#34d399" : "#f87171" }}>
                  {netValue >= 0 ? "+" : ""}{money(Math.abs(netValue))}
                </div>
                <div style={{ fontSize: 10, color: "#9aa1ad" }}>net of fee</div>
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
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              {c.status === "planned" && (
                <button onClick={() => onStatusChange("active")}
                  style={{ fontSize: 11, padding: "4px 12px", background: DK.accent2, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Start
                </button>
              )}
              {c.status === "active" && (
                <button onClick={() => onStatusChange("completed")}
                  style={{ fontSize: 11, padding: "4px 12px", background: DK.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Complete
                </button>
              )}
              {/* Per-step Undo — walk back the last status transition inline, the
                  way the Paycheck cards let you undo a milestone. active→planned,
                  completed→active. */}
              {c.status === "active" && (
                <button onClick={() => onStatusChange("planned")}
                  style={{ fontSize: 11, color: DK.textFaint, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontWeight: 600 }}>
                  ↩ Undo
                </button>
              )}
              {c.status === "completed" && (
                <button onClick={() => onStatusChange("active")}
                  style={{ fontSize: 11, color: DK.textFaint, background: "none", border: "none", cursor: "pointer", padding: "4px 6px", fontWeight: 600 }}>
                  ↩ Undo
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={() => setFlipped(true)} style={flipBtn}>
                Details ›
              </button>
            </div>
          </>
        ) : (
          /* ── BACK — full stat sheet ── */
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{c.card_name}</span>
                {statusPill}
              </div>
              <button onClick={() => setFlipped(false)} style={flipBtn}>
                ‹ Back
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#9aa1ad", display: "flex", gap: 16, flexWrap: "wrap" }}>
              {c.signup_bonus_value != null && <span>Bonus: <strong style={{ color: "#e6e8ec" }}>${c.signup_bonus_value.toLocaleString()}</strong></span>}
              {(c.annual_fee ?? 0) > 0 && <span>Fee: ${c.annual_fee}/yr</span>}
              {c.spend_requirement != null && <span>Spend: ${c.spend_requirement.toLocaleString()} req</span>}
              {c.spend_deadline && <span>Requirements deadline: {c.spend_deadline}</span>}
              {c.actual_value != null && <span>Actual: ${c.actual_value.toLocaleString()}</span>}
            </div>
            {c.notes && <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 8 }}>{c.notes}</div>}
            {(post || !catalogExact) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {post && (
                  <a href={`/blog/${post.slug}`} style={{ fontSize: 11, color: "#34d399", textDecoration: "none", fontWeight: 500 }}>
                    Read review ↗
                  </a>
                )}
                {!catalogExact && (
                  <button
                    onClick={onMatchToggle}
                    title="Link this card to its official catalog entry to unlock rewards, apply link, and review"
                    style={{ fontSize: 10, padding: "2px 8px", border: "1px solid rgba(13,150,104,0.35)", color: "#34d399", background: "rgba(13,150,104,0.12)", borderRadius: 99, cursor: "pointer", fontWeight: 700 }}
                  >
                    {isMatching ? "Cancel" : "Match catalog"}
                  </button>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", borderTop: "1px dashed #23262e", paddingTop: 12 }}>
              <button onClick={onEdit} style={ghostBtn}>Edit</button>
              <button onClick={onDelete} style={ghostBtn}>Remove</button>
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
          </>
        )}
      </div>
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
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#9aa1ad" }}>
        <span>{label}</span>
        {removable && <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} style={{ border: 0, padding: 0, color: "#9aa1ad", background: "transparent", cursor: "pointer" }}>×</button>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 12 }}>$</span>
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
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 11 }}>x</span>
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
      <div style={{ marginBottom: 28, background: "#0f1219", border: "1px dashed #2a2e38", borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>Portfolio Gaps</div>
        <div style={{ fontSize: 12, color: "#9aa1ad" }}>
          Open <strong>Spending Profile</strong> at the top right and enter monthly spend by category, then add the cards you currently use to see where your portfolio has gaps worth filling.
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Portfolio Gaps</div>
        <div style={{ fontSize: 11, color: "#9aa1ad" }}>
          {flagged.length > 0
            ? <><strong style={{ color: "#f59e0b" }}>{flagged.length}</strong> categor{flagged.length === 1 ? "y" : "ies"} earning below catalog best</>
            : "No major gaps in categories you spend $50+/mo on"}
        </div>
      </div>

      {/* My current cards pill list — single source of truth is owned_cards. */}
      <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          My current cards ({ownedActive.length})
        </div>
        {ownedActive.length === 0 ? (
          <div style={{ fontSize: 12, color: "#9aa1ad", marginBottom: 8 }}>
            None added. Add the cards you currently use so we can compute where your portfolio has gaps.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {ownedActive.map(c => (
              <span key={c.id} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: 600,
                color: "#60a5fa", background: "rgba(37,99,235,0.14)", border: "1px solid rgba(37,99,235,0.4)",
              }}>
                {c.card_name}
              </span>
            ))}
          </div>
        )}
        {!showAddCard ? (
          <button onClick={() => setShowAddCard(true)}
            style={{ fontSize: 11, color: "#34d399", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700 }}>
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
                width: "100%", padding: "7px 10px", fontSize: 12, color: "#ffffff",
                border: "1px solid #2a2e38", borderRadius: 6, background: DK.panel,
                boxSizing: "border-box",
              }}
            />
            {search.trim().length >= 2 && (
              <div style={{ marginTop: 6, maxHeight: 240, overflowY: "auto", border: "1px solid #23262e", borderRadius: 6 }}>
                {searchResults.length === 0 ? (
                  <div style={{ fontSize: 11, color: "#9aa1ad", padding: "8px 10px" }}>No matches.</div>
                ) : searchResults.map(card => (
                  <div key={card.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: DK.panel, borderBottom: "1px solid #23262e" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#ffffff", fontWeight: 600 }}>{card.card_name}</div>
                      <div style={{ fontSize: 10, color: "#9aa1ad", marginTop: 1 }}>
                        {card.issuer}
                        {signupBonusValue(card) > 0 && <> · ${signupBonusValue(card).toLocaleString()} after ${card.min_spend.toLocaleString()}</>}
                      </div>
                    </div>
                    {signupBonusValue(card) > 0 && card.min_spend > 0 && (
                      <button onClick={() => quickAddOwned(card, "active")} disabled={adding !== null}
                        style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: DK.accent2, border: "none", borderRadius: 5, padding: "5px 8px", cursor: adding ? "not-allowed" : "pointer" }}>
                        Track SUB
                      </button>
                    )}
                    <button onClick={() => quickAddOwned(card, "completed")} disabled={adding !== null}
                      style={{ fontSize: 10, fontWeight: 600, color: "#9aa1ad", background: DK.panel, border: "1px solid #2a2e38", borderRadius: 5, padding: "5px 8px", cursor: adding ? "not-allowed" : "pointer" }}>
                      {adding === card.id ? "Adding…" : "Add to wallet"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => { setShowAddCard(false); setSearch("") }}
              style={{ marginTop: 6, fontSize: 11, color: "#9aa1ad", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Gap rows — only flagged ones surface; unflagged categories are silent. */}
      {gaps.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9aa1ad", padding: "8px 0" }}>
          Add monthly spend amounts in your Spending Profile (top right) for the categories you actually use.
        </div>
      ) : flagged.length === 0 ? (
        <div style={{ fontSize: 12, color: "#34d399", background: "rgba(13,150,104,0.12)", border: "1px solid rgba(13,150,104,0.35)", borderRadius: 8, padding: "10px 14px" }}>
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
      background: DK.panel, border: "1px solid #4a3a16", borderLeft: "3px solid #f59e0b", borderRadius: 10,
      padding: "12px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{label}</div>
          <div style={{ fontSize: 12, color: "#9aa1ad", marginTop: 3 }}>
            {ownedName
              ? <>Your best: <strong>{ownedName}</strong> earns {ownedMult}{unitLabel(gap.ownedBest.tier?.unit)}.</>
              : <>You don&rsquo;t have a card earning above base on this category.</>}
            {" "}
            <strong>{bestName}</strong> earns {bestMult}{unitLabel(gap.bestAvailable.tier?.unit)}.
          </div>
          <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 3 }}>
            ${gap.monthlySpend.toLocaleString()}/mo on {label.toLowerCase()}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#9aa1ad" }}>est. uplift</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
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
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cdd2db", padding: "2px 0" }}>
      <span>{label}</span>
      <span style={{ color: positive ? "#34d399" : "#f87171", fontVariantNumeric: "tabular-nums" }}>
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
    <details style={{ marginTop: 20, background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "14px 18px" }}>
      <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Benefits I&apos;d use</div>
          <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 2 }}>
            Lifestyle inputs that personalize each card&apos;s value. Toggle anything you wouldn&apos;t actually use so the math reflects reality.
          </div>
        </div>
      </summary>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g, gi) => (
          <div key={gi}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.title}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
              {g.items.map(item => {
                const on = profile[item.key]
                return (
                  <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", background: on ? "rgba(13,150,104,0.12)" : "#0f1219", border: `1px solid ${on ? "rgba(13,150,104,0.35)" : "#23262e"}`, borderRadius: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(item.key)}
                      style={{ marginTop: 2, accentColor: "#34d399" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: "#9aa1ad", marginTop: 2, lineHeight: 1.4 }}>{item.help}</div>
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
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", margin: 0 }}>Wallet slots — best card per category</h3>
        <span style={{ fontSize: 11, color: "#9aa1ad" }}>{ownedCount} tracked card{ownedCount === 1 ? "" : "s"} in your wallet</span>
      </div>
      <p style={{ fontSize: 12, color: "#9aa1ad", margin: "0 0 12px", lineHeight: 1.5 }}>
        What to swipe for each category. &ldquo;Your best&rdquo; comes from cards you already own; &ldquo;Catalog best&rdquo; shows the biggest upgrade if you opened a new card.
      </p>
      <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0f1219" }}>
              {["Category", "Your best", "Catalog best", "Upgrade gain"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #23262e" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => {
              const ownedRate = slot.ownedBest?.rate ?? 0
              const catRate = slot.catalogBest?.rate ?? 0
              const isUpgrade = slot.upgradeGain > 0.1
              return (
                <tr key={slot.category} style={{ borderBottom: "1px solid #23262e" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#ffffff" }}>{slot.label}</td>
                  <td style={{ padding: "10px 14px", color: slot.ownedBest ? "#ffffff" : "#6b7280" }}>
                    {slot.ownedBest ? (
                      <>
                        <div style={{ fontSize: 12 }}>{slot.ownedBest.card.card_name}</div>
                        <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>{ownedRate.toFixed(1)}¢/$</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {slot.catalogBest ? (
                      <>
                        <div style={{ fontSize: 12, color: "#ffffff" }}>{slot.catalogBest.card.card_name}</div>
                        <div style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>{catRate.toFixed(1)}¢/$</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {isUpgrade ? (
                      <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>+{slot.upgradeGain.toFixed(1)}¢/$</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#34d399" }}>✓ optimal</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline 5/24 eligibility chip for Chase recommendations. Chase generally
 * approves new cards only when you're under 5/24 (5 personal cards opened in
 * the last 24 months), so recommending one to someone already at the limit
 * just burns a hard pull. Only renders for Chase cards.
 */
function Five24RecBadge({ issuer, five24, hasInventory }: { issuer: string; five24: Five24Status; hasInventory: boolean }) {
  if (!/chase/i.test(issuer)) return null
  if (!hasInventory) {
    return (
      <a
        href="/stacksos/cards"
        title="Chase uses the 5/24 rule. Add your cards on the Cards tab to check eligibility before you apply."
        style={{ fontSize: 9, color: "#f59e0b", background: "#1c160a", padding: "1px 5px", borderRadius: 99, fontWeight: 700, textDecoration: "none" }}
      >
        5/24?
      </a>
    )
  }
  if (five24.under_524) {
    return (
      <span
        title={`${five24.count}/24 personal cards in the last 24 months — Chase approvals likely`}
        style={{ fontSize: 9, color: "#34d399", background: "rgba(13,150,104,0.12)", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}
      >
        ✓ Under 5/24
      </span>
    )
  }
  return (
    <span
      title={`At 5/24 (${five24.count} personal cards in 24mo). Chase will most likely deny.${five24.next_slot_opens ? " Next slot opens " + five24.next_slot_opens + "." : ""}`}
      style={{ fontSize: 9, color: "#f87171", background: "rgba(220,38,38,0.12)", padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}
    >
      ⚠ At 5/24
    </span>
  )
}

/**
 * Application-pace plan timeline. The sequencer already spaces cards (so you're
 * never juggling two open SUBs) and stores each card's completion month in
 * cumulative_months; this draws that as a horizontal Gantt of the next ~12
 * months so the plan reads as "apply this, then that" instead of a flat list.
 */
function ChurnTimeline({ cards, maxCardsPerYear }: { cards: SequencedCard[]; maxCardsPerYear: number }) {
  const plan = cards.filter(c => c.cumulative_months <= 12).slice(0, 8)
  if (plan.length < 2) return null
  const horizon = Math.max(12, ...plan.map(c => c.cumulative_months))
  return (
    <div style={{ background: "#0f1219", border: "1px solid #23262e", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", marginBottom: 2 }}>
        Your churn plan — {plan.length} cards over ~{Math.ceil(plan[plan.length - 1].cumulative_months)} months
      </div>
      <div style={{ fontSize: 11, color: "#9aa1ad", marginBottom: 10 }}>
        At {maxCardsPerYear} cards/yr pace. Each bar runs from application to hitting the minimum spend.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {plan.map((c, i) => {
          const start = Math.max(0, c.cumulative_months - c.months_to_complete)
          const leftPct = (start / horizon) * 100
          const widthPct = Math.max(4, ((c.cumulative_months - start) / horizon) * 100)
          const accent = c.card.card_type === "business" ? "#c4b5fd" : "#60a5fa"
          return (
            <div key={c.card.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 18, fontSize: 10, color: "#6b7280", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ position: "relative", flex: 1, height: 22, background: DK.panel2, borderRadius: 5 }}>
                <div
                  title={`Apply ~month ${start.toFixed(1)}, spend done ~month ${c.cumulative_months.toFixed(1)}`}
                  style={{ position: "absolute", left: `${leftPct}%`, width: `${widthPct}%`, top: 0, bottom: 0, background: accent, borderRadius: 5, display: "flex", alignItems: "center", paddingLeft: 6, overflow: "hidden" }}
                >
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{c.card.card_name}</span>
                </div>
              </div>
              <div style={{ width: 56, textAlign: "right", fontSize: 11, fontWeight: 700, color: "#34d399", flexShrink: 0 }}>{formatCurrency(c.net_value)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6b7280", marginTop: 6, paddingLeft: 26, paddingRight: 60 }}>
        <span>now</span><span>month {Math.round(horizon / 2)}</span><span>month {Math.round(horizon)}</span>
      </div>
    </div>
  )
}
