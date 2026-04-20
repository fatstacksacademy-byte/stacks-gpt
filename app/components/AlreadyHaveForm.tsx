"use client"

import { useState } from "react"

/**
 * Inline "Already have this" form. Used on Spending + Savings
 * recommendation heroes to quickly record a card/account the user
 * already opened in the past — instead of re-recommending it forever.
 *
 * Two commit paths:
 *   - "Save"  — user filled in what they know, creates full record
 *   - "Skip"  — user doesn't remember dates, creates record flagged
 *               incomplete_info so downstream cooldown / lifetime math
 *               knows to either skip it or warn about it
 */
export default function AlreadyHaveForm({
  itemLabel,
  onSave,
  onCancel,
}: {
  itemLabel: string
  onSave: (payload: {
    opened_date: string | null
    closed_date: string | null
    bonus_received: boolean
    actual_amount: number | null
    incomplete_info: boolean
  }) => void | Promise<void>
  onCancel: () => void
}) {
  const today = new Date().toISOString().split("T")[0]
  const [openedDate, setOpenedDate] = useState("")
  const [closedDate, setClosedDate] = useState("")
  const [bonusReceived, setBonusReceived] = useState(true)
  const [actualAmount, setActualAmount] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    // If the user filled in neither date, this effectively becomes the
    // "skip" path. Otherwise it's a full record.
    const hasAny = openedDate || closedDate
    await onSave({
      opened_date: openedDate || null,
      closed_date: closedDate || null,
      bonus_received: bonusReceived,
      actual_amount: actualAmount ? Number(actualAmount) : null,
      incomplete_info: !hasAny,
    })
  }

  async function handleSkip() {
    if (saving) return
    setSaving(true)
    await onSave({
      opened_date: null,
      closed_date: null,
      bonus_received: false,
      actual_amount: null,
      incomplete_info: true,
    })
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: 13, border: "1px solid #e0e0e0",
    borderRadius: 6, background: "#fff", color: "#111", outline: "none",
    width: "100%", boxSizing: "border-box",
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid #d0e8dd", borderRadius: 12,
      padding: "14px 16px", marginTop: 10,
    }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
        Recording <strong>{itemLabel}</strong> as already held. Skip if you don&apos;t remember dates.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#999" }}>
          Opened date
          <input type="date" value={openedDate} onChange={e => setOpenedDate(e.target.value)} max={today} style={{ ...inputStyle, marginTop: 3 }} />
        </label>
        <label style={{ fontSize: 11, color: "#999" }}>
          Closed date (if closed)
          <input type="date" value={closedDate} onChange={e => setClosedDate(e.target.value)} max={today} style={{ ...inputStyle, marginTop: 3 }} />
        </label>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555", marginBottom: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={bonusReceived} onChange={e => setBonusReceived(e.target.checked)} style={{ accentColor: "#0d7c5f" }} />
        I received the sign-up bonus
      </label>
      {bonusReceived && (
        <label style={{ display: "block", fontSize: 11, color: "#999", marginBottom: 10 }}>
          Amount received (optional)
          <div style={{ position: "relative", marginTop: 3 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 13 }}>$</span>
            <input type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} style={{ ...inputStyle, paddingLeft: 22 }} />
          </div>
        </label>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 6,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleSkip}
          disabled={saving}
          style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 600,
            color: "#555", background: "none", border: "1px solid #e0e0e0",
            borderRadius: 6, cursor: saving ? "wait" : "pointer",
          }}
          title="Record that you have this, but mark dates as unknown"
        >
          Skip (fill in later)
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "8px 12px", fontSize: 12, color: "#999",
            background: "none", border: "none", cursor: saving ? "wait" : "pointer",
            marginLeft: "auto",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
