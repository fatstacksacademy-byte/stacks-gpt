"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const checkoutSuccess = searchParams.get("checkout") === "success"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [mode, setMode] = useState<"signin" | "forgot">("signin")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setIsError(false)

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://www.fatstacksacademy.com/reset-password",
      })
      setLoading(false)
      if (error) { setIsError(true); setMessage(error.message) }
      else setMessage("Check your email for a password reset link.")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setIsError(true); setMessage(error.message) }
    else { router.push("/roadmap"); router.refresh() }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa", display: "flex",
      fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        .login-left { display: flex; }
        .login-right { width: 480px; padding: 40px 56px; }
        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { width: 100%; padding: 40px 24px; border-left: none !important; }
        }
      `}</style>
      {/* Left — value prop */}
      <div className="login-left" style={{
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

      {/* Right — sign in form */}
      <div className="login-right" style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff", borderLeft: "1px solid #e8e8e8",
      }}>
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>
              {mode === "signin" ? "Welcome back" : "Reset your password"}
            </h2>
            <p style={{ fontSize: 14, color: "#999", margin: 0 }}>
              {mode === "signin" ? "Sign in to continue to your dashboard" : "We'll send you a reset link"}
            </p>
            {checkoutSuccess && mode === "signin" && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0faf5", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#0d7c5f", fontWeight: 600 }}>
                Payment received! Sign in to access your bonus plan.
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@email.com" required value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>

            {mode === "signin" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={labelStyle}>Password</label>
                  <button type="button" onClick={() => { setMode("forgot"); setMessage("") }}
                    style={{ fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Forgot password?
                  </button>
                </div>
                <input type="password" placeholder="••••••••" required minLength={6} value={password}
                  onChange={e => setPassword(e.target.value)} style={inputStyle} />
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px", fontSize: 15, fontWeight: 700,
              background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4,
            }}>
              {loading ? "…" : mode === "signin" ? "Sign In" : "Send Reset Link"}
            </button>
          </div>

          {message && (
            <p style={{ fontSize: 13, marginTop: 12, color: isError ? "#dc2626" : "#0d7c5f" }}>{message}</p>
          )}

          <div style={{ borderTop: "1px solid #f0f0f0", marginTop: 20, paddingTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#999", margin: 0 }}>
              {mode === "forgot" ? (
                <>Remember it? <button type="button" onClick={() => { setMode("signin"); setMessage("") }} style={linkBtn}>Sign in</button></>
              ) : (
                <>Don&apos;t have an account? <Link href="/" style={linkBtn}>Sign up</Link></>
              )}
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
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#0d7c5f", fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontSize: 13 }
