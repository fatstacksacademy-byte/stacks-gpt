"use client"

import { useState, useRef } from "react"
import { URGENCY_RANK, daysUntil, type BonusUrgency } from "../../lib/bonusNextStep"
import { DD_SOURCES, DD_EMPLOYER } from "../../lib/ddSources"
import PortalStacksBadge from "./PortalStacksBadge"
import { DK, MODULE, URGENCY_DK, moduleGradient } from "../../lib/stacksTheme"

/**
 * Unified list of every currently-started bonus across paycheck,
 * spending, and savings. Each card surfaces the next required action
 * + deadline + urgency, so the dashboard reads like a prioritized
 * to-do.
 *
 * Each card is a mission-board flip card (same pattern as the Paycheck tab):
 * the FRONT shows one clear next step + an XP bar + the primary action; the
 * BACK ("☰ Details") flips to reveal the full checklist, the key dates, and a
 * deep link into the module. This keeps the dashboard scannable — one action
 * per card — while the granular detail is one tap away on the reverse.
 */

export type AdvanceAction = {
  /** Button label, e.g. "Mark bonus received". */
  label: string
  /** When true, the list first prompts for which direct-deposit source worked
   *  (optional) and passes it to run() — same data point as the sequencer's
   *  Bonus Posted step. */
  ddCapture?: boolean
  /** Performs the mutation. The list calls onChanged() after it resolves. */
  run: (ddMethod?: string | null) => Promise<void>
}

export type ChecklistItem = {
  label: string
  done: boolean
  /** The next not-yet-done step (highlighted). */
  current: boolean
}

export type StartedBonus = {
  module: "paycheck" | "spending" | "savings"
  name: string
  amount: number                // expected or projected value
  started_date: string | null   // ISO yyyy-mm-dd
  nextStep?: string | null      // e.g. "Hit $2,000 spend" or "Hold for 60 more days"
  deadline?: string | null      // ISO yyyy-mm-dd for the next required action
  urgency?: BonusUrgency        // overdue | urgent | soon | none
  href: string
  bonus_id?: string | null      // catalog ID for portal-stack lookup; null when no catalog match
  /** ISO yyyy-mm-dd of when the cash bonus is expected to post. */
  expected_payout_date?: string | null
  /** ISO yyyy-mm-dd of when the account can be safely closed. */
  safe_close_date?: string | null
  /** One-tap action to advance this bonus to its next step. */
  advance?: AdvanceAction | null
  /** One-tap action to reverse the most-recent completed step (the mission-board
   *  "Undo" the section pages carry). Null when there's nothing to walk back. */
  undo?: AdvanceAction | null
  /** Ordered milestone checklist shown on the back of the card. */
  checklist?: ChecklistItem[]
}

// Dark "mission board" module accents + urgency — pulled from the shared theme
// so the dashboard to-do reads exactly like the Paycheck cards. `bg` is the
// translucent chip tint that works on the near-black board (the old pastels
// only read on white).
const MODULE_COLORS: Record<StartedBonus["module"], { fg: string; bg: string; label: string }> = {
  paycheck: { fg: MODULE.paycheck.fg, bg: MODULE.paycheck.soft, label: "Paycheck" },
  spending: { fg: MODULE.spending.fg, bg: MODULE.spending.soft, label: "Spending" },
  savings: { fg: MODULE.savings.fg, bg: MODULE.savings.soft, label: "Savings" },
}

const URGENCY_STYLE: Record<BonusUrgency, { border: string; chipBg: string; chipFg: string; chipLabel: string | null }> = URGENCY_DK

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const then = new Date(dateStr + "T00:00:00")
  return Math.floor((Date.now() - then.getTime()) / 86400000)
}

function fmtDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function keyOf(b: StartedBonus): string {
  return `${b.module}:${b.bonus_id ?? b.name}:${b.started_date ?? ""}`
}

export default function StartedBonusesList({
  bonuses,
  onChanged,
}: {
  bonuses: StartedBonus[]
  /** Called after an inline advance so the dashboard can reload its data. */
  onChanged?: () => void
}) {
  const [flippedSet, setFlippedSet] = useState<Set<string>>(new Set())
  const [busyKey, setBusyKey] = useState<string | null>(null)
  // "Which DD worked?" prompt: which card is asking, plus the picker state.
  const [ddPromptKey, setDdPromptKey] = useState<string | null>(null)
  const [ddValue, setDdValue] = useState("")
  const [ddSearchOpen, setDdSearchOpen] = useState(false)
  const [ddSearch, setDdSearch] = useState("")

  // Tracks which cards have been flipped at least once, so the 3D flip-in
  // animation only fires on a real user flip — never on first paint.
  const flipAnimatedRef = useRef<Set<string>>(new Set())
  function toggle(key: string) {
    flipAnimatedRef.current.add(key)
    setFlippedSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function resetDdPrompt() {
    setDdPromptKey(null); setDdValue(""); setDdSearchOpen(false); setDdSearch("")
  }

  // Advances that capture a DD source first open the inline picker; the rest run
  // straight away.
  function clickAdvance(key: string, advance: AdvanceAction) {
    if (busyKey) return
    if (advance.ddCapture) {
      setDdValue(""); setDdSearchOpen(false); setDdSearch("")
      setDdPromptKey(prev => (prev === key ? null : key))
      return
    }
    runAdvance(key, advance)
  }

  async function runAdvance(key: string, advance: AdvanceAction, ddMethod?: string | null) {
    if (busyKey) return
    setBusyKey(key)
    try {
      await advance.run(ddMethod)
      resetDdPrompt()
      onChanged?.()
    } finally {
      setBusyKey(null)
    }
  }

  // Walk the bonus back one step — the inverse of `advance`. Same guard/reload
  // path so the dashboard stays in sync after an accidental "Mark …".
  async function runUndo(key: string, undo: AdvanceAction) {
    if (busyKey) return
    setBusyKey(key)
    try {
      await undo.run()
      onChanged?.()
    } finally {
      setBusyKey(null)
    }
  }

  if (bonuses.length === 0) {
    return (
      <div style={{
        background: DK.panel,
        border: `1px dashed ${DK.border2}`,
        borderRadius: 12,
        padding: "32px 24px",
        textAlign: "center",
        color: DK.textMute,
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 700, color: DK.textDim, marginBottom: 6 }}>No bonuses in progress yet</div>
        <div style={{ lineHeight: 1.6 }}>
          Pick a tab and tap a bank or card to start tracking it:<br />
          <a href="/stacksos/paycheck" style={{ color: MODULE.paycheck.fg, fontWeight: 700, textDecoration: "none" }}>Paycheck</a> = checking bonuses (direct deposit) ·{" "}
          <a href="/stacksos/spending" style={{ color: MODULE.spending.fg, fontWeight: 700, textDecoration: "none" }}>Spending</a> = credit-card bonuses ·{" "}
          <a href="/stacksos/savings" style={{ color: MODULE.savings.fg, fontWeight: 700, textDecoration: "none" }}>Savings</a> = high-yield cash bonuses
        </div>
      </div>
    )
  }

  const sorted = [...bonuses].sort((a, b) => {
    const ua = URGENCY_RANK[a.urgency ?? "none"]
    const ub = URGENCY_RANK[b.urgency ?? "none"]
    if (ua !== ub) return ua - ub
    const da = daysUntil(a.deadline ?? null)
    const db = daysUntil(b.deadline ?? null)
    if (da != null && db != null) return da - db
    if (da != null) return -1
    if (db != null) return 1
    return (b.started_date || "").localeCompare(a.started_date || "")
  })

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: DK.text, margin: 0 }}>Your next steps</h2>
        <div style={{ fontSize: 11, color: DK.textMute }}>
          {sorted.length} bonus{sorted.length !== 1 ? "es" : ""} active
        </div>
      </div>
      <div style={{ fontSize: 12, color: DK.textFaint, marginBottom: 10 }}>
        Each card shows your one next step. Flip it for the full checklist &amp; details.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="started-bonuses-list">
        {sorted.map((b) => {
          const key = keyOf(b)
          const isFlipped = flippedSet.has(key)
          const flipAnimate = flipAnimatedRef.current.has(key)
          const isBusy = busyKey === key
          const color = MODULE_COLORS[b.module]
          const urgency = b.urgency ?? "none"
          const urg = URGENCY_STYLE[urgency]
          const days = daysSince(b.started_date)
          const daysLeft = daysUntil(b.deadline ?? null)
          const deadlineLabel = fmtDeadline(b.deadline)
          const urgent = urgency === "urgent" || urgency === "overdue"
          // XP bar — milestones done vs total; the 💵 payout lights up as you close in.
          const doneCount = b.checklist?.filter((c) => c.done).length ?? 0
          const totalCount = b.checklist?.length ?? 0
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
          const xpReady = pct >= 100
          const cashNear = pct >= 70
          return (
            <div
              key={key}
              className="sbl-card"
              style={{
                background: DK.panel,
                border: `1px solid ${urgent ? urg.border : DK.border}`,
                borderLeft: urgent ? `4px solid ${urg.border}` : `1px solid ${DK.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Persistent header — module + name + amount + flip toggle.
                  Stays put on both faces (mirrors the Paycheck card). */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 0" }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: color.fg, background: color.bg,
                  padding: "3px 9px", borderRadius: 99, textTransform: "uppercase",
                  letterSpacing: "0.05em", flexShrink: 0,
                }}>
                  {color.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DK.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.name}
                  </div>
                  {days != null && (
                    <div style={{ fontSize: 11, color: DK.textFaint, marginTop: 2 }}>
                      Started {days} day{days !== 1 ? "s" : ""} ago
                    </div>
                  )}
                </div>
                <div className="sbl-amount" style={{ fontSize: 16, fontWeight: 800, color: DK.text, flexShrink: 0 }}>
                  ${Math.round(b.amount).toLocaleString()}
                </div>
                <button
                  onClick={() => toggle(key)}
                  title={isFlipped ? "Back to the next step" : "See every step & the details"}
                  style={{
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    color: isFlipped ? DK.accentFg : DK.textMute,
                    background: isFlipped ? "rgba(37,99,235,0.14)" : DK.panel2,
                    border: `1px solid ${isFlipped ? "rgba(37,99,235,0.4)" : DK.border2}`,
                    borderRadius: 8, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  {isFlipped ? "↩ Back" : "☰ Details"}
                </button>
              </div>

              {/* Flip body — FRONT (one next step) OR BACK (full checklist).
                  Keyed so it re-mounts and does the 3D rotateY swing on each flip. */}
              <div
                key={isFlipped ? "back" : "front"}
                style={flipAnimate ? {
                  animation: `${isFlipped ? "sblFlipBack" : "sblFlipFront"} .45s cubic-bezier(.2,.7,.2,1) both`,
                  transformOrigin: "center",
                } : undefined}
              >
                {!isFlipped ? (
                  <>
                    {/* FRONT: the single next step + XP bar + primary action */}
                    {b.nextStep && (
                      <div style={{ fontSize: 12.5, color: DK.textDim, margin: "10px 18px 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700 }}>🎯 {b.nextStep}</span>
                        {deadlineLabel && (
                          <span style={{ color: urgent ? DK.amber : DK.textMute, fontWeight: urgent ? 700 : 400 }}>
                            · by {deadlineLabel}
                            {daysLeft != null && (
                              <>
                                {" "}({daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "today" : `${daysLeft}d left`})
                              </>
                            )}
                          </span>
                        )}
                        {urg.chipLabel && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: urg.chipBg, color: urg.chipFg, padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {urg.chipLabel}
                          </span>
                        )}
                        <PortalStacksBadge bonusId={b.bonus_id} />
                      </div>
                    )}

                    {totalCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px 0" }}>
                        <div style={{ flex: 1, height: 8, borderRadius: 99, background: DK.panel2, border: `1px solid ${DK.border}`, overflow: "hidden", position: "relative" }}>
                          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, borderRadius: 99, background: xpReady ? `linear-gradient(90deg,${DK.green},${DK.gold})` : moduleGradient(b.module, 90), transition: "width .6s cubic-bezier(.2,.7,.2,1)", overflow: "hidden" }}>
                            <div style={{ position: "absolute", top: 0, height: "100%", width: "22%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)", animation: "goalShimmer 2.2s linear infinite" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: xpReady ? DK.gold : color.fg, flexShrink: 0, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                        <span title="The payout" style={{ fontSize: 14, flexShrink: 0, filter: cashNear ? "none" : "grayscale(0.85)", opacity: cashNear ? 1 : 0.45, transition: "filter .3s, opacity .3s" }}>💵</span>
                      </div>
                    )}

                    {/* Primary action lives on the front (with the DD-source prompt below it) */}
                    {b.advance && (
                      <div style={{ padding: "12px 18px 16px" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); clickAdvance(key, b.advance!) }}
                          disabled={isBusy}
                          className="sbl-advance"
                          style={{
                            width: "100%", fontSize: 13, fontWeight: 700, color: "#fff",
                            background: ddPromptKey === key ? DK.panel2 : moduleGradient(b.module),
                            border: ddPromptKey === key ? `1px solid ${DK.border2}` : "none",
                            borderRadius: 10, padding: "11px 16px", cursor: isBusy ? "wait" : "pointer",
                            opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          {isBusy ? "Saving…" : ddPromptKey === key ? "Cancel" : b.advance.label}
                        </button>
                      </div>
                    )}

                    {/* "Which deposit worked?" — shown before completing a DD-capture advance */}
                    {ddPromptKey === key && b.advance && (
                      <div style={{ borderTop: `1px solid ${DK.border}`, background: DK.panel2, padding: "12px 18px" }}>
                        <div style={{ fontSize: 12, color: DK.greenFg, fontWeight: 600, marginBottom: 8 }}>
                          Which deposit triggered it? <span style={{ color: DK.textFaint, fontWeight: 400 }}>(optional — helps track what works)</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); setDdValue(ddValue === DD_EMPLOYER ? "" : DD_EMPLOYER); setDdSearchOpen(false); setDdSearch("") }}
                            style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: ddValue === DD_EMPLOYER ? `1.5px solid ${DK.green}` : `1px solid ${DK.border2}`, background: ddValue === DD_EMPLOYER ? MODULE.savings.soft : DK.panel, color: ddValue === DD_EMPLOYER ? DK.greenFg : DK.textDim }}>
                            {ddValue === DD_EMPLOYER ? "✓ " : ""}Employer / payroll
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDdSearchOpen(v => !v); setDdValue("") }}
                            style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: ddSearchOpen ? `1.5px solid ${DK.accent2}` : `1px solid ${DK.border2}`, background: ddSearchOpen ? MODULE.paycheck.soft : DK.panel, color: ddSearchOpen ? DK.accentFg : DK.textDim }}>
                            Other source…
                          </button>
                          {!ddSearchOpen && ddValue && ddValue !== DD_EMPLOYER && (
                            <span style={{ fontSize: 12, color: DK.greenFg, fontWeight: 600 }}>via {ddValue}</span>
                          )}
                        </div>
                        {ddSearchOpen && (
                          <div style={{ marginTop: 8 }}>
                            <input autoFocus value={ddSearch} onChange={(e) => setDdSearch(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Search bank, brokerage, or app…"
                              style={{ width: "100%", maxWidth: 300, padding: "7px 10px", fontSize: 13, border: `1px solid ${DK.border2}`, borderRadius: 8, outline: "none", background: DK.panel, color: DK.text, boxSizing: "border-box" }} />
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                              {DD_SOURCES.filter(s => s.toLowerCase().includes(ddSearch.trim().toLowerCase())).slice(0, 8).map(s => (
                                <button key={s} onClick={(e) => { e.stopPropagation(); setDdSearch(s) }}
                                  style={{ padding: "4px 10px", fontSize: 12, borderRadius: 99, cursor: "pointer", border: ddSearch.trim().toLowerCase() === s.toLowerCase() ? `1.5px solid ${DK.accent2}` : `1px solid ${DK.border2}`, background: ddSearch.trim().toLowerCase() === s.toLowerCase() ? MODULE.paycheck.soft : DK.panel, color: DK.textDim }}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={(e) => { e.stopPropagation(); runAdvance(key, b.advance!, ddSearchOpen ? ddSearch.trim() : ddValue) }}
                            disabled={isBusy}
                            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, background: moduleGradient(b.module), color: "#fff", border: "none", borderRadius: 8, cursor: isBusy ? "wait" : "pointer", opacity: isBusy ? 0.6 : 1 }}>
                            {isBusy ? "Saving…" : "Save & mark received"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); runAdvance(key, b.advance!, null) }}
                            disabled={isBusy}
                            style={{ padding: "8px 14px", fontSize: 12, color: DK.textMute, background: "none", border: `1px solid ${DK.border2}`, borderRadius: 8, cursor: "pointer" }}>
                            Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* BACK: key dates + full checklist + deep link into the module */}
                    {(b.expected_payout_date || b.safe_close_date) && (
                      <div style={{ fontSize: 11, color: DK.textMute, margin: "10px 18px 0", display: "flex", gap: 14, flexWrap: "wrap" }}>
                        {b.expected_payout_date && <span>Estimated payout {fmtDeadline(b.expected_payout_date)}</span>}
                        {b.safe_close_date && <span>Safe to close {fmtDeadline(b.safe_close_date)}</span>}
                      </div>
                    )}
                    <div style={{ background: DK.panel2, borderTop: `1px solid ${DK.border}`, marginTop: 12, padding: "14px 18px 16px" }}>
                      {b.checklist && b.checklist.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: DK.textFaint }}>Checklist</div>
                          {b.undo && (
                            <button
                              onClick={(e) => { e.stopPropagation(); runUndo(key, b.undo!) }}
                              disabled={isBusy}
                              style={{ fontSize: 11, color: DK.textMute, background: "none", border: "none", cursor: isBusy ? "wait" : "pointer", padding: "2px 0" }}
                            >
                              {isBusy ? "…" : "↩ Undo last step"}
                            </button>
                          )}
                        </div>
                      )}
                      {b.checklist && b.checklist.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
                          {b.checklist.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                              <span style={{
                                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                border: item.done ? "none" : `2px solid ${item.current ? color.fg : DK.border2}`,
                                background: item.done ? DK.green : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {item.done && (
                                  <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                              <span style={{
                                fontSize: 13,
                                color: item.done ? DK.textFaint : item.current ? DK.text : DK.textMute,
                                fontWeight: item.current ? 600 : 400,
                                textDecoration: item.done ? "line-through" : "none",
                              }}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <a
                        href={b.href}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-block", fontSize: 13, fontWeight: 600, color: color.fg,
                          padding: "9px 14px", border: `1px solid ${color.fg}55`, borderRadius: 8,
                          textDecoration: "none",
                        }}
                      >
                        Open in {color.label} →
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes sblFlipFront { 0% { transform: perspective(1000px) rotateY(-90deg); opacity: 0 } 55% { opacity: 1 } 100% { transform: perspective(1000px) rotateY(0deg); opacity: 1 } }
        @keyframes sblFlipBack  { 0% { transform: perspective(1000px) rotateY(90deg); opacity: 0 } 55% { opacity: 1 } 100% { transform: perspective(1000px) rotateY(0deg); opacity: 1 } }
        @media (max-width: 380px) {
          .started-bonuses-list .sbl-amount { font-size: 15px !important; }
        }
      `}</style>
    </div>
  )
}
