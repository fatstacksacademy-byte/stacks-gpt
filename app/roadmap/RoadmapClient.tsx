"use client"

import React, { useEffect, useState, useCallback } from "react"
import StepProgressBar from "../components/StepProgressBar"
import { getBonusStepDetail, BonusStep } from "../../lib/bonusSteps"
import { updateBonusStep } from "../../lib/completedBonuses"
import { useProfile, PayFrequency } from "../components/ProfileProvider"
import { bonuses as allBonuses } from "../../lib/data/bonuses"
import { getChurnStatus, fmtShortDate, ChurnStatus, CompletedBonus } from "../../lib/churn"
import { getCompletedBonuses, markBonusStarted, markBonusClosed, deleteCompletedBonus } from "../../lib/completedBonuses"
import { runSequencer, SequencerResult, SequencedBonus, SlotEntry } from "../../lib/sequencer"
import { getCustomBonuses, addCustomBonus, closeCustomBonus, deleteCustomBonus, CustomBonus } from "../../lib/customBonuses"

type Bonus = (typeof allBonuses)[number]

const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7, biweekly: 14, semimonthly: 15.2, monthly: 30.4,
}

function computeVelocity(bonus: Bonus, payFrequency: string, paycheckAmount: number) {
  const req = bonus.requirements
  if (!req?.direct_deposit_required) return { velocity: null, weeksToComplete: null, feasible: false, reason: "No DD required" }
  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14
  const windowDays = req.deposit_window_days ?? null
  const perDepositMin = req.min_direct_deposit_per_deposit ?? null
  const totalMin = req.min_direct_deposit_total ?? null
  const ddCountRequired = req.dd_count_required ?? null
  if (perDepositMin && paycheckAmount < perDepositMin) return { velocity: null, weeksToComplete: null, feasible: false, reason: `Paycheck $${paycheckAmount} below $${perDepositMin}/deposit minimum` }
  if (totalMin && windowDays) {
    const maxDeposits = Math.max(1, Math.ceil(windowDays / daysPerPay))
    if (maxDeposits * paycheckAmount < totalMin) return { velocity: null, weeksToComplete: null, feasible: false, reason: `Can only deposit ~$${(maxDeposits * paycheckAmount).toLocaleString()} in ${windowDays}-day window, need $${totalMin.toLocaleString()}` }
  }
  let ddCount = ddCountRequired
  if (!ddCount && totalMin) ddCount = Math.ceil(totalMin / paycheckAmount)
  if (!ddCount) ddCount = 1
  const weeksToComplete = Math.ceil((ddCount * daysPerPay) / 7)
  return { velocity: bonus.bonus_amount / weeksToComplete, weeksToComplete, feasible: true, reason: undefined }
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
  start_date: string
  payout_date: string
  weeks: number
}

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
      start_date: fmtDate(startDate),
      payout_date: fmtDate(payoutDate),
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "slots" | "frequency" | "paycheck" | "sequencer" | "done">("done")
  const [sequencerResult, setSequencerResult] = useState<SequencerResult | null>(null)
  const [showProjection, setShowProjection] = useState(false)
  const [projectionResult, setProjectionResult] = useState<SequencerResult | null>(null)
  // Custom bonuses
  const [customBonuses, setCustomBonuses] = useState<CustomBonus[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customBank, setCustomBank] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [customDate, setCustomDate] = useState(todayStr())
  const [customNotes, setCustomNotes] = useState("")
  const [customChurnable, setCustomChurnable] = useState(false)
  const [customCooldown, setCustomCooldown] = useState("12")
  const [actionCustom, setActionCustom] = useState<{ bonus: CustomBonus; mode: "close" } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true)
    const [records, custom] = await Promise.all([
      getCompletedBonuses(userId),
      getCustomBonuses(userId),
    ])
    setCompletedRecords(records)
    setCustomBonuses(custom)
    setLoadingRecords(false)
  }, [userId])

  useEffect(() => { loadRecords() }, [loadRecords])

  useEffect(() => {
    if (!loadingRecords && completedRecords.length === 0 && loaded) {
      const isDefault = profile.paycheck_amount === 1500 && profile.pay_frequency === "biweekly" && profile.dd_slots === 1
      if (isDefault) setOnboardingStep("welcome")
    }
  }, [loadingRecords, completedRecords.length, loaded, profile.paycheck_amount, profile.pay_frequency, profile.dd_slots])

  function handleRunSequencer() {
    const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setOnboardingStep("sequencer")
  }

  function handleSequencerDone() { setOnboardingStep("done"); setSequencerResult(null) }

  function handleRefreshSequencer() {
    const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setShowAdvanced(false)
  }

  function handleToggleProjection() {
    if (showProjection) {
      setShowProjection(false)
      return
    }
    if (!projectionResult) {
      const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
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

  async function handleAddCustom() {
    if (!customBank || !customAmount) return
    const cooldown = customChurnable ? parseInt(customCooldown) || null : null
    await addCustomBonus(userId, customBank, parseInt(customAmount), customDate, customNotes || undefined, cooldown)
    await loadRecords()
    setShowAddCustom(false)
    setCustomBank("")
    setCustomAmount("")
    setCustomDate(todayStr())
    setCustomNotes("")
    setCustomChurnable(false)
    setCustomCooldown("12")
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

  // Active custom bonuses (not closed)
  const activeCustom = customBonuses.filter(c => !c.closed_date)
  const closedCustom = customBonuses.filter(c => c.closed_date)
  const customEarned = closedCustom.filter(c => c.bonus_received).reduce((s, c) => s + (c.actual_amount ?? c.bonus_amount), 0)
  const customInProgress = activeCustom.reduce((s, c) => s + c.bonus_amount, 0)

  // Custom bonuses in cooldown (closed, churnable, cooldown not yet elapsed)
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

  const bonusesWithMeta = mounted
    ? allBonuses.map((b) => ({
        bonus: b,
        ...computeVelocity(b, profile.pay_frequency, profile.paycheck_amount),
        churnStatus: getChurnStatus(b.id, (b as any).cooldown_months ?? null, completedRecords),
      }))
    : allBonuses.map((b) => ({
        bonus: b, velocity: null, weeksToComplete: null, feasible: true, reason: undefined,
        churnStatus: { status: "available" } as ChurnStatus,
      }))

  const inProgress = bonusesWithMeta.filter(b => b.churnStatus.status === "in_progress")
  const available = bonusesWithMeta
    .filter(b => b.churnStatus.status === "available")
    .sort((a, b) => {
      if (a.feasible && !b.feasible) return -1
      if (!a.feasible && b.feasible) return 1
      return (b.velocity ?? 0) - (a.velocity ?? 0)
    })
  const inCooldown = bonusesWithMeta.filter(b => b.churnStatus.status === "in_cooldown")
    .sort((a, b) => {
      const ad = a.churnStatus.status === "in_cooldown" ? a.churnStatus.days_remaining : 0
      const bd = b.churnStatus.status === "in_cooldown" ? b.churnStatus.days_remaining : 0
      return ad - bd
    })

  const allEarned = completedRecords.filter(r => r.bonus_received && r.closed_date)
  const earnedAmt = (r: CompletedBonus) => { const b = allBonuses.find(x => x.id === r.bonus_id); return r.actual_amount ?? b?.bonus_amount ?? 0 }
  const totalEarned = allEarned.reduce((sum, r) => sum + earnedAmt(r), 0)

  // Auto-run sequencer on mount for accurate projection
  useEffect(() => {
    if (mounted && !loadingRecords && loaded && !projectionResult && onboardingStep === "done") {
      const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
      setProjectionResult(result)
    }
  }, [mounted, loadingRecords, loaded, onboardingStep, profile.dd_slots, profile.pay_frequency, profile.paycheck_amount, completedRecords, projectionResult])

  // 365-day projection from today
  const projected365 = projectionResult ? getProjectedBonuses(projectionResult) : []
  const today365End = addDays(todayStr(), 365)
  const yearBonuses365 = projected365.filter(p => new Date(p.payout_date) <= today365End)
  const expectedThisYear = yearBonuses365.reduce((sum, p) => sum + p.bonus_amount, 0)

  const currentBonus = inProgress[0] ?? available[0] ?? null
  const upNextBonuses = currentBonus
    ? (inProgress.length > 0
      ? [...inProgress.slice(1), ...available.slice(0, Math.max(0, 2 - inProgress.length + 1))].slice(0, 2)
      : available.slice(1, 3))
    : []

  // Timeline: when does the current bonus end and next one start?
  const currentWeeks = currentBonus?.weeksToComplete ?? 0
  const nextBonus = inProgress.length > 0 ? available[0] : available[1]

  if (!mounted || loadingRecords) {
    return <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#999", fontSize: 14 }}>Loading...</div></div>
  }

  const isOnboarding = onboardingStep !== "done" && onboardingStep !== "sequencer"

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", color: "#1a1a1a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top Bar */}
      {!isOnboarding && (
        <div style={{ borderBottom: "1px solid #e8e8e8", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", background: "#fff" }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111" }}>Stacks OS</span>
          {onboardingStep === "done" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setShowSettings(s => !s)} style={topBtn}>{showSettings ? "Close" : "Settings"}</button>
              <button onClick={handleRefreshSequencer} style={{ ...topBtn, color: "#0d7c5f", borderColor: "#c8ede1" }}>Refresh bonuses</button>
              <a href="/roadmap/history" style={{ ...topBtn, textDecoration: "none", display: "inline-block" }}>History</a>
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isOnboarding ? "0" : "28px 32px 80px" }}>

        {/* Settings Panel */}
        {showSettings && onboardingStep === "done" && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Pay Profile</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={settingsLabel}>Direct deposit slots</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setProfile({ dd_slots: n })} style={profile.dd_slots === n ? segBtnActiveLight : segBtnLight}>{n}</button>
                  ))}
                </div>
              </div>
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
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 12 }}>Changes save automatically</div>
          </div>
        )}

        {/* ═══════ ONBOARDING: WELCOME ═══════ */}
        {onboardingStep === "welcome" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "85vh", padding: "32px" }}>
            <div style={{ textAlign: "center", maxWidth: 520 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Stacks OS</div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111", margin: "0 0 16px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                Let's find you an extra $2,000+ this year
              </h1>
              <p style={{ fontSize: 16, color: "#777", lineHeight: 1.6, margin: "0 0 12px" }}>
                Banks pay you hundreds of dollars just for setting up direct deposit. We'll tell you exactly which bonuses to sign up for, in what order, to get you the most money.
              </p>
              <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 36px" }}>
                3 quick questions. Takes 30 seconds.
              </p>
              <button onClick={() => setOnboardingStep("slots")} style={primaryBtn}>
                Let's go
              </button>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: DD SLOTS ═══════ */}
        {onboardingStep === "slots" && (
          <div style={onboardingScreen}>
            <div style={onboardingCard}>
              <div style={stepIndicator}>Step 1 of 3</div>
              <h2 style={onboardingQ}>How many direct deposits can you split your paycheck into?</h2>
              <p style={onboardingHint}>Most employers let you split into 2 or more accounts. If you're not sure, pick 1 — you can change it later.</p>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => { setProfile({ dd_slots: n }); setOnboardingStep("frequency") }}
                    style={profile.dd_slots === n ? obOptionActive : obOption}>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{n}</div>
                    <div style={{ fontSize: 12, color: profile.dd_slots === n ? "#fff" : "#999", marginTop: 2 }}>
                      {n === 1 ? "account" : "accounts"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: FREQUENCY ═══════ */}
        {onboardingStep === "frequency" && (
          <div style={onboardingScreen}>
            <div style={onboardingCard}>
              <div style={stepIndicator}>Step 2 of 3</div>
              <h2 style={onboardingQ}>How often do you get paid?</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                {FREQ_OPTIONS.map(f => (
                  <button key={f.value} onClick={() => { setProfile({ pay_frequency: f.value }); setOnboardingStep("paycheck") }}
                    style={profile.pay_frequency === f.value ? obRowActive : obRow}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: profile.pay_frequency === f.value ? "rgba(255,255,255,0.7)" : "#999" }}>{f.desc}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setOnboardingStep("slots")} style={backLink}>Back</button>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: PAYCHECK ═══════ */}
        {onboardingStep === "paycheck" && (
          <div style={onboardingScreen}>
            <div style={onboardingCard}>
              <div style={stepIndicator}>Step 3 of 3</div>
              <h2 style={onboardingQ}>What's your take-home pay per paycheck?</h2>
              <p style={onboardingHint}>After taxes. A rough estimate is totally fine — this helps us figure out which bonuses you qualify for.</p>
              <div style={{ position: "relative", marginTop: 24, maxWidth: 240 }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 22, fontWeight: 600 }}>$</span>
                <input
                  type="number"
                  value={profile.paycheck_amount}
                  onChange={e => setProfile({ paycheck_amount: Number(e.target.value) })}
                  style={paycheckInput}
                  min={0} step={100}
                  autoFocus
                />
              </div>
              <button onClick={handleRunSequencer} style={{ ...primaryBtn, marginTop: 28, width: "100%" }}>
                Find my bonuses
              </button>
              <button onClick={() => setOnboardingStep("frequency")} style={backLink}>Back</button>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: SEQUENCER RESULTS ═══════ */}
        {onboardingStep === "sequencer" && sequencerResult && (() => {
          const projected = getProjectedBonuses(sequencerResult)
          const endDate = addDays(todayStr(), 365)
          const yearTotal = projected.filter(p => new Date(p.payout_date) <= endDate).reduce((s, p) => s + p.bonus_amount, 0)
          const multiYearTotal = yearTotal * 3
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: "32px" }}>
              <div style={{ textAlign: "center", maxWidth: 520 }}>
                <div style={{ fontSize: 14, color: "#0d7c5f", fontWeight: 600, marginBottom: 8 }}>Your personalized plan is ready</div>
                <h2 style={{ fontSize: 34, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                  You could earn ${multiYearTotal.toLocaleString()}
                </h2>
                <p style={{ fontSize: 16, color: "#888", marginTop: 0, lineHeight: 1.6 }}>
                  over the next 3 years by following your optimized bonus plan.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 32, margin: "28px 0" }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${yearTotal.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 1</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${(yearTotal * 2).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 2</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${multiYearTotal.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 3</div>
                  </div>
                </div>
                <button onClick={handleSequencerDone} style={{ ...primaryBtn, width: "100%", padding: "16px 28px", fontSize: 16 }}>
                  Go to dashboard →
                </button>
              </div>
            </div>
          )
        })()}

        {/* ═══════ MAIN DASHBOARD ═══════ */}
        {onboardingStep === "done" && (
          <>
            {/* Expected Earnings */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "28px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Expected earnings next 12 months</div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: "#0d7c5f", marginTop: 4, letterSpacing: "-0.02em" }}>${expectedThisYear.toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total earned</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#111", marginTop: 2 }}>${(totalEarned + customEarned).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>In progress</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>${(inProgress.reduce((s, b) => s + b.bonus.bonus_amount, 0) + customInProgress).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>{inProgress.length + activeCustom.length} bonus{(inProgress.length + activeCustom.length) !== 1 ? "es" : ""}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#111", marginTop: 2 }}>{available.length}</div>
                  </div>
                  {inCooldown.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cooling</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#d97706", marginTop: 2 }}>{inCooldown.length}</div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleToggleProjection} style={{ marginTop: 14, fontSize: 13, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                {showProjection ? "Hide breakdown" : "How is this calculated?"}
              </button>
              {showProjection && projectionResult && (() => {
                const projected = getProjectedBonuses(projectionResult)
                const endDate = addDays(todayStr(), 365)
                const yearBonuses = projected.filter(p => new Date(p.payout_date) <= endDate)
                return (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
                    <div style={{ fontSize: 12, color: "#bbb", marginBottom: 12 }}>
                      Projected payouts over the next 12 months based on ${profile.paycheck_amount.toLocaleString()} {profile.pay_frequency} paycheck with {profile.dd_slots} DD slot{profile.dd_slots > 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {yearBonuses.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8f8f8", borderRadius: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: "#bbb", fontWeight: 700, width: 20 }}>{i + 1}</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{p.bank_name}</div>
                              <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>Start {p.start_date} → Payout ~{p.payout_date}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#0d7c5f" }}>{money(p.bonus_amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", marginTop: 8, background: "#f0faf5", borderRadius: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Total projected (next 12 months)</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#0d7c5f" }}>${yearBonuses.reduce((s, p) => s + p.bonus_amount, 0).toLocaleString()}</span>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Sequencer Results */}
            {sequencerResult && (
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Your Optimized Stack</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{sequencerResult.slots.flat().filter(e => e.type === "bonus").length} bonuses \u00b7 ${sequencerResult.total_bonus.toLocaleString()} total</div>
                  </div>
                  <button onClick={() => setSequencerResult(null)} style={topBtn}>Hide</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sequencerResult.slots.flat().filter(e => e.type === "bonus").slice(0, 5).map((entry, i) => {
                    const b = entry as SequencedBonus
                    return (
                      <div key={`${b.id}-${b.cycle}-seq`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8f8f8", borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 700, width: 18 }}>{i + 1}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{b.bank_name}</span>
                          <span style={{ fontSize: 11, color: "#999" }}>~{b.weeks_to_complete}w</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(b.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hero Card */}
            {currentBonus && (
              <div style={{
                background: "#fff", border: "2px solid #0d7c5f", borderRadius: 14, padding: "32px 28px", marginBottom: 12,
                boxShadow: "0 4px 24px rgba(13,124,95,0.06)",
              }}>
                <div style={{ fontSize: 11, color: currentBonus.churnStatus.status === "in_progress" ? "#2563eb" : "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
                  {currentBonus.churnStatus.status === "in_progress" ? "Currently working on" : "Your next bonus"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{currentBonus.bonus.bank_name}</div>
                    <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                      <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Earn</div><div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f", marginTop: 2 }}>{money(currentBonus.bonus.bonus_amount)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Time</div><div style={{ fontSize: 28, fontWeight: 800, color: "#111", marginTop: 2 }}>{currentBonus.weeksToComplete ? `${currentBonus.weeksToComplete}w` : "\u2014"}</div></div>
                      <div><div style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>Fee</div><div style={{ fontSize: 28, fontWeight: 800, color: "#111", marginTop: 2 }}>{currentBonus.bonus.fees?.monthly_fee === 0 ? "$0" : money(currentBonus.bonus.fees?.monthly_fee)}</div></div>
                    </div>
                    <div style={{ fontSize: 14, color: "#777", marginTop: 14, lineHeight: 1.6, maxWidth: 500 }}>
                      {currentBonus.bonus.requirements?.min_direct_deposit_total
                        ? `Deposit $${currentBonus.bonus.requirements.min_direct_deposit_total.toLocaleString()} total within ${currentBonus.bonus.requirements.deposit_window_days ?? "\u2014"} days using your regular paycheck.`
                        : currentBonus.bonus.requirements?.min_direct_deposit_per_deposit
                          ? `Make ${currentBonus.bonus.requirements.dd_count_required ?? "a"} direct deposit${(currentBonus.bonus.requirements.dd_count_required ?? 0) > 1 ? "s" : ""} of $${currentBonus.bonus.requirements.min_direct_deposit_per_deposit.toLocaleString()}+ each.`
                          : "Set up direct deposit to qualify."}
                    </div>
                    {currentBonus.churnStatus.status === "in_progress" && (() => {
                      const record = completedRecords.find(r => r.bonus_id === currentBonus.bonus.id && !r.closed_date)
                      if (!record) return null
                      const stepDetail = getBonusStepDetail(currentBonus.bonus, record, profile.pay_frequency, profile.paycheck_amount)
                      return <div style={{ marginTop: 18 }}><StepProgressBar detail={stepDetail} onOverride={(step) => handleStepOverride(currentBonus.bonus.id, step)} /></div>
                    })()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 190 }}>
                    {currentBonus.churnStatus.status === "in_progress" ? (
                      <>
                        <button onClick={() => { setActionBonus({ bonus: currentBonus.bonus, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(currentBonus.bonus.bonus_amount)) }}
                          style={{ ...primaryBtn, background: "#dc2626" }}>Close account</button>
                        <button onClick={() => handleDelete(currentBonus.bonus.id)} style={secondaryBtn}>Remove</button>
                      </>
                    ) : (
                      <>
                        {bestLink(currentBonus.bonus.source_links) && (
                          <a href={bestLink(currentBonus.bonus.source_links)!} target="_blank" rel="noreferrer" style={primaryBtn}>
                            Open your account →
                          </a>
                        )}
                        <button onClick={() => { setActionBonus({ bonus: currentBonus.bonus, mode: "start" }); setActionDate(todayStr()) }}
                          style={secondaryBtn}>I already opened it</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline hint */}
            {nextBonus && currentWeeks > 0 && (
              <div style={{ background: "#f0faf5", border: "1px solid #c8ede1", borderRadius: 10, padding: "12px 18px", marginBottom: 24, fontSize: 13, color: "#0d7c5f" }}>
                <strong>Next up:</strong> Start {nextBonus.bonus.bank_name} in ~{currentWeeks} weeks → Earn {money(nextBonus.bonus.bonus_amount)}
              </div>
            )}

            {/* Up Next Cards */}
            {upNextBonuses.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${upNextBonuses.length}, 1fr)`, gap: 12, marginBottom: 28 }}>
                {upNextBonuses.map(({ bonus: b, velocity, weeksToComplete, churnStatus }) => {
                  const isActive = churnStatus.status === "in_progress"
                  const record = isActive ? completedRecords.find(r => r.bonus_id === b.id && !r.closed_date) : null
                  const stepDetail = record ? getBonusStepDetail(b, record, profile.pay_frequency, profile.paycheck_amount) : null
                  const link = bestLink(b.source_links)
                  return (
                    <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 22px" }}>
                      <div style={{ fontSize: 11, color: isActive ? "#2563eb" : "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>{isActive ? "In progress" : "Up next"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{b.bank_name}</div>
                          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>~{weeksToComplete ?? "?"}w{b.fees?.monthly_fee ? ` \u00b7 ${money(b.fees.monthly_fee)}/mo` : ""}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                      </div>
                      {stepDetail && <div style={{ marginTop: 10 }}><StepProgressBar detail={stepDetail} onOverride={(step) => handleStepOverride(b.id, step)} /></div>}
                      {!isActive && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          {link && <a href={link} target="_blank" rel="noreferrer" style={{ ...secondaryBtn, flex: 1, textAlign: "center", fontSize: 12, padding: "8px" }}>Open account</a>}
                          <button onClick={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                            style={{ fontSize: 12, padding: "8px 14px", color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer" }}>Already opened</button>
                        </div>
                      )}
                      {isActive && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                            style={{ flex: 1, padding: "8px", fontSize: 12, border: "1px solid #dc2626", color: "#dc2626", background: "none", borderRadius: 8, cursor: "pointer" }}>Close account</button>
                          <button onClick={() => handleDelete(b.id)} style={{ padding: "8px 12px", fontSize: 12, border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 8, cursor: "pointer" }}>Remove</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cooldown */}
            {(inCooldown.length > 0 || customInCooldown.length > 0) && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 12 }}>Cooling Down</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {inCooldown.map(({ bonus: b, churnStatus }) => {
                    const s = churnStatus as Extract<ChurnStatus, { status: "in_cooldown" }>
                    return (
                      <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 18px", minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 12, color: "#d97706", marginTop: 4 }}>{s.days_remaining} days left</div>
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>Available {fmtShortDate(s.available_date)}</div>
                      </div>
                    )
                  })}
                  {customInCooldown.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 18px", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{c.bank_name}</div>
                        <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#d97706", marginTop: 4 }}>{c.days_remaining} days left</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>Available {fmtShortDate(c.available_date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earnings */}
            {allEarned.length > 0 && (
              <details style={{ marginBottom: 28 }}>
                <summary style={{ fontSize: 14, fontWeight: 600, color: "#111", cursor: "pointer", padding: "8px 0" }}>Earnings History <span style={{ fontSize: 12, color: "#bbb", fontWeight: 400 }}>({allEarned.length})</span></summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {allEarned.sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime()).map(r => {
                    const bonus = allBonuses.find(b => b.id === r.bonus_id)
                    if (!bonus) return null
                    return (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#fff", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{bonus.bank_name} <span style={{ fontSize: 12, color: "#bbb" }}>{fmtShortDate(r.closed_date!)}</span></span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(r.actual_amount ?? bonus.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* Custom Bonuses */}
            {(activeCustom.length > 0 || closedCustom.length > 0) && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Your Custom Bonuses</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeCustom.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "18px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{c.bank_name}</div>
                            <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Opened {fmtShortDate(c.opened_date)}{c.notes ? ` · ${c.notes}` : ""}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "#2563eb" }}>In progress</span>
                            {c.cooldown_months && <span style={{ fontSize: 10, color: "#d97706" }}>· Churnable every {c.cooldown_months}mo</span>}
                            {!c.cooldown_months && <span style={{ fontSize: 10, color: "#bbb" }}>· One-time</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(c.bonus_amount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={() => { setActionCustom({ bonus: c, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(c.bonus_amount)) }}
                          style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #dc2626", color: "#dc2626", background: "none", borderRadius: 8, cursor: "pointer" }}>Close account</button>
                        <button onClick={() => handleDeleteCustom(c.id)}
                          style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 8, cursor: "pointer" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                  {closedCustom.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 22px", opacity: 0.7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                            <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Closed {fmtShortDate(c.closed_date!)}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {c.bonus_received ? (
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f" }}>{money(c.actual_amount ?? c.bonus_amount)}</span>
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

            {/* Add Custom + Advanced Toggle */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setShowAddCustom(true)}
                style={{ flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid #0d7c5f", borderRadius: 10, color: "#0d7c5f", cursor: "pointer" }}>
                + Add custom bonus
              </button>
              <button onClick={() => setShowAdvanced(a => !a)}
                style={{ flex: 1, padding: "12px", fontSize: 13, fontWeight: 600, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, color: "#999", cursor: "pointer" }}>
                {showAdvanced ? "Hide all bonuses" : `Show all ${available.length + inProgress.length} bonuses`}
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
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {actionBonus && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>{actionBonus.bonus.bank_name}</div>
            {actionBonus.mode === "start" && (
              <>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>When did you open this account?</div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={modalActions}>
                  <button onClick={() => setActionBonus(null)} style={cancelBtnLight}>Cancel</button>
                  <button onClick={handleStart} style={confirmBtnLight}>Start Bonus</button>
                </div>
              </>
            )}
            {actionBonus.mode === "close" && (
              <>
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
              </>
            )}
          </div>
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
              <div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={modalInput} />
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
            <div style={modalActions}>
              <button onClick={() => { setShowAddCustom(false); setCustomChurnable(false); setCustomCooldown("12") }} style={cancelBtnLight}>Cancel</button>
              <button onClick={handleAddCustom} disabled={!customBank || !customAmount} style={{ ...confirmBtnLight, opacity: (!customBank || !customAmount) ? 0.5 : 1 }}>Add Bonus</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Custom Bonus Modal */}
      {actionCustom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 400, border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#111" }}>{actionCustom.bonus.bank_name}</div>
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
          </div>
        </div>
      )}
    </div>
  )
}

function DashStat({ value, label, color }: { value: number; label: string; color: string }) {
  return <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div><div style={{ fontSize: 11, color: "#999" }}>{label}</div></div>
}

/* ── Styles ── */
const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const primaryBtn: React.CSSProperties = { padding: "14px 28px", fontSize: 15, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", textDecoration: "none", textAlign: "center" as const, display: "inline-block" }
const secondaryBtn: React.CSSProperties = { padding: "12px 28px", fontSize: 13, fontWeight: 600, color: "#666", border: "1px solid #ddd", borderRadius: 10, background: "#fff", cursor: "pointer", textDecoration: "none", textAlign: "center" as const, display: "inline-block" }
const onboardingScreen: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "85vh", padding: "32px" }
const onboardingCard: React.CSSProperties = { maxWidth: 480, width: "100%" }
const stepIndicator: React.CSSProperties = { fontSize: 12, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }
const onboardingQ: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 8px", lineHeight: 1.3 }
const onboardingHint: React.CSSProperties = { fontSize: 14, color: "#999", lineHeight: 1.5, margin: 0 }
const obOption: React.CSSProperties = { flex: 1, padding: "24px 16px", background: "#fff", border: "2px solid #e8e8e8", borderRadius: 12, cursor: "pointer", textAlign: "center" as const, transition: "border-color 0.15s" }
const obOptionActive: React.CSSProperties = { ...obOption, background: "#0d7c5f", borderColor: "#0d7c5f", color: "#fff" }
const obRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", border: "2px solid #e8e8e8", borderRadius: 12, cursor: "pointer", textAlign: "left" as const }
const obRowActive: React.CSSProperties = { ...obRow, background: "#0d7c5f", borderColor: "#0d7c5f", color: "#fff" }
const paycheckInput: React.CSSProperties = { padding: "16px 16px 16px 38px", fontSize: 28, fontWeight: 700, background: "#fff", color: "#111", border: "2px solid #e8e8e8", borderRadius: 12, width: "100%", boxSizing: "border-box" as const }
const backLink: React.CSSProperties = { display: "block", marginTop: 16, fontSize: 13, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: 0 }
const settingsLabel: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const segBtnLight: React.CSSProperties = { padding: "6px 14px", fontSize: 13, background: "#fff", color: "#666", border: "1px solid #e0e0e0", borderRadius: 6, cursor: "pointer" }
const segBtnActiveLight: React.CSSProperties = { ...segBtnLight, background: "#0d7c5f", color: "#fff", borderColor: "#0d7c5f", fontWeight: 700 }
const settingsSelectLight: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }
const settingsInputLight: React.CSSProperties = { padding: "8px 12px 8px 26px", fontSize: 14, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: 140 }
const modalLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#888", display: "block", marginBottom: 6 }
const modalInput: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, boxSizing: "border-box" as const, background: "#fff", color: "#111" }
const modalActions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }
const cancelBtnLight: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#888", cursor: "pointer" }
const confirmBtnLight: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "none", borderRadius: 8, background: "#0d7c5f", color: "#fff", cursor: "pointer", fontWeight: 700 }
