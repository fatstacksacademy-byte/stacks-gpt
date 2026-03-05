"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LandingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setLoggedInEmail(data.user.email)
    })
  }, [])

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
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
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
        .lp-nav-email { font-size: 13px; color: #999; }
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
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" }}>Stacks OS</span>
        {loggedInEmail ? (
          <div className="lp-nav-user">
            <span className="lp-nav-email">{loggedInEmail}</span>
            <Link href="/roadmap" style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f", textDecoration: "none" }}>Go to app →</Link>
          </div>
        ) : (
          <Link href="/login" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>Log in</Link>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div style={{
              display: "inline-block", fontSize: 12, fontWeight: 600, color: "#0d7c5f",
              background: "#e6f5f0", padding: "6px 14px", borderRadius: 99, marginBottom: 24,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              The bank bonus system
            </div>
            <h1 style={{ fontWeight: 800, color: "#111", lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
              Turn your paycheck into
              <br />
              <span style={{ color: "#0d7c5f" }}>$3,000+ per year</span>
              <br />
              <span style={{ fontSize: "0.6em", color: "#aaa", fontWeight: 600, letterSpacing: "-0.01em" }}>with bank bonus routing</span>
            </h1>
            <p style={{ color: "#777", lineHeight: 1.6, margin: "0 0 12px", maxWidth: 480 }}>
              Banks pay cash bonuses when you switch your direct deposit.
              <br />
              Stacks OS shows you which bonuses to do next and tracks your progress.
            </p>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6, margin: "0 0 32px", maxWidth: 480 }}>
              Banks frequently offer $300–$500 bonuses for new checking accounts.
            </p>
            <div className="lp-cta-buttons">
              <a href="#signup" style={{
                fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
                padding: "16px 36px", borderRadius: 10, textDecoration: "none",
                boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
              }}>Show my projection →</a>
              <a href="#how-it-works" style={{
                fontSize: 16, fontWeight: 500, color: "#666",
                padding: "16px 28px", borderRadius: 10, textDecoration: "none",
                border: "1px solid #ddd",
              }}>See how it works</a>
            </div>
            <div className="lp-stats">
              {[
                { value: "$3,000+", label: "potential first year" },
                { value: "15 min", label: "to get started" },
                { value: "Low effort", label: "uses your existing paycheck" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{s.label}</div>
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

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Three steps. Repeat.
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 48px" }}>No gimmicks. Just a system.</p>
        <div className="lp-grid-3">
          {[
            { step: "01", title: "Open the account", desc: "Stacks shows you the best bonus for your paycheck. Click the link and open the account — takes about 10 minutes." },
            { step: "02", title: "Route your direct deposit", desc: "Update your direct deposit to the new account. Your regular paycheck handles the requirement — no extra money needed." },
            { step: "03", title: "Collect your bonus. Repeat.", desc: "Once a bonus posts, move to the next bank. Stacks tracks your progress and keeps the queue updated." },
          ].map((item, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "32px 28px", border: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#e0e0e0", marginBottom: 16 }}>{item.step}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 10 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="lp-section" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Everything handled in one place
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 48px" }}>No spreadsheets. No blog tabs. No forgetting deadlines.</p>
        <div className="lp-grid-2">
          {[
            { title: "Bonus research done for you", desc: "Bank promotions change constantly. Stacks keeps track of current offers so you don't have to check blogs and forums." },
            { title: "Never miss a requirement", desc: "Track deposit amounts and deadlines so bonuses don't slip through the cracks." },
            { title: "Step-by-step checklist for every bonus", desc: "Each bonus is broken into simple steps. Check them off as you go. Always know what to do next." },
            { title: "Know which bonus to do next", desc: "Stacks builds a personalized sequence based on your paycheck. No guessing which bank to try." },
            { title: "One dashboard for everything", desc: "See what's in progress, what's next, and what's cooling down — all in one place." },
            { title: "12-month earnings projection", desc: "See your projected bonus earnings before you even start. Updated as you complete bonuses." },
            { title: "Bonuses ranked by value", desc: "Stacks OS prioritizes the highest-value bank bonuses available. Recommendations are based on profitability and requirements — not affiliate payouts." },
          ].map((f, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "24px", border: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW YOUR PLAN IS BUILT ── */}
      <section className="lp-section" style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          How your bonus plan is built
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 36px" }}>Every recommendation is calculated — not curated.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Profitability", desc: "Bonuses are ranked by net payout after deposit requirements, holding periods, and fees. The highest-value opportunities come first." },
            { label: "Eligibility", desc: "Each bonus is matched to your paycheck amount and frequency. Offers you can't qualify for don't show up in your plan." },
            { label: "Sequencing", desc: "Cooldown periods and ChexSystems considerations are factored in so your next bonus is always ready to start when the current one finishes." },
          ].map((item, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e6f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0d7c5f" }}>{i + 1}</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SIGNUP ── */}
      <section id="signup" className="lp-section" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: "40px 36px",
          border: "1px solid #e8e8e8", boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
        }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            See your projected bonus earnings for the next 12 months.
          </h3>
          <p style={{ fontSize: 14, color: "#999", margin: "0 0 24px", lineHeight: 1.5 }}>
            Free preview. Unlock the full bonus plan anytime.
          </p>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@email.com" required value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" placeholder="••••••••" required minLength={6} value={password}
                onChange={e => setPassword(e.target.value)} style={inputStyle} />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: "#dc2626", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
              background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 2,
            }}>
              {loading ? "Creating account…" : "Show my projection →"}
            </button>
          </form>

          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 16, paddingTop: 16, textAlign: "center" as const }}>
            <span style={{ fontSize: 13, color: "#999" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-faq" style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 40px" }}>Common questions</h2>
        {[
          { q: "Is this legal?", a: "Yes. Bank bonuses are promotional offers banks use to attract new customers. They want you to sign up." },
          { q: "Do I need extra money?", a: "Not usually. In many cases, your deposit only needs to pass through the account. You can often transfer the money back to your main bank after it arrives, as long as the bank requirements are met." },
          { q: "Will this affect my credit score?", a: "Most checking account bonuses don't require a hard credit pull. We flag the ones that do so you can decide." },
          { q: "Will opening these accounts hurt my credit?", a: "Most bank bonuses involve opening checking or savings accounts and do not affect your credit score. Some banks may check your banking history through ChexSystems instead." },
          { q: "How much time does this take?", a: "Opening an account takes 10–15 minutes. After that, you're just checking off steps as they happen. The system tells you when to act." },
          { q: "What if a bonus offer changes?", a: "Stacks OS aggregates publicly available information. We recommend verifying terms with the bank before applying. Offers can change at any time." },
          { q: "Do taxes or fees reduce these bonuses?", a: "Most bank bonuses are treated as taxable income and may be reported on a 1099-INT or 1099-MISC by the bank. Some accounts may also have monthly fees if requirements are not met. Stacks OS highlights common fee-avoidance options for each bonus and helps you track the requirements needed to earn the reward. Always verify the terms directly with the bank before opening an account." },
        ].map((faq, i) => (
          <div key={i} style={{ borderBottom: "1px solid #eee", padding: "20px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{faq.q}</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </section>

      {/* ── WHY PEOPLE STOP ── */}
      <section className="lp-section" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Why most people stop after 1–2 bank bonuses
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 40px" }}>The bonuses are real. The tracking becomes the problem.</p>
        <div className="lp-compare" style={{ gap: 20 }}>
          <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Doing it manually</div>
            {[
              "Checking blogs and Reddit for new bonuses",
              "Trying to remember deposit requirements and deadlines",
              "Losing track of which account is next",
              "Forgetting when bonuses post",
              "Running out of bonuses to do",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#dc2626", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✕</span>
                <span style={{ fontSize: 14, color: "#555", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 14, padding: "28px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Using Stacks OS</div>
            {[
              "Current bonuses organized in one place",
              "Clear checklist for every bonus",
              "Dashboard shows what's in progress and what's next",
              "Track deposits and deadlines automatically",
              "A personalized roadmap that keeps bonuses going",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#0d7c5f", fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 14, color: "#555", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXAMPLE ROADMAP ── */}
      <section className="lp-section" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Example bonus roadmap
        </h2>
        <p style={{ fontSize: 15, color: "#999", margin: "0 0 36px" }}>A typical sequence for someone with a $1,500 biweekly paycheck.</p>
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, overflow: "hidden" }}>
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
              borderBottom: i < arr.length - 1 ? "1px solid #f0f0f0" : "none",
              background: i === 0 ? "#f0faf5" : "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#bbb", fontWeight: 700, width: 18 }}>{i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: i === 0 ? 700 : 500, color: "#111" }}>{item.bank}</span>
                {i === 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#0d7c5f", background: "#e6f5f0", padding: "2px 8px", borderRadius: 99 }}>Start here</span>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0d7c5f" }}>{item.amount}</span>
            </div>
          ))}
          <div style={{ padding: "16px 24px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 2 }}>12+ bonuses available in a typical yearly plan</div>
            <div style={{ fontSize: 12, color: "#bbb" }}>Stacks OS tracks nationwide bonuses worth your time.</div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="lp-section" style={{ maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Pricing</h2>
        <p style={{ fontSize: 15, color: "#999", margin: "0 0 32px" }}>Most first bonuses are $300–$400.</p>

        <div style={{
          background: "#fff", border: "2px solid #0d7c5f",
          borderRadius: 16, padding: "32px",
          boxShadow: "0 8px 32px rgba(13,124,95,0.08)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Stacks OS</div>

          <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3, marginBottom: 20 }}>
            <button onClick={() => setBillingCycle("monthly")} style={{
              flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
              background: billingCycle === "monthly" ? "#fff" : "transparent",
              color: billingCycle === "monthly" ? "#111" : "#999",
              boxShadow: billingCycle === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>Monthly</button>
            <button onClick={() => setBillingCycle("annual")} style={{
              flex: 1, padding: "8px 10px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
              background: billingCycle === "annual" ? "#fff" : "transparent",
              color: billingCycle === "annual" ? "#111" : "#999",
              boxShadow: billingCycle === "annual" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>Annual <span style={{ fontSize: 10, color: "#0d7c5f", fontWeight: 700 }}>Save 17%</span></button>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#111" }}>${billingCycle === "monthly" ? "5" : "50"}</span>
            <span style={{ fontSize: 16, color: "#999" }}>/{billingCycle === "monthly" ? "mo" : "yr"}</span>
          </div>
          {billingCycle === "annual"
            ? <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>$4.17/mo billed annually</div>
            : <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Cancel anytime</div>}

          <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {["Personalized bonus queue", "Step-by-step checklists", "Deposit tracking", "12-month earnings projection", "Cooldown + eligibility tracking", "Bonus details + requirements"].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#555" }}>
                <span style={{ color: "#0d7c5f", fontWeight: 700, fontSize: 13 }}>&#10003;</span>{f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-section" style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 12px" }}>Your first bonus is waiting</h2>
        <p style={{ fontSize: 15, color: "#999", margin: "0 0 28px" }}>Set up in minutes. Start earning this week.</p>
        <a href="#signup" style={{
          fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
          padding: "16px 40px", borderRadius: 10, textDecoration: "none", display: "inline-block",
          boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
        }}>
          See my projected earnings →
        </a>
      </section>

      {/* ── DISCLAIMER ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 24px" }}>
        <p style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
          Bonus offers, requirements, and fees are determined by each financial institution and may change at any time. Always verify the current terms directly with the bank before applying.
        </p>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" style={{ maxWidth: 1100, margin: "0 auto", borderTop: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: 13, color: "#bbb" }}>&copy; {new Date().getFullYear()} Stacks OS</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/terms" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Terms</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#333", display: "block", marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 8,
  background: "#fff", color: "#111", boxSizing: "border-box" as const, outline: "none",
}
