"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import PortfolioCard from "../components/PortfolioCard"
import FatStackMeter from "../components/FatStackMeter"
import StartedBonusesList, { type StartedBonus } from "../components/StartedBonusesList"
import HistoricalWinsList, { type HistoricalWin } from "../components/HistoricalWinsList"
import DashboardGoalBar from "../components/DashboardGoalBar"
import PushOptIn from "../components/PushOptIn"
import DashboardViewTabs, { type DashboardView } from "../components/DashboardViewTabs"
import { checkingBonusStep, customBonusStep, spendingCardStep, savingsEntryStep, urgencyFor, URGENCY_RANK, daysUntil } from "../../lib/bonusNextStep"
import NextMoveCard, { type NextMove } from "../components/NextMoveCard"
import DeadlineDigest from "../components/DeadlineDigest"
import QueueTrendCard from "../components/QueueTrendCard"
import { getQueueSnapshots, recordQueueSnapshot, type QueueSnapshot } from "../../lib/queueSnapshots"
import { savingsBonusForEntry } from "../../lib/data/savingsBonuses"
import { getMilestoneDetail } from "../../lib/bonusSteps"
import { track } from "../../lib/analytics"
import CheckpointNav from "../components/CheckpointNav"
import AcademyLedger from "../components/AcademyLedger"
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
import { getCompletedBonuses, markBonusPosted, updateBonusStep } from "../../lib/completedBonuses"
import { getCustomBonuses, updateCustomBonus, type CustomBonus } from "../../lib/customBonuses"
import { getOwnedCards, updateOwnedCard, type OwnedCard } from "../../lib/ownedCards"
import { getSavingsEntries, setSavingsMilestone, updateSavingsEntry, type SavingsEntry } from "../../lib/savingsEntries"
import { getDeposits, addDeposit, type BonusDeposit } from "../../lib/deposits"
import type { CompletedBonus } from "../../lib/churn"
import { DK, MODULE, moduleGradient } from "../../lib/stacksTheme"

// How far out the dashboard projects, in days/months. Was 12 months; now a
// 3-year view so multi-year rotations and churnable bonuses (which recur after
// their cooldown) are all reflected in one figure.
const PROJECTION_DAYS = 1095
const PROJECTION_MONTHS = 36

type ProjBreakdownItem = { label: string; amount: number; note?: string }

/**
 * Collapse breakdown items that share a label into one row (summing amounts),
 * keeping them sorted by amount desc. A bonus that churns several times across
 * the 3-year horizon would otherwise list the same bank two or three times.
 */
function aggregateByLabel(items: ProjBreakdownItem[]): ProjBreakdownItem[] {
  const map = new Map<string, ProjBreakdownItem>()
  for (const it of items) {
    const existing = map.get(it.label)
    if (existing) existing.amount += it.amount
    else map.set(it.label, { ...it })
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

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
  // Gates the FatStackMeter: we only mount it once the first data load resolves,
  // so it initializes with the real banked total instead of animating a bogus
  // "+$X banked!" pop as the number hydrates from 0. Real pops still fire when
  // the user marks a bonus received (banked ticks up after this is true).
  const [dataReady, setDataReady] = useState(false)
  const [queueSnapshots, setQueueSnapshots] = useState<QueueSnapshot[]>([])
  const [deposits, setDeposits] = useState<BonusDeposit[]>([])

  const loadData = useCallback(() => {
    Promise.allSettled([
      getSavingsProfile(userId).then(setSavingsProfile),
      getSpendingProfile(userId).then(setSpendingProfile),
      getCompletedBonuses(userId).then(setCompletedRecords),
      getCustomBonuses(userId).then(setCustomBonuses),
      getOwnedCards(userId).then(setOwnedCards),
      getSavingsEntries(userId).then(setSavingsEntries),
      getDeposits(userId).then(setDeposits),
    ]).finally(() => setDataReady(true))
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onboarded =
      typeof window !== "undefined" && localStorage.getItem("stacks:onboarded") === "1"
    const hasCompletedOnboarding = !!initialProfile.state
    if (!onboarded && !hasCompletedOnboarding) setShowWizard(true)
  }, [initialProfile])

  // ─── 3-year projections (per-module) ──────────────────────────────
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
    const horizonBonuses = allBonuses.filter((b) => b.start_week * 7 <= PROJECTION_DAYS)
    const total = horizonBonuses.reduce((s, b) => s + (b.net_bonus ?? b.bonus_amount ?? 0), 0)
    const items = aggregateByLabel(
      horizonBonuses.map((b) => ({ label: b.bank_name, amount: b.net_bonus ?? b.bonus_amount ?? 0 })),
    )
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
    // Count every rotation that STARTS within the projection horizon. This is a
    // 3-year dashboard figure, matching the paycheck/spending projections — the
    // sequencer rotates churnable bonuses across the same horizon, so a bank can
    // legitimately recur (aggregateByLabel folds those into one breakdown row).
    const inHorizon = (result.entries ?? []).filter((e) => e.start_day < PROJECTION_DAYS)
    const items = aggregateByLabel(
      inHorizon.map((e) => ({ label: e.bank_name, amount: Math.round(e.total_earnings ?? 0) })),
    )
    const total = inHorizon.reduce((s, e) => s + (e.total_earnings ?? 0), 0)
    return { total: Math.round(total), items }
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
    const horizonList = sequenced.filter((s) => s.cumulative_months <= PROJECTION_MONTHS)
    const horizonTotal = horizonList.reduce((sum, s) => sum + s.net_value, 0)
    // "Effective APY" for a card SUB = annualized return on the required
    // spend (the capital you route through the card). Mirrors the savings
    // formula: return ÷ capital × annualization factor.
    //   return_on_spend = net_value / min_spend  (from the sequencer)
    //   effApy          = return_on_spend × (12 / months_to_complete)
    const apyFor = (s: typeof horizonList[number]): number | null =>
      s.card.min_spend > 0 && s.months_to_complete > 0
        ? s.return_on_spend * (12 / s.months_to_complete)
        : null
    const items = aggregateByLabel(
      horizonList.map((s) => {
        const apy = apyFor(s)
        return { label: s.card.card_name, amount: Math.round(s.net_value), note: apy != null ? fmtApy(apy) : undefined }
      }),
    )
    // Blended module APY: spend-weighted average of the per-card APYs, so the
    // headline reflects where the capital actually goes.
    let weightedSpend = 0
    let weightedApy = 0
    for (const s of horizonList) {
      const apy = apyFor(s)
      if (apy != null) { weightedApy += apy * s.card.min_spend; weightedSpend += s.card.min_spend }
    }
    const effectiveApy = weightedSpend > 0 ? weightedApy / weightedSpend : null
    return { total: Math.round(horizonTotal), items, effectiveApy }
  }, [spendingProfile, profile.state, profile.military_affiliated])

  const portfolio36mo =
    paycheckProjection.total + savingsProjection.total + spendingProjection.total

  // ─── Pro: snapshot the queue projection once/month ────────────────
  // Records this month's 3-year projection (best-effort) so QueueTrendCard can
  // show the plan getting more profitable over time, then loads the history.
  // Guarded to run once per mount; the upsert is idempotent per (user, month).
  const snapshotDoneRef = useRef(false)
  useEffect(() => {
    if (!isPaid || !dataReady || portfolio36mo <= 0 || snapshotDoneRef.current) return
    snapshotDoneRef.current = true
    const profileHash = [
      profile.paycheck_amount, profile.dd_slots, profile.pay_frequency, profile.state,
      profile.military_affiliated, savingsProfile?.current_balance, spendingProfile?.monthly_spend,
    ].join("|")
    ;(async () => {
      await recordQueueSnapshot(userId, {
        paycheckTotal: paycheckProjection.total,
        savingsTotal: savingsProjection.total,
        spendingTotal: spendingProjection.total,
        portfolio36mo,
        topBonuses: paycheckProjection.items.slice(0, 5),
        profileHash,
      })
      setQueueSnapshots(await getQueueSnapshots(userId))
    })()
  }, [isPaid, dataReady, portfolio36mo, userId]) // eslint-disable-line react-hooks/exhaustive-deps

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
      // checkingBonusStep is date-only: once the user manually logs the deposit
      // and advances to the posting/hold stage, its label goes stale (e.g. shows
      // "Hit $500 direct deposit" after the DD requirement is already met). When
      // the confirmed milestone is ahead of the deposit window, show the
      // milestone-accurate objective + deadline so the dashboard "Next:" label
      // agrees with the checklist and the "Mark bonus received" CTA. Mirrors the
      // Paycheck page's front-of-card objective (RoadmapClient).
      const activeKey = md.milestones.find((m) => m.status === "active")?.key ?? md.currentMilestone
      let nextStepLabel = step.nextStep
      let nextStepDeadline = step.deadline
      let nextStepUrgency = step.urgency
      if (step.nextStep != null && activeKey === "bonus_posted") {
        nextStepLabel = "Confirm the bonus landed"
        nextStepDeadline = expectedPayout
        nextStepUrgency = urgencyFor(expectedPayout)
      } else if (step.nextStep != null && activeKey === "safe_to_close") {
        nextStepLabel = "Safe to close"
        nextStepDeadline = safeClose
        nextStepUrgency = urgencyFor(safeClose)
      }
      // Confirming the cash is the only forward action offered on the dashboard;
      // the intermediate milestones (DD set up, requirement met) live on the
      // Paycheck page's step-by-step flow.
      const advance: StartedBonus["advance"] =
        !r.bonus_received && r.current_step !== "applied"
          ? {
              label: "Mark bonus received",
              // Capture which direct-deposit source triggered it (optional) — same
              // data point as the sequencer's Bonus Posted step.
              ddCapture: true,
              run: async (ddMethod?: string | null) => {
                await markBonusPosted(r.id, r.actual_amount ?? cat.bonus_amount ?? 0, todayISO(), ddMethod ?? null)
                if (ddMethod) track("dd_method_recorded", { bonus_id: r.bonus_id, dd_method: ddMethod, source: "dashboard" })
                track("dashboard_bonus_advanced", { module: "paycheck", action: "bonus_received" })
              },
            }
          : null
      // Undo — walk current_step back one milestone (mirrors the Paycheck page's
      // per-step Undo). Only when we're past "account opened"; a manual override
      // freezes the time-based auto-calc the same way the section page does.
      const milestoneOrder = ["account_opened", "dd_confirmed", "deposit_met", "bonus_posted", "safe_to_close"]
      const curMilestoneIdx = milestoneOrder.indexOf(md.currentMilestone)
      const undo: StartedBonus["undo"] =
        !r.bonus_received && r.current_step !== "applied" && curMilestoneIdx > 0
          ? {
              label: "Undo",
              run: async () => {
                await updateBonusStep(r.id, milestoneOrder[curMilestoneIdx - 1])
                track("dashboard_bonus_undone", { module: "paycheck" })
              },
            }
          : null
      // Direct-deposit logging: total logged for this bonus so far + a log() so
      // the user can add DDs (amount + source) toward the requirement right on
      // the dashboard. Only surfaced for bonuses with a DD-total requirement that
      // haven't been marked received yet.
      const ddRequired = (b as { requirements?: { min_direct_deposit_total?: number | null } }).requirements?.min_direct_deposit_total ?? 0
      const ddSoFar = deposits.filter(d => d.bonus_id === r.bonus_id).reduce((s, d) => s + (d.amount ?? 0), 0)
      const depositCapability: StartedBonus["deposit"] =
        ddRequired > 0 && !r.bonus_received
          ? {
              required: ddRequired,
              soFar: ddSoFar,
              log: async (amount: number, source: string | null) => {
                await addDeposit(userId, r.bonus_id, amount, todayISO(), source)
                track("deposit_source_recorded", { bonus_id: r.bonus_id, source: source ?? "employer", amount, surface: "dashboard" })
              },
            }
          : null
      out.push({
        module: "paycheck",
        name: cat.bank_name ?? r.bonus_id,
        amount: r.actual_amount ?? cat.bonus_amount ?? 0,
        started_date: r.opened_date,
        nextStep: nextStepLabel,
        deadline: nextStepDeadline,
        urgency: nextStepUrgency,
        href: "/stacksos/paycheck",
        bonus_id: r.bonus_id,
        expected_payout_date: expectedPayout,
        safe_close_date: safeClose,
        advance,
        undo,
        checklist,
        deposit: depositCapability,
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
      // Undo — reverse the "requirements met" mark back to the just-opened state.
      const undo: StartedBonus["undo"] =
        c.current_step === "requirements_met"
          ? {
              label: "Undo",
              run: async () => {
                await updateCustomBonus(c.id, { current_step: "account_opened" })
                track("dashboard_bonus_undone", { module: "custom" })
              },
            }
          : null
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
        undo,
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
      // Undo — toggle off the most-recent set milestone (savings stores each as a
      // reversible timestamp flag, so this is a clean one-step walk-back).
      let undo: StartedBonus["undo"] = null
      if (postedAt) undo = { label: "Undo", run: async () => { await setSavingsMilestone(e.id, "bonus_posted_at", false); track("dashboard_bonus_undone", { module: "savings" }) } }
      else if (txnsDoneAt) undo = { label: "Undo", run: async () => { await setSavingsMilestone(e.id, "transactions_done_at", false); track("dashboard_bonus_undone", { module: "savings" }) } }
      else if (fundedAt) undo = { label: "Undo", run: async () => { await setSavingsMilestone(e.id, "funded_at", false); track("dashboard_bonus_undone", { module: "savings" }) } }
      else if (openedAt) undo = { label: "Undo", run: async () => { await setSavingsMilestone(e.id, "account_opened_at", false); track("dashboard_bonus_undone", { module: "savings" }) } }
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
        undo,
        checklist,
      })
    }

    // Drop items where nextStep is null — bonus is fully done (received + no hold remaining).
    return out.filter(item => item.nextStep != null)
  }, [completedRecords, customBonuses, ownedCards, savingsEntries, deposits, profile.pay_frequency, profile.paycheck_amount])

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

  // ─── The single "next move" — the app's spine ─────────────────────
  // Answers "what do I do right now?" with ONE action: the most-urgent
  // in-progress step, or (when nothing's started) a nudge to bank the
  // first bonus. Same urgency ordering the to-do list uses.
  const nextMove = useMemo<NextMove | null>(() => {
    if (startedBonuses.length > 0) {
      const top = [...startedBonuses].sort((a, b) => {
        const ua = URGENCY_RANK[a.urgency ?? "none"]
        const ub = URGENCY_RANK[b.urgency ?? "none"]
        if (ua !== ub) return ua - ub
        const da = daysUntil(a.deadline ?? null)
        const db = daysUntil(b.deadline ?? null)
        if (da != null && db != null) return da - db
        if (da != null) return -1
        if (db != null) return 1
        return 0
      })[0]
      return {
        module: top.module,
        title: top.name,
        action: top.nextStep ?? "Continue this bonus",
        amount: top.amount,
        deadline: top.deadline ?? null,
        daysLeft: daysUntil(top.deadline ?? null),
        urgency: top.urgency ?? "none",
        href: top.href,
        cta: "Continue →",
      }
    }
    // Nothing started yet — point at the easiest first win.
    return {
      module: "paycheck",
      title: "Bank bonuses",
      action: "Start your first bonus",
      amount: null,
      deadline: null,
      daysLeft: null,
      urgency: "none",
      href: "/bonuses",
      cta: "Browse bonuses →",
      sub: "A checking bonus is the easiest first win — often $200–$400 for a direct deposit.",
    }
  }, [startedBonuses])

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

  // ─── The Stack: banked THIS YEAR across every module ──────────────
  // Drives the FatStackMeter hero — the gamified "growing pile of cash" the
  // Paycheck tab uses, but here it aggregates paycheck + spending + savings so
  // the dashboard shows one combined stack for everything. Count-up + bill-drop
  // pops fire on their own whenever this ticks up (a bonus is marked received).
  const thisYear = new Date().getFullYear()
  const bankedThisYear = useMemo(() => {
    return Math.round(
      historicalWins
        .filter((w) => w.date && new Date(w.date + "T00:00:00").getFullYear() === thisYear)
        .reduce((s, w) => s + w.amount, 0),
    )
  }, [historicalWins, thisYear])
  const bankedThisYearCount = useMemo(
    () => historicalWins.filter((w) => w.date && new Date(w.date + "T00:00:00").getFullYear() === thisYear).length,
    [historicalWins, thisYear],
  )
  // Goal = what's realistically landing: already banked + everything in progress.
  // A near-term, fillable target so the meter reads as an honest, satisfying bar
  // (a 3-yr projection would leave it perpetually near-empty).
  const stackGoal = Math.max(1, bankedThisYear + inProgressValue)

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
      <div style={{ minHeight: "100vh", background: DK.board, color: DK.textDim, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {subscriptionStatus === "past_due" && (
        <div style={{ background: DK.amberBg, borderBottom: `1px solid ${DK.amberBorder}`, padding: "12px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", fontSize: 13, color: DK.amber, textAlign: "center" }}>
            <span>
              Your last payment didn't go through — please update your card to keep your subscription active.
            </span>
            <button onClick={handleManageBilling} disabled={billingLoading}
              style={{ fontSize: 14, fontWeight: 700, color: "#1a1204", background: DK.amber, border: "none", borderRadius: 8, padding: "10px 16px", minHeight: 40, cursor: billingLoading ? "wait" : "pointer" }}>
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
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: DK.text }}>Dashboard</h1>
              {!isPaid && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: DK.textMute, background: DK.panel2, border: `1px solid ${DK.border}`,
                  padding: "3px 8px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Free
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: DK.textMute, marginTop: 2, overflowWrap: "anywhere" }}>
              {userEmail}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <a
              href="/stacksos/profile"
              style={{ fontSize: 13, color: DK.accentFg, textDecoration: "none", fontWeight: 600 }}
            >
              Edit profile →
            </a>
          </div>
        </div>

        {dataReady ? (
          <FatStackMeter
            banked={bankedThisYear}
            goal={stackGoal}
            count={bankedThisYearCount}
            countLabel={bankedThisYearCount === 1 ? "bonus banked" : "bonuses banked"}
          />
        ) : (
          <div style={{ minHeight: 150, marginBottom: 22, borderRadius: 18, background: "radial-gradient(140% 120% at 50% 0%, #1c2230, #12141b)", border: "1px solid #23262e" }} />
        )}

        {dataReady && view === "active" && <NextMoveCard move={nextMove} />}

        <DashboardGoalBar
          projection36mo={portfolio36mo}
          inProgress={inProgressValue}
          lifetimeEarned={lifetimeEarned}
          potentialLocked={!isPaid}
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
              <div style={{ fontSize: 13, color: DK.textMute }}>
                {startedBonuses.length > 0 ? `${startedBonuses.length} bonus${startedBonuses.length === 1 ? "" : "es"} in progress` : ""}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="/bonuses"
                  style={{
                    fontSize: 13, fontWeight: 600, color: DK.textDim,
                    padding: "8px 14px", border: `1px solid ${DK.border2}`, background: DK.panel, borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  🏦 Find bonuses
                </a>
                <a
                  href="/spending"
                  style={{
                    fontSize: 13, fontWeight: 600, color: DK.textDim,
                    padding: "8px 14px", border: `1px solid ${DK.border2}`, background: DK.panel, borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  💳 Find credit cards
                </a>
                <button
                  onClick={() => { track("custom_bonus_modal_opened", { source: "dashboard_active_tab" }); setShowAddModal(true) }}
                  style={{
                    fontSize: 13, fontWeight: 700, color: "#fff", background: moduleGradient("paycheck"),
                    padding: "8px 14px", border: "none", borderRadius: 8, cursor: "pointer",
                  }}
                >
                  ＋ Add custom bonus
                </button>
              </div>
            </div>

            {startedBonuses.length === 0 ? (
              <EmptyDashboardCta onAddCustom={() => { track("custom_bonus_modal_opened", { source: "dashboard_empty_state" }); setShowAddModal(true) }} isPaid={isPaid} />
            ) : (
              <>
                <DeadlineDigest items={startedBonuses} />
                <StartedBonusesList bonuses={startedBonuses} onChanged={loadData} />
              </>
            )}
          </>
        )}

        {view === "projection" && (
          isPaid ? (
            <>
            <QueueTrendCard snapshots={queueSnapshots} current={portfolio36mo} />
            <PortfolioCard
              total={portfolio36mo}
              breakdown={[
                { label: "Paycheck", amount: paycheckProjection.total, href: "/stacksos/paycheck", items: paycheckProjection.items },
                { label: "Spending (Beta)", amount: spendingProjection.total, href: "/stacksos/spending", items: spendingProjection.items, note: spendingProjection.effectiveApy != null ? fmtApy(spendingProjection.effectiveApy) : undefined },
                { label: "Savings", amount: savingsProjection.total, href: "/stacksos/savings", items: savingsProjection.items },
              ]}
            />
            </>
          ) : (
            // Free tier: the 3-yr projection is built from the Pro sequencers — don't
            // leak the number; show the same upgrade nudge used on the sequencer pages.
            <div style={{
              background: DK.panel, border: `1px solid ${DK.border}`, borderRadius: 14,
              padding: "20px 22px", marginBottom: 24,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: DK.gold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Pro feature
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: DK.text, marginBottom: 4 }}>
                  See your 3-year stack projection
                </div>
                <div style={{ fontSize: 13, color: DK.textMute, lineHeight: 1.5 }}>
                  Pro ranks and sequences every checking, savings, and card bonus for your paycheck and balance — and projects what your stack is worth over three years.
                </div>
              </div>
              <a href="/onboarding" style={{
                fontSize: 13, fontWeight: 700, color: "#1a1204", background: `linear-gradient(135deg, ${DK.gold}, ${DK.goldDeep})`,
                padding: "11px 18px", borderRadius: 10, textDecoration: "none", flexShrink: 0,
              }}>
                Upgrade to Pro →
              </a>
            </div>
          )
        )}

        {view === "history" && <HistoricalWinsList wins={historicalWins} />}

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <a
            href="/stacksos/taxes"
            style={{
              fontSize: 13, color: DK.textMute, textDecoration: "none",
              padding: "8px 14px", border: `1px solid ${DK.border2}`, background: DK.panel, borderRadius: 8,
            }}
          >
            Tax summary →
          </a>
        </div>

        {/* Fat Stacks Academy — collective $1B ledger + this recruit's stack */}
        <div style={{ marginTop: 28 }}>
          <AcademyLedger variant="inline" userContribution={lifetimeEarned} />
        </div>
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
      background: DK.panel, border: `1px solid ${DK.border}`, borderRadius: 14,
      padding: "32px 28px", marginTop: 16,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: DK.text, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
        Start tracking your bonuses
      </div>
      <div style={{ fontSize: 14, color: DK.textMute, lineHeight: 1.5, margin: "0 0 14px" }}>
        Add any bank or credit card bonus you&apos;re working on. Stacks keeps a checklist, tracks your deposits, and remembers your lifetime earnings.
      </div>
      <div style={{ fontSize: 13, color: DK.greenFg, fontWeight: 600, margin: "0 0 18px" }}>
        New here? Start with a <strong>bank bonus</strong> — it&apos;s the easiest first win (often $200–$400 for opening a checking account and setting up direct deposit).
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <a
          href="/bonuses"
          style={{
            display: "flex", flexDirection: "column", gap: 6, position: "relative",
            padding: 16, background: MODULE.savings.soft, border: `1.5px solid ${DK.green}`, borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <span style={{ position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 700, color: "#fff", background: DK.green, padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>Start here</span>
          <div style={{ fontSize: 22 }}>🏦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DK.text }}>Bank Bonuses</div>
          <div style={{ fontSize: 12, color: DK.textMute, lineHeight: 1.4 }}>
            Every live checking, savings, and brokerage offer — one-click track.
          </div>
        </a>
        <a
          href="/spending"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: DK.panel2, border: `1px solid ${DK.border}`, borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 22 }}>💳</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DK.text }}>Credit Cards</div>
          <div style={{ fontSize: 12, color: DK.textMute, lineHeight: 1.4 }}>
            Welcome bonuses and top cards — ranked by net value.
          </div>
        </a>

        <button
          type="button"
          onClick={onAddCustom}
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: DK.panel2, border: `1px solid ${DK.border}`, borderRadius: 12,
            textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <div style={{ fontSize: 22 }}>✍️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DK.text }}>Add manually</div>
          <div style={{ fontSize: 12, color: DK.textMute, lineHeight: 1.4 }}>
            Type in a bonus from anywhere — bank, card, or savings.
          </div>
        </button>

        <a
          href="/stacksos/import"
          style={{
            display: "flex", flexDirection: "column", gap: 6,
            padding: 16, background: DK.panel2, border: `1px solid ${DK.border}`, borderRadius: 12,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 22 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: DK.text }}>Import a spreadsheet</div>
          <div style={{ fontSize: 12, color: DK.textMute, lineHeight: 1.4 }}>
            Paste from YNAB or a tracking sheet — we match the catalog.
          </div>
        </a>
      </div>

    </div>
  )
}
