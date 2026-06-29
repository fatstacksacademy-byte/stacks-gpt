"use client"

// Stacks OS — Debt Payoff Strategy Simulator (UI)
//
// Educational simulator only. Not financial, lending, or tax advice. The math
// engine (lib/debtSimulator) and persistence (lib/debtStore) are tested and
// owned elsewhere — this file is purely the UI over them.

import React, { useEffect, useMemo, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import InfoTip from "../../components/InfoTip"
import {
  compareStrategies,
  loanScenarioGrid,
  maxBeneficialLoanApr,
  amortizedPayment,
  formatMoney,
  round2,
  totalDebt,
  STRATEGY_GOAL_LABEL,
  FICO_BAND_LABEL,
  type FinancialPicture,
  type DebtInstrument,
  type CreditCardDebt,
  type InstallmentDebt,
  type BalanceTransferOffer,
  type ConsolidationLoanOffer,
  type CreditProfile,
  type StrategyGoal,
  type StrategyResult,
  type StrategyWarning,
  type FicoBand,
  type ApprovalStatus,
  type ConsolidationLoanFeeMode,
} from "../../../lib/debtSimulator"
import {
  loadScenario,
  saveScenario,
  clearScenario,
  emptyScenario,
  demoScenario,
  configureUserScope,
  type DebtScenario,
} from "../../../lib/debtStore"
import { createClient } from "../../../lib/supabase/client"
import { matchStatementCardToCatalog, type CardCatalogMatch } from "../../../lib/cardCatalogMatch"
import { markBonusAlreadyHad, getCompletedBonuses } from "../../../lib/completedBonuses"

// ----------------------------------------------------------------------------
// Shared style constants (matching the codebase aesthetic)
// ----------------------------------------------------------------------------

const cardBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
}

const label: React.CSSProperties = {
  fontSize: 11, color: "#999", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6,
}

const primaryBtn: React.CSSProperties = {
  background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
}

const secondaryBtn: React.CSSProperties = {
  background: "#fff", color: "#666", border: "1px solid #e0e0e0", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#999", border: "1px solid #e8e8e8", borderRadius: 6,
  padding: "6px 12px", fontSize: 12, cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111",
  border: "1px solid #e0e0e0", borderRadius: 6, width: "100%",
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111",
  border: "1px solid #e0e0e0", borderRadius: 6, width: "100%",
}

const computedStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#f9f9f9", color: "#555",
  border: "1px solid #e8e8e8", borderRadius: 6, width: "100%",
}

const fieldLabel: React.CSSProperties = { fontSize: 11, color: "#777", marginBottom: 4, display: "block" }
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4 }
const muted: React.CSSProperties = { fontSize: 12, color: "#999", lineHeight: 1.5 }

const ACCENT = "#0d7c5f"

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

const todayISO = () => new Date().toISOString().split("T")[0]
const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
const num = (v: string): number => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const pctStr = (decimal: number): string => `${round2(decimal * 100)}%`

// Rate/fee inputs store DECIMALS (0.2499 = 24.99%) but users type a PERCENT.
// This control shows the decimal as a percent and stores back a decimal,
// clamped to [0,100]%, so a typed "29.99" becomes 0.2999 — not 2999% APR.
function PercentInput({
  value,
  onChange,
  allowNull = false,
  style,
}: {
  value: number | null
  onChange: (decimal: number | null) => void
  allowNull?: boolean
  style?: React.CSSProperties
}) {
  const display = value == null ? "" : String(round2(value * 100))
  return (
    <div style={{ position: "relative", display: "block" }}>
      <input
        type="number"
        step="0.01"
        min={0}
        inputMode="decimal"
        value={display}
        onChange={e => {
          const raw = e.target.value
          if (raw === "") { onChange(allowNull ? null : 0); return }
          const pct = parseFloat(raw)
          if (!Number.isFinite(pct)) { onChange(allowNull ? null : 0); return }
          const clamped = Math.max(0, Math.min(100, pct))
          onChange(round2(clamped / 100))
        }}
        style={{ ...inputStyle, paddingRight: 24, ...style }}
      />
      <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 12, pointerEvents: "none" }}>%</span>
    </div>
  )
}

function severityColor(s: StrategyWarning["severity"]): string {
  if (s === "critical") return "#dc2626"
  if (s === "warn") return "#b45309"
  return "#6b7280"
}
function severityBg(s: StrategyWarning["severity"]): string {
  if (s === "critical") return "#fef2f2"
  if (s === "warn") return "#fffbeb"
  return "#f9fafb"
}

function WarningList({ warnings }: { warnings: StrategyWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
      {warnings.map((w, i) => (
        <div
          key={i}
          style={{
            fontSize: 12.5, lineHeight: 1.45, padding: "8px 10px", borderRadius: 6,
            background: severityBg(w.severity), color: severityColor(w.severity),
            border: `1px solid ${severityColor(w.severity)}22`,
          }}
        >
          {w.severity === "critical" ? "⛔ " : w.severity === "warn" ? "⚠ " : "ℹ "}
          {w.message}
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Root component
// ----------------------------------------------------------------------------

export default function DebtClient() {
  const [scenario, setScenario] = useState<DebtScenario | null>(null)
  const [loading, setLoading] = useState(true)
  const [startISO, setStartISO] = useState<string>("")
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Scope storage to the signed-in user BEFORE reading, so one account's
    // financial data never loads under another on a shared browser. The await
    // also keeps state writes out of the synchronous effect body.
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      configureUserScope(data.user?.id ?? null)
      setUserId(data.user?.id ?? null)
      setStartISO(todayISO())
      setScenario(loadScenario())
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Single centralized mutation helper: merge patch, set state, persist.
  function update(patch: Partial<DebtScenario>) {
    setScenario(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveScenario(next)
      return next
    })
  }

  function startDemo() {
    const s = demoScenario()
    saveScenario(s)
    setScenario(s)
  }
  function startEmpty() {
    const s = emptyScenario()
    saveScenario(s)
    setScenario(s)
  }
  function resetAll() {
    clearScenario()
    setScenario(null)
  }

  if (loading) {
    return (
      <>
        <CheckpointNav />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>Loading…</div>
      </>
    )
  }

  if (!scenario) {
    return (
      <>
        <CheckpointNav />
        <SetupScreen onDemo={startDemo} onEmpty={startEmpty} />
      </>
    )
  }

  return (
    <>
      <CheckpointNav />
      <Dashboard scenario={scenario} startISO={startISO || todayISO()} update={update} onReset={resetAll} userId={userId} />
    </>
  )
}

// ----------------------------------------------------------------------------
// 1. Setup / empty state
// ----------------------------------------------------------------------------

function SetupScreen({ onDemo, onEmpty }: { onDemo: () => void; onEmpty: () => void }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Debt Payoff Strategy Simulator</h1>
      <p style={{ color: "#555", marginBottom: 20, lineHeight: 1.6 }}>
        Model how avalanche payoff, balance transfers, and consolidation loans compare for your
        situation, with an auditable month-by-month schedule. This is an{" "}
        <b>educational simulator — not financial, lending, or tax advice.</b> Projected dates and
        savings are estimates, never guarantees. All data stays in your browser.
      </p>
      <div style={cardBox}>
        <h3 style={{ ...sectionTitle, marginBottom: 8 }}>Get started</h3>
        <p style={{ ...muted, marginBottom: 16 }}>
          Pick a starting point. You can edit everything afterward, and nothing leaves your device.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={primaryBtn} onClick={onEmpty}>Start from scratch</button>
          <button style={secondaryBtn} onClick={onDemo}>Load fictional demo data</button>
        </div>
        <p style={{ ...muted, marginTop: 14 }}>
          The demo loads a completely <b>fictional</b> &ldquo;Sam Sample&rdquo;-style dataset (invented
          balances, offers, and a credit profile) so you can explore the tool. It is{" "}
          <b>not real data</b> and is never loaded automatically.
        </p>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Dashboard
// ----------------------------------------------------------------------------

function Dashboard({
  scenario, startISO, update, onReset, userId,
}: {
  scenario: DebtScenario
  startISO: string
  update: (patch: Partial<DebtScenario>) => void
  onReset: () => void
  userId: string | null
}) {
  const picture: FinancialPicture = useMemo(() => ({
    debts: scenario.debts,
    monthlyBudget: scenario.monthlyBudget,
    availableCash: scenario.availableCash,
    emergencyBuffer: scenario.emergencyBuffer,
    balanceTransfers: scenario.balanceTransfers,
    consolidationLoans: scenario.consolidationLoans,
    creditProfile: scenario.creditProfile,
    goal: scenario.goal,
    startDateISO: startISO,
  }), [scenario, startISO])

  const comparison = useMemo(() => compareStrategies(picture), [picture])

  const minPaymentsSum = useMemo(
    () => round2(scenario.debts.reduce((s, d) =>
      s + (d.kind === "credit_card" ? d.minPayment : d.monthlyPayment), 0)),
    [scenario.debts],
  )
  const extraCapacity = round2(scenario.monthlyBudget - minPaymentsSum)
  const usableCash = Math.max(0, round2(scenario.availableCash - scenario.emergencyBuffer))

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Debt Payoff Strategy Simulator</h1>
          <div style={{ ...muted, marginTop: 4 }}>
            Total debt: <b style={{ color: "#111" }}>{formatMoney(totalDebt(picture))}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scenario.isDemo && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 999, padding: "4px 12px" }}>
              Viewing fictional demo data
            </span>
          )}
          <button style={ghostBtn} onClick={() => { if (confirm("Clear all debt data and start over?")) onReset() }}>
            Reset / clear data
          </button>
        </div>
      </div>

      <GoalSelector goal={scenario.goal} onChange={g => update({ goal: g })} />

      <InputsPanel
        scenario={scenario}
        minPaymentsSum={minPaymentsSum}
        extraCapacity={extraCapacity}
        usableCash={usableCash}
        update={update}
      />

      <StatementImportSection debts={scenario.debts} update={update} userId={userId} />

      <DebtsSection debts={scenario.debts} update={update} />

      <BalanceTransferSection offers={scenario.balanceTransfers} startISO={startISO} update={update} />

      <ConsolidationLoanSection offers={scenario.consolidationLoans} startISO={startISO} update={update} />

      <CreditProfileSection profile={scenario.creditProfile} update={update} />

      <ResultsSection comparison={comparison} />

      <NextMovePanel comparison={comparison} />

      <ScheduleSection strategies={comparison.strategies} recommendedKind={comparison.recommended.kind} />

      <LoanSimulatorWidget picture={picture} />

      <GuardrailFooter />
    </div>
  )
}

// ----------------------------------------------------------------------------
// 2. Goal selector
// ----------------------------------------------------------------------------

const GOALS: StrategyGoal[] = ["lowest_cost", "fastest", "lowest_payment", "protect_credit"]

// Plain-English trade-off shown under each goal so beginners grasp the choice.
const GOAL_BLURB: Record<StrategyGoal, string> = {
  lowest_cost: "Pay the least interest overall.",
  fastest: "Debt-free soonest — expect higher payments.",
  lowest_payment: "Easiest on your monthly budget.",
  protect_credit: "Avoid score dips and opening new credit.",
}

function GoalSelector({ goal, onChange }: { goal: StrategyGoal; onChange: (g: StrategyGoal) => void }) {
  return (
    <div style={cardBox}>
      <div style={label}>Optimize for</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {GOALS.map(g => {
          const active = g === goal
          return (
            <div key={g} style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 200 }}>
              <button
                onClick={() => onChange(g)}
                style={{
                  padding: "9px 16px", fontSize: 13, fontWeight: 600, borderRadius: 999, cursor: "pointer",
                  border: active ? `1px solid ${ACCENT}` : "1px solid #e0e0e0",
                  background: active ? ACCENT : "#fff",
                  color: active ? "#fff" : "#555",
                }}
              >
                {STRATEGY_GOAL_LABEL[g]}
              </button>
              <div style={{ fontSize: 11, color: "#999", lineHeight: 1.4, paddingLeft: 4 }}>{GOAL_BLURB[g]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 3. Inputs panel
// ----------------------------------------------------------------------------

function NumberField({
  labelText, value, onCommit, hint, prefix,
}: {
  labelText: string
  value: number
  onCommit: (n: number) => void
  hint?: string
  prefix?: string
}) {
  return (
    <div>
      <label style={fieldLabel}>{labelText}</label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          defaultValue={value}
          onBlur={e => onCommit(num(e.target.value))}
          style={{ ...inputStyle, paddingLeft: prefix ? 22 : 12 }}
        />
      </div>
      {hint && <div style={{ ...muted, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function InputsPanel({
  scenario, minPaymentsSum, extraCapacity, usableCash, update,
}: {
  scenario: DebtScenario
  minPaymentsSum: number
  extraCapacity: number
  usableCash: number
  update: (patch: Partial<DebtScenario>) => void
}) {
  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Your budget & cash</h3>
      <div style={{ ...muted, marginBottom: 16 }}>
        Strategies never spend below your emergency buffer.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <NumberField
          labelText="Total monthly debt budget"
          value={scenario.monthlyBudget}
          prefix="$"
          onCommit={n => update({ monthlyBudget: n })}
          hint="Everything you put toward debt each month (minimums + extra)."
        />
        <div>
          <label style={fieldLabel}>Sum of current minimum payments</label>
          <div style={computedStyle}>{formatMoney(minPaymentsSum)}/mo</div>
          <div style={{ ...muted, marginTop: 4 }}>Required minimums across all debts.</div>
        </div>
        <div>
          <label style={fieldLabel}>Extra monthly payment capacity</label>
          <div style={{ ...computedStyle, color: extraCapacity < 0 ? "#dc2626" : "#0d7c5f", fontWeight: 700 }}>
            {formatMoney(extraCapacity)}/mo
          </div>
          <div style={{ ...muted, marginTop: 4 }}>
            Budget − minimums. {extraCapacity < 0 ? "Negative: minimums exceed your budget." : "Extra that attacks the highest-APR debt."}
          </div>
          {extraCapacity < 0 && (
            <div style={{ ...muted, marginTop: 4, color: "#b45309" }}>
              Increase your monthly budget or pay down a balance before modeling strategies.
            </div>
          )}
        </div>
        <NumberField
          labelText="Available cash on hand"
          value={scenario.availableCash}
          prefix="$"
          onCommit={n => update({ availableCash: n })}
          hint="Lump cash you could deploy now."
        />
        <NumberField
          labelText="Emergency buffer (never spent)"
          value={scenario.emergencyBuffer}
          prefix="$"
          onCommit={n => update({ emergencyBuffer: n })}
          hint="Cash strategies will preserve."
        />
        <div>
          <label style={fieldLabel}>Usable cash</label>
          <div style={{ ...computedStyle, color: "#0d7c5f", fontWeight: 700 }}>{formatMoney(usableCash)}</div>
          <div style={{ ...muted, marginTop: 4 }}>max(0, available − buffer).</div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 3b. Import from a statement
// ----------------------------------------------------------------------------

// API response shapes (POST /api/debt-import). The route owns this contract;
// we only read it here.
type ImportSuccess = { debts: CreditCardDebt[]; warnings: string[]; accountsFound: number }
type ImportFailure = { error: string; warnings?: string[] }

const MAX_IMPORT_BYTES = 15 * 1024 * 1024 // 15 MB — mirrors the route's limit

// A small inline notice that reuses the StrategyWarning severity look.
function NoticeBox({ severity, children }: { severity: StrategyWarning["severity"]; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12.5, lineHeight: 1.45, padding: "8px 10px", borderRadius: 6,
        background: severityBg(severity), color: severityColor(severity),
        border: `1px solid ${severityColor(severity)}22`,
      }}
    >
      {children}
    </div>
  )
}

function StatementImportSection({ debts, update, userId }: { debts: DebtInstrument[]; update: (patch: Partial<DebtScenario>) => void; userId: string | null }) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Warnings can come from a failed response (error path) or a successful one.
  const [warnings, setWarnings] = useState<string[]>([])
  // Pending review list — null means no review in progress.
  const [review, setReview] = useState<CreditCardDebt[] | null>(null)
  // Bump to force-clear the file input after a successful add/discard.
  const [inputKey, setInputKey] = useState(0)
  // Per-review-debt opt-in to also track a recognized card in the churning
  // profile. Keyed by debt.id; true means "write a held-card record on add".
  const [churnOptIn, setChurnOptIn] = useState<Record<string, boolean>>({})
  // Brief note shown after the churning write completes.
  const [churnNote, setChurnNote] = useState<string | null>(null)

  // Catalog matches for the current review list, computed once per list. The
  // matcher is pure and conservative (returns null unless confident).
  const matches = useMemo<Record<string, CardCatalogMatch>>(() => {
    if (!review) return {}
    const out: Record<string, CardCatalogMatch> = {}
    for (const d of review) {
      const m = matchStatementCardToCatalog(d.name)
      if (m) out[d.id] = m
    }
    return out
  }, [review])

  // When a fresh review list arrives, default every matched card to checked.
  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const id of Object.keys(matches)) next[id] = true
    setChurnOptIn(next)
  }, [matches])

  function resetTransient() {
    setError(null)
    setWarnings([])
    setReview(null)
    setChurnNote(null)
  }

  function clearAll() {
    resetTransient()
    setFile(null)
    setChurnOptIn({})
    setInputKey(k => k + 1)
  }

  async function extract(f: File) {
    if (f.size > MAX_IMPORT_BYTES) {
      setReview(null)
      setWarnings([])
      setError("That file is larger than 15 MB. Try a single-statement PDF or a clearer photo.")
      return
    }
    setImporting(true)
    resetTransient()
    try {
      const body = new FormData()
      body.append("file", f)
      const res = await fetch("/api/debt-import", { method: "POST", body })
      const data = (await res.json().catch(() => null)) as ImportSuccess | ImportFailure | null
      if (!res.ok || !data) {
        const fail = (data ?? {}) as ImportFailure
        setError(fail.error || "We couldn't read that statement. Try a clearer file or add the card manually.")
        setWarnings(Array.isArray(fail.warnings) ? fail.warnings : [])
        return
      }
      const ok = data as ImportSuccess
      setWarnings(Array.isArray(ok.warnings) ? ok.warnings : [])
      if (!ok.debts || ok.debts.length === 0) {
        setError("No usable credit-card accounts were found in that file. Add the card manually below.")
        return
      }
      setReview(ok.debts)
    } catch {
      setError("Something went wrong uploading that file. Check your connection and try again.")
    } finally {
      setImporting(false)
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setReview(null)
    setError(null)
    setWarnings([])
    if (f) void extract(f) // auto-submit on pick
  }

  function editRow(id: string, patch: Partial<CreditCardDebt>) {
    setReview(prev => (prev ? prev.map(d => (d.id === id ? { ...d, ...patch } : d)) : prev))
  }

  // Collect the deduped set of catalogIds the user opted into, captured before
  // we clear the review state.
  function selectedCatalogIds(reviewList: CreditCardDebt[], optIn: Record<string, boolean>, matchMap: Record<string, CardCatalogMatch>): string[] {
    const ids = new Set<string>()
    for (const d of reviewList) {
      const m = matchMap[d.id]
      if (m && optIn[d.id]) ids.add(m.catalogId)
    }
    return [...ids]
  }

  // Persist opted-in cards as incomplete held-card records, skipping any
  // catalogId already present. Best-effort: failures never block the debt add.
  async function writeChurnProfile(catalogIds: string[]) {
    if (!userId || catalogIds.length === 0) return

    let toWrite = catalogIds
    try {
      const existing = await getCompletedBonuses(userId)
      const have = new Set(existing.map(b => b.bonus_id))
      toWrite = catalogIds.filter(id => !have.has(id))
    } catch {
      // If the dedupe lookup fails, fall back to writing everything opted-in.
    }

    if (toWrite.length === 0) {
      setChurnNote("Those cards are already in your churning profile.")
      return
    }

    const results = await Promise.all(
      toWrite.map(id =>
        markBonusAlreadyHad(userId, id, {
          opened_date: null,
          closed_date: null,
          bonus_received: false,
          actual_amount: null,
          incomplete_info: true,
        }),
      ),
    )
    const added = results.filter(r => r != null).length
    const failed = results.length - added
    if (added > 0) {
      const base = `Added ${added} card${added === 1 ? "" : "s"} to your churning profile. Set each open date in the Roadmap for accurate 5/24.`
      setChurnNote(failed > 0 ? `${base} (${failed} couldn't be saved.)` : base)
    } else if (failed > 0) {
      setChurnNote(`Couldn't add ${failed} card${failed === 1 ? "" : "s"} to your churning profile.`)
    }
  }

  function addToDebts() {
    if (!review || review.length === 0) return
    // Capture selections before clearAll() wipes the review/opt-in state.
    const catalogIds = selectedCatalogIds(review, churnOptIn, matches)
    update({ debts: [...debts, ...review] })
    clearAll()
    // Fire-and-forget; the debt add above already succeeded regardless.
    void writeChurnProfile(catalogIds)
  }

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Import from a statement</h3>
      <div style={{ ...muted, marginBottom: 14 }}>
        Upload a credit-card statement (PDF or photo). We read the balance, APR, minimum payment, and promo
        terms with AI — then YOU review before anything is added. Your file isn&rsquo;t stored.
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          key={inputKey}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={onPick}
          disabled={importing}
          style={{ fontSize: 13, color: "#444" }}
        />
        <button
          style={{ ...secondaryBtn, opacity: importing || !file ? 0.6 : 1, cursor: importing || !file ? "default" : "pointer" }}
          disabled={importing || !file}
          onClick={() => file && void extract(file)}
        >
          {importing ? "Reading your statement…" : review ? "Re-extract" : "Extract"}
        </button>
      </div>

      {importing && (
        <div style={{ ...muted, marginTop: 12 }}>Reading your statement… this can take a few seconds.</div>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <NoticeBox severity="critical">⛔ {error}</NoticeBox>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {warnings.map((w, i) => (
            <NoticeBox key={i} severity="warn">⚠ {w}</NoticeBox>
          ))}
        </div>
      )}

      {review && review.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...label, color: ACCENT, marginBottom: 8 }}>
            Review {review.length} card{review.length === 1 ? "" : "s"} before adding
          </div>
          <div style={{ ...muted, marginBottom: 12 }}>
            Nothing has been added yet. Edit anything that looks off, then add them to your debts. Rows where the
            APR couldn&rsquo;t be read are flagged — enter the rate before trusting the projection.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {review.map(d => (
              <ImportReviewRow
                key={d.id}
                debt={d}
                onChange={patch => editRow(d.id, patch)}
                match={matches[d.id] ?? null}
                churnChecked={churnOptIn[d.id] ?? false}
                onToggleChurn={checked => setChurnOptIn(prev => ({ ...prev, [d.id]: checked }))}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={primaryBtn} onClick={addToDebts}>
              Add {review.length} card{review.length === 1 ? "" : "s"} to my debts
            </button>
            <button style={ghostBtn} onClick={clearAll}>Discard</button>
          </div>
        </div>
      )}

      {churnNote && (
        <div style={{ marginTop: 12 }}>
          <NoticeBox severity="info">ℹ {churnNote}</NoticeBox>
        </div>
      )}
    </div>
  )
}

function ImportReviewRow({
  debt, onChange, match, churnChecked, onToggleChurn,
}: {
  debt: CreditCardDebt
  onChange: (patch: Partial<CreditCardDebt>) => void
  match: CardCatalogMatch | null
  churnChecked: boolean
  onToggleChurn: (checked: boolean) => void
}) {
  const aprMissing = debt.apr === 0
  const hasPromo = debt.promoApr != null || debt.promoEndsOn != null || debt.postPromoApr != null
  return (
    <div style={{ padding: 16, border: `1px solid ${aprMissing ? "#dc262644" : `${ACCENT}44`}`, borderRadius: 8, background: aprMissing ? "#fef2f2" : "#fafafa" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div>
          <label style={fieldLabel}>Name</label>
          <input style={inputStyle} value={debt.name} onChange={e => onChange({ name: e.target.value })} />
        </div>
        <div>
          <label style={fieldLabel}>Balance</label>
          <input style={inputStyle} type="number" value={debt.balance} onChange={e => onChange({ balance: num(e.target.value) })} />
        </div>
        <div>
          <label style={fieldLabel}>APR</label>
          <PercentInput
            style={{ borderColor: aprMissing ? "#dc2626" : "#e0e0e0" }}
            value={debt.apr}
            onChange={v => onChange({ apr: v ?? 0 })}
          />
          {aprMissing
            ? <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginTop: 4 }}>Enter APR — the rate couldn&rsquo;t be read.</div>
            : <div style={{ ...muted, marginTop: 4 }}>{APR_HINT}</div>}
        </div>
        <div>
          <label style={fieldLabel}>Minimum payment</label>
          <input style={inputStyle} type="number" value={debt.minPayment} onChange={e => onChange({ minPayment: num(e.target.value) })} />
        </div>
        <div>
          <label style={fieldLabel}>Credit limit (optional)</label>
          <input style={inputStyle} type="number" value={debt.creditLimit ?? ""} onChange={e => onChange({ creditLimit: e.target.value === "" ? undefined : num(e.target.value) })} />
        </div>
        {hasPromo && (
          <>
            <div style={{ gridColumn: "1 / -1", ...muted, marginTop: -4 }}>
              Optional — only if your card has a 0% intro period.
            </div>
            <div>
              <label style={fieldLabel}>Promo APR (optional)</label>
              <PercentInput allowNull value={debt.promoApr ?? null} onChange={v => onChange({ promoApr: v })} />
            </div>
            <div>
              <label style={fieldLabel}>Promo ends on (optional)</label>
              <input style={inputStyle} type="date" value={debt.promoEndsOn ?? ""} onChange={e => onChange({ promoEndsOn: e.target.value || null })} />
            </div>
            <div>
              <label style={fieldLabel}>Post-promo APR (optional)</label>
              <PercentInput allowNull value={debt.postPromoApr ?? null} onChange={v => onChange({ postPromoApr: v })} />
            </div>
          </>
        )}
      </div>
      {match && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${ACCENT}22` }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#333", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={churnChecked}
              onChange={e => onToggleChurn(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Also track in your churning profile: <b>{match.label}</b></span>
          </label>
          <div style={{ ...muted, marginTop: 4 }}>
            Recognized from our card catalog ({Math.round(match.confidence * 100)}%). Statements don&rsquo;t show the
            account open date, so this is recorded as incomplete — set the open date in your Roadmap so it counts
            toward 5/24.
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 4. Debts CRUD
// ----------------------------------------------------------------------------

const APR_HINT = "Enter the purchase APR, e.g. 24.99"

function emptyCreditCard(): CreditCardDebt {
  return { kind: "credit_card", id: newId("debt"), name: "New card", balance: 0, apr: 0.2499, minPayment: 25, creditLimit: undefined, promoApr: null, promoEndsOn: null, postPromoApr: null }
}
function emptyInstallment(): InstallmentDebt {
  return { kind: "installment", id: newId("debt"), name: "New loan", balance: 0, apr: 0.08, monthlyPayment: 0, termRemainingMonths: null }
}

function DebtsSection({ debts, update }: { debts: DebtInstrument[]; update: (patch: Partial<DebtScenario>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const upsert = (d: DebtInstrument) => {
    const exists = debts.some(x => x.id === d.id)
    update({ debts: exists ? debts.map(x => (x.id === d.id ? d : x)) : [...debts, d] })
  }
  const remove = (id: string) => update({ debts: debts.filter(d => d.id !== id) })

  function addCard() { const d = emptyCreditCard(); upsert(d); setEditingId(d.id) }
  function addLoan() { const d = emptyInstallment(); upsert(d); setEditingId(d.id) }

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={sectionTitle}>Debts</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={secondaryBtn} onClick={addCard}>+ Credit card</button>
          <button style={secondaryBtn} onClick={addLoan}>+ Installment loan</button>
        </div>
      </div>
      {debts.length === 0 && <div style={muted}>No debts yet. Add a credit card or installment loan.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {debts.map(d =>
          editingId === d.id ? (
            <DebtEditor key={d.id} debt={d} onSave={dd => { upsert(dd); setEditingId(null) }} onCancel={() => setEditingId(null)} />
          ) : (
            <DebtRow key={d.id} debt={d} onEdit={() => setEditingId(d.id)} onDelete={() => remove(d.id)} />
          ),
        )}
      </div>
    </div>
  )
}

function DebtRow({ debt, onEdit, onDelete }: { debt: DebtInstrument; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #f0f0f0", borderRadius: 8 }}>
      <div>
        <div style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>
          {debt.name} <span style={{ ...muted, fontSize: 11 }}>· {debt.kind === "credit_card" ? "Credit card" : "Installment"}</span>
        </div>
        <div style={{ ...muted, marginTop: 2 }}>
          {formatMoney(debt.balance)} @ {pctStr(debt.apr)}
          {debt.kind === "credit_card"
            ? ` · min ${formatMoney(debt.minPayment)}${debt.promoApr != null ? ` · promo ${pctStr(debt.promoApr)} until ${debt.promoEndsOn ?? "?"}` : ""}`
            : ` · ${formatMoney(debt.monthlyPayment)}/mo${debt.termRemainingMonths ? ` · ${debt.termRemainingMonths} mo left` : ""}`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={ghostBtn} onClick={onEdit}>Edit</button>
        <button style={{ ...ghostBtn, color: "#dc2626" }} onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}

function DebtEditor({ debt, onSave, onCancel }: { debt: DebtInstrument; onSave: (d: DebtInstrument) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<DebtInstrument>(debt)

  // Type-narrowed setters keep the discriminated union intact.
  function setCard(patch: Partial<CreditCardDebt>) {
    setDraft(prev => (prev.kind === "credit_card" ? { ...prev, ...patch } : prev))
  }
  function setLoan(patch: Partial<InstallmentDebt>) {
    setDraft(prev => (prev.kind === "installment" ? { ...prev, ...patch } : prev))
  }

  return (
    <div style={{ padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#fafafa" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div>
          <label style={fieldLabel}>Name</label>
          <input style={inputStyle} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div>
          <label style={fieldLabel}>Balance</label>
          <input style={inputStyle} type="number" value={draft.balance} onChange={e => setDraft({ ...draft, balance: num(e.target.value) })} />
        </div>
        <div>
          <label style={fieldLabel}>APR</label>
          <PercentInput value={draft.apr} onChange={v => setDraft({ ...draft, apr: v ?? 0 })} />
          <div style={{ ...muted, marginTop: 4 }}>{APR_HINT}</div>
        </div>

        {draft.kind === "credit_card" ? (
          <>
            <div>
              <label style={fieldLabel}>Minimum payment</label>
              <input style={inputStyle} type="number" value={draft.minPayment} onChange={e => setCard({ minPayment: num(e.target.value) })} />
            </div>
            <div>
              <label style={fieldLabel}>Credit limit (optional)</label>
              <input style={inputStyle} type="number" value={draft.creditLimit ?? ""} onChange={e => setCard({ creditLimit: e.target.value === "" ? undefined : num(e.target.value) })} />
            </div>
            <div style={{ gridColumn: "1 / -1", ...muted, marginTop: -4 }}>
              Optional — only if your card has a 0% intro period.
            </div>
            <div>
              <label style={fieldLabel}>Promo APR (optional)</label>
              <PercentInput allowNull value={draft.promoApr ?? null} onChange={v => setCard({ promoApr: v })} />
            </div>
            <div>
              <label style={fieldLabel}>Promo ends on (optional)</label>
              <input style={inputStyle} type="date" value={draft.promoEndsOn ?? ""} onChange={e => setCard({ promoEndsOn: e.target.value || null })} />
            </div>
            <div>
              <label style={fieldLabel}>Post-promo APR (optional)</label>
              <PercentInput allowNull value={draft.postPromoApr ?? null} onChange={v => setCard({ postPromoApr: v })} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label style={fieldLabel}>Monthly payment</label>
              <input style={inputStyle} type="number" value={draft.monthlyPayment} onChange={e => setLoan({ monthlyPayment: num(e.target.value) })} />
            </div>
            <div>
              <label style={fieldLabel}>Term remaining (months, optional)</label>
              <input style={inputStyle} type="number" value={draft.termRemainingMonths ?? ""} onChange={e => setLoan({ termRemainingMonths: e.target.value === "" ? null : num(e.target.value) })} />
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={primaryBtn} onClick={() => onSave(draft)}>Save</button>
        <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Approval helper text (shared by both offer kinds)
// ----------------------------------------------------------------------------

function ApprovalNote({ status }: { status: ApprovalStatus }) {
  if (status === "approved") return null
  const labelText = status === "prequalified" ? "Prequalified" : "Estimated"
  return (
    <div style={{ ...muted, marginTop: 8, color: "#b45309" }}>
      {labelText}
      {status === "prequalified" && <> <InfoTip term="prequalified" label="prequalified" /></>}
      {" "}≠ approved. Approval and final terms are not guaranteed. Enter your actual offer to compare it accurately.
    </div>
  )
}

const APPROVAL_OPTIONS: ApprovalStatus[] = ["approved", "prequalified", "estimated"]

// ----------------------------------------------------------------------------
// 5a. Balance transfer offers CRUD
// ----------------------------------------------------------------------------

function emptyBT(startISO: string): BalanceTransferOffer {
  return {
    id: newId("bt"), name: "New balance transfer", enabled: true,
    creditLimit: 0, approvedTransferAmount: 0, promoApr: 0, promoMonths: 18,
    postPromoApr: 0.2699, transferFeePct: 0.03, minPayment: 25,
    availableOn: startISO, payFeeWithCash: false, approvalStatus: "estimated",
  }
}

function BalanceTransferSection({ offers, startISO, update }: { offers: BalanceTransferOffer[]; startISO: string; update: (patch: Partial<DebtScenario>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const upsert = (o: BalanceTransferOffer) => {
    const exists = offers.some(x => x.id === o.id)
    update({ balanceTransfers: exists ? offers.map(x => (x.id === o.id ? o : x)) : [...offers, o] })
  }
  const remove = (id: string) => update({ balanceTransfers: offers.filter(o => o.id !== id) })
  function add() { const o = emptyBT(startISO); upsert(o); setEditingId(o.id) }

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={sectionTitle}>Balance transfer offers</h3>
        <button style={secondaryBtn} onClick={add}>+ Add offer</button>
      </div>
      {offers.length === 0 && <div style={muted}>No balance-transfer offers. Add one to model a 0%-promo transfer.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {offers.map(o =>
          editingId === o.id ? (
            <BTEditor key={o.id} offer={o} onSave={oo => { upsert(oo); setEditingId(null) }} onCancel={() => setEditingId(null)} />
          ) : (
            <OfferRow
              key={o.id}
              title={o.name}
              enabled={o.enabled}
              status={o.approvalStatus}
              summary={`${formatMoney(o.approvedTransferAmount)} approved · ${pctStr(o.promoApr)} for ${o.promoMonths} mo, then ${pctStr(o.postPromoApr)} · ${pctStr(o.transferFeePct)} fee · avail ${o.availableOn}`}
              onToggle={() => upsert({ ...o, enabled: !o.enabled })}
              onEdit={() => setEditingId(o.id)}
              onDelete={() => remove(o.id)}
            />
          ),
        )}
      </div>
    </div>
  )
}

function BTEditor({ offer, onSave, onCancel }: { offer: BalanceTransferOffer; onSave: (o: BalanceTransferOffer) => void; onCancel: () => void }) {
  const [d, setD] = useState<BalanceTransferOffer>(offer)
  const set = (patch: Partial<BalanceTransferOffer>) => setD(prev => ({ ...prev, ...patch }))
  return (
    <div style={{ padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#fafafa" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div><label style={fieldLabel}>Name</label><input style={inputStyle} value={d.name} onChange={e => set({ name: e.target.value })} /></div>
        <div><label style={fieldLabel}>Credit limit</label><input style={inputStyle} type="number" value={d.creditLimit} onChange={e => set({ creditLimit: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Approved transfer amount</label><input style={inputStyle} type="number" value={d.approvedTransferAmount} onChange={e => set({ approvedTransferAmount: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Promo APR</label><PercentInput value={d.promoApr} onChange={v => set({ promoApr: v ?? 0 })} /></div>
        <div><label style={fieldLabel}>Promo months</label><input style={inputStyle} type="number" value={d.promoMonths} onChange={e => set({ promoMonths: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Post-promo APR</label><PercentInput value={d.postPromoApr} onChange={v => set({ postPromoApr: v ?? 0 })} /></div>
        <div><label style={fieldLabel}>Transfer fee</label><PercentInput value={d.transferFeePct} onChange={v => set({ transferFeePct: v ?? 0 })} /></div>
        <div><label style={fieldLabel}>Minimum payment</label><input style={inputStyle} type="number" value={d.minPayment} onChange={e => set({ minPayment: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Available on</label><input style={inputStyle} type="date" value={d.availableOn} onChange={e => set({ availableOn: e.target.value })} /></div>
        <div>
          <label style={fieldLabel}>Approval status</label>
          <select style={selectStyle} value={d.approvalStatus} onChange={e => set({ approvalStatus: e.target.value as ApprovalStatus })}>
            {APPROVAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
          <input type="checkbox" checked={d.payFeeWithCash} onChange={e => set({ payFeeWithCash: e.target.checked })} />
          Pay fee with cash
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
          <input type="checkbox" checked={d.enabled} onChange={e => set({ enabled: e.target.checked })} />
          Enabled (include in comparison)
        </label>
      </div>
      <ApprovalNote status={d.approvalStatus} />
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={primaryBtn} onClick={() => onSave(d)}>Save</button>
        <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 5b. Consolidation loan offers CRUD
// ----------------------------------------------------------------------------

function emptyLoan(startISO: string): ConsolidationLoanOffer {
  return {
    id: newId("loan"), name: "New consolidation loan", enabled: true,
    requestedAmount: 0, approvedAmount: 0, apr: 0.12, termMonths: 48,
    originationFeePct: 0.05, feeMode: "deducted", monthlyPayment: null,
    availableOn: startISO, status: "estimated",
  }
}

const FEE_MODE_OPTIONS: ConsolidationLoanFeeMode[] = ["financed", "deducted"]

function ConsolidationLoanSection({ offers, startISO, update }: { offers: ConsolidationLoanOffer[]; startISO: string; update: (patch: Partial<DebtScenario>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const upsert = (o: ConsolidationLoanOffer) => {
    const exists = offers.some(x => x.id === o.id)
    update({ consolidationLoans: exists ? offers.map(x => (x.id === o.id ? o : x)) : [...offers, o] })
  }
  const remove = (id: string) => update({ consolidationLoans: offers.filter(o => o.id !== id) })
  function add() { const o = emptyLoan(startISO); upsert(o); setEditingId(o.id) }

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={sectionTitle}>Consolidation loan offers</h3>
        <button style={secondaryBtn} onClick={add}>+ Add offer</button>
      </div>
      {offers.length === 0 && <div style={muted}>No consolidation-loan offers. Add one to model paying off debt with a personal loan.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {offers.map(o =>
          editingId === o.id ? (
            <LoanEditor key={o.id} offer={o} onSave={oo => { upsert(oo); setEditingId(null) }} onCancel={() => setEditingId(null)} />
          ) : (
            <OfferRow
              key={o.id}
              title={o.name}
              enabled={o.enabled}
              status={o.status}
              summary={`${formatMoney(o.approvedAmount || o.requestedAmount)} @ ${pctStr(o.apr)} · ${o.termMonths} mo · ${pctStr(o.originationFeePct)} orig (${o.feeMode}) · ${formatMoney(loanPayment(o))}/mo · avail ${o.availableOn}`}
              onToggle={() => upsert({ ...o, enabled: !o.enabled })}
              onEdit={() => setEditingId(o.id)}
              onDelete={() => remove(o.id)}
            />
          ),
        )}
      </div>
    </div>
  )
}

// Payment the engine would use: explicit if provided, else amortized.
function loanPayment(o: ConsolidationLoanOffer): number {
  if (o.monthlyPayment != null && o.monthlyPayment > 0) return o.monthlyPayment
  const base = o.approvedAmount > 0 ? o.approvedAmount : o.requestedAmount
  const principal = o.feeMode === "financed" ? round2(base * (1 + o.originationFeePct)) : base
  return amortizedPayment(principal, o.apr, o.termMonths)
}

function LoanEditor({ offer, onSave, onCancel }: { offer: ConsolidationLoanOffer; onSave: (o: ConsolidationLoanOffer) => void; onCancel: () => void }) {
  const [d, setD] = useState<ConsolidationLoanOffer>(offer)
  const set = (patch: Partial<ConsolidationLoanOffer>) => setD(prev => ({ ...prev, ...patch }))
  const amortized = loanPayment({ ...d, monthlyPayment: null })
  return (
    <div style={{ padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#fafafa" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div><label style={fieldLabel}>Name</label><input style={inputStyle} value={d.name} onChange={e => set({ name: e.target.value })} /></div>
        <div><label style={fieldLabel}>Requested amount</label><input style={inputStyle} type="number" value={d.requestedAmount} onChange={e => set({ requestedAmount: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Approved amount</label><input style={inputStyle} type="number" value={d.approvedAmount} onChange={e => set({ approvedAmount: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>APR</label><PercentInput value={d.apr} onChange={v => set({ apr: v ?? 0 })} /></div>
        <div><label style={fieldLabel}>Term (months)</label><input style={inputStyle} type="number" value={d.termMonths} onChange={e => set({ termMonths: num(e.target.value) })} /></div>
        <div><label style={fieldLabel}>Origination fee</label><PercentInput value={d.originationFeePct} onChange={v => set({ originationFeePct: v ?? 0 })} /></div>
        <div>
          <label style={fieldLabel}>Fee mode</label>
          <select style={selectStyle} value={d.feeMode} onChange={e => set({ feeMode: e.target.value as ConsolidationLoanFeeMode })}>
            {FEE_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Monthly payment (blank = amortize)</label>
          <input
            style={inputStyle}
            type="number"
            value={d.monthlyPayment ?? ""}
            placeholder={String(amortized)}
            onChange={e => set({ monthlyPayment: e.target.value === "" ? null : num(e.target.value) })}
          />
          <div style={{ ...muted, marginTop: 4 }}>Amortized: <b>{formatMoney(amortized)}/mo</b></div>
        </div>
        <div><label style={fieldLabel}>Available on</label><input style={inputStyle} type="date" value={d.availableOn} onChange={e => set({ availableOn: e.target.value })} /></div>
        <div>
          <label style={fieldLabel}>Status</label>
          <select style={selectStyle} value={d.status} onChange={e => set({ status: e.target.value as ApprovalStatus })}>
            {APPROVAL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
          <input type="checkbox" checked={d.enabled} onChange={e => set({ enabled: e.target.checked })} />
          Enabled (include in comparison)
        </label>
      </div>
      <ApprovalNote status={d.status} />
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button style={primaryBtn} onClick={() => onSave(d)}>Save</button>
        <button style={secondaryBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function OfferRow({
  title, enabled, status, summary, onToggle, onEdit, onDelete,
}: {
  title: string
  enabled: boolean
  status: ApprovalStatus
  summary: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid #f0f0f0", borderRadius: 8, opacity: enabled ? 1 : 0.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={enabled} onChange={onToggle} title="Include in comparison" />
          <div>
            <div style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>
              {title}{" "}
              <span style={{
                fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                padding: "2px 7px", borderRadius: 999, marginLeft: 4,
                color: status === "approved" ? "#0d7c5f" : "#b45309",
                background: status === "approved" ? "#ecfdf5" : "#fffbeb",
              }}>{status}</span>
              {status === "prequalified" && <span style={{ marginLeft: 4 }}><InfoTip term="prequalified" label="prequalified" /></span>}
            </div>
            <div style={{ ...muted, marginTop: 2 }}>{summary}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={ghostBtn} onClick={onEdit}>Edit</button>
          <button style={{ ...ghostBtn, color: "#dc2626" }} onClick={onDelete}>Delete</button>
        </div>
      </div>
      {status !== "approved" && <ApprovalNote status={status} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 6. Credit profile (collapsible)
// ----------------------------------------------------------------------------

const FICO_OPTIONS: FicoBand[] = ["poor", "fair", "good", "very_good", "exceptional"]

function CreditProfileSection({ profile, update }: { profile: CreditProfile; update: (patch: Partial<DebtScenario>) => void }) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<CreditProfile>) => update({ creditProfile: { ...profile, ...patch } })
  const optNum = (v: number | undefined) => (v == null ? "" : v)

  return (
    <div style={cardBox}>
      <button onClick={() => setOpen(o => !o)} style={{ ...ghostBtn, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", padding: 0 }}>
        <span style={sectionTitle}>Credit profile (optional)</span>
        <span style={{ fontSize: 16 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ ...muted, marginBottom: 14 }}>
            All optional and used only for cautions. We never claim you&rsquo;ll qualify based on score alone.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={fieldLabel}>FICO band</label>
              <select style={selectStyle} value={profile.ficoBand ?? ""} onChange={e => set({ ficoBand: e.target.value === "" ? undefined : (e.target.value as FicoBand) })}>
                <option value="">—</option>
                {FICO_OPTIONS.map(b => <option key={b} value={b}>{FICO_BAND_LABEL[b]}</option>)}
              </select>
            </div>
            <div><label style={fieldLabel}>Annual income</label><input style={inputStyle} type="number" value={optNum(profile.annualIncome)} onChange={e => set({ annualIncome: e.target.value === "" ? undefined : num(e.target.value) })} /></div>
            <div><label style={fieldLabel}>Monthly housing</label><input style={inputStyle} type="number" value={optNum(profile.monthlyHousing)} onChange={e => set({ monthlyHousing: e.target.value === "" ? undefined : num(e.target.value) })} /></div>
            <div><label style={fieldLabel}>Total min debt payments</label><input style={inputStyle} type="number" value={optNum(profile.totalMinDebtPayments)} onChange={e => set({ totalMinDebtPayments: e.target.value === "" ? undefined : num(e.target.value) })} /></div>
            <div><label style={fieldLabel}>Revolving utilization</label><PercentInput allowNull value={profile.revolvingUtilization ?? null} onChange={v => set({ revolvingUtilization: v ?? undefined })} /></div>
            <div><label style={fieldLabel}>Hard inquiries (6 mo)</label><input style={inputStyle} type="number" value={optNum(profile.hardInquiries6mo)} onChange={e => set({ hardInquiries6mo: e.target.value === "" ? undefined : num(e.target.value) })} /></div>
            <div><label style={fieldLabel}>Card apps (12 mo)</label><input style={inputStyle} type="number" value={optNum(profile.cardApps12mo)} onChange={e => set({ cardApps12mo: e.target.value === "" ? undefined : num(e.target.value) })} /></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
              <input type="checkbox" checked={!!profile.majorDerogatory} onChange={e => set({ majorDerogatory: e.target.checked })} />
              Major derogatory mark (collection, charge-off, bankruptcy)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
              <input type="checkbox" checked={!!profile.willingToOpenCredit} onChange={e => set({ willingToOpenCredit: e.target.checked })} />
              Willing to open new credit
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
              <input type="checkbox" checked={!!profile.preserveChurningEligibility} onChange={e => set({ preserveChurningEligibility: e.target.checked })} />
              Preserve card / churning eligibility
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 7. Results — strategy comparison
// ----------------------------------------------------------------------------

function metric(labelText: string, value: string, accent?: boolean) {
  return (
    <div>
      <div style={{ ...muted, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{labelText}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent ? ACCENT : "#111" }}>{value}</div>
    </div>
  )
}

function signedMoney(n: number): string {
  if (n > 0) return `+${formatMoney(n)}`
  return formatMoney(n)
}

// Concept glossary term for each strategy, so beginners can learn the approach
// behind the label. Only some kinds map to a defined term.
const STRATEGY_TERM: Partial<Record<StrategyResult["kind"], "avalanche" | "balanceTransfer">> = {
  baseline: "avalanche",
  no_new_credit: "avalanche",
  balance_transfer: "balanceTransfer",
}

function StrategyCard({ s, recommended, goal }: { s: StrategyResult; recommended: boolean; goal: StrategyGoal }) {
  const [showAccounts, setShowAccounts] = useState(false)
  const term = STRATEGY_TERM[s.kind]
  return (
    <div style={{
      border: recommended ? `2px solid ${ACCENT}` : "1px solid #e8e8e8",
      borderRadius: 10, padding: 16, background: recommended ? "#f6fbf9" : "#fff",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {s.label}
          {term && <InfoTip term={term} label={s.label} />}
        </div>
        {recommended && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: ACCENT, borderRadius: 999, padding: "3px 10px" }}>
            Recommended for {STRATEGY_GOAL_LABEL[goal]}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        {metric("Debt-free date", s.debtFreeDateISO ?? "Beyond horizon")}
        {metric("Months to debt-free", s.monthsToDebtFree != null ? String(s.monthsToDebtFree) : "—")}
        {metric("Total interest", formatMoney(s.totalInterest))}
        {metric("Total fees", formatMoney(s.totalFees))}
        {metric("Total cost", formatMoney(s.totalCost), recommended)}
        {metric("Required monthly", `${formatMoney(s.requiredMonthlyPayment)}/mo`)}
        {metric("Months saved vs baseline", s.monthsSavedVsBaseline != null ? String(s.monthsSavedVsBaseline) : "—")}
        {metric("$ saved vs baseline", signedMoney(s.dollarsSavedVsBaseline))}
        {metric("New accounts", String(s.newAccounts))}
        {metric("Remaining after promos", formatMoney(s.remainingAfterPromos))}
      </div>

      {s.newAccountDetails.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button style={ghostBtn} onClick={() => setShowAccounts(o => !o)}>
            {showAccounts ? "Hide" : "Show"} {s.newAccountDetails.length} new account detail(s)
          </button>
          {showAccounts && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "#555", lineHeight: 1.6 }}>
              {s.newAccountDetails.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <WarningList warnings={s.warnings} />
    </div>
  )
}

function ResultsSection({ comparison }: { comparison: ReturnType<typeof compareStrategies> }) {
  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Strategy comparison</h3>
      <div style={{ ...muted, marginBottom: 14 }}>
        Ranked for your goal: <b>{STRATEGY_GOAL_LABEL[comparison.goal]}</b>.
      </div>
      <WarningList warnings={comparison.globalWarnings} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginTop: 14 }}>
        {comparison.strategies.map(s => (
          <StrategyCard
            key={s.kind}
            s={s}
            recommended={s.kind === comparison.recommended.kind}
            goal={comparison.goal}
          />
        ))}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 8. Your next move
// ----------------------------------------------------------------------------

function NextMovePanel({ comparison }: { comparison: ReturnType<typeof compareStrategies> }) {
  const rec = comparison.recommended
  const nm = rec.nextMove
  return (
    <div style={{ ...cardBox, borderTop: `3px solid ${ACCENT}` }}>
      <div style={{ ...label, color: ACCENT }}>Your next move</div>
      {nm ? (
        <div style={{ padding: 16, background: "#fafafa", borderRadius: 10, border: `1px solid ${ACCENT}22`, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 6 }}>{nm.headline}</div>
          <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.55, marginBottom: 8 }}>{nm.detail}</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "#666" }}>
            <span>Type: <b style={{ color: "#111" }}>{nm.type}</b></span>
            {nm.amount > 0 && <span>Amount: <b style={{ color: "#111" }}>{formatMoney(nm.amount)}</b></span>}
            {nm.deadline && <span>Deadline: <b style={{ color: "#111" }}>{nm.deadline}</b></span>}
          </div>
          <div style={{ ...muted, marginTop: 8 }}>{nm.reason}</div>
        </div>
      ) : (
        <div style={{ ...muted, marginBottom: 16 }}>No specific next move — add debts or offers to generate one.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div>
          <div style={label}>Why {rec.label} is recommended</div>
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{comparison.whyRecommended}</div>
        </div>
        <div>
          <div style={label}>What would change the recommendation</div>
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{comparison.whatWouldChange}</div>
        </div>
      </div>

      {rec.assumptions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={label}>Assumptions</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#555", lineHeight: 1.65 }}>
            {rec.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <WarningList warnings={rec.warnings} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// 9. Month-by-month schedule
// ----------------------------------------------------------------------------

const ROW_CAP = 120

function ScheduleSection({ strategies, recommendedKind }: { strategies: StrategyResult[]; recommendedKind: string }) {
  const [selectedKind, setSelectedKind] = useState<string>(recommendedKind)
  const [open, setOpen] = useState(false)

  // Keep selection valid if the strategy set changes.
  const selected = strategies.find(s => s.kind === selectedKind) ?? strategies.find(s => s.kind === recommendedKind) ?? strategies[0]
  if (!selected) return null

  const rows = selected.timeline
  const capped = rows.length > ROW_CAP
  const shown = capped ? rows.slice(0, ROW_CAP) : rows

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Auditable month-by-month schedule</h3>
        <button style={ghostBtn} onClick={() => setOpen(o => !o)}>{open ? "Hide schedule ▴" : "Show schedule ▾"}</button>
      </div>
      <div style={{ ...muted, marginTop: 6 }}>Every row shows interest, fees, payment, and principal so the math is auditable.</div>

      {open && (
        <>
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <label style={fieldLabel}>Strategy</label>
            <select style={{ ...selectStyle, maxWidth: 320 }} value={selected.kind} onChange={e => setSelectedKind(e.target.value)}>
              {strategies.map(s => <option key={s.kind} value={s.kind}>{s.label}{s.kind === recommendedKind ? " (recommended)" : ""}</option>)}
            </select>
          </div>

          {capped && (
            <div style={{ ...muted, color: "#b45309", marginBottom: 8 }}>
              Showing the first {ROW_CAP} of {rows.length} months. The remaining {rows.length - ROW_CAP} are not rendered.
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "right", color: "#999", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.04em" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Date</th>
                  <th style={{ padding: "6px 8px" }}>Start bal</th>
                  <th style={{ padding: "6px 8px" }}>Interest</th>
                  <th style={{ padding: "6px 8px" }}>Fees</th>
                  <th style={{ padding: "6px 8px" }}>Payment</th>
                  <th style={{ padding: "6px 8px" }}>Principal</th>
                  <th style={{ padding: "6px 8px" }}>End bal</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Events</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.month} style={{ borderTop: "1px solid #f2f2f2" }}>
                    <td style={{ padding: "5px 8px" }}>{r.month}</td>
                    <td style={{ padding: "5px 8px" }}>{r.dateISO}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(r.startingBalance)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(r.interest)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{r.fees ? formatMoney(r.fees) : "—"}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(r.payment)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(r.principal)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{formatMoney(r.endingBalance)}</td>
                    <td style={{ padding: "5px 8px", color: "#0d7c5f", fontSize: 11 }}>{r.events.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 10. Consolidation loan simulator widget
// ----------------------------------------------------------------------------

const GRID_APRS = [0.08, 0.12, 0.16, 0.2]
const GRID_TERMS = [36, 48, 60]

function LoanSimulatorWidget({ picture }: { picture: FinancialPicture }) {
  const defaultPrincipal = round2(totalDebt(picture))
  const [principal, setPrincipal] = useState<number>(defaultPrincipal)
  const [termMonths, setTermMonths] = useState<number>(48)
  const [originationFeePct, setOriginationFeePct] = useState<number>(0.05)
  const [feeMode, setFeeMode] = useState<ConsolidationLoanFeeMode>("deducted")

  const maxApr = useMemo(
    () => maxBeneficialLoanApr(picture, { principal, termMonths, originationFeePct, feeMode }),
    [picture, principal, termMonths, originationFeePct, feeMode],
  )
  const grid = useMemo(
    () => loanScenarioGrid(picture, principal, GRID_APRS, GRID_TERMS, originationFeePct, feeMode),
    [picture, principal, originationFeePct, feeMode],
  )

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Consolidation loan simulator</h3>
      <div style={{ ...muted, marginBottom: 14 }}>
        Stress-test a hypothetical loan against your current baseline. No lenders are ranked or recommended here.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div><label style={fieldLabel}>Principal</label><input style={inputStyle} type="number" defaultValue={principal} onBlur={e => setPrincipal(num(e.target.value))} /></div>
        <div><label style={fieldLabel}>Term (months)</label><input style={inputStyle} type="number" defaultValue={termMonths} onBlur={e => setTermMonths(num(e.target.value))} /></div>
        <div><label style={fieldLabel}>Origination fee</label><PercentInput value={originationFeePct} onChange={v => setOriginationFeePct(v ?? 0)} /></div>
        <div>
          <label style={fieldLabel}>Fee mode</label>
          <select style={selectStyle} value={feeMode} onChange={e => setFeeMode(e.target.value as ConsolidationLoanFeeMode)}>
            {FEE_MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: 14, borderRadius: 8, background: maxApr == null ? "#fef2f2" : "#ecfdf5", border: `1px solid ${maxApr == null ? "#fecaca" : "#a7f3d0"}`, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: maxApr == null ? "#b91c1c" : "#0d7c5f" }}>
          {maxApr == null
            ? "No positive-APR loan beats your baseline at these terms."
            : `A loan only beats your baseline below ~${pctStr(maxApr)} APR.`}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "#999", textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.04em" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>APR</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Term</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Monthly</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Total cost</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Beats baseline?</th>
            </tr>
          </thead>
          <tbody>
            {grid.map((g, i) => (
              <tr key={i} style={{ borderTop: "1px solid #f2f2f2" }}>
                <td style={{ padding: "5px 8px" }}>{pctStr(g.apr)}</td>
                <td style={{ padding: "5px 8px" }}>{g.termMonths} mo</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(g.monthlyPayment)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{formatMoney(g.totalCost)}</td>
                <td style={{ padding: "5px 8px", fontWeight: 600, color: g.beatsBaseline ? "#0d7c5f" : "#dc2626" }}>
                  {g.beatsBaseline ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...muted, marginTop: 12 }}>
        Check your real rate with lenders that offer soft-pull prequalification, then enter your actual offer above
        to compare it accurately.
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 11. Global guardrail footer
// ----------------------------------------------------------------------------

function GuardrailFooter() {
  return (
    <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "#f9fafb", border: "1px solid #eee" }}>
      <div style={{ fontSize: 12.5, color: "#777", lineHeight: 1.6 }}>
        <b>Educational simulator — not financial, lending, or tax advice.</b> Actual lender disclosures and signed
        loan documents control. Projected dates and savings are estimates, never guarantees.
      </div>
    </div>
  )
}
