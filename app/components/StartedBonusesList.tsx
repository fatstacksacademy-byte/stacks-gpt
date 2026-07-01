"use client"

import { useState, useRef } from "react"
import { URGENCY_RANK, daysUntil, type BonusUrgency } from "../../lib/bonusNextStep"
import { DD_SOURCES, DD_EMPLOYER } from "../../lib/ddSources"
import PortalStacksBadge from "./PortalStacksBadge"
import TierPicker, { type TierOption } from "./TierPicker"
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
  /** Editable key dates (opened / bonus posted / closed) shown on the back of
   *  the card, so a date stamped when the box was checked can be corrected to
   *  when the event actually happened. Same affordance the paycheck (BofA) card
   *  has — surfaced on EVERY started bonus, on every surface. */
  dateEdits?: {
    key: string
    label: string
    value: string | null            // ISO yyyy-mm-dd
    set: (iso: string) => Promise<void>
  }[] | null
  /** Direct-deposit logging — for checking bonuses with a DD-total requirement.
   *  Lets the user log individual deposits (amount + source) right on the
   *  dashboard, accumulating toward the requirement. Null when the bonus has no
   *  DD-total requirement (custom / spending / savings). */
  deposit?: {
    required: number
    soFar: number
    log: (amount: number, source: string | null) => Promise<void>
  } | null
  /** Deposit-tier chooser — for multi-tier savings bonuses (e.g. Capital One
   *  $20k→$300 vs $100k→$1,500). Lets the user re-pick the tier right on the
   *  dashboard; changing it updates the deposit target + bonus everywhere.
   *  Null when the bonus isn't tiered. */
  tier?: {
    options: TierOption[]
    onSelect: (key: string | number) => void | Promise<void>
    footnote?: string
    accent: string
  } | null
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
  // Deposit-logging form (log a DD toward a checking bonus's requirement).
  const [depLogKey, setDepLogKey] = useState<string | null>(null)
  const [depAmount, setDepAmount] = useState("")
  const [depSource, setDepSource] = useState("")        // "" → Employer / payroll default
  const [depSearchOpen, setDepSearchOpen] = useState(false)
  const [depSearch, setDepSearch] = useState("")

  function resetDepForm() {
    setDepLogKey(null); setDepAmount(""); setDepSource(""); setDepSearchOpen(false); setDepSearch("")
  }
  async function submitDeposit(key: string, deposit: NonNullable<StartedBonus["deposit"]>) {
    const amount = Math.round(Number(depAmount) || 0)
    if (amount <= 0 || busyKey) return
    const source = depSearchOpen ? (depSearch.trim() || null) : (depSource || DD_EMPLOYER)
    setBusyKey(key)
    try {
      await deposit.log(amount, source)
      resetDepForm()
      onChanged?.()
    } finally {
      setBusyKey(null)
    }
  }

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

                    {/* Deposit-tier chooser — for multi-tier savings bonuses,
                        right on the dashboard (no need to open the Savings tab). */}
                    {b.tier && b.tier.options.length > 1 && (
                      <div style={{ padding: "10px 18px 0" }} onClick={(e) => e.stopPropagation()}>
                        <TierPicker
                          accent={b.tier.accent}
                          label="Deposit tier"
                          options={b.tier.options}
                          onSelect={async (k) => { setBusyKey(key); try { await b.tier!.onSelect(k); onChanged?.() } finally { setBusyKey(null) } }}
                          footnote={b.tier.footnote}
                        />
                      </div>
                    )}

                    {/* Direct-deposit logging — progress toward the DD requirement
                        + a "＋ Log a deposit" form (amount + source), right on the
                        dashboard. Only for checking bonuses that carry a DD total. */}
                    {b.deposit && (() => {
                      const dep = b.deposit!
                      const pctDep = dep.required > 0 ? Math.min(100, Math.round((dep.soFar / dep.required) * 100)) : 0
                      const isLogging = depLogKey === key
                      const employerActive = !depSearchOpen && (depSource === DD_EMPLOYER || !depSource)
                      return (
                        <div style={{ padding: "12px 18px 0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: DK.textMute }}>💵 Direct deposits logged</span>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: DK.greenFg }}>${dep.soFar.toLocaleString()} / ${dep.required.toLocaleString()}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: DK.panel2, border: `1px solid ${DK.border}`, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", width: `${pctDep}%`, borderRadius: 99, background: `linear-gradient(90deg, ${DK.green}, ${DK.greenFg})`, transition: "width .5s ease" }} />
                          </div>
                          {!isLogging ? (
                            <button onClick={(e) => { e.stopPropagation(); resetDepForm(); setDepLogKey(key) }}
                              style={{ fontSize: 12, fontWeight: 700, color: DK.greenFg, background: "none", border: `1px solid ${DK.green}66`, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
                              ＋ Log a deposit
                            </button>
                          ) : (
                            <div style={{ background: DK.panel2, border: `1px solid ${DK.border2}`, borderRadius: 10, padding: "10px 12px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: DK.textMute, marginBottom: 8 }}>Log a direct deposit</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: DK.textDim }}>$</span>
                                <input autoFocus type="number" inputMode="numeric" value={depAmount} onChange={(e) => setDepAmount(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Amount"
                                  style={{ flex: 1, minWidth: 0, padding: "8px 11px", fontSize: 15, fontWeight: 700, background: DK.panel, border: `1px solid ${DK.border2}`, borderRadius: 8, color: DK.text, outline: "none", boxSizing: "border-box" }} />
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                                <button onClick={(e) => { e.stopPropagation(); setDepSource(DD_EMPLOYER); setDepSearchOpen(false); setDepSearch("") }}
                                  style={{ padding: "6px 11px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: employerActive ? `1.5px solid ${DK.green}` : `1px solid ${DK.border2}`, background: employerActive ? MODULE.savings.soft : DK.panel, color: employerActive ? DK.greenFg : DK.textDim }}>
                                  Employer / payroll
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDepSearchOpen(v => !v); setDepSource("") }}
                                  style={{ padding: "6px 11px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: depSearchOpen ? `1.5px solid ${DK.accent2}` : `1px solid ${DK.border2}`, background: depSearchOpen ? MODULE.paycheck.soft : DK.panel, color: depSearchOpen ? DK.accentFg : DK.textDim }}>
                                  Other source…
                                </button>
                              </div>
                              {depSearchOpen && (
                                <div style={{ marginBottom: 8 }}>
                                  <input value={depSearch} onChange={(e) => setDepSearch(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Search bank, brokerage, or app…"
                                    style={{ width: "100%", maxWidth: 300, padding: "7px 10px", fontSize: 13, border: `1px solid ${DK.border2}`, borderRadius: 8, outline: "none", background: DK.panel, color: DK.text, boxSizing: "border-box" }} />
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                    {DD_SOURCES.filter(s => s.toLowerCase().includes(depSearch.trim().toLowerCase())).slice(0, 8).map(s => (
                                      <button key={s} onClick={(e) => { e.stopPropagation(); setDepSearch(s) }}
                                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 99, cursor: "pointer", border: depSearch.trim().toLowerCase() === s.toLowerCase() ? `1.5px solid ${DK.accent2}` : `1px solid ${DK.border2}`, background: depSearch.trim().toLowerCase() === s.toLowerCase() ? MODULE.paycheck.soft : DK.panel, color: DK.textDim }}>
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={(e) => { e.stopPropagation(); submitDeposit(key, dep) }} disabled={isBusy || !(Number(depAmount) > 0)}
                                  style={{ padding: "8px 14px", fontSize: 12.5, fontWeight: 700, background: moduleGradient("paycheck"), color: "#fff", border: "none", borderRadius: 8, cursor: (isBusy || !(Number(depAmount) > 0)) ? "default" : "pointer", opacity: (isBusy || !(Number(depAmount) > 0)) ? 0.5 : 1 }}>
                                  {isBusy ? "Logging…" : "Log deposit"}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); resetDepForm() }}
                                  style={{ padding: "8px 14px", fontSize: 12.5, color: DK.textMute, background: "none", border: `1px solid ${DK.border2}`, borderRadius: 8, cursor: "pointer" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Front footer — the primary action (when there is one) + a
                        clear "Open in <module>" prompt, always visible so a started
                        bonus can always jump to its module page (fixes the missing
                        "Open in Savings" cue). */}
                    <div style={{ padding: "12px 18px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {b.advance && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clickAdvance(key, b.advance!) }}
                          disabled={isBusy}
                          className="sbl-advance"
                          style={{
                            flex: "1 1 auto", fontSize: 13, fontWeight: 700, color: "#fff",
                            background: ddPromptKey === key ? DK.panel2 : moduleGradient(b.module),
                            border: ddPromptKey === key ? `1px solid ${DK.border2}` : "none",
                            borderRadius: 10, padding: "11px 16px", cursor: isBusy ? "wait" : "pointer",
                            opacity: isBusy ? 0.6 : 1,
                          }}
                        >
                          {isBusy ? "Saving…" : ddPromptKey === key ? "Cancel" : b.advance.label}
                        </button>
                      )}
                      <a href={b.href} onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12.5, fontWeight: 600, color: color.fg, textDecoration: "none", whiteSpace: "nowrap", padding: "8px 4px", flexShrink: 0 }}>
                        Open in {color.label} →
                      </a>
                    </div>

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
                    {/* Editable key dates — correct the open/posted/closed date to
                        when it actually happened, right on the card. */}
                    {b.dateEdits && b.dateEdits.length > 0 && (
                      <div style={{ margin: "12px 18px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: DK.textFaint }}>Dates</div>
                        {b.dateEdits.map((d) => (
                          <div key={d.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <label htmlFor={`${key}:${d.key}`} style={{ fontSize: 12.5, color: DK.textMute }}>{d.label}</label>
                            <input
                              id={`${key}:${d.key}`}
                              type="date"
                              value={d.value ? d.value.slice(0, 10) : ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={async (e) => {
                                const iso = e.target.value
                                if (!iso || busyKey) return
                                setBusyKey(key)
                                try { await d.set(iso); onChanged?.() } finally { setBusyKey(null) }
                              }}
                              style={{ fontSize: 12.5, color: DK.text, background: DK.panel2, border: `1px solid ${DK.border2}`, borderRadius: 8, padding: "6px 9px", colorScheme: "dark" }}
                            />
                          </div>
                        ))}
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
