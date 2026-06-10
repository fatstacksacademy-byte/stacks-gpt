"use client"

import { useState } from "react"
import { addCustomBonus } from "../../lib/customBonuses"
import { track } from "../../lib/analytics"

type Props = {
  userId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddCustomBonusModal({ userId, onClose, onAdded }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [bankName, setBankName] = useState("")
  const [bonusAmount, setBonusAmount] = useState("")
  const [openedDate, setOpenedDate] = useState(today)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = parseFloat(bonusAmount)
    if (!bankName.trim()) { setError("Bank name is required"); return }
    if (!Number.isFinite(amt) || amt <= 0) { setError("Enter a valid bonus amount"); return }
    setSaving(true)
    const result = await addCustomBonus(userId, bankName.trim(), Math.round(amt), openedDate, notes || undefined)
    setSaving(false)
    if (result) {
      track("custom_bonus_added", { source: "dashboard_add_modal", amount: amt })
      onAdded()
      onClose()
    } else {
      setError("Could not save. Please try again.")
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        style={{
          background: "#fff", borderRadius: 16, padding: 28,
          width: "100%", maxWidth: 440,
          fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Add a bonus
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>
          Track a bank or credit card bonus you've started.
        </p>

        <label style={labelStyle}>Bank or card name</label>
        <input
          type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g. Chase Total Checking"
          autoFocus
          style={inputStyle}
        />

        <label style={labelStyle}>Bonus amount</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#bbb" }}>$</span>
          <input
            type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)}
            placeholder="400" min={0} step={50}
            style={{ ...inputStyle, paddingLeft: 28, marginBottom: 0 }}
          />
        </div>

        <label style={labelStyle}>Date you started</label>
        <input
          type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Notes <span style={{ color: "#bbb", fontWeight: 400 }}>(optional)</span></label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Requirements, deadlines, etc."
          rows={3}
          style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
        />

        {error && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8,
            padding: "10px 12px", marginBottom: 12,
            fontSize: 13, color: "#dc2626",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1, padding: "12px 16px", fontSize: 14, fontWeight: 600,
              background: "#fff", color: "#666",
              border: "1px solid #e0e0e0", borderRadius: 10, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 2, padding: "12px 16px", fontSize: 14, fontWeight: 700,
              background: saving ? "#5aaa8a" : "#0d7c5f", color: "#fff",
              border: "none", borderRadius: 10, cursor: saving ? "wait" : "pointer",
            }}
          >
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
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 10,
  background: "#fff", color: "#111",
  boxSizing: "border-box", outline: "none", marginBottom: 14,
}
