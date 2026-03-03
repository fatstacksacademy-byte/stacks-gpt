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

const FREQ_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
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
  const [onboardingStep, setOnboardingStep] = useState<"setup" | "sequencer" | "done">("done")
  const [sequencerResult, setSequencerResult] = useState<SequencerResult | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true)
    const records = await getCompletedBonuses(userId)
    setCompletedRecords(records)
    setLoadingRecords(false)
  }, [userId])

  useEffect(() => { loadRecords() }, [loadRecords])

  useEffect(() => {
    if (!loadingRecords && completedRecords.length === 0 && loaded) {
      const isDefault = profile.paycheck_amount === 1500 && profile.pay_frequency === "biweekly" && profile.dd_slots === 1
      if (isDefault) setOnboardingStep("setup")
    }
  }, [loadingRecords, completedRecords.length, loaded, profile.paycheck_amount, profile.pay_frequency, profile.dd_slots])

  function handleOnboardingComplete() {
    const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setOnboardingStep("sequencer")
  }

  function handleSequencerDone() {
    setOnboardingStep("done")
    setSequencerResult(null)
  }

  function handleRefreshSequencer() {
    const result = runSequencer({ slots: profile.dd_slots, payFrequency: profile.pay_frequency, paycheckAmount: profile.paycheck_amount, completedRecords })
    setSequencerResult(result)
    setShowAdvanced(false)
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

  const expectedThisYear = [...inProgress, ...available.slice(0, 6)]
    .filter(b => b.feasible !== false)
    .reduce((sum, b) => sum + b.bonus.bonus_amount, 0)

  const currentBonus = inProgress[0] ?? available[0] ?? null
  const upNextBonuses = currentBonus
    ? (inProgress.length > 0
      ? [...inProgress.slice(1), ...available.slice(0, Math.max(0, 2 - inProgress.length + 1))].slice(0, 2)
      : available.slice(1, 3))
    : []

  if (!mounted || loadingRecords) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#555", fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8" }}>
      {/* Top Bar */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto" }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>Stacks OS</span>
        {onboardingStep === "done" && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setShowSettings(s => !s)} style={topBtn}>{showSettings ? "Close settings" : "Pay settings"}</button>
            <button onClick={handleRefreshSequencer} style={{ ...topBtn, color: "#34d399", borderColor: "#1a3a2a" }}>Refresh bonuses</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 80px" }}>

        {/* Settings Panel */}
        {showSettings && onboardingStep === "done" && (
          <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Pay Profile</div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={settingsLabel}>Direct deposit slots</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setProfile({ dd_slots: n })} style={{ ...segBtn, ...(profile.dd_slots === n ? segBtnActive : {}) }}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={settingsLabel}>Pay frequency</div>
                <select value={profile.pay_frequency} onChange={e => setProfile({ pay_frequency: e.target.value as PayFrequency })} style={settingsSelect}>
                  {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <div style={settingsLabel}>Paycheck amount</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 14 }}>$</span>
                  <input type="number" value={profile.paycheck_amount} onChange={e => setProfile({ paycheck_amount: Number(e.target.value) })} style={settingsInput} min={0} step={100} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 12 }}>Changes save automatically</div>
          </div>
        )}

        {/* ONBOARDING: SETUP */}
        {onboardingStep === "setup" && (
          <div style={{ maxWidth: 520, margin: "0 auto", paddingTop: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Welcome to Stacks OS</h1>
            <p style={{ fontSize: 15, color: "#666", marginTop: 10, lineHeight: 1.6 }}>We find the best bank bonuses for your paycheck and walk you through every step. Takes 30 seconds.</p>
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={setupLabel}>How many direct deposit slots does your employer allow?</div>
                <div style={setupHint}>Most employers allow at least 2. Not sure? Start with 1.</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setProfile({ dd_slots: n })} style={{ ...setupSegBtn, ...(profile.dd_slots === n ? setupSegBtnActive : {}) }}>{n} slot{n > 1 ? "s" : ""}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={setupLabel}>How often do you get paid?</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {FREQ_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => setProfile({ pay_frequency: f.value })} style={{ ...setupSegBtn, ...(profile.pay_frequency === f.value ? setupSegBtnActive : {}) }}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={setupLabel}>What is your paycheck amount (after taxes)?</div>
                <div style={setupHint}>Per paycheck, not per month. A rough estimate is fine.</div>
                <div style={{ position: "relative", marginTop: 10, maxWidth: 200 }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 18 }}>$</span>
                  <input type="number" value={profile.paycheck_amount} onChange={e => setProfile({ paycheck_amount: Number(e.target.value) })} style={setupPayInput} min={0} step={100} />
                </div>
              </div>
            </div>
            <button onClick={handleOnboardingComplete} style={setupContinueBtn}>Find my bonuses \u2192</button>
          </div>
        )}

        {/* ONBOARDING: SEQUENCER RESULTS */}
        {onboardingStep === "sequencer" && sequencerResult && (
          <div style={{ maxWidth: 680, margin: "0 auto", paddingTop: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>Here is your bonus plan</h2>
            <p style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
              Based on your paycheck, we found {sequencerResult.slots.flat().filter(e => e.type === "bonus").length} bonuses worth <span style={{ color: "#34d399", fontWeight: 700 }}>${sequencerResult.total_bonus.toLocaleString()}</span>. Start with the best one.
            </p>
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
              {sequencerResult.slots.flat().filter(e => e.type === "bonus").slice(0, 3).map((entry, i) => {
                const b = entry as SequencedBonus
                const fullBonus = allBonuses.find(x => x.id === b.id)
                if (!fullBonus) return null
                const isFirst = i === 0
                return (
                  <div key={`${b.id}-${b.cycle}`} style={{
                    background: isFirst ? "linear-gradient(135deg, #111 0%, #1a1a2e 100%)" : "#111",
                    border: isFirst ? "1px solid #2a2a2a" : "1px solid #1a1a1a", borderRadius: 12,
                    padding: isFirst ? "28px 24px" : "18px 24px",
                  }}>
                    {isFirst && <div style={{ fontSize: 11, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>Start here</div>}
                    {!isFirst && <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>Then</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: isFirst ? 20 : 16, fontWeight: 700, color: "#fff" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>~{b.weeks_to_complete} weeks{b.monthly_fee ? ` \u00b7 ${money(b.monthly_fee)} fee` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: isFirst ? 24 : 18, fontWeight: 700, color: "#34d399" }}>{money(b.bonus_amount)}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>${b.velocity.toFixed(0)}/week</div>
                      </div>
                    </div>
                    {isFirst && (
                      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                        <button onClick={() => { setActionBonus({ bonus: fullBonus, mode: "start" }); setActionDate(todayStr()) }} style={heroCTA}>Start this bonus</button>
                        {bestLink(fullBonus.source_links) && (
                          <a href={bestLink(fullBonus.source_links)!} target="_blank" rel="noreferrer" style={heroSecondary}>Open bank site</a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={handleSequencerDone} style={{ ...heroSecondary, width: "100%", marginTop: 20, display: "block", textAlign: "center", cursor: "pointer", border: "1px solid #333" }}>Go to dashboard \u2192</button>
          </div>
        )}

        {/* MAIN DASHBOARD */}
        {onboardingStep === "done" && (
          <>
            {/* Expected Earnings */}
            <div style={{
              background: "linear-gradient(135deg, #0d1117 0%, #111827 100%)",
              border: "1px solid #1a1a1a", borderRadius: 14, padding: "28px 32px", marginBottom: 28,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>Expected earnings this year</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#34d399", marginTop: 4, letterSpacing: "-0.02em" }}>${expectedThisYear.toLocaleString()}</div>
                {totalEarned > 0 && <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>${totalEarned.toLocaleString()} earned so far \u00b7 {allEarned.length} bonus{allEarned.length !== 1 ? "es" : ""} completed</div>}
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                {inProgress.length > 0 && <Stat value={inProgress.length} label="Active" color="#60a5fa" />}
                <Stat value={available.length} label="Available" color="#fff" />
                {inCooldown.length > 0 && <Stat value={inCooldown.length} label="Cooling" color="#fbbf24" />}
              </div>
            </div>

            {/* Sequencer Results (when refreshed) */}
            {sequencerResult && (
              <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Your Optimized Stack</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{sequencerResult.slots.flat().filter(e => e.type === "bonus").length} bonuses \u00b7 ${sequencerResult.total_bonus.toLocaleString()} total</div>
                  </div>
                  <button onClick={() => setSequencerResult(null)} style={topBtn}>Hide</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sequencerResult.slots.flat().filter(e => e.type === "bonus").slice(0, 5).map((entry, i) => {
                    const b = entry as SequencedBonus
                    return (
                      <div key={`${b.id}-${b.cycle}-seq`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0a0a0a", borderRadius: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#555", fontWeight: 600, width: 18 }}>{i + 1}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{b.bank_name}</span>
                          <span style={{ fontSize: 11, color: "#555" }}>~{b.weeks_to_complete}w</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>{money(b.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Hero Card */}
            {currentBonus && (
              <div style={{
                background: "linear-gradient(135deg, #111 0%, #1a1a2e 100%)",
                border: "1px solid #2a2a2a", borderRadius: 14, padding: "32px 28px", marginBottom: 16,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 11, color: currentBonus.churnStatus.status === "in_progress" ? "#60a5fa" : "#34d399", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>
                    {currentBonus.churnStatus.status === "in_progress" ? "Currently working on" : "Recommended next"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{currentBonus.bonus.bank_name}</div>
                      <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                        <HeroStat label="Earn" value={money(currentBonus.bonus.bonus_amount)} color="#34d399" />
                        <HeroStat label="Time" value={currentBonus.weeksToComplete ? `${currentBonus.weeksToComplete}w` : "\u2014"} color="#fff" />
                        <HeroStat label="Fee" value={currentBonus.bonus.fees?.monthly_fee === 0 ? "$0" : money(currentBonus.bonus.fees?.monthly_fee)} color="#fff" />
                      </div>
                      <div style={{ fontSize: 13, color: "#777", marginTop: 14, lineHeight: 1.6, maxWidth: 480 }}>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 170 }}>
                      {currentBonus.churnStatus.status === "in_progress" ? (
                        <>
                          <button onClick={() => { setActionBonus({ bonus: currentBonus.bonus, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(currentBonus.bonus.bonus_amount)) }} style={{ ...heroCTA, background: "#ef4444" }}>Close account</button>
                          <button onClick={() => handleDelete(currentBonus.bonus.id)} style={heroSecondary}>Undo</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setActionBonus({ bonus: currentBonus.bonus, mode: "start" }); setActionDate(todayStr()) }} style={heroCTA}>Start this bonus</button>
                          {bestLink(currentBonus.bonus.source_links) && <a href={bestLink(currentBonus.bonus.source_links)!} target="_blank" rel="noreferrer" style={heroSecondary}>Open bank site</a>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Up Next */}
            {upNextBonuses.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${upNextBonuses.length}, 1fr)`, gap: 12, marginBottom: 28 }}>
                {upNextBonuses.map(({ bonus: b, velocity, weeksToComplete, churnStatus }) => {
                  const isActive = churnStatus.status === "in_progress"
                  const record = isActive ? completedRecords.find(r => r.bonus_id === b.id && !r.closed_date) : null
                  const stepDetail = record ? getBonusStepDetail(b, record, profile.pay_frequency, profile.paycheck_amount) : null
                  return (
                    <div key={b.id} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 12, padding: "20px 22px" }}>
                      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>{isActive ? "In progress" : "Up next"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{b.bank_name}</div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>~{weeksToComplete ?? "?"}w{b.fees?.monthly_fee ? ` \u00b7 ${money(b.fees.monthly_fee)} fee` : ""}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#34d399" }}>{money(b.bonus_amount)}</div>
                      </div>
                      {stepDetail && <div style={{ marginTop: 10 }}><StepProgressBar detail={stepDetail} onOverride={(step) => handleStepOverride(b.id, step)} /></div>}
                      {!isActive && (
                        <button onClick={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                          style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 13, fontWeight: 600, background: "#1a1a1a", color: "#34d399", border: "1px solid #1a3a2a", borderRadius: 8, cursor: "pointer" }}>
                          Start this bonus
                        </button>
                      )}
                      {isActive && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                            style={{ flex: 1, padding: "8px", fontSize: 12, border: "1px solid #ef4444", color: "#ef4444", background: "none", borderRadius: 8, cursor: "pointer" }}>Close account</button>
                          <button onClick={() => handleDelete(b.id)} style={{ padding: "8px 12px", fontSize: 12, border: "1px solid #222", color: "#555", background: "none", borderRadius: 8, cursor: "pointer" }}>Undo</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cooldown */}
            {inCooldown.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Cooling Down</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {inCooldown.map(({ bonus: b, churnStatus }) => {
                    const s = churnStatus as Extract<ChurnStatus, { status: "in_cooldown" }>
                    return (
                      <div key={b.id} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, padding: "14px 18px", minWidth: 200, opacity: 0.7 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>{s.days_remaining} days left</div>
                        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Available {fmtShortDate(s.available_date)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Earnings */}
            {allEarned.length > 0 && (
              <details style={{ marginBottom: 28 }}>
                <summary style={{ fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", padding: "8px 0" }}>Earnings History <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>({allEarned.length})</span></summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {allEarned.sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime()).map(r => {
                    const bonus = allBonuses.find(b => b.id === r.bonus_id)
                    if (!bonus) return null
                    return (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#111", borderRadius: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{bonus.bank_name} <span style={{ fontSize: 12, color: "#555" }}>{fmtShortDate(r.closed_date!)}</span></span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>{money(r.actual_amount ?? bonus.bonus_amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* Advanced Toggle */}
            <button onClick={() => setShowAdvanced(a => !a)}
              style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 600, background: "#111", border: "1px solid #1a1a1a", borderRadius: 10, color: "#555", cursor: "pointer", marginBottom: 16 }}>
              {showAdvanced ? "Hide all bonuses" : `Show all ${available.length + inProgress.length} bonuses`}
            </button>

            {showAdvanced && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {[...inProgress, ...available].map(({ bonus: b, velocity, weeksToComplete, feasible, churnStatus }) => {
                  const isActive = churnStatus.status === "in_progress"
                  const link = bestLink(b.source_links)
                  const isExpanded = expandedCard === b.id
                  return (
                    <div key={b.id} style={{
                      background: "#111", border: isActive ? "1px solid #2a3f5f" : "1px solid #1a1a1a",
                      borderRadius: 12, padding: "18px 20px", opacity: feasible !== false ? 1 : 0.4,
                      cursor: "pointer", transition: "border-color 0.15s",
                    }}
                      onClick={() => setExpandedCard(isExpanded ? null : b.id)}
                      onMouseOver={e => { e.currentTarget.style.borderColor = "#333" }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = isActive ? "#2a3f5f" : "#1a1a1a" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.bank_name}</div>
                          {isActive && <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 2 }}>Active</div>}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#34d399" }}>{money(b.bonus_amount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12 }}>
                        <span><span style={{ color: "#555" }}>Time </span><span style={{ color: "#999" }}>{weeksToComplete ? `${weeksToComplete}w` : "\u2014"}</span></span>
                        <span><span style={{ color: "#555" }}>Fee </span><span style={{ color: "#999" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></span>
                        {velocity && <span><span style={{ color: "#555" }}>$/wk </span><span style={{ color: "#34d399" }}>${velocity.toFixed(0)}</span></span>}
                      </div>
                      {isExpanded && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6, marginBottom: 10 }}>
                            {b.requirements?.min_direct_deposit_total
                              ? `Deposit $${b.requirements.min_direct_deposit_total.toLocaleString()} within ${b.requirements.deposit_window_days ?? "\u2014"} days.`
                              : b.requirements?.min_direct_deposit_per_deposit
                                ? `${b.requirements.dd_count_required ?? "1"}\u00d7 deposits of $${b.requirements.min_direct_deposit_per_deposit.toLocaleString()}+`
                                : "Set up direct deposit."}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 10 }}>
                            <div><span style={{ color: "#555" }}>Window: </span><span style={{ color: "#999" }}>{numOrDash(b.requirements?.deposit_window_days, "days")}</span></div>
                            <div><span style={{ color: "#555" }}>Bonus posts: </span><span style={{ color: "#999" }}>{numOrDash(b.timeline?.bonus_posting_days_est, "days")}</span></div>
                            <div><span style={{ color: "#555" }}>Cooldown: </span><span style={{ color: "#999" }}>{(b as any).cooldown_months == null ? "One-time" : `${(b as any).cooldown_months}mo`}</span></div>
                            <div><span style={{ color: "#555" }}>Fee: </span><span style={{ color: "#999" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
                          </div>
                          <details><summary style={{ fontSize: 11, color: "#444", cursor: "pointer" }}>Advanced details</summary>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginTop: 8 }}>
                              <div><span style={{ color: "#555" }}>Chex: </span><span style={{ color: "#999" }}>{textOrDash(b.screening?.chex_sensitive)}</span></div>
                              <div><span style={{ color: "#555" }}>Hard pull: </span><span style={{ color: "#999" }}>{yesNo(b.screening?.hard_pull)}</span></div>
                              <div><span style={{ color: "#555" }}>Lifetime: </span><span style={{ color: "#999" }}>{yesNo(b.eligibility?.lifetime_language)}</span></div>
                            </div>
                            {b.eligibility?.eligibility_notes && <div style={{ fontSize: 11, color: "#666", marginTop: 8, lineHeight: 1.5 }}>{b.eligibility.eligibility_notes}</div>}
                          </details>
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            {isActive ? (
                              <>
                                <button onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                                  style={{ flex: 1, padding: "8px", fontSize: 12, border: "1px solid #ef4444", color: "#ef4444", background: "none", borderRadius: 8, cursor: "pointer" }}>Close</button>
                                <button onClick={() => handleDelete(b.id)} style={{ padding: "8px 12px", fontSize: 12, border: "1px solid #222", color: "#555", background: "none", borderRadius: 8, cursor: "pointer" }}>Undo</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                                  style={{ flex: 1, padding: "8px", fontSize: 13, fontWeight: 600, background: "#34d399", color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer" }}>Start</button>
                                {link && <a href={link} target="_blank" rel="noreferrer" style={{ padding: "8px 14px", fontSize: 12, color: "#888", border: "1px solid #333", borderRadius: 8, textDecoration: "none" }}>Open site</a>}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", borderRadius: 16, padding: 32, width: 400, border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "#fff" }}>{actionBonus.bonus.bank_name}</div>
            {actionBonus.mode === "start" && (
              <>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>When did you open this account?</div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={modalActions}>
                  <button onClick={() => setActionBonus(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleStart} style={confirmBtn}>Start Bonus</button>
                </div>
              </>
            )}
            {actionBonus.mode === "close" && (
              <>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>When did you close this account?</div>
                <label style={modalLabel}>Account closed date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 12px" }}>
                  <input type="checkbox" id="bonusReceived" checked={bonusReceived} onChange={e => setBonusReceived(e.target.checked)} style={{ accentColor: "#34d399" }} />
                  <label htmlFor="bonusReceived" style={{ fontSize: 13, color: "#999" }}>I received the bonus</label>
                </div>
                {bonusReceived && (
                  <>
                    <label style={modalLabel}>Amount received</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14 }}>$</span>
                      <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} style={{ ...modalInput, paddingLeft: 24 }} placeholder={String(actionBonus.bonus.bonus_amount)} />
                    </div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Listed: ${actionBonus.bonus.bonus_amount.toLocaleString()}</div>
                  </>
                )}
                <div style={modalActions}>
                  <button onClick={() => setActionBonus(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleClose} style={confirmBtn}>Close Account</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tiny helper components ── */
function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#555" }}>{label}</div>
    </div>
  )
}

function HeroStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

/* ── Styles ── */
const topBtn: React.CSSProperties = { fontSize: 12, color: "#555", background: "none", border: "1px solid #222", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const settingsLabel: React.CSSProperties = { fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const segBtn: React.CSSProperties = { padding: "6px 14px", fontSize: 13, background: "#0a0a0a", color: "#666", border: "1px solid #222", borderRadius: 6, cursor: "pointer" }
const segBtnActive: React.CSSProperties = { background: "#34d399", color: "#0a0a0a", borderColor: "#34d399", fontWeight: 700 }
const settingsSelect: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#0a0a0a", color: "#fff", border: "1px solid #222", borderRadius: 6 }
const settingsInput: React.CSSProperties = { padding: "8px 12px 8px 26px", fontSize: 14, background: "#0a0a0a", color: "#fff", border: "1px solid #222", borderRadius: 6, width: 140 }
const setupLabel: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: "#fff" }
const setupHint: React.CSSProperties = { fontSize: 12, color: "#555", marginTop: 4 }
const setupSegBtn: React.CSSProperties = { padding: "10px 20px", fontSize: 14, background: "#111", color: "#888", border: "1px solid #222", borderRadius: 8, cursor: "pointer" }
const setupSegBtnActive: React.CSSProperties = { background: "#34d399", color: "#0a0a0a", borderColor: "#34d399", fontWeight: 700 }
const setupPayInput: React.CSSProperties = { padding: "12px 14px 12px 32px", fontSize: 18, background: "#111", color: "#fff", border: "1px solid #222", borderRadius: 8, width: "100%" }
const setupContinueBtn: React.CSSProperties = { marginTop: 36, padding: "16px 32px", fontSize: 16, fontWeight: 700, background: "#34d399", color: "#0a0a0a", border: "none", borderRadius: 10, cursor: "pointer", width: "100%" }
const heroCTA: React.CSSProperties = { padding: "12px 28px", fontSize: 15, fontWeight: 700, background: "#34d399", color: "#0a0a0a", border: "none", borderRadius: 10, cursor: "pointer" }
const heroSecondary: React.CSSProperties = { padding: "12px 28px", fontSize: 13, fontWeight: 600, color: "#888", border: "1px solid #333", borderRadius: 10, textDecoration: "none", textAlign: "center" as const, display: "inline-block" }
const modalLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 6 }
const modalInput: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #333", borderRadius: 8, boxSizing: "border-box" as const, background: "#0a0a0a", color: "#fff" }
const modalActions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }
const cancelBtn: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "1px solid #333", borderRadius: 8, background: "none", color: "#888", cursor: "pointer" }
const confirmBtn: React.CSSProperties = { padding: "10px 20px", fontSize: 13, border: "none", borderRadius: 8, background: "#34d399", color: "#0a0a0a", cursor: "pointer", fontWeight: 700 }
