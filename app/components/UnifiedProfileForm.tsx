"use client"

import { useEffect, useState } from "react"
import { upsertProfileClient } from "../../lib/profileClient"
import type { UserProfile, PayFrequency } from "../../lib/profileTypes"
import {
  getSavingsProfile,
  upsertSavingsProfile,
  type SavingsProfile,
} from "../../lib/savingsProfile"
import {
  getSpendingProfile,
  upsertSpendingProfile,
  type SpendingProfile,
} from "../../lib/spendingProfile"

/**
 * Single form that reads from + writes to all 3 profile tables:
 *   user_profiles, savings_profile, spending_profile
 *
 * Savings and spending sections are collapsible since they're beta.
 */
export default function UnifiedProfileForm({
  userId,
  initialProfile,
}: {
  userId: string
  initialProfile: UserProfile
}) {
  // Paycheck (core)
  const [state, setState] = useState(initialProfile.state ?? "")
  const [payFrequency, setPayFrequency] = useState<PayFrequency>(initialProfile.pay_frequency)
  const [paycheckAmount, setPaycheckAmount] = useState(initialProfile.paycheck_amount)
  const [ddSlots, setDdSlots] = useState(initialProfile.dd_slots)
  const [income2Amt, setIncome2Amt] = useState(initialProfile.income_2_amount ?? 0)
  const [income2Freq, setIncome2Freq] = useState<PayFrequency>(initialProfile.income_2_frequency ?? "biweekly")

  // Savings (beta)
  const [sav, setSav] = useState<SavingsProfile | null>(null)
  const [savBalance, setSavBalance] = useState<number | "">("")
  const [savApy, setSavApy] = useState<number | "">("")
  const [savEmergency, setSavEmergency] = useState<number | "">("")

  // Spending (beta)
  const [spend, setSpend] = useState<SpendingProfile | null>(null)
  const [monthlySpend, setMonthlySpend] = useState<number | "">("")
  const [cpp, setCpp] = useState<number | "">("")
  const [rewardsVal, setRewardsVal] = useState<"cashback" | "points">("cashback")

  const [savingExpanded, setSavingExpanded] = useState(false)
  const [spendingExpanded, setSpendingExpanded] = useState(false)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Hydrate savings + spending on mount
  useEffect(() => {
    getSavingsProfile(userId).then((p) => {
      setSav(p)
      setSavBalance(p.current_balance ?? "")
      setSavApy(p.current_apy ?? "")
      setSavEmergency(p.emergency_fund ?? "")
      if (p.current_balance) setSavingExpanded(true)
    })
    getSpendingProfile(userId).then((p) => {
      setSpend(p)
      setMonthlySpend(p.monthly_spend ?? "")
      setCpp(p.cpp_valuation ?? "")
      setRewardsVal(p.rewards_valuation)
      if (p.monthly_spend) setSpendingExpanded(true)
    })
  }, [userId])

  async function handleSave() {
    setStatus("saving")
    try {
      await Promise.all([
        upsertProfileClient({
          user_id: userId,
          dd_slots: ddSlots,
          pay_frequency: payFrequency,
          paycheck_amount: paycheckAmount,
          state: state || null,
          income_2_amount: income2Amt > 0 ? income2Amt : null,
          income_2_frequency: income2Amt > 0 ? income2Freq : null,
        }),
        upsertSavingsProfile({
          user_id: userId,
          current_balance: savBalance === "" ? null : Number(savBalance),
          current_apy: savApy === "" ? null : Number(savApy),
          emergency_fund: savEmergency === "" ? null : Number(savEmergency),
          current_institution: sav?.current_institution ?? null,
          cash_reserves: sav?.cash_reserves ?? null,
        }),
        upsertSpendingProfile({
          user_id: userId,
          monthly_spend: monthlySpend === "" ? null : Number(monthlySpend),
          cpp_valuation: cpp === "" ? null : Number(cpp),
          rewards_valuation: rewardsVal,
          category_spend: spend?.category_spend ?? {},
          current_cards: spend?.current_cards ?? {},
          current_multipliers: spend?.current_multipliers ?? {},
        }),
      ])
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
    } catch (err) {
      console.error("[unified-profile] save failed:", err)
      setStatus("error")
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 32px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: "#111" }}>
        Your profile
      </h1>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px" }}>
        One form for all three modules. Savings and spending are optional (beta).
      </p>

      {/* ── Paycheck (core) ── */}
      <Section title="Paycheck" required>
        <Row label="State">
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={selectStyle}
          >
            <option value="">— select —</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Row>
        <Row label="Pay frequency">
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
            style={selectStyle}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semi-monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Row>
        <Row label="Paycheck amount">
          <NumInput value={paycheckAmount} onChange={setPaycheckAmount} prefix="$" />
        </Row>
        <Row label="Direct deposit slots">
          <NumInput value={ddSlots} onChange={setDdSlots} min={1} max={8} />
        </Row>
        <Row label="Second income (optional)">
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            <NumInput value={income2Amt} onChange={setIncome2Amt} prefix="$" placeholder="0" />
            <select
              value={income2Freq}
              onChange={(e) => setIncome2Freq(e.target.value as PayFrequency)}
              style={{ ...selectStyle, flex: "0 0 130px" }}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">Semi-monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </Row>
      </Section>

      {/* ── Savings (beta) ── */}
      <CollapsibleSection
        title="Savings"
        subtitle="High-yield savings & brokerage"
        beta
        expanded={savingExpanded}
        onToggle={() => setSavingExpanded(!savingExpanded)}
      >
        <Row label="Current balance">
          <NumInput
            value={savBalance === "" ? 0 : savBalance}
            onChange={(v) => setSavBalance(v)}
            prefix="$"
            placeholder="0"
          />
        </Row>
        <Row label="Current APY">
          <NumInput
            value={savApy === "" ? 0 : savApy}
            onChange={(v) => setSavApy(v)}
            step={0.01}
            suffix="%"
            placeholder="0"
          />
        </Row>
        <Row label="Emergency fund target">
          <NumInput
            value={savEmergency === "" ? 0 : savEmergency}
            onChange={(v) => setSavEmergency(v)}
            prefix="$"
            placeholder="0"
          />
        </Row>
      </CollapsibleSection>

      {/* ── Spending (beta) ── */}
      <CollapsibleSection
        title="Spending"
        subtitle="Credit card sign-up bonuses"
        beta
        expanded={spendingExpanded}
        onToggle={() => setSpendingExpanded(!spendingExpanded)}
      >
        <Row label="Monthly spend">
          <NumInput
            value={monthlySpend === "" ? 0 : monthlySpend}
            onChange={(v) => setMonthlySpend(v)}
            prefix="$"
            placeholder="0"
          />
        </Row>
        <Row label="Rewards valuation">
          <select
            value={rewardsVal}
            onChange={(e) => setRewardsVal(e.target.value as "cashback" | "points")}
            style={selectStyle}
          >
            <option value="cashback">Cashback</option>
            <option value="points">Points / miles</option>
          </select>
        </Row>
        {rewardsVal === "points" && (
          <Row label="Point value (cpp)">
            <NumInput
              value={cpp === "" ? 0 : cpp}
              onChange={(v) => setCpp(v)}
              step={0.1}
              suffix="¢"
              placeholder="1"
            />
          </Row>
        )}
      </CollapsibleSection>

      <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          style={{
            background: "#0d7c5f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: status === "saving" ? "wait" : "pointer",
            opacity: status === "saving" ? 0.6 : 1,
          }}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span style={{ fontSize: 13, color: "#0d7c5f", fontWeight: 600 }}>✓ Saved</span>
        )}
        {status === "error" && (
          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>Error — try again</span>
        )}
        <a
          href="/stacksos"
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "#888",
            textDecoration: "none",
          }}
        >
          Cancel
        </a>
      </div>
    </div>
  )
}

// ── Helpers ──

const selectStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #e2e2e2",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
}
const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #e2e2e2",
  borderRadius: 6,
  background: "#fff",
  color: "#111",
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f2f2f2" }}>
      <label style={{ fontSize: 13, color: "#555", flex: "0 0 180px" }}>{label}</label>
      {children}
    </div>
  )
}

function Section({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        {required && <span style={{ fontSize: 10, background: "#0d7c5f", color: "#fff", padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>REQUIRED</span>}
      </div>
      {children}
    </div>
  )
}

function CollapsibleSection({
  title,
  subtitle,
  beta,
  expanded,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  beta?: boolean
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 20px", marginBottom: 14 }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</span>
        {beta && (
          <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Beta
          </span>
        )}
        <span style={{ fontSize: 12, color: "#888" }}>{subtitle}</span>
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#888" }}>{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  value: number
  onChange: (n: number) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
      {prefix && <span style={{ fontSize: 13, color: "#888" }}>{prefix}</span>}
      <input
        type="number"
        value={value === 0 && placeholder ? "" : value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        style={inputStyle}
      />
      {suffix && <span style={{ fontSize: 13, color: "#888" }}>{suffix}</span>}
    </div>
  )
}

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
]
