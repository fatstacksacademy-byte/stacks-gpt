"use client"

import React, { useEffect, useState, useCallback } from "react"
import { getMilestoneDetail, MilestoneKey } from "../../lib/bonusSteps"
import { updateBonusStep } from "../../lib/completedBonuses"
import { useProfile, PayFrequency } from "../components/ProfileProvider"
import { bonuses as allBonuses } from "../../lib/data/bonuses"
import { getChurnStatus, fmtShortDate, ChurnStatus, CompletedBonus } from "../../lib/churn"
import { getCompletedBonuses, markBonusStarted, markBonusClosed, deleteCompletedBonus } from "../../lib/completedBonuses"
import { runSequencer, SequencerResult, SequencedBonus, SlotEntry } from "../../lib/sequencer"
import { getCustomBonuses, addCustomBonus, closeCustomBonus, deleteCustomBonus, CustomBonus } from "../../lib/customBonuses"
import { createClient } from "../../lib/supabase/client"

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
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "frequency" | "paycheck" | "sequencer" | "done">("done")
  const [sequencerResult, setSequencerResult] = useState<SequencerResult | null>(null)
  const [showProjection, setShowProjection] = useState(false)
  const [projectionResult, setProjectionResult] = useState<SequencerResult | null>(null)
  const [customBonuses, setCustomBonuses] = useState<CustomBonus[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customBank, setCustomBank] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [customDate, setCustomDate] = useState(todayStr())
  const [customNotes, setCustomNotes] = useState("")
  const [customChurnable, setCustomChurnable] = useState(false)
  const [customCooldown, setCustomCooldown] = useState("12")
  const [actionCustom, setActionCustom] = useState<{ bonus: CustomBonus; mode: "close" } | null>(null)
  const [showThreeYear, setShowThreeYear] = useState(false)

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
      const isDefault = profile.paycheck_amount === 1500 && profile.pay_frequency === "biweekly"
      if (isDefault) setOnboardingStep("welcome")
    }
  }, [loadingRecords, completedRecords.length, loaded, profile.paycheck_amount, profile.pay_frequency])

  function handleRunSequencer() {
    const result = runSequencer({ slots: 1, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setOnboardingStep("sequencer")
  }

  function handleSequencerDone() { setOnboardingStep("done"); setSequencerResult(null) }

  function handleRefreshSequencer() {
    const result = runSequencer({ slots: 1, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setShowAdvanced(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  function handleToggleProjection() {
    if (showProjection) {
      setShowProjection(false)
      return
    }
    if (!projectionResult) {
      const result = runSequencer({ slots: 1, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
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

  const activeCustom = customBonuses.filter(c => !c.closed_date)
  const closedCustom = customBonuses.filter(c => c.closed_date)
  const customEarned = closedCustom.filter(c => c.bonus_received).reduce((s, c) => s + (c.actual_amount ?? c.bonus_amount), 0)
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

  useEffect(() => {
    if (mounted && !loadingRecords && loaded && !projectionResult && onboardingStep === "done") {
      const result = runSequencer({ slots: 1, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
      setProjectionResult(result)
    }
  }, [mounted, loadingRecords, loaded, onboardingStep, profile.pay_frequency, profile.paycheck_amount, completedRecords, projectionResult])

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
              <button onClick={handleLogout} style={topBtn}>Log out</button>
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
            <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 16, paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="allowMultiple" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
                <label htmlFor="allowMultiple" style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>Allow multiple bonuses at once</label>
              </div>
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 4, marginLeft: 26 }}>Show all active bonuses on the dashboard instead of just one</div>
            </div>
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
                Banks pay you for moving your direct deposit. We'll tell you exactly where to send it next.
              </p>
              <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 36px" }}>
                2 quick questions. Takes 20 seconds.
              </p>
              <button onClick={() => setOnboardingStep("frequency")} style={primaryBtn}>
                Let's go
              </button>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: FREQUENCY ═══════ */}
        {onboardingStep === "frequency" && (
          <div style={onboardingScreen}>
            <div style={onboardingCard}>
              <div style={stepIndicator}>Step 1 of 2</div>
              <h2 style={onboardingQ}>How often do you get paid?</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
                {FREQ_OPTIONS.map(f => (
                  <button key={f.value} onClick={() => { setProfile({ pay_frequency: f.value }); setOnboardingStep("paycheck") }}
                    style={profile.pay_frequency === f.value ? obRowActive : obRow}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{f.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setOnboardingStep("welcome")} style={backLink}>Back</button>
            </div>
          </div>
        )}

        {/* ═══════ ONBOARDING: PAYCHECK ═══════ */}
        {onboardingStep === "paycheck" && (
          <div style={onboardingScreen}>
            <div style={onboardingCard}>
              <div style={stepIndicator}>Step 2 of 2</div>
              <h2 style={onboardingQ}>What's your take-home pay per paycheck?</h2>
              <p style={onboardingHint}>After taxes. A rough estimate is fine.</p>
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
                Build my plan
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
          const firstBonus = projected[0]
          const firstAmount = firstBonus ? firstBonus.bonus_amount : yearTotal
          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: "32px" }}>
              <div style={{ textAlign: "center", maxWidth: 520 }}>
                <div style={{ fontSize: 14, color: "#0d7c5f", fontWeight: 600, marginBottom: 8 }}>Your personalized plan is ready</div>
                <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                  Your First {money(firstAmount)} Is Ready
                </h2>
                <p style={{ fontSize: 15, color: "#888", marginTop: 0, lineHeight: 1.6 }}>
                  You qualify based on your paycheck.
                </p>
                <div style={{ margin: "28px 0 8px" }}>
                  <div style={{ fontSize: 14, color: "#999" }}>Projected this year</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f", marginTop: 2 }}>${yearTotal.toLocaleString()}</div>
                </div>
                <button onClick={() => setShowThreeYear(s => !s)} style={{ fontSize: 13, color: "#999", background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 24 }}>
                  {showThreeYear ? "Hide 3-year projection" : "See 3-year projection"}
                </button>
                {showThreeYear && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#666" }}>${yearTotal.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 1</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#666" }}>${(yearTotal * 2).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 2</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#666" }}>${multiYearTotal.toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Year 3</div>
                    </div>
                  </div>
                )}
                <button onClick={handleSequencerDone} style={{ ...primaryBtn, width: "100%", padding: "16px 28px", fontSize: 16 }}>
                  Go to dashboard
                </button>
              </div>
            </div>
          )
        })()}

        {/* ═══════ MAIN DASHBOARD ═══════ */}
        {onboardingStep === "done" && (
          <>
            {/* ── Stats Bar — always first ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>${(totalEarned + customEarned).toLocaleString()}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>In progress</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb", marginTop: 2 }}>${(inProgress.reduce((s, b) => s + b.bonus.bonus_amount, 0) + customInProgress).toLocaleString()}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Projected 12 months</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", marginTop: 2 }}>${expectedThisYear.toLocaleString()}</div>
                <button onClick={handleToggleProjection} style={{ fontSize: 11, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600, marginTop: 4 }}>
                  {showProjection ? "Hide breakdown" : "View breakdown"}
                </button>
              </div>
            </div>

            {/* Projection breakdown (expandable) */}
            {showProjection && projectionResult && (() => {
              const projected = getProjectedBonuses(projectionResult)
              const endDate = addDays(todayStr(), 365)
              const yearBonuses = projected.filter(p => new Date(p.payout_date) <= endDate)
              return (
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "#bbb", marginBottom: 10 }}>
                    Based on ${profile.paycheck_amount.toLocaleString()} {profile.pay_frequency} paycheck
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {yearBonuses.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f8f8", borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#bbb", fontWeight: 700, width: 20 }}>{i + 1}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p.bank_name}</div>
                            <div style={{ fontSize: 11, color: "#999" }}>Start {p.start_date} → Payout ~{p.payout_date}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(p.bonus_amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 6, background: "#f0faf5", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Total projected</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0d7c5f" }}>${yearBonuses.reduce((s, p) => s + p.bonus_amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              )
            })()}

            {/* ── HERO: Primary Action Card (not yet started) ── */}
            {currentBonus && currentBonus.churnStatus.status !== "in_progress" && (
              <div style={{
                background: "#fff", border: "2px solid #0d7c5f", borderRadius: 16, padding: "36px 32px", marginBottom: 20,
                boxShadow: "0 4px 24px rgba(13,124,95,0.08)",
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  Your First {money(currentBonus.bonus.bonus_amount)} Is Ready
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>You qualify based on your paycheck</div>

                <div style={{ marginTop: 20, display: "flex", gap: 28, alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{currentBonus.bonus.bank_name}</div>
                  </div>
                  <div style={{ fontSize: 14, color: "#666" }}>
                    Complete in {currentBonus.weeksToComplete ? `${Math.ceil(currentBonus.weeksToComplete / 2)} pay cycle${Math.ceil(currentBonus.weeksToComplete / 2) > 1 ? "s" : ""}` : "a few weeks"}
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                  {currentBonus.bonus.requirements?.min_direct_deposit_total && (
                    <div style={{ fontSize: 14, color: "#555" }}>
                      Deposit ${currentBonus.bonus.requirements.min_direct_deposit_total.toLocaleString()} in {currentBonus.bonus.requirements.deposit_window_days ?? 90} days using your regular paycheck
                    </div>
                  )}
                  {!currentBonus.bonus.requirements?.min_direct_deposit_total && currentBonus.bonus.requirements?.min_direct_deposit_per_deposit && (
                    <div style={{ fontSize: 14, color: "#555" }}>
                      Make {currentBonus.bonus.requirements.dd_count_required ?? "a"} direct deposit{(currentBonus.bonus.requirements.dd_count_required ?? 0) > 1 ? "s" : ""} of ${currentBonus.bonus.requirements.min_direct_deposit_per_deposit.toLocaleString()}+ each
                    </div>
                  )}
                  {!currentBonus.bonus.requirements?.min_direct_deposit_total && !currentBonus.bonus.requirements?.min_direct_deposit_per_deposit && (
                    <div style={{ fontSize: 14, color: "#555" }}>Set up direct deposit to qualify</div>
                  )}
                  {currentBonus.bonus.fees?.monthly_fee && currentBonus.bonus.fees.monthly_fee > 0 ? (
                    <div style={{ fontSize: 13, color: "#999" }}>Avoid ${currentBonus.bonus.fees.monthly_fee}/mo fee by setting up direct deposit</div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#0d7c5f" }}>No monthly fee</div>
                  )}
                </div>

                <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                  {bestLink(currentBonus.bonus.source_links) && (
                    <a href={bestLink(currentBonus.bonus.source_links)!} target="_blank" rel="noreferrer"
                      style={{ padding: "16px 36px", fontSize: 16, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 12, textDecoration: "none", textAlign: "center" as const, display: "inline-block" }}>
                      Open your account
                    </a>
                  )}
                  <button onClick={() => { setActionBonus({ bonus: currentBonus.bonus, mode: "start" }); setActionDate(todayStr()) }}
                    style={{ padding: "16px 24px", fontSize: 14, color: "#888", background: "none", border: "1px solid #ddd", borderRadius: 12, cursor: "pointer" }}>
                    I already opened it
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                 CURRENTLY WORKING ON — Checklist cards
                 Supports single or multiple active bonuses
                 ══════════════════════════════════════════════════════════════════ */}
            {(() => {
              const activeBonuses = allowMultiple ? inProgress : inProgress.slice(0, 1)
              if (activeBonuses.length === 0) return null

              return (
                <div style={{ marginBottom: 20 }}>
                  {activeBonuses.length > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Currently working on</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                      const daysPerPay = DAYS_PER_PAY[profile.pay_frequency] ?? 14
                      let depositsNeeded = 1
                      if (req?.dd_count_required) depositsNeeded = req.dd_count_required
                      else if (totalRequired && profile.paycheck_amount > 0) depositsNeeded = Math.ceil(totalRequired / profile.paycheck_amount)
                      const depositsSoFar = Math.min(depositsNeeded, Math.max(0, Math.floor(daysSinceOpen / daysPerPay)))
                      const depositedSoFar = Math.min(totalRequired, depositsSoFar * profile.paycheck_amount)

                      const isDetailsExpanded = expandedDetails === b.id

                      // Fee avoidance info
                      const hasFee = fees?.monthly_fee && fees.monthly_fee > 0
                      const feeWaiverText = fees?.monthly_fee_waiver_text ?? null

                      return (
                        <div key={b.id} style={{
                          background: "#fff", border: "2px solid #2563eb", borderRadius: 14, overflow: "hidden",
                          boxShadow: "0 2px 12px rgba(37,99,235,0.05)",
                        }}>
                          {/* ── Header: Bank + Amount ── */}
                          <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{b.bank_name}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                          </div>

                          {/* ── Checklist ── */}
                          <div style={{ padding: "16px 24px 0" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#999", marginBottom: 8 }}>Steps to unlock {money(b.bonus_amount)}</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {milestoneDetail.milestones
                                .filter((m) => m.key !== "safe_to_close")
                                .map((m) => {
                                const isCompleted = m.status === "completed"
                                const isActive = m.status === "active"
                                const isUpcoming = m.status === "upcoming"

                                // Click handler: if unchecked (active/upcoming), advance to the NEXT milestone after this one
                                // If already completed, do nothing
                                const handleCheck = () => {
                                  if (isCompleted) return
                                  // Find the milestone AFTER the clicked one to advance past it
                                  const allKeys: MilestoneKey[] = ["account_opened", "dd_confirmed", "deposit_met", "bonus_posted"]
                                  const clickedIdx = allKeys.indexOf(m.key as MilestoneKey)
                                  if (clickedIdx >= 0 && clickedIdx < allKeys.length - 1) {
                                    handleMilestoneOverride(b.id, allKeys[clickedIdx + 1])
                                  } else if (m.key === "bonus_posted") {
                                    handleMilestoneOverride(b.id, "bonus_posted")
                                  }
                                }

                                return (
                                  <div key={m.key}
                                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: isCompleted ? "default" : "pointer", borderRadius: 6 }}
                                    onClick={handleCheck}>
                                    {/* Checkbox */}
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
                                    {/* Label */}
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

                          {/* ── Deposit progress ── */}
                          {totalRequired > 0 && !milestoneDetail.bonusPosted && (
                            <div style={{ padding: "12px 24px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#999" }}>Deposit progress</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>${depositedSoFar.toLocaleString()} of ${totalRequired.toLocaleString()}</span>
                              </div>
                              <div style={{ height: 4, background: "#e8e8e8", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: 2, background: "#0d7c5f",
                                  width: `${totalRequired > 0 ? Math.min(100, (depositedSoFar / totalRequired) * 100) : 0}%`,
                                  transition: "width 0.3s ease",
                                }} />
                              </div>
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

                          {/* ── Close account action ── */}
                          {milestoneDetail.bonusPosted && (
                            <div style={{ padding: "12px 24px 0" }}>
                              <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                                style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                Close account and collect
                              </button>
                            </div>
                          )}
                          {!milestoneDetail.bonusPosted && (
                            <div style={{ padding: "12px 24px 0" }}>
                              <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(false); setActualAmount("") }}
                                style={{ fontSize: 12, color: "#bbb", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                Close account early
                              </button>
                            </div>
                          )}

                          {/* ── Bonus details (expandable) ── */}
                          <div style={{ padding: "14px 24px 4px" }}>
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
                            </div>
                          )}

                          {/* ── Remove (always quiet) ── */}
                          <div style={{ padding: "4px 24px 16px", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => handleDelete(b.id)}
                              style={{ fontSize: 11, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                              Remove bonus
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
            {upNextBonuses.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Available next</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upNextBonuses.map(({ bonus: b, weeksToComplete, churnStatus }, i) => {
                    const isActive = churnStatus.status === "in_progress"
                    const record = isActive ? completedRecords.find(r => r.bonus_id === b.id && !r.closed_date) : null
                    const mDetail = record ? getMilestoneDetail(b, record, profile.pay_frequency, profile.paycheck_amount) : null
                    const weeksUntil = i === 0 ? (currentBonus?.weeksToComplete ?? 0) : (currentBonus?.weeksToComplete ?? 0) + (upNextBonuses[0]?.weeksToComplete ?? 0)

                    return (
                      <div key={b.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{b.bank_name}</div>
                            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                              {isActive
                                ? (mDetail ? `Next: ${mDetail.nextStep}` : "In progress")
                                : `Available in ~${weeksUntil} weeks`
                              }
                            </div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</div>
                        </div>
                        {isActive && (
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            {mDetail?.safeToClose && mDetail?.bonusPosted && (
                              <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                                style={{ fontSize: 12, padding: "6px 14px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Close and collect</button>
                            )}
                            <button onClick={() => handleDelete(b.id)}
                              style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #e0e0e0", color: "#bbb", background: "none", borderRadius: 8, cursor: "pointer" }}>Remove</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sequencer Results (from refresh) */}
            {sequencerResult && (
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Your Optimized Stack</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{sequencerResult.slots.flat().filter(e => e.type === "bonus").length} bonuses · ${sequencerResult.total_bonus.toLocaleString()} total</div>
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
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(b.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

            {/* ── Earnings History ── */}
            {allEarned.length > 0 && (
              <details style={{ marginBottom: 24 }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Earnings history ({allEarned.length})</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {allEarned.sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime()).map(r => {
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

            {/* ── Custom Bonuses ── */}
            {(activeCustom.length > 0 || closedCustom.length > 0) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Your custom bonuses</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeCustom.map(c => (
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.bank_name}</div>
                            <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Opened {fmtShortDate(c.opened_date)}{c.notes ? ` · ${c.notes}` : ""}</div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: "#2563eb" }}>In progress</span>
                            {c.cooldown_months && <span style={{ fontSize: 10, color: "#d97706" }}>· Churnable every {c.cooldown_months}mo</span>}
                            {!c.cooldown_months && <span style={{ fontSize: 10, color: "#bbb" }}>· One-time</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>{money(c.bonus_amount)}</div>
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
                    <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "12px 20px", opacity: 0.7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{c.bank_name}</span>
                            <span style={{ fontSize: 10, color: "#999", background: "#f0f0f0", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Custom</span>
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
