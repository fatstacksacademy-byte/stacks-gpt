"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import InfoTip from "../../components/InfoTip"
import { getSavingsEntries, addSavingsEntry, updateSavingsEntry, deleteSavingsEntry, setSavingsMilestone, SavingsEntry, type SavingsMilestone } from "../../../lib/savingsEntries"
import LiquidityTimeline from "../../components/LiquidityTimeline"
import FatStackMeter from "../../components/FatStackMeter"
import FeeStrip, { type FeeWaiver } from "../../components/FeeStrip"
import NextStepBar from "../../components/NextStepBar"
import { getSavingsProfile, upsertSavingsProfile, SavingsProfile, DEFAULT_SAVINGS_PROFILE } from "../../../lib/savingsProfile"
import { createClient } from "../../../lib/supabase/client"
import { runSavingsSequencer, SavingsSequencedEntry } from "../../../lib/savingsSequencer"
import { savingsBonuses as savingsBonusesCatalog } from "../../../lib/data/savingsBonuses"
import { getComboFor } from "../../../lib/linkedBonuses"
import AlreadyHaveForm from "../../components/AlreadyHaveForm"
import VerifiedBadge from "../../components/VerifiedBadge"
import { track } from "../../../lib/analytics"
import { getVerificationStateMap, type VerificationState } from "../../../lib/verificationState"
import { applyUrl } from "../../../lib/affiliateLinks"

const money = (n: number) => `$${n.toLocaleString()}`
const pct = (n: number) => `${(n * 100).toFixed(2)}%`
const todayStr = () => new Date().toISOString().split("T")[0]

// Dark "mission board" palette — single source of truth, mirrors the DK
// constant in SpendingClient / RoadmapClient so all reskinned tabs match.
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
const computedStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: DK.panel3, color: DK.textMute, border: `1px solid ${DK.border}`, borderRadius: 6, width: "100%" }

const STATUS_OPTIONS = ["planned", "active", "completed", "canceled"] as const

// Auto-calculate yield from deposit * APY * holding period
function calcYield(deposit: string, apy: string, holdingDays: string): number {
  const d = parseFloat(deposit) || 0
  const a = (parseFloat(apy) || 0) / 100 // form value is %, convert to decimal
  const days = parseInt(holdingDays) || 0
  if (d <= 0 || a <= 0 || days <= 0) return 0
  return Math.round(d * a * (days / 365))
}

export default function SavingsClient({ userEmail, userId, isPaid }: { userEmail: string; userId: string; isPaid: boolean }) {
  const [entries, setEntries] = useState<SavingsEntry[]>([])
  const [profile, setProfile] = useState<SavingsProfile>({ user_id: userId, ...DEFAULT_SAVINGS_PROFILE, updated_at: "" })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedRec, setExpandedRec] = useState<string | null>(null)
  const [skippedSavingsIds, setSkippedSavingsIds] = useState<string[]>([])
  const [startingId, setStartingId] = useState<string | null>(null)
  // Per-bonus "open as combo" toggle. Only shown on recommended cards whose
  // savings bonus is paired with a checking bonus in the curated combo list.
  const [comboMode, setComboMode] = useState<Record<string, boolean>>({})
  const [recSearch, setRecSearch] = useState("")
  const [alreadyHaveRecId, setAlreadyHaveRecId] = useState<string | null>(null)
  const [justStartedIds, setJustStartedIds] = useState<Set<string>>(new Set())
  const [startError, setStartError] = useState<string | null>(null)
  const [verificationStates, setVerificationStates] = useState<Map<string, VerificationState>>(new Map())
  // Flip state for the active-bonus cards — front = one next step, back = the
  // full liquidity timeline + fees + actions (mirrors the Paycheck card).
  const [flippedSavings, setFlippedSavings] = useState<Set<string>>(new Set())
  const flipAnimatedSavingsRef = useRef<Set<string>>(new Set())
  function toggleSavingsFlip(id: string) {
    flipAnimatedSavingsRef.current.add(id)
    setFlippedSavings(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  // Milestone state is now persisted on the savings_entries row itself
  // (account_opened_at / funded_at / bonus_posted_at), so a click writes
  // to the DB and survives across devices / cron / sessions. The earlier
  // behavior stored these in localStorage; we backfill any leftover keys
  // into the DB the first time we see them (see useEffect below).
  // TODO(server-persistence): this requires migration 028_savings_milestones
  // to be applied before deploy — until those columns exist, setSavingsMilestone
  // writes fail and milestones silently no-op. Verify the migration has run in
  // each environment as part of the release checklist.
  async function handleMilestoneToggle(entry: SavingsEntry, milestone: SavingsMilestone, hit: boolean) {
    const ok = await setSavingsMilestone(entry.id, milestone, hit)
    if (ok) await loadData()
  }
  // Let the user re-pick which deposit tier they're going for on a tracked
  // multi-tier savings bonus (e.g. Capital One $20k→$300 vs $100k→$1,500).
  // A blog "Track this bonus" lands on the smallest tier by default; this is
  // where they size it up. The hero-card stats, HYSA-edge math, and next-step
  // amounts all read from deposit_required / bonus_amount, so they follow.
  async function handleTierChange(
    entry: SavingsEntry,
    bonus: (typeof savingsBonusesCatalog)[number],
    tier: { min_deposit: number; bonus_amount: number },
  ) {
    if (entry.deposit_required === tier.min_deposit && entry.bonus_amount === tier.bonus_amount) return
    // Mirror the deposit→value math used when the bonus is first tracked
    // (lib/trackBonus.ts): interest accrues on the deposit over the same hold.
    const holdDays = entry.holding_period_days ?? 0
    const interestEarned = Math.round(tier.min_deposit * bonus.base_apy * (holdDays / 365))
    await updateSavingsEntry(entry.id, {
      deposit_required: tier.min_deposit,
      bonus_amount: tier.bonus_amount,
      estimated_yield: interestEarned > 0 ? interestEarned : null,
      expected_total_value: tier.bonus_amount + interestEarned,
    })
    await loadData()
  }
  // Legacy localStorage milestone shape mapped to the new columns.
  const LEGACY_MILESTONE_MAP: Record<"opened" | "deposited", SavingsMilestone> = {
    opened: "account_opened_at",
    deposited: "funded_at",
  }
  const [userState, setUserState] = useState<string | null>(null)
  const [militaryAffiliated, setMilitaryAffiliated] = useState<boolean>(false)
  const [showBusiness, setShowBusiness] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("stacks_show_business") === "true"
  })
  const [showBrokerage, setShowBrokerage] = useState(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem("stacks_show_brokerage")
    return stored === null ? true : stored === "true"
  })
  // Business-only view: show ONLY business-entity bonuses (sole-prop friendly).
  const [businessOnly, setBusinessOnly] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("stacks_business_only") === "true"
  })
  // How the recommendation list is ordered: by effective APY (default) or by
  // raw bonus dollars. Effective APY is still shown in both modes.
  const [recSort, setRecSort] = useState<"apy" | "amount">(() => {
    if (typeof window === "undefined") return "apy"
    return localStorage.getItem("stacks_rec_sort") === "amount" ? "amount" : "apy"
  })

  // Form state
  const [fInstitution, setFInstitution] = useState("")
  const [fBonusName, setFBonusName] = useState("")
  const [fBonusAmount, setFBonusAmount] = useState("")
  const [fDepositRequired, setFDepositRequired] = useState("")
  const [fHoldingDays, setFHoldingDays] = useState("")
  const [fOfferApy, setFOfferApy] = useState("")
  const [fPromoApy, setFPromoApy] = useState("")
  const [fActualValue, setFActualValue] = useState("")
  const [fOpenedDate, setFOpenedDate] = useState(todayStr())
  const [fDeadline, setFDeadline] = useState("")
  const [fStatus, setFStatus] = useState<SavingsEntry["status"]>("planned")
  const [fNotes, setFNotes] = useState("")

  // Auto-calculated values from form inputs
  const autoYield = calcYield(fDepositRequired, fOfferApy || fPromoApy, fHoldingDays)
  const autoTotal = (parseFloat(fBonusAmount) || 0) + autoYield

  // Only the FIRST load shows the full-screen spinner. Subsequent refetches
  // (after a milestone toggle, status change, start, etc.) update in place —
  // flipping `loading` back to true would unmount the whole page and snap the
  // user's scroll position back to the top, which felt like a page refresh.
  const hasLoadedRef = useRef(false)
  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true)
    const supabaseClient = createClient()
    const [e, p, { data: userProfile }, vStates] = await Promise.all([
      getSavingsEntries(userId),
      getSavingsProfile(userId),
      supabaseClient.from("user_profiles").select("state, military_affiliated").eq("user_id", userId).single(),
      getVerificationStateMap(),
    ])
    setEntries(e)
    setProfile(p)
    if (userProfile?.state) setUserState(userProfile.state)
    const up = userProfile as { military_affiliated?: boolean | null } | null
    setMilitaryAffiliated(up?.military_affiliated === true)
    setVerificationStates(vStates)
    hasLoadedRef.current = true
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  // One-shot migration: for any entry whose milestone column is null but
  // whose localStorage flag is set, lift the timestamp into the DB and
  // remove the local key. Runs whenever entries load and bails out fast
  // when there's nothing to do.
  useEffect(() => {
    if (typeof window === "undefined" || entries.length === 0) return
    async function backfill() {
      let touched = false
      for (const e of entries) {
        for (const [legacy, column] of Object.entries(LEGACY_MILESTONE_MAP) as Array<["opened" | "deposited", SavingsMilestone]>) {
          const key = `stacks:savings:${e.id}:${legacy}`
          const hit = localStorage.getItem(key) === "1"
          const alreadyInDb = (e as Record<string, unknown>)[column] != null
          if (hit && !alreadyInDb) {
            await setSavingsMilestone(e.id, column, true)
            touched = true
          }
          if (hit) localStorage.removeItem(key)
        }
      }
      if (touched) await loadData()
    }
    void backfill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length])

  function resetForm() {
    setFInstitution(""); setFBonusName(""); setFBonusAmount(""); setFDepositRequired("")
    setFHoldingDays(""); setFOfferApy(""); setFPromoApy("")
    setFActualValue(""); setFOpenedDate(todayStr()); setFDeadline("")
    setFStatus("planned"); setFNotes(""); setEditingId(null)
  }

  function populateForm(e: SavingsEntry) {
    setFInstitution(e.institution_name); setFBonusName(e.bonus_name ?? ""); setFBonusAmount(String(e.bonus_amount ?? ""))
    setFDepositRequired(String(e.deposit_required ?? "")); setFHoldingDays(String(e.holding_period_days ?? ""))
    setFOfferApy(e.offer_apy != null ? String(e.offer_apy * 100) : ""); setFPromoApy(e.promo_apy != null ? String(e.promo_apy * 100) : "")
    setFActualValue(String(e.actual_value ?? "")); setFOpenedDate(e.opened_date ?? todayStr())
    setFDeadline(e.deadline ?? ""); setFStatus(e.status); setFNotes(e.notes ?? "")
  }

  async function handleSave() {
    const payload = {
      institution_name: fInstitution,
      bonus_name: fBonusName || null,
      bonus_amount: fBonusAmount ? parseFloat(fBonusAmount) : null,
      deposit_required: fDepositRequired ? parseFloat(fDepositRequired) : null,
      holding_period_days: fHoldingDays ? parseInt(fHoldingDays) : null,
      offer_apy: fOfferApy ? parseFloat(fOfferApy) / 100 : null,
      promo_apy: fPromoApy ? parseFloat(fPromoApy) / 100 : null,
      estimated_yield: autoYield > 0 ? autoYield : null,
      expected_total_value: autoTotal > 0 ? autoTotal : null,
      actual_value: fActualValue ? parseFloat(fActualValue) : null,
      opened_date: fOpenedDate || null,
      deadline: fDeadline || null,
      status: fStatus,
      notes: fNotes || null,
    }
    if (editingId) {
      await updateSavingsEntry(editingId, payload)
    } else {
      const entry = await addSavingsEntry(userId, payload)
      if (entry) track("bonus_started", { module: "savings", source: "manual_add", institution: payload.institution_name, status: fStatus, expected_total: payload.expected_total_value ?? 0 })
    }
    resetForm()
    setShowAdd(false)
    await loadData()
  }

  async function handleDelete(id: string) {
    await deleteSavingsEntry(id)
    await loadData()
  }

  // Profile save with debounce
  const profileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function updateProfileField(updates: Partial<SavingsProfile>) {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (profileTimeout.current) clearTimeout(profileTimeout.current)
    profileTimeout.current = setTimeout(() => {
      upsertSavingsProfile({ user_id: userId, ...updates })
    }, 400)
  }

  // Calculations
  const activeEntries = entries.filter(e => e.status === "active")
  const plannedEntries = entries.filter(e => e.status === "planned")
  const completedEntries = entries.filter(e => e.status === "completed")
  const canceledEntries = entries.filter(e => e.status === "canceled")

  const totalEarned = completedEntries.reduce((s, e) => s + (e.actual_value ?? e.expected_total_value ?? 0), 0)

  // Balance is null until the user sets it. Treat 0 as "unknown" too — we
  // explicitly want to avoid making up a placeholder balance and producing
  // a misleading projection (the previous code silently fell back to a
  // $50,000 placeholder).
  const hasBalance = profile.current_balance != null && profile.current_balance > 0
  const currentBalance = profile.current_balance ?? 0
  const currentApy = profile.current_apy ?? 0
  const currentAnnualYield = currentBalance * currentApy

  // Protected cash never gets recommended for bonuses. Emergency fund and
  // cash reserves both come out of the same pool — sum them, then floor at
  // zero so recommendations can't ever allocate into the protected bucket.
  const emergencyFund = profile.emergency_fund ?? 0
  const cashReserves = profile.cash_reserves ?? 0
  const protectedCash = emergencyFund + cashReserves
  const deployableCash = Math.max(0, currentBalance - protectedCash)

  const potentialFromOpportunities = [...activeEntries, ...plannedEntries].reduce((s, e) => {
    return s + (e.expected_total_value ?? (e.bonus_amount ?? 0) + (e.estimated_yield ?? 0))
  }, 0)

  const delta = potentialFromOpportunities

  // Savings sequencer — rank bonuses by effective APY.
  // We identify which catalog bonus each entry refers to via bonus_name
  // (savings_entries.canonical_offer_id is a uuid column and our catalog
  // IDs are strings, so the id is stored in bonus_name instead).
  const inProgressBonusIds = entries
    .filter(e => e.status === "active" || e.status === "planned")
    .map(e => e.bonus_name)
    .filter(Boolean) as string[]
  const completedBonusIds = entries
    .filter(e => e.status === "completed")
    .map(e => e.bonus_name)
    .filter(Boolean) as string[]

  // Only run the sequencer when there's deployable cash. Running it with a
  // zero balance just returns "skipped, need $X" for every bonus.
  const sequencerResult = hasBalance && deployableCash > 0
    ? runSavingsSequencer({
        availableBalance: deployableCash,
        completedBonusIds,
        skippedBonusIds: [...skippedSavingsIds, ...inProgressBonusIds],
        userState,
        currentHysaApy: currentApy || 0,
        includeBusiness: showBusiness,
        includeBrokerage: showBrokerage,
        businessOnly,
        militaryAffiliated,
        // "Bonus $" sort drives the whole plan, not just card order: tier
        // selection takes the biggest absolute payout and the 12-month
        // projection re-sequences around it.
        prioritize: recSort,
      })
    : { entries: [] as SavingsSequencedEntry[], total_earnings: 0, total_days: 0, skipped: [] as { bank_name: string; reason: string }[] }

  // Sequencer now handles business/brokerage/business-only filtering, so every
  // consumer of sequencerResult.entries (recommendations AND the year-plan
  // rotation table) stays consistent.
  // Hide anything the user *just* clicked start on — the DB write is still
  // in-flight, and we don't want the card to sit there looking unresponsive.
  // One action card per bonus. A churnable bonus can be sequenced several
  // times across the plan (each rotation after its cooldown); the 12-month
  // projection table shows every rotation, but the "Start" cards shouldn't list
  // the same bank twice. Entries arrive start_day-ascending, so the first
  // occurrence is the earliest rotation — keep that one.
  const seenRecIds = new Set<string>()
  const uniqueRecEntries = sequencerResult.entries.filter((e) => {
    if (seenRecIds.has(e.id)) return false
    seenRecIds.add(e.id)
    return true
  })
  const recSearchQ = recSearch.trim().toLowerCase()
  const filteredEntries = uniqueRecEntries
    .filter((e) => !justStartedIds.has(e.id))
    .filter((e) => !recSearchQ || e.bank_name.toLowerCase().includes(recSearchQ))
    // Display ordering. The sequencer already ranks by the chosen objective;
    // mirror it here so card order matches the plan. "Bonus $" sorts by raw
    // bonus dollars (tie-break on APY); "Effective APY" sorts by APY.
    .slice()
    .sort((a, b) =>
      recSort === "amount"
        ? b.bonus_amount - a.bonus_amount || b.effective_apy - a.effective_apy
        : b.effective_apy - a.effective_apy
    )

  // Start a recommended bonus — add it as a savings entry
  async function handleStartRecommended(rec: SavingsSequencedEntry) {
    setStartError(null)
    setStartingId(rec.id)
    // Optimistic: hide this card immediately so the click feels responsive
    setJustStartedIds((prev) => new Set(prev).add(rec.id))
    try {
      const result = await addSavingsEntry(userId, {
        institution_name: rec.bank_name,
        bonus_name: rec.bonus.id,
        bonus_amount: rec.bonus_amount,
        deposit_required: rec.deposit,
        holding_period_days: rec.hold_days,
        offer_apy: rec.base_apy,
        promo_apy: null,
        estimated_yield: rec.interest_earned,
        expected_total_value: rec.total_earnings,
        actual_value: null,
        opened_date: todayStr(),
        deadline: null,
        status: "active",
        notes: rec.bonus.notes || null,
        source_type: "system",
        // canonical_offer_id is a uuid column in savings_entries; our string
        // bonus IDs (e.g. "etrade-premium-savings-2026") are not UUIDs, so
        // passing rec.id here makes Postgres reject the insert with a type
        // cast error. Store the string identifier in bonus_name instead and
        // leave canonical_offer_id null.
        canonical_offer_id: null,
      })
      if (!result) throw new Error("Insert returned null — check RLS/schema. See browser console for detail.")
      track("bonus_started", { module: "savings", source: "recommended", institution: rec.bank_name, expected_total: rec.total_earnings })
      await loadData()
    } catch (err) {
      // Roll back the optimistic hide so the user can retry
      setJustStartedIds((prev) => {
        const next = new Set(prev)
        next.delete(rec.id)
        return next
      })
      const msg = err instanceof Error ? err.message : String(err)
      setStartError(`Couldn't start "${rec.bank_name}": ${msg}`)
      console.error("[savings] handleStartRecommended failed:", err)
    } finally {
      setStartingId(null)
    }
  }

  // Logout lives in the shared StacksAccountMenu rendered by CheckpointNav.

  if (loading) {
    return <div style={{ minHeight: "100vh", background: DK.board, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#9aa1ad", fontSize: 14 }}>Loading...</div></div>
  }

  return (
    <div style={{ minHeight: "100vh", background: DK.board, color: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
        <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#ffffff", textDecoration: "none" }}>Stacks OS</a>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select value={userState ?? ""} onChange={async e => {
            const newState = e.target.value || null
            setUserState(newState)
            const sb = createClient()
            await sb.from("user_profiles").update({ state: newState }).eq("user_id", userId)
          }}
            style={{ fontSize: 12, color: userState ? DK.greenFg : "#9aa1ad", background: DK.panel, border: "1px solid #2a2e38", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
            <option value="">Nationwide bonuses only</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setShowProfile(s => !s)} style={topBtn}>{showProfile ? "Close" : "Savings Profile"}</button>
          <button onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          }} style={topBtn}>Subscription</button>
        </div>
      </div>

      {/* System status strip — mirrors the paycheck/spending status header */}
      <div style={{ background: DK.greenBg, borderBottom: "1px solid rgba(13,150,104,0.12)", padding: "8px 0", width: "100%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#9aa1ad" }}>
            Tracking <strong>{savingsBonusesCatalog.filter(b => !b.expired).length}</strong> savings bonuses
          </span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>·</span>
          <span style={{ fontSize: 12, color: "#9aa1ad" }}>Ranked by effective APY for your balance</span>
        </div>
      </div>

      <CheckpointNav />

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* The Stack — gamified running total of bonuses banked this year, with
            the in-play potential as the goal. Ticks up + pops when a savings
            bonus is marked complete. */}
        <FatStackMeter
          banked={Math.round(totalEarned)}
          goal={Math.round(totalEarned + potentialFromOpportunities)}
          label="Banked this year"
          count={completedEntries.length}
          countLabel="completed"
        />

        {/* Start-bonus error banner */}
        {startError && (
          <div
            role="alert"
            style={{
              background: DK.redBg,
              border: "1px solid #7f1d1d",
              color: "#f87171",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.4,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{startError}</span>
            <button
              onClick={() => setStartError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontWeight: 700,
                padding: 0,
              }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Savings Profile Panel */}
        {showProfile && (
          <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", marginBottom: 16 }}>Savings Profile</div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={label}>Current balance</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 14 }}>$</span>
                  <input type="number" value={profile.current_balance ?? ""} onChange={e => updateProfileField({ current_balance: Number(e.target.value) || null })}
                    style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                </div>
              </div>
              <div>
                <div style={label}>Current APY (%)</div>
                <input type="number" step="0.01" value={profile.current_apy != null ? profile.current_apy * 100 : ""} onChange={e => updateProfileField({ current_apy: e.target.value ? parseFloat(e.target.value) / 100 : null })}
                  style={{ ...inputStyle, width: 100 }} placeholder="4.5" />
              </div>
              <div>
                <div style={label}>Current institution</div>
                <input type="text" value={profile.current_institution ?? ""} onChange={e => updateProfileField({ current_institution: e.target.value || null })}
                  style={{ ...inputStyle, width: 180 }} placeholder="e.g. Marcus" />
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 12 }}>Changes save automatically</div>

            {/* Bonus type toggles */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #23262e", display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={showBusiness} onChange={e => { setShowBusiness(e.target.checked); localStorage.setItem("stacks_show_business", String(e.target.checked)) }}
                  style={{ accentColor: DK.purple }} />
                <span style={{ fontSize: 13, color: "#9aa1ad" }}>I have a business entity</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={showBrokerage} onChange={e => { setShowBrokerage(e.target.checked); localStorage.setItem("stacks_show_brokerage", String(e.target.checked)) }}
                  style={{ accentColor: DK.accentFg }} />
                <span style={{ fontSize: 13, color: "#9aa1ad" }}>Include brokerage bonuses</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={businessOnly} onChange={e => { setBusinessOnly(e.target.checked); localStorage.setItem("stacks_business_only", String(e.target.checked)) }}
                  style={{ accentColor: DK.purple }} />
                <span style={{ fontSize: 13, color: "#9aa1ad" }}>Business only</span>
              </label>
            </div>

            {/* Optional: emergency fund / cash reserves */}
            <details style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #23262e" }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#9aa1ad", cursor: "pointer" }}>Optional: reserves tracking</summary>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
                <div>
                  <div style={label}>Emergency fund</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 14 }}>$</span>
                    <input type="number" value={profile.emergency_fund ?? ""} onChange={e => updateProfileField({ emergency_fund: Number(e.target.value) || null })}
                      style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                  </div>
                </div>
                <div>
                  <div style={label}>Cash reserves</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9aa1ad", fontSize: 14 }}>$</span>
                    <input type="number" value={profile.cash_reserves ?? ""} onChange={e => updateProfileField({ cash_reserves: Number(e.target.value) || null })}
                      style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* ── Cash Allocation: total / protected / deployable ── */}
        {!hasBalance ? (
          <div style={{
            background: DK.panel, border: "2px solid #4a3a16",
            borderRadius: 14, padding: "20px 24px", marginBottom: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Set your savings balance
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                Recommendations need a real balance to be useful.
              </div>
              <div style={{ fontSize: 13, color: "#9aa1ad", lineHeight: 1.5 }}>
                Open Savings Profile and enter your current balance, plus emergency fund and reserves you want to keep untouched.
              </div>
            </div>
            <button onClick={() => setShowProfile(true)} style={{
              fontSize: 13, fontWeight: 700, color: "#fff", background: DK.green,
              padding: "11px 18px", borderRadius: 10, border: "none", cursor: "pointer", flexShrink: 0,
            }}>
              Set balance →
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12, marginBottom: 20,
          }}>
            <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total cash</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{money(currentBalance)}</div>
              {profile.current_institution && (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>at {profile.current_institution}</div>
              )}
            </div>
            <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Protected</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: protectedCash > 0 ? "#f59e0b" : "#6b7280", marginTop: 2 }}>{money(protectedCash)}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                {emergencyFund > 0 && cashReserves > 0 ? `${money(emergencyFund)} fund + ${money(cashReserves)} reserves` :
                 emergencyFund > 0 ? "emergency fund" :
                 cashReserves > 0 ? "reserves" :
                 "none set"}
              </div>
            </div>
            <div style={{
              background: deployableCash > 0 ? DK.greenBg : DK.panel,
              border: `1px solid ${deployableCash > 0 ? "#34d399" : "#23262e"}`,
              borderRadius: 10, padding: "14px 18px",
            }}>
              <div style={{ fontSize: 10, color: DK.greenFg, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deployable</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: deployableCash > 0 ? DK.greenFg : "#6b7280", marginTop: 2 }}>{money(deployableCash)}</div>
              <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 3 }}>
                {deployableCash > 0 ? "available for bonuses" : "all cash is protected"}
              </div>
            </div>
          </div>
        )}

        {/* ── Projection Hero (Pro only — free tier shows nothing auto-generated) ── */}
        {isPaid && hasBalance && deployableCash > 0 && (() => {
          const balance = deployableCash
          const year1Entries = sequencerResult.entries.filter(e => e.start_day < 365)
          const year2Entries = sequencerResult.entries.filter(e => e.start_day >= 365 && e.start_day < 730)
          const year3Entries = sequencerResult.entries.filter(e => e.start_day >= 730 && e.start_day < 1095)
          let y1Bonus = 0, y1Interest = 0, y1Incremental = 0, y2Bonus = 0, y2Interest = 0, y3Bonus = 0, y3Interest = 0
          for (const e of year1Entries) { y1Bonus += e.bonus_amount; y1Interest += e.interest_earned; y1Incremental += e.incremental_vs_hysa }
          for (const e of year2Entries) { y2Bonus += e.bonus_amount; y2Interest += e.interest_earned }
          for (const e of year3Entries) { y3Bonus += e.bonus_amount; y3Interest += e.interest_earned }
          const y1Total = y1Bonus + y1Interest
          const y2Total = y2Bonus + y2Interest
          const y3Total = y3Bonus + y3Interest
          const taxRate = 0.20
          const taxReserve = Math.round((y1Total + totalEarned) * taxRate)

          function addDaysToDate(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
          function fmtShortDate(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
          const today = new Date()

          return (
            <>
              {/* Big number at top */}
              <div style={{ background: DK.greenBg, border: "2px solid #34d399", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: DK.greenFg, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>12-Month Projected Earnings</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: DK.greenFg, marginTop: 4, letterSpacing: "-0.02em" }}>{money(y1Total)}</div>
                    <div style={{ fontSize: 13, color: "#9aa1ad", marginTop: 4 }}>
                      {money(y1Bonus)} in bonuses + {money(y1Interest)} interest on {money(balance)}
                      {year1Entries.length > 0 && ` · ${year1Entries.length} rotation${year1Entries.length !== 1 ? "s" : ""}`}
                    </div>
                    {y1Total > 0 && (
                      <div style={{ fontSize: 13, color: "#9aa1ad", marginTop: 2 }}>
                        {currentApy > 0 ? (
                          <>
                            <span style={{ color: DK.greenFg, fontWeight: 700 }}>{money(y1Incremental)}</span> above leaving it in your {pct(currentApy)} HYSA{" "}
                            <span style={{ color: "#6b7280" }}>(+{(y1Incremental / balance * 100).toFixed(1)}% on your balance)</span>
                          </>
                        ) : (
                          <>Effective return <span style={{ color: DK.greenFg, fontWeight: 700 }}>{(y1Total / balance * 100).toFixed(1)}%</span> — add your HYSA APY to see the real edge over it</>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {y2Total > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", fontWeight: 600 }}>Year 2</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>{money(y2Total)}</div>
                      </div>
                    )}
                    {y3Total > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", fontWeight: 600 }}>Year 3</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>{money(y3Total)}</div>
                      </div>
                    )}
                    {(y2Total > 0 || y3Total > 0) && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", fontWeight: 600 }}>3-Year Total</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: DK.greenFg }}>{money(y1Total + y2Total + y3Total)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase", fontWeight: 600 }}>Earned so far</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: DK.greenFg }}>{money(totalEarned)}</div>
                    </div>
                  </div>
                </div>

                {/* Tax link */}
                {(y1Total > 0 || totalEarned > 0) && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #34d399" }}>
                    <a href="/stacksos/taxes" style={{ fontSize: 12, color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>
                      View tax summary &rarr;
                    </a>
                  </div>
                )}

                {/* Collapsible breakdown */}
                {year1Entries.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 12, fontWeight: 600, color: DK.greenFg, cursor: "pointer" }}>Show full breakdown</summary>
                    <div style={{ marginTop: 12, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #34d399" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Bank</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Open</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Close</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Deposit</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Bonus</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Interest</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Total</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#9aa1ad", fontWeight: 600 }}>Eff. APY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...year1Entries, ...year2Entries, ...year3Entries].map((e, i) => (
                            // Key on id+rotation, not id alone — a churnable bonus
                            // recurs across the plan, so id repeats across rows.
                            <tr key={`${e.id}-${e.rotation}`} style={{ borderBottom: "1px solid #23262e", background: e.start_day >= 365 ? DK.panel3 : "transparent" }}>
                              <td style={{ padding: "8px", color: "#6b7280", fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: "8px", color: "#ffffff", fontWeight: 600 }}>{e.bank_name}</td>
                              <td style={{ padding: "8px", color: "#9aa1ad" }}>{fmtShortDate(addDaysToDate(today, e.start_day))}</td>
                              <td style={{ padding: "8px", color: "#9aa1ad" }}>{fmtShortDate(addDaysToDate(today, e.end_day))}</td>
                              <td style={{ padding: "8px", color: "#9aa1ad", textAlign: "right" }}>{money(e.deposit)}</td>
                              <td style={{ padding: "8px", color: DK.greenFg, textAlign: "right", fontWeight: 600 }}>{money(e.bonus_amount)}</td>
                              <td style={{ padding: "8px", color: "#9aa1ad", textAlign: "right" }}>{money(e.interest_earned)}</td>
                              <td style={{ padding: "8px", color: DK.greenFg, textAlign: "right", fontWeight: 700 }}>{money(e.total_earnings)}</td>
                              <td style={{ padding: "8px", color: "#9aa1ad", textAlign: "right" }}>{(e.effective_apy * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                          <tr style={{ background: DK.greenBg }}>
                            <td colSpan={5} style={{ padding: "8px", fontWeight: 700, color: "#ffffff" }}>Total (3 yr)</td>
                            <td style={{ padding: "8px", color: DK.greenFg, textAlign: "right", fontWeight: 700 }}>{money(y1Bonus + y2Bonus + y3Bonus)}</td>
                            <td style={{ padding: "8px", color: "#9aa1ad", textAlign: "right", fontWeight: 600 }}>{money(y1Interest + y2Interest + y3Interest)}</td>
                            <td style={{ padding: "8px", color: DK.greenFg, textAlign: "right", fontWeight: 800 }}>{money(y1Total + y2Total + y3Total)}</td>
                            <td style={{ padding: "8px" }}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>

              {/* Summary Cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current annual yield</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", marginTop: 2 }}>{money(Math.round(currentAnnualYield))}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{currentApy > 0 ? pct(currentApy) : "No APY set"} on {money(currentBalance)}</div>
                </div>
                <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Potential upside</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: delta > 0 ? DK.greenFg : "#ffffff", marginTop: 2 }}>
                    {delta > 0 ? "+" : ""}{money(Math.round(delta))}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{activeEntries.length + plannedEntries.length} opportunities</div>
                </div>
                <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: DK.greenFg, marginTop: 2 }}>{money(totalEarned)}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{completedEntries.length} completed</div>
                </div>
              </div>
            </>
          )
        })()}

        {/* Active Entries */}
        {activeEntries.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Currently Working On</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeEntries.map(e => {
                const deposit = e.deposit_required ?? 0
                const holdDays = e.holding_period_days ?? 0
                const openDate = e.opened_date ? new Date(e.opened_date + "T00:00:00") : null
                const daysElapsed = openDate ? Math.floor((Date.now() - openDate.getTime()) / 86400000) : 0
                const daysRemaining = holdDays > 0 ? Math.max(0, holdDays - daysElapsed) : 0
                const holdComplete = daysRemaining === 0 && holdDays > 0
                const bonusReceived = e.actual_value != null && e.actual_value > 0
                const openedConfirmed = e.account_opened_at != null
                const depositedConfirmed = e.funded_at != null
                const svFlipped = flippedSavings.has(e.id)
                const svFlipAnimate = flipAnimatedSavingsRef.current.has(e.id)

                const catalogEntry = savingsBonusesCatalog.find(b => b.id === e.bonus_name)
                const offerLink = catalogEntry?.source_links?.[0] ?? null

                // Free "is this bonus actually worth it vs just leaving the cash
                // in your HYSA?" — the same opportunity-cost compare the Pro
                // sequencer does, surfaced on every tracked bonus (NOT Pro-gated).
                const bonusAmt = e.bonus_amount ?? 0
                const hysaWouldEarn = deposit > 0 && holdDays > 0 && currentApy > 0 ? deposit * currentApy * (holdDays / 365) : null
                const hysaEdge = hysaWouldEarn != null ? bonusAmt - hysaWouldEarn : null

                return (
                  <div key={e.id} style={{ background: DK.panel, border: "2px solid #34d399", borderRadius: 14, padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#ffffff" }}>{e.institution_name}</div>
                          {offerLink && catalogEntry && (
                            <a href={applyUrl(catalogEntry.id, deposit || undefined)} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: DK.accentFg, textDecoration: "none", fontWeight: 500 }}>
                              View offer ↗
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#9aa1ad", marginTop: 2 }}>
                          {money(e.bonus_amount ?? 0)} bonus · {money(deposit)} deposit · {holdDays} days
                        </div>
                        {catalogEntry && catalogEntry.tiers.length > 1 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Deposit tier</span>
                            {catalogEntry.tiers.map(t => {
                              const selected = t.min_deposit === deposit
                              return (
                                <button
                                  key={t.min_deposit}
                                  onClick={() => handleTierChange(e, catalogEntry, t)}
                                  title={`Deposit ${money(t.min_deposit)} → ${money(t.bonus_amount)} bonus`}
                                  style={{
                                    padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 999,
                                    cursor: selected ? "default" : "pointer", whiteSpace: "nowrap",
                                    background: selected ? DK.green : "transparent",
                                    color: selected ? "#ffffff" : "#9aa1ad",
                                    border: `1px solid ${selected ? DK.green : "#2a2e38"}`,
                                  }}>
                                  {money(t.min_deposit)} → {money(t.bonus_amount)}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {hysaEdge != null && hysaWouldEarn != null ? (
                          <div style={{ fontSize: 12, marginTop: 4, color: hysaEdge > 0 ? DK.greenFg : "#f87171", fontWeight: 600 }}>
                            {hysaEdge > 0 ? "+" : ""}{money(Math.round(hysaEdge))} vs your {pct(currentApy)} HYSA
                            <span style={{ color: "#6b7280", fontWeight: 400 }}> · it would earn {money(Math.round(hysaWouldEarn))} on {money(deposit)} over {holdDays}d</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, marginTop: 4, color: "#6b7280" }}>Add your HYSA APY in your profile to see the edge over just leaving the cash there</div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: DK.greenFg }}>{money(e.bonus_amount ?? 0)}</div>
                        {daysRemaining > 0 && <div style={{ fontSize: 11, color: "#f59e0b" }}>{daysRemaining} days remaining</div>}
                        <button onClick={() => toggleSavingsFlip(e.id)}
                          title={svFlipped ? "Back to the next step" : "See the full timeline & details"}
                          style={{ fontSize: 11, fontWeight: 700, color: svFlipped ? DK.accentFg : "#9aa1ad", background: svFlipped ? "rgba(37,99,235,0.14)" : "#0f1219", border: `1px solid ${svFlipped ? "rgba(37,99,235,0.4)" : "#2a2e38"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                          {svFlipped ? "↩ Back" : "☰ Details"}
                        </button>
                      </div>
                    </div>

                    {/* Flip body — FRONT (one next step) OR BACK (full timeline +
                        fees + actions). Keyed so it re-mounts + swings on each flip,
                        mirroring the Paycheck card. */}
                    <div key={svFlipped ? "sv-back" : "sv-front"} style={svFlipAnimate ? { animation: `${svFlipped ? "cardFlipBack" : "cardFlipFront"} .45s cubic-bezier(.2,.7,.2,1) both`, transformOrigin: "center" } : undefined}>
                    {!svFlipped ? (<>

                    {/* ONE clear next step + XP bar (the prototype's ActiveFace
                        pattern) — replaces "read the checklist" with "here's the
                        single thing to do next." The full milestone detail lives
                        on the back of the card. */}
                    {(() => {
                      let objective: string
                      let stepPct: number
                      if (!openedConfirmed) {
                        objective = "Open the account at the bank to begin"
                        stepPct = 6
                      } else if (!depositedConfirmed && deposit > 0) {
                        objective = `Move ${money(deposit)} in to start the hold clock`
                        stepPct = 25
                      } else if (!holdComplete && holdDays > 0) {
                        const hp = Math.min(100, Math.round((daysElapsed / holdDays) * 100))
                        objective = `Hold through the ${holdDays}-day maintenance period`
                        stepPct = 30 + Math.round(hp * 0.55)
                      } else if (holdComplete && !bonusReceived) {
                        objective = "Confirm the bonus posted in your account"
                        stepPct = 90
                      } else if (bonusReceived) {
                        objective = "Close & rotate this cash into your next bonus"
                        stepPct = 100
                      } else {
                        objective = "Bonus in progress"
                        stepPct = 45
                      }
                      return (
                        <NextStepBar
                          objective={objective}
                          pct={stepPct}
                          daysLeft={holdDays > 0 ? daysRemaining : null}
                        />
                      )
                    })()}
                    </>) : (<>

                    {/* Liquidity timeline replaces the legacy checklist +
                        progress bar. The timeline component renders all six
                        milestones (Opened → Funded → Holding → Bonus posted
                        → Safe to withdraw → Next move) with click-to-mark
                        on the user-actionable ones. */}
                    <LiquidityTimeline
                      entry={e}
                      onToggle={(milestone, hit) => handleMilestoneToggle(e, milestone, hit)}
                      transactionsRequired={catalogEntry?.requires_transactions ?? null}
                      recommendation={
                        bonusReceived
                          ? "Close & rotate this cash into your next bonus"
                          : holdComplete && !bonusReceived
                          ? "Confirm the bonus posted in your account"
                          : !openedConfirmed
                          ? "Open the account at the bank to begin"
                          : !depositedConfirmed && deposit > 0
                          ? `Move ${money(deposit)} into the account to start the hold clock`
                          : null
                      }
                    />

                    {/* Fee reality check — monthly maintenance / early-closure
                        fees on the matched catalog bonus, with the honest
                        net-after-fees + waive-vs-HYSA math. Only rendered when
                        the offer actually carries a fee. */}
                    {catalogEntry && (catalogEntry.fees.monthly_fee > 0 || catalogEntry.fees.early_closure_fee > 0) && (() => {
                      const f = catalogEntry.fees
                      const waiver: FeeWaiver | null =
                        f.monthly_fee > 0
                          ? f.monthly_fee_waiver_balance && f.monthly_fee_waiver_balance > 0
                            ? { type: "balance", label: `keeping $${f.monthly_fee_waiver_balance.toLocaleString()} in the account`, balance: f.monthly_fee_waiver_balance }
                            : f.monthly_fee_waived
                            ? { type: "dd", label: "keeping a qualifying deposit going" }
                            : null
                          : null
                      return (
                        <FeeStrip
                          bonusAmount={bonusAmt}
                          monthlyFee={f.monthly_fee}
                          earlyClosureFee={f.early_closure_fee}
                          holdingDays={holdDays || catalogEntry.total_hold_days}
                          waiver={waiver}
                          accountApy={e.offer_apy ?? undefined}
                          bestHysaApy={currentApy || undefined}
                          safeCloseLabel={f.early_closure_fee_days ? `day ${f.early_closure_fee_days}` : null}
                        />
                      )
                    })()}

                    {/* Actions */}
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      {holdComplete && !bonusReceived && (
                        <button onClick={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }}
                          style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, background: DK.green, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                          Mark bonus received
                        </button>
                      )}
                      {bonusReceived && (
                        <button onClick={async () => { await updateSavingsEntry(e.id, { status: "completed" }); await loadData() }}
                          style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, background: DK.green, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                          Complete &amp; withdraw
                        </button>
                      )}
                      <button onClick={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }}
                        style={{ padding: "8px 16px", fontSize: 12, color: "#9aa1ad", background: "none", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer" }}>
                        Edit
                      </button>
                      {/* Undo for genuinely-untouched entries — visible only when
                          no manual steps logged + no actual_value posted. Hides
                          itself the moment the user makes any progress so we
                          can't blow away a real in-flight bonus by accident. */}
                      {!openedConfirmed && !depositedConfirmed && !bonusReceived && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Undo "${e.institution_name}"? This removes the entry — only do this if you didn't actually start the bonus.`)) return
                            await deleteSavingsEntry(e.id)
                            await loadData()
                          }}
                          style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 12, color: "#9aa1ad", background: "none", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer" }}
                          title="Remove this entry — for accidental Start clicks before any actual progress"
                        >
                          Undo (didn&apos;t start)
                        </button>
                      )}
                    </div>
                    </>)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── First-run "Start here" banner ── */}
        {entries.length === 0 && (
          <div style={{
            background: "linear-gradient(135deg, #12151c 0%, #161922 100%)",
            border: "1px solid #23262e",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: DK.greenFg, fontWeight: 700, marginBottom: 4 }}>
              Start here
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#34d399", margin: "0 0 4px" }}>
              {isPaid ? "Pick your first savings bonus" : "Track your first savings bonus"}
            </h2>
            <p style={{ fontSize: 13, color: "#34d399", margin: 0, lineHeight: 1.5 }}>
              {isPaid
                ? "Sorted best-first for you. Tap “Start” on any offer below to begin tracking — or add one you already have."
                : "Sorted best-first for you. Use “+ Add savings bonus / opportunity” below to begin tracking — or add one you already have."}
            </p>
          </div>
        )}

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
                Get savings bonuses ranked for your balance
              </div>
              <div style={{ fontSize: 13, color: "#9aa1ad", lineHeight: 1.5 }}>
                Stacks ranks every savings bonus and HYSA promotion by effective APY for your specific balance and sequences them across the year.
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

        {/* ── Recommended Savings Bonuses ── */}
        {isPaid && (sequencerResult.entries.length > 0 || recSearchQ) && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recommended — Ranked by {recSort === "amount" ? "Bonus $" : "Effective APY"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>Sort by</span>
                <div style={{ display: "inline-flex", border: "1px solid #2a2e38", borderRadius: 8, overflow: "hidden" }}>
                  {([["apy", "Effective APY"], ["amount", "Bonus $"]] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => { setRecSort(val); localStorage.setItem("stacks_rec_sort", val) }}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "5px 11px", border: "none", cursor: "pointer",
                        background: recSort === val ? DK.purpleBorder : DK.panel2,
                        color: recSort === val ? "#fff" : "#9aa1ad",
                      }}
                    >{lbl}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 10, position: "relative" }}>
              <input
                type="search"
                value={recSearch}
                onChange={e => setRecSearch(e.target.value)}
                placeholder="Search banks…"
                style={{ width: "100%", padding: "9px 34px 9px 12px", fontSize: 13, border: "1px solid #2a2e38", borderRadius: 8, background: DK.panel, color: "#ffffff", outline: "none", boxSizing: "border-box" }}
              />
              {recSearch && (
                <button onClick={() => setRecSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9aa1ad", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                  aria-label="Clear search">✕</button>
              )}
              {recSearchQ && (
                <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 4 }}>
                  {filteredEntries.length} match{filteredEntries.length !== 1 ? "es" : ""} for &ldquo;{recSearch}&rdquo;
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEntries.map((rec, idx) => {
                const isExpanded = expandedRec === rec.id
                return (
                  <div key={rec.id} style={{
                    background: DK.panel,
                    border: idx === 0 ? "2px solid #60a5fa" : "1px solid #23262e",
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: idx === 0 ? "0 2px 12px rgba(37,99,235,0.05)" : "none",
                  }}>
                    {/* Header */}
                    {(() => {
                      const combo = getComboFor(rec.bonus.id)
                      const isCombo = !!combo && !!comboMode[rec.id]
                      const offerUrl = isCombo && combo?.combo_url ? combo.combo_url : ((rec.tier.enroll_url || rec.bonus.source_links?.[0]) ? applyUrl(rec.bonus.id, rec.deposit) : undefined)
                      const headlineTotal = isCombo ? rec.total_earnings + (combo!.comboTotal - combo!.selfEffectiveAmount) : rec.total_earnings
                      return (
                        <>
                          <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>{rec.bank_name}</div>
                              {idx === 0 && (
                                <span style={{ fontSize: 9, color: "#60a5fa", background: DK.blueBg, border: "1px solid rgba(37,99,235,0.4)", padding: "1px 7px", borderRadius: 99, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Recommended
                                </span>
                              )}
                              <VerifiedBadge state={verificationStates.get(rec.bonus.id)} />
                              {offerUrl && (
                                <a href={offerUrl} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 11, color: DK.accentFg, textDecoration: "none", fontWeight: 500 }}>
                                  {isCombo ? "View combo offer" : "View offer"}
                                </a>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: DK.greenFg }}>+{money(headlineTotal)}</div>
                              <div style={{ fontSize: 11, color: "#9aa1ad" }}>{isCombo ? "combo total" : "bonus + yield"}</div>
                            </div>
                          </div>
                          {combo && (
                            <div style={{ padding: "10px 24px 0" }}>
                              <label
                                onClick={() => setComboMode(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "6px 10px",
                                  background: isCombo ? DK.greenBg : DK.panel2,
                                  border: `1px solid ${isCombo ? "#34d399" : "#23262e"}`,
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontSize: 11,
                                  color: isCombo ? DK.greenFg : "#9aa1ad",
                                  fontWeight: isCombo ? 600 : 500,
                                }}
                              >
                                <input type="checkbox" checked={isCombo} onChange={() => {}} style={{ accentColor: DK.greenFg, cursor: "pointer" }} />
                                <span>
                                  Open as combo with{" "}
                                  {combo.partners.map((p, i) => (
                                    <span key={i}>
                                      <strong>{(p.entry as { bank_name?: string }).bank_name ?? "partner"}</strong>
                                      {i < combo.partners.length - 1 && " + "}
                                    </span>
                                  ))}
                                  {" "}(+${(combo.comboTotal - combo.selfEffectiveAmount).toLocaleString()} extra)
                                </span>
                              </label>
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* Key metrics */}
                    <div style={{ padding: "12px 24px 0", display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Effective APY</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: DK.purple }}>{(rec.effective_apy * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Bonus</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{money(rec.bonus_amount)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Interest</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{money(rec.interest_earned)}</div>
                      </div>
                      {rec.fee_cost > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Fees</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }} title={`${money(rec.bonus.fees.monthly_fee)}/mo not waived at this deposit — netted out of the APY above`}>−{money(rec.fee_cost)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Deposit</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{money(rec.deposit)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Hold</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{rec.hold_days} days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Base APY</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{(rec.base_apy * 100).toFixed(2)}%</div>
                      </div>
                      {currentApy > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>vs your HYSA</div>
                          <div style={{
                            fontSize: 14, fontWeight: 700,
                            color: rec.incremental_vs_hysa > 0 ? DK.greenFg : "#f87171",
                          }}>
                            {rec.incremental_vs_hysa > 0 ? "+" : ""}{money(rec.incremental_vs_hysa)}
                          </div>
                          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                            {(currentApy * 100).toFixed(2)}% baseline · {money(rec.hysa_baseline_earnings)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Rotation indicator */}
                    <div style={{ padding: "8px 24px 0", fontSize: 11, color: "#9aa1ad" }}>
                      Rotation #{rec.rotation} — Day {rec.start_day} to {rec.end_day}
                    </div>

                    {/* Expandable details */}
                    <div style={{ padding: "8px 24px 4px" }}>
                      <button onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                        style={{ fontSize: 12, color: DK.greenFg, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                        {isExpanded ? "Hide details" : "Offer details"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {rec.bonus.eligibility.eligibility_notes && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginBottom: 3 }}>Eligibility</div>
                            <div style={{ fontSize: 12, color: "#9aa1ad", lineHeight: 1.5 }}>{rec.bonus.eligibility.eligibility_notes}</div>
                          </div>
                        )}
                        {rec.bonus.raw_excerpt && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginBottom: 3 }}>How it works</div>
                            <div style={{ fontSize: 12, color: "#9aa1ad", lineHeight: 1.5 }}>{rec.bonus.raw_excerpt}</div>
                          </div>
                        )}
                        {rec.bonus.notes && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginBottom: 3 }}>Strategy</div>
                            <div style={{ fontSize: 12, color: DK.purple, lineHeight: 1.5, fontWeight: 500 }}>{rec.bonus.notes}</div>
                          </div>
                        )}
                        {/* All tiers */}
                        {rec.bonus.tiers.length > 1 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", marginBottom: 3 }}>All tiers</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {rec.bonus.tiers.map(t => (
                                <div key={t.min_deposit} style={{ fontSize: 12, color: t.min_deposit === rec.deposit ? DK.greenFg : "#9aa1ad" }}>
                                  {t.min_deposit === rec.deposit ? "→ " : "  "}
                                  {money(t.min_deposit)} deposit → {money(t.bonus_amount)} bonus
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Requirements are set by the bank and may change.</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ padding: "8px 24px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleStartRecommended(rec)}
                        disabled={startingId === rec.id}
                        style={{
                          padding: "8px 18px",
                          fontSize: 13,
                          fontWeight: 700,
                          background: startingId === rec.id ? DK.greenFg : DK.green,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: startingId === rec.id ? "wait" : "pointer",
                          opacity: startingId === rec.id ? 0.75 : 1,
                        }}
                      >
                        {startingId === rec.id ? "Adding…" : "Start this bonus"}
                      </button>
                      <button
                        onClick={() => setAlreadyHaveRecId(alreadyHaveRecId === rec.id ? null : rec.id)}
                        title="Record as already held so we stop recommending it"
                        style={{ padding: "8px 14px", fontSize: 12, color: "#9aa1ad", background: "none", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
                      >
                        {alreadyHaveRecId === rec.id ? "Cancel" : "Already have"}
                      </button>
                      <button onClick={() => setSkippedSavingsIds(prev => [...prev, rec.id])}
                        style={{ padding: "8px 14px", fontSize: 12, color: "#9aa1ad", background: "none", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer" }}>
                        Skip
                      </button>
                    </div>
                    {alreadyHaveRecId === rec.id && (
                      <div style={{ padding: "0 24px 16px" }}>
                        <AlreadyHaveForm
                          itemLabel={`${rec.bank_name} bonus`}
                          onSave={async (payload) => {
                            await addSavingsEntry(userId, {
                              institution_name: rec.bank_name,
                              bonus_name: rec.bonus.id,
                              bonus_amount: rec.bonus_amount,
                              deposit_required: rec.deposit,
                              holding_period_days: rec.hold_days,
                              offer_apy: rec.bonus.base_apy ?? null,
                              expected_total_value: rec.total_earnings,
                              actual_value: payload.bonus_received ? payload.actual_amount ?? null : null,
                              opened_date: payload.opened_date,
                              deadline: null,
                              status: "completed",
                              source_type: "system",
                              notes: payload.incomplete_info ? "Added via 'Already have' — dates unknown" : null,
                              incomplete_info: payload.incomplete_info,
                            })
                            setAlreadyHaveRecId(null)
                            await loadData()
                          }}
                          onCancel={() => setAlreadyHaveRecId(null)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sequencer summary */}
            <div style={{ marginTop: 12, padding: "12px 16px", background: DK.panel2, border: "1px solid #23262e", borderRadius: 10, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Total potential</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: DK.greenFg }}>{money(sequencerResult.total_earnings)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Rotation period</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{Math.round(sequencerResult.total_days / 30)} months</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#9aa1ad", textTransform: "uppercase" }}>Bonuses available</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{uniqueRecEntries.length}</div>
              </div>
            </div>

            {/* Skipped bonuses */}
            {sequencerResult.skipped.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11, color: "#9aa1ad", cursor: "pointer" }}>
                  {sequencerResult.skipped.length} bonuses not shown
                </summary>
                <div style={{ marginTop: 4 }}>
                  {sequencerResult.skipped.map((s, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#6b7280" }}>{s.bank_name}: {s.reason}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Planned Entries */}
        {plannedEntries.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planned</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plannedEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </div>
        )}

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          style={{ fontSize: 13, fontWeight: 600, color: DK.greenFg, background: "none", border: "1px solid #34d399", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginBottom: 28 }}>
          + Add savings bonus / opportunity
        </button>

        {/* Completed */}
        {completedEntries.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", cursor: "pointer", padding: "6px 0" }}>Completed ({completedEntries.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {completedEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Canceled */}
        {canceledEntries.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#9aa1ad", cursor: "pointer", padding: "6px 0" }}>Canceled ({canceledEntries.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {canceledEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Add/Edit Modal */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); resetForm() } }}>
            <div style={{ background: DK.panel, borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 20 }}>
                {editingId ? "Edit Savings Entry" : "Add Savings Bonus / Opportunity"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={label}>Institution *</div>
                  <input value={fInstitution} onChange={e => setFInstitution(e.target.value)} style={inputStyle} placeholder="e.g. Wealthfront" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Bonus name</div>
                    <input value={fBonusName} onChange={e => setFBonusName(e.target.value)} style={inputStyle} placeholder="e.g. New deposit bonus" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Status</div>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value as SavingsEntry["status"])} style={{ ...selectStyle, width: "100%" }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 5, lineHeight: 1.4 }}>Most people leave this on Planned — it updates automatically as you progress.</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Bonus amount</div>
                    <input type="number" value={fBonusAmount} onChange={e => setFBonusAmount(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Deposit required <InfoTip term="openingDeposit" label="opening deposit" /></div>
                    <input type="number" value={fDepositRequired} onChange={e => setFDepositRequired(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Holding period (days) <InfoTip term="holdPeriod" label="holding period" /></div>
                    <input type="number" value={fHoldingDays} onChange={e => setFHoldingDays(e.target.value)} style={inputStyle} placeholder="90" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Requirements deadline <InfoTip tip="The last day to open, fund, and meet the bonus requirements. Miss it and the bonus is forfeited." label="requirements deadline" /></div>
                    <input type="date" value={fDeadline} onChange={e => setFDeadline(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Ongoing APY (%)</div>
                    <input type="number" step="0.01" value={fOfferApy} onChange={e => setFOfferApy(e.target.value)} style={inputStyle} placeholder="4.5" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Promo APY (%)</div>
                    <input type="number" step="0.01" value={fPromoApy} onChange={e => setFPromoApy(e.target.value)} style={inputStyle} placeholder="5.0" />
                  </div>
                </div>

                {/* Auto-calculated summary */}
                <div style={{ background: DK.panel2, border: "1px solid #23262e", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Calculated value</div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#9aa1ad" }}>Est. yield</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#9aa1ad" }}>{autoYield > 0 ? money(autoYield) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#9aa1ad" }}>Bonus</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#9aa1ad" }}>{fBonusAmount ? money(parseFloat(fBonusAmount)) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#9aa1ad" }}>Total expected</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: autoTotal > 0 ? DK.greenFg : "#9aa1ad" }}>{autoTotal > 0 ? money(autoTotal) : "—"}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>Auto-calculated from deposit, APY, and holding period</div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Opened date</div>
                    <input type="date" value={fOpenedDate} onChange={e => setFOpenedDate(e.target.value)} style={inputStyle} />
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
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button onClick={() => { setShowAdd(false); resetForm() }}
                  style={{ padding: "10px 20px", fontSize: 13, background: "transparent", color: "#9aa1ad", border: "1px solid #2a2e38", borderRadius: 8, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!fInstitution}
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: fInstitution ? DK.green : DK.border2, color: "#fff", border: "none", borderRadius: 8, cursor: fInstitution ? "pointer" : "default" }}>
                  {editingId ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EntryRow({ entry: e, onEdit, onDelete, onStatusChange }: {
  entry: SavingsEntry
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: SavingsEntry["status"]) => void
}) {
  const totalValue = e.expected_total_value ?? ((e.bonus_amount ?? 0) + (e.estimated_yield ?? 0))
  const statusColors: Record<string, string> = { planned: DK.purple, active: DK.accentFg, completed: DK.greenFg, canceled: "#9aa1ad" }
  const [flipped, setFlipped] = useState(false)

  // Format holding period
  const holdLabel = e.holding_period_days != null
    ? e.holding_period_days >= 365
      ? `${Math.round(e.holding_period_days / 30)} mo hold`
      : `${e.holding_period_days} day hold`
    : null

  const statusPill = (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: statusColors[e.status] ?? "#9aa1ad", background: e.status === "active" ? DK.blueBg : e.status === "completed" ? DK.greenBg : e.status === "planned" ? DK.purpleBg : DK.panel2 }}>
      {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
    </span>
  )

  const ghostBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", border: "1px solid #2a2e38", color: "#9aa1ad", background: "none", borderRadius: 6, cursor: "pointer" }
  const flipBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", border: "1px solid #2a2e38", color: "#9aa1ad", background: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }

  // Active-hold callout (shared between faces)
  const holdCallout = e.status === "active" && holdLabel && e.opened_date ? (() => {
    const opened = new Date(e.opened_date + "T00:00:00")
    const holdEnd = new Date(opened.getTime() + (e.holding_period_days! * 86400000))
    const daysLeft = Math.max(0, Math.ceil((holdEnd.getTime() - Date.now()) / 86400000))
    if (daysLeft > 0) return <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 500, marginTop: 4 }}>{daysLeft} days remaining in hold</div>
    return <div style={{ fontSize: 11, color: DK.greenFg, fontWeight: 500, marginTop: 4 }}>Hold period complete</div>
  })() : null

  return (
    <div style={{ background: DK.panel, border: "1px solid #23262e", borderRadius: 12, padding: "16px 20px", perspective: 1200 }}>
      <div key={flipped ? "back" : "front"} className="cardflip-face">
        {!flipped ? (
          /* ── FRONT — minimal identity + total value + primary action ── */
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{e.institution_name}</span>
                  {e.bonus_name && <span style={{ fontSize: 11, color: "#9aa1ad" }}>{e.bonus_name}</span>}
                  {statusPill}
                  {e.incomplete_info && (
                    <span title="Dates weren't filled in — click Edit to complete. Excluded from cooldown/churn math until filled."
                      style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: "#f59e0b", background: DK.amberBg, border: "1px solid #4a3a16", cursor: "help" }}>
                      ⚠ Needs info
                    </span>
                  )}
                </div>
                {holdCallout}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: DK.greenFg }}>
                  +{money(totalValue)}
                </div>
                <div style={{ fontSize: 10, color: "#9aa1ad" }}>bonus + yield</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              {e.status === "planned" && (
                <button onClick={() => onStatusChange("active")}
                  style={{ fontSize: 11, padding: "4px 12px", background: DK.accent2, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Start
                </button>
              )}
              {e.status === "active" && (
                <button onClick={() => onStatusChange("completed")}
                  style={{ fontSize: 11, padding: "4px 12px", background: DK.green, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Complete
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
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{e.institution_name}</span>
                {statusPill}
              </div>
              <button onClick={() => setFlipped(false)} style={flipBtn}>
                ‹ Back
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#9aa1ad", display: "flex", gap: 16, flexWrap: "wrap" }}>
              {e.bonus_amount != null && <span>Bonus: <strong style={{ color: "#e6e8ec" }}>${e.bonus_amount.toLocaleString()}</strong></span>}
              {e.deposit_required != null && <span>Deposit: ${e.deposit_required.toLocaleString()}</span>}
              {e.offer_apy != null && <span>APY: {(e.offer_apy * 100).toFixed(2)}%</span>}
              {e.promo_apy != null && <span>Promo: {(e.promo_apy * 100).toFixed(2)}%</span>}
              {holdLabel && <span>{holdLabel}</span>}
              {e.deadline && <span>Requirements deadline: {e.deadline}</span>}
              {e.actual_value != null && <span>Actual: ${e.actual_value.toLocaleString()}</span>}
            </div>
            {holdCallout}
            {e.notes && <div style={{ fontSize: 11, color: "#9aa1ad", marginTop: 8 }}>{e.notes}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", borderTop: "1px dashed #23262e", paddingTop: 12 }}>
              <button onClick={onEdit} style={ghostBtn}>Edit</button>
              <button onClick={onDelete} style={ghostBtn}>Remove</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
