"use client"

import { useState } from "react"
import { addCustomBonus } from "../../lib/customBonuses"
import { addSavingsEntry } from "../../lib/savingsEntries"
import { addOwnedCard } from "../../lib/ownedCards"
import { track } from "../../lib/analytics"

type Props = {
  userId: string
  onClose: () => void
  onAdded: () => void
}

type BonusType = "checking" | "savings" | "card"

const TYPES: { key: BonusType; label: string; icon: string; blurb: string }[] = [
  { key: "checking", label: "Checking", icon: "💵", blurb: "Bank checking bonus — usually a direct-deposit requirement" },
  { key: "savings", label: "Savings", icon: "🏦", blurb: "Deposit-and-hold savings/CD bonus" },
  { key: "card", label: "Credit card", icon: "💳", blurb: "Sign-up bonus after a spend requirement" },
]

export default function AddCustomBonusModal({ userId, onClose, onAdded }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<BonusType>("checking")
  const [name, setName] = useState("")
  const [bonusAmount, setBonusAmount] = useState("")
  const [openedDate, setOpenedDate] = useState(today)
  const [notes, setNotes] = useState("")

  // Checking-specific
  const [ddTotal, setDdTotal] = useState("")
  const [depositWindow, setDepositWindow] = useState("")
  const [holdingDays, setHoldingDays] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")

  // Savings-specific
  const [depositRequired, setDepositRequired] = useState("")
  const [apy, setApy] = useState("")

  // Card-specific
  const [issuer, setIssuer] = useState("")
  const [spendRequirement, setSpendRequirement] = useState("")
  const [spendDeadline, setSpendDeadline] = useState("")
  const [annualFee, setAnnualFee] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const num = (s: string): number | null => {
    const n = parseFloat(s.replace(/[^\d.]/g, ""))
    return Number.isFinite(n) ? n : null
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = num(bonusAmount)
    if (!name.trim()) { setError(type === "card" ? "Card name is required" : "Bank name is required"); return }
    if (amt == null || amt <= 0) { setError("Enter a valid bonus amount"); return }
    setSaving(true)
    let ok = false
    try {
      if (type === "checking") {
        const holding = num(holdingDays)
        const win = num(depositWindow)
        const ddt = num(ddTotal)
        const result = await addCustomBonus(
          userId, name.trim(), Math.round(amt), openedDate, notes || undefined, null,
          {
            ddRequired: ddt != null && ddt > 0,
            minDdTotal: ddt ?? null,
            depositWindowDays: win ?? null,
            holdingPeriodDays: holding ?? null,
            monthlyFee: num(monthlyFee),
          },
        )
        ok = !!result
      } else if (type === "savings") {
        const dep = num(depositRequired)
        const apyDec = num(apy)
        const hold = num(holdingDays)
        const result = await addSavingsEntry(userId, {
          institution_name: name.trim(),
          bonus_amount: Math.round(amt),
          deposit_required: dep,
          holding_period_days: hold,
          offer_apy: apyDec != null ? apyDec / 100 : null,
          opened_date: openedDate,
          expected_total_value: Math.round(amt),
          status: "active",
          source_type: "manual",
          notes: notes || null,
        })
        ok = !!result
      } else {
        const spend = num(spendRequirement)
        const result = await addOwnedCard(userId, {
          card_name: name.trim(),
          issuer: issuer.trim() || null,
          signup_bonus_value: Math.round(amt),
          expected_value: Math.round(amt),
          spend_requirement: spend,
          spend_deadline: spendDeadline || null,
          annual_fee: num(annualFee) ?? 0,
          opened_date: openedDate,
          status: "active",
          source_type: "manual",
          notes: notes || null,
        })
        ok = !!result
      }
    } catch {
      ok = false
    }
    setSaving(false)
    if (ok) {
      track("custom_bonus_added", { source: "dashboard_add_modal", amount: amt, type })
      onAdded()
      onClose()
    } else {
      setError("Could not save. Please try again.")
    }
  }

  const nameLabel = type === "card" ? "Card name" : "Bank name"
  const namePlaceholder = type === "checking" ? "e.g. Chase Total Checking" : type === "savings" ? "e.g. Capital One 360" : "e.g. Chase Sapphire Preferred"

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000, overflowY: "auto",
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        style={{
          background: "#fff", borderRadius: 16, padding: 28,
          width: "100%", maxWidth: 460, margin: "auto",
          fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Add a bonus
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
          Track any bonus you&apos;ve started — pick the type and fill in what you know.
        </p>

        {/* Type picker */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TYPES.map((t) => {
            const active = type === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setType(t.key); setError(null) }}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 12, cursor: "pointer",
                  border: active ? "2px solid #0d7c5f" : "1px solid #e0e0e0",
                  background: active ? "#f0faf6" : "#fff",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? "#0d7c5f" : "#555" }}>{t.label}</span>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 12, color: "#999", margin: "-8px 0 16px" }}>{TYPES.find(t => t.key === type)!.blurb}</p>

        <label style={labelStyle}>{nameLabel}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} autoFocus style={inputStyle} />

        {type === "card" && (
          <>
            <label style={labelStyle}>Issuer <span style={dimStyle}>(optional)</span></label>
            <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Chase, Amex" style={inputStyle} />
          </>
        )}

        <label style={labelStyle}>{type === "card" ? "Sign-up bonus value" : "Bonus amount"}</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={dollarStyle}>$</span>
          <input type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} placeholder="400" min={0} step={50} style={{ ...inputStyle, paddingLeft: 28, marginBottom: 0 }} />
        </div>

        {/* Type-specific requirement fields */}
        {type === "checking" && (
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Direct deposit needed <span style={dimStyle}>(total)</span></label>
              <div style={{ position: "relative" }}>
                <span style={dollarStyle}>$</span>
                <input type="number" value={ddTotal} onChange={(e) => setDdTotal(e.target.value)} placeholder="500" min={0} step={100} style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </div>
            <div style={{ width: 130 }}>
              <label style={labelStyle}>DD window <span style={dimStyle}>(days)</span></label>
              <input type="number" value={depositWindow} onChange={(e) => setDepositWindow(e.target.value)} placeholder="90" min={0} style={inputStyle} />
            </div>
          </div>
        )}
        {type === "checking" && (
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Keep open <span style={dimStyle}>(days)</span></label>
              <input type="number" value={holdingDays} onChange={(e) => setHoldingDays(e.target.value)} placeholder="60" min={0} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Monthly fee <span style={dimStyle}>(optional)</span></label>
              <div style={{ position: "relative" }}>
                <span style={dollarStyle}>$</span>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0" min={0} step={1} style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </div>
          </div>
        )}

        {type === "savings" && (
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Deposit required</label>
              <div style={{ position: "relative" }}>
                <span style={dollarStyle}>$</span>
                <input type="number" value={depositRequired} onChange={(e) => setDepositRequired(e.target.value)} placeholder="10,000" min={0} step={1000} style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </div>
            <div style={{ width: 110 }}>
              <label style={labelStyle}>APY <span style={dimStyle}>(%)</span></label>
              <input type="number" value={apy} onChange={(e) => setApy(e.target.value)} placeholder="3.0" min={0} step={0.05} style={inputStyle} />
            </div>
            <div style={{ width: 110 }}>
              <label style={labelStyle}>Hold <span style={dimStyle}>(days)</span></label>
              <input type="number" value={holdingDays} onChange={(e) => setHoldingDays(e.target.value)} placeholder="90" min={0} style={inputStyle} />
            </div>
          </div>
        )}

        {type === "card" && (
          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Spend required</label>
              <div style={{ position: "relative" }}>
                <span style={dollarStyle}>$</span>
                <input type="number" value={spendRequirement} onChange={(e) => setSpendRequirement(e.target.value)} placeholder="4,000" min={0} step={500} style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Annual fee <span style={dimStyle}>(optional)</span></label>
              <div style={{ position: "relative" }}>
                <span style={dollarStyle}>$</span>
                <input type="number" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} placeholder="95" min={0} step={5} style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </div>
          </div>
        )}

        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{type === "card" ? "Date opened" : "Date started"}</label>
            <input type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)} style={inputStyle} />
          </div>
          {type === "card" && (
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Spend by <span style={dimStyle}>(deadline)</span></label>
              <input type="date" value={spendDeadline} onChange={(e) => setSpendDeadline(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>

        <label style={labelStyle}>Notes <span style={dimStyle}>(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Requirements, deadlines, etc." rows={2} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />

        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#dc2626" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 600, background: "#fff", color: "#666", border: "1px solid #e0e0e0", borderRadius: 10, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            style={{ flex: 2, padding: "12px 16px", fontSize: 14, fontWeight: 700, background: saving ? "#5aaa8a" : "#0d7c5f", color: "#fff", border: "none", borderRadius: 10, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Adding…" : "Add bonus"}
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: "#333",
  display: "block", marginBottom: 6, marginTop: 4,
}
const dimStyle: React.CSSProperties = { color: "#bbb", fontWeight: 400 }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 10,
  background: "#fff", color: "#111",
  boxSizing: "border-box", outline: "none", marginBottom: 14,
}
const dollarStyle: React.CSSProperties = {
  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#bbb",
}
const rowStyle: React.CSSProperties = { display: "flex", gap: 10 }
