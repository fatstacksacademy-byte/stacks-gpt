"use client"

import React, { useState } from "react"
import { useSearchParams } from "next/navigation"
import { runSequencer, SequencedBonus } from "@/lib/sequencer"

type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"

const FREQ_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: "weekly",      label: "Every week" },
  { value: "biweekly",    label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly",     label: "Once a month" },
]

const FREQ_LABEL: Record<PayFrequency, string> = {
  weekly: "weekly",
  biweekly: "biweekly",
  semimonthly: "twice-monthly",
  monthly: "monthly",
}

type Step = "frequency" | "paycheck" | "projection"

function addDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const initialPlan = (searchParams.get("plan") ?? "annual") as "monthly" | "annual"

  const [step, setStep] = useState<Step>("frequency")
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly")
  const [paycheck, setPaycheck] = useState<string>("1500")
  const [bonuses, setBonuses] = useState<SequencedBonus[]>([])
  const [yearTotal, setYearTotal] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(initialPlan)

  function handleFrequencySelect(f: PayFrequency) {
    setFrequency(f)
    setStep("paycheck")
  }

  function handleBuildPlan() {
    const amt = parseInt(paycheck.replace(/\D/g, "")) || 0
    if (amt <= 0) return

    const result = runSequencer({
      slots: 1,
      payFrequency: frequency,
      paycheckAmount: amt,
      completedRecords: [],
      incomeSources: [{ pay_frequency: frequency, paycheck_amount: amt }],
    })

    const allBonusEntries = result.slots.flat().filter(
      (e): e is SequencedBonus => e.type === "bonus" && e.payout_week <= 52
    )

    const total = allBonusEntries.reduce((s, b) => s + b.bonus_amount, 0)
    setBonuses(allBonusEntries)
    setYearTotal(total)
    setStep("projection")
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setCheckoutLoading(false)
    } catch {
      setCheckoutLoading(false)
    }
  }

  const paycheckAmt = parseInt(paycheck.replace(/\D/g, "")) || 0
  const firstBonus = bonuses[0] ?? null
  const visibleBonuses = showAll ? bonuses : bonuses.slice(0, 5)

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
        {(["frequency", "paycheck", "projection"] as Step[]).map((s) => {
          const steps = ["frequency", "paycheck", "projection"]
          const currentIdx = steps.indexOf(step)
          const thisIdx = steps.indexOf(s)
          return (
            <div key={s} style={{
              width: step === s ? 20 : 6, height: 6, borderRadius: 3,
              background: step === s ? "#0d7c5f" : thisIdx < currentIdx ? "#0d7c5f" : "#e0e0e0",
              transition: "all 0.2s ease",
            }} />
          )
        })}
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* ── STEP 1: Frequency ── */}
        {step === "frequency" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Step 1 of 2</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                Let's estimate your bonus earnings.
              </h1>
              <p style={{ fontSize: 15, color: "#999", margin: 0 }}>How often do you get paid?</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FREQ_OPTIONS.map(f => (
                <button key={f.value} onClick={() => handleFrequencySelect(f.value)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "18px 20px", background: "#fff",
                    border: frequency === f.value ? "2px solid #0d7c5f" : "1px solid #e8e8e8",
                    borderRadius: 12, cursor: "pointer", textAlign: "left" as const,
                    transition: "border-color 0.15s",
                  }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Paycheck ── */}
        {step === "paycheck" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Step 2 of 2</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                What's your take-home pay?
              </h1>
              <p style={{ fontSize: 15, color: "#999", margin: 0 }}>Per paycheck after taxes. An estimate is fine.</p>
            </div>
            <div style={{ position: "relative", marginBottom: 24 }}>
              <span style={{
                position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)",
                fontSize: 28, fontWeight: 700, color: "#bbb",
              }}>$</span>
              <input
                type="number" value={paycheck}
                onChange={e => setPaycheck(e.target.value)}
                style={{
                  width: "100%", padding: "20px 20px 20px 44px", fontSize: 28, fontWeight: 700,
                  border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", color: "#111",
                  boxSizing: "border-box" as const, outline: "none",
                }}
                min={0} step={100} autoFocus
                onKeyDown={e => e.key === "Enter" && handleBuildPlan()}
              />
            </div>
            <button onClick={handleBuildPlan} disabled={!paycheckAmt || paycheckAmt <= 0}
              style={{
                width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
                background: paycheckAmt > 0 ? "#0d7c5f" : "#e0e0e0",
                color: "#fff", border: "none", borderRadius: 12,
                cursor: paycheckAmt > 0 ? "pointer" : "not-allowed",
                transition: "background 0.15s",
              }}>
              Show my projection →
            </button>
            <button onClick={() => setStep("frequency")}
              style={{ display: "block", margin: "14px auto 0", fontSize: 13, color: "#bbb", background: "none", border: "none", cursor: "pointer" }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── STEP 3: Projection ── */}
        {step === "projection" && (
          <div>
            {yearTotal > 0 ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Your projected bank bonus earnings
                  </div>
                  <h1 style={{ fontSize: 40, fontWeight: 800, color: "#0d7c5f", margin: "0 0 4px", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    ${yearTotal.toLocaleString()}
                  </h1>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 6px" }}>this year</p>
                  <p style={{ fontSize: 14, color: "#999", margin: "0 0 4px" }}>
                    Based on a ${paycheckAmt.toLocaleString()} {FREQ_LABEL[frequency]} paycheck
                  </p>
                  <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                    Most first bonuses pay $300–$400.
                  </p>
                </div>

                {/* First bonus callout */}
                {firstBonus && (
                  <div style={{
                    background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12,
                    padding: "16px 20px", marginBottom: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600, marginBottom: 2 }}>First bonus</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{firstBonus.bank_name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>~{fmtDate(addDays(firstBonus.payout_week * 7))}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${firstBonus.bonus_amount}</div>
                  </div>
                )}

                {/* Remaining bonuses */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {visibleBonuses.slice(1).map((b, i) => (
                    <div key={i} style={{
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
                      padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 11, color: "#bbb" }}>~{fmtDate(addDays(b.payout_week * 7))}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f" }}>${b.bonus_amount}</div>
                    </div>
                  ))}
                </div>

                {bonuses.length > 5 && (
                  <button onClick={() => setShowAll(s => !s)}
                    style={{ fontSize: 13, color: "#999", background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 16 }}>
                    {showAll ? "Show less" : `+ ${bonuses.length - 5} more bonuses available`}
                  </button>
                )}

                {/* ── Paywall CTA ── */}
                <div style={{
                  background: "#fff", border: "2px solid #0d7c5f", borderRadius: 14,
                  padding: "24px", marginTop: 8,
                  boxShadow: "0 4px 20px rgba(13,124,95,0.08)",
                }}>
                  {/* Plan toggle */}
                  <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3, marginBottom: 16 }}>
                    <button onClick={() => setSelectedPlan("annual")} style={{
                      flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
                      border: "none", cursor: "pointer",
                      background: selectedPlan === "annual" ? "#fff" : "transparent",
                      color: selectedPlan === "annual" ? "#111" : "#999",
                      boxShadow: selectedPlan === "annual" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}>
                      Annual · $50/yr
                      <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700, marginLeft: 6 }}>Save 17%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} style={{
                      flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
                      border: "none", cursor: "pointer",
                      background: selectedPlan === "monthly" ? "#fff" : "transparent",
                      color: selectedPlan === "monthly" ? "#111" : "#999",
                      boxShadow: selectedPlan === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}>
                      Monthly · $5/mo
                    </button>
                  </div>

                  <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                    That's a <strong style={{ color: "#111" }}>{Math.round(yearTotal / 50)}x return.</strong>
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                    $50 unlocks a <strong style={{ color: "#111" }}>${yearTotal.toLocaleString()} plan.</strong>
                  </div>

                  <button onClick={handleCheckout} disabled={checkoutLoading}
                    style={{
                      width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
                      background: checkoutLoading ? "#5aaa8a" : "#0d7c5f",
                      color: "#fff", border: "none", borderRadius: 10,
                      cursor: checkoutLoading ? "wait" : "pointer",
                    }}>
                    {checkoutLoading ? "Loading…" : `Unlock my bonus plan — $${selectedPlan === "annual" ? "50/yr" : "5/mo"}`}
                  </button>
                  <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, marginTop: 10 }}>
                    {selectedPlan === "annual" ? "Billed annually · Cancel anytime" : "Cancel anytime"}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 12 }}>No matching bonuses found</h1>
                <p style={{ fontSize: 15, color: "#888", marginBottom: 24 }}>
                  Most bonuses require a paycheck of at least $500. Try a different amount.
                </p>
                <button onClick={() => setStep("paycheck")}
                  style={{ fontSize: 15, fontWeight: 600, color: "#0d7c5f", background: "none", border: "none", cursor: "pointer" }}>
                  ← Try a different amount
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
