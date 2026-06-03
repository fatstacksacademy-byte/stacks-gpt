"use client"

import React, { useEffect, useMemo, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import {
  runDebtSequencer,
  DebtAccount,
  Lever,
  DebtPlan,
  NextMove,
} from "../../../lib/debtSequencer"
import {
  getDebts, setDebts,
  getLevers, setLevers,
  getCapacityPersonal, setCapacityPersonal,
  getCapacityBusiness, setCapacityBusiness,
  isInitialized, markInitialized,
  seedFromYnabSnapshot,
  resetAll,
} from "../../../lib/debtState"

const HORIZON_MONTHS = 84

const moneyShort = (n: number) => n >= 0 ? `$${Math.round(n).toLocaleString()}` : `-$${Math.round(Math.abs(n)).toLocaleString()}`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

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

export default function DebtClient() {
  const [debts, setLocalDebts] = useState<DebtAccount[]>([])
  const [levers, setLocalLevers] = useState<Lever[]>([])
  const [capPersonal, setCapPersonal] = useState(2000)
  const [capBusiness, setCapBusiness] = useState(1000)
  const [initialized, setInitializedState] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedPool, setExpandedPool] = useState<"personal" | "business" | null>(null)
  const [completedMoves, setCompletedMoves] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      const init = isInitialized()
      if (init) {
        setLocalDebts(getDebts())
        setLocalLevers(getLevers())
        setCapPersonal(getCapacityPersonal())
        setCapBusiness(getCapacityBusiness())
      }
      setInitializedState(init)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function seedNow() {
    const { debts: seedDebts, levers: seedLevers } = seedFromYnabSnapshot()
    setLocalDebts(seedDebts); setDebts(seedDebts)
    setLocalLevers(seedLevers); setLevers(seedLevers)
    setCapacityPersonal(capPersonal); setCapacityBusiness(capBusiness)
    markInitialized()
    setInitializedState(true)
  }

  function handleCapPersonal(v: number) { setCapPersonal(v); setCapacityPersonal(v) }
  function handleCapBusiness(v: number) { setCapBusiness(v); setCapacityBusiness(v) }

  function markMoveDone(move: NextMove) {
    const key = `${move.debt_id}:${move.source_lever_id}:${move.amount}`
    const nextDebts = debts.map(d => d.id === move.debt_id ? { ...d, balance: Math.max(0, d.balance - move.amount) } : d)
    const nextLevers = levers.map(l => l.id === move.source_lever_id
      ? { ...l, amount_available: Math.max(0, l.amount_available - move.amount) }
      : l)
    setLocalDebts(nextDebts); setDebts(nextDebts)
    setLocalLevers(nextLevers); setLevers(nextLevers)
    setCompletedMoves(prev => new Set(prev).add(key))
  }

  const result = useMemo(() => {
    if (!initialized) return null
    return runDebtSequencer({
      debts,
      levers,
      monthly_capacity_personal: capPersonal,
      monthly_capacity_business: capBusiness,
      horizon_months: HORIZON_MONTHS,
      today: new Date().toISOString().split("T")[0],
    })
  }, [debts, levers, capPersonal, capBusiness, initialized])

  if (loading) {
    return (
      <>
        <CheckpointNav />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>Loading…</div>
      </>
    )
  }

  if (!initialized) {
    return (
      <>
        <CheckpointNav />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Debt Sequencer</h1>
          <p style={{ color: "#666", marginBottom: 24, lineHeight: 1.5 }}>
            One-time setup. Seed with a snapshot of your debts and levers, then iterate.
            All data stays in your browser (localStorage).
          </p>
          <div style={cardBox}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>What gets seeded</h3>
            <ul style={{ fontSize: 14, color: "#555", lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
              <li>11 credit card balances from your YNAB snapshot (personal + business)</li>
              <li>0% promo end dates per card</li>
              <li>Levers: cash on hand, TSP, HSA receipts, MR points, NFCU BT, Solo 401(k) loan</li>
              <li>Considered-but-ineligible levers: home equity, vehicle equity</li>
            </ul>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={primaryBtn} onClick={seedNow}>Seed from YNAB snapshot</button>
            <button style={secondaryBtn} onClick={() => alert("Manual entry not yet built. Use the seed and edit after.")}>Enter manually</button>
          </div>
        </div>
      </>
    )
  }

  const { personal, business } = result!

  return (
    <>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Debt Sequencer</h1>
          <button style={ghostBtn} onClick={() => { if (confirm("Reset all debt data?")) { resetAll(); setInitializedState(false) } }}>Reset</button>
        </div>

        <PoolHero
          plan={personal}
          accent="#0d7c5f"
          capacity={capPersonal}
          onCapacity={handleCapPersonal}
          expanded={expandedPool === "personal"}
          onToggleExpand={() => setExpandedPool(expandedPool === "personal" ? null : "personal")}
          onMoveDone={markMoveDone}
          completedMoves={completedMoves}
        />

        <PoolHero
          plan={business}
          accent="#2563eb"
          capacity={capBusiness}
          onCapacity={handleCapBusiness}
          expanded={expandedPool === "business"}
          onToggleExpand={() => setExpandedPool(expandedPool === "business" ? null : "business")}
          onMoveDone={markMoveDone}
          completedMoves={completedMoves}
        />

        <LeverInventory personal={personal} business={business} />
        <AccountList debts={debts} onEdit={(id, patch) => {
          const next = debts.map(d => d.id === id ? { ...d, ...patch } : d)
          setLocalDebts(next); setDebts(next)
        }} />
      </div>
    </>
  )
}

function PoolHero({
  plan, accent, capacity, onCapacity, expanded, onToggleExpand, onMoveDone, completedMoves,
}: {
  plan: DebtPlan
  accent: string
  capacity: number
  onCapacity: (v: number) => void
  expanded: boolean
  onToggleExpand: () => void
  onMoveDone: (m: NextMove) => void
  completedMoves: Set<string>
}) {
  const scopeName = plan.scope === "personal" ? "Personal Debt" : "Business Debt"
  const monthsLabel = plan.projection.months_to_zero
    ? `${plan.projection.months_to_zero} months`
    : capacity === 0 ? "Set a monthly amount" : `${plan.projection.timeline.length}+ months`
  const nm = plan.next_move

  return (
    <div style={{ ...cardBox, borderTop: `3px solid ${accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ ...label, color: accent }}>{scopeName}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#111" }}>{moneyShort(plan.total_debt)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={label}>Debt-free in</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>{monthsLabel}</div>
        </div>
      </div>

      {plan.total_debt === 0 ? (
        <div style={{ padding: 20, background: "#f0f9f4", borderRadius: 8, color: "#0d7c5f", fontWeight: 600 }}>
          🎉 No {plan.scope} debt remaining.
        </div>
      ) : nm ? (
        <NextMoveCard move={nm} accent={accent} onDone={() => onMoveDone(nm)} completed={completedMoves.has(`${nm.debt_id}:${nm.source_lever_id}:${nm.amount}`)} />
      ) : (
        <div style={{ padding: 20, background: "#fff7ed", borderRadius: 8, color: "#9a3412", fontSize: 14 }}>
          No lever fits the remaining {plan.scope} balances. Add a new BT card, cash inflow, or raise monthly capacity.
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Monthly capacity</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{moneyShort(capacity)}/mo</span>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={50}
          value={capacity}
          onChange={e => onCapacity(parseInt(e.target.value, 10))}
          style={{ width: "100%", accentColor: accent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
          <span>$0</span>
          <span>$10k/mo</span>
        </div>
      </div>

      {plan.projection.months_to_zero != null && (
        <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 13, color: "#666" }}>
          <span>Total interest: <b style={{ color: "#111" }}>{moneyShort(plan.projection.total_interest)}</b></span>
          <span>Total fees: <b style={{ color: "#111" }}>{moneyShort(plan.projection.total_fees)}</b></span>
        </div>
      )}

      {plan.warnings.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
          {plan.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {plan.upcoming_moves.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={onToggleExpand} style={{ ...ghostBtn, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{expanded ? "Hide" : "Show"} next {plan.upcoming_moves.length} move{plan.upcoming_moves.length === 1 ? "" : "s"}</span>
            <span>{expanded ? "▴" : "▾"}</span>
          </button>
          {expanded && (
            <div style={{ marginTop: 12 }}>
              {plan.upcoming_moves.map((m, i) => (
                <div key={i} style={{ padding: 12, borderTop: "1px solid #f0f0f0", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#111" }}>
                      {moveTypeLabel(m.type)} {moneyShort(m.amount)} → {m.debt_name}
                    </span>
                    <span style={{ color: "#999", fontSize: 12 }}>{m.deadline ?? ""}</span>
                  </div>
                  <div style={{ color: "#666", fontSize: 12 }}>via {m.source_label}{m.fee ? ` (${moneyShort(m.fee)} fee)` : ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NextMoveCard({ move, accent, onDone, completed }: { move: NextMove; accent: string; onDone: () => void; completed: boolean }) {
  const headline = `${moveTypeLabel(move.type)} ${moneyShort(move.amount)} → ${move.debt_name}`
  const urgencyTag = move.urgency === "cliff" ? "🔥 Cliff defense" : move.urgency === "high_apr" ? "💸 High APR" : "🧹 Cleanup"
  return (
    <div style={{ padding: 20, background: "#fafafa", borderRadius: 10, border: `1px solid ${accent}22` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 6 }}>{urgencyTag} · Your Next Move</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>{headline}</div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>
        {move.reason}
        {move.deadline && <> Deadline: <b style={{ color: "#111" }}>{move.deadline}</b>.</>}
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Source: <b style={{ color: "#111" }}>{move.source_label}</b>
        {move.fee ? <> · Fee: <b style={{ color: "#111" }}>{moneyShort(move.fee)}</b></> : null}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...primaryBtn, background: completed ? "#999" : accent }} onClick={onDone} disabled={completed}>
          {completed ? "Marked done" : "Mark done"}
        </button>
      </div>
    </div>
  )
}

function moveTypeLabel(t: NextMove["type"]): string {
  switch (t) {
    case "bt": return "BT"
    case "loan_payoff": return "Pay (from loan)"
    case "withdraw_to_pay": return "Withdraw + pay"
    case "pay": return "Pay"
  }
}

function LeverInventory({ personal, business }: { personal: DebtPlan; business: DebtPlan }) {
  const all = [...personal.unused_levers, ...business.unused_levers]
  const dedup = Array.from(new Map(all.map(l => [l.id, l])).values())
  if (dedup.length === 0) return null
  const eligible = dedup.filter(l => l.eligible && l.amount_available > 0)
  const considered = dedup.filter(l => !l.eligible || l.amount_available === 0)
  return (
    <div style={cardBox}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#111" }}>Untapped levers</h3>
      {eligible.length === 0 ? (
        <div style={{ fontSize: 13, color: "#666", marginBottom: considered.length ? 16 : 0 }}>All eligible levers fully deployed.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: considered.length ? 16 : 0 }}>
          {eligible.map(l => (
            <div key={l.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: "#111" }}>{l.label}</div>
              <div style={{ color: "#666", fontSize: 12 }}>{moneyShort(l.amount_available)} available · {pct(l.cost_apr)} cost</div>
              {l.notes && <div style={{ color: "#999", fontSize: 11, marginTop: 4 }}>{l.notes}</div>}
            </div>
          ))}
        </div>
      )}
      {considered.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Considered, ruled out</div>
          {considered.map(l => (
            <div key={l.id} style={{ fontSize: 12, color: "#888", paddingLeft: 8, marginBottom: 4 }}>
              <b>{l.label}:</b> {l.ineligible_reason ?? "Not currently deployable."}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function AccountList({ debts, onEdit }: { debts: DebtAccount[]; onEdit: (id: string, patch: Partial<DebtAccount>) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  return (
    <div style={cardBox}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#111" }}>Accounts</h3>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 60px", gap: 8, fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 6, borderBottom: "1px solid #f0f0f0" }}>
          <div>Card</div><div>Balance</div><div>APR</div><div>Promo ends</div><div>Use</div><div></div>
      </div>
      {debts.map(d => (
        <div key={d.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 60px", gap: 8, padding: "10px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13, alignItems: "center" }}>
          <div style={{ color: "#111", fontWeight: 500 }}>{d.display_name}</div>
          {editingId === d.id ? (
            <>
              <input type="number" defaultValue={d.balance} onBlur={e => onEdit(d.id, { balance: parseFloat(e.target.value) || 0 })} style={inputCellStyle} />
              <input type="number" step="0.001" defaultValue={d.apr} onBlur={e => onEdit(d.id, { apr: parseFloat(e.target.value) || 0 })} style={inputCellStyle} />
              <input type="date" defaultValue={d.promo_ends_on ?? ""} onBlur={e => onEdit(d.id, { promo_ends_on: e.target.value || null })} style={inputCellStyle} />
              <select defaultValue={d.use_for} onChange={e => onEdit(d.id, { use_for: e.target.value as "personal" | "business" })} style={inputCellStyle}>
                <option value="personal">personal</option><option value="business">business</option>
              </select>
              <button style={ghostBtn} onClick={() => setEditingId(null)}>Done</button>
            </>
          ) : (
            <>
              <div style={{ color: "#111" }}>{moneyShort(d.balance)}</div>
              <div style={{ color: d.promo_ends_on ? "#0d7c5f" : "#dc2626" }}>{d.promo_ends_on ? `0% → ${pct(d.apr)}` : pct(d.apr)}</div>
              <div style={{ color: "#666" }}>{d.promo_ends_on ?? "n/a"}</div>
              <div style={{ color: "#666" }}>{d.use_for}</div>
              <button style={ghostBtn} onClick={() => setEditingId(d.id)}>Edit</button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

const inputCellStyle: React.CSSProperties = {
  padding: "4px 6px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, width: "100%",
}
