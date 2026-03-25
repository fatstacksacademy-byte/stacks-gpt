"use client"

import React, { useEffect, useState, useCallback } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import { getSpendingCards, addSpendingCard, updateSpendingCard, deleteSpendingCard, SpendingCard, SPENDING_CATEGORIES, CATEGORY_LABELS, SpendingCategory } from "../../../lib/spendingCards"
import { getSpendingProfile, upsertSpendingProfile, SpendingProfile, DEFAULT_SPENDING_PROFILE } from "../../../lib/spendingProfile"
import { createClient } from "../../../lib/supabase/client"

const money = (n: number) => `$${n.toLocaleString()}`
const todayStr = () => new Date().toISOString().split("T")[0]

const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%" }
const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }

const STATUS_OPTIONS = ["planned", "active", "completed", "canceled"] as const

export default function SpendingClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const [cards, setCards] = useState<SpendingCard[]>([])
  const [profile, setProfile] = useState<SpendingProfile>({ user_id: userId, ...DEFAULT_SPENDING_PROFILE, updated_at: "" })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [fCardName, setFCardName] = useState("")
  const [fIssuer, setFIssuer] = useState("")
  const [fSignupBonus, setFSignupBonus] = useState("")
  const [fAnnualFee, setFAnnualFee] = useState("")
  const [fSpendReq, setFSpendReq] = useState("")
  const [fSpendDeadline, setFSpendDeadline] = useState("")
  const [fOpenedDate, setFOpenedDate] = useState(todayStr())
  const [fExpectedValue, setFExpectedValue] = useState("")
  const [fActualValue, setFActualValue] = useState("")
  const [fStatus, setFStatus] = useState<SpendingCard["status"]>("planned")
  const [fNotes, setFNotes] = useState("")
  const [fMultipliers, setFMultipliers] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    const [c, p] = await Promise.all([
      getSpendingCards(userId),
      getSpendingProfile(userId),
    ])
    setCards(c)
    setProfile(p)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setFCardName(""); setFIssuer(""); setFSignupBonus(""); setFAnnualFee(""); setFSpendReq("")
    setFSpendDeadline(""); setFOpenedDate(todayStr()); setFExpectedValue(""); setFActualValue("")
    setFStatus("planned"); setFNotes(""); setFMultipliers({}); setEditingId(null)
  }

  function populateForm(c: SpendingCard) {
    setFCardName(c.card_name); setFIssuer(c.issuer ?? ""); setFSignupBonus(String(c.signup_bonus_value ?? ""))
    setFAnnualFee(String(c.annual_fee ?? "")); setFSpendReq(String(c.spend_requirement ?? ""))
    setFSpendDeadline(c.spend_deadline ?? ""); setFOpenedDate(c.opened_date ?? todayStr())
    setFExpectedValue(String(c.expected_value ?? "")); setFActualValue(String(c.actual_value ?? ""))
    setFStatus(c.status); setFNotes(c.notes ?? "")
    const mults: Record<string, string> = {}
    for (const [k, v] of Object.entries(c.category_multipliers ?? {})) mults[k] = String(v)
    setFMultipliers(mults)
  }

  async function handleSave() {
    const multipliers: Record<string, number> = {}
    for (const [k, v] of Object.entries(fMultipliers)) {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) multipliers[k] = n
    }
    const payload = {
      card_name: fCardName,
      issuer: fIssuer || null,
      signup_bonus_value: fSignupBonus ? parseFloat(fSignupBonus) : null,
      annual_fee: fAnnualFee ? parseFloat(fAnnualFee) : 0,
      spend_requirement: fSpendReq ? parseFloat(fSpendReq) : null,
      spend_deadline: fSpendDeadline || null,
      opened_date: fOpenedDate || null,
      category_multipliers: multipliers,
      expected_value: fExpectedValue ? parseFloat(fExpectedValue) : null,
      actual_value: fActualValue ? parseFloat(fActualValue) : null,
      status: fStatus,
      notes: fNotes || null,
    }
    if (editingId) {
      await updateSpendingCard(editingId, payload)
    } else {
      await addSpendingCard(userId, payload)
    }
    resetForm()
    setShowAdd(false)
    await loadData()
  }

  async function handleDelete(id: string) {
    await deleteSpendingCard(id)
    await loadData()
  }

  // Profile save with debounce
  const profileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function updateProfile(updates: Partial<SpendingProfile>) {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (profileTimeout.current) clearTimeout(profileTimeout.current)
    profileTimeout.current = setTimeout(() => {
      upsertSpendingProfile({ user_id: userId, ...updates })
    }, 400)
  }

  // Calculations
  const activeCards = cards.filter(c => c.status === "active")
  const plannedCards = cards.filter(c => c.status === "planned")
  const completedCards = cards.filter(c => c.status === "completed")
  const canceledCards = cards.filter(c => c.status === "canceled")

  const totalEarned = completedCards.reduce((s, c) => s + (c.actual_value ?? c.expected_value ?? 0), 0)
  const activeValue = activeCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)
  const plannedValue = plannedCards.reduce((s, c) => s + (c.expected_value ?? (c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0)), 0)

  // Current annual rewards from spending profile
  const monthlySpend = profile.monthly_spend ?? 0
  const currentAnnualRewards = SPENDING_CATEGORIES.reduce((sum, cat) => {
    const spend = (profile.category_spend?.[cat] ?? 0)
    const mult = (profile.current_multipliers?.[cat] ?? 1)
    return sum + (spend * mult * 12) / 100 // cents to dollars
  }, 0)

  // Potential from active opportunities
  const potentialAnnualRewards = currentAnnualRewards + activeValue + plannedValue

  const delta = potentialAnnualRewards - currentAnnualRewards

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#999", fontSize: 14 }}>Loading...</div></div>
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", color: "#1a1a1a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        .rm-topbar { padding: 14px 32px; }
        .rm-topbar-email { font-size: 12px; color: #bbb; }
        .rm-content { padding: 28px 32px 80px; }
        @media (max-width: 768px) {
          .rm-topbar { padding: 12px 16px; }
          .rm-topbar-email { display: none; }
          .rm-content { padding: 16px 16px 80px; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="rm-topbar" style={{ borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", background: "#fff" }}>
        <a href="/roadmap" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", textDecoration: "none" }}>Stacks OS</a>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <button onClick={() => setShowProfile(s => !s)} style={topBtn}>{showProfile ? "Close" : "Spending Profile"}</button>
          <button onClick={async () => {
            const res = await fetch("/api/stripe/portal", { method: "POST" })
            const data = await res.json()
            if (data.url) window.location.href = data.url
          }} style={topBtn}>Subscription</button>
          <button onClick={handleLogout} style={topBtn}>Log out</button>
        </div>
      </div>

      <CheckpointNav />

      <div style={{ maxWidth: 1100, margin: "0 auto" }} className="rm-content">

        {/* Spending Profile Panel */}
        {showProfile && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Spending Profile</div>

            <div style={{ marginBottom: 16 }}>
              <div style={label}>Estimated monthly spend</div>
              <div style={{ position: "relative", width: 160 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                <input type="number" value={profile.monthly_spend ?? ""} onChange={e => updateProfile({ monthly_spend: Number(e.target.value) || null })}
                  style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8 }}>Monthly spend by category</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
              {SPENDING_CATEGORIES.map(cat => (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, color: "#999" }}>{CATEGORY_LABELS[cat]}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 12 }}>$</span>
                      <input type="number" value={profile.category_spend?.[cat] ?? ""}
                        onChange={e => updateProfile({ category_spend: { ...profile.category_spend, [cat]: Number(e.target.value) || 0 } })}
                        style={{ ...inputStyle, paddingLeft: 22, fontSize: 12 }} placeholder="0" />
                    </div>
                    <input type="text" value={profile.current_cards?.[cat] ?? ""}
                      onChange={e => updateProfile({ current_cards: { ...profile.current_cards, [cat]: e.target.value } })}
                      style={{ ...inputStyle, fontSize: 12, flex: 1 }} placeholder="Current card" />
                    <div style={{ position: "relative", width: 60 }}>
                      <input type="number" step="0.1" value={profile.current_multipliers?.[cat] ?? ""}
                        onChange={e => updateProfile({ current_multipliers: { ...profile.current_multipliers, [cat]: parseFloat(e.target.value) || 0 } })}
                        style={{ ...inputStyle, fontSize: 12, width: 60 }} placeholder="1x" />
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 11 }}>x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div>
                <div style={label}>Rewards valuation</div>
                <select value={profile.rewards_valuation ?? "cashback"} onChange={e => updateProfile({ rewards_valuation: e.target.value as "cashback" | "points" })} style={selectStyle}>
                  <option value="cashback">Cashback</option>
                  <option value="points">Points</option>
                </select>
              </div>
              {profile.rewards_valuation === "points" && (
                <div>
                  <div style={label}>Cents per point</div>
                  <input type="number" step="0.1" value={profile.cpp_valuation ?? ""} onChange={e => updateProfile({ cpp_valuation: parseFloat(e.target.value) || null })}
                    style={{ ...inputStyle, width: 80 }} placeholder="1.5" />
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 12 }}>Changes save automatically</div>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current annual rewards</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>{money(Math.round(currentAnnualRewards))}</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>from spending profile</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Potential upside</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: delta > 0 ? "#0d7c5f" : "#111", marginTop: 2 }}>
              {delta > 0 ? "+" : ""}{money(Math.round(delta))}
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{activeCards.length + plannedCards.length} opportunities</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned from bonuses</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>{money(totalEarned)}</div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{completedCards.length} completed</div>
          </div>
        </div>

        {/* Active Cards */}
        {activeCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Active</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeCards.map(c => <CardRow key={c.id} card={c} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateSpendingCard(c.id, { status: s }); await loadData() }} />)}
            </div>
          </div>
        )}

        {/* Planned Cards */}
        {plannedCards.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planned</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plannedCards.map(c => <CardRow key={c.id} card={c} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateSpendingCard(c.id, { status: s }); await loadData() }} />)}
            </div>
          </div>
        )}

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          style={{ fontSize: 13, fontWeight: 600, color: "#0d7c5f", background: "none", border: "1px solid #0d7c5f", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginBottom: 28 }}>
          + Add spending card / bonus
        </button>

        {/* Completed */}
        {completedCards.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Completed ({completedCards.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {completedCards.map(c => <CardRow key={c.id} card={c} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateSpendingCard(c.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Canceled */}
        {canceledCards.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Canceled ({canceledCards.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {canceledCards.map(c => <CardRow key={c.id} card={c} onEdit={() => { populateForm(c); setEditingId(c.id); setShowAdd(true) }} onDelete={() => handleDelete(c.id)} onStatusChange={async (s) => { await updateSpendingCard(c.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Add/Edit Modal */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); resetForm() } }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 20 }}>
                {editingId ? "Edit Card / Bonus" : "Add Spending Card / Bonus"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={label}>Card name *</div>
                  <input value={fCardName} onChange={e => setFCardName(e.target.value)} style={inputStyle} placeholder="e.g. Chase Sapphire Preferred" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Issuer</div>
                    <input value={fIssuer} onChange={e => setFIssuer(e.target.value)} style={inputStyle} placeholder="e.g. Chase" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Status</div>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value as SpendingCard["status"])} style={{ ...selectStyle, width: "100%" }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Sign-up bonus value</div>
                    <input type="number" value={fSignupBonus} onChange={e => setFSignupBonus(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Annual fee</div>
                    <input type="number" value={fAnnualFee} onChange={e => setFAnnualFee(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Spend requirement</div>
                    <input type="number" value={fSpendReq} onChange={e => setFSpendReq(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Spend deadline</div>
                    <input type="date" value={fSpendDeadline} onChange={e => setFSpendDeadline(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <div style={label}>Opened date</div>
                  <input type="date" value={fOpenedDate} onChange={e => setFOpenedDate(e.target.value)} style={{ ...inputStyle, width: 180 }} />
                </div>

                <div>
                  <div style={label}>Category multipliers (earn rate)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {SPENDING_CATEGORIES.map(cat => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#555", width: 100 }}>{CATEGORY_LABELS[cat]}</span>
                        <div style={{ position: "relative", flex: 1 }}>
                          <input type="number" step="0.1" value={fMultipliers[cat] ?? ""} onChange={e => setFMultipliers(prev => ({ ...prev, [cat]: e.target.value }))}
                            style={{ ...inputStyle, fontSize: 12 }} placeholder="1" />
                          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 11 }}>x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Expected net value</div>
                    <input type="number" value={fExpectedValue} onChange={e => setFExpectedValue(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Actual value received</div>
                    <input type="number" value={fActualValue} onChange={e => setFActualValue(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>

                <div>
                  <div style={label}>Notes</div>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Any notes..." />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button onClick={() => { setShowAdd(false); resetForm() }}
                  style={{ padding: "10px 20px", fontSize: 13, background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!fCardName}
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: fCardName ? "#0d7c5f" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: fCardName ? "pointer" : "default" }}>
                  {editingId ? "Save Changes" : "Add Card"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardRow({ card: c, onEdit, onDelete, onStatusChange }: {
  card: SpendingCard
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: SpendingCard["status"]) => void
}) {
  const netValue = c.expected_value ?? ((c.signup_bonus_value ?? 0) - (c.annual_fee ?? 0))
  const statusColors: Record<string, string> = { planned: "#7c3aed", active: "#2563eb", completed: "#0d7c5f", canceled: "#999" }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{c.card_name}</span>
            {c.issuer && <span style={{ fontSize: 11, color: "#999" }}>{c.issuer}</span>}
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: statusColors[c.status] ?? "#999", background: c.status === "active" ? "#eff6ff" : c.status === "completed" ? "#e6f5f0" : c.status === "planned" ? "#ede9fe" : "#f5f5f5" }}>
              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {c.signup_bonus_value != null && <span>Bonus: <strong>${c.signup_bonus_value.toLocaleString()}</strong></span>}
            {(c.annual_fee ?? 0) > 0 && <span>Fee: ${c.annual_fee}/yr</span>}
            {c.spend_requirement != null && <span>Spend: ${c.spend_requirement.toLocaleString()} req</span>}
            {c.spend_deadline && <span>By: {c.spend_deadline}</span>}
          </div>
          {c.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{c.notes}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: netValue >= 0 ? "#0d7c5f" : "#dc2626" }}>
            {netValue >= 0 ? "+" : ""}${Math.abs(netValue).toLocaleString()}
          </div>
          {c.actual_value != null && (
            <div style={{ fontSize: 11, color: "#999" }}>Actual: ${c.actual_value.toLocaleString()}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        {c.status === "planned" && (
          <button onClick={() => onStatusChange("active")}
            style={{ fontSize: 11, padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Start
          </button>
        )}
        {c.status === "active" && (
          <button onClick={() => onStatusChange("completed")}
            style={{ fontSize: 11, padding: "4px 12px", background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Complete
          </button>
        )}
        <button onClick={onEdit}
          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#555", background: "none", borderRadius: 6, cursor: "pointer" }}>
          Edit
        </button>
        <button onClick={onDelete}
          style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #e0e0e0", color: "#999", background: "none", borderRadius: 6, cursor: "pointer" }}>
          Remove
        </button>
      </div>
    </div>
  )
}
