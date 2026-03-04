"use client"

import React, { useState } from "react"
import { useSearchParams } from "next/navigation"

type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"

const FREQ_OPTIONS: { value: PayFrequency; label: string; desc: string }[] = [
  { value: "weekly",      label: "Every week",     desc: "52 paychecks/year" },
  { value: "biweekly",    label: "Every 2 weeks",  desc: "26 paychecks/year" },
  { value: "semimonthly", label: "Twice a month",  desc: "24 paychecks/year" },
  { value: "monthly",     label: "Once a month",   desc: "12 paychecks/year" },
]

const DAYS_PER_PAY: Record<PayFrequency, number> = {
  weekly: 7, biweekly: 14, semimonthly: 15.2, monthly: 30.4,
}

// Simplified projection — mirrors the logic in RoadmapClient / sequencer
// Uses a static bonus pool to estimate yearly earnings
const BONUS_POOL = [
  { bank: "SoFi",         amount: 300,  ddMin: 1000, window: 30,  posting: 30  },
  { bank: "Axos",         amount: 500,  ddMin: 1500, window: 60,  posting: 60  },
  { bank: "Chime",        amount: 100,  ddMin: 200,  window: 30,  posting: 30  },
  { bank: "Discover",     amount: 360,  ddMin: 1500, window: 90,  posting: 90  },
  { bank: "Citi",         amount: 700,  ddMin: 1500, window: 60,  posting: 90  },
  { bank: "Chase",        amount: 300,  ddMin: 500,  window: 90,  posting: 90  },
  { bank: "US Bank",      amount: 400,  ddMin: 3000, window: 60,  posting: 60  },
  { bank: "BMO",          amount: 300,  ddMin: 1000, window: 90,  posting: 60  },
  { bank: "KeyBank",      amount: 300,  ddMin: 1000, window: 60,  posting: 60  },
  { bank: "Flagstar",     amount: 400,  ddMin: 2500, window: 90,  posting: 90  },
]

type ProjectedBonus = { bank: string; amount: number; payoutWeek: number }

function buildProjection(frequency: PayFrequency, paycheck: number): ProjectedBonus[] {
  const weeklyIncome = (paycheck / DAYS_PER_PAY[frequency]) * 7
  const result: ProjectedBonus[] = []
  let currentWeek = 1

  for (const bonus of BONUS_POOL) {
    if (currentWeek > 52) break
    // Check feasibility
    if (paycheck < bonus.ddMin) continue
    const weeksToMeetDD = Math.ceil(bonus.ddMin / weeklyIncome)
    const windowWeeks = Math.ceil(bonus.window / 7)
    if (weeksToMeetDD > windowWeeks) continue

    const postingWeeks = Math.ceil(bonus.posting / 7)
    const payoutWeek = currentWeek + weeksToMeetDD + postingWeeks
    if (payoutWeek > 56) break

    result.push({ bank: bonus.bank, amount: bonus.amount, payoutWeek })
    // Next bonus starts after this one posts (simplified: overlap allowed after DD met)
    currentWeek += weeksToMeetDD + 2
  }

  return result
}

type Step = "frequency" | "paycheck" | "projection"

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") ?? "annual"

  const [step, setStep] = useState<Step>("frequency")
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly")
  const [paycheck, setPaycheck] = useState<string>("1500")
  const [projection, setProjection] = useState<ProjectedBonus[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [showAllBonuses, setShowAllBonuses] = useState(false)

  function handleFrequencySelect(f: PayFrequency) {
    setFrequency(f)
    setStep("paycheck")
  }

  function handleBuildPlan() {
    const amt = parseInt(paycheck.replace(/\D/g, "")) || 0
    if (amt <= 0) return
    const proj = buildProjection(frequency, amt)
    setProjection(proj)
    setStep("projection")
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setCheckoutLoading(false)
    } catch {
      setCheckoutLoading(false)
    }
  }

  const yearTotal = projection.reduce((s, p) => s + p.amount, 0)
  const firstBonus = projection[0]
  const paycheckAmt = parseInt(paycheck.replace(/\D/g, "")) || 0
  const visibleBonuses = showAllBonuses ? projection : projection.slice(0, 4)

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
        {(["frequency", "paycheck", "projection"] as Step[]).map((s, i) => (
          <div key={s} style={{
            width: step === s ? 20 : 6, height: 6, borderRadius: 3,
            background: step === s ? "#0d7c5f" : (
              ["frequency", "paycheck", "projection"].indexOf(step) > i ? "#0d7c5f" : "#e0e0e0"
            ),
            transition: "all 0.2s ease",
          }} />
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* ── STEP 1: Frequency ── */}
        {step === "frequency" && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Step 1 of 2</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                How often do you get paid?
              </h1>
              <p style={{ fontSize: 15, color: "#999", margin: 0 }}>We'll use this to match you with the right bonuses.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FREQ_OPTIONS.map(f => (
                <button key={f.value} onClick={() => handleFrequencySelect(f.value)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "18px 20px", background: "#fff", border: frequency === f.value ? "2px solid #0d7c5f" : "1px solid #e8e8e8",
                    borderRadius: 12, cursor: "pointer", textAlign: "left" as const,
                    transition: "border-color 0.15s",
                  }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{f.label}</span>
                  <span style={{ fontSize: 13, color: "#bbb" }}>{f.desc}</span>
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
              <p style={{ fontSize: 15, color: "#999", margin: 0 }}>Per paycheck, after taxes. A rough estimate is fine.</p>
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
              Build my plan →
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
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    Your personalized plan
                  </div>
                  <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    You could earn{" "}
                    <span style={{ color: "#0d7c5f" }}>${yearTotal.toLocaleString()}</span>
                    {" "}this year
                  </h1>
                  <p style={{ fontSize: 15, color: "#999", margin: 0 }}>
                    Based on your ${paycheckAmt.toLocaleString()} {FREQ_OPTIONS.find(f => f.value === frequency)?.label.toLowerCase()} paycheck
                  </p>
                </div>

                {/* First bonus callout */}
                {firstBonus && (
                  <div style={{
                    background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12,
                    padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600, marginBottom: 2 }}>First bonus</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{firstBonus.bank}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>~week {firstBonus.payoutWeek}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${firstBonus.amount}</div>
                  </div>
                )}

                {/* Bonus list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {visibleBonuses.slice(1).map((p, i) => (
                    <div key={i} style={{
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
                      padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{p.bank}</div>
                        <div style={{ fontSize: 11, color: "#bbb" }}>~week {p.payoutWeek}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f" }}>${p.amount}</div>
                    </div>
                  ))}
                </div>

                {projection.length > 4 && (
                  <button onClick={() => setShowAllBonuses(s => !s)}
                    style={{ fontSize: 13, color: "#999", background: "none", border: "none", cursor: "pointer", padding: "4px 0", marginBottom: 16 }}>
                    {showAllBonuses ? "Show less" : `+ ${projection.length - 4} more bonuses`}
                  </button>
                )}

                {/* CTA */}
                <div style={{
                  background: "#fff", border: "2px solid #0d7c5f", borderRadius: 14,
                  padding: "24px", marginTop: 8,
                  boxShadow: "0 4px 20px rgba(13,124,95,0.08)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Stacks OS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>
                      ${plan === "annual" ? "50/yr" : "5/mo"}
                      {plan === "annual" && <span style={{ fontSize: 12, color: "#999", fontWeight: 400, marginLeft: 6 }}>· $4.17/mo</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                    Your first bonus alone covers {Math.round((firstBonus?.amount ?? 300) / (plan === "annual" ? 50 : 5))}x the cost.
                  </div>
                  <button onClick={handleCheckout} disabled={checkoutLoading}
                    style={{
                      width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
                      background: checkoutLoading ? "#5aaa8a" : "#0d7c5f",
                      color: "#fff", border: "none", borderRadius: 10,
                      cursor: checkoutLoading ? "wait" : "pointer",
                    }}>
                    {checkoutLoading ? "Loading…" : `Start earning — $${plan === "annual" ? "50/yr" : "5/mo"}`}
                  </button>
                  <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, marginTop: 10 }}>
                    {plan === "annual" ? "Billed annually · Cancel anytime" : "Cancel anytime"}
                  </div>
                </div>
              </>
            ) : (
              // Edge case: paycheck too low for any bonus
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 12 }}>
                  We couldn't find matching bonuses
                </h1>
                <p style={{ fontSize: 15, color: "#888", marginBottom: 24 }}>
                  Most bonuses require a paycheck of at least $500. Try adjusting your amount.
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
