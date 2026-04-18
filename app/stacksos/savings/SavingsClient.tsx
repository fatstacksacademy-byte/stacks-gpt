"use client"

import React, { useEffect, useState, useCallback } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import { getSavingsEntries, addSavingsEntry, updateSavingsEntry, deleteSavingsEntry, SavingsEntry } from "../../../lib/savingsEntries"
import { getSavingsProfile, upsertSavingsProfile, SavingsProfile, DEFAULT_SAVINGS_PROFILE } from "../../../lib/savingsProfile"
import { createClient } from "../../../lib/supabase/client"
import { runSavingsSequencer, SavingsSequencedEntry } from "../../../lib/savingsSequencer"

const money = (n: number) => `$${n.toLocaleString()}`
const pct = (n: number) => `${(n * 100).toFixed(2)}%`
const todayStr = () => new Date().toISOString().split("T")[0]

const topBtn: React.CSSProperties = { fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }
const label: React.CSSProperties = { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }
const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%" }
const selectStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111", border: "1px solid #e0e0e0", borderRadius: 6 }
const computedStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, background: "#f9f9f9", color: "#555", border: "1px solid #e8e8e8", borderRadius: 6, width: "100%" }

const STATUS_OPTIONS = ["planned", "active", "completed", "canceled"] as const

// Auto-calculate yield from deposit * APY * holding period
function calcYield(deposit: string, apy: string, holdingDays: string): number {
  const d = parseFloat(deposit) || 0
  const a = (parseFloat(apy) || 0) / 100 // form value is %, convert to decimal
  const days = parseInt(holdingDays) || 0
  if (d <= 0 || a <= 0 || days <= 0) return 0
  return Math.round(d * a * (days / 365))
}

export default function SavingsClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const [entries, setEntries] = useState<SavingsEntry[]>([])
  const [profile, setProfile] = useState<SavingsProfile>({ user_id: userId, ...DEFAULT_SAVINGS_PROFILE, updated_at: "" })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedRec, setExpandedRec] = useState<string | null>(null)
  const [skippedSavingsIds, setSkippedSavingsIds] = useState<string[]>([])
  const [startingId, setStartingId] = useState<string | null>(null)
  const [justStartedIds, setJustStartedIds] = useState<Set<string>>(new Set())
  const [startError, setStartError] = useState<string | null>(null)
  const [userState, setUserState] = useState<string | null>(null)
  const [showBusiness, setShowBusiness] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("stacks_show_business") === "true"
  })
  const [showBrokerage, setShowBrokerage] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("stacks_show_brokerage") === "true"
  })

  // Form state
  const [fInstitution, setFInstitution] = useState("")
  const [fBonusName, setFBonusName] = useState("")
  const [fBonusAmount, setFBonusAmount] = useState("")
  const [fDepositRequired, setFDepositRequired] = useState("")
  const [fHoldingDays, setFHoldingDays] = useState("")
  const [fOfferApy, setFOfferApy] = useState("")
  const [fPromoApy, setFPromoApy] = useState("")
  const [fActualValue, setFActualValue] = useState("")
  const [fOpenedDate, setFOpenedDate] = useState(todayStr())
  const [fDeadline, setFDeadline] = useState("")
  const [fStatus, setFStatus] = useState<SavingsEntry["status"]>("planned")
  const [fNotes, setFNotes] = useState("")

  // Auto-calculated values from form inputs
  const autoYield = calcYield(fDepositRequired, fOfferApy || fPromoApy, fHoldingDays)
  const autoTotal = (parseFloat(fBonusAmount) || 0) + autoYield

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabaseClient = createClient()
    const [e, p, { data: userProfile }] = await Promise.all([
      getSavingsEntries(userId),
      getSavingsProfile(userId),
      supabaseClient.from("user_profiles").select("state").eq("user_id", userId).single(),
    ])
    setEntries(e)
    setProfile(p)
    if (userProfile?.state) setUserState(userProfile.state)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  function resetForm() {
    setFInstitution(""); setFBonusName(""); setFBonusAmount(""); setFDepositRequired("")
    setFHoldingDays(""); setFOfferApy(""); setFPromoApy("")
    setFActualValue(""); setFOpenedDate(todayStr()); setFDeadline("")
    setFStatus("planned"); setFNotes(""); setEditingId(null)
  }

  function populateForm(e: SavingsEntry) {
    setFInstitution(e.institution_name); setFBonusName(e.bonus_name ?? ""); setFBonusAmount(String(e.bonus_amount ?? ""))
    setFDepositRequired(String(e.deposit_required ?? "")); setFHoldingDays(String(e.holding_period_days ?? ""))
    setFOfferApy(e.offer_apy != null ? String(e.offer_apy * 100) : ""); setFPromoApy(e.promo_apy != null ? String(e.promo_apy * 100) : "")
    setFActualValue(String(e.actual_value ?? "")); setFOpenedDate(e.opened_date ?? todayStr())
    setFDeadline(e.deadline ?? ""); setFStatus(e.status); setFNotes(e.notes ?? "")
  }

  async function handleSave() {
    const payload = {
      institution_name: fInstitution,
      bonus_name: fBonusName || null,
      bonus_amount: fBonusAmount ? parseFloat(fBonusAmount) : null,
      deposit_required: fDepositRequired ? parseFloat(fDepositRequired) : null,
      holding_period_days: fHoldingDays ? parseInt(fHoldingDays) : null,
      offer_apy: fOfferApy ? parseFloat(fOfferApy) / 100 : null,
      promo_apy: fPromoApy ? parseFloat(fPromoApy) / 100 : null,
      estimated_yield: autoYield > 0 ? autoYield : null,
      expected_total_value: autoTotal > 0 ? autoTotal : null,
      actual_value: fActualValue ? parseFloat(fActualValue) : null,
      opened_date: fOpenedDate || null,
      deadline: fDeadline || null,
      status: fStatus,
      notes: fNotes || null,
    }
    if (editingId) {
      await updateSavingsEntry(editingId, payload)
    } else {
      await addSavingsEntry(userId, payload)
    }
    resetForm()
    setShowAdd(false)
    await loadData()
  }

  async function handleDelete(id: string) {
    await deleteSavingsEntry(id)
    await loadData()
  }

  // Profile save with debounce
  const profileTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function updateProfileField(updates: Partial<SavingsProfile>) {
    const next = { ...profile, ...updates }
    setProfile(next)
    if (profileTimeout.current) clearTimeout(profileTimeout.current)
    profileTimeout.current = setTimeout(() => {
      upsertSavingsProfile({ user_id: userId, ...updates })
    }, 400)
  }

  // Calculations
  const activeEntries = entries.filter(e => e.status === "active")
  const plannedEntries = entries.filter(e => e.status === "planned")
  const completedEntries = entries.filter(e => e.status === "completed")
  const canceledEntries = entries.filter(e => e.status === "canceled")

  const totalEarned = completedEntries.reduce((s, e) => s + (e.actual_value ?? e.expected_total_value ?? 0), 0)

  const currentBalance = profile.current_balance ?? 0
  const currentApy = profile.current_apy ?? 0
  const currentAnnualYield = currentBalance * currentApy

  const potentialFromOpportunities = [...activeEntries, ...plannedEntries].reduce((s, e) => {
    return s + (e.expected_total_value ?? (e.bonus_amount ?? 0) + (e.estimated_yield ?? 0))
  }, 0)

  const delta = potentialFromOpportunities

  // Savings sequencer — rank bonuses by effective APY
  const inProgressBonusIds = entries
    .filter(e => e.status === "active" || e.status === "planned")
    .map(e => e.canonical_offer_id)
    .filter(Boolean) as string[]
  const completedBonusIds = entries
    .filter(e => e.status === "completed")
    .map(e => e.canonical_offer_id)
    .filter(Boolean) as string[]

  const sequencerResult = runSavingsSequencer({
    availableBalance: currentBalance || 50000,
    completedBonusIds,
    skippedBonusIds: [...skippedSavingsIds, ...inProgressBonusIds],
    userState,
    currentHysaApy: currentApy || 0,
    includeBusiness: showBusiness,
    includeBrokerage: showBrokerage,
  })

  // Sequencer now handles business/brokerage filtering.
  // Also hide anything the user *just* clicked start on — the DB write is
  // still in-flight, and we don't want the card to sit there looking unresponsive.
  const filteredEntries = sequencerResult.entries.filter(
    (e) => !justStartedIds.has(e.id),
  )

  // Start a recommended bonus — add it as a savings entry
  async function handleStartRecommended(rec: SavingsSequencedEntry) {
    setStartError(null)
    setStartingId(rec.id)
    // Optimistic: hide this card immediately so the click feels responsive
    setJustStartedIds((prev) => new Set(prev).add(rec.id))
    try {
      const result = await addSavingsEntry(userId, {
        institution_name: rec.bank_name,
        bonus_name: rec.bonus.id,
        bonus_amount: rec.bonus_amount,
        deposit_required: rec.deposit,
        holding_period_days: rec.hold_days,
        offer_apy: rec.base_apy,
        promo_apy: null,
        estimated_yield: rec.interest_earned,
        expected_total_value: rec.total_earnings,
        actual_value: null,
        opened_date: todayStr(),
        deadline: null,
        status: "active",
        notes: rec.bonus.notes || null,
        source_type: "system",
        canonical_offer_id: rec.id,
      })
      if (!result) throw new Error("Insert returned null — check RLS/schema. See browser console for detail.")
      await loadData()
    } catch (err) {
      // Roll back the optimistic hide so the user can retry
      setJustStartedIds((prev) => {
        const next = new Set(prev)
        next.delete(rec.id)
        return next
      })
      const msg = err instanceof Error ? err.message : String(err)
      setStartError(`Couldn't start "${rec.bank_name}": ${msg}`)
      console.error("[savings] handleStartRecommended failed:", err)
    } finally {
      setStartingId(null)
    }
  }

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
        <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", textDecoration: "none" }}>Stacks OS</a>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="rm-topbar-email">{userEmail}</span>
          <select value={userState ?? ""} onChange={async e => {
            const newState = e.target.value || null
            setUserState(newState)
            const sb = createClient()
            await sb.from("user_profiles").update({ state: newState }).eq("user_id", userId)
          }}
            style={{ fontSize: 12, color: userState ? "#0d7c5f" : "#999", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 8px", cursor: "pointer" }}>
            <option value="">All states</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setShowProfile(s => !s)} style={topBtn}>{showProfile ? "Close" : "Savings Profile"}</button>
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

        {/* Start-bonus error banner */}
        {startError && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              lineHeight: 1.4,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{startError}</span>
            <button
              onClick={() => setStartError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#991b1b",
                cursor: "pointer",
                fontWeight: 700,
                padding: 0,
              }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Savings Profile Panel */}
        {showProfile && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px 28px", marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 16 }}>Savings Profile</div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={label}>Current balance</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                  <input type="number" value={profile.current_balance ?? ""} onChange={e => updateProfileField({ current_balance: Number(e.target.value) || null })}
                    style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                </div>
              </div>
              <div>
                <div style={label}>Current APY (%)</div>
                <input type="number" step="0.01" value={profile.current_apy != null ? profile.current_apy * 100 : ""} onChange={e => updateProfileField({ current_apy: e.target.value ? parseFloat(e.target.value) / 100 : null })}
                  style={{ ...inputStyle, width: 100 }} placeholder="4.5" />
              </div>
              <div>
                <div style={label}>Current institution</div>
                <input type="text" value={profile.current_institution ?? ""} onChange={e => updateProfileField({ current_institution: e.target.value || null })}
                  style={{ ...inputStyle, width: 180 }} placeholder="e.g. Marcus" />
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#bbb", marginTop: 12 }}>Changes save automatically</div>

            {/* Bonus type toggles */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0", display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={showBusiness} onChange={e => { setShowBusiness(e.target.checked); localStorage.setItem("stacks_show_business", String(e.target.checked)) }}
                  style={{ accentColor: "#7c3aed" }} />
                <span style={{ fontSize: 13, color: "#555" }}>I have a business entity</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={showBrokerage} onChange={e => { setShowBrokerage(e.target.checked); localStorage.setItem("stacks_show_brokerage", String(e.target.checked)) }}
                  style={{ accentColor: "#2563eb" }} />
                <span style={{ fontSize: 13, color: "#555" }}>Include brokerage bonuses</span>
              </label>
            </div>

            {/* Optional: emergency fund / cash reserves */}
            <details style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
              <summary style={{ fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer" }}>Optional: reserves tracking</summary>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
                <div>
                  <div style={label}>Emergency fund</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                    <input type="number" value={profile.emergency_fund ?? ""} onChange={e => updateProfileField({ emergency_fund: Number(e.target.value) || null })}
                      style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                  </div>
                </div>
                <div>
                  <div style={label}>Cash reserves</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 14 }}>$</span>
                    <input type="number" value={profile.cash_reserves ?? ""} onChange={e => updateProfileField({ cash_reserves: Number(e.target.value) || null })}
                      style={{ ...inputStyle, paddingLeft: 26, width: 160 }} placeholder="0" />
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* ── Projection Hero ── */}
        {(() => {
          const balance = currentBalance || 50000
          const year1Entries = sequencerResult.entries.filter(e => e.start_day < 365)
          const year2Entries = sequencerResult.entries.filter(e => e.start_day >= 365 && e.start_day < 730)
          let y1Bonus = 0, y1Interest = 0, y2Bonus = 0, y2Interest = 0
          for (const e of year1Entries) { y1Bonus += e.bonus_amount; y1Interest += e.interest_earned }
          for (const e of year2Entries) { y2Bonus += e.bonus_amount; y2Interest += e.interest_earned }
          const y1Total = y1Bonus + y1Interest
          const y2Total = y2Bonus + y2Interest
          const taxRate = 0.20
          const taxReserve = Math.round((y1Total + totalEarned) * taxRate)

          function addDaysToDate(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
          function fmtShortDate(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
          const today = new Date()

          return (
            <>
              {/* Big number at top */}
              <div style={{ background: "#f0faf5", border: "2px solid #0d7c5f", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#0d7c5f", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>12-Month Projected Earnings</div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#0d7c5f", marginTop: 4, letterSpacing: "-0.02em" }}>{money(y1Total)}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                      {money(y1Bonus)} in bonuses + {money(y1Interest)} interest on {money(balance)}
                      {year1Entries.length > 0 && ` · ${year1Entries.length} rotation${year1Entries.length !== 1 ? "s" : ""}`}
                    </div>
                    {y1Total > 0 && (
                      <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                        Effective return: <span style={{ color: "#0d7c5f", fontWeight: 700 }}>{(y1Total / balance * 100).toFixed(1)}%</span> vs {currentApy > 0 ? pct(currentApy) : "0%"} HYSA
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {y2Total > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Year 2</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{money(y2Total)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Earned so far</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(totalEarned)}</div>
                    </div>
                  </div>
                </div>

                {/* Tax link */}
                {(y1Total > 0 || totalEarned > 0) && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #a7f3d0" }}>
                    <a href="/stacksos/taxes" style={{ fontSize: 12, color: "#d97706", textDecoration: "none", fontWeight: 600 }}>
                      View tax summary &rarr;
                    </a>
                  </div>
                )}

                {/* Collapsible breakdown */}
                {year1Entries.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", cursor: "pointer" }}>Show full breakdown</summary>
                    <div style={{ marginTop: 12, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #a7f3d0" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bank</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Open</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Close</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Deposit</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bonus</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Interest</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Total</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Eff. APY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...year1Entries, ...year2Entries].map((e, i) => (
                            <tr key={e.id} style={{ borderBottom: "1px solid #e8f5e9", background: e.start_day >= 365 ? "#fafafa" : "transparent" }}>
                              <td style={{ padding: "8px", color: "#bbb", fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: "8px", color: "#111", fontWeight: 600 }}>{e.bank_name}</td>
                              <td style={{ padding: "8px", color: "#555" }}>{fmtShortDate(addDaysToDate(today, e.start_day))}</td>
                              <td style={{ padding: "8px", color: "#555" }}>{fmtShortDate(addDaysToDate(today, e.end_day))}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.deposit)}</td>
                              <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 600 }}>{money(e.bonus_amount)}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.interest_earned)}</td>
                              <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 700 }}>{money(e.total_earnings)}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{(e.effective_apy * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#e6f5f0" }}>
                            <td colSpan={5} style={{ padding: "8px", fontWeight: 700, color: "#111" }}>Total</td>
                            <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 700 }}>{money(y1Bonus + y2Bonus)}</td>
                            <td style={{ padding: "8px", color: "#555", textAlign: "right", fontWeight: 600 }}>{money(y1Interest + y2Interest)}</td>
                            <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 800 }}>{money(y1Total + y2Total)}</td>
                            <td style={{ padding: "8px" }}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>

              {/* Summary Cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current annual yield</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 2 }}>{money(Math.round(currentAnnualYield))}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{currentApy > 0 ? pct(currentApy) : "No APY set"} on {money(currentBalance)}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Potential upside</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: delta > 0 ? "#0d7c5f" : "#111", marginTop: 2 }}>
                    {delta > 0 ? "+" : ""}{money(Math.round(delta))}
                  </div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{activeEntries.length + plannedEntries.length} opportunities</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>Earned</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", marginTop: 2 }}>{money(totalEarned)}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{completedEntries.length} completed</div>
                </div>
              </div>
            </>
          )
        })()}

        {/* ── Recommended Savings Bonuses ── */}
        {filteredEntries.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recommended — Ranked by Effective APY
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredEntries.map((rec, idx) => {
                const isExpanded = expandedRec === rec.id
                return (
                  <div key={rec.id} style={{
                    background: "#fff",
                    border: idx === 0 ? "2px solid #2563eb" : "1px solid #e8e8e8",
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: idx === 0 ? "0 2px 12px rgba(37,99,235,0.05)" : "none",
                  }}>
                    {/* Header */}
                    <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{rec.bank_name}</div>
                        {rec.bonus.source_links?.[0] && (
                          <a href={rec.bonus.source_links[0]} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
                            View offer
                          </a>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>+{money(rec.total_earnings)}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>bonus + yield</div>
                      </div>
                    </div>

                    {/* Key metrics */}
                    <div style={{ padding: "12px 24px 0", display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Effective APY</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>{(rec.effective_apy * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Bonus</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{money(rec.bonus_amount)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Interest</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{money(rec.interest_earned)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Deposit</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{money(rec.deposit)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Hold</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{rec.hold_days} days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Base APY</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{(rec.base_apy * 100).toFixed(2)}%</div>
                      </div>
                    </div>

                    {/* Rotation indicator */}
                    <div style={{ padding: "8px 24px 0", fontSize: 11, color: "#999" }}>
                      Rotation #{rec.rotation} — Day {rec.start_day} to {rec.end_day}
                    </div>

                    {/* Expandable details */}
                    <div style={{ padding: "8px 24px 4px" }}>
                      <button onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                        style={{ fontSize: 12, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                        {isExpanded ? "Hide details" : "Offer details"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: "0 24px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {rec.bonus.eligibility.eligibility_notes && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>Eligibility</div>
                            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{rec.bonus.eligibility.eligibility_notes}</div>
                          </div>
                        )}
                        {rec.bonus.raw_excerpt && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>How it works</div>
                            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{rec.bonus.raw_excerpt}</div>
                          </div>
                        )}
                        {rec.bonus.notes && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>Strategy</div>
                            <div style={{ fontSize: 12, color: "#7c3aed", lineHeight: 1.5, fontWeight: 500 }}>{rec.bonus.notes}</div>
                          </div>
                        )}
                        {/* All tiers */}
                        {rec.bonus.tiers.length > 1 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 3 }}>All tiers</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {rec.bonus.tiers.map(t => (
                                <div key={t.min_deposit} style={{ fontSize: 12, color: t.min_deposit === rec.deposit ? "#0d7c5f" : "#666" }}>
                                  {t.min_deposit === rec.deposit ? "→ " : "  "}
                                  {money(t.min_deposit)} deposit → {money(t.bonus_amount)} bonus
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#bbb" }}>Requirements are set by the bank and may change.</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ padding: "8px 24px 16px", display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleStartRecommended(rec)}
                        disabled={startingId === rec.id}
                        style={{
                          padding: "8px 18px",
                          fontSize: 13,
                          fontWeight: 700,
                          background: startingId === rec.id ? "#5aaa8a" : "#0d7c5f",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          cursor: startingId === rec.id ? "wait" : "pointer",
                          opacity: startingId === rec.id ? 0.75 : 1,
                        }}
                      >
                        {startingId === rec.id ? "Adding…" : "Start this bonus"}
                      </button>
                      <button onClick={() => setSkippedSavingsIds(prev => [...prev, rec.id])}
                        style={{ padding: "8px 14px", fontSize: 12, color: "#999", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer" }}>
                        Skip
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sequencer summary */}
            <div style={{ marginTop: 12, padding: "12px 16px", background: "#f9fafb", border: "1px solid #e8e8e8", borderRadius: 10, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Total potential</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0d7c5f" }}>{money(sequencerResult.total_earnings)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Rotation period</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{Math.round(sequencerResult.total_days / 30)} months</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Bonuses available</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{sequencerResult.entries.length}</div>
              </div>
            </div>

            {/* Old projection removed — now at top of page */}
            {false && sequencerResult.entries.length > 0 && (() => {
              const balance = currentBalance || 50000
              const today = new Date()
              const year1Entries = sequencerResult.entries.filter(e => e.start_day < 365)
              const year2Entries = sequencerResult.entries.filter(e => e.start_day >= 365 && e.start_day < 730)
              let year1TotalBonus = 0
              let year1TotalInterest = 0
              let year2TotalBonus = 0
              let year2TotalInterest = 0
              for (const e of year1Entries) { year1TotalBonus += e.bonus_amount; year1TotalInterest += e.interest_earned }
              for (const e of year2Entries) { year2TotalBonus += e.bonus_amount; year2TotalInterest += e.interest_earned }
              const year1Total = year1TotalBonus + year1TotalInterest
              const year2Total = year2TotalBonus + year2TotalInterest

              function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
              function fmtDate(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }

              return (
                <div style={{ marginTop: 16 }}>
                  {/* Year 1 summary + table */}
                  <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#0d7c5f", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Year 1 — 12-Month Projection</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", marginTop: 4 }}>{money(year1Total)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#888" }}>{(year1Total / balance * 100).toFixed(1)}% return on {money(balance)}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{year1Entries.length} rotation{year1Entries.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #a7f3d0" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>#</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bank</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Open</th>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Close</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Deposit</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bonus</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Interest</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Total</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Eff. APY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {year1Entries.map((e, i) => (
                            <tr key={e.id} style={{ borderBottom: "1px solid #e8f5e9" }}>
                              <td style={{ padding: "8px", color: "#bbb", fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: "8px", color: "#111", fontWeight: 600 }}>{e.bank_name}</td>
                              <td style={{ padding: "8px", color: "#555" }}>{fmtDate(addDays(today, e.start_day))}</td>
                              <td style={{ padding: "8px", color: "#555" }}>{fmtDate(addDays(today, e.end_day))}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.deposit)}</td>
                              <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 600 }}>{money(e.bonus_amount)}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.interest_earned)}</td>
                              <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 700 }}>{money(e.total_earnings)}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{(e.effective_apy * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                          <tr style={{ background: "#e6f5f0" }}>
                            <td colSpan={5} style={{ padding: "8px", fontWeight: 700, color: "#111" }}>Year 1 Total</td>
                            <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 700 }}>{money(year1TotalBonus)}</td>
                            <td style={{ padding: "8px", color: "#555", textAlign: "right", fontWeight: 600 }}>{money(year1TotalInterest)}</td>
                            <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 800 }}>{money(year1Total)}</td>
                            <td style={{ padding: "8px" }}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Year 2 */}
                  {year2Entries.length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Year 2 Projection</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 4 }}>{money(year2Total)}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#888", textAlign: "right" }}>{year2Entries.length} rotation{year2Entries.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>#</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bank</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Open</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Close</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Deposit</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Bonus</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Interest</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Total</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", color: "#888", fontWeight: 600 }}>Eff. APY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {year2Entries.map((e, i) => (
                              <tr key={e.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                <td style={{ padding: "8px", color: "#bbb", fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: "8px", color: "#111", fontWeight: 600 }}>{e.bank_name}</td>
                                <td style={{ padding: "8px", color: "#555" }}>{fmtDate(addDays(today, e.start_day))}</td>
                                <td style={{ padding: "8px", color: "#555" }}>{fmtDate(addDays(today, e.end_day))}</td>
                                <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.deposit)}</td>
                                <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 600 }}>{money(e.bonus_amount)}</td>
                                <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{money(e.interest_earned)}</td>
                                <td style={{ padding: "8px", color: "#111", textAlign: "right", fontWeight: 700 }}>{money(e.total_earnings)}</td>
                                <td style={{ padding: "8px", color: "#555", textAlign: "right" }}>{(e.effective_apy * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                            <tr style={{ background: "#f9f9f9" }}>
                              <td colSpan={5} style={{ padding: "8px", fontWeight: 700, color: "#111" }}>Year 2 Total</td>
                              <td style={{ padding: "8px", color: "#0d7c5f", textAlign: "right", fontWeight: 700 }}>{money(year2TotalBonus)}</td>
                              <td style={{ padding: "8px", color: "#555", textAlign: "right", fontWeight: 600 }}>{money(year2TotalInterest)}</td>
                              <td style={{ padding: "8px", color: "#111", textAlign: "right", fontWeight: 800 }}>{money(year2Total)}</td>
                              <td style={{ padding: "8px" }}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Skipped bonuses */}
            {sequencerResult.skipped.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 11, color: "#999", cursor: "pointer" }}>
                  {sequencerResult.skipped.length} bonuses not shown
                </summary>
                <div style={{ marginTop: 4 }}>
                  {sequencerResult.skipped.map((s, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#bbb" }}>{s.bank_name}: {s.reason}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Active Entries */}
        {activeEntries.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Currently Working On</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeEntries.map(e => {
                const deposit = e.deposit_required ?? 0
                const holdDays = e.holding_period_days ?? 0
                const openDate = e.opened_date ? new Date(e.opened_date + "T00:00:00") : null
                const daysElapsed = openDate ? Math.floor((Date.now() - openDate.getTime()) / 86400000) : 0
                const daysRemaining = holdDays > 0 ? Math.max(0, holdDays - daysElapsed) : 0
                const progress = holdDays > 0 ? Math.min(100, Math.round((daysElapsed / holdDays) * 100)) : 0
                const isDeposited = deposit > 0 // assume deposited if there's a deposit amount
                const holdComplete = daysRemaining === 0 && holdDays > 0
                const bonusReceived = e.actual_value != null && e.actual_value > 0

                const steps = [
                  { label: "Account opened", done: !!openDate },
                  { label: `$${deposit.toLocaleString()} deposited`, done: isDeposited && !!openDate },
                  { label: `Hold period (${holdDays} days)`, done: holdComplete },
                  { label: "Bonus received", done: bonusReceived },
                ]

                return (
                  <div key={e.id} style={{ background: "#fff", border: "2px solid #0d7c5f", borderRadius: 14, padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{e.institution_name}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                          {money(e.bonus_amount ?? 0)} bonus · {money(deposit)} deposit · {holdDays} days
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(e.bonus_amount ?? 0)}</div>
                        {daysRemaining > 0 && <div style={{ fontSize: 11, color: "#d97706" }}>{daysRemaining} days remaining</div>}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {holdDays > 0 && (
                      <div style={{ background: "#e8e8e8", borderRadius: 4, height: 6, marginBottom: 14 }}>
                        <div style={{ background: "#0d7c5f", borderRadius: 4, height: 6, width: `${progress}%`, transition: "width 0.3s" }} />
                      </div>
                    )}

                    {/* Checklist */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {steps.map((step, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                            background: step.done ? "#0d7c5f" : "#fff",
                            border: step.done ? "none" : "2px solid #ddd",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, color: "#fff", fontWeight: 700,
                          }}>
                            {step.done && "✓"}
                          </div>
                          <span style={{ fontSize: 13, color: step.done ? "#111" : "#bbb", fontWeight: step.done ? 500 : 400 }}>{step.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      {holdComplete && !bonusReceived && (
                        <button onClick={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }}
                          style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                          Mark bonus received
                        </button>
                      )}
                      {bonusReceived && (
                        <button onClick={async () => { await updateSavingsEntry(e.id, { status: "completed" }); await loadData() }}
                          style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
                          Complete &amp; withdraw
                        </button>
                      )}
                      <button onClick={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }}
                        style={{ padding: "8px 16px", fontSize: 12, color: "#555", background: "none", border: "1px solid #e0e0e0", borderRadius: 8, cursor: "pointer" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Planned Entries */}
        {plannedEntries.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Planned</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {plannedEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </div>
        )}

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowAdd(true) }}
          style={{ fontSize: 13, fontWeight: 600, color: "#0d7c5f", background: "none", border: "1px solid #0d7c5f", borderRadius: 8, padding: "10px 20px", cursor: "pointer", marginBottom: 28 }}>
          + Add savings bonus / opportunity
        </button>

        {/* Completed */}
        {completedEntries.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Completed ({completedEntries.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {completedEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Canceled */}
        {canceledEntries.length > 0 && (
          <details style={{ marginBottom: 24 }}>
            <summary style={{ fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer", padding: "6px 0" }}>Canceled ({canceledEntries.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {canceledEntries.map(e => <EntryRow key={e.id} entry={e} onEdit={() => { populateForm(e); setEditingId(e.id); setShowAdd(true) }} onDelete={() => handleDelete(e.id)} onStatusChange={async (s) => { await updateSavingsEntry(e.id, { status: s }); await loadData() }} />)}
            </div>
          </details>
        )}

        {/* Add/Edit Modal */}
        {showAdd && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); resetForm() } }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 20 }}>
                {editingId ? "Edit Savings Entry" : "Add Savings Bonus / Opportunity"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={label}>Institution *</div>
                  <input value={fInstitution} onChange={e => setFInstitution(e.target.value)} style={inputStyle} placeholder="e.g. Wealthfront" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Bonus name</div>
                    <input value={fBonusName} onChange={e => setFBonusName(e.target.value)} style={inputStyle} placeholder="e.g. New deposit bonus" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Status</div>
                    <select value={fStatus} onChange={e => setFStatus(e.target.value as SavingsEntry["status"])} style={{ ...selectStyle, width: "100%" }}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Bonus amount</div>
                    <input type="number" value={fBonusAmount} onChange={e => setFBonusAmount(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Deposit required</div>
                    <input type="number" value={fDepositRequired} onChange={e => setFDepositRequired(e.target.value)} style={inputStyle} placeholder="0" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Holding period (days)</div>
                    <input type="number" value={fHoldingDays} onChange={e => setFHoldingDays(e.target.value)} style={inputStyle} placeholder="90" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Deadline</div>
                    <input type="date" value={fDeadline} onChange={e => setFDeadline(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Ongoing APY (%)</div>
                    <input type="number" step="0.01" value={fOfferApy} onChange={e => setFOfferApy(e.target.value)} style={inputStyle} placeholder="4.5" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Promo APY (%)</div>
                    <input type="number" step="0.01" value={fPromoApy} onChange={e => setFPromoApy(e.target.value)} style={inputStyle} placeholder="5.0" />
                  </div>
                </div>

                {/* Auto-calculated summary */}
                <div style={{ background: "#f9fafb", border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Calculated value</div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#999" }}>Est. yield</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#555" }}>{autoYield > 0 ? money(autoYield) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#999" }}>Bonus</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#555" }}>{fBonusAmount ? money(parseFloat(fBonusAmount)) : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#999" }}>Total expected</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: autoTotal > 0 ? "#0d7c5f" : "#555" }}>{autoTotal > 0 ? money(autoTotal) : "—"}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 6 }}>Auto-calculated from deposit, APY, and holding period</div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={label}>Opened date</div>
                    <input type="date" value={fOpenedDate} onChange={e => setFOpenedDate(e.target.value)} style={inputStyle} />
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
                <button onClick={handleSave} disabled={!fInstitution}
                  style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: fInstitution ? "#0d7c5f" : "#ccc", color: "#fff", border: "none", borderRadius: 8, cursor: fInstitution ? "pointer" : "default" }}>
                  {editingId ? "Save Changes" : "Add Entry"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EntryRow({ entry: e, onEdit, onDelete, onStatusChange }: {
  entry: SavingsEntry
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: SavingsEntry["status"]) => void
}) {
  const totalValue = e.expected_total_value ?? ((e.bonus_amount ?? 0) + (e.estimated_yield ?? 0))
  const statusColors: Record<string, string> = { planned: "#7c3aed", active: "#2563eb", completed: "#0d7c5f", canceled: "#999" }

  // Format holding period
  const holdLabel = e.holding_period_days != null
    ? e.holding_period_days >= 365
      ? `${Math.round(e.holding_period_days / 30)} mo hold`
      : `${e.holding_period_days} day hold`
    : null

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{e.institution_name}</span>
            {e.bonus_name && <span style={{ fontSize: 11, color: "#999" }}>{e.bonus_name}</span>}
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, color: statusColors[e.status] ?? "#999", background: e.status === "active" ? "#eff6ff" : e.status === "completed" ? "#e6f5f0" : e.status === "planned" ? "#ede9fe" : "#f5f5f5" }}>
              {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {e.bonus_amount != null && <span>Bonus: <strong>${e.bonus_amount.toLocaleString()}</strong></span>}
            {e.deposit_required != null && <span>Deposit: ${e.deposit_required.toLocaleString()}</span>}
            {e.offer_apy != null && <span>APY: {(e.offer_apy * 100).toFixed(2)}%</span>}
            {e.promo_apy != null && <span>Promo: {(e.promo_apy * 100).toFixed(2)}%</span>}
            {holdLabel && <span>{holdLabel}</span>}
            {e.deadline && <span>By: {e.deadline}</span>}
          </div>
          {/* Holding period callout for active entries */}
          {e.status === "active" && holdLabel && e.opened_date && (() => {
            const opened = new Date(e.opened_date + "T00:00:00")
            const holdEnd = new Date(opened.getTime() + (e.holding_period_days! * 86400000))
            const daysLeft = Math.max(0, Math.ceil((holdEnd.getTime() - Date.now()) / 86400000))
            if (daysLeft > 0) return <div style={{ fontSize: 11, color: "#d97706", fontWeight: 500, marginTop: 4 }}>{daysLeft} days remaining in hold</div>
            return <div style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 500, marginTop: 4 }}>Hold period complete</div>
          })()}
          {e.notes && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{e.notes}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>
            +{money(totalValue)}
          </div>
          <div style={{ fontSize: 10, color: "#999" }}>bonus + yield</div>
          {e.actual_value != null && (
            <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Actual: ${e.actual_value.toLocaleString()}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        {e.status === "planned" && (
          <button onClick={() => onStatusChange("active")}
            style={{ fontSize: 11, padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Start
          </button>
        )}
        {e.status === "active" && (
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
