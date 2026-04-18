"use client"

import React, { useEffect, useState, useCallback } from "react"
import { getMilestoneDetail, MilestoneKey } from "../../lib/bonusSteps"
import { updateBonusStep } from "../../lib/completedBonuses"
import { useProfile, PayFrequency } from "../components/ProfileProvider"
import { bonuses as allBonuses } from "../../lib/data/bonuses"
import { blogContent } from "../../lib/data/blogContent"
import { getPostByBonusId } from "../../lib/data/blogPosts"
import { getChurnStatus, fmtShortDate, ChurnStatus, CompletedBonus } from "../../lib/churn"
import { getCompletedBonuses, markBonusStarted, markBonusClosed, deleteCompletedBonus } from "../../lib/completedBonuses"
import { runSequencer, SequencerResult, SequencedBonus } from "../../lib/sequencer"
import { getCustomBonuses, addCustomBonus, closeCustomBonus, deleteCustomBonus, updateCustomBonus, CustomBonus } from "../../lib/customBonuses"
import { getDeposits, addDeposit, deleteDeposit, BonusDeposit } from "../../lib/deposits"
import { getNotes, upsertNote } from "../../lib/notes"
import { getSkippedBonuses, skipBonus, unskipBonus } from "../../lib/skippedBonuses"
import { getOpenAccounts, addOpenAccount, deleteOpenAccount, OpenAccount } from "../../lib/openAccounts"
import { markKeptOpen } from "../../lib/keptOpen"
import { createClient } from "../../lib/supabase/client"
import CheckpointNav from "../components/CheckpointNav"
import BonusCommitCard from "../components/BonusCommitCard"
import { getLinkedBonuses } from "../../lib/linkedBonuses"

type Bonus = (typeof allBonuses)[number]

const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7, biweekly: 14, semimonthly: 15.2, monthly: 30.4,
}

type IncomeSourceLocal = { pay_frequency: PayFrequency; paycheck_amount: number }

function computeVelocity(bonus: Bonus, payFrequency: string, paycheckAmount: number, extraSources?: IncomeSourceLocal[]) {
  const sources: IncomeSourceLocal[] = [{ pay_frequency: payFrequency as PayFrequency, paycheck_amount: paycheckAmount }]
  if (extraSources) sources.push(...extraSources)

  const req = bonus.requirements
  if (!req?.direct_deposit_required) return { velocity: null, weeksToComplete: null, feasible: false, reason: "No DD required" }

  const perDepositMin = req.min_direct_deposit_per_deposit ?? null
  const totalMin = req.min_direct_deposit_total ?? null
  const windowDays = req.deposit_window_days ?? null
  const ddCountRequired = req.dd_count_required ?? null

  // Check per-deposit minimum against best source
  if (perDepositMin) {
    const maxPaycheck = Math.max(...sources.map(s => s.paycheck_amount))
    if (maxPaycheck < perDepositMin) return { velocity: null, weeksToComplete: null, feasible: false, reason: `Largest paycheck $${maxPaycheck} below $${perDepositMin}/deposit minimum` }
  }

  // Check total capacity within window using all sources
  if (totalMin && windowDays) {
    let totalCapacity = 0
    for (const src of sources) {
      const daysPerPay = DAYS_PER_PAY[src.pay_frequency] ?? 14
      const depositsInWindow = Math.max(1, Math.ceil(windowDays / daysPerPay))
      totalCapacity += depositsInWindow * src.paycheck_amount
    }
    if (totalCapacity < totalMin) return { velocity: null, weeksToComplete: null, feasible: false, reason: `Can deposit ~$${totalCapacity.toLocaleString()} in ${windowDays}-day window, need $${totalMin.toLocaleString()}` }
  }

  // Calculate weeks using combined deposit rate
  let weeklyRate = 0
  for (const src of sources) {
    const daysPerPay = DAYS_PER_PAY[src.pay_frequency] ?? 14
    weeklyRate += (src.paycheck_amount / daysPerPay) * 7
  }

  let weeksToComplete: number
  if (ddCountRequired) {
    let depositsPerWeek = 0
    const viableSources = perDepositMin ? sources.filter(s => s.paycheck_amount >= perDepositMin) : sources
    for (const src of viableSources) {
      const daysPerPay = DAYS_PER_PAY[src.pay_frequency] ?? 14
      depositsPerWeek += 7 / daysPerPay
    }
    weeksToComplete = Math.ceil(ddCountRequired / depositsPerWeek)
  } else if (totalMin) {
    weeksToComplete = Math.ceil(totalMin / weeklyRate)
  } else {
    weeksToComplete = 1
  }
  weeksToComplete = Math.max(1, weeksToComplete)
  return { velocity: bonus.bonus_amount / weeksToComplete, weeksToComplete, feasible: true, reason: undefined }
}

function computeCustomVelocity(c: CustomBonus, payFrequency: string, paycheckAmount: number, extraSources?: IncomeSourceLocal[]) {
  const sources: IncomeSourceLocal[] = [{ pay_frequency: payFrequency as PayFrequency, paycheck_amount: paycheckAmount }]
  if (extraSources) sources.push(...extraSources)

  if (!c.dd_required) {
    const weeks = Math.max(1, Math.ceil((c.holding_period_days ?? 56) / 7))
    return { velocity: c.bonus_amount / weeks, weeksToComplete: weeks, feasible: true }
  }

  const perDepositMin = c.min_dd_per_deposit ?? null
  const totalMin = c.min_dd_total ?? null
  const windowDays = c.deposit_window_days ?? null
  const ddCountRequired = c.dd_count_required ?? null

  if (perDepositMin) {
    const maxPaycheck = Math.max(...sources.map(s => s.paycheck_amount))
    if (maxPaycheck < perDepositMin) return { velocity: null, weeksToComplete: null, feasible: false }
  }
  if (totalMin && windowDays) {
    let totalCapacity = 0
    for (const src of sources) {
      const daysPerPay = DAYS_PER_PAY[src.pay_frequency] ?? 14
      totalCapacity += Math.max(1, Math.ceil(windowDays / daysPerPay)) * src.paycheck_amount
    }
    if (totalCapacity < totalMin) return { velocity: null, weeksToComplete: null, feasible: false }
  }

  let weeklyRate = 0
  for (const src of sources) {
    const daysPerPay = DAYS_PER_PAY[src.pay_frequency] ?? 14
    weeklyRate += (src.paycheck_amount / daysPerPay) * 7
  }

  let weeksToComplete: number
  if (ddCountRequired) {
    const viable = perDepositMin ? sources.filter(s => s.paycheck_amount >= perDepositMin) : sources
    let depositsPerWeek = 0
    for (const src of viable) { const d = DAYS_PER_PAY[src.pay_frequency] ?? 14; depositsPerWeek += 7 / d }
    weeksToComplete = Math.ceil(ddCountRequired / depositsPerWeek)
  } else if (totalMin) {
    weeksToComplete = Math.ceil(totalMin / weeklyRate)
  } else {
    weeksToComplete = 1
  }
  weeksToComplete = Math.max(1, weeksToComplete)
  return { velocity: c.bonus_amount / weeksToComplete, weeksToComplete, feasible: true }
}

function money(n: number | null | undefined) { return n == null ? "\u2014" : `$${n.toLocaleString()}` }
function yesNo(v: boolean | null | undefined) { return v == null ? "\u2014" : v ? "Yes" : "No" }
function textOrDash(v: string | null | undefined) { return v || "\u2014" }
function numOrDash(v: number | null | undefined, suffix?: string) { return v == null ? "\u2014" : suffix ? `${v} ${suffix}` : `${v}` }
function bestLink(links: string[] | null | undefined) { return links?.[0] ?? null }
function todayStr() { return new Date().toISOString().split("T")[0] }

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type ProjectedBonus = {
  bank_name: string
  bonus_amount: number
  net_bonus: number
  total_fees: number
  fee_waived_by_dd: boolean
  start_date: string   // ISO: YYYY-MM-DD
  payout_date: string  // ISO: YYYY-MM-DD
  weeks: number
  isCustom?: boolean
  customId?: string
}

function toISODate(d: Date): string { return d.toISOString().split("T")[0] }

function getProjectedBonuses(sequencerResult: SequencerResult): ProjectedBonus[] {
  const today = todayStr()
  const bonuses = sequencerResult.slots.flat().filter(e => e.type === "bonus") as SequencedBonus[]
  return bonuses.map(b => {
    const startDate = addDays(today, (b.start_week - 1) * 7)
    const payoutWeeks = b.bonus_posting_days_est ? Math.ceil(b.bonus_posting_days_est / 7) : b.weeks_to_complete + 4
    const payoutDate = addDays(today, ((b.start_week - 1) + payoutWeeks) * 7)
    return {
      bank_name: b.bank_name,
      bonus_amount: b.bonus_amount,
      net_bonus: b.net_bonus ?? b.bonus_amount,
      total_fees: b.total_fees ?? 0,
      fee_waived_by_dd: b.fee_waived_by_dd ?? false,
      start_date: toISODate(startDate),
      payout_date: toISODate(payoutDate),
      weeks: b.weeks_to_complete,
    }
  })
}

const FREQ_OPTIONS: { value: PayFrequency; label: string; desc: string }[] = [
  { value: "weekly", label: "Every week", desc: "52 paychecks/year" },
  { value: "biweekly", label: "Every 2 weeks", desc: "26 paychecks/year" },
  { value: "semimonthly", label: "Twice a month", desc: "24 paychecks/year" },
  { value: "monthly", label: "Once a month", desc: "12 paychecks/year" },
]

export default function RoadmapClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const { profile, setProfile, loaded } = useProfile()
  const [mounted, setMounted] = useState(false)
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [actionBonus, setActionBonus] = useState<{ bonus: Bonus; mode: "start" | "close" } | null>(null)
  const [actionDate, setActionDate] = useState(todayStr())
  const [bonusReceived, setBonusReceived] = useState(true)
  const [actualAmount, setActualAmount] = useState<string>("")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showBusinessBonuses, setShowBusinessBonuses] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [deposits, setDeposits] = useState<BonusDeposit[]>([])
  const [addingDeposit, setAddingDeposit] = useState<string | null>(null)
  const [newDepositAmt, setNewDepositAmt] = useState("")
  const [newDepositDate, setNewDepositDate] = useState(todayStr())
  const [bonusNotes, setBonusNotes] = useState<Record<string, string>>({})
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const [showProjection, setShowProjection] = useState(false)
  const [projectionResult, setProjectionResult] = useState<SequencerResult | null>(null)
  const [projectionTab, setProjectionTab] = useState<"year1" | "year2">("year1")
  const [customBonuses, setCustomBonuses] = useState<CustomBonus[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [addCustomError, setAddCustomError] = useState<string | null>(null)
  const [customBank, setCustomBank] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [customDate, setCustomDate] = useState(todayStr())
  const [customNotes, setCustomNotes] = useState("")
  const [customChurnable, setCustomChurnable] = useState(false)
  const [customCooldown, setCustomCooldown] = useState("12")
  const [customDdRequired, setCustomDdRequired] = useState(false)
  const [customMinDdTotal, setCustomMinDdTotal] = useState("")
  const [customMinDdPerDeposit, setCustomMinDdPerDeposit] = useState("")
  const [customDdCount, setCustomDdCount] = useState("")
  const [customDepositWindow, setCustomDepositWindow] = useState("")
  const [customHoldingPeriod, setCustomHoldingPeriod] = useState("")
  const [actionCustom, setActionCustom] = useState<{ bonus: CustomBonus; mode: "start" | "close" } | null>(null)
  const [editingCustom, setEditingCustom] = useState<CustomBonus | null>(null)

  const [expandedFees, setExpandedFees] = useState<string | null>(null)
  const [expandedDD, setExpandedDD] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Helper to build income sources from current profile
  function buildIncomeSources(): IncomeSourceLocal[] {
    const sources: IncomeSourceLocal[] = [
      { pay_frequency: profile.pay_frequency, paycheck_amount: profile.paycheck_amount },
    ]
    const f2 = (profile as any).income_2_frequency as PayFrequency | null
    const a2 = Number((profile as any).income_2_amount) || 0
    if (f2 && a2 > 0) {
      sources.push({ pay_frequency: f2, paycheck_amount: a2 })
    }
    const f3 = (profile as any).income_3_frequency as PayFrequency | null
    const a3 = Number((profile as any).income_3_amount) || 0
    if (f3 && a3 > 0) {
      sources.push({ pay_frequency: f3, paycheck_amount: a3 })
    }
    return sources
  }

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true)
    const [records, custom, deps, notes, skips, openAccts] = await Promise.all([
      getCompletedBonuses(userId),
      getCustomBonuses(userId),
      getDeposits(userId),
      getNotes(userId),
      getSkippedBonuses(userId),
      getOpenAccounts(userId),
    ])
    setCompletedRecords(records)
    // Backfill: any kept-open or bonus_posted custom bonus should have bonus_received = true
    const keptOpenMissing = custom.filter(c => (c.current_step === "kept_open" || c.current_step === "bonus_posted") && !c.bonus_received)
    if (keptOpenMissing.length > 0) {
      await Promise.all(keptOpenMissing.map(c => updateCustomBonus(c.id, { bonus_received: true, actual_amount: c.actual_amount ?? c.bonus_amount })))
      for (const c of keptOpenMissing) { c.bonus_received = true; c.actual_amount = c.actual_amount ?? c.bonus_amount }
    }
    setCustomBonuses(custom)
    setDeposits(deps)
    setBonusNotes(notes)
    setSkippedIds(skips)
    setOpenAccounts(openAccts)
    // Derive keptOpen from records that have kept_open flag
    setKeptOpen(records.filter((r: any) => r.kept_open && !r.closed_date).map((r: any) => r.bonus_id))
    setLoadingRecords(false)
  }, [userId])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  function buildCustomSlotBlocks(): number[] {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return activeCustom.map(c => {
      const estimatedDays = c.deposit_window_days ?? c.holding_period_days ?? 56
      const openedDate = new Date(c.opened_date + "T00:00:00")
      const endDate = new Date(openedDate.getTime() + (estimatedDays + 30) * 86400000)
      return Math.max(1, Math.ceil((endDate.getTime() - today.getTime()) / (7 * 86400000)))
    })
  }

  function handleToggleProjection() {
    if (showProjection) {
      setShowProjection(false)
      return
    }
    if (!projectionResult) {
      const slotBlockedUntilWeeks = buildCustomSlotBlocks()
      const result = runSequencer({ slots: buildIncomeSources().length, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords, incomeSources: buildIncomeSources(), slotBlockedUntilWeeks, userState: profile.state, includeBusiness: false })
      setProjectionResult(result)
    }
    setShowProjection(true)
  }

  async function handleStart() {
    if (!actionBonus) return
    await markBonusStarted(userId, actionBonus.bonus.id, actionDate)
    await loadRecords()
    setActionBonus(null)
  }

  async function handleClose() {
    if (!actionBonus) return
    const record = completedRecords.find(r => r.bonus_id === actionBonus.bonus.id && !r.closed_date)
    if (!record) return
    const parsed = actualAmount ? parseInt(actualAmount.replace(/\D/g, "")) : undefined
    await markBonusClosed(record.id, actionDate, true, parsed)
    await loadRecords()
    setActionBonus(null)
  }

  async function handleDelete(bonusId: string) {
    const record = completedRecords.find(r => r.bonus_id === bonusId)
    if (!record) return
    await deleteCompletedBonus(record.id)
    await loadRecords()
  }

  async function handleStepOverride(bonusId: string, step: string) {
    const record = completedRecords.find(r => r.bonus_id === bonusId && !r.closed_date)
    if (!record) return
    await updateBonusStep(record.id, step)
    await loadRecords()
  }

  async function handleMilestoneOverride(bonusId: string, milestone: MilestoneKey) {
    // Write the milestone key directly — getMilestoneDetail reads it back
    // via the fallback: LEGACY_STEP_MAP[manualStep] ?? (manualStep as MilestoneKey)
    await handleStepOverride(bonusId, milestone)
  }

  async function handleMarkBonusReceived(bonusId: string, amount: number) {
    const record = completedRecords.find(r => r.bonus_id === bonusId && !r.closed_date)
    if (!record) return
    const supabase = createClient()
    await supabase.from("completed_bonuses").update({ bonus_received: true, actual_amount: amount }).eq("id", record.id)
    await loadRecords()
  }

  // "Keep open" — mark bonus received but don't close
  const [keptOpen, setKeptOpen] = useState<string[]>([])
  const [openAccounts, setOpenAccounts] = useState<OpenAccount[]>([])
  const [showAddOpenAccount, setShowAddOpenAccount] = useState(false)
  const [openAcctBank, setOpenAcctBank] = useState("")
  const [openAcctDate, setOpenAcctDate] = useState("")
  const [openAcctNotes, setOpenAcctNotes] = useState("")

  async function handleSkip(bonusId: string) {
    await skipBonus(userId, bonusId)
    setSkippedIds(prev => [...prev, bonusId])
  }

  async function handleUnskip(bonusId: string) {
    await unskipBonus(userId, bonusId)
    setSkippedIds(prev => prev.filter(id => id !== bonusId))
  }

  async function handleAddDeposit(bonusId: string) {
    const amt = parseInt(newDepositAmt.replace(/\D/g, ""))
    if (!amt || amt <= 0) return
    const dep = await addDeposit(userId, bonusId, amt, newDepositDate)
    if (dep) setDeposits(prev => [...prev, dep])
    setAddingDeposit(null)
  }

  async function handleDeleteDeposit(depositId: string) {
    await deleteDeposit(depositId)
    setDeposits(prev => prev.filter(d => d.id !== depositId))
  }

  async function handleSaveNote(bonusId: string) {
    await upsertNote(userId, bonusId, noteText)
    setBonusNotes(prev => ({ ...prev, [bonusId]: noteText }))
    setEditingNote(null)
  }

  async function handleAddCustom() {
    if (!customBank || !customAmount) return
    setAddCustomError(null)
    const cooldown = customChurnable ? parseInt(customCooldown) || null : null
    const result = await addCustomBonus(userId, customBank, parseInt(customAmount), customDate, customNotes || undefined, cooldown, {
      ddRequired: customDdRequired,
      minDdTotal: customDdRequired && customMinDdTotal ? parseInt(customMinDdTotal) : null,
      minDdPerDeposit: customDdRequired && customMinDdPerDeposit ? parseInt(customMinDdPerDeposit) : null,
      ddCountRequired: customDdRequired && customDdCount ? parseInt(customDdCount) : null,
      depositWindowDays: customDdRequired && customDepositWindow ? parseInt(customDepositWindow) : null,
      holdingPeriodDays: customHoldingPeriod ? parseInt(customHoldingPeriod) : null,
    })
    if (!result) { setAddCustomError("Failed to save — please check your connection and try again."); return }
    await loadRecords()
    setShowAddCustom(false)
    setAddCustomError(null)
    setCustomBank(""); setCustomAmount(""); setCustomDate(todayStr()); setCustomNotes("")
    setCustomChurnable(false); setCustomCooldown("12")
    setCustomDdRequired(false); setCustomMinDdTotal(""); setCustomMinDdPerDeposit("")
    setCustomDdCount(""); setCustomDepositWindow(""); setCustomHoldingPeriod("")
  }

  async function handleCloseCustom() {
    if (!actionCustom) return
    const parsed = actualAmount ? parseInt(actualAmount.replace(/\D/g, "")) : undefined
    await closeCustomBonus(actionCustom.bonus.id, actionDate, bonusReceived, parsed)
    await loadRecords()
    setActionCustom(null)
  }

  async function handleDeleteCustom(id: string) {
    await deleteCustomBonus(id)
    await loadRecords()
  }

  function handleOpenEditCustom(c: CustomBonus) {
    setCustomBank(c.bank_name)
    setCustomAmount(String(c.bonus_amount))
    setCustomDate(c.opened_date)
    setCustomNotes(c.notes ?? "")
    setCustomChurnable(c.cooldown_months != null)
    setCustomCooldown(c.cooldown_months ? String(c.cooldown_months) : "12")
    setCustomDdRequired(c.dd_required ?? false)
    setCustomMinDdTotal(c.min_dd_total ? String(c.min_dd_total) : "")
    setCustomMinDdPerDeposit(c.min_dd_per_deposit ? String(c.min_dd_per_deposit) : "")
    setCustomDdCount(c.dd_count_required ? String(c.dd_count_required) : "")
    setCustomDepositWindow(c.deposit_window_days ? String(c.deposit_window_days) : "")
    setCustomHoldingPeriod(c.holding_period_days ? String(c.holding_period_days) : "")
    setEditingCustom(c)
  }

  async function handleSaveEditCustom() {
    if (!editingCustom || !customBank || !customAmount) return
    await updateCustomBonus(editingCustom.id, {
      bank_name: customBank,
      bonus_amount: parseInt(customAmount),
      opened_date: customDate,
      notes: customNotes || null,
      cooldown_months: customChurnable ? (parseInt(customCooldown) || null) : null,
      dd_required: customDdRequired,
      min_dd_total: customDdRequired && customMinDdTotal ? parseInt(customMinDdTotal) : null,
      min_dd_per_deposit: customDdRequired && customMinDdPerDeposit ? parseInt(customMinDdPerDeposit) : null,
      dd_count_required: customDdRequired && customDdCount ? parseInt(customDdCount) : null,
      deposit_window_days: customDdRequired && customDepositWindow ? parseInt(customDepositWindow) : null,
      holding_period_days: customHoldingPeriod ? parseInt(customHoldingPeriod) : null,
    })
    await loadRecords()
    setEditingCustom(null)
  }


  async function handleCustomKeptOpen(id: string) {
    const bonus = customBonuses.find(c => c.id === id)
    const amount = bonus?.bonus_amount ?? 0
    await updateCustomBonus(id, { current_step: "kept_open", bonus_received: true, actual_amount: amount })
    setCustomBonuses(prev => prev.map(c => c.id === id ? { ...c, current_step: "kept_open", bonus_received: true, actual_amount: amount } : c))
  }

  async function handleCustomUnskip(id: string) {
    await updateCustomBonus(id, { current_step: "pending" })
    setCustomBonuses(prev => prev.map(c => c.id === id ? { ...c, current_step: "pending" } : c))
  }

  function openStartCustomModal(bonus: CustomBonus) {
    setActionCustom({ bonus, mode: "start" })
    setActionDate(todayStr())
  }

  async function handleConfirmStartCustom() {
    if (!actionCustom) return
    const date = actionDate || todayStr()
    await updateCustomBonus(actionCustom.bonus.id, { current_step: null, opened_date: date })
    setCustomBonuses(prev => prev.map(c => c.id === actionCustom.bonus.id ? { ...c, current_step: null, opened_date: date } : c))
    setProjectionResult(null)
    setActionCustom(null)
  }

  // pending = added to queue but not yet started
  const pendingCustom = customBonuses.filter(c => !c.closed_date && c.current_step === "pending")
  // active = started (current_step !== pending/kept_open/skipped/bonus_posted, not closed)
  const activeCustom = customBonuses.filter(c => !c.closed_date && c.current_step !== "kept_open" && c.current_step !== "skipped" && c.current_step !== "pending" && c.current_step !== "bonus_posted")
  const customKeptOpen = customBonuses.filter(c => !c.closed_date && (c.current_step === "kept_open" || c.current_step === "bonus_posted"))
  const customSkipped = customBonuses.filter(c => !c.closed_date && c.current_step === "skipped")
  const closedCustom = customBonuses.filter(c => c.closed_date)
  const customEarned = [
    ...closedCustom.filter(c => c.bonus_received),
    ...customKeptOpen,
  ].reduce((s, c) => s + (c.actual_amount ?? c.bonus_amount), 0)
  const customInProgress = activeCustom.reduce((s, c) => s + c.bonus_amount, 0)

  const customInCooldown = closedCustom.filter(c => {
    if (!c.cooldown_months || !c.closed_date) return false
    const cooldownEnd = new Date(c.closed_date + "T00:00:00")
    cooldownEnd.setMonth(cooldownEnd.getMonth() + c.cooldown_months)
    return cooldownEnd > new Date()
  }).map(c => {
    const cooldownEnd = new Date(c.closed_date! + "T00:00:00")
    cooldownEnd.setMonth(cooldownEnd.getMonth() + c.cooldown_months!)
    const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { ...c, days_remaining: daysLeft, available_date: cooldownEnd.toISOString().split("T")[0] }
  })

  const allIncomeSources = buildIncomeSources()
  const extraSources = allIncomeSources.slice(1)

  const bonusesWithMeta = mounted
    ? allBonuses.map((b) => ({
        bonus: b,
        ...computeVelocity(b, profile.pay_frequency, profile.paycheck_amount, extraSources),
        churnStatus: getChurnStatus(b.id, (b as any).cooldown_months ?? null, completedRecords),
      }))
    : allBonuses.map((b) => ({
        bonus: b, velocity: null, weeksToComplete: null, feasible: true, reason: undefined,
        churnStatus: { status: "available" } as ChurnStatus,
      }))

  const inProgress = bonusesWithMeta.filter(b => b.churnStatus.status === "in_progress")
  const available = bonusesWithMeta
    .filter(b => b.churnStatus.status === "available" && !skippedIds.includes(b.bonus.id) && !(b.bonus as any).expired)
    .filter(b => {
      // Business filter
      if ((b.bonus as any).business && !showBusinessBonuses) return false
      if (!(b.bonus as any).business && false) return false // personal always shown
      return true
    })
    .filter(b => {
      if (!profile.state || !b.bonus.eligibility?.state_restricted) return true
      const allowed = b.bonus.eligibility.states_allowed ?? []
      return allowed.length === 0 || allowed.includes(profile.state)
    })
    .sort((a, b) => {
      if (a.feasible && !b.feasible) return -1
      if (!a.feasible && b.feasible) return 1
      return (b.velocity ?? 0) - (a.velocity ?? 0)
    })
  const skippedBonuses = bonusesWithMeta.filter(b => b.churnStatus.status === "available" && skippedIds.includes(b.bonus.id))
  const inCooldown = bonusesWithMeta.filter(b => b.churnStatus.status === "in_cooldown")
    .sort((a, b) => {
      const ad = a.churnStatus.status === "in_cooldown" ? a.churnStatus.days_remaining : 0
      const bd = b.churnStatus.status === "in_cooldown" ? b.churnStatus.days_remaining : 0
      return ad - bd
    })

  const allEarned = completedRecords.filter(r => r.bonus_received)
  const allClosed = completedRecords.filter(r => r.bonus_received && r.closed_date)
  const earnedAmt = (r: CompletedBonus) => { const b = allBonuses.find(x => x.id === r.bonus_id); return r.actual_amount ?? b?.bonus_amount ?? 0 }
  const totalEarned = allEarned.reduce((sum, r) => sum + earnedAmt(r), 0)

  // Reset projection when income changes
  const income2Freq = (profile as any).income_2_frequency ?? null
  const income2Amt = (profile as any).income_2_amount ?? 0
  const income3Freq = (profile as any).income_3_frequency ?? null
  const income3Amt = (profile as any).income_3_amount ?? 0

  useEffect(() => {
    setProjectionResult(null)
  }, [profile.pay_frequency, profile.paycheck_amount, profile.state, showBusinessBonuses, income2Freq, income2Amt, income3Freq, income3Amt, skippedIds, customBonuses])

  useEffect(() => {
    if (mounted && !loadingRecords && loaded && !projectionResult) {
      const slotBlockedUntilWeeks = buildCustomSlotBlocks()
      const result = runSequencer({ slots: buildIncomeSources().length, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords, incomeSources: buildIncomeSources(), skippedBonusIds: skippedIds, slotBlockedUntilWeeks, userState: profile.state, includeBusiness: false })
      setProjectionResult(result)
    }
  }, [mounted, loadingRecords, loaded, profile.pay_frequency, profile.paycheck_amount, profile.state, completedRecords, projectionResult, income2Freq, income2Amt, income3Freq, income3Amt, skippedIds, customBonuses])

  const projected365 = projectionResult ? getProjectedBonuses(projectionResult) : []
  const today365End = addDays(todayStr(), 365)
  const today730End = addDays(todayStr(), 730)
  const yearBonuses365 = projected365.filter(p => new Date(p.start_date) <= today365End)

  // Project custom bonuses into the plan (active + future churnable cycles only — pending stay in queue until started)
  const customProjectedBonuses: ProjectedBonus[] = []
  // Active (open) custom bonuses — project current cycle
  for (const c of activeCustom) {
    const estimatedDays = c.deposit_window_days ?? c.holding_period_days ?? 56
    const startDate = new Date(c.opened_date + "T00:00:00")
    const payoutDate = new Date(startDate.getTime() + (estimatedDays + 30) * 86400000)
    if (startDate <= today730End) {
      customProjectedBonuses.push({
        bank_name: c.bank_name,
        bonus_amount: c.bonus_amount,
        start_date: toISODate(startDate),
        payout_date: toISODate(payoutDate),
        weeks: Math.ceil(estimatedDays / 7),
        isCustom: true, net_bonus: c.bonus_amount, total_fees: 0, fee_waived_by_dd: false,
        customId: c.id,
      })
    }
    // If churnable, also project future cycles
    if (c.cooldown_months) {
      let nextStart = new Date(payoutDate.getTime())
      nextStart.setMonth(nextStart.getMonth() + c.cooldown_months)
      while (nextStart <= today730End) {
        const nextPayout = new Date(nextStart.getTime() + (estimatedDays + 30) * 86400000)
        customProjectedBonuses.push({
          bank_name: c.bank_name,
          bonus_amount: c.bonus_amount,
          start_date: toISODate(nextStart),
          payout_date: toISODate(nextPayout),
          weeks: Math.ceil(estimatedDays / 7),
          isCustom: true, net_bonus: c.bonus_amount, total_fees: 0, fee_waived_by_dd: false,
          customId: c.id,
        })
        nextStart = new Date(nextStart.getTime())
        nextStart.setMonth(nextStart.getMonth() + c.cooldown_months)
      }
    }
  }
  // Closed churnable custom bonuses — project future cycles
  for (const c of closedCustom) {
    if (!c.cooldown_months || !c.closed_date) continue
    const durationDays = Math.max(30, Math.round(
      (new Date(c.closed_date + "T00:00:00").getTime() - new Date(c.opened_date + "T00:00:00").getTime()) / 86400000
    ))
    let nextStart = new Date(c.closed_date + "T00:00:00")
    nextStart.setMonth(nextStart.getMonth() + c.cooldown_months)
    while (nextStart <= today730End) {
      const nextPayout = new Date(nextStart.getTime() + (durationDays + 30) * 86400000)
      customProjectedBonuses.push({
        bank_name: c.bank_name,
        bonus_amount: c.bonus_amount,
        start_date: toISODate(nextStart),
        payout_date: toISODate(nextPayout),
        weeks: Math.ceil(durationDays / 7),
        isCustom: true, net_bonus: c.bonus_amount, total_fees: 0, fee_waived_by_dd: false,
        customId: c.id,
      })
      nextStart = new Date(nextStart.getTime())
      nextStart.setMonth(nextStart.getMonth() + c.cooldown_months)
    }
  }

  const customYear1Projected = customProjectedBonuses.filter(p => new Date(p.start_date) <= today365End)
  const expectedThisYear = yearBonuses365.reduce((sum, p) => sum + p.bonus_amount, 0)
    + customYear1Projected.reduce((sum, p) => sum + p.bonus_amount, 0)

  // Active bonuses that are actually being worked on (not kept open)
  const workingBonuses = inProgress.filter(({ bonus: b }) => !keptOpen.includes(b.id))
  // Number of parallel slots = number of income sources
  const totalSlots = allIncomeSources.length
  // How many open slots are available for new bonuses (custom bonuses occupy slots too)
  const openSlots = Math.max(0, totalSlots - workingBonuses.length - activeCustom.length)
  // Unified available pool: standard + pending custom, sorted by profitability
  type AvailableItem =
    | { kind: "standard"; bonus: typeof available[number]["bonus"]; weeksToComplete: number | null; velocity: number | null; feasible: boolean }
    | { kind: "custom"; bonus: typeof pendingCustom[number]; weeksToComplete: number | null; velocity: number | null; feasible: boolean }
  const allAvailable: AvailableItem[] = [
    ...available.map((b): AvailableItem => ({
      kind: "standard", bonus: b.bonus, weeksToComplete: b.weeksToComplete, velocity: b.velocity, feasible: b.feasible,
    })),
    ...pendingCustom.map((c): AvailableItem => {
      const cv = computeCustomVelocity(c, profile.pay_frequency, profile.paycheck_amount, extraSources)
      return { kind: "custom", bonus: c, velocity: cv.velocity, weeksToComplete: cv.weeksToComplete, feasible: cv.feasible }
    }),
  ].sort((a, b) => {
    if (!a.feasible && b.feasible) return 1
    if (a.feasible && !b.feasible) return -1
    return (b.velocity ?? 0) - (a.velocity ?? 0)
  })

  const heroBonuses = allAvailable.slice(0, openSlots)
  const currentBonus = workingBonuses[0] ?? available[0] ?? null
  const queueItems = allAvailable.slice(openSlots, openSlots + 3)

  if (!mounted || loadingRecords) {
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
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111" }}>Stacks OS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select value={profile.state ?? ""} onChange={e => setProfile({ state: e.target.value || null })}
            style={{ fontSize: 12, color: profile.state ? "#0d7c5f" : "#999", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
            <option value="">All states</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setShowSettings(s => !s)} style={topBtn}>{showSettings ? "Close" : "Pay Profile"}</button>
          <a href="/stacksos/history" style={{ ...topBtn, textDecoration: "none", display: "inline-block" }}>History</a>
          <a href="/stacksos/taxes" style={{ ...topBtn, textDecoration: "none", display: "inline-block" }}>Taxes</a>
          <button onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          }} style={topBtn}>Subscription</button>
          <button onClick={handleLogout} style={topBtn}>Log out</button>
        </div>
      </div>

      {/* System status strip */}
      <div style={{ background: "#f0faf5", borderBottom: "1px solid #d1fae5", padding: "8px 0", width: "100%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#555" }}>Tracking nationwide bonus offers</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>·</span>
          <span style={{ fontSize: 12, color: "#555" }}>Your roadmap updates as offers change</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>·</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>Last updated April 17, 2026</span>
        </div>
      </div>

      <CheckpointNav />

      {/* ── Urgency Alerts ── */}
      {(() => {
        const urgentBonuses = inProgress.filter(({ bonus: b }) => {
          const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)
          if (!record?.opened_date) return false
          const windowDays = b.requirements?.deposit_window_days
          if (!windowDays) return false
          const startDate = new Date(record.opened_date + "T00:00:00")
          const deadline = new Date(startDate.getTime() + windowDays * 86400000)
          const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
          return daysLeft > 0 && daysLeft <= 14
        })
        if (urgentBonuses.length === 0) return null
        return (
          <div style={{ background: "#fffbeb", borderBottom: "1px solid #f0c040", padding: "10px 32px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>&#x26A0;&#xFE0F;</span>
              {urgentBonuses.map(({ bonus: b }) => {
                const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)!
                const windowDays = b.requirements?.deposit_window_days ?? 0
                const startDate = new Date(record.opened_date + "T00:00:00")
                const deadline = new Date(startDate.getTime() + windowDays * 86400000)
                const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
                return (
                  <span key={b.id} style={{ fontSize: 13, color: daysLeft <= 7 ? "#dc2626" : "#d97706", fontWeight: 600 }}>
                    {b.bank_name}: {daysLeft} day{daysLeft !== 1 ? "s" : ""} left to meet deposit requirement
                  </span>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* Settings Panel */}
        {showSettings && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Pay Profile</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={settingsLabel}>Pay frequency</div>
                <select value={profile.pay_frequency} onChange={e => setProfile({ pay_frequency: e.target.value as PayFrequency })} style={settingsSelectLight}>
                  {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <div style={settingsLabel}>Paycheck amount</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                  <input type="number" value={profile.paycheck_amount} onChange={e => setProfile({ paycheck_amount: Number(e.target.value) })} style={settingsInputLight} min={0} step={100} />
                </div>
              </div>
              <div>
                <div style={settingsLabel}>Your state</div>
                <select value={profile.state ?? ""} onChange={e => setProfile({ state: e.target.value || null })} style={settingsSelectLight}>
                  <option value="">All states</option>
                  {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 12 }}>Changes save automatically</div>

            {/* Additional income sources */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>Additional income sources</div>
              <div style={{ fontSize: 11, color: "#bbb", marginBottom: 12 }}>Add other jobs or side income with separate direct deposits. This speeds up your projected timelines and may unlock bonuses with higher deposit requirements.</div>

              {/* Income source 2 */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
                <div>
                  <div style={settingsLabel}>Income 2 — Frequency</div>
                  <select
                    value={(profile as any).income_2_frequency ?? ""}
                    onChange={e => {
                      const val = e.target.value || null
                      if (!val) {
                        setProfile({ income_2_frequency: null, income_2_amount: null, income_3_frequency: null, income_3_amount: null } as any)
                      } else {
                        setProfile({ income_2_frequency: val } as any)
                      }
                    }}
                    style={settingsSelectLight}>
                    <option value="">None</option>
                    {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {(profile as any).income_2_frequency && (
                  <div>
                    <div style={settingsLabel}>Amount</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                      <input type="number"
                        value={(profile as any).income_2_amount ?? ""}
                        onChange={e => setProfile({ income_2_amount: Number(e.target.value) || null } as any)}
                        style={settingsInputLight} min={0} step={100}
                        placeholder="0" />
                    </div>
                  </div>
                )}
              </div>

              {/* Income source 3 — only show if source 2 is set */}
              {(profile as any).income_2_frequency && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <div style={settingsLabel}>Income 3 — Frequency</div>
                    <select
                      value={(profile as any).income_3_frequency ?? ""}
                      onChange={e => {
                        const val = e.target.value || null
                        if (!val) {
                          setProfile({ income_3_frequency: null, income_3_amount: null } as any)
                        } else {
                          setProfile({ income_3_frequency: val } as any)
                        }
                      }}
                      style={settingsSelectLight}>
                      <option value="">None</option>
                      {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  {(profile as any).income_3_frequency && (
                    <div>
                      <div style={settingsLabel}>Amount</div>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                        <input type="number"
                          value={(profile as any).income_3_amount ?? ""}
                          onChange={e => setProfile({ income_3_amount: Number(e.target.value) || null } as any)}
                          style={settingsInputLight} min={0} step={100}
                          placeholder="0" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cross-Module Summary ── */}
        {projectionResult && (
          <div style={{ background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)", border: "2px solid #0d7c5f", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#0d7c5f", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>12-Month Total Portfolio</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f", marginTop: 4, letterSpacing: "-0.02em" }}>
                  {money(projected365.reduce((s, p) => s + p.net_bonus, 0))}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  Paycheck bonuses · <a href="/stacksos/savings" style={{ color: "#0d7c5f", textDecoration: "none" }}>+ Savings</a> · <a href="/stacksos/spending" style={{ color: "#0d7c5f", textDecoration: "none" }}>+ Credit Cards</a>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>Earned</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{money(totalEarned + customEarned)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase" }}>In Progress</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{money(inProgress.reduce((s, b) => s + b.bonus.bonus_amount, 0) + customInProgress)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Bar — always first ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lifetime earned</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>${(totalEarned + customEarned).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{allClosed.length + closedCustom.length} bonus{allClosed.length + closedCustom.length !== 1 ? "es" : ""} completed</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>In progress</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>${(inProgress.reduce((s, b) => s + b.bonus.bonus_amount, 0) + customInProgress).toLocaleString()}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available bonuses</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>{available.length + inProgress.length}</div>
                <button onClick={handleToggleProjection} style={{ fontSize: 11, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, marginTop: 4 }}>
                  {showProjection ? "Hide plan" : "View full bonus plan"}
                </button>
                <div style={{ fontSize: 10, color: "#ccc", marginTop: 3 }}>Portfolio projection lives on the Dashboard.</div>
              </div>
            </div>

            {/* Projection breakdown (expandable) */}
            {showProjection && projectionResult && (() => {
              const projected = getProjectedBonuses(projectionResult)
              const year1End = addDays(todayStr(), 365)
              const year2End = addDays(todayStr(), 730)
              const year1Bonuses = [
                ...projected.filter(p => new Date(p.start_date) <= year1End),
                ...customProjectedBonuses.filter(p => new Date(p.start_date) <= year1End),
              ].sort((a, b) => b.bonus_amount / b.weeks - a.bonus_amount / a.weeks)
              const year2Bonuses = [
                ...projected.filter(p => new Date(p.start_date) > year1End && new Date(p.start_date) <= year2End),
                ...customProjectedBonuses.filter(p => new Date(p.start_date) > year1End && new Date(p.start_date) <= year2End),
              ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              const activeBonuses = projectionTab === "year1" ? year1Bonuses : year2Bonuses
              return (
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                  {/* Tabs */}
                  <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3, marginBottom: 14 }}>
                    {(["year1", "year2"] as const).map(tab => (
                      <button key={tab} onClick={() => setProjectionTab(tab)} style={{
                        flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                        border: "none", cursor: "pointer",
                        background: projectionTab === tab ? "#fff" : "transparent",
                        color: projectionTab === tab ? "#111" : "#999",
                        boxShadow: projectionTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      }}>
                        {tab === "year1" ? `This year · ${money(year1Bonuses.reduce((s, p) => s + p.net_bonus, 0))}` : `Next year · ${money(year2Bonuses.reduce((s, p) => s + p.net_bonus, 0))}`}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#bbb", marginBottom: 10 }}>
                    Based on ${profile.paycheck_amount.toLocaleString()} {profile.pay_frequency} paycheck · {activeBonuses.length} opportunities
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {activeBonuses.length === 0 ? (
                      <div style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "16px 0" }}>No bonuses projected for this period.</div>
                    ) : (() => {
                      // Build display list with gap cards injected between bonuses
                      type DisplayItem =
                        | { type: "bonus"; bonus: typeof activeBonuses[0]; idx: number }
                        | { type: "gap"; from: string; to: string }
                      const items: DisplayItem[] = []
                      const sorted = [...activeBonuses].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                      let bonusIdx = 0

                      if (projectionTab === "year2") {
                        // Check gap from year1End to first year2 bonus
                        if (sorted.length > 0) {
                          const firstStart = new Date(sorted[0].start_date)
                          const gapDays = Math.round((firstStart.getTime() - year1End.getTime()) / 86400000)
                          if (gapDays > 14) {
                            items.push({ type: "gap", from: fmtDate(year1End), to: sorted[0].start_date })
                          }
                        }
                      }

                      for (let i = 0; i < sorted.length; i++) {
                        if (i > 0) {
                          const prevPayout = new Date(sorted[i - 1].payout_date)
                          const nextStart = new Date(sorted[i].start_date)
                          const gapDays = Math.round((nextStart.getTime() - prevPayout.getTime()) / 86400000)
                          if (gapDays > 14) {
                            items.push({ type: "gap", from: sorted[i - 1].payout_date, to: sorted[i].start_date })
                          }
                        }
                        items.push({ type: "bonus", bonus: sorted[i], idx: bonusIdx++ })
                      }

                      return items.map((item, i) =>
                        item.type === "gap" ? (
                          <div key={`gap-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fafafa", border: "1px dashed #e0e0e0", borderRadius: 8 }}>
                            <span style={{ fontSize: 11, color: "#ccc", fontWeight: 700, width: 20 }}>—</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#bbb" }}>No bonus available yet</div>
                              <div style={{ fontSize: 11, color: "#ccc" }}>{item.from} → {item.to}</div>
                            </div>
                          </div>
                        ) : (() => {
                          const p = item.bonus
                          const startFmt = fmtDate(new Date(p.start_date + "T00:00:00"))
                          const payoutFmt = fmtDate(new Date(p.payout_date + "T00:00:00"))
                          return (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f8f8", borderRadius: 8, gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 11, color: "#bbb", fontWeight: 700, width: 20, flexShrink: 0 }}>{item.idx + 1}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p.bank_name}</span>
                                    {p.isCustom && (
                                      <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.04em" }}>Custom</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#999" }}>Start {startFmt} → Payout ~{payoutFmt}</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(p.bonus_amount)}</span>
                              </div>
                            </div>
                          )
                        })()
                      )
                    })()}
                  </div>
                  {(() => {
                    const grossTotal = activeBonuses.reduce((s, p) => s + p.bonus_amount, 0)
                    const netTotal = activeBonuses.reduce((s, p) => s + p.net_bonus, 0)
                    const totalFees = grossTotal - netTotal
                    return (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 6, background: "#f0faf5", borderRadius: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Total projected</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#0d7c5f" }}>{money(netTotal)}</span>
                          {totalFees > 0 && (
                            <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>(net of {money(totalFees)} in fees)</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
                    Your bonus plan updates automatically as offers change and you complete bonuses.
                  </div>
                </div>
              )
            })()}

            {/* ── HERO: Action Cards (one per open income slot) ── */}
            {heroBonuses.map((hb, heroIdx) => {
              const accentColor = heroIdx === 0 ? "#0d7c5f" : "#2563eb"
              return hb.kind === "custom" ? (
                // Custom bonus hero card
                <div key={hb.bonus.id} style={{
                  background: "#fff", border: "2px solid #7c3aed", borderRadius: 16, padding: "36px 32px", marginBottom: 20,
                  boxShadow: "0 4px 24px rgba(124,58,237,0.08)",
                }}>
                  {heroBonuses.length > 1 && (
                    <div style={{ fontSize: 11, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                      Income source {workingBonuses.length + heroIdx + 1} — open slot
                    </div>
                  )}
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                    {totalEarned > 0 || heroIdx > 0 ? `Your Next ${money(hb.bonus.bonus_amount)} Is Ready` : `Your First ${money(hb.bonus.bonus_amount)} Is Ready`}
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>Custom bonus you added</div>
                  <div style={{ marginTop: 20, display: "flex", gap: 28, alignItems: "baseline" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{hb.bonus.bank_name}</div>
                    <span style={{ fontSize: 11, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>Custom</span>
                    {hb.weeksToComplete && (
                      <div style={{ fontSize: 14, color: "#666" }}>
                        Complete in {Math.ceil(hb.weeksToComplete / 2)} pay cycle{Math.ceil(hb.weeksToComplete / 2) > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                  {hb.bonus.notes && <div style={{ fontSize: 14, color: "#555", marginTop: 8 }}>{hb.bonus.notes}</div>}
                  {hb.bonus.dd_required && hb.bonus.min_dd_total && (
                    <div style={{ fontSize: 14, color: "#555", marginTop: 8 }}>
                      Deposit ${hb.bonus.min_dd_total.toLocaleString()} in {hb.bonus.deposit_window_days ?? 90} days
                    </div>
                  )}
                  {hb.bonus.cooldown_months && (
                    <div style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Churnable · every {hb.bonus.cooldown_months}mo</div>
                  )}
                  <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                    <button onClick={() => openStartCustomModal(hb.bonus)}
                      style={{ padding: "16px 36px", fontSize: 16, fontWeight: 700, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer" }}>
                      Start now
                    </button>
                    <button onClick={async () => { await updateCustomBonus(hb.bonus.id, { current_step: "skipped" }); setCustomBonuses(prev => prev.map(x => x.id === hb.bonus.id ? { ...x, current_step: "skipped" } : x)) }}
                      style={{ padding: "16px 20px", fontSize: 14, color: "#bbb", background: "none", border: "1px solid #e8e8e8", borderRadius: 12, cursor: "pointer" }}>
                      Not now
                    </button>
                  </div>
                </div>
              ) : (
                // Standard bonus hero card
                <div key={hb.bonus.id} style={{
                  background: "#fff", border: `2px solid ${accentColor}`, borderRadius: 16, padding: "36px 32px", marginBottom: 20,
                  boxShadow: heroIdx === 0 ? "0 4px 24px rgba(13,124,95,0.08)" : "0 4px 24px rgba(37,99,235,0.06)",
                }}>
                  {heroBonuses.length > 1 && (
                    <div style={{ fontSize: 11, color: accentColor, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                      Income source {workingBonuses.length + heroIdx + 1} — open slot
                    </div>
                  )}
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                    {totalEarned > 0 || heroIdx > 0 ? `Your Next ${money(hb.bonus.bonus_amount)} Is Ready` : `Your First ${money(hb.bonus.bonus_amount)} Is Ready`}
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>
                    {hb.velocity ? `Earns $${Math.round(hb.velocity)}/week — highest return for your paycheck` : "You qualify based on your paycheck"}
                  </div>
                  <div style={{ marginTop: 20, display: "flex", gap: 28, alignItems: "baseline" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{hb.bonus.bank_name}</div>
                    <div style={{ fontSize: 14, color: "#666" }}>
                      Complete in {hb.weeksToComplete ? `${Math.ceil(hb.weeksToComplete / 2)} pay cycle${Math.ceil(hb.weeksToComplete / 2) > 1 ? "s" : ""}` : "a few weeks"}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                    {hb.bonus.requirements?.min_direct_deposit_total && (
                      <div style={{ fontSize: 14, color: "#555" }}>
                        Deposit ${hb.bonus.requirements.min_direct_deposit_total.toLocaleString()} in {hb.bonus.requirements.deposit_window_days ?? 90} days using your regular paycheck
                      </div>
                    )}
                    {!hb.bonus.requirements?.min_direct_deposit_total && hb.bonus.requirements?.min_direct_deposit_per_deposit && (
                      <div style={{ fontSize: 14, color: "#555" }}>
                        Make {hb.bonus.requirements.dd_count_required ?? "a"} direct deposit{(hb.bonus.requirements.dd_count_required ?? 0) > 1 ? "s" : ""} of ${hb.bonus.requirements.min_direct_deposit_per_deposit.toLocaleString()}+ each
                      </div>
                    )}
                    {!hb.bonus.requirements?.min_direct_deposit_total && !hb.bonus.requirements?.min_direct_deposit_per_deposit && (
                      <div style={{ fontSize: 14, color: "#555" }}>Set up direct deposit to qualify</div>
                    )}
                    {hb.bonus.requirements?.debit_transactions_required && (
                      <div style={{ fontSize: 14, color: "#555" }}>
                        + {hb.bonus.requirements.debit_transactions_required} qualifying transactions required
                      </div>
                    )}
                    {/* Show all tiers if this is a tiered bonus */}
                    {hb.bonus.tiers && hb.bonus.tiers.length > 1 && (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {hb.bonus.tiers.map((t: { bonus: number; min_dd_total: number }) => {
                          const isSelected = hb.bonus.bonus_amount === t.bonus
                          return (
                            <div key={t.bonus} style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 6,
                              border: isSelected ? "1.5px solid #0d7c5f" : "1px solid #e0e0e0",
                              color: isSelected ? "#0d7c5f" : "#999",
                              fontWeight: isSelected ? 700 : 400,
                              background: isSelected ? "#f0faf5" : "transparent",
                            }}>
                              ${t.bonus} at ${t.min_dd_total.toLocaleString()} DD
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Key details: hold period, closure penalty, min opening deposit */}
                  <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {hb.bonus.timeline?.must_remain_open_days && (
                      <div style={{ fontSize: 12, color: "#888", background: "#f5f5f5", padding: "4px 10px", borderRadius: 6 }}>
                        Keep open {hb.bonus.timeline.must_remain_open_days} days
                      </div>
                    )}
                    {hb.bonus.fees?.early_closure_fee > 0 && (
                      <div style={{ fontSize: 12, color: "#d97706", background: "#fffbeb", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
                        ${hb.bonus.fees.early_closure_fee} early closure fee
                      </div>
                    )}
                    {hb.bonus.requirements?.min_opening_deposit > 0 && (
                      <div style={{ fontSize: 12, color: "#888", background: "#f5f5f5", padding: "4px 10px", borderRadius: 6 }}>
                        ${hb.bonus.requirements.min_opening_deposit} min to open
                      </div>
                    )}
                    {hb.bonus.requirements?.min_balance > 0 && (
                      <div style={{ fontSize: 12, color: "#d97706", background: "#fffbeb", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
                        ${hb.bonus.requirements.min_balance.toLocaleString()} balance required
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                    <button onClick={() => setExpandedFees(expandedFees === hb.bonus.id ? null : hb.bonus.id)}
                      style={{ fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>{expandedFees === hb.bonus.id ? "▲" : "▼"}</span>
                      Fees &amp; how to avoid
                    </button>
                    {expandedFees === hb.bonus.id && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        {hb.bonus.fees?.monthly_fee && hb.bonus.fees.monthly_fee > 0 ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>Monthly fee: ${hb.bonus.fees.monthly_fee}/month</div>
                            {hb.bonus.fees.monthly_fee_waiver_text && (
                              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{hb.bonus.fees.monthly_fee_waiver_text}</div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600 }}>No monthly fee</div>
                        )}
                        {hb.bonus.fees?.early_closure_fee > 0 && (
                          <div style={{ fontSize: 12, color: "#d97706" }}>Early closure fee: ${hb.bonus.fees.early_closure_fee} — keep the account open until the holding period ends.</div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* DD methods dropdown */}
                  {(() => {
                    const ddMethods = blogContent[hb.bonus.id]?.ddMethods
                    if (!ddMethods || ddMethods.length === 0) return null
                    const isOpen = expandedDD === hb.bonus.id
                    return (
                      <div style={{ marginTop: 2, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                        <button onClick={() => setExpandedDD(isOpen ? null : hb.bonus.id)}
                          style={{ fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 10, color: "#999" }}>{isOpen ? "▲" : "▼"}</span>
                          What counts as direct deposit
                        </button>
                        {isOpen && (
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                            {ddMethods.map((dd, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, lineHeight: "18px", flexShrink: 0,
                                  color: dd.works === true ? "#0d7c5f" : dd.works === "mixed" ? "#d97706" : "#ef4444",
                                }}>
                                  {dd.works === true ? "YES" : dd.works === "mixed" ? "MAYBE" : "NO"}
                                </span>
                                <div>
                                  <span style={{ fontSize: 12, color: "#333" }}>{dd.method}</span>
                                  {dd.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{dd.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                    {bestLink(hb.bonus.source_links) && (
                      <a href={bestLink(hb.bonus.source_links)!} target="_blank" rel="noreferrer"
                        style={{ padding: "16px 36px", fontSize: 16, fontWeight: 700, background: accentColor, color: "#fff", border: "none", borderRadius: 12, textDecoration: "none", textAlign: "center" as const, display: "inline-block" }}>
                        Open your account
                      </a>
                    )}
                    <button onClick={() => { setActionBonus({ bonus: hb.bonus, mode: "start" }); setActionDate(todayStr()) }}
                      style={{ padding: "16px 24px", fontSize: 14, color: "#888", background: "none", border: "1px solid #ddd", borderRadius: 12, cursor: "pointer" }}>
                      I already opened it
                    </button>
                    <button onClick={() => handleSkip(hb.bonus.id)}
                      style={{ padding: "16px 20px", fontSize: 14, color: "#bbb", background: "none", border: "1px solid #e8e8e8", borderRadius: 12, cursor: "pointer" }}>
                      Not now
                    </button>
                  </div>
                  {getPostByBonusId(hb.bonus.id) && (
                    <a href={`/blog/${getPostByBonusId(hb.bonus.id)!.slug}`}
                      style={{ display: "block", marginTop: 10, fontSize: 12, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                      Read full review &rarr;
                    </a>
                  )}
                  {heroIdx === 0 && (
                    <div style={{ marginTop: 16 }}>
                      <button onClick={() => setShowDisclaimer(d => !d)}
                        style={{ fontSize: 11, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {showDisclaimer ? "Hide disclaimer" : "Disclaimer"}
                      </button>
                      {showDisclaimer && (
                        <p style={{ fontSize: 11, color: "#bbb", lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
                          Information shown is for planning purposes only. Bonus terms and fees are set by the bank and may change. Always confirm details with the institution before applying.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* ══════════════════════════════════════════════════════════════════
                 CURRENTLY WORKING ON — Checklist cards
                 Supports single or multiple active bonuses
                 ══════════════════════════════════════════════════════════════════ */}
            {(() => {
              const rawActive = inProgress
              // Filter out kept-open bonuses, sort posted ones to bottom
              const activeBonuses = [...rawActive]
                .filter(({ bonus: b }) => !keptOpen.includes(b.id))
                .sort((a, b) => {
                const recA = completedRecords.find(r => r.bonus_id === a.bonus.id && !r.closed_date)
                const recB = completedRecords.find(r => r.bonus_id === b.bonus.id && !r.closed_date)
                const aPosted = recA ? getMilestoneDetail(a.bonus, recA, profile.pay_frequency, profile.paycheck_amount).bonusPosted : false
                const bPosted = recB ? getMilestoneDetail(b.bonus, recB, profile.pay_frequency, profile.paycheck_amount).bonusPosted : false
                if (aPosted && !bPosted) return 1
                if (!aPosted && bPosted) return -1
                return 0
              })
              if (activeBonuses.length === 0 && activeCustom.length === 0) return null

              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Currently working on</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {activeCustom.map(c => {
                      const windowDays = c.deposit_window_days ?? c.holding_period_days ?? 56
                      const openedDate = new Date(c.opened_date + "T00:00:00")
                      const todayD = new Date(); todayD.setHours(0, 0, 0, 0)
                      const daysSinceOpen = Math.floor((todayD.getTime() - openedDate.getTime()) / 86400000)
                      const daysRemaining = Math.max(0, windowDays - daysSinceOpen)

                      // Step state derived from current_step
                      const accountOpened = c.current_step !== null
                      const requirementsMet = c.current_step === "requirements_met" || c.current_step === "bonus_posted"
                      const bonusPosted = c.current_step === "bonus_posted"

                      type CustomStep = { key: string; label: string; done: boolean }
                      const customSteps: CustomStep[] = [
                        { key: "account_opened", label: "Account Opened", done: accountOpened },
                        ...(c.dd_required ? [{ key: "requirements_met", label: "Deposit Requirement Met", done: requirementsMet }] : []),
                        { key: "bonus_posted", label: "Bonus Posted", done: bonusPosted },
                      ]
                      const firstUndone = customSteps.find(s => !s.done)

                      async function advanceCustomStep(key: string) {
                        await updateCustomBonus(c.id, { current_step: key })
                        setCustomBonuses(prev => prev.map(x => x.id === c.id ? { ...x, current_step: key } : x))
                      }
                      async function undoCustomStep() {
                        const order = ["account_opened", ...(c.dd_required ? ["requirements_met"] : []), "bonus_posted"]
                        const idx = order.indexOf(c.current_step ?? "")
                        const prev = idx > 0 ? order[idx - 1] : null
                        await updateCustomBonus(c.id, { current_step: prev })
                        setCustomBonuses(prev2 => prev2.map(x => x.id === c.id ? { ...x, current_step: prev } : x))
                      }

                      // Deposit tracking
                      const customDeposits = deposits.filter(d => d.bonus_id === c.id)
                      const depositedSoFar = customDeposits.reduce((s, d) => s + d.amount, 0)
                      const totalRequired = c.min_dd_total ?? 0

                      return (
                        <div key={c.id} style={{
                          background: "#fff",
                          border: bonusPosted ? "1px solid #e0e0e0" : "2px solid #7c3aed",
                          borderRadius: 14, overflow: "hidden",
                          boxShadow: bonusPosted ? "none" : "0 2px 12px rgba(124,58,237,0.05)",
                        }}>
                          {/* Header */}
                          <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                              <span style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{c.bank_name}</span>
                              <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Custom</span>
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(c.bonus_amount)}</span>
                          </div>

                          {/* Checklist */}
                          <div style={{ padding: "16px 24px 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#999" }}>Steps to unlock {money(c.bonus_amount)}</div>
                              {c.current_step !== null && (
                                <button onClick={undoCustomStep}
                                  style={{ fontSize: 11, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                                  Undo
                                </button>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {customSteps.map(step => {
                                const isActive = firstUndone?.key === step.key
                                return (
                                  <div key={step.key}
                                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: step.done ? "default" : "pointer", borderRadius: 6 }}
                                    onClick={() => { if (!step.done) advanceCustomStep(step.key) }}>
                                    <div style={{
                                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                      border: step.done ? "none" : `2px solid ${isActive ? "#7c3aed" : "#d4d4d4"}`,
                                      background: step.done ? "#0d7c5f" : "transparent",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      {step.done && (
                                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                          <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: 14,
                                      color: step.done ? "#888" : isActive ? "#111" : "#bbb",
                                      fontWeight: isActive ? 600 : 400,
                                      textDecoration: step.done ? "line-through" : "none",
                                    }}>
                                      {step.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Deposit tracking */}
                          {c.dd_required && totalRequired > 0 && (
                            <div style={{ padding: "12px 24px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: "#888" }}>
                                  Deposits — ${depositedSoFar.toLocaleString()} of ${totalRequired.toLocaleString()}
                                </span>
                                <button onClick={() => { setAddingDeposit(addingDeposit === c.id ? null : c.id); setNewDepositAmt(String(profile.paycheck_amount)); setNewDepositDate(todayStr()) }}
                                  style={{ fontSize: 18, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "0 4px", fontWeight: 400, lineHeight: 1 }}>
                                  +
                                </button>
                              </div>
                              <div style={{ height: 4, background: "#e8e8e8", borderRadius: 2, overflow: "hidden", marginBottom: customDeposits.length > 0 ? 8 : 0 }}>
                                <div style={{
                                  height: "100%", borderRadius: 2, background: "#0d7c5f",
                                  width: `${Math.min(100, (depositedSoFar / totalRequired) * 100)}%`,
                                  transition: "width 0.3s ease",
                                }} />
                              </div>
                              {customDeposits.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
                                  {customDeposits.map(d => (
                                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                      <span style={{ color: "#888" }}>{fmtShortDate(d.deposit_date)}</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ color: "#111", fontWeight: 500 }}>${d.amount.toLocaleString()}</span>
                                        <button onClick={() => handleDeleteDeposit(d.id)}
                                          style={{ fontSize: 10, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {addingDeposit === c.id && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                                  <div style={{ position: "relative", flex: 1 }}>
                                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
                                    <input type="number" value={newDepositAmt} onChange={e => setNewDepositAmt(e.target.value)}
                                      style={{ width: "100%", padding: "6px 8px 6px 22px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, outline: "none", boxSizing: "border-box" as const }}
                                      placeholder="Amount" />
                                  </div>
                                  <input type="date" value={newDepositDate} onChange={e => setNewDepositDate(e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6, outline: "none", color: "#666" }} />
                                  <button onClick={() => handleAddDeposit(c.id)}
                                    style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                                    Add
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Urgency */}
                          {!bonusPosted && windowDays > 0 && (
                            <div style={{
                              padding: "10px 24px 0", fontSize: 12,
                              color: daysRemaining <= 14 ? "#dc2626" : daysRemaining <= 30 ? "#d97706" : "#999",
                              fontWeight: daysRemaining <= 30 ? 600 : 400,
                            }}>
                              {daysRemaining > 0 ? `${daysRemaining} days remaining to complete` : "Window may have passed"}
                            </div>
                          )}

                          {/* Actions */}
                          {bonusPosted && (
                            <div style={{ padding: "16px 24px 0" }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <button onClick={() => { setActionCustom({ bonus: c, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(c.bonus_amount)) }}
                                  style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                  Mark account closed
                                </button>
                                <button onClick={() => handleCustomKeptOpen(c.id)}
                                  style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>
                                  Keep open
                                </button>
                                <div style={{ fontSize: 12, color: "#999", flex: "1 1 100%", marginTop: 4 }}>
                                  Closing the account starts your cooldown period for this bonus.
                                </div>
                              </div>
                            </div>
                          )}
                          {!bonusPosted && (
                            <div style={{ padding: "14px 24px 0" }}>
                              <button onClick={() => { setActionCustom({ bonus: c, mode: "close" }); setActionDate(todayStr()); setBonusReceived(false); setActualAmount("") }}
                                style={{ fontSize: 12, color: "#bbb", background: "none", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer", padding: "8px 16px" }}>
                                Mark as closed
                              </button>
                            </div>
                          )}

                          {/* Edit / Remove */}
                          <div style={{ padding: "8px 24px 16px", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button onClick={() => handleOpenEditCustom(c)}
                              style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                              Edit
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {activeBonuses.map(({ bonus: b, churnStatus }) => {
                      const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)
                      if (!record) return null
                      const milestoneDetail = getMilestoneDetail(b, record, profile.pay_frequency, profile.paycheck_amount)
                      const req = b.requirements
                      const fees = b.fees

                      // Deposit math
                      const totalRequired = req?.min_direct_deposit_total ?? 0
                      const openedDate = new Date(record.opened_date + "T00:00:00")
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const daysSinceOpen = Math.floor((today.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24))
                      const windowDays = req?.deposit_window_days ?? 90
                      const daysRemaining = Math.max(0, windowDays - daysSinceOpen)
                      const bonusDeposits = deposits.filter(d => d.bonus_id === b.id)
                      const depositedSoFar = bonusDeposits.reduce((s, d) => s + d.amount, 0)

                      const isDetailsExpanded = expandedDetails === b.id

                      // Fee avoidance info
                      const hasFee = fees?.monthly_fee && fees.monthly_fee > 0
                      const feeWaiverText = fees?.monthly_fee_waiver_text ?? null

                      return (
                        <div key={b.id} style={{
                          background: "#fff",
                          border: milestoneDetail.bonusPosted ? "1px solid #e0e0e0" : "2px solid #2563eb",
                          borderRadius: 14, overflow: "hidden",
                          boxShadow: milestoneDetail.bonusPosted ? "none" : "0 2px 12px rgba(37,99,235,0.05)",
                        }}>
                          {/* ── Header: Bank + Amount ── */}
                          <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{b.bank_name}</div>
                              {(b as any).expired && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 8px" }}>Expired</span>
                              )}
                              {bestLink(b.source_links) && (
                                <a href={bestLink(b.source_links)!} target="_blank" rel="noreferrer"
                                  style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                                  View offer
                                </a>
                              )}
                              {getPostByBonusId(b.id) && (
                                <a href={`/blog/${getPostByBonusId(b.id)!.slug}`}
                                  style={{ fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 500 }}>
                                  Read review
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                          </div>

                          {/* ── Checklist ── */}
                          <div style={{ padding: "16px 24px 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#999" }}>Steps to unlock {money(b.bonus_amount)}</div>
                              {/* Undo: go back one step */}
                              {milestoneDetail.currentMilestone !== "account_opened" && (
                                <button onClick={() => {
                                  const stepOrder: MilestoneKey[] = ["account_opened", "dd_confirmed", "deposit_met", "bonus_posted", "safe_to_close"]
                                  const currentIdx = stepOrder.indexOf(milestoneDetail.currentMilestone)
                                  if (currentIdx > 0) {
                                    handleMilestoneOverride(b.id, stepOrder[currentIdx - 1])
                                  }
                                }}
                                  style={{ fontSize: 11, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                                  Undo
                                </button>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {milestoneDetail.milestones
                                .filter((m) => m.key !== "safe_to_close")
                                .map((m) => {
                                const isCompleted = m.status === "completed"
                                const isActive = m.status === "active"

                                const handleCheck = () => {
                                  if (isCompleted) return
                                  if (m.key === "bonus_posted") {
                                    handleMilestoneOverride(b.id, "safe_to_close")
                                    handleMarkBonusReceived(b.id, b.bonus_amount)
                                    return
                                  }
                                  // dd_confirmed is now a real user-visible step —
                                  // the "Set up recurring direct deposit" action.
                                  const progression: MilestoneKey[] = [
                                    "account_opened",
                                    "dd_confirmed",
                                    "deposit_met",
                                    "bonus_posted",
                                  ]
                                  const clickedIdx = progression.indexOf(m.key as MilestoneKey)
                                  if (clickedIdx >= 0 && clickedIdx < progression.length - 1) {
                                    handleMilestoneOverride(b.id, progression[clickedIdx + 1])
                                  }
                                }

                                return (
                                  <div key={m.key}
                                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: isCompleted ? "default" : "pointer", borderRadius: 6 }}
                                    onClick={handleCheck}>
                                    <div style={{
                                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                      border: isCompleted ? "none" : `2px solid ${isActive ? "#2563eb" : "#d4d4d4"}`,
                                      background: isCompleted ? "#0d7c5f" : "transparent",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      {isCompleted && (
                                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                          <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: 14,
                                      color: isCompleted ? "#888" : isActive ? "#111" : "#bbb",
                                      fontWeight: isActive ? 600 : 400,
                                      textDecoration: isCompleted ? "line-through" : "none",
                                    }}>
                                      {m.label}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* ── Deposits ── */}
                          {totalRequired > 0 && !milestoneDetail.bonusPosted && (
                            <div style={{ padding: "12px 24px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#999" }}>
                                  Deposits — ${depositedSoFar.toLocaleString()} of ${totalRequired.toLocaleString()}
                                </span>
                                <button onClick={() => { setAddingDeposit(addingDeposit === b.id ? null : b.id); setNewDepositAmt(String(profile.paycheck_amount)); setNewDepositDate(todayStr()) }}
                                  style={{ fontSize: 18, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "0 4px", fontWeight: 400, lineHeight: 1 }}>
                                  +
                                </button>
                              </div>
                              {/* Progress bar */}
                              <div style={{ height: 4, background: "#e8e8e8", borderRadius: 2, overflow: "hidden", marginBottom: bonusDeposits.length > 0 ? 8 : 0 }}>
                                <div style={{
                                  height: "100%", borderRadius: 2, background: "#0d7c5f",
                                  width: `${totalRequired > 0 ? Math.min(100, (depositedSoFar / totalRequired) * 100) : 0}%`,
                                  transition: "width 0.3s ease",
                                }} />
                              </div>
                              {/* Deposit entries */}
                              {bonusDeposits.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {bonusDeposits.map((d) => (
                                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                      <span style={{ color: "#888" }}>{fmtShortDate(d.deposit_date)}</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ color: "#111", fontWeight: 500 }}>${d.amount.toLocaleString()}</span>
                                        <button onClick={() => handleDeleteDeposit(d.id)}
                                          style={{ fontSize: 10, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Inline add form */}
                              {addingDeposit === b.id && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                                  <div style={{ position: "relative", flex: 1 }}>
                                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
                                    <input type="number" value={newDepositAmt} onChange={e => setNewDepositAmt(e.target.value)}
                                      style={{ width: "100%", padding: "6px 8px 6px 22px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, outline: "none", boxSizing: "border-box" as const }}
                                      placeholder="Amount" />
                                  </div>
                                  <input type="date" value={newDepositDate} onChange={e => setNewDepositDate(e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6, outline: "none", color: "#666" }} />
                                  <button onClick={() => handleAddDeposit(b.id)}
                                    style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                                    Add
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Transaction requirement ── */}
                          {!milestoneDetail.bonusPosted && req?.debit_transactions_required > 0 && (
                            <div style={{ padding: "10px 24px 0", fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
                              Also required: {req.debit_transactions_required} qualifying transactions within {windowDays || "the"} {windowDays ? "days" : "qualification window"}
                            </div>
                          )}

                          {/* ── Urgency ── */}
                          {!milestoneDetail.bonusPosted && windowDays > 0 && (
                            <div style={{
                              padding: "10px 24px 0",
                              fontSize: 12,
                              color: daysRemaining <= 14 ? "#dc2626" : daysRemaining <= 30 ? "#d97706" : "#999",
                              fontWeight: daysRemaining <= 30 ? 600 : 400,
                            }}>
                              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining to complete
                            </div>
                          )}

                          {/* ── Actions ── */}
                          {milestoneDetail.bonusPosted && !keptOpen.includes(b.id) && (
                            <div style={{ padding: "16px 24px 0" }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                                  style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                  Mark account closed
                                </button>
                                <button onClick={async () => {
                                  const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)
                                  if (record) await markKeptOpen(record.id, true)
                                  setKeptOpen(prev => [...prev, b.id])
                                }}
                                  style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>
                                  Keep open
                                </button>
                                <div style={{ fontSize: 12, color: "#999", flex: "1 1 100%", marginTop: 4 }}>
                                  Closing the account starts your cooldown period for this bonus.
                                </div>
                              </div>
                            </div>
                          )}
                          {!milestoneDetail.bonusPosted && (
                            <div style={{ padding: "14px 24px 0" }}>
                              <button onClick={() => {
                                const ecf = b.fees?.early_closure_fee ?? 0
                                const holdDays = b.timeline?.must_remain_open_days
                                let msg = "Are you sure you want to close this account before the bonus posts?"
                                if (ecf > 0) msg += `\n\nWarning: There is a $${ecf} early closure fee.`
                                if (holdDays) msg += `\n\nThe account should remain open for ${holdDays} days.`
                                if (!confirm(msg)) return
                                setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(false); setActualAmount("")
                              }}
                                style={{ fontSize: 12, color: "#bbb", background: "none", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer", padding: "8px 16px" }}>
                                Mark as closed
                              </button>
                            </div>
                          )}

                          {/* ── Fees & how to avoid (expandable) ── */}
                          <div style={{ padding: "10px 24px 0" }}>
                            <button onClick={() => setExpandedFees(expandedFees === b.id ? null : b.id)}
                              style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 9, color: "#999" }}>{expandedFees === b.id ? "▲" : "▼"}</span>
                              Fees &amp; how to avoid
                            </button>
                            {expandedFees === b.id && (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
                                {hasFee ? (
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>Monthly fee: ${fees.monthly_fee}/month</div>
                                    {feeWaiverText && (
                                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{feeWaiverText}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600 }}>No monthly fee</div>
                                )}
                                {fees?.early_closure_fee > 0 && (
                                  <div style={{ fontSize: 12, color: "#d97706" }}>Early closure fee: ${fees.early_closure_fee} — keep the account open until the holding period ends.</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── What counts as direct deposit (expandable) ── */}
                          {(() => {
                            const ddMethods = blogContent[b.id]?.ddMethods
                            if (!ddMethods || ddMethods.length === 0) return null
                            const isOpen = expandedDD === b.id
                            return (
                              <div style={{ padding: "10px 24px 0" }}>
                                <button onClick={() => setExpandedDD(isOpen ? null : b.id)}
                                  style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ fontSize: 9, color: "#999" }}>{isOpen ? "▲" : "▼"}</span>
                                  What counts as direct deposit
                                </button>
                                {isOpen && (
                                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, paddingBottom: 4 }}>
                                    {ddMethods.map((dd, i) => (
                                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                        <span style={{
                                          fontSize: 10, fontWeight: 700, lineHeight: "17px", flexShrink: 0,
                                          color: dd.works === true ? "#0d7c5f" : dd.works === "mixed" ? "#d97706" : "#ef4444",
                                        }}>
                                          {dd.works === true ? "YES" : dd.works === "mixed" ? "MAYBE" : "NO"}
                                        </span>
                                        <div>
                                          <span style={{ fontSize: 12, color: "#333" }}>{dd.method}</span>
                                          {dd.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{dd.notes}</div>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* ── Bonus details (expandable) ── */}
                          <div style={{ padding: "10px 24px 4px" }}>
                            <button
                              onClick={() => setExpandedDetails(isDetailsExpanded ? null : b.id)}
                              style={{ fontSize: 12, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                              {isDetailsExpanded ? "Hide details" : "Bonus details"}
                            </button>
                          </div>

                          {isDetailsExpanded && (
                            <div style={{ padding: "0 24px 8px", marginTop: 4 }}>
                              {/* Fee avoidance */}
                              {hasFee && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>Avoid monthly fee</div>
                                  {feeWaiverText ? (
                                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{feeWaiverText}</div>
                                  ) : (
                                    <div style={{ fontSize: 12, color: "#666" }}>${fees.monthly_fee}/month fee applies</div>
                                  )}
                                </div>
                              )}
                              {!hasFee && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f" }}>No monthly fee</div>
                                </div>
                              )}

                              {/* Qualification window */}
                              {windowDays > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>Qualification window</div>
                                  <div style={{ fontSize: 12, color: "#666" }}>Complete within {windowDays} days of account opening.</div>
                                </div>
                              )}

                              {/* Other requirements */}
                              {req?.other_requirements_text && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>Requirements</div>
                                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{req.other_requirements_text}</div>
                                </div>
                              )}

                              {/* Eligibility notes */}
                              {b.eligibility?.eligibility_notes && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 4 }}>Eligibility</div>
                                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{b.eligibility.eligibility_notes}</div>
                                </div>
                              )}

                              {/* Screening */}
                              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#999" }}>
                                {b.screening?.chex_sensitive && <span>ChexSystems: {b.screening.chex_sensitive}</span>}
                                {b.screening?.hard_pull !== null && b.screening?.hard_pull !== undefined && <span>Hard pull: {b.screening.hard_pull ? "Yes" : "No"}</span>}
                              </div>

                              <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>Requirements are set by the bank and may change.</div>

                              {/* Notes */}
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Your notes</div>
                                  {editingNote !== b.id && (
                                    <button onClick={() => { setEditingNote(b.id); setNoteText(bonusNotes[b.id] ?? "") }}
                                      style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                      {bonusNotes[b.id] ? "Edit" : "Add note"}
                                    </button>
                                  )}
                                </div>
                                {editingNote === b.id ? (
                                  <div>
                                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                                      placeholder="Add a reminder, tracking info, or anything useful..."
                                      style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: "1px solid #ddd", borderRadius: 6, resize: "vertical", minHeight: 50, boxSizing: "border-box" as const, fontFamily: "inherit", color: "#333" }} />
                                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                      <button onClick={() => handleSaveNote(b.id)}
                                        style={{ fontSize: 11, padding: "4px 12px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Save</button>
                                      <button onClick={() => setEditingNote(null)}
                                        style={{ fontSize: 11, padding: "4px 12px", background: "none", color: "#999", border: "1px solid #e0e0e0", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : bonusNotes[b.id] ? (
                                  <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{bonusNotes[b.id]}</div>
                                ) : (
                                  <div style={{ fontSize: 11, color: "#ccc" }}>No notes yet</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── Remove ── */}
                          <div style={{ padding: "8px 24px 16px", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => handleDelete(b.id)}
                              style={{ fontSize: 11, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}

                  </div>
                </div>
              )
            })()}

            {/* ── Available next ── */}
            {queueItems.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Available next</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {queueItems.map((q, i) => {
                    if (q.kind === "custom") {
                      const c = q.bonus
                      const payCycles = q.weeksToComplete ? Math.ceil(q.weeksToComplete / 2) : null
                      return (
                        <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.bank_name}</span>
                                <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Custom</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                                {payCycles ? `Complete in ~${payCycles} pay cycle${payCycles > 1 ? "s" : ""}` : (c.notes || "Custom bonus")}
                              </div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>{money(c.bonus_amount)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => openStartCustomModal(c)}
                              style={{ fontSize: 12, padding: "6px 14px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Start now</button>
                            <button onClick={async () => { await updateCustomBonus(c.id, { current_step: "skipped" }); setCustomBonuses(prev => prev.map(x => x.id === c.id ? { ...x, current_step: "skipped" } : x)) }}
                              style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 8, cursor: "pointer" }}>Not now</button>
                          </div>
                        </div>
                      )
                    }
                    // Standard bonus
                    const b = q.bonus
                    const weeksUntil = i === 0 ? (currentBonus?.weeksToComplete ?? 0) : (currentBonus?.weeksToComplete ?? 0) + (queueItems[0]?.kind === "standard" ? (queueItems[0].weeksToComplete ?? 0) : 0)
                    return (
                      <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{b.bank_name}</div>
                            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                              Eligible in ~{weeksUntil} weeks
                              {q.velocity ? <span style={{ color: "#0d7c5f", marginLeft: 8 }}>${Math.round(q.velocity)}/wk</span> : null}
                            </div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <button onClick={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                            style={{ fontSize: 12, padding: "6px 14px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Start now</button>
                          <button onClick={() => handleSkip(b.id)}
                            style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 8, cursor: "pointer" }}>Not now</button>
                          {getPostByBonusId(b.id) && (
                            <a href={`/blog/${getPostByBonusId(b.id)!.slug}`}
                              style={{ marginLeft: "auto", fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                              Read review &rarr;
                            </a>
                          )}
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f5f5f5" }}>
                          <button onClick={() => setExpandedFees(expandedFees === b.id ? null : b.id)}
                            style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9, color: "#999" }}>{expandedFees === b.id ? "▲" : "▼"}</span>
                            Fees &amp; how to avoid
                          </button>
                          {expandedFees === b.id && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                              {b.fees?.monthly_fee && b.fees.monthly_fee > 0 ? (
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>Monthly fee: ${b.fees.monthly_fee}/month</div>
                                  {b.fees.monthly_fee_waiver_text && (
                                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{b.fees.monthly_fee_waiver_text}</div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600 }}>No monthly fee</div>
                              )}
                              {b.fees?.early_closure_fee > 0 && (
                                <div style={{ fontSize: 12, color: "#d97706" }}>Early closure fee: ${b.fees.early_closure_fee} — keep the account open until the holding period ends.</div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* DD methods dropdown */}
                        {(() => {
                          const ddMethods = blogContent[b.id]?.ddMethods
                          if (!ddMethods || ddMethods.length === 0) return null
                          const isOpen = expandedDD === b.id
                          return (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f5f5f5" }}>
                              <button onClick={() => setExpandedDD(isOpen ? null : b.id)}
                                style={{ fontSize: 12, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 9, color: "#999" }}>{isOpen ? "▲" : "▼"}</span>
                                What counts as direct deposit
                              </button>
                              {isOpen && (
                                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                                  {ddMethods.map((dd, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, lineHeight: "17px", flexShrink: 0,
                                        color: dd.works === true ? "#0d7c5f" : dd.works === "mixed" ? "#d97706" : "#ef4444",
                                      }}>
                                        {dd.works === true ? "YES" : dd.works === "mixed" ? "MAYBE" : "NO"}
                                      </span>
                                      <div>
                                        <span style={{ fontSize: 12, color: "#333" }}>{dd.method}</span>
                                        {dd.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{dd.notes}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Accounts open (kept open + standalone accounts) ── */}
            {(() => {
              const keptOpenRecords = inProgress.filter(({ bonus: b }) => keptOpen.includes(b.id) && (() => {
                const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)
                if (!record) return false
                const md = getMilestoneDetail(b, record, profile.pay_frequency, profile.paycheck_amount)
                return md.bonusPosted
              })())
              if (keptOpenRecords.length === 0 && openAccounts.length === 0 && customKeptOpen.length === 0) return null
              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accounts open</div>
                    <button onClick={() => setShowAddOpenAccount(true)}
                      style={{ fontSize: 12, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                      + Add existing account
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {keptOpenRecords.map(({ bonus: b }) => (
                      <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{b.bank_name}</div>
                              <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600 }}>+{money(b.bonus_amount)} earned</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Account still open · Close to become eligible again</div>
                          </div>
                          <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                            style={{ fontSize: 12, padding: "6px 14px", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
                            Close account
                          </button>
                        </div>
                      </div>
                    ))}
                    {customKeptOpen.map(c => (
                      <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.bank_name}</div>
                              <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                              <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 600 }}>+{money(c.bonus_amount)} earned</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Account still open · Close to become eligible again</div>
                          </div>
                          <button onClick={() => { setActionCustom({ bonus: c, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(c.bonus_amount)) }}
                            style={{ fontSize: 12, padding: "6px 14px", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
                            Close account
                          </button>
                        </div>
                      </div>
                    ))}
                    {openAccounts.map(acct => (
                      <div key={acct.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{acct.bank_name}</div>
                            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                              {acct.opened_date ? `Opened ${fmtShortDate(acct.opened_date)}` : "Account open"}
                              {acct.notes ? ` · ${acct.notes}` : ""}
                            </div>
                          </div>
                          <button onClick={async () => { await deleteOpenAccount(acct.id); await loadRecords() }}
                            style={{ fontSize: 12, padding: "6px 14px", background: "transparent", color: "#bbb", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer" }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Cooldown ── */}
            {(inCooldown.length > 0 || customInCooldown.length > 0) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Cooling down</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {inCooldown.map(({ bonus: b, churnStatus }) => {
                    const s = churnStatus as Extract<ChurnStatus, { status: "in_cooldown" }>
                    return (
                      <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", minWidth: 180 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 12, color: "#d97706", marginTop: 3 }}>{s.days_remaining} days left</div>
                      </div>
                    )
                  })}
                  {customInCooldown.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                        <span style={{ fontSize: 9, color: "#999", background: "#f0f0f0", padding: "1px 6px", borderRadius: 99 }}>Custom</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#d97706", marginTop: 3 }}>{c.days_remaining} days left</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Skipped bonuses ── */}
            {(skippedBonuses.length > 0 || customSkipped.length > 0) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Skipped</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {skippedBonuses.map(({ bonus: b }) => (
                    <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", minWidth: 180, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{money(b.bonus_amount)}</div>
                      </div>
                      <button onClick={() => handleUnskip(b.id)}
                        style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                        Restore
                      </button>
                    </div>
                  ))}
                  {customSkipped.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", minWidth: 180, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                          <span style={{ fontSize: 9, color: "#999", background: "#f0f0f0", padding: "1px 6px", borderRadius: 99 }}>Custom</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{money(c.bonus_amount)}</div>
                      </div>
                      <button onClick={() => handleCustomUnskip(c.id)}
                        style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Earnings History ── */}
            {allClosed.length > 0 && (
              <details style={{ marginBottom: 24 }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Earnings history ({allClosed.length})</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {allClosed.sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime()).map(r => {
                    const bonus = allBonuses.find(b => b.id === r.bonus_id)
                    if (!bonus) return null
                    return (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{bonus.bank_name} <span style={{ fontSize: 11, color: "#bbb" }}>{fmtShortDate(r.closed_date!)}</span></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0d7c5f" }}>{money(r.actual_amount ?? bonus.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* ── Custom Bonuses (all — manage from here) ── */}
            {customBonuses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Custom bonuses</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {customBonuses.filter(c => !c.closed_date).map(c => {
                    const statusLabel = c.current_step === "pending" ? "In queue" : c.current_step === "skipped" ? "Skipped" : c.current_step === "kept_open" ? "Account open" : "In progress"
                    const statusColor = c.current_step === "pending" ? "#999" : c.current_step === "skipped" ? "#bbb" : "#7c3aed"
                    return (
                      <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                              <span style={{ fontSize: 10, color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Custom</span>
                            </div>
                            <div style={{ fontSize: 11, marginTop: 2, color: statusColor }}>{statusLabel} · {money(c.bonus_amount)}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => { setEditingCustom(c); setCustomBank(c.bank_name); setCustomAmount(String(c.bonus_amount)); setCustomDate(c.opened_date); setCustomNotes(c.notes ?? ""); setCustomChurnable(c.cooldown_months != null); setCustomCooldown(String(c.cooldown_months ?? 12)); setCustomDdRequired(c.dd_required ?? false); setCustomMinDdTotal(c.min_dd_total ? String(c.min_dd_total) : ""); setCustomMinDdPerDeposit(c.min_dd_per_deposit ? String(c.min_dd_per_deposit) : ""); setCustomDdCount(c.dd_count_required ? String(c.dd_count_required) : ""); setCustomDepositWindow(c.deposit_window_days ? String(c.deposit_window_days) : ""); setCustomHoldingPeriod(c.holding_period_days ? String(c.holding_period_days) : "") }}
                              style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#555", background: "none", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                            <button onClick={() => handleDeleteCustom(c.id)}
                              style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 6, cursor: "pointer" }}>Remove</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {closedCustom.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 20px", opacity: 0.6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                            <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 7px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Closed {fmtShortDate(c.closed_date!)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {c.bonus_received ? (
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#0d7c5f" }}>{money(c.actual_amount ?? c.bonus_amount)}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#999" }}>Not received</span>
                          )}
                          <button onClick={() => handleDeleteCustom(c.id)}
                            style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 6, cursor: "pointer" }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Bottom links ── */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => setShowAddCustom(true)}
                style={{ fontSize: 13, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                + Add custom bonus
              </button>
              <span style={{ color: "#e0e0e0" }}>|</span>
              <button onClick={() => setShowAddOpenAccount(true)}
                style={{ fontSize: 13, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                + Add open account
              </button>
              <span style={{ color: "#e0e0e0" }}>|</span>
              <button onClick={() => setShowAdvanced(a => !a)}
                style={{ fontSize: 13, color: "#999", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {showAdvanced ? "Hide full plan" : "View full bonus plan"}
              </button>
            </div>

            {showAdvanced && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {[...inProgress, ...available].map(({ bonus: b, velocity, weeksToComplete, feasible, churnStatus }) => {
                  const isActive = churnStatus.status === "in_progress"
                  const link = bestLink(b.source_links)
                  const isExpanded = expandedCard === b.id
                  return (
                    <div key={b.id} style={{
                      background: "#fff", border: isActive ? "1px solid #bfdbfe" : "1px solid #e8e8e8",
                      borderRadius: 12, padding: "18px 20px", opacity: feasible !== false ? 1 : 0.4,
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                      onClick={() => setExpandedCard(isExpanded ? null : b.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                          {isActive && <div style={{ fontSize: 11, color: "#2563eb", marginTop: 2 }}>Active</div>}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12 }}>
                        <span><span style={{ color: "#bbb" }}>Time </span><span style={{ color: "#666" }}>{weeksToComplete ? `${weeksToComplete}w` : "\u2014"}</span></span>
                        <span><span style={{ color: "#bbb" }}>Fee </span><span style={{ color: "#666" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></span>
                        {velocity && <span><span style={{ color: "#bbb" }}>$/wk </span><span style={{ color: "#0d7c5f" }}>${velocity.toFixed(0)}</span></span>}
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f0f0" }} onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6, marginBottom: 10 }}>
                            {b.requirements?.min_direct_deposit_total
                              ? `Deposit $${b.requirements.min_direct_deposit_total.toLocaleString()} within ${b.requirements.deposit_window_days ?? "\u2014"} days.`
                              : b.requirements?.min_direct_deposit_per_deposit
                                ? `${b.requirements.dd_count_required ?? "1"}\u00d7 deposits of $${b.requirements.min_direct_deposit_per_deposit.toLocaleString()}+`
                                : "Set up direct deposit."}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 10 }}>
                            <div><span style={{ color: "#bbb" }}>Window: </span><span style={{ color: "#666" }}>{numOrDash(b.requirements?.deposit_window_days, "days")}</span></div>
                            <div><span style={{ color: "#bbb" }}>Bonus posts: </span><span style={{ color: "#666" }}>{numOrDash(b.timeline?.bonus_posting_days_est, "days")}</span></div>
                            <div><span style={{ color: "#bbb" }}>Cooldown: </span><span style={{ color: "#666" }}>{(b as any).cooldown_months == null ? "One-time" : `${(b as any).cooldown_months}mo`}</span></div>
                            <div><span style={{ color: "#bbb" }}>Fee: </span><span style={{ color: "#666" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
                            <div><span style={{ color: "#bbb" }}>Keep open: </span><span style={{ color: "#666" }}>{numOrDash(b.timeline?.must_remain_open_days, "days")}</span></div>
                            <div><span style={{ color: b.fees?.early_closure_fee > 0 ? "#d97706" : "#bbb" }}>Closure fee: </span><span style={{ color: b.fees?.early_closure_fee > 0 ? "#d97706" : "#666", fontWeight: b.fees?.early_closure_fee > 0 ? 600 : 400 }}>{b.fees?.early_closure_fee > 0 ? `$${b.fees.early_closure_fee}` : "$0"}</span></div>
                            {b.requirements?.min_opening_deposit > 0 && (
                              <div><span style={{ color: "#bbb" }}>Min to open: </span><span style={{ color: "#666" }}>${b.requirements.min_opening_deposit}</span></div>
                            )}
                            {b.requirements?.min_balance > 0 && (
                              <div><span style={{ color: "#d97706" }}>Min balance: </span><span style={{ color: "#d97706", fontWeight: 600 }}>${b.requirements.min_balance.toLocaleString()}</span></div>
                            )}
                          </div>
                          <details><summary style={{ fontSize: 11, color: "#bbb", cursor: "pointer" }}>Advanced details</summary>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginTop: 8 }}>
                              <div><span style={{ color: "#bbb" }}>Chex: </span><span style={{ color: "#666" }}>{textOrDash(b.screening?.chex_sensitive)}</span></div>
                              <div><span style={{ color: "#bbb" }}>Hard pull: </span><span style={{ color: "#666" }}>{yesNo(b.screening?.hard_pull)}</span></div>
                              <div><span style={{ color: "#bbb" }}>Lifetime: </span><span style={{ color: "#666" }}>{yesNo(b.eligibility?.lifetime_language)}</span></div>
                            </div>
                            {b.eligibility?.eligibility_notes && <div style={{ fontSize: 11, color: "#999", marginTop: 8, lineHeight: 1.5 }}>{b.eligibility.eligibility_notes}</div>}
                          </details>
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            {isActive ? (
                              <>
                                <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                                  style={{ flex: 1, padding: "8px", fontSize: 12, border: "1px solid #dc2626", color: "#dc2626", background: "none", borderRadius: 8, cursor: "pointer" }}>Close</button>
                                <button onClick={() => handleDelete(b.id)} style={{ padding: "8px 12px", fontSize: 12, border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 8, cursor: "pointer" }}>Remove</button>
                              </>
                            ) : (
                              <>
                                {link && <a href={link} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "8px", fontSize: 13, fontWeight: 600, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, textDecoration: "none", textAlign: "center" }}>Open account</a>}
                                <button onClick={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                                  style={{ padding: "8px 14px", fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer" }}>Already opened</button>
                              </>
                            )}
                          </div>
                          {getPostByBonusId(b.id) && (
                            <a href={`/blog/${getPostByBonusId(b.id)!.slug}`}
                              style={{ display: "block", marginTop: 10, fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                              Read full review &rarr;
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {[...pendingCustom, ...activeCustom].map(c => {
                  const cv = computeCustomVelocity(c, profile.pay_frequency, profile.paycheck_amount, extraSources)
                  const isActive = c.current_step !== "pending"
                  return (
                    <div key={c.id} style={{
                      background: "#fff", border: isActive ? "1px solid #ddd6fe" : "1px solid #e8e8e8",
                      borderRadius: 12, padding: "18px 20px",
                      opacity: cv.feasible ? 1 : 0.4,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", borderRadius: 4, padding: "1px 6px" }}>Custom</span>
                          </div>
                          {isActive && <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>Active</div>}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#0d7c5f" }}>{money(c.bonus_amount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12 }}>
                        {cv.weeksToComplete && <span><span style={{ color: "#bbb" }}>Time </span><span style={{ color: "#666" }}>{cv.weeksToComplete}w</span></span>}
                        {c.deposit_window_days && <span><span style={{ color: "#bbb" }}>Window </span><span style={{ color: "#666" }}>{c.deposit_window_days}d</span></span>}
                        {cv.velocity && <span><span style={{ color: "#bbb" }}>$/wk </span><span style={{ color: "#0d7c5f" }}>${cv.velocity.toFixed(0)}</span></span>}
                      </div>
                      {c.notes && <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>{c.notes}</div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {isActive ? (
                          <button onClick={() => { setActionCustom({ bonus: c, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(c.bonus_amount)) }}
                            style={{ flex: 1, padding: "8px", fontSize: 12, border: "1px solid #dc2626", color: "#dc2626", background: "none", borderRadius: 8, cursor: "pointer" }}>Close</button>
                        ) : (
                          <button onClick={() => openStartCustomModal(c)}
                            style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: 600, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Start now</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

        {/* ── Page disclaimer ── */}
        <div style={{ marginTop: 32, padding: "16px 0", borderTop: "1px solid #f0f0f0" }}>
          <p style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6, margin: 0 }}>
            Bonus offers, requirements, and fees are determined by the financial institution and may change at any time. Stacks OS aggregates publicly available information but cannot guarantee accuracy. Always verify the current terms directly with the bank before applying.
          </p>
        </div>
      </div>

      {/* Modal */}
      {actionBonus && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          {actionBonus.mode === "start" && (() => {
            const linked = getLinkedBonuses(actionBonus.bonus.id)
            // Only checking-kind linked bonuses can pass through the commit card
            // (savings entries route users to the savings module separately).
            const linkedChecking = linked
              .filter((lb) => lb.kind === "checking")
              .map((lb) => ({
                bonus: lb.entry,
                effective_amount: lb.effective_bonus_amount,
                note: lb.override_note,
              }))
            return (
              <BonusCommitCard
                bonus={actionBonus.bonus}
                profile={{
                  pay_frequency: profile.pay_frequency,
                  paycheck_amount: profile.paycheck_amount,
                  state: profile.state,
                }}
                openedDate={actionDate}
                onChangeOpenedDate={setActionDate}
                onConfirm={handleStart}
                onCancel={() => setActionBonus(null)}
                linkedBonuses={linkedChecking}
                onStartLinked={(id) => {
                  const lb = linkedChecking.find((x) => x.bonus.id === id)
                  if (lb) setActionBonus({ bonus: lb.bonus, mode: "start" })
                }}
              />
            )
          })()}
          {actionBonus.mode === "close" && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>{actionBonus.bonus.bank_name}</div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>When did you close this account?</div>
              <label style={modalLabel}>Account closed date</label>
              <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
                <input type="checkbox" id="bonusReceived" checked={bonusReceived} onChange={e => setBonusReceived(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                <label htmlFor="bonusReceived" style={{ fontSize: 13, color: "#666" }}>I received the bonus</label>
              </div>
              {bonusReceived && (
                <>
                  <label style={modalLabel}>Amount received</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                    <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} style={{ ...modalInput, paddingLeft: 24 }} placeholder={String(actionBonus.bonus.bonus_amount)} />
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Listed: ${actionBonus.bonus.bonus_amount.toLocaleString()}</div>
                </>
              )}
              <div style={modalActions}>
                <button onClick={() => setActionBonus(null)} style={cancelBtnLight}>Cancel</button>
                <button onClick={handleClose} style={confirmBtnLight}>Close Account</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Bonus Modal */}
      {showAddCustom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 420, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>Add Custom Bonus</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Track a bonus that isn't in our database yet.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={modalLabel}>Bank name</label>
                <input type="text" value={customBank} onChange={e => setCustomBank(e.target.value)} placeholder="e.g. Discover" style={modalInput} />
              </div>
              <div>
                <label style={modalLabel}>Bonus amount</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                  <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="200" style={{ ...modalInput, paddingLeft: 24 }} />
                </div>
              </div>
              {/* Direct deposit requirements */}
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" id="customDdRequired" checked={customDdRequired} onChange={e => setCustomDdRequired(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                  <label htmlFor="customDdRequired" style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>Requires direct deposit</label>
                </div>
                {customDdRequired && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Min total DD ($)</label>
                        <input type="number" value={customMinDdTotal} onChange={e => setCustomMinDdTotal(e.target.value)} placeholder="e.g. 500" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Min per deposit ($)</label>
                        <input type="number" value={customMinDdPerDeposit} onChange={e => setCustomMinDdPerDeposit(e.target.value)} placeholder="e.g. 200" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>DD count required</label>
                        <input type="number" value={customDdCount} onChange={e => setCustomDdCount(e.target.value)} placeholder="e.g. 2" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Deposit window (days)</label>
                        <input type="number" value={customDepositWindow} onChange={e => setCustomDepositWindow(e.target.value)} placeholder="e.g. 90" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Holding period */}
              <div>
                <label style={{ ...modalLabel, fontSize: 11 }}>Holding period after bonus posts (days, optional)</label>
                <input type="number" value={customHoldingPeriod} onChange={e => setCustomHoldingPeriod(e.target.value)} placeholder="e.g. 60" style={{ ...modalInput, padding: "6px 10px" }} />
              </div>

              <div>
                <label style={modalLabel}>Notes (optional)</label>
                <input type="text" value={customNotes} onChange={e => setCustomNotes(e.target.value)} placeholder="Any requirements or details" style={modalInput} />
              </div>

              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="customChurnable" checked={customChurnable} onChange={e => setCustomChurnable(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                  <label htmlFor="customChurnable" style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>This bonus is churnable (can be repeated)</label>
                </div>
                {customChurnable && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: 13, color: "#666" }}>Cooldown period:</label>
                    <input type="number" value={customCooldown} onChange={e => setCustomCooldown(e.target.value)}
                      style={{ ...modalInput, width: 70, padding: "6px 10px", textAlign: "center" as const }} min={1} />
                    <span style={{ fontSize: 13, color: "#666" }}>months</span>
                  </div>
                )}
              </div>
            </div>
            {addCustomError && (
              <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginTop: 12 }}>
                {addCustomError}
              </div>
            )}
            <div style={modalActions}>
              <button onClick={() => { setShowAddCustom(false); setCustomChurnable(false); setCustomCooldown("12"); setAddCustomError(null) }} style={cancelBtnLight}>Cancel</button>
              <button onClick={handleAddCustom} disabled={!customBank || !customAmount} style={{ ...confirmBtnLight, opacity: (!customBank || !customAmount) ? 0.5 : 1 }}>Add Bonus</button>
            </div>
          </div>
        </div>
      )}

      {/* Start / Close Custom Bonus Modal */}
      {actionCustom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>{actionCustom.bonus.bank_name}</div>
            {actionCustom.mode === "start" ? (
              <>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>When did you open this account?</div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={modalActions}>
                  <button onClick={() => setActionCustom(null)} style={cancelBtnLight}>Cancel</button>
                  <button onClick={handleConfirmStartCustom} style={confirmBtnLight}>Start Bonus</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>When did you close this account?</div>
                <label style={modalLabel}>Account closed date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
                  <input type="checkbox" id="customBonusReceived" checked={bonusReceived} onChange={e => setBonusReceived(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                  <label htmlFor="customBonusReceived" style={{ fontSize: 13, color: "#666" }}>I received the bonus</label>
                </div>
                {bonusReceived && (
                  <>
                    <label style={modalLabel}>Amount received</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                      <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} style={{ ...modalInput, paddingLeft: 24 }} placeholder={String(actionCustom.bonus.bonus_amount)} />
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Listed: ${actionCustom.bonus.bonus_amount.toLocaleString()}</div>
                  </>
                )}
                <div style={modalActions}>
                  <button onClick={() => setActionCustom(null)} style={cancelBtnLight}>Cancel</button>
                  <button onClick={handleCloseCustom} style={confirmBtnLight}>Close Account</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Custom Bonus Modal */}
      {editingCustom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 420, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", maxHeight: "90vh", overflowY: "auto" as const }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>Edit Custom Bonus</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>{editingCustom.bank_name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={modalLabel}>Bank name</label>
                <input type="text" value={customBank} onChange={e => setCustomBank(e.target.value)} style={modalInput} />
              </div>
              <div>
                <label style={modalLabel}>Bonus amount</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                  <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} style={{ ...modalInput, paddingLeft: 24 }} />
                </div>
              </div>
              <div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={modalInput} />
              </div>
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" id="editCustomDdRequired" checked={customDdRequired} onChange={e => setCustomDdRequired(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                  <label htmlFor="editCustomDdRequired" style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>Requires direct deposit</label>
                </div>
                {customDdRequired && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Min total DD ($)</label>
                        <input type="number" value={customMinDdTotal} onChange={e => setCustomMinDdTotal(e.target.value)} placeholder="e.g. 500" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Min per deposit ($)</label>
                        <input type="number" value={customMinDdPerDeposit} onChange={e => setCustomMinDdPerDeposit(e.target.value)} placeholder="e.g. 200" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>DD count required</label>
                        <input type="number" value={customDdCount} onChange={e => setCustomDdCount(e.target.value)} placeholder="e.g. 2" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...modalLabel, fontSize: 11 }}>Deposit window (days)</label>
                        <input type="number" value={customDepositWindow} onChange={e => setCustomDepositWindow(e.target.value)} placeholder="e.g. 90" style={{ ...modalInput, padding: "6px 10px" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={{ ...modalLabel, fontSize: 11 }}>Holding period after bonus posts (days, optional)</label>
                <input type="number" value={customHoldingPeriod} onChange={e => setCustomHoldingPeriod(e.target.value)} placeholder="e.g. 60" style={{ ...modalInput, padding: "6px 10px" }} />
              </div>
              <div>
                <label style={modalLabel}>Notes (optional)</label>
                <input type="text" value={customNotes} onChange={e => setCustomNotes(e.target.value)} style={modalInput} />
              </div>
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="editCustomChurnable" checked={customChurnable} onChange={e => setCustomChurnable(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                  <label htmlFor="editCustomChurnable" style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>This bonus is churnable (can be repeated)</label>
                </div>
                {customChurnable && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: 13, color: "#666" }}>Cooldown period:</label>
                    <input type="number" value={customCooldown} onChange={e => setCustomCooldown(e.target.value)}
                      style={{ ...modalInput, width: 70, padding: "6px 10px", textAlign: "center" as const }} min={1} />
                    <span style={{ fontSize: 13, color: "#666" }}>months</span>
                  </div>
                )}
              </div>
            </div>
            <div style={modalActions}>
              <button onClick={() => setEditingCustom(null)} style={cancelBtnLight}>Cancel</button>
              <button onClick={handleSaveEditCustom} disabled={!customBank || !customAmount}
                style={{ ...confirmBtnLight, opacity: (!customBank || !customAmount) ? 0.5 : 1 }}>Save</button>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f5f5f5", display: "flex", justifyContent: "center" }}>
              <button onClick={async () => { await handleDeleteCustom(editingCustom.id); setEditingCustom(null) }}
                style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                Delete this bonus permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Open Account Modal */}
      {showAddOpenAccount && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>Add Open Account</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Track a bank account you have open (no bonus needed).</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={modalLabel}>Bank name</label>
                <input type="text" value={openAcctBank} onChange={e => setOpenAcctBank(e.target.value)} placeholder="e.g. Chase" style={modalInput} />
              </div>
              <div>
                <label style={modalLabel}>When did you open it? (optional)</label>
                <input type="date" value={openAcctDate} onChange={e => setOpenAcctDate(e.target.value)} style={modalInput} />
              </div>
              <div>
                <label style={modalLabel}>Notes (optional)</label>
                <input type="text" value={openAcctNotes} onChange={e => setOpenAcctNotes(e.target.value)} placeholder="Primary checking, etc." style={modalInput} />
              </div>
            </div>
            <div style={modalActions}>
              <button onClick={() => { setShowAddOpenAccount(false); setOpenAcctBank(""); setOpenAcctDate(""); setOpenAcctNotes("") }} style={cancelBtnLight}>Cancel</button>
              <button disabled={!openAcctBank} onClick={async () => {
                await addOpenAccount(userId, openAcctBank, openAcctDate || undefined, openAcctNotes || undefined)
                await loadRecords()
                setShowAddOpenAccount(false); setOpenAcctBank(""); setOpenAcctDate(""); setOpenAcctNotes("")
              }} style={{ ...confirmBtnLight, opacity: !openAcctBank ? 0.5 : 1 }}>Add Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Styles ── */
const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const settingsLabel: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const settingsSelectLight: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }
const settingsInputLight: React.CSSProperties = { padding: "8px 12px 8px 26px", fontSize: 14, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: 140 }
const modalLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }
const modalInput: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, boxSizing: "border-box" as const, background: "#fff", color: "#111" }
const modalActions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }
const cancelBtnLight: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#888", cursor: "pointer" }
const confirmBtnLight: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "none", borderRadius: 8, background: "#0d7c5f", color: "#fff", cursor: "pointer", fontWeight: 700 }
