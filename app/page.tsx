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
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError("Account created! Please sign in.")
      return
    }
    router.push(`/onboarding?plan=${billingCycle}`)
    router.refresh()
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
    }}>
      {/* ── LEFT: value prop ── */}
      <div style={{
        flex: 1, background: "linear-gradient(135deg, #0d7c5f 0%, #065f46 100%)",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px", color: "#fff", minHeight: "100vh",
      }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 20 }}>
            Stacks OS
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            Turn your paycheck into{" "}
            <span style={{ opacity: 0.9 }}>$2,000+ per year</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, opacity: 0.85, margin: "0 0 40px" }}>
            Banks pay you $100–$500 just for switching your direct deposit. We tell you exactly which ones to open, in what order, so you earn the most with the least effort.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 40 }}>
            {[
              { n: "01", title: "Open the right account", desc: "We rank bonuses by your paycheck size and pay frequency." },
              { n: "02", title: "Route your direct deposit", desc: "Use your regular paycheck — no extra money required." },
              { n: "03", title: "Collect and repeat", desc: "Once a bonus posts, move to the next one. Stack them up." },
            ].map(item => (
              <div key={item.n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2,
                }}>{item.n}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 32 }}>
            {[
              { value: "$3,000+", label: "potential first year" },
              { value: "15 min", label: "to set up" },
              { value: "$5/mo", label: "to access" },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: signup form ── */}
      <div style={{
        width: 500, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "48px 56px", background: "#fff", borderLeft: "1px solid #e8e8e8",
      }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Create your account
          </h2>
          <p style={{ fontSize: 14, color: "#999", margin: 0 }}>
            See your personalized bonus plan in 2 minutes.
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: 8, padding: 3, marginBottom: 20 }}>
          <button onClick={() => setBillingCycle("annual")} style={{
            flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
            border: "none", cursor: "pointer",
            background: billingCycle === "annual" ? "#fff" : "transparent",
            color: billingCycle === "annual" ? "#111" : "#999",
            boxShadow: billingCycle === "annual" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>
            Annual · $50/yr
            <span style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700, marginLeft: 6 }}>Save 17%</span>
          </button>
          <button onClick={() => setBillingCycle("monthly")} style={{
            flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: 6,
            border: "none", cursor: "pointer",
            background: billingCycle === "monthly" ? "#fff" : "transparent",
            color: billingCycle === "monthly" ? "#111" : "#999",
            boxShadow: billingCycle === "monthly" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>
            Monthly · $5/mo
          </button>
        </div>

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
            <div style={{ fontSize: 13, color: "#dc2626", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            marginTop: 4,
          }}>
            {loading ? "Creating account…" : "Create Account & Continue →"}
          </button>
        </form>

        <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.5, margin: "16px 0", textAlign: "center" as const }}>
          You'll see your personalized earnings plan before you pay.
        </div>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, textAlign: "center" as const }}>
          <span style={{ fontSize: 13, color: "#999" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </span>
        </div>

        {/* FAQ teaser */}
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { q: "Is this legal?", a: "Yes — these are promotional offers banks advertise publicly." },
            { q: "Do I need extra money?", a: "No. Your existing paycheck is all you need." },
            { q: "Will it hurt my credit?", a: "Most bonuses don't require a hard credit pull." },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid #f5f5f5", paddingBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 2 }}>{faq.q}</div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: "#ccc", lineHeight: 1.5, margin: "20px 0 0", textAlign: "center" as const }}>
          Bonus offers are set by each bank and may change. Always verify terms directly with the institution.
        </p>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#333", display: "block", marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14,
  border: "1px solid #e0e0e0", borderRadius: 8,
  background: "#fff", color: "#111", boxSizing: "border-box" as const, outline: "none",
}
