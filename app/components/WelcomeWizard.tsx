"use client"

import { useState } from "react"
import { upsertProfileClient } from "../../lib/profileClient"
import { upsertSavingsProfile } from "../../lib/savingsProfile"
import { upsertSpendingProfile } from "../../lib/spendingProfile"
import type { UserProfile, PayFrequency } from "../../lib/profileTypes"

type Step = "paycheck" | "savings" | "spending" | "done"

/**
 * First-visit onboarding wizard. Three steps:
 *   1. Paycheck (required) — state, frequency, paycheck amount, DD slots
 *   2. Savings (skippable — beta)
 *   3. Spending (skippable — beta)
 *
 * Sets localStorage flag `stacks:onboarded=1` on completion so it doesn't
 * show again. Savings/spending can be filled in later from /stacksos/profile.
 */
export default function WelcomeWizard({
  userId,
  initialProfile,
  onComplete,
}: {
  userId: string
  initialProfile: UserProfile
  onComplete: () => void
}) {
  const [step, setStep] = useState<Step>("paycheck")

  // ── Paycheck state ──
  const [state, setState] = useState(initialProfile.state ?? "")
  const [payFreq, setPayFreq] = useState<PayFrequency>(initialProfile.pay_frequency)
  const [paycheck, setPaycheck] = useState<number>(initialProfile.paycheck_amount)
  const [ddSlots, setDdSlots] = useState<number>(initialProfile.dd_slots)

  // ── Savings state ──
  const [savBalance, setSavBalance] = useState<number>(0)
  const [savApy, setSavApy] = useState<number>(0)
  const [savingSaving, setSavingSaving] = useState(false)

  // ── Spending state ──
  const [monthlySpend, setMonthlySpend] = useState<number>(0)
  const [rewardsVal, setRewardsVal] = useState<"cashback" | "points">("cashback")

  async function savePaycheck() {
    await upsertProfileClient({
      user_id: userId,
      dd_slots: ddSlots,
      pay_frequency: payFreq,
      paycheck_amount: paycheck,
      state: state || null,
    })
    setStep("savings")
  }

  async function saveSavings(skip: boolean) {
    if (!skip) {
      setSavingSaving(true)
      await upsertSavingsProfile({
        user_id: userId,
        current_balance: savBalance > 0 ? savBalance : null,
        current_apy: savApy > 0 ? savApy : null,
        current_institution: null,
        emergency_fund: null,
        cash_reserves: null,
      })
      setSavingSaving(false)
    }
    setStep("spending")
  }

  async function saveSpending(skip: boolean) {
    if (!skip) {
      await upsertSpendingProfile({
        user_id: userId,
        monthly_spend: monthlySpend > 0 ? monthlySpend : null,
        cpp_valuation: null,
        rewards_valuation: rewardsVal,
        category_spend: {},
        current_cards: {},
        current_multipliers: {},
      })
    }
    localStorage.setItem("stacks:onboarded", "1")
    setStep("done")
    onComplete()
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 30, 25, 0.55)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "min(540px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          padding: "32px 32px 24px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
        className="ww-inner"
      >
        <StepDots step={step} />

        {step === "paycheck" && (
          <PaycheckStep
            state={state}
            setState={setState}
            payFreq={payFreq}
            setPayFreq={setPayFreq}
            paycheck={paycheck}
            setPaycheck={setPaycheck}
            ddSlots={ddSlots}
            setDdSlots={setDdSlots}
            onNext={savePaycheck}
          />
        )}

        {step === "savings" && (
          <SavingsStep
            savBalance={savBalance}
            setSavBalance={setSavBalance}
            savApy={savApy}
            setSavApy={setSavApy}
            saving={savingSaving}
            onSave={() => saveSavings(false)}
            onSkip={() => saveSavings(true)}
            onBack={() => setStep("paycheck")}
          />
        )}

        {step === "spending" && (
          <SpendingStep
            monthlySpend={monthlySpend}
            setMonthlySpend={setMonthlySpend}
            rewardsVal={rewardsVal}
            setRewardsVal={setRewardsVal}
            onSave={() => saveSpending(false)}
            onSkip={() => saveSpending(true)}
            onBack={() => setStep("savings")}
          />
        )}
      </div>
      <style>{`
        @media (max-width: 520px) {
          .ww-inner { padding: 22px 18px 18px !important; border-radius: 12px !important; }
        }
      `}</style>
    </div>
  )
}

// ── Steps ──

function PaycheckStep({
  state,
  setState,
  payFreq,
  setPayFreq,
  paycheck,
  setPaycheck,
  ddSlots,
  setDdSlots,
  onNext,
}: {
  state: string
  setState: (s: string) => void
  payFreq: PayFrequency
  setPayFreq: (f: PayFrequency) => void
  paycheck: number
  setPaycheck: (n: number) => void
  ddSlots: number
  setDdSlots: (n: number) => void
  onNext: () => void
}) {
  const canProceed = paycheck > 0 && !!state
  return (
    <>
      <EyebrowText>Step 1 of 3 · Required</EyebrowText>
      <Title>Let's set up your paycheck</Title>
      <Subtitle>
        This is the core of Stacks OS — we use these details to sequence bank bonuses across your
        direct deposits.
      </Subtitle>

      <Field label="State">
        <select value={state} onChange={(e) => setState(e.target.value)} style={selectStyle}>
          <option value="">— select your state —</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Pay frequency">
        <select
          value={payFreq}
          onChange={(e) => setPayFreq(e.target.value as PayFrequency)}
          style={selectStyle}
        >
          <option value="weekly">Every week</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="semimonthly">Twice a month</option>
          <option value="monthly">Once a month</option>
        </select>
      </Field>

      <Field label="Paycheck amount">
        <DollarInput value={paycheck} onChange={setPaycheck} />
      </Field>

      <Field label="Direct deposit slots" subtitle="Separate paychecks you can split (1 = typical)">
        <input
          type="number"
          min={1}
          max={6}
          value={ddSlots}
          onChange={(e) => setDdSlots(Number(e.target.value) || 1)}
          style={inputStyle}
        />
      </Field>

      <Actions>
        <PrimaryButton disabled={!canProceed} onClick={onNext}>
          Continue →
        </PrimaryButton>
      </Actions>
    </>
  )
}

function SavingsStep({
  savBalance,
  setSavBalance,
  savApy,
  setSavApy,
  saving,
  onSave,
  onSkip,
  onBack,
}: {
  savBalance: number
  setSavBalance: (n: number) => void
  savApy: number
  setSavApy: (n: number) => void
  saving: boolean
  onSave: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <>
      <EyebrowText>
        Step 2 of 3 · <BetaPill /> · Optional
      </EyebrowText>
      <Title>Do you have savings to deploy?</Title>
      <Subtitle>
        If you have cash sitting in savings, we can route it through high-yield bonuses
        for extra earnings on top of your paycheck stack. Skip this if you're just here for paycheck bonuses.
      </Subtitle>

      <Field label="Current savings balance">
        <DollarInput value={savBalance} onChange={setSavBalance} placeholder="0" />
      </Field>

      <Field label="Current APY" subtitle="Rate your savings currently earns">
        <PercentInput value={savApy} onChange={setSavApy} />
      </Field>

      <Actions>
        <SecondaryButton onClick={onBack}>← Back</SecondaryButton>
        <SecondaryButton onClick={onSkip}>Skip for now</SecondaryButton>
        <PrimaryButton disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Continue →"}
        </PrimaryButton>
      </Actions>
    </>
  )
}

function SpendingStep({
  monthlySpend,
  setMonthlySpend,
  rewardsVal,
  setRewardsVal,
  onSave,
  onSkip,
  onBack,
}: {
  monthlySpend: number
  setMonthlySpend: (n: number) => void
  rewardsVal: "cashback" | "points"
  setRewardsVal: (v: "cashback" | "points") => void
  onSave: () => void
  onSkip: () => void
  onBack: () => void
}) {
  return (
    <>
      <EyebrowText>
        Step 3 of 3 · <BetaPill /> · Optional
      </EyebrowText>
      <Title>Do you want to earn on spending too?</Title>
      <Subtitle>
        Credit card sign-up bonuses can add thousands per year if you spend routinely. We'll rank
        cards by return on spend. Skip if cards aren't your thing.
      </Subtitle>

      <Field label="Monthly spend" subtitle="Rough total across all categories">
        <DollarInput value={monthlySpend} onChange={setMonthlySpend} placeholder="0" />
      </Field>

      <Field label="Preferred rewards">
        <select
          value={rewardsVal}
          onChange={(e) => setRewardsVal(e.target.value as "cashback" | "points")}
          style={selectStyle}
        >
          <option value="cashback">Cashback</option>
          <option value="points">Points / miles</option>
        </select>
      </Field>

      <Actions>
        <SecondaryButton onClick={onBack}>← Back</SecondaryButton>
        <SecondaryButton onClick={onSkip}>Skip for now</SecondaryButton>
        <PrimaryButton onClick={onSave}>Finish →</PrimaryButton>
      </Actions>
    </>
  )
}

// ── Primitives ──

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["paycheck", "savings", "spending"]
  const currentIdx = order.indexOf(step)
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
      {order.map((s, i) => (
        <div
          key={s}
          style={{
            width: step === s ? 26 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= currentIdx ? "#0d7c5f" : "#e0e0e0",
            transition: "all 0.2s ease",
          }}
        />
      ))}
    </div>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 22,
        fontWeight: 800,
        color: "#111",
        margin: "0 0 8px",
        letterSpacing: "-0.01em",
        lineHeight: 1.25,
      }}
    >
      {children}
    </h2>
  )
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: "#666", margin: "0 0 20px", lineHeight: 1.55 }}>{children}</p>
}

function EyebrowText({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#0d7c5f",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function BetaPill() {
  return (
    <span
      style={{
        background: "#fef3c7",
        color: "#92400e",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
      }}
    >
      BETA
    </span>
  )
}

function Field({
  label,
  subtitle,
  children,
}: {
  label: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: "#333", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>{subtitle}</div>}
      {children}
    </div>
  )
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>{children}</div>
  )
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        minWidth: 130,
        padding: "11px 18px",
        fontSize: 14,
        fontWeight: 700,
        background: disabled ? "#cbe5db" : "#0d7c5f",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "11px 16px",
        fontSize: 13,
        fontWeight: 600,
        background: "#fff",
        color: "#666",
        border: "1px solid #e2e2e2",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function DollarInput({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 14,
          color: "#888",
        }}
      >
        $
      </span>
      <input
        type="number"
        value={value === 0 && placeholder ? "" : value}
        placeholder={placeholder}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...inputStyle, paddingLeft: 24 }}
      />
    </div>
  )
}

function PercentInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type="number"
        value={value === 0 ? "" : value}
        placeholder="0.00"
        min={0}
        step={0.01}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...inputStyle, paddingRight: 26 }}
      />
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 14,
          color: "#888",
        }}
      >
        %
      </span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid #e2e2e2",
  borderRadius: 8,
  background: "#fff",
  color: "#111",
  boxSizing: "border-box" as const,
  outline: "none",
}

const selectStyle: React.CSSProperties = { ...inputStyle }

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
]
