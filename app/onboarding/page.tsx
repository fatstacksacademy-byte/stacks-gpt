"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { runSequencer, SequencedBonus } from "@/lib/sequencer"
import { runSavingsSequencer } from "@/lib/savingsSequencer"
import { sequenceCards, DEFAULT_MAX_CARDS_PER_YEAR } from "@/lib/ccSequencer"
import { creditCardBonuses } from "@/lib/data/creditCardBonuses"
import { bonuses as checkingBonuses } from "@/lib/data/bonuses"
import { savingsBonuses } from "@/lib/data/savingsBonuses"
import { createClient } from "@/lib/supabase/client"
import { track } from "@/lib/analytics"

// Size of the live catalog we sequence from — used to contrast the curated
// plan against the full pool ("the X most profitable, picked from N tracked").
const TOTAL_TRACKED =
  checkingBonuses.filter((b: any) => !b.expired).length +
  savingsBonuses.length +
  creditCardBonuses.filter(c => !c.expired).length

// Opt out of static prerender — useSearchParams reads from the request,
// and the now-Supabase-free root layout no longer transitively marks
// every page dynamic.
export const dynamic = "force-dynamic"

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

// One row in the projection list, normalized across all three sequencers
// (checking/paycheck, savings, and credit-card spending) so the total and
// the displayed bonuses cover every angle, not just direct deposit.
type ProjItem = { bank_name: string; amount: number; start_week: number }

function addDays(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function OnboardingPage() {
  // useSearchParams forces a CSR bailout — wrap in Suspense so Next can build.
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  )
}

function OnboardingInner() {
  const searchParams = useSearchParams()
  const initialPlan = (searchParams.get("plan") ?? "annual") as "monthly" | "annual"
  const supabase = createClient()

  const [step, setStep] = useState<Step>("frequency")
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly")
  const [paycheck, setPaycheck] = useState<string>("1500")
  const [userState, setUserState] = useState<string>("")
  const [militaryAffiliated, setMilitaryAffiliated] = useState<boolean>(false)
  const [ddSlots, setDdSlots] = useState<string>("1")
  const [savingsBalance, setSavingsBalance] = useState<string>("")
  const [monthlySpend, setMonthlySpend] = useState<string>("")
  const [bonuses, setBonuses] = useState<ProjItem[]>([])
  const [counts, setCounts] = useState({ paycheck: 0, savings: 0, spending: 0 })
  const [yearTotal, setYearTotal] = useState(0)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(initialPlan)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  function handleFrequencySelect(f: PayFrequency) {
    setFrequency(f)
    setStep("paycheck")
  }

  function handleBuildPlan() {
    const amt = parseInt(paycheck.replace(/\D/g, "")) || 0
    if (amt <= 0 || !userState) return
    const savingsAmt = parseInt(savingsBalance.replace(/\D/g, "")) || 0
    const spendAmt = parseInt(monthlySpend.replace(/\D/g, "")) || 0

    // ── 1. Paycheck (checking / direct-deposit bonuses) ──
    const result = runSequencer({
      slots: parseInt(ddSlots) || 1,
      payFrequency: frequency,
      paycheckAmount: amt,
      completedRecords: [],
      incomeSources: [{ pay_frequency: frequency, paycheck_amount: amt }],
      userState: userState || undefined,
      militaryAffiliated,
    })
    const checkingEntries = result.slots.flat().filter(
      (e): e is SequencedBonus => e.type === "bonus" && e.start_week <= 52
    )
    // Use NET bonuses (post-fee). Every placement the sequencer fits inside the
    // 52-week horizon is a real, feasible bonus, so surface them all rather than
    // clamping the count.
    const checkingItems: ProjItem[] = [...checkingEntries]
      .sort((a, b) => a.start_week - b.start_week)
      .map(b => ({ bank_name: b.bank_name, amount: b.net_bonus ?? b.bonus_amount, start_week: b.start_week }))

    // ── 2. Savings (park-cash bonuses ranked by effective APY) ──
    // Only count bonuses that can be *started* within the next 12 months —
    // the savings sequencer rotates capital indefinitely, so cap the horizon.
    let savingsItems: ProjItem[] = []
    if (savingsAmt > 0) {
      const sres = runSavingsSequencer({
        availableBalance: savingsAmt,
        userState: userState || undefined,
        includeBrokerage: true,
        militaryAffiliated,
      })
      savingsItems = (sres.entries ?? [])
        .filter(e => e.start_day <= 365)
        .map(e => ({ bank_name: e.bank_name, amount: Math.round(e.total_earnings ?? 0), start_week: Math.max(1, Math.round(e.start_day / 7)) }))
    }

    // ── 3. Spending (credit-card signup bonuses ranked by net value) ──
    let spendingItems: ProjItem[] = []
    if (spendAmt > 0) {
      const seq = sequenceCards(creditCardBonuses, spendAmt, userState || null, DEFAULT_MAX_CARDS_PER_YEAR, false, null, militaryAffiliated)
      spendingItems = seq
        .filter(s => s.cumulative_months <= 12)
        .map(s => ({ bank_name: s.card.card_name, amount: Math.round(s.net_value), start_week: Math.max(1, Math.round(Math.max(0, s.cumulative_months - s.months_to_complete) * 4.33)) }))
    }

    const merged = [...checkingItems, ...savingsItems, ...spendingItems].sort((a, b) => a.start_week - b.start_week)
    const total = merged.reduce((s, b) => s + b.amount, 0)
    setBonuses(merged)
    setCounts({ paycheck: checkingItems.length, savings: savingsItems.length, spending: spendingItems.length })
    setYearTotal(total)
    setStep("projection")
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    setCheckoutError(null)
    track("checkout_started", { plan: selectedPlan, source: "onboarding" })
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(data.error ?? "Something went wrong. Please try again.")
        setCheckoutLoading(false)
      }
    } catch (err: any) {
      setCheckoutError(err.message ?? "Network error. Please try again.")
      setCheckoutLoading(false)
    }
  }

  const paycheckAmt = parseInt(paycheck.replace(/\D/g, "")) || 0
  const savingsAmt = parseInt(savingsBalance.replace(/\D/g, "")) || 0
  const spendAmt = parseInt(monthlySpend.replace(/\D/g, "")) || 0
  const firstBonus = bonuses[0] ?? null


  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>
      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111", letterSpacing: "-0.01em" }}>Stacks OS</span>
        {isLoggedIn && (
          <button onClick={handleLogout} style={{ fontSize: 13, color: "#999", background: "none", border: "none", cursor: "pointer" }}>
            Log out
          </button>
        )}
      </div>

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
                Tell us about your finances
              </h1>
              <p style={{ fontSize: 15, color: "#999", margin: 0 }}>Estimates are fine. This helps us find the best bonuses for you.</p>
            </div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>
              Paycheck amount <span style={{ color: "#bbb" }}>({FREQ_LABEL[frequency]}, take-home)</span>
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
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>Income sources <span style={{ color: "#bbb" }}>(DD slots)</span></div>
                <select value={ddSlots} onChange={e => setDdSlots(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", color: "#111" }}>
                  <option value="1">1 job</option>
                  <option value="2">2 jobs / income sources</option>
                  <option value="3">3 income sources</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>Savings available</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb" }}>$</span>
                  <input type="number" value={savingsBalance} onChange={e => setSavingsBalance(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px 12px 30px", fontSize: 15, border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", color: "#111", boxSizing: "border-box" as const }} placeholder="0" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>Monthly card spend <span style={{ color: "#0d7c5f", fontWeight: 700 }}>Beta</span></div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb" }}>$</span>
                  <input type="number" value={monthlySpend} onChange={e => setMonthlySpend(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px 12px 30px", fontSize: 15, border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", color: "#111", boxSizing: "border-box" as const }} placeholder="0" />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 6 }}>What state do you live in? <span style={{ color: "#bbb" }}>(unlocks state-specific bonuses)</span></div>
              <select value={userState} onChange={e => setUserState(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", color: userState ? "#111" : "#999" }}>
                <option value="" disabled>Select your state</option>
                {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: "2px solid #e8e8e8", borderRadius: 12, background: "#fff", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={militaryAffiliated}
                  onChange={(e) => setMilitaryAffiliated(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>I'm eligible for military banking</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                    Active duty, veteran, dependent, or other affiliation. Unlocks USAA, Navy Federal, and AAFES bonuses.
                  </div>
                </span>
              </label>
            </div>
            <button onClick={handleBuildPlan} disabled={!paycheckAmt || paycheckAmt <= 0 || !userState}
              style={{
                width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
                background: paycheckAmt > 0 && userState ? "#0d7c5f" : "#e0e0e0",
                color: "#fff", border: "none", borderRadius: 12,
                cursor: paycheckAmt > 0 && userState ? "pointer" : "not-allowed",
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
                    Projected bank bonus earnings
                  </div>
                  <h1 style={{ fontSize: 40, fontWeight: 800, color: "#0d7c5f", margin: "0 0 4px", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    ${yearTotal.toLocaleString()}
                  </h1>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 6px" }}>in the next 12 months</p>
                  <p style={{ fontSize: 14, color: "#999", margin: "0 0 4px" }}>
                    Based on a ${paycheckAmt.toLocaleString()} {FREQ_LABEL[frequency]} paycheck
                    {savingsAmt > 0 ? `, $${savingsAmt.toLocaleString()} savings` : ""}
                    {spendAmt > 0 ? `, $${spendAmt.toLocaleString()}/mo card spend` : ""}
                  </p>
                  <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
                    Across checking, savings &amp; credit-card bonuses.
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
                      <div style={{ fontSize: 12, color: "#666" }}>Start ~{fmtDate(addDays(firstBonus.start_week * 7))}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7c5f" }}>${firstBonus.amount.toLocaleString()}</div>
                  </div>
                )}

                {/* Next 2 bonuses */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {bonuses.slice(1, 3).map((b, i) => (
                    <div key={i} style={{
                      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
                      padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{b.bank_name}</div>
                        <div style={{ fontSize: 11, color: "#bbb" }}>Start ~{fmtDate(addDays(b.start_week * 7))}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f" }}>${b.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                {/* Plan breakdown by category */}
                {bonuses.length > 0 && (
                  <div style={{
                    background: "#f8f8f8", border: "1px solid #e8e8e8", borderRadius: 10,
                    padding: "16px", marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12, textAlign: "center" }}>
                      {bonuses.length} bonuses in your plan
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { label: "Paycheck", n: counts.paycheck },
                        { label: "Savings", n: counts.savings },
                        { label: "Credit card", n: counts.spending },
                      ].map(c => (
                        <div key={c.label} style={{ flex: 1, textAlign: "center", padding: "10px 6px", background: "#fff", border: "1px solid #eee", borderRadius: 8 }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", lineHeight: 1 }}>{c.n}</div>
                          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 12, textAlign: "center" }}>
                      The most profitable picks from the <strong style={{ color: "#0d7c5f" }}>{TOTAL_TRACKED.toLocaleString()}+ bonuses</strong> Stacks OS tracks — ranked and sequenced for you.
                    </div>
                  </div>
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
                      Annual · $99/yr
                      <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700, marginLeft: 6 }}>Save 18%</span>
                    </button>
                    <button onClick={() => setSelectedPlan("monthly")} style={{
                      flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
                      border: "none", cursor: "pointer",
                      background: selectedPlan === "monthly" ? "#fff" : "transparent",
                      color: selectedPlan === "monthly" ? "#111" : "#999",
                      boxShadow: selectedPlan === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s",
                    }}>
                      Monthly · $10/mo
                    </button>
                  </div>

                  {selectedPlan === "annual" ? (
                    <>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                        $99 unlocks a <strong style={{ color: "#111" }}>${yearTotal.toLocaleString()} plan.</strong>
                      </div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                        That's a <strong style={{ color: "#111" }}>{Math.round(yearTotal / 99)}x return.</strong>
                      </div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                        Most first bonuses pay <strong style={{ color: "#111" }}>$300–$400.</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>
                        $10/mo unlocks ~<strong style={{ color: "#111" }}>${Math.round(yearTotal / 12).toLocaleString()}/month</strong> in bonuses.
                      </div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                        That's a <strong style={{ color: "#111" }}>{Math.round(yearTotal / 120)}x return.</strong>
                      </div>
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                        Most first bonuses pay <strong style={{ color: "#111" }}>$300–$400.</strong>
                      </div>
                    </>
                  )}

                  <button onClick={handleCheckout} disabled={checkoutLoading}
                    style={{
                      width: "100%", padding: "16px", fontSize: 16, fontWeight: 700,
                      background: checkoutLoading ? "#5aaa8a" : "#0d7c5f",
                      color: "#fff", border: "none", borderRadius: 10,
                      cursor: checkoutLoading ? "wait" : "pointer",
                    }}>
                    {checkoutLoading ? "Loading…" : selectedPlan === "annual" ? "Unlock my bonus plan for $99/year" : "Unlock my bonus plan for $10/mo"}
                  </button>
                  {checkoutError && (
                    <div style={{ fontSize: 12, color: "#dc2626", textAlign: "center" as const, marginTop: 8 }}>
                      {checkoutError}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, marginTop: 10 }}>
                    {selectedPlan === "annual" ? "Billed annually · Cancel anytime" : "Cancel anytime"}
                  </div>

                  {isLoggedIn && (
                    <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 18, paddingTop: 14, textAlign: "center" as const }}>
                      <a href="/stacksos" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
                        Or, start tracking bonuses for free →
                      </a>
                    </div>
                  )}

                  {/* Feature checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                    {[
                      "Personalized bonus queue",
                      "Step-by-step checklists",
                      "Deposit tracking",
                      "12-month earnings projection",
                      "Cooldown + eligibility tracking",
                      "Bonus details + requirements",
                    ].map((feature) => (
                      <div key={feature} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "#0d7c5f", fontSize: 16, fontWeight: 700 }}>✓</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setStep("paycheck")}
                  style={{ display: "block", margin: "16px auto 0", fontSize: 13, color: "#bbb", background: "none", border: "none", cursor: "pointer" }}>
                  ← Edit my numbers
                </button>
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
