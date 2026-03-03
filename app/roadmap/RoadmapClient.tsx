"use client"

import React, { useEffect, useState, useCallback } from "react"
import StepProgressBar from "../components/StepProgressBar"
import { getBonusStepDetail } from "../../lib/bonusSteps"
import { updateBonusStep } from "../../lib/completedBonuses"
import { useProfile } from "../../lib/useProfile"
import { bonuses as allBonuses } from "../../lib/data/bonuses"
import { getChurnStatus, fmtShortDate, ChurnStatus, CompletedBonus } from "../../lib/churn"
import { getCompletedBonuses, markBonusStarted, markBonusClosed, deleteCompletedBonus } from "../../lib/completedBonuses"

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
  if (perDepositMin && paycheckAmount < perDepositMin) {
    return { velocity: null, weeksToComplete: null, feasible: false, reason: `Paycheck $${paycheckAmount} below $${perDepositMin}/deposit minimum` }
  }
  if (totalMin && windowDays) {
    const maxDeposits = Math.max(1, Math.ceil(windowDays / daysPerPay))
    if (maxDeposits * paycheckAmount < totalMin) {
      return { velocity: null, weeksToComplete: null, feasible: false, reason: `Can only deposit ~$${(maxDeposits * paycheckAmount).toLocaleString()} in ${windowDays}-day window, need $${totalMin.toLocaleString()}` }
    }
  }
  let ddCount = ddCountRequired
  if (!ddCount && totalMin) ddCount = Math.ceil(totalMin / paycheckAmount)
  if (!ddCount) ddCount = 1
  const weeksToComplete = Math.ceil((ddCount * daysPerPay) / 7)
  return { velocity: bonus.bonus_amount / weeksToComplete, weeksToComplete, feasible: true, reason: undefined }
}

function money(n: number | null | undefined) { return n == null ? "—" : `$${n.toLocaleString()}` }
function yesNo(v: boolean | null | undefined) { return v == null ? "—" : v ? "Yes" : "No" }
function textOrDash(v: string | null | undefined) { return v || "—" }
function numOrDash(v: number | null | undefined, suffix?: string) { return v == null ? "—" : suffix ? `${v} ${suffix}` : `${v}` }
function bestLink(links: string[] | null | undefined) { return links?.[0] ?? null }
function todayStr() { return new Date().toISOString().split("T")[0] }

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export default function RoadmapClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const { profile, loaded } = useProfile()
  const [mounted, setMounted] = useState(false)
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [actionBonus, setActionBonus] = useState<{ bonus: Bonus; mode: "start" | "close" } | null>(null)
  const [actionDate, setActionDate] = useState(todayStr())
  const [bonusReceived, setBonusReceived] = useState(true)
  const [actualAmount, setActualAmount] = useState<string>("")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showAllAvailable, setShowAllAvailable] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true)
    const records = await getCompletedBonuses(userId)
    setCompletedRecords(records)
    setLoadingRecords(false)
  }, [userId])

  useEffect(() => { loadRecords() }, [loadRecords])

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

  // ── Compute bonus metadata ──
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

  const inCooldown = bonusesWithMeta
    .filter(b => b.churnStatus.status === "in_cooldown")
    .sort((a, b) => {
      const ad = a.churnStatus.status === "in_cooldown" ? a.churnStatus.days_remaining : 0
      const bd = b.churnStatus.status === "in_cooldown" ? b.churnStatus.days_remaining : 0
      return ad - bd
    })

  const lifetime = bonusesWithMeta.filter(b => b.churnStatus.status === "lifetime")

  // Earnings
  const allEarned = completedRecords.filter(r => r.bonus_received && r.closed_date)
  const earnedAmt = (r: CompletedBonus) => { const b = allBonuses.find(x => x.id === r.bonus_id); return r.actual_amount ?? b?.bonus_amount ?? 0 }
  const totalEarned = allEarned.reduce((sum, r) => sum + earnedAmt(r), 0)

  const isNewUser = completedRecords.length === 0 && !loadingRecords
  const topBonus = available[0]

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8" }}>
      {/* ── Top Bar ── */}
      <div style={{
        borderBottom: "1px solid #1a1a1a",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>Stacks OS</span>
          {totalEarned > 0 && (
            <span style={{ fontSize: 13, color: "#34d399", fontWeight: 600 }}>${totalEarned.toLocaleString()} earned</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {inProgress.length > 0 && (
            <span style={{ fontSize: 12, color: "#60a5fa", background: "#1e3a5f", padding: "4px 10px", borderRadius: 99 }}>
              {inProgress.length} active
            </span>
          )}
          {inCooldown.length > 0 && (
            <span style={{ fontSize: 12, color: "#fbbf24", background: "#3d2e0a", padding: "4px 10px", borderRadius: 99 }}>
              {inCooldown.length} cooling down
            </span>
          )}
          <a href="/roadmap/sequencer" style={{ fontSize: 12, color: "#888", textDecoration: "none", borderBottom: "1px solid #333" }}>
            Sequencer
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* ═══════════════════════════════════
           NEW USER ONBOARDING
           ═══════════════════════════════════ */}
        {isNewUser && topBonus && (
          <div style={{ marginBottom: 48 }}>
            {/* Welcome */}
            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
                Welcome to Stacks OS
              </h1>
              <p style={{ fontSize: 15, color: "#777", marginTop: 8, maxWidth: 500, lineHeight: 1.5 }}>
                We find bank bonuses you qualify for, then walk you through every step to earn them. Let's start with your best one.
              </p>
            </div>

            {/* Hero Card — Your First Bonus */}
            <div style={{
              background: "linear-gradient(135deg, #111 0%, #1a1a2e 100%)",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 40,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -60, right: -60, width: 200, height: 200,
                background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)",
                borderRadius: "50%",
              }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#34d399", marginBottom: 16, fontWeight: 600 }}>
                  Recommended first bonus
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>
                      {topBonus.bonus.bank_name}
                    </h2>
                    <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>You'll earn</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", marginTop: 2 }}>{money(topBonus.bonus.bonus_amount)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                          {topBonus.weeksToComplete ? `${topBonus.weeksToComplete} wks` : "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly fee</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                          {topBonus.bonus.fees?.monthly_fee === 0 ? "$0" : money(topBonus.bonus.fees?.monthly_fee)}
                        </div>
                      </div>
                    </div>
                    {/* What you need */}
                    <div style={{ marginTop: 20, fontSize: 13, color: "#888", lineHeight: 1.6, maxWidth: 480 }}>
                      {topBonus.bonus.requirements?.min_direct_deposit_total
                        ? `Deposit $${topBonus.bonus.requirements.min_direct_deposit_total.toLocaleString()} total within ${topBonus.bonus.requirements.deposit_window_days ?? "—"} days using your regular paycheck.`
                        : topBonus.bonus.requirements?.min_direct_deposit_per_deposit
                          ? `Make ${topBonus.bonus.requirements.dd_count_required ?? "a"} direct deposit${(topBonus.bonus.requirements.dd_count_required ?? 0) > 1 ? "s" : ""} of $${topBonus.bonus.requirements.min_direct_deposit_per_deposit.toLocaleString()}+ each.`
                          : "Set up direct deposit to qualify."
                      }
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 180 }}>
                    <button
                      onClick={() => { setActionBonus({ bonus: topBonus.bonus, mode: "start" }); setActionDate(todayStr()) }}
                      style={{
                        padding: "14px 28px", fontSize: 15, fontWeight: 700,
                        background: "#34d399", color: "#0a0a0a", border: "none",
                        borderRadius: 10, cursor: "pointer",
                        transition: "transform 0.1s",
                      }}
                      onMouseOver={e => (e.currentTarget.style.transform = "scale(1.03)")}
                      onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
                    >
                      Start this bonus
                    </button>
                    {bestLink(topBonus.bonus.source_links) && (
                      <a
                        href={bestLink(topBonus.bonus.source_links)!}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "10px 28px", fontSize: 13, fontWeight: 600,
                          color: "#888", border: "1px solid #333",
                          borderRadius: 10, textDecoration: "none", textAlign: "center",
                        }}
                      >
                        Open bank site
                      </a>
                    )}
                  </div>
                </div>

                {/* How it works — 4 steps */}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #222" }}>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>How it works</div>
                  <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                    {["Open the account", "Fund with paychecks", "Wait for bonus", "Close & collect"].map((label, i) => (
                      <React.Fragment key={i}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", minWidth: 80 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", border: "1px solid #333",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "#666",
                          }}>{i + 1}</div>
                          <span style={{ fontSize: 11, color: "#666", marginTop: 6, textAlign: "center", maxWidth: 90 }}>{label}</span>
                        </div>
                        {i < 3 && <div style={{ flex: 1, height: 1, background: "#222", marginTop: 14, minWidth: 16 }} />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* All available — collapsed preview */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>All available bonuses</h2>
                <span style={{ fontSize: 12, color: "#555" }}>{available.length} bonuses</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {available.slice(0, showAllAvailable ? 999 : 6).map(({ bonus: b, velocity, weeksToComplete, feasible }) => (
                  <BonusCard
                    key={b.id}
                    bonus={b}
                    velocity={velocity}
                    weeksToComplete={weeksToComplete}
                    feasible={feasible}
                    isExpanded={expandedCard === b.id}
                    onExpand={() => setExpandedCard(expandedCard === b.id ? null : b.id)}
                    onStart={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                  />
                ))}
              </div>
              {available.length > 6 && !showAllAvailable && (
                <button
                  onClick={() => setShowAllAvailable(true)}
                  style={{ marginTop: 16, fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "10px 20px", cursor: "pointer", width: "100%" }}
                >
                  Show all {available.length} bonuses
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════
           ACTIVE USER DASHBOARD
           ═══════════════════════════════════ */}
        {!isNewUser && (
          <>
            {/* ── Stats Bar ── */}
            {totalEarned > 0 && (
              <div style={{
                display: "flex", gap: 24, marginBottom: 32,
                padding: "20px 24px", background: "#111", borderRadius: 12, border: "1px solid #1a1a1a",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lifetime earned</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#34d399", marginTop: 2 }}>${totalEarned.toLocaleString()}</div>
                </div>
                <div style={{ width: 1, background: "#222" }} />
                <div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active bonuses</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa", marginTop: 2 }}>{inProgress.length}</div>
                </div>
                <div style={{ width: 1, background: "#222" }} />
                <div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Completed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 2 }}>{allEarned.length}</div>
                </div>
                <div style={{ width: 1, background: "#222" }} />
                <div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg per bonus</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                    {allEarned.length > 0 ? `$${Math.round(totalEarned / allEarned.length).toLocaleString()}` : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* ── Next Recommended ── */}
            {available.length > 0 && available[0].feasible && (
              <div style={{
                background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
                padding: "20px 24px", marginBottom: 32,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>Next up</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{available[0].bonus.bank_name}</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                    Earn {money(available[0].bonus.bonus_amount)} in ~{available[0].weeksToComplete ?? "?"}  weeks
                  </div>
                </div>
                <button
                  onClick={() => { setActionBonus({ bonus: available[0].bonus, mode: "start" }); setActionDate(todayStr()) }}
                  style={{
                    padding: "10px 24px", fontSize: 14, fontWeight: 700,
                    background: "#34d399", color: "#0a0a0a", border: "none",
                    borderRadius: 8, cursor: "pointer",
                  }}
                >
                  Start this bonus
                </button>
              </div>
            )}

            {/* ── Active Bonuses ── */}
            {inProgress.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 16px" }}>Active Bonuses</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {inProgress.map(({ bonus: b, velocity, weeksToComplete }) => {
                    const record = completedRecords.find(r => r.bonus_id === b.id && !r.closed_date)
                    const stepDetail = record ? getBonusStepDetail(b, record, profile.pay_frequency, profile.paycheck_amount) : null
                    return (
                      <div key={b.id} style={{
                        background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
                        padding: "20px 24px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{b.bank_name}</div>
                            <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                              Earn {money(b.bonus_amount)} · ~{weeksToComplete ?? "?"}w
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
                              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #ef4444", color: "#ef4444", background: "none", cursor: "pointer" }}
                            >
                              Close account
                            </button>
                            <button
                              onClick={() => handleDelete(b.id)}
                              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #333", color: "#555", background: "none", cursor: "pointer" }}
                            >
                              Undo
                            </button>
                          </div>
                        </div>
                        {stepDetail && (
                          <StepProgressBar
                            detail={stepDetail}
                            onOverride={(step) => handleStepOverride(b.id, step)}
                          />
                        )}
                        {/* Quick details */}
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ fontSize: 12, color: "#444", cursor: "pointer", padding: "4px 0", userSelect: "none" }}>Details</summary>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12 }}>
                            <div style={{ color: "#555" }}>Total deposit needed: <span style={{ color: "#999" }}>{money(b.requirements?.min_direct_deposit_total)}</span></div>
                            <div style={{ color: "#555" }}>Deposit window: <span style={{ color: "#999" }}>{numOrDash(b.requirements?.deposit_window_days, "days")}</span></div>
                            <div style={{ color: "#555" }}>Monthly fee: <span style={{ color: "#999" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
                            <div style={{ color: "#555" }}>Bonus posts in: <span style={{ color: "#999" }}>{numOrDash(b.timeline?.bonus_posting_days_est, "days")}</span></div>
                          </div>
                          {bestLink(b.source_links) && (
                            <a href={bestLink(b.source_links)!} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", display: "inline-block", marginTop: 8 }}>
                              Open bank site →
                            </a>
                          )}
                        </details>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Available Bonuses ── */}
            {available.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>Available Bonuses</h2>
                  <span style={{ fontSize: 12, color: "#555" }}>{available.length}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {available.slice(0, showAllAvailable ? 999 : 6).map(({ bonus: b, velocity, weeksToComplete, feasible }) => (
                    <BonusCard
                      key={b.id}
                      bonus={b}
                      velocity={velocity}
                      weeksToComplete={weeksToComplete}
                      feasible={feasible}
                      isExpanded={expandedCard === b.id}
                      onExpand={() => setExpandedCard(expandedCard === b.id ? null : b.id)}
                      onStart={() => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
                    />
                  ))}
                </div>
                {available.length > 6 && !showAllAvailable && (
                  <button
                    onClick={() => setShowAllAvailable(true)}
                    style={{ marginTop: 12, fontSize: 13, color: "#555", background: "none", border: "1px solid #222", borderRadius: 8, padding: "10px 20px", cursor: "pointer", width: "100%" }}
                  >
                    Show all {available.length} bonuses
                  </button>
                )}
              </div>
            )}

            {/* ── In Cooldown ── */}
            {inCooldown.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 16px" }}>Cooling Down</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {inCooldown.map(({ bonus: b, churnStatus }) => {
                    const s = churnStatus as Extract<ChurnStatus, { status: "in_cooldown" }>
                    const record = completedRecords.find(r => r.bonus_id === b.id && r.closed_date)
                    return (
                      <div key={b.id} style={{
                        background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
                        padding: "18px 20px", opacity: 0.7,
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.bank_name}</div>
                        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12 }}>
                          <div>
                            <span style={{ color: "#555" }}>Earned: </span>
                            <span style={{ color: "#34d399", fontWeight: 600 }}>
                              {record?.bonus_received ? money(record.actual_amount ?? b.bonus_amount) : "—"}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#555" }}>Available: </span>
                            <span style={{ color: "#fbbf24", fontWeight: 600 }}>{fmtShortDate(s.available_date)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{s.days_remaining} days left</div>
                        <button onClick={() => handleDelete(b.id)} style={{ marginTop: 10, fontSize: 11, color: "#444", background: "none", border: "1px solid #222", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Remove</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Completed (Lifetime) ── */}
            {lifetime.length > 0 && (
              <details style={{ marginBottom: 40 }}>
                <summary style={{ fontSize: 16, fontWeight: 600, color: "#fff", cursor: "pointer", padding: "8px 0", userSelect: "none" }}>
                  Completed — One Time Only <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>({lifetime.length})</span>
                </summary>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
                  {lifetime.map(({ bonus: b }) => {
                    const record = completedRecords.find(r => r.bonus_id === b.id)
                    return (
                      <div key={b.id} style={{
                        background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
                        padding: "18px 20px", opacity: 0.5,
                      }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                          {record?.bonus_received
                            ? <span>Earned <span style={{ color: "#34d399" }}>{money(record.actual_amount ?? b.bonus_amount)}</span></span>
                            : "Not received"}
                        </div>
                        <button onClick={() => handleDelete(b.id)} style={{ marginTop: 10, fontSize: 11, color: "#444", background: "none", border: "1px solid #222", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Remove</button>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* ── Earnings History ── */}
            {allEarned.length > 0 && (
              <details style={{ marginBottom: 40 }}>
                <summary style={{ fontSize: 16, fontWeight: 600, color: "#fff", cursor: "pointer", padding: "8px 0", userSelect: "none" }}>
                  Earnings History <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>({allEarned.length} bonuses)</span>
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  {allEarned
                    .sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime())
                    .map((r) => {
                      const bonus = allBonuses.find(b => b.id === r.bonus_id)
                      if (!bonus) return null
                      const received = r.actual_amount ?? bonus.bonus_amount
                      return (
                        <div key={r.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 16px", background: "#111", borderRadius: 8, border: "1px solid #1a1a1a",
                        }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{bonus.bank_name}</span>
                            <span style={{ fontSize: 12, color: "#555", marginLeft: 12 }}>{fmtShortDate(r.closed_date!)}</span>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#34d399" }}>{money(received)}</span>
                        </div>
                      )
                    })}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════
         ACTION MODAL
         ═══════════════════════════════════ */}
      {actionBonus && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#151515", borderRadius: 16, padding: 32, width: 400,
            border: "1px solid #2a2a2a", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
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
                      <input
                        type="number"
                        value={actualAmount}
                        onChange={e => setActualAmount(e.target.value)}
                        style={{ ...modalInput, paddingLeft: 24 }}
                        placeholder={String(actionBonus.bonus.bonus_amount)}
                      />
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

/* ─────────────────────────────────────────────
   BONUS CARD — Available bonuses
   ───────────────────────────────────────────── */
function BonusCard({ bonus: b, velocity, weeksToComplete, feasible, isExpanded, onExpand, onStart }: {
  bonus: Bonus
  velocity: number | null
  weeksToComplete: number | null
  feasible: boolean
  isExpanded: boolean
  onExpand: () => void
  onStart: () => void
}) {
  const link = bestLink(b.source_links)
  return (
    <div style={{
      background: "#111", border: "1px solid #1a1a1a", borderRadius: 12,
      padding: "18px 20px", opacity: feasible ? 1 : 0.4,
      transition: "border-color 0.15s",
      cursor: "pointer",
    }}
      onClick={onExpand}
      onMouseOver={e => (e.currentTarget.style.borderColor = "#333")}
      onMouseOut={e => (e.currentTarget.style.borderColor = "#1a1a1a")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{b.bank_name}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#34d399" }}>{money(b.bonus_amount)}</div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12 }}>
        <div><span style={{ color: "#555" }}>Time: </span><span style={{ color: "#999" }}>{weeksToComplete ? `${weeksToComplete}w` : "—"}</span></div>
        <div><span style={{ color: "#555" }}>Fee: </span><span style={{ color: "#999" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
        {velocity && <div><span style={{ color: "#555" }}>$/wk: </span><span style={{ color: "#34d399" }}>${velocity.toFixed(0)}</span></div>}
      </div>

      {!feasible && (
        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 8 }}>Not feasible with current paycheck</div>
      )}

      {isExpanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1a1a1a" }} onClick={e => e.stopPropagation()}>
          {/* Overview */}
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 12 }}>
            {b.requirements?.min_direct_deposit_total
              ? `Deposit $${b.requirements.min_direct_deposit_total.toLocaleString()} total within ${b.requirements.deposit_window_days ?? "—"} days.`
              : b.requirements?.min_direct_deposit_per_deposit
                ? `${b.requirements.dd_count_required ?? "1"}× deposits of $${b.requirements.min_direct_deposit_per_deposit.toLocaleString()}+`
                : "Set up direct deposit."
            }
          </div>

          {/* Key details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginBottom: 12 }}>
            <div><span style={{ color: "#555" }}>Min deposit total: </span><span style={{ color: "#999" }}>{money(b.requirements?.min_direct_deposit_total)}</span></div>
            <div><span style={{ color: "#555" }}>Window: </span><span style={{ color: "#999" }}>{numOrDash(b.requirements?.deposit_window_days, "days")}</span></div>
            <div><span style={{ color: "#555" }}>Monthly fee: </span><span style={{ color: "#999" }}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
            <div><span style={{ color: "#555" }}>Bonus posts: </span><span style={{ color: "#999" }}>{numOrDash(b.timeline?.bonus_posting_days_est, "days")}</span></div>
            <div><span style={{ color: "#555" }}>Cooldown: </span><span style={{ color: "#999" }}>{(b as any).cooldown_months == null ? "One-time" : `${(b as any).cooldown_months}mo`}</span></div>
          </div>

          {/* Advanced */}
          <details>
            <summary style={{ fontSize: 11, color: "#444", cursor: "pointer", userSelect: "none" }}>Advanced details</summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11, marginTop: 8 }}>
              <div><span style={{ color: "#555" }}>Chex: </span><span style={{ color: "#999" }}>{textOrDash(b.screening?.chex_sensitive)}</span></div>
              <div><span style={{ color: "#555" }}>Hard pull: </span><span style={{ color: "#999" }}>{yesNo(b.screening?.hard_pull)}</span></div>
              <div><span style={{ color: "#555" }}>Lifetime limit: </span><span style={{ color: "#999" }}>{yesNo(b.eligibility?.lifetime_language)}</span></div>
              <div><span style={{ color: "#555" }}>Fee waiver: </span><span style={{ color: "#999" }}>{textOrDash(b.fees?.monthly_fee_waiver_text)}</span></div>
            </div>
            {b.eligibility?.eligibility_notes && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 8, lineHeight: 1.5 }}>{b.eligibility.eligibility_notes}</div>
            )}
          </details>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={onStart} style={{
              flex: 1, padding: "10px", fontSize: 13, fontWeight: 700,
              background: "#34d399", color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer",
            }}>
              Start this bonus
            </button>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" style={{
                padding: "10px 16px", fontSize: 12, color: "#888", border: "1px solid #333",
                borderRadius: 8, textDecoration: "none", display: "flex", alignItems: "center",
              }}>
                Open site
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────── */
const modalLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginBottom: 6 }
const modalInput: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  border: "1px solid #333", borderRadius: 8, boxSizing: "border-box" as const,
  background: "#0a0a0a", color: "#fff",
}
const modalActions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }
const cancelBtn: React.CSSProperties = {
  padding: "10px 20px", fontSize: 13, border: "1px solid #333",
  borderRadius: 8, background: "none", color: "#888", cursor: "pointer",
}
const confirmBtn: React.CSSProperties = {
  padding: "10px 20px", fontSize: 13, border: "none",
  borderRadius: 8, background: "#34d399", color: "#0a0a0a", cursor: "pointer", fontWeight: 700,
}
