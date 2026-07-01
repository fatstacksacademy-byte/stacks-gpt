"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import InfoTip from "../components/InfoTip"
import AcademyLedger from "../components/AcademyLedger"

export default function StacksOSLanding({ loggedInEmail }: { loggedInEmail: string | null }) {
  const supabase = createClient()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)

  // Prefill the email captured by the catalog email-gate (localStorage key set
  // by useCatalogUnlock on /spending and /bonuses), so a visitor who unlocked
  // the catalog but didn't click their magic link sees their email already
  // filled here — one less field to re-type to finish their free account.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fsa_catalog_unlocked")
      // One-time seed from localStorage (an external system) on mount; kept in
      // an effect rather than a lazy initializer so server/client first render
      // match (no hydration mismatch). Single, harmless extra render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && saved.includes("@")) setEmail(prev => prev || saved)
    } catch {
      /* localStorage unavailable (private mode) — no prefill, no harm */
    }
  }, [])

  async function handleManageBilling() {
    setBillingLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { setBillingLoading(false); alert(data.error ?? "Could not open billing portal. Email fatstacksacademy@gmail.com for help.") }
    } catch {
      setBillingLoading(false)
      alert("Network error opening billing portal. Email fatstacksacademy@gmail.com for help.")
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setLoading(false); setError(signUpError.message); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) { setError("Account created! Please sign in."); return }
    router.push(`/onboarding?plan=${billingCycle}`)
    router.refresh()
  }

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{`
        .lp-nav { padding: 20px 40px; }
        .lp-section { padding: 60px 40px; }
        .lp-hero { padding: 80px 40px 60px; }
        .lp-hero h1 { font-size: 56px; }
        .lp-hero p { font-size: 19px; }
        .lp-cta-buttons { display: flex; gap: 14px; margin-bottom: 48px; flex-wrap: wrap; justify-content: center; }
        .lp-stats { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .lp-hero-inner { display: flex; align-items: center; gap: 64px; }
        .lp-hero-text { flex: 1; text-align: left; }
        .lp-hero-text .lp-cta-buttons { justify-content: flex-start; }
        .lp-hero-text .lp-stats { justify-content: flex-start; }
        .lp-hero-photo { flex-shrink: 0; width: 420px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .lp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .lp-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .lp-roadmap-list { display: flex; flex-direction: column; gap: 0; max-width: 360px; margin: 0 auto; }
        .lp-pricing-row { display: flex; gap: 40px; align-items: flex-start; justify-content: center; flex-wrap: wrap; }
        .lp-pricing-card { width: 340px; flex-shrink: 0; }
        .lp-signup-card { width: 380px; flex-shrink: 0; }
        .lp-footer { padding: 40px 40px 32px; display: flex; justify-content: space-between; align-items: center; }
        .lp-faq { padding: 60px 40px; }
        .lp-nav-user { display: flex; align-items: center; gap: 16px; }
        .lp-nav-email { font-size: 13px; color: #6b7280; }
        @media (max-width: 768px) {
          .lp-nav { padding: 16px 20px; }
          .lp-nav-email { display: none; }
          .lp-section { padding: 40px 20px; }
          .lp-hero { padding: 48px 20px 40px; }
          .lp-hero h1 { font-size: 36px; }
          .lp-hero p { font-size: 16px; }
          .lp-cta-buttons { flex-direction: column; gap: 10px; width: 100%; }
          .lp-cta-buttons a { text-align: center; }
          .lp-stats { gap: 28px; }
          .lp-hero-inner { flex-direction: column; gap: 32px; }
          .lp-hero-text { text-align: center; }
          .lp-hero-text .lp-cta-buttons { justify-content: center; }
          .lp-hero-text .lp-stats { justify-content: center; }
          .lp-hero-photo { width: 100%; max-width: 420px; }
          .lp-grid-3 { grid-template-columns: 1fr; }
          .lp-grid-2 { grid-template-columns: 1fr; }
          .lp-compare { grid-template-columns: 1fr; }
          .lp-pricing-row { flex-direction: column; align-items: center; gap: 20px; }
          .lp-pricing-card { width: 100%; max-width: 420px; }
          .lp-signup-card { width: 100%; max-width: 420px; }
          .lp-footer { flex-direction: column; gap: 16px; padding: 32px 20px; text-align: center; }
          .lp-faq { padding: 40px 20px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="lp-nav" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>Stacks OS</span>
        {loggedInEmail ? (
          <div className="lp-nav-user">
            <span className="lp-nav-email">{loggedInEmail}</span>
            <button onClick={handleManageBilling} disabled={billingLoading}
              style={{ fontSize: 14, fontWeight: 500, color: "#9aa1ad", background: "none", border: "none", cursor: billingLoading ? "wait" : "pointer", padding: 0, textDecoration: "underline" }}>
              {billingLoading ? "Opening…" : "Manage billing"}
            </button>
            <Link href="/stacksos" style={{ fontSize: 14, fontWeight: 600, color: "#34d399", textDecoration: "none" }}>Go to app →</Link>
          </div>
        ) : (
          <Link href="/login" style={{ fontSize: 14, color: "#9aa1ad", textDecoration: "none" }}>Log in</Link>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div style={{
              display: "inline-block", fontSize: 12, fontWeight: 600, color: "#34d399",
              background: "rgba(13,150,104,0.16)", padding: "6px 14px", borderRadius: 99, marginBottom: 24,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Free — no credit card required
            </div>
            <h1 style={{ fontWeight: 800, color: "#ffffff", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
              Find your most profitable
              <br />
              bank bonus <span style={{ color: "#34d399" }}>in 60 seconds.</span>
            </h1>
            <p style={{ color: "#9aa1ad", lineHeight: 1.6, margin: "0 0 12px", maxWidth: 480 }}>
              Banks pay $300–$500 to open an account. Stacks OS tells you exactly which one to do next for your paycheck, tracks every deadline, and adds up your haul — alongside a crew clawing $1B back from the banks.
            </p>
            <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, margin: "0 0 32px", maxWidth: 480 }}>
              Free to track every bonus. Upgrade to <strong style={{ color: "#34d399" }}>Pro ($10/mo)</strong> for the personalized queue that ranks checking, savings, and card bonuses and re-sequences as offers change.
            </p>
            <div className="lp-cta-buttons">
              <a href="#signup" style={{
                fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d9668",
                padding: "16px 36px", borderRadius: 10, textDecoration: "none",
                boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
              }}>Start free →</a>
              <a href="#pricing" style={{
                fontSize: 16, fontWeight: 500, color: "#9aa1ad",
                padding: "16px 28px", borderRadius: 10, textDecoration: "none",
                border: "1px solid #2a2e38",
              }}>See Pro features</a>
            </div>
            <div className="lp-stats">
              {[
                { value: "Free", label: "to track any bonus" },
                { value: "$3,000+", label: "potential first year" },
                { value: "60 sec", label: "to your bonus plan" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff" }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-hero-photo">
            <Image
              src="/hero-photo.jpg"
              alt="Stacks OS founder holding bank bonus statement"
              width={840}
              height={473}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
          </div>
        </div>
      </section>

      {/* ── FAT STACKS ACADEMY (collective $1B ledger) ── */}
      <AcademyLedger />

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Three steps. Repeat.
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 0 48px" }}>No gimmicks. Just a system.</p>
        <div className="lp-grid-3">
          {[
            { step: "01", title: "Open the account", desc: "Stacks shows you the best bonus for your paycheck. Click the link and open the account — takes about 10 minutes." },
            { step: "02", title: "Route your direct deposit", desc: "Update your direct deposit to the new account. Your regular paycheck handles the requirement — no extra money needed." },
            { step: "03", title: "Collect your bonus. Repeat.", desc: "Once a bonus posts, move to the next bank. Stacks tracks your progress and keeps the queue updated." },
          ].map((item, i) => (
            <div key={i} style={{ background: "#161922", borderRadius: 14, padding: "32px 28px", border: "1px solid #23262e" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#2a2e38", marginBottom: 16 }}>{item.step}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "#9aa1ad", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="lp-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Everything handled in one place
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 0 28px" }}>No spreadsheets. No blog tabs. No forgetting deadlines.</p>
        <div style={{
          maxWidth: 620, margin: "0 auto 40px", padding: "14px 18px",
          background: "rgba(13,150,104,0.12)", border: "1px solid rgba(13,150,104,0.5)", borderRadius: 12,
          fontSize: 13.5, color: "#34d399", lineHeight: 1.55, textAlign: "center",
        }}>
          Browsing the catalog, tracking your bonuses, and manual entry are <span style={{ fontWeight: 700 }}>free</span>. The <span style={{ fontWeight: 700 }}>Sequencer</span> <InfoTip term="sequencer" label="the Sequencer" /> — which ranks and schedules bonuses for you — and the multi-year projection are <span style={{ fontWeight: 700, color: "#34d399" }}>Pro</span> (tagged below).
        </div>
        <div className="lp-grid-2">
          {([
            { title: "Full researched bonus catalog", desc: "Every current offer with complete requirements — deposit amounts, deadlines, fees, and eligibility. No more digging through blogs, forums, and Reddit." },
            { title: "Step-by-step checklist for every bonus", desc: "Each bonus is broken into simple steps. Check them off as you go. Always know what to do next." },
            { title: "Never miss a requirement", desc: "Track deposit amounts and deadlines so bonuses don't slip through the cracks." },
            { title: "Know when you're eligible again", desc: "Stacks tracks each bonus's cooldown and counts down the days until you can earn it a second time. No spreadsheet formula required." },
            { title: "Lifetime earnings + history", desc: "Every bonus you've earned, totaled automatically, with a full record of what you've completed." },
            { title: "One dashboard for everything", desc: "See what's in progress, what's next, and what's cooling down — all in one place." },
            { title: "Know which bonus to do next", desc: "Stacks ranks checking, savings, and credit-card bonuses for your situation and tells you which one to start next. No guessing which bank to try.", pro: true },
            { title: "12-month earnings projection", desc: "See your projected bonus earnings before you even start. Updated as you complete bonuses.", pro: true },
            { title: "Bonuses ranked by value", desc: "Stacks OS prioritizes the highest-value bank bonuses available. Recommendations are based on profitability and requirements — not affiliate payouts.", pro: true },
          ] as { title: string; desc: string; pro?: boolean }[]).map((f, i) => (
            <div key={i} style={{ background: "#161922", borderRadius: 12, padding: "24px", border: "1px solid #23262e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{f.title}</span>
                {f.pro && <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(13,150,104,0.16)", padding: "2px 7px", borderRadius: 99, letterSpacing: "0.04em", textTransform: "uppercase" }}>Pro</span>}
              </div>
              <div style={{ fontSize: 13, color: "#9aa1ad", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW YOUR PLAN IS BUILT ── */}
      <section className="lp-section" style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          How your bonus plan is built
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 0 36px" }}>Every recommendation is calculated — not curated.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Profitability", desc: "Bonuses are ranked by net payout after deposit requirements, holding periods, and fees. The highest-value opportunities come first." },
            { label: "Eligibility", desc: "Each bonus is matched to your paycheck amount and frequency. Offers you can't qualify for don't show up in your plan." },
            { label: "Sequencing", desc: "Cooldown periods are factored in so your next bonus is always ready to start when the current one finishes." },
          ].map((item, i) => (
            <div key={i} style={{ background: "#161922", border: "1px solid #23262e", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(13,150,104,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#34d399" }}>{i + 1}</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "#9aa1ad", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SIGNUP ── */}
      <section id="signup" className="lp-section" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          background: "#161922", borderRadius: 16, padding: "40px 36px",
          border: "1px solid #23262e", boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
        }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Sign up free. Start tracking bonuses in 30 seconds.
          </h3>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px", lineHeight: 1.5 }}>
            No credit card. Upgrade to Pro anytime for the personalized checking, savings, and card queues.
          </p>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" name="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@email.com" required value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" name="new-password" autoComplete="new-password" placeholder="••••••••" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: "#f87171", background: "rgba(220,38,38,0.12)", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 12px" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
              background: "#0d9668", color: "#fff", border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 2,
            }}>
              {loading ? "Creating account…" : "Start tracking free →"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid #23262e", marginTop: 16, paddingTop: 16, textAlign: "center" as const }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </span>
          </div>
        </div>
      </section>

      {/* ── DEMO VIDEO ── */}
      <section className="lp-section" style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          See it in action
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 28px" }}>A 90-second look at how Stacks OS works.</p>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <iframe
            src="https://www.youtube.com/embed/lVsb8fMmuDc"
            title="Stacks OS — 90-second overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
        <p style={{ fontSize: 14, margin: "16px 0 0" }}>
          <a href="https://youtu.be/vJcZPt2KWY8" target="_blank" rel="noopener noreferrer" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            Want the full tour? Watch the complete walkthrough →
          </a>
        </p>
      </section>

      {/* ── SCREENSHOTS: checking + savings ── */}
      <section className="lp-section" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Not just checking — savings too
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 auto 36px", maxWidth: 620, lineHeight: 1.6 }}>
          The catalog and sequencers cover checking, savings, and brokerage bonuses — ranked by
          what actually pays you most, for your state and your cash.
        </p>
        <div className="lp-compare" style={{ gap: 24 }}>
          <figure style={{ margin: 0 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #23262e", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              <Image
                src="/demo-checking-bonuses.jpg"
                width={1650}
                height={1080}
                alt="Stacks OS catalog showing checking bonuses available in Georgia, each with its direct-deposit requirement"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <figcaption style={{ fontSize: 13, color: "#9aa1ad", textAlign: "center", marginTop: 12 }}>
              <strong style={{ color: "#ffffff" }}>Checking bonuses</strong> for your state — every requirement spelled out
            </figcaption>
          </figure>
          <figure style={{ margin: 0 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #23262e", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              <Image
                src="/demo-savings-bonuses.jpg"
                width={1650}
                height={1080}
                alt="Stacks OS savings sequencer showing savings and brokerage bonuses ranked by effective APY with a 12-month projected total"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <figcaption style={{ fontSize: 13, color: "#9aa1ad", textAlign: "center", marginTop: 12 }}>
              <strong style={{ color: "#ffffff" }}>Savings &amp; brokerage bonuses</strong> ranked by effective APY
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-faq" style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 40px" }}>Common questions</h2>
        {[
          { q: "Is this legal?", a: "Yes. Bank bonuses are promotional offers banks use to attract new customers. They want you to sign up." },
          { q: "Do I need extra money?", a: "Not usually. In many cases, your deposit only needs to pass through the account. You can often transfer the money back to your main bank after it arrives, as long as the bank requirements are met." },
          { q: "Will this affect my credit score?", a: "Most checking account bonuses don't require a hard credit pull. We flag the ones that do so you can decide." },
          { q: "Will opening these accounts hurt my credit?", a: "Most bank bonuses involve opening checking or savings accounts and do not affect your credit score. Some banks may check your banking history through ChexSystems instead." },
          { q: "How much time does this take?", a: "Opening an account takes 10–15 minutes. After that, you're just checking off steps as they happen. The system tells you when to act." },
          { q: "What if a bonus offer changes?", a: "Stacks OS aggregates publicly available information. We recommend verifying terms with the bank before applying. Offers can change at any time." },
          { q: "Do taxes or fees reduce these bonuses?", a: "Most bank bonuses are treated as taxable income and may be reported on a 1099-INT or 1099-MISC by the bank. Some accounts may also have monthly fees if requirements are not met. Stacks OS highlights common fee-avoidance options for each bonus and helps you track the requirements needed to earn the reward. Always verify the terms directly with the bank before opening an account." },
        ].map((faq, i) => (
          <div key={i} style={{ borderBottom: "1px solid #23262e", padding: "20px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 6 }}>{faq.q}</div>
            <div style={{ fontSize: 14, color: "#9aa1ad", lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </section>

      {/* ── WHY PEOPLE STOP ── */}
      <section className="lp-section" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Why most people stop after 1–2 bank bonuses
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 0 40px" }}>The bonuses are real. The tracking becomes the problem.</p>
        <div className="lp-compare" style={{ gap: 20 }}>
          <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid #7f1d1d", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Tracking in a spreadsheet</div>
            {[
              "Checking blogs and Reddit for new bonuses",
              "Trying to remember deposit requirements and deadlines",
              "Losing track of which account is next",
              "Forgetting when bonuses post",
              "Running out of bonuses to do",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#f87171", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✕</span>
                <span style={{ fontSize: 14, color: "#cdd2db", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(13,150,104,0.12)", border: "1px solid rgba(13,150,104,0.5)", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Stacks OS — free</div>
            {[
              "Full researched catalog with every requirement",
              "Clear checklist for every bonus",
              "Dashboard shows what's in progress and cooling down",
              "Track deposits and deadlines automatically",
              "Cooldown countdowns show when you're eligible again",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#34d399", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 14, color: "#cdd2db", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXAMPLE ROADMAP ── */}
      <section className="lp-section" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Example bonus roadmap
        </h2>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 36px" }}>A typical sequence for someone with a $1,500 biweekly paycheck.</p>
        <div style={{ background: "#161922", border: "1px solid #23262e", borderRadius: 14, overflow: "hidden" }}>
          {[
            { bank: "Chase", amount: "$400" },
            { bank: "Wells Fargo", amount: "$400" },
            { bank: "U.S. Bank", amount: "$450" },
            { bank: "Varo", amount: "$100" },
            { bank: "Affinity Federal Credit Union", amount: "$100" },
          ].map((item, i, arr) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 24px",
              borderBottom: i < arr.length - 1 ? "1px solid #23262e" : "none",
              background: i === 0 ? "rgba(13,150,104,0.12)" : "#161922",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, width: 18 }}>{i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: i === 0 ? 700 : 500, color: "#ffffff" }}>{item.bank}</span>
                {i === 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#34d399", background: "rgba(13,150,104,0.16)", padding: "2px 8px", borderRadius: 99 }}>Start here</span>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#34d399" }}>{item.amount}</span>
            </div>
          ))}
          <div style={{ padding: "16px 24px", background: "#0f1219", borderTop: "1px solid #23262e" }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>12+ bonuses available in a typical yearly plan</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Stacks OS tracks nationwide bonuses worth your time.</div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="lp-section" style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Free does the tracking. Pro does the thinking.</h2>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 32px" }}>Free replaces your bonus spreadsheet. Upgrade to Pro when you want the sequencer to rank and schedule what to do next.</p>

        <div className="lp-pricing-row">
          {/* ── FREE ── */}
          <div className="lp-pricing-card" style={{
            background: "#161922", border: "1px solid #23262e",
            borderRadius: 16, padding: "32px", textAlign: "left",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9aa1ad", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Free</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginBottom: 14 }}>Replaces your bonus spreadsheet</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#ffffff" }}>$0</span>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>No credit card required</div>

            <a href="#signup" style={{
              display: "block", width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700,
              background: "#161922", color: "#fff", border: "1px solid #2a2e38", borderRadius: 10,
              textDecoration: "none", textAlign: "center" as const, marginBottom: 22,
            }}>
              Start free →
            </a>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Full researched catalog — every requirement, fee & deadline",
                "Track any bonus you start, step-by-step",
                "Deposit + deadline reminders",
                "Cooldown countdown — when you're eligible again",
                "Lifetime earned + full history",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#cdd2db" }}>
                  <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13, marginTop: 1 }}>&#10003;</span>{f}
                </div>
              ))}
            </div>
          </div>

          {/* ── PRO ── */}
          <div className="lp-pricing-card" style={{
            background: "#161922", border: "2px solid #34d399",
            borderRadius: 16, padding: "32px", textAlign: "left",
            boxShadow: "0 8px 32px rgba(13,124,95,0.08)", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: -12, right: 20, fontSize: 11, fontWeight: 700, color: "#fff",
              background: "#0d9668", padding: "4px 10px", borderRadius: 99, letterSpacing: "0.06em",
            }}>
              RECOMMENDED
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pro</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399", marginBottom: 14 }}>The sequencer — tells you what to do next</div>

            <div style={{ display: "flex", background: "#0f1219", border: "1px solid #23262e", borderRadius: 8, padding: 3, marginBottom: 14 }}>
              <button onClick={() => setBillingCycle("monthly")} style={{
                flex: 1, padding: "6px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
                background: billingCycle === "monthly" ? "#161922" : "transparent",
                color: billingCycle === "monthly" ? "#ffffff" : "#6b7280",
                boxShadow: billingCycle === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>Monthly</button>
              <button onClick={() => setBillingCycle("annual")} style={{
                flex: 1, padding: "6px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
                background: billingCycle === "annual" ? "#161922" : "transparent",
                color: billingCycle === "annual" ? "#ffffff" : "#6b7280",
                boxShadow: billingCycle === "annual" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>Annual <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>Save 18%</span></button>
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#ffffff" }}>${billingCycle === "monthly" ? "10" : "99"}</span>
              <span style={{ fontSize: 16, color: "#6b7280" }}>/{billingCycle === "monthly" ? "mo" : "yr"}</span>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              {billingCycle === "annual" ? "$8.25/mo billed annually" : "Cancel anytime"}
            </div>

            <a href="#signup" style={{
              display: "block", width: "100%", padding: "12px 16px", fontSize: 14, fontWeight: 700,
              background: "#0d9668", color: "#fff", border: "none", borderRadius: 10,
              textDecoration: "none", textAlign: "center" as const, marginBottom: 22,
            }}>
              Start with Pro →
            </a>

            <div style={{ fontSize: 12, fontWeight: 600, color: "#9aa1ad", marginBottom: 10 }}>Everything in Free, plus:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Paycheck queue — checking bonuses ranked by net payout",
                "Savings sequencer — HYSA & savings bonuses ranked by APY",
                "Spending sequencer (Beta) — credit-card bonuses ranked by net value",
                "Auto-sequencing with cooldown + eligibility logic",
                "12-month earnings projection",
                "Tax summary tools",
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#cdd2db" }}>
                  <span style={{ color: "#34d399", fontWeight: 700, fontSize: 13, marginTop: 1 }}>&#10003;</span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-section" style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em", margin: "0 0 12px" }}>Your first bonus is waiting</h2>
        <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 28px" }}>Sign up free in 30 seconds. No credit card.</p>
        <a href="#signup" style={{
          fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d9668",
          padding: "16px 40px", borderRadius: 10, textDecoration: "none", display: "inline-block",
          boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
        }}>
          Start free →
        </a>
      </section>

      {/* ── DISCLAIMER ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 24px" }}>
        <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
          Bonus offers, requirements, and fees are determined by each financial institution and may change at any time. Always verify the current terms directly with the bank before applying.
        </p>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" style={{ maxWidth: 1100, margin: "0 auto", borderTop: "1px solid #23262e" }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>&copy; {new Date().getFullYear()} Stacks OS</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/terms" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#cdd2db", display: "block", marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  border: "1px solid #2a2e38", borderRadius: 8,
  background: "#161922", color: "#ffffff", boxSizing: "border-box" as const, outline: "none",
}
