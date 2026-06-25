"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import PortfolioCard from "../components/PortfolioCard"
import StartedBonusesList, { type StartedBonus } from "../components/StartedBonusesList"
import HistoricalWinsList, { type HistoricalWin } from "../components/HistoricalWinsList"
import DashboardGoalBar from "../components/DashboardGoalBar"
import PushOptIn from "../components/PushOptIn"
import DashboardViewTabs, { type DashboardView } from "../components/DashboardViewTabs"
import { checkingBonusStep, customBonusStep, spendingCardStep, savingsEntryStep } from "../../lib/bonusNextStep"
import { savingsBonusForEntry } from "../../lib/data/savingsBonuses"
import { getMilestoneDetail } from "../../lib/bonusSteps"
import { track } from "../../lib/analytics"
import CheckpointNav from "../components/CheckpointNav"
import WelcomeWizard from "../components/WelcomeWizard"
import AddCustomBonusModal from "../components/AddCustomBonusModal"
import { runSequencer, type SequencedBonus, type SequencerResult } from "../../lib/sequencer"
import { runSavingsSequencer } from "../../lib/savingsSequencer"
import { sequenceCards, DEFAULT_MAX_CARDS_PER_YEAR } from "../../lib/ccSequencer"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import { bonuses } from "../../lib/data/bonuses"
import type { UserProfile, IncomeSource } from "../../lib/profileTypes"
import { getSavingsProfile, type SavingsProfile } from "../../lib/savingsProfile"
import { getSpendingProfile, type SpendingProfile } from "../../lib/spendingProfile"
import { getCompletedBonuses, markBonusPosted } from "../../lib/completedBonuses"
import { getCustomBonuses, updateCustomBonus, type CustomBonus } from "../../lib/customBonuses"
import { getOwnedCards, updateOwnedCard, type OwnedCard } from "../../lib/ownedCards"
import { getSavingsEntries, setSavingsMilestone, updateSavingsEntry, type SavingsEntry } from "../../lib/savingsEntries"
import type { CompletedBonus } from "../../lib/churn"

const PAYS_PER_MONTH: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
}
function getIncomeSources(p: UserProfile): IncomeSource[] {
  const sources: IncomeSource[] = [
    { pay_frequency: p.pay_frequency, paycheck_amount: p.paycheck_amount },
  ]
  if (p.income_2_frequency && p.income_2_amount && p.income_2_amount > 0) {
    sources.push({ pay_frequency: p.income_2_frequency, paycheck_amount: p.income_2_amount })
  }
  if (p.income_3_frequency && p.income_3_amount && p.income_3_amount > 0) {
    sources.push({ pay_frequency: p.income_3_frequency, paycheck_amount: p.income_3_amount })
  }
  return sources
}
function getTotalMonthlyIncome(p: UserProfile): number {
  return getIncomeSources(p).reduce((total, s) => {
    return total + s.paycheck_amount * (PAYS_PER_MONTH[s.pay_frequency] ?? 2.17)
  }, 0)
}

const NON_ACTIVE_CUSTOM_STEPS = new Set(["pending", "kept_open", "skipped", "bonus_posted"])

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Flag the first not-yet-done item as the "current" step for highlighting. */
function withCurrent(items: { label: string; done: boolean }[]): { label: string; done: boolean; current: boolean }[] {
  const idx = items.findIndex((i) => !i.done)
  return items.map((i, k) => ({ ...i, current: k === idx }))
}

/** Format an annualized return (fraction) as a compact "~52% APY" label. */
function fmtApy(a: number): string {
  const pct = a * 100
  return pct >= 100 ? `~${Math.round(pct)}% APY` : `~${pct.toFixed(1)}% APY`
}

export default function HubClient({
  userEmail,
  userId,
  initialProfile,
  subscriptionStatus,
  isPaid,
}: {
  userEmail: string
  userId: string
  initialProfile: UserProfile
  subscriptionStatus: string | null
  isPaid: boolean
}) {
  const [billingLoading, setBillingLoading] = useState(false)
  async function handleManageBilling() {
    setBillingLoading(true)
    track("billing_portal_opened", { source: "past_due_banner" })
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { setBillingLoading(false); alert(data.error ?? "Could not open billing portal. Email fatstacksacademy@gmail.com for help.") }
    } catch {
      setBillingLoading(false)
      alert("Network error opening billing portal. Email fatstacksacademy@gmail.com for help.")
    }
  }
  const [profile] = useState<UserProfile>(initialProfile)
  const [savingsProfile, setSavingsProfile] = useState<SavingsProfile | null>(null)
  const [spendingProfile, setSpendingProfile] = useState<SpendingProfile | null>(null)
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [customBonuses, setCustomBonuses] = useState<CustomBonus[]>([])
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([])
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [view, setView] = useState<DashboardView>("active")

  const loadData = useCallback(() => {
    getSavingsProfile(userId).then(setSavingsProfile).catch(() => setSavingsProfile(null))
    getSpendingProfile(userId).then(setSpendingProfile).catch(() => setSpendingProfile(null))
    getCompletedBonuses(userId).then(setCompletedRecords).catch(() => setCompletedRecords([]))
    getCustomBonuses(userId).then(setCustomBonuses).catch(() => setCustomBonuses([]))
    getOwnedCards(userId).then(setOwnedCards).catch(() => setOwnedCards([]))
    getSavingsEntries(userId).then(setSavingsEntries).catch(() => setSavingsEntries([]))
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onboarded =
      typeof window !== "undefined" && localStorage.getItem("stacks:onboarded") === "1"
    const hasCompletedOnboarding = !!initialProfile.state
    if (!onboarded && !hasCompletedOnboarding) setShowWizard(true)
  }, [initialProfile])

  // ─── 12-month projections (per-module) ────────────────────────────
  const paycheckProjection = useMemo(() => {
    const result: SequencerResult = runSequencer({
      slots: profile.dd_slots,
      payFrequency: profile.pay_frequency,
      paycheckAmount: profile.paycheck_amount,
      incomeSources: getIncomeSources(profile),
      userState: profile.state,
      militaryAffiliated: profile.military_affiliated === true,
    })
    const allBonuses: SequencedBonus[] = result.slots
      .flat()
      .filter((e) => e.type === "bonus") as SequencedBonus[]
    const bonuses12mo = allBonuses.filter((b) => b.start_week * 7 <= 365)
    const total = bonuses12mo.reduce((s, b) => s + (b.net_bonus ?? b.bonus_amount ?? 0), 0)
    const items = [...bonuses12mo]
      .sort((a, b) => (b.net_bonus ?? b.bonus_amount ?? 0) - (a.net_bonus ?? a.bonus_amount ?? 0))
      .map((b) => ({ label: b.bank_name, amount: b.net_bonus ?? b.bonus_amount ?? 0 }))
    return { total, monthlyIncome: Math.round(getTotalMonthlyIncome(profile)), items }
  }, [profile])

  const savingsProjection = useMemo(() => {
    if (!savingsProfile) return { total: 0, items: [] as { label: string; amount: number }[] }
    const balance = savingsProfile.current_balance ?? 0
    if (balance <= 0) return { total: 0, items: [] }
    const result = runSavingsSequencer({
      availableBalance: balance,
      userState: profile.state,
      currentHysaApy: savingsProfile.current_apy ?? 0,
      includeBrokerage: true,
      militaryAffiliated: profile.military_affiliated === true,
    })
    const items = [...(result.entries ?? [])]
      .sort((a, b) => (b.total_earnings ?? 0) - (a.total_earnings ?? 0))
      .map((e) => ({ label: e.bank_name, amount: Math.round(e.total_earnings ?? 0) }))
    return { total: Math.round(result.total_earnings ?? 0), items }
  }, [savingsProfile, profile.state, profile.military_affiliated])

  const spendingProjection = useMemo(() => {
    const monthlySpend = spendingProfile?.monthly_spend ?? 0
    if (monthlySpend <= 0) return { total: 0, items: [] as { label: string; amount: number; note?: string }[], effectiveApy: null as number | null }
    // Mirror the Spending tab's controls: pace from localStorage,
    // rewards mode from localStorage, per-currency overrides from
    // spending_profile. So the dashboard's spending projection always
    // matches what the user sees inside Spending.
    let pace = DEFAULT_MAX_CARDS_PER_YEAR
    let useTravel = false
    if (typeof window !== "undefined") {
      const v = Number(localStorage.getItem("stacks_cc_pace") ?? "")
      if (Number.isFinite(v) && v > 0) pace = v
      useTravel = localStorage.getItem("stacks_cc_rewards_mode") === "travel"
    }
    const overrides = spendingProfile?.cpp_overrides ?? null
    const sequenced = sequenceCards(creditCardBonuses, monthlySpend, profile.state ?? null, pace, useTravel, overrides, profile.military_affiliated === true)
    const year1List = sequenced.filter((s) => s.cumulative_months <= 12)
    const year1 = year1List.reduce((sum, s) => sum + s.net_value, 0)
    // "Effective APY" for a card SUB = annualized return on the required
    // spend (the capital you route through the card). Mirrors the savings
    // formula: return ÷ capital × annualization factor.
    //   return_on_spend = net_value / min_spend  (from the sequencer)
    //   effApy          = return_on_spend × (12 / months_to_complete)
    const apyFor = (s: typeof year1List[number]): number | null =>
      s.card.min_spend > 0 && s.months_to_complete > 0
        ? s.return_on_spend * (12 / s.months_to_complete)
        : null
    const items = [...year1List]
      .sort((a, b) => b.net_value - a.net_value)
      .map((s) => {
        const apy = apyFor(s)
        return { label: s.card.card_name, amount: Math.round(s.net_value), note: apy != null ? fmtApy(apy) : undefined }
      })
    // Blended module APY: spend-weighted average of the per-card APYs, so the
    // headline reflects where the capital actually goes.
    let weightedSpend = 0
    let weightedApy = 0
    for (const s of year1List) {
      const apy = apyFor(s)
      if (apy != null) { weightedApy += apy * s.card.min_spend; weightedSpend += s.card.min_spend }
    }
    const effectiveApy = weightedSpend > 0 ? weightedApy / weightedSpend : null
    return { total: Math.round(year1), items, effectiveApy }
  }, [spendingProfile, profile.state, profile.military_affiliated])

  const portfolio12mo =
    paycheckProjection.total + savingsProjection.total + spendingProjection.total

  // ─── Started bonuses across all 4 sources ─────────────────────────
  const startedBonuses = useMemo<StartedBonus[]>(() => {
    const out: StartedBonus[] = []

    function addDaysISO(iso: string, days: number): string {
      const d = new Date(iso + "T00:00:00")
      d.setDate(d.getDate() + days)
      return d.toISOString().slice(0, 10)
    }

    // 1) Paycheck checking bonuses: completed_bonuses WHERE closed_date IS NULL
    for (const r of completedRecords) {
      if (r.closed_date) continue
      const b = bonuses.find((x) => (x as { id?: string }).id === r.bonus_id)
      if (!b) continue
      const step = checkingBonusStep(r, b)
      const cat = b as {
        bank_name?: string
        bonus_amount?: number
        timeline?: { bonus_posting_days_est?: number | null; must_remain_open_days?: number | null }
        requirements?: { holding_period_days?: number | null }
      }
      const expectedPayout = r.opened_date && cat.timeline?.bonus_posting_days_est
        ? addDaysISO(r.opened_date, cat.timeline.bonus_posting_days_est)
        : null
      const holdDays = cat.requirements?.holding_period_days ?? cat.timeline?.must_remain_open_days ?? null
      const safeClose = r.opened_date && holdDays
        ? addDaysISO(r.opened_date, holdDays)
        : null
      const md = getMilestoneDetail(b, r, profile.pay_frequency, profile.paycheck_amount)
      const checklist = md.milestones.map((m) => ({
        label: m.label,
        done: m.status === "completed",
        current: m.status === "active",
      }))
      // Confirming the cash is the only forward action that changes the
      // dashboard state (the next-step label is date-driven). Intermediate
      // milestones live on the Paycheck page.
      const advance: StartedBonus["advance"] =
        !r.bonus_received && r.current_step !== "applied"
          ? {
              label: "Mark bonus received",
              run: async () => {
                await markBonusPosted(r.id, r.actual_amount ?? cat.bonus_amount ?? 0, todayISO())
                track("dashboard_bonus_advanced", { module: "paycheck", action: "bonus_received" })
              },
            }
          : null
      out.push({
        module: "paycheck",
        name: cat.bank_name ?? r.bonus_id,
        amount: r.actual_amount ?? cat.bonus_amount ?? 0,
        started_date: r.opened_date,
        nextStep: step.nextStep,
        deadline: step.deadline,
        urgency: step.urgency,
        href: "/stacksos/paycheck",
        bonus_id: r.bonus_id,
        expected_payout_date: expectedPayout,
        safe_close_date: safeClose,
        advance,
        checklist,
      })
    }

    // 2) Paycheck custom bonuses: in-progress ones (same filter RoadmapClient uses)
    for (const c of customBonuses) {
      if (c.closed_date) continue
      if (c.current_step && NON_ACTIVE_CUSTOM_STEPS.has(c.current_step)) continue
      const step = customBonusStep(c)
      const safeClose = c.opened_date && c.holding_period_days
        ? addDaysISO(c.opened_date, c.holding_period_days)
        : null
      const ddReq = c.dd_required === true
      const posted = c.current_step === "bonus_posted" || c.bonus_received
      const advanceToPosted = async () => {
        await updateCustomBonus(c.id, { current_step: "bonus_posted", bonus_received: true, actual_amount: c.actual_amount ?? c.bonus_amount })
        track("dashboard_bonus_advanced", { module: "custom", action: "bonus_posted" })
      }
      let advance: StartedBonus["advance"] = null
      if (c.current_step === null || c.current_step === "account_opened") {
        advance = ddReq
          ? { label: "Mark requirements met", run: async () => { await updateCustomBonus(c.id, { current_step: "requirements_met" }); track("dashboard_bonus_advanced", { module: "custom", action: "requirements_met" }) } }
          : { label: "Mark bonus posted", run: advanceToPosted }
      } else if (c.current_step === "requirements_met") {
        advance = { label: "Mark bonus posted", run: advanceToPosted }
      }
      const checklist = withCurrent([
        { label: "Account opened", done: true },
        ...(ddReq ? [{ label: "Requirements met", done: c.current_step === "requirements_met" || posted }] : []),
        { label: "Bonus posted", done: posted },
      ])
      out.push({
        module: "paycheck",
        name: c.bank_name,
        amount: c.actual_amount ?? c.bonus_amount,
        started_date: c.opened_date,
        nextStep: step.nextStep,
        deadline: step.deadline,
        urgency: step.urgency,
        href: "/stacksos/paycheck",
        safe_close_date: safeClose,
        advance,
        checklist,
      })
    }

    // 3) Spending cards: status === "active"
    for (const c of ownedCards) {
      if (c.status !== "active") continue
      const step = spendingCardStep(c)
      // Card "expected payout" = spend deadline + ~30d billing-cycle posting.
      const expectedPayout = c.spend_deadline ? addDaysISO(c.spend_deadline, 30) : null
      const advance: StartedBonus["advance"] = {
        label: "Mark bonus earned",
        run: async () => {
          await updateOwnedCard(c.id, { status: "completed" })
          track("dashboard_bonus_advanced", { module: "spending", action: "completed" })
        },
      }
      const checklist = withCurrent([
        { label: "Card opened", done: true },
        { label: c.spend_requirement ? `Spend $${c.spend_requirement.toLocaleString()}` : "Meet spend requirement", done: false },
        { label: "Bonus earned", done: false },
      ])
      out.push({
        module: "spending",
        name: c.card_name,
        amount: c.expected_value ?? c.signup_bonus_value ?? 0,
        started_date: c.opened_date,
        nextStep: step.nextStep,
        deadline: step.deadline,
        urgency: step.urgency,
        href: "/stacksos/spending",
        expected_payout_date: expectedPayout,
        advance,
        checklist,
      })
    }

    // 4) Savings entries: status === "active"
    for (const e of savingsEntries) {
      if (e.status !== "active") continue
      const requiresTransactions = savingsBonusForEntry(e)?.requires_transactions ?? null
      const step = savingsEntryStep(e, { requiresTransactions })
      const expectedPayout = e.opened_date && e.holding_period_days
        ? addDaysISO(e.opened_date, e.holding_period_days)
        : null
      const openedAt = e.account_opened_at
      const fundedAt = e.funded_at
      const txnsDoneAt = e.transactions_done_at
      const postedAt = e.bonus_posted_at
      const txnsPending = !!requiresTransactions && !txnsDoneAt
      let advance: StartedBonus["advance"]
      if (!openedAt) advance = { label: "Mark account opened", run: async () => { await setSavingsMilestone(e.id, "account_opened_at", true); track("dashboard_bonus_advanced", { module: "savings", action: "account_opened" }) } }
      else if (!fundedAt) advance = { label: "Mark funded", run: async () => { await setSavingsMilestone(e.id, "funded_at", true); track("dashboard_bonus_advanced", { module: "savings", action: "funded" }) } }
      else if (txnsPending) advance = { label: "Mark transactions done", run: async () => { await setSavingsMilestone(e.id, "transactions_done_at", true); track("dashboard_bonus_advanced", { module: "savings", action: "transactions_done" }) } }
      else if (!postedAt) advance = { label: "Mark bonus posted", run: async () => { await setSavingsMilestone(e.id, "bonus_posted_at", true); track("dashboard_bonus_advanced", { module: "savings", action: "bonus_posted" }) } }
      else advance = { label: "Mark complete", run: async () => { await updateSavingsEntry(e.id, { status: "completed" }); track("dashboard_bonus_advanced", { module: "savings", action: "completed" }) } }
      const checklist = withCurrent([
        { label: "Account opened", done: !!openedAt },
        { label: "Funded", done: !!fundedAt },
        ...(requiresTransactions ? [{ label: requiresTransactions.count ? `${requiresTransactions.count} transactions` : "Transactions", done: !!txnsDoneAt }] : []),
        { label: "Bonus posted", done: !!postedAt },
        { label: "Complete", done: false },
      ])
      out.push({
        module: "savings",
        name: e.institution_name,
        // Show the pure bonus (matches the savings detail card's headline). The
        // dashboard previously read expected_total_value (bonus + projected yield),
        // so a $100 referral could read $999 on the tile while detail showed $100.
        amount: e.bonus_amount ?? e.expected_total_value ?? 0,
        started_date: e.opened_date,
        nextStep: step.nextStep,
        deadline: step.deadline,
        urgency: step.urgency,
        href: "/stacksos/savings",
        bonus_id: e.canonical_offer_id,
        expected_payout_date: expectedPayout,
        safe_close_date: expectedPayout, // for savings, payout date IS safe-to-withdraw
        advance,
        checklist,
      })
    }

    // Drop items where nextStep is null — bonus is fully done (received + no hold remaining).
    return out.filter(item => item.nextStep != null)
  }, [completedRecords, customBonuses, ownedCards, savingsEntries, profile.pay_frequency, profile.paycheck_amount])

  // ─── Lifetime earned (completed across all modules) ───────────────
  // Mirror the per-module logic so the dashboard number matches what each
  // tab shows. Key subtlety: a bonus counts as "earned" the moment it
  // posts (bonus_received = true) — the account may still be open. Also
  // custom bonuses in "kept_open" / "bonus_posted" steps count even
  // without a closed_date.
  const lifetimeEarned = useMemo(() => {
    let sum = 0

    // Checking bonuses: r.bonus_received === true (closed_date not required)
    for (const r of completedRecords) {
      if (!r.bonus_received) continue
      const b = bonuses.find((x) => (x as { id?: string }).id === r.bonus_id)
      const fallback = b ? ((b as { bonus_amount?: number }).bonus_amount ?? 0) : 0
      sum += r.actual_amount ?? fallback
    }

    // Custom bonuses: closed+received OR still-open with a "posted" step
    for (const c of customBonuses) {
      const closedAndReceived = c.closed_date && c.bonus_received
      const keptOpenPosted = !c.closed_date && (c.current_step === "kept_open" || c.current_step === "bonus_posted")
      if (closedAndReceived || keptOpenPosted) {
        sum += c.actual_amount ?? c.bonus_amount
      }
    }

    // Spending cards: status === "completed"
    for (const c of ownedCards) {
      if (c.status === "completed") {
        sum += c.actual_value ?? c.expected_value ?? 0
      }
    }

    // Savings entries: status === "completed"
    for (const e of savingsEntries) {
      if (e.status === "completed") {
        sum += e.actual_value ?? e.expected_total_value ?? 0
      }
    }

    return Math.round(sum)
  }, [completedRecords, customBonuses, ownedCards, savingsEntries])

  // In-progress total = sum of expected amounts for started bonuses.
  const inProgressValue = useMemo(
    () => Math.round(startedBonuses.reduce((s, b) => s + b.amount, 0)),
    [startedBonuses],
  )

  // ─── Historical wins across all 4 sources ─────────────────────────
  // Mirrors the lifetimeEarned logic but produces individual rows for
  // the "History" dashboard tab.
  const historicalWins = useMemo<HistoricalWin[]>(() => {
    const out: HistoricalWin[] = []

    for (const r of completedRecords) {
      if (!r.bonus_received) continue
      const b = bonuses.find((x) => (x as { id?: string }).id === r.bonus_id)
      const fallback = b ? ((b as { bonus_amount?: number }).bonus_amount ?? 0) : 0
      out.push({
        module: "paycheck",
        name: (b as { bank_name?: string } | undefined)?.bank_name ?? r.bonus_id,
        amount: r.actual_amount ?? fallback,
        date: r.closed_date ?? r.opened_date ?? null,
        href: "/stacksos/paycheck",
      })
    }

    for (const c of customBonuses) {
      const closedAndReceived = c.closed_date && c.bonus_received
      const keptOpenPosted = !c.closed_date && (c.current_step === "kept_open" || c.current_step === "bonus_posted")
      if (!(closedAndReceived || keptOpenPosted)) continue
      out.push({
        module: "paycheck",
        name: c.bank_name,
        amount: c.actual_amount ?? c.bonus_amount,
        date: c.closed_date ?? c.opened_date ?? null,
        href: "/stacksos/paycheck",
      })
    }

    for (const c of ownedCards) {
      if (c.status !== "completed") continue
      out.push({
        module: "spending",
        name: c.card_name,
        amount: c.actual_value ?? c.expected_value ?? 0,
        // OwnedCard has no closed_date — updated_at fires when status flips to "completed".
        date: (c.updated_at ?? c.opened_date)?.slice(0, 10) ?? null,
        href: "/stacksos/spending",
      })
    }

    for (const e of savingsEntries) {
      if (e.status !== "completed") continue
      out.push({
        module: "savings",
        name: e.institution_name,
        amount: e.actual_value ?? e.expected_total_value ?? 0,
        date: (e.updated_at ?? e.opened_date)?.slice(0, 10) ?? null,
        href: "/stacksos/savings",
      })
    }

    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  }, [completedRecords, customBonuses, ownedCards, savingsEntries])

  return (
    <>
      {showWizard && (
        <WelcomeWizard
          userId={userId}
          initialProfile={profile}
          onComplete={() => {
            setShowWizard(false)
            loadData()
          }}
        />
      )}
      {showAddModal && (
        <AddCustomBonusModal
          userId={userId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => loadData()}
        />
      )}
      <CheckpointNav />
      {subscriptionStatus === "past_due" && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "12px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#854d0e", textAlign: "center" }}>
            <span>
              Your last payment didn't go through — please update your card to keep your subscription active.
            </span>
            <button onClick={handleManageBilling} disabled={billingLoading}
              style={{ fontSize: 14, fontWeight: 700, color: "#fff", background: "#854d0e", border: "none", borderRadius: 8, padding: "10px 16px", minHeight: 40, cursor: billingLoading ? "wait" : "pointer" }}>
              {billingLoading ? "Opening…" : "Update payment →"}
            </button>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px" }} className="hub-inner">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111" }}>Dashboard</h1>
              {!isPaid && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#666", background: "#f0f0f0",
                  padding: "3px 8px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Free
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2, overflowWrap: "anywhere" }}>
              {userEmail}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <a
              href="/stacksos/profile"
              style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
            >
              Edit profile →
            </a>
          </div>
        </div>

        <DashboardGoalBar
          projection12mo={portfolio12mo}
          inProgress={inProgressValue}
          lifetimeEarned={lifetimeEarned}
        />

        <PushOptIn />

        <DashboardViewTabs
          view={view}
          onChange={(v) => { setView(v); track("dashboard_tab_changed", { tab: v }) }}
          counts={{ active: startedBonuses.length, history: historicalWins.length }}
        />

        {view === "active" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 10px", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#888" }}>
                {startedBonuses.length > 0 ? `${startedBonuses.length} bonus${startedBonuses.length === 1 ? "" : "es"} in progress` : ""}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="/bonuses"
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#0d7c5f",
                    padding: "8px 14px", border: "1px solid #0d7c5f", borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Bank Bonuses
                </a>
                <a
                  href="/spending"
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#0d7c5f",
                    padding: "8px 14px", border: "1px solid #0d7c5f", borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Credit Cards
                </a>
                <button
                  onClick={() => { track("custom_bonus_modal_opened", { source: "dashboard_active_tab" }); setShowAddModal(true) }}
                  style={{
                    fontSize: 13, fontWeight: 700, color: "#fff", background: "#0d7c5f",
                    padding: "8px 14px", border: "none", borderRadius: 8, cursor: "pointer",
                  }}
                >
                  + Add bonus
                </button>
              </div>
            </div>

            {startedBonuses.length === 0 ? (
              <EmptyDashboardCta onAddCustom={() => { track("custom_bonus_modal_opened", { source: "dashboard_empty_state" }); setShowAddModal(true) }} isPaid={isPaid} />
            ) : (
              <StartedBonusesList bonuses={startedBonuses} onChanged={loadData} />
            )}
          </>
        )}

        {view === "projection" && (
          <PortfolioCard
            total={portfolio12mo}
            breakdown={[
              { label: "Paycheck", amount: paycheckProjection.total, href: "/stacksos/paycheck", items: paycheckProjection.items },
              { label: "Spending (Beta)", amount: spendingProjection.total, href: "/stacksos/spending", items: spendingProjection.items, note: spendingProjection.effectiveApy != null ? fmtApy(spendingProjection.effectiveApy) : undefined },
              { label: "Savings", amount: savingsProjection.total, href: "/stacksos/savings", items: savingsProjection.items },
            ]}
          />
        )}

        {view === "history" && <HistoricalWinsList wins={historicalWins} />}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <a
            href="/stacksos/taxes"
            style={{
              fontSize: 13, color: "#666", textDecoration: "none",
              padding: "8px 14px", border: "1px solid #e8e8e8", borderRadius: 8,
            }}
          >
            Tax summary →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hub-inner { padding: 16px 14px 48px !important; }
        }
        @media (max-width: 520px) {
          .hub-inner h1 { font-size: 20px !important; }
        }
      `}</style>
    </>
  )
}

function EmptyDashboardCta({ onAddCustom, isPaid }: { onAddCustom: () => void; isPaid: boolean }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14,
      padding: "32px 28px", marginTop: 16,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
        Start tracking your bonuses
      </div>
      <div style={{ fontSize: 14, color: "#666", lineHeight: 1.5, margin: "0 0 22px" }}>
        Add any bank or credit card bonus you&apos;re working on. Stacks keeps a checklist, tracks your deposits, and remembers your lifetime earnings.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <a
          href="/bonuses"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 22 }}>🏦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Bank Bonuses</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
            Every live checking, savings, and brokerage offer — one-click track.
          </div>
        </a>
        <a
          href="/spending"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 22 }}>💳</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Credit Cards</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
            Welcome bonuses and top cards — ranked by net value.
          </div>
        </a>

        <button
          type="button"
          onClick={onAddCustom}
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 12,
            textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <div style={{ fontSize: 22 }}>✍️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Add manually</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
            Type in a bonus from anywhere — bank, card, or savings.
          </div>
        </button>

        <a
          href="/stacksos/import"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 22 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Import a spreadsheet</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>
            Paste from YNAB or a tracking sheet — we match the catalog.
          </div>
        </a>
      </div>

    </div>
  )
}
