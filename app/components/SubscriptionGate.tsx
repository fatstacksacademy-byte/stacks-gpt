"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"

type Props = {
  children: React.ReactNode
  isSubscribed: boolean
}

export default function SubscriptionGate({ children, isSubscribed }: Props) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null)
  const [error, setError] = useState<string | null>(null)

  // If user came from landing page with a plan selected, auto-trigger checkout
  useEffect(() => {
    if (isSubscribed) return
    const preferred = sessionStorage.getItem("preferred_plan") as "monthly" | "annual" | null
    if (preferred) {
      sessionStorage.removeItem("preferred_plan")
      handleCheckout(preferred)
    }
  }, [isSubscribed])

  if (isSubscribed) return <>{children}</>

  async function handleCheckout(plan: "monthly" | "annual") {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? "Something went wrong. Please try again.")
        setLoading(null)
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 32, fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em", marginBottom: 32 }}>Stacks OS</div>

        {loading ? (
          // Auto-redirecting state — shown when coming from landing page
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>Taking you to checkout…</div>
            <div style={{ fontSize: 14, color: "#999" }}>You'll be redirected to Stripe in a moment.</div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Subscribe to start earning
            </h1>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.5, margin: "0 0 32px" }}>
              Get access to your personalized bonus queue, step-by-step checklists, and earnings projections.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {/* Annual */}
              <button onClick={() => handleCheckout("annual")} disabled={loading !== null}
                style={{
                  padding: "18px 24px", borderRadius: 12, border: "2px solid #0d7c5f", background: "#fff",
                  cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Annual</div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>$4.17/mo · billed $50/year</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", padding: "3px 8px", borderRadius: 4 }}>SAVE 17%</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>$50</span>
                </div>
              </button>

              {/* Monthly */}
              <button onClick={() => handleCheckout("monthly")} disabled={loading !== null}
                style={{
                  padding: "18px 24px", borderRadius: 12, border: "1px solid #e0e0e0", background: "#fff",
                  cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Monthly</div>
                  <div style={{ fontSize: 13, color: "#999", marginTop: 2 }}>Cancel anytime</div>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>
                  $5<span style={{ fontSize: 13, fontWeight: 400, color: "#999" }}>/mo</span>
                </span>
              </button>
            </div>

            {error && (
              <div style={{
                background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8,
                padding: "12px 16px", marginBottom: 16,
                fontSize: 13, color: "#dc2626", lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <p style={{ fontSize: 12, color: "#bbb", lineHeight: 1.5, margin: "0 0 16px" }}>
              Most bonuses are $200–$500. The subscription pays for itself with your first bonus.
            </p>

            <Link href="/" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
              ← Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
