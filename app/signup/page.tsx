"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  )
}

function SignupInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = (searchParams.get("plan") ?? "annual") as "monthly" | "annual"

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { router.push("/stacksos"); router.refresh() }
    })
  }, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setLoading(false); setError(signUpError.message); return }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) { setError("Account created! Please sign in."); return }
    router.push(`/onboarding?plan=${plan}`)
    router.refresh()
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa", display: "flex",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        .signup-left { display: flex; }
        .signup-right { width: 480px; padding: 40px 56px; }
        @media (max-width: 768px) {
          .signup-left { display: none; }
          .signup-right { width: 100%; padding: 40px 24px; border-left: none !important; }
        }
      `}</style>

      {/* Left — value prop */}
      <div className="signup-left" style={{
        flex: 1, background: "linear-gradient(135deg, #0d7c5f 0%, #065f46 100%)",
        flexDirection: "column", justifyContent: "center",
        padding: "60px 56px", color: "#fff", minHeight: "100vh",
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.7, marginBottom: 20 }}>Stacks OS</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            Earn thousands from bank bonuses — automatically.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, opacity: 0.85, margin: "0 0 40px" }}>
            Banks pay you $100–$500 just for opening an account and setting up direct deposit. We tell you exactly which bonuses to sign up for, in what order, to maximize your earnings.
          </p>
          <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Most users earn</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>$2,000 – $4,000</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>in their first 12 months</div>
          </div>
        </div>
      </div>

      {/* Right — sign up form */}
      <div className="signup-right" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff", borderLeft: "1px solid #e8e8e8",
      }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>Create your account</h2>
            <p style={{ fontSize: 14, color: "#999", margin: 0 }}>Free to start. No credit card required.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px", fontSize: 15, fontWeight: 700,
              background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4,
            }}>
              {loading ? "Creating account…" : "Start tracking free →"}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: 13, marginTop: 12, color: "#dc2626" }}>{error}</p>
          )}

          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
              Already have an account? <Link href="/login" style={linkBtn}>Sign in</Link>
            </p>
          </div>
        </form>
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
const linkBtn: React.CSSProperties = { color: "#0d7c5f", fontWeight: 600, textDecoration: "underline", fontSize: 13 }
