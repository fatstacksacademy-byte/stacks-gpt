"use client"

import { useProfile, PayFrequency } from "./ProfileProvider"

const FREQ_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "Semi-monthly",
  monthly: "Monthly",
}

export default function ProfileBar() {
  const { profile, setProfile, loaded } = useProfile()

  if (!loaded) return <div style={barShell} />

  return (
    <div style={bar}>
      <span style={barLabel}>Pay profile:</span>

      <div style={group}>
        <label style={fieldLabel}>DD Slots</label>
        <div style={segmentRow}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setProfile({ dd_slots: n })}
              style={profile.dd_slots === n ? segActive : seg}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={group}>
        <label style={fieldLabel}>Frequency</label>
        <select
          value={profile.pay_frequency}
          onChange={(e) => setProfile({ pay_frequency: e.target.value as PayFrequency })}
          style={selectStyle}
        >
          {(Object.keys(FREQ_LABELS) as PayFrequency[]).map((f) => (
            <option key={f} value={f}>{FREQ_LABELS[f]}</option>
          ))}
        </select>
      </div>

      <div style={group}>
        <label style={fieldLabel}>Paycheck</label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={dollar}>$</span>
          <input
            type="number"
            value={profile.paycheck_amount}
            onChange={(e) => setProfile({ paycheck_amount: Number(e.target.value) })}
            style={numInput}
            min={0}
            step={100}
          />
        </div>
      </div>

      <span style={hint}>Changes sync instantly across all pages</span>
    </div>
  )
}

const barShell: React.CSSProperties = { height: 45, background: "#f4f4f4", borderBottom: "1px solid #e6e6e6" }
const bar: React.CSSProperties = { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", padding: "10px 32px", background: "#f4f4f4", borderBottom: "1px solid #e6e6e6", fontSize: 13 }
const barLabel: React.CSSProperties = { fontWeight: 700, color: "#333", whiteSpace: "nowrap" }
const group: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 }
const fieldLabel: React.CSSProperties = { fontSize: 12, color: "#666", whiteSpace: "nowrap" }
const segmentRow: React.CSSProperties = { display: "flex" }
const seg: React.CSSProperties = { padding: "4px 10px", fontSize: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#ddd", background: "#fff", cursor: "pointer", color: "#333" }
const segActive: React.CSSProperties = { padding: "4px 10px", fontSize: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#111", background: "#111", cursor: "pointer", color: "#fff" }
const selectStyle: React.CSSProperties = { padding: "4px 8px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, background: "#fff", color: "#333" }
const numInput: React.CSSProperties = { padding: "4px 8px 4px 18px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, width: 90 }
const dollar: React.CSSProperties = { position: "absolute", left: 7, color: "#888", fontSize: 12, pointerEvents: "none" }
const hint: React.CSSProperties = { fontSize: 11, color: "#aaa", marginLeft: "auto" }