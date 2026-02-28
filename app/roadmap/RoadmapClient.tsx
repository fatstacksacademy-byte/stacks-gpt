"use client"

import { useEffect, useState, useCallback } from "react"
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

export default function RoadmapClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const { profile, loaded } = useProfile()
  const [mounted, setMounted] = useState(false)
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [actionBonus, setActionBonus] = useState<{ bonus: Bonus; mode: "start" | "close" } | null>(null)
  const [actionDate, setActionDate] = useState(todayStr())
  const [bonusReceived, setBonusReceived] = useState(true)
  const [actualAmount, setActualAmount] = useState<string>("")

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

  const available = bonusesWithMeta
    .filter(b => b.churnStatus.status === "available" || b.churnStatus.status === "in_progress")
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

  // Earnings tracker — all closed records with bonus_received = true
  const allEarned = completedRecords.filter(r => r.bonus_received && r.closed_date)
  const earnedAmt = (r: CompletedBonus) => { const b = allBonuses.find(x => x.id === r.bonus_id); return r.actual_amount ?? b?.bonus_amount ?? 0 }
  const totalEarned = allEarned.reduce((sum, r) => sum + earnedAmt(r), 0)
  const lifetimeEarned = allEarned.filter(r => {
    const bonus = allBonuses.find(b => b.id === r.bonus_id)
    return bonus && (bonus as any).cooldown_months === null
  })
  const churnEarned = allEarned.filter(r => {
    const bonus = allBonuses.find(b => b.id === r.bonus_id)
    return bonus && (bonus as any).cooldown_months !== null
  })

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Stacks GPT</h1>
      <p style={{ marginBottom: 18 }}>Welcome, {userEmail}</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <div style={pill}>Bonuses: {allBonuses.length}</div>
        {inCooldown.length > 0 && <div style={{ ...pill, background: "#fff8e6", borderColor: "#f0c040" }}>⏳ {inCooldown.length} in cooldown</div>}
        {totalEarned > 0 && <div style={{ ...pill, background: "#f0faf5", borderColor: "#0d9e6e", color: "#0d9e6e", fontWeight: 600 }}>💰 ${totalEarned.toLocaleString()} earned</div>}
        <a href="/roadmap/sequencer" style={sequencerLink}>→ Build my paycheck stack</a>
      </div>

      {/* ── Available ── */}
      <SectionHeader title="Available" count={available.length} />
      <BonusTable
        rows={available}
        onStart={(b) => { setActionBonus({ bonus: b, mode: "start" }); setActionDate(todayStr()) }}
        onClose={(b) => { setActionBonus({ bonus: b, mode: "close" }); setActionDate(todayStr()); setBonusReceived(true); setActualAmount(String(b.bonus_amount)) }}
        onUndo={(b) => handleDelete(b.id)}
      />

      {/* ── In Cooldown ── */}
      {inCooldown.length > 0 && (
        <>
          <SectionHeader title="In Cooldown" count={inCooldown.length} style={{ marginTop: 40 }} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={th}>Bank</th>
                  <th style={th}>Bonus</th>
                  <th style={th}>Received</th>
                  <th style={th}>Closed</th>
                  <th style={th}>Available again</th>
                  <th style={th}>Days left</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {inCooldown.map(({ bonus: b, churnStatus }) => {
                  const s = churnStatus as Extract<ChurnStatus, { status: "in_cooldown" }>
                  const record = completedRecords.find(r => r.bonus_id === b.id && r.closed_date)
                  return (
                    <tr key={b.id} style={{ opacity: 0.75 }}>
                      <td style={tdTop}><div style={{ fontWeight: 600 }}>{b.bank_name}</div></td>
                      <td style={tdTop}>{money(b.bonus_amount)}</td>
                      <td style={tdTop}>
                        {record?.bonus_received
                          ? <span style={{ color: "#0d9e6e", fontWeight: 600 }}>{money(record.actual_amount ?? b.bonus_amount)}</span>
                          : <span style={{ color: "#aaa" }}>—</span>}
                      </td>
                      <td style={tdTop}>{fmtShortDate(s.closed_date)}</td>
                      <td style={tdTop}><span style={{ color: "#0d9e6e", fontWeight: 600 }}>{fmtShortDate(s.available_date)}</span></td>
                      <td style={tdTop}>{s.days_remaining}d</td>
                      <td style={tdTop}><button onClick={() => handleDelete(b.id)} style={undoBtn}>Remove</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Completed (Lifetime) ── */}
      {lifetime.length > 0 && (
        <>
          <SectionHeader title="Completed — One Time Only" count={lifetime.length} style={{ marginTop: 40 }} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={th}>Bank</th>
                  <th style={th}>Listed bonus</th>
                  <th style={th}>Actual received</th>
                  <th style={th}>Opened</th>
                  <th style={th}>Closed</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {lifetime.map(({ bonus: b }) => {
                  const record = completedRecords.find(r => r.bonus_id === b.id)
                  return (
                    <tr key={b.id} style={{ opacity: 0.55 }}>
                      <td style={tdTop}><div style={{ fontWeight: 600 }}>{b.bank_name}</div></td>
                      <td style={tdTop}>{money(b.bonus_amount)}</td>
                      <td style={tdTop}>
                        {record?.bonus_received
                          ? <span style={{ color: "#0d9e6e", fontWeight: 600 }}>{money(record.actual_amount ?? b.bonus_amount)}</span>
                          : <span style={{ color: "#aaa" }}>Not received</span>}
                      </td>
                      <td style={tdTop}>{record ? fmtShortDate(record.opened_date) : "—"}</td>
                      <td style={tdTop}>{record?.closed_date ? fmtShortDate(record.closed_date) : "—"}</td>
                      <td style={tdTop}><button onClick={() => handleDelete(b.id)} style={undoBtn}>Remove</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Earnings Tracker ── */}
      {allEarned.length > 0 && (
        <>
          <SectionHeader title="Earnings Tracker" count={allEarned.length} style={{ marginTop: 40 }} />
          <div style={earningsGrid}>
            <div style={earningsCard}>
              <div style={earningsLabel}>Total earned</div>
              <div style={earningsValue}>${totalEarned.toLocaleString()}</div>
            </div>
            <div style={earningsCard}>
              <div style={earningsLabel}>From lifetime bonuses</div>
              <div style={earningsValue}>${lifetimeEarned.reduce((s, r) => s + earnedAmt(r), 0).toLocaleString()}</div>
              <div style={earningsCount}>{lifetimeEarned.length} bonus{lifetimeEarned.length !== 1 ? "es" : ""}</div>
            </div>
            <div style={earningsCard}>
              <div style={earningsLabel}>From churnable bonuses</div>
              <div style={earningsValue}>${churnEarned.reduce((s, r) => s + earnedAmt(r), 0).toLocaleString()}</div>
              <div style={earningsCount}>{churnEarned.length} bonus{churnEarned.length !== 1 ? "es" : ""}</div>
            </div>
            <div style={earningsCard}>
              <div style={earningsLabel}>Avg per bonus</div>
              <div style={earningsValue}>${Math.round(totalEarned / allEarned.length).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={th}>Bank</th>
                  <th style={th}>Listed</th>
                  <th style={th}>Received</th>
                  <th style={th}>Difference</th>
                  <th style={th}>Closed</th>
                  <th style={th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {allEarned
                  .sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime())
                  .map((r) => {
                    const bonus = allBonuses.find(b => b.id === r.bonus_id)
                    if (!bonus) return null
                    const listed = bonus.bonus_amount
                    const received = r.actual_amount ?? listed  // fall back to listed if no amount entered
                    const diff = received - listed
                    const isLifetime = (bonus as any).cooldown_months === null
                    return (
                      <tr key={r.id}>
                        <td style={tdTop}><div style={{ fontWeight: 600 }}>{bonus.bank_name}</div></td>
                        <td style={tdTop}>{money(listed)}</td>
                        <td style={tdTop}><span style={{ color: "#0d9e6e", fontWeight: 600 }}>{money(received)}</span></td>
                        <td style={tdTop}>
                          {diff === 0
                            ? <span style={{ color: "#aaa" }}>—</span>
                            : <span style={{ color: diff > 0 ? "#0d9e6e" : "#e05c2a", fontWeight: 500 }}>{diff > 0 ? "+" : ""}{money(diff)}</span>}
                        </td>
                        <td style={tdTop}>{fmtShortDate(r.closed_date!)}</td>
                        <td style={tdTop}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: isLifetime ? "#f0f0f0" : "#f0faf5", color: isLifetime ? "#888" : "#0d9e6e" }}>
                            {isLifetime ? "one-time" : "churnable"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Action Modal ── */}
      {actionBonus && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{actionBonus.bonus.bank_name}</div>
            {actionBonus.mode === "start" && (
              <>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>When did you open this account?</div>
                <label style={modalLabel}>Account opened date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={modalActions}>
                  <button onClick={() => setActionBonus(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleStart} style={confirmBtn}>Mark as Started</button>
                </div>
              </>
            )}
            {actionBonus.mode === "close" && (
              <>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>When did you close this account? This starts the cooldown clock.</div>
                <label style={modalLabel}>Account closed date</label>
                <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} style={modalInput} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 10px" }}>
                  <input type="checkbox" id="bonusReceived" checked={bonusReceived} onChange={e => setBonusReceived(e.target.checked)} />
                  <label htmlFor="bonusReceived" style={{ fontSize: 13, color: "#333" }}>I received the bonus</label>
                </div>
                {bonusReceived && (
                  <>
                    <label style={modalLabel}>Actual amount received</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 13 }}>$</span>
                      <input
                        type="number"
                        value={actualAmount}
                        onChange={e => setActualAmount(e.target.value)}
                        style={{ ...modalInput, paddingLeft: 22 }}
                        placeholder={String(actionBonus.bonus.bonus_amount)}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Listed bonus: ${actionBonus.bonus.bonus_amount.toLocaleString()}</div>
                  </>
                )}
                <div style={modalActions}>
                  <button onClick={() => setActionBonus(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleClose} style={confirmBtn}>Mark as Closed</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, count, style }: { title: string; count: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, ...style }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      <span style={{ fontSize: 13, color: "#aaa" }}>{count}</span>
    </div>
  )
}

function BonusTable({ rows, onStart, onClose, onUndo }: {
  rows: any[]
  onStart: (b: any) => void
  onClose: (b: any) => void
  onUndo: (b: any) => void
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1060 }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Bank</th>
            <th style={th}>Bonus</th>
            <th style={th}>$/week</th>
            <th style={th}>Weeks</th>
            <th style={th}>Min per DD</th>
            <th style={th}>DD Window</th>
            <th style={th}>Monthly Fee</th>
            <th style={th}>Status</th>
            <th style={th}>Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ bonus: b, velocity, weeksToComplete, feasible, reason, churnStatus }, idx) => {
            const link = bestLink(b.source_links)
            const isInProgress = churnStatus.status === "in_progress"
            return (
              <React.Fragment key={b.id}>
                <tr style={{ opacity: feasible ? 1 : 0.45 }}>
                  <td style={tdTop}>
                    {feasible
                      ? <span style={{ ...rankBadge, background: idx < 3 ? "#111" : "#e8e8e8", color: idx < 3 ? "#fff" : "#555" }}>{idx + 1}</span>
                      : <span style={{ fontSize: 11, color: "#bbb" }}>—</span>}
                  </td>
                  <td style={tdTop}>
                    <div style={{ fontWeight: 600 }}>{textOrDash(b.bank_name)}</div>
                    {isInProgress && <div style={{ fontSize: 11, color: "#1a6ef5", marginTop: 3 }}>🔵 In progress — opened {fmtShortDate(churnStatus.opened_date)}</div>}
                    {!feasible && reason && <div style={{ fontSize: 11, color: "#e05c2a", marginTop: 4 }}>{reason}</div>}
                  </td>
                  <td style={tdTop}>{money(b.bonus_amount)}</td>
                  <td style={tdTop}>{velocity != null ? <span style={{ fontWeight: 600, color: "#0d9e6e" }}>${velocity.toFixed(1)}</span> : "—"}</td>
                  <td style={tdTop}>{weeksToComplete != null ? `${weeksToComplete}w` : "—"}</td>
                  <td style={tdTop}>{b.requirements?.min_direct_deposit_per_deposit ? money(b.requirements.min_direct_deposit_per_deposit) : "—"}</td>
                  <td style={tdTop}>{b.requirements?.deposit_window_days ? `${b.requirements.deposit_window_days}d` : "—"}</td>
                  <td style={tdTop}>{b.fees?.monthly_fee === 0 ? "$0" : b.fees?.monthly_fee ? money(b.fees.monthly_fee) : "—"}</td>
                  <td style={tdTop}>
                    {isInProgress
                      ? <><button onClick={() => onClose(b)} style={closeBtn}>Close account</button><button onClick={() => onUndo(b)} style={undoBtn}>Undo</button></>
                      : <button onClick={() => onStart(b)} style={startBtn}>Mark started</button>}
                  </td>
                  <td style={tdTop}>{link ? <a href={link} target="_blank" rel="noreferrer" style={linkStyle}>Open</a> : "—"}</td>
                </tr>
                <tr key={`${b.id}-details`}>
                  <td style={detailsCell} colSpan={10}>
                    <details>
                      <summary style={summaryStyle}>Show details</summary>
                      <div style={detailsGrid}>
                        <div>
                          <div style={sectionTitle}>Requirements</div>
                          <div style={kv}><span style={k}>Direct deposit required</span><span style={v}>{yesNo(b.requirements?.direct_deposit_required)}</span></div>
                          <div style={kv}><span style={k}>Paychecks required</span><span style={v}>{numOrDash(b.requirements?.dd_count_required)}</span></div>
                          <div style={kv}><span style={k}>Min per paycheck</span><span style={v}>{money(b.requirements?.min_direct_deposit_per_deposit)}</span></div>
                          <div style={kv}><span style={k}>Min total deposit</span><span style={v}>{money(b.requirements?.min_direct_deposit_total)}</span></div>
                          <div style={kv}><span style={k}>Deposit window</span><span style={v}>{numOrDash(b.requirements?.deposit_window_days, "days")}</span></div>
                          <div style={kv}><span style={k}>Min opening deposit</span><span style={v}>{money(b.requirements?.min_opening_deposit)}</span></div>
                        </div>
                        <div>
                          <div style={sectionTitle}>Fees & Timeline</div>
                          <div style={kv}><span style={k}>Monthly fee</span><span style={v}>{b.fees?.monthly_fee === 0 ? "$0" : money(b.fees?.monthly_fee)}</span></div>
                          <div style={kv}><span style={k}>How to waive</span><span style={v}>{textOrDash(b.fees?.monthly_fee_waiver_text)}</span></div>
                          <div style={kv}><span style={k}>Bonus posting est.</span><span style={v}>{numOrDash(b.timeline?.bonus_posting_days_est, "days")}</span></div>
                          <div style={kv}><span style={k}>Must remain open</span><span style={v}>{numOrDash(b.timeline?.must_remain_open_days, "days")}</span></div>
                          <div style={kv}><span style={k}>Cooldown</span><span style={v}>{(b as any).cooldown_months == null ? "One-time only" : `${(b as any).cooldown_months} months`}</span></div>
                        </div>
                        <div>
                          <div style={sectionTitle}>Screening & Eligibility</div>
                          <div style={kv}><span style={k}>Chex sensitivity</span><span style={v}>{textOrDash(b.screening?.chex_sensitive)}</span></div>
                          <div style={kv}><span style={k}>Hard pull</span><span style={v}>{yesNo(b.screening?.hard_pull)}</span></div>
                          <div style={kv}><span style={k}>Lifetime language</span><span style={v}>{yesNo(b.eligibility?.lifetime_language)}</span></div>
                          <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>{textOrDash(b.eligibility?.eligibility_notes)}</div>
                          {b.source_links?.length ? (
                            <div style={{ marginTop: 10 }}>
                              {b.source_links.map((u: string, i: number) => (
                                <div key={i}><a href={u} target="_blank" rel="noreferrer" style={linkStyle}>{u}</a></div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

import React from "react"

const pill: React.CSSProperties = { fontSize: 12, border: "1px solid #e6e6e6", padding: "6px 10px", borderRadius: 999, color: "#333", background: "#fff" }
const sequencerLink: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#0a58ca", textDecoration: "none", padding: "6px 14px", border: "1px solid #0a58ca", borderRadius: 999 }
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "12px 10px", whiteSpace: "nowrap", fontSize: 13 }
const tdTop: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "12px 10px", verticalAlign: "top", fontSize: 14 }
const detailsCell: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "10px 10px 18px 10px", background: "#fafafa" }
const summaryStyle: React.CSSProperties = { cursor: "pointer", userSelect: "none", fontSize: 13, color: "#333", padding: "6px 0" }
const detailsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, marginTop: 12 }
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 8 }
const kv: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px dashed #e6e6e6", fontSize: 13 }
const k: React.CSSProperties = { color: "#555" }
const v: React.CSSProperties = { color: "#111", textAlign: "right" }
const linkStyle: React.CSSProperties = { color: "#0a58ca", textDecoration: "none" }
const rankBadge: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 700 }
const startBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #0d9e6e", color: "#0d9e6e", background: "none", cursor: "pointer", whiteSpace: "nowrap" }
const closeBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #e05c2a", color: "#e05c2a", background: "none", cursor: "pointer", whiteSpace: "nowrap" }
const undoBtn: React.CSSProperties = { fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #ccc", color: "#888", background: "none", cursor: "pointer", marginLeft: 6 }
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }
const modalBox: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 28, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }
const modalLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }
const modalInput: React.CSSProperties = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, boxSizing: "border-box" as const }
const modalActions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }
const cancelBtn: React.CSSProperties = { padding: "8px 16px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }
const confirmBtn: React.CSSProperties = { padding: "8px 16px", fontSize: 13, border: "none", borderRadius: 6, background: "#111", color: "#fff", cursor: "pointer", fontWeight: 600 }
const earningsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 8 }
const earningsCard: React.CSSProperties = { border: "1px solid #e6e6e6", borderRadius: 8, padding: "14px 18px", background: "#fff" }
const earningsLabel: React.CSSProperties = { fontSize: 12, color: "#888", marginBottom: 4 }
const earningsValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: "#0d9e6e" }
const earningsCount: React.CSSProperties = { fontSize: 12, color: "#aaa", marginTop: 2 }
