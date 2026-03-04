"use client"

import React, { useState } from "react"
import Link from "next/link"
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

      {/* ── NAV ── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 40px", maxWidth: 1100, margin: "0 auto",
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em" }}>Stacks OS</span>
        <Link href="/login" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>Log in</Link>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1100, margin: "0 auto", padding: "80px 40px 60px",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      }}>
        <div style={{
          display: "inline-block", fontSize: 12, fontWeight: 600, color: "#0d7c5f",
          background: "#e6f5f0", padding: "6px 14px", borderRadius: 99, marginBottom: 24,
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          The bank bonus system
        </div>
        <h1 style={{
          fontSize: 56, fontWeight: 800, color: "#111", lineHeight: 1.1,
          letterSpacing: "-0.03em", margin: "0 0 20px", maxWidth: 700,
        }}>
          Turn your paycheck into
          <br />
          <span style={{ color: "#0d7c5f" }}>$2,000+ per year</span>
        </h1>
        <p style={{ fontSize: 19, color: "#777", lineHeight: 1.6, margin: "0 0 40px", maxWidth: 520 }}>
          Banks pay you to switch your direct deposit. Stacks OS tells you exactly where to send it next, when to move it, and how much you'll earn.
        </p>
        <div style={{ display: "flex", gap: 14, marginBottom: 48 }}>
          <a href="#signup" style={{
            fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
            padding: "16px 36px", borderRadius: 10, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
          }}>See how much you can earn</a>
          <a href="#how-it-works" style={{
            fontSize: 16, fontWeight: 500, color: "#666",
            padding: "16px 28px", borderRadius: 10, textDecoration: "none",
            border: "1px solid #ddd",
          }}>See how it works</a>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 48 }}>
          {[
            { value: "$3,000+", label: "potential first year" },
            { value: "15 min", label: "setup time" },
            { value: "Low effort", label: "uses your existing paycheck" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Three steps. Repeat.
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 48px" }}>No gimmicks. Just a system.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { step: "01", title: "Open the account", desc: "We match you with the highest-value bonus based on your paycheck. Click the link, open the account in minutes." },
            { step: "02", title: "Route your deposit", desc: "Point your direct deposit to the new account. Meet the deposit requirement with your regular paycheck — no extra money needed." },
            { step: "03", title: "Collect and repeat", desc: "Once a bonus posts, move on to the next opportunity. You can also run multiple bonuses at once if you want to accelerate your earnings." },
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
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 48px" }}>
          Everything you need to stack bonuses
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[
            { title: "Personalized bonus queue", desc: "Ranked by your paycheck amount, pay frequency, and eligibility. Always know what's next." },
            { title: "Step-by-step checklists", desc: "Each bonus is a simple checklist. Check off steps as you go. No guesswork." },
            { title: "Deposit tracking", desc: "Log your deposits and see exactly how much you've contributed toward each requirement." },
            { title: "12-month projection", desc: "See how much you'll earn this year if you follow the plan. Updated as you complete bonuses." },
            { title: "Cooldown tracking", desc: "We remember when you earned each bonus so you know exactly when you're eligible again." },
            { title: "Open accounts tracker", desc: "See every account you currently have open, what's pending, and when you can close safely." },
          ].map((f, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "24px", border: "1px solid #e8e8e8" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING + SIGNUP ── */}
      <section id="signup" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Your first bonus covers the cost
        </h2>
        <p style={{ fontSize: 15, color: "#999", textAlign: "center", margin: "0 0 48px" }}>
          Your first bonus often earns $300–$400, easily covering the subscription.
        </p>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start", justifyContent: "center" }}>
          {/* Pricing card */}
          <div style={{
            width: 340, background: "#fff", border: "2px solid #0d7c5f",
            borderRadius: 16, padding: "32px", textAlign: "center",
            boxShadow: "0 8px 32px rgba(13,124,95,0.08)", flexShrink: 0,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Stacks OS</div>

            {/* Toggle */}
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

          {/* Signup form */}
          <div style={{
            width: 380, background: "#fff", borderRadius: 16, padding: "32px",
            border: "1px solid #e8e8e8", boxShadow: "0 8px 32px rgba(0,0,0,0.04)", flexShrink: 0,
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Create your account
            </h3>
            <p style={{ fontSize: 14, color: "#999", margin: "0 0 24px" }}>
              See exactly how much you can earn with your paycheck — before you pay a cent.
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
                {loading ? "Creating account…" : "Create Account & Continue →"}
              </button>
            </form>

            <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" as const, margin: "12px 0 0" }}>
              You'll see your personalized earnings plan before you pay.
            </div>
            <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 16, paddingTop: 16, textAlign: "center" as const }}>
              <span style={{ fontSize: 13, color: "#999" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "60px 40px" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", textAlign: "center", letterSpacing: "-0.02em", margin: "0 0 40px" }}>Common questions</h2>
        {[
          { q: "Is this legal?", a: "Yes. Bank bonuses are promotional offers banks use to attract new customers. They want you to sign up." },
          { q: "Do I need extra money?", a: "Not usually. Most bonuses only require that a deposit pass through the account. In many cases you can transfer the money back to your main bank after it arrives, as long as the bank's requirements are met." },
          { q: "Will this affect my credit score?", a: "Most checking account bonuses don't require a hard credit pull. We flag the ones that do so you can decide." },
          { q: "Will opening these accounts hurt my credit?", a: "Most bank bonuses involve opening checking or savings accounts and do not affect your credit score. Some banks may check your banking history through ChexSystems instead." },
          { q: "How much time does this take?", a: "Opening an account takes 10–15 minutes. After that, you're just checking off steps as they happen. The system tells you when to act." },
          { q: "What if a bonus offer changes?", a: "Stacks OS aggregates publicly available information. We recommend verifying terms with the bank before applying. Offers can change at any time." },
        ].map((faq, i) => (
          <div key={i} style={{ borderBottom: "1px solid #eee", padding: "20px 0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 6 }}>{faq.q}</div>
            <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 40px 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 12px" }}>Your first bonus is waiting</h2>
        <p style={{ fontSize: 15, color: "#999", margin: "0 0 28px" }}>Set up in minutes. Start earning this week.</p>
        <a href="#signup" style={{
          fontSize: 16, fontWeight: 700, color: "#fff", background: "#0d7c5f",
          padding: "16px 40px", borderRadius: 10, textDecoration: "none", display: "inline-block",
          boxShadow: "0 4px 16px rgba(13,124,95,0.2)",
        }}>
          Get started — ${billingCycle === "monthly" ? "5/mo" : "50/yr"}
        </a>
      </section>

      {/* ── DISCLAIMER ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px 24px" }}>
        <p style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
          Bonus offers, requirements, and fees are determined by each financial institution and may change at any time. Always verify the current terms directly with the bank before applying.
        </p>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        maxWidth: 1100, margin: "0 auto", padding: "40px 40px 32px",
        borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
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
