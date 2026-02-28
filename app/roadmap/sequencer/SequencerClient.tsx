"use client"

import { useState, useEffect } from "react"
import { useProfile } from "../../../lib/useProfile"
import { runSequencer, SequencerResult, SequencedBonus, SlotEntry } from "../../../lib/sequencer"
import { getCompletedBonuses } from "../../../lib/completedBonuses"
import type { CompletedBonus } from "../../../lib/churn"
import { createClient } from "../../../lib/supabase/client"

const SLOT_COLORS = ["#1a6ef5", "#0d9e6e", "#c45c00"]
const WEEKS_PER_YEAR = 52

function todayStr() { return new Date().toISOString().split("T")[0] }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function buildChainedDates(slotBonuses: SlotEntry[], firstStart: string): Record<string, string> {
  const dates: Record<string, string> = {}
  let cursor = firstStart
  for (const entry of slotBonuses) {
    if (entry.type === "placeholder") {
      cursor = addDays(cursor, (entry.end_week - entry.start_week + 1) * 7)
      continue
    }
    const b = entry as SequencedBonus
    dates[`${b.id}-${b.cycle}`] = cursor
    cursor = addDays(cursor, b.weeks_to_complete * 7)
  }
  return dates
}

// Filter a slot's entries to only those that overlap with a given year window
function filterToYear(entries: SlotEntry[], yearStart: number, yearEnd: number): SlotEntry[] {
  return entries.filter(e => e.start_week <= yearEnd && e.end_week >= yearStart)
}

// Compute total bonus for a year window across all slots
function yearBonus(slots: SlotEntry[][], yearStart: number, yearEnd: number): number {
  return slots.flat()
    .filter(e => e.type === "bonus" && e.start_week <= yearEnd && e.start_week >= yearStart)
    .reduce((sum, e) => sum + (e as SequencedBonus).bonus_amount, 0)
}

// Count bonus entries (not placeholders) in a year window
function yearBonusCount(slots: SlotEntry[][], yearStart: number, yearEnd: number): number {
  return slots.flat()
    .filter(e => e.type === "bonus" && e.start_week <= yearEnd && e.start_week >= yearStart)
    .length
}

export default function SequencerClient() {
  const { profile, loaded } = useProfile()
  const [result, setResult] = useState<SequencerResult | null>(null)
  const [showSkipped, setShowSkipped] = useState(false)
  const [startDates, setStartDates] = useState<Record<string, string>>({})
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [currentYear, setCurrentYear] = useState(1)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const records = await getCompletedBonuses(user.id)
      setCompletedRecords(records)
      setLoadingRecords(false)
    }
    load()
  }, [])

  function handleRun() {
    const r = runSequencer({
      slots: profile.dd_slots,
      payFrequency: profile.pay_frequency,
      paycheckAmount: profile.paycheck_amount,
      completedRecords,
    })
    setResult(r)
    setShowSkipped(false)
    setCurrentYear(1)
    const today = todayStr()
    let allDates: Record<string, string> = {}
    for (const slotBonuses of r.slots) {
      allDates = { ...allDates, ...buildChainedDates(slotBonuses, today) }
    }
    setStartDates(allDates)
  }

  function handleStartDateChange(slotBonuses: SlotEntry[], changedKey: string, newDate: string) {
    const idx = slotBonuses.findIndex(e => e.type === "bonus" && `${(e as SequencedBonus).id}-${(e as SequencedBonus).cycle}` === changedKey)
    if (idx === -1) return
    const tail = slotBonuses.slice(idx)
    const cascaded = buildChainedDates(tail, newDate)
    setStartDates((prev) => ({ ...prev, ...cascaded }))
  }

  if (!loaded || loadingRecords) return <div style={{ color: "#aaa", fontSize: 14 }}>Loading…</div>

  // Year pagination derived values
  const totalYears = result ? Math.ceil(result.horizon_weeks / WEEKS_PER_YEAR) : 1
  const yearStart = (currentYear - 1) * WEEKS_PER_YEAR + 1
  const yearEnd = currentYear * WEEKS_PER_YEAR
  const thisYearBonus = result ? yearBonus(result.slots, yearStart, yearEnd) : 0
  const thisYearCount = result ? yearBonusCount(result.slots, yearStart, yearEnd) : 0

  return (
    <div>
      <div style={profileSummary}>
        <div style={profileInfo}>
          <span style={profileChip}>{profile.dd_slots} DD slot{profile.dd_slots > 1 ? "s" : ""}</span>
          <span style={profileChip}>{profile.pay_frequency}</span>
          <span style={profileChip}>${profile.paycheck_amount.toLocaleString()} / paycheck</span>
          <span style={profileNote}>Change your profile in the bar above — syncs everywhere.</span>
        </div>
        <button onClick={handleRun} style={runBtn}>Build My Stack →</button>
      </div>

      {result && (
        <div style={{ marginTop: 32 }}>
          {/* Year nav */}
          <div style={yearNav}>
            <button onClick={() => setCurrentYear(y => Math.max(1, y - 1))} disabled={currentYear === 1} style={yearNavBtn}>← Prev</button>
            <div style={yearLabel}>
              Year {currentYear}
              <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>of {totalYears}</span>
            </div>
            <button onClick={() => setCurrentYear(y => Math.min(totalYears, y + 1))} disabled={currentYear === totalYears} style={yearNavBtn}>Next →</button>
          </div>

          {/* Stats for this year */}
          <div style={summaryRow}>
            <div style={statCard}>
              <div style={statLabel}>Bonus this year</div>
              <div style={statValue}>${thisYearBonus.toLocaleString()}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>Bonuses completed</div>
              <div style={statValue}>{thisYearCount}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>Avg $/month</div>
              <div style={statValue}>${(thisYearBonus / 12).toFixed(0)}</div>
            </div>
            <div style={statCard}>
              <div style={statLabel}>All-time projected</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#888" }}>${result.total_bonus.toLocaleString()}</div>
            </div>
          </div>

          {/* Slots filtered to this year */}
          <div style={{ marginTop: 28 }}>
            <h2 style={sectionHead}>Year {currentYear} Stack</h2>
            {result.slots.map((slotEntries, slotIdx) => {
              const visible = filterToYear(slotEntries, yearStart, yearEnd)
              return (
                <div key={slotIdx} style={slotBlock}>
                  <div style={{ ...slotLabel, color: SLOT_COLORS[slotIdx] }}>Slot {slotIdx + 1}</div>
                  {visible.length === 0
                    ? <div style={{ color: "#999", fontSize: 13, padding: "8px 0" }}>No activity this year</div>
                    : <div style={bonusStack}>
                        {visible.map((entry, i) => {
                          if (entry.type === "placeholder") {
                            return (
                              <div key={`ph-${entry.start_week}`} style={placeholderCard}>
                                <span style={{ fontSize: 18 }}>⏳</span>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>Waiting for {entry.waiting_for}</div>
                                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{entry.end_week - entry.start_week + 1} weeks idle</div>
                                </div>
                              </div>
                            )
                          }
                          const b = entry as SequencedBonus
                          const key = `${b.id}-${b.cycle}`
                          const bonusPosition = visible.slice(0, i).filter(e => e.type === "bonus").length + 1
                          return (
                            <BonusCard
                              key={key}
                              bonus={b}
                              color={SLOT_COLORS[slotIdx]}
                              position={bonusPosition}
                              startDate={startDates[key] ?? todayStr()}
                              isChained={i > 0}
                              onStartDateChange={(d) => handleStartDateChange(slotEntries, key, d)}
                            />
                          )
                        })}
                      </div>}
                </div>
              )
            })}
          </div>

          {/* Year nav bottom */}
          <div style={{ ...yearNav, marginTop: 24 }}>
            <button onClick={() => setCurrentYear(y => Math.max(1, y - 1))} disabled={currentYear === 1} style={yearNavBtn}>← Prev year</button>
            <span style={{ fontSize: 13, color: "#aaa" }}>Year {currentYear} of {totalYears}</span>
            <button onClick={() => setCurrentYear(y => Math.min(totalYears, y + 1))} disabled={currentYear === totalYears} style={yearNavBtn}>Next year →</button>
          </div>

          {result.skipped.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button onClick={() => setShowSkipped(s => !s)} style={skippedToggle}>
                {showSkipped ? "▾" : "▸"} {result.skipped.length} bonuses excluded
              </button>
              {showSkipped && (
                <div style={skippedList}>
                  {result.skipped.map((s, i) => (
                    <div key={i} style={skippedRow}>
                      <span style={{ fontWeight: 500 }}>{s.bank_name}</span>
                      <span style={{ color: "#888" }}>{s.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BonusCard({ bonus: b, color, position, startDate, isChained, onStartDateChange }: {
  bonus: SequencedBonus; color: string; position: number
  startDate: string; isChained: boolean; onStartDateChange: (d: string) => void
}) {
  const [open, setOpen] = useState(false)
  const link = b.source_links[0]
  const ddDoneDate = addDays(startDate, b.weeks_to_complete * 7)
  const bonusDate = addDays(startDate, b.bonus_posting_days_est ?? (b.weeks_to_complete + 4) * 7)

  return (
    <div style={{ ...bonusCard, borderLeftColor: b.cycle > 1 ? color : "transparent", borderLeftWidth: 3, borderLeftStyle: "solid" }}>
      <div style={bonusCardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...positionBadge, background: color }}>{position}</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={bonusBankName}>{b.bank_name}</div>
              {b.cycle > 1 && <span style={{ ...cycleBadge, borderColor: color, color }}>cycle {b.cycle}</span>}
            </div>
            <div style={bonusMeta}>DD done by {fmtDate(ddDoneDate)} · Bonus ~{fmtDate(bonusDate)}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...bonusAmountStyle, color }}>${b.bonus_amount.toLocaleString()}</div>
          <div style={velocityBadge}>${b.velocity.toFixed(1)}/wk</div>
          <button onClick={() => setOpen(o => !o)} style={expandBtn}>{open ? "▲" : "▼"}</button>
        </div>
      </div>
      <div style={datePickerRow}>
        <label style={dateLabel}>Start date</label>
        <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} style={dateInput} />
        {isChained && <span style={chainedNote}>⛓ Auto-set from previous bonus</span>}
        <span style={dateHint}>DD done {fmtDate(ddDoneDate)} · Bonus ~{fmtDate(bonusDate)}</span>
      </div>
      {open && (
        <div style={bonusDetail}>
          <div style={detailGrid}>
            <DetailRow label="DD count required" value={b.dd_count_required ?? "—"} />
            <DetailRow label="Min per paycheck" value={b.min_direct_deposit_per_deposit ? `$${b.min_direct_deposit_per_deposit.toLocaleString()}` : "—"} />
            <DetailRow label="Min total DD" value={b.min_direct_deposit_total ? `$${b.min_direct_deposit_total.toLocaleString()}` : "—"} />
            <DetailRow label="Deposit window" value={b.deposit_window_days ? `${b.deposit_window_days} days` : "—"} />
            <DetailRow label="Monthly fee" value={b.monthly_fee === 0 ? "$0" : b.monthly_fee ? `$${b.monthly_fee}` : "—"} />
            <DetailRow label="Chex sensitivity" value={b.chex_sensitive ?? "—"} />
            <DetailRow label="Hard pull" value={b.hard_pull === null ? "—" : b.hard_pull ? "Yes" : "No"} />
            <DetailRow label="Cooldown" value={b.cooldown_months == null ? "One-time only" : `${b.cooldown_months} months`} />
          </div>
          {link && <a href={link} target="_blank" rel="noreferrer" style={applyLink}>Apply →</a>}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={detailRow}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ color: "#111", fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const profileSummary: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "#f9f9f9", border: "1px solid #e6e6e6", borderRadius: 10, padding: "16px 20px" }
const profileInfo: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }
const profileChip: React.CSSProperties = { fontSize: 13, fontWeight: 600, background: "#111", color: "#fff", padding: "4px 12px", borderRadius: 999 }
const profileNote: React.CSSProperties = { fontSize: 12, color: "#aaa", marginLeft: 4 }
const runBtn: React.CSSProperties = { padding: "10px 22px", fontSize: 14, fontWeight: 600, background: "#111", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }
const yearNav: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }
const yearLabel: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "#111" }
const yearNavBtn: React.CSSProperties = { padding: "8px 16px", fontSize: 13, border: "1px solid #e6e6e6", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#333", fontWeight: 500 }
const summaryRow: React.CSSProperties = { display: "flex", gap: 16, flexWrap: "wrap" }
const statCard: React.CSSProperties = { flex: 1, minWidth: 140, border: "1px solid #e6e6e6", borderRadius: 8, padding: "14px 18px", background: "#fff" }
const statLabel: React.CSSProperties = { fontSize: 12, color: "#888", marginBottom: 4 }
const statValue: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: "#111" }
const sectionHead: React.CSSProperties = { fontSize: 18, fontWeight: 700, marginBottom: 16 }
const slotBlock: React.CSSProperties = { marginBottom: 24 }
const slotLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.05em" }
const bonusStack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8 }
const bonusCard: React.CSSProperties = { border: "1px solid #e6e6e6", borderRadius: 8, overflow: "hidden", background: "#fff" }
const bonusCardHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }
const positionBadge: React.CSSProperties = { width: 26, height: 26, borderRadius: "50%", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
const bonusBankName: React.CSSProperties = { fontSize: 15, fontWeight: 600, color: "#111" }
const bonusMeta: React.CSSProperties = { fontSize: 12, color: "#888", marginTop: 2 }
const cycleBadge: React.CSSProperties = { fontSize: 11, border: "1px solid", padding: "1px 7px", borderRadius: 999, fontWeight: 600 }
const bonusAmountStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700 }
const velocityBadge: React.CSSProperties = { fontSize: 12, background: "#f0f0f0", padding: "3px 8px", borderRadius: 999, color: "#555" }
const expandBtn: React.CSSProperties = { background: "none", border: "1px solid #e6e6e6", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: "#666" }
const datePickerRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#f9f9f9", borderTop: "1px solid #f0f0f0", flexWrap: "wrap" }
const dateLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#555", whiteSpace: "nowrap" }
const dateInput: React.CSSProperties = { fontSize: 12, border: "1px solid #ddd", borderRadius: 4, padding: "4px 8px", color: "#111" }
const dateHint: React.CSSProperties = { fontSize: 12, color: "#888" }
const chainedNote: React.CSSProperties = { fontSize: 11, color: "#0d9e6e", fontWeight: 500 }
const bonusDetail: React.CSSProperties = { borderTop: "1px solid #f0f0f0", padding: "14px 16px", background: "#fafafa" }
const detailGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 24px" }
const detailRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px dashed #ebebeb" }
const applyLink: React.CSSProperties = { display: "inline-block", marginTop: 12, fontSize: 13, fontWeight: 600, color: "#1a6ef5", textDecoration: "none" }
const skippedToggle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888", padding: 0 }
const skippedList: React.CSSProperties = { marginTop: 10, border: "1px solid #e6e6e6", borderRadius: 8, overflow: "hidden" }
const skippedRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, borderBottom: "1px solid #f0f0f0", gap: 16 }
const placeholderCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, border: "1px dashed #ddd", borderRadius: 8, padding: "14px 16px", background: "#fafafa", color: "#aaa" }
