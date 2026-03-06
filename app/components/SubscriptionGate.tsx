"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

type Props = {
  children: React.ReactNode
  isSubscribed: boolean
}

export default function SubscriptionGate({ children, isSubscribed }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [pollGaveUp, setPollGaveUp] = useState(false)

  const checkoutSuccess = searchParams.get("checkout") === "success"

  // If coming back from Stripe with success, poll until subscription is active
  useEffect(() => {
    if (!checkoutSuccess || isSubscribed) return
    setPolling(true)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      router.refresh()
      if (attempts >= 10) {
        clearInterval(interval)
        setPolling(false)
        setPollGaveUp(true)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [checkoutSuccess])

  // Stop polling once subscribed
  useEffect(() => {
    if (isSubscribed && checkoutSuccess) {
      setPolling(false)
      router.replace("/roadmap")
    }
  }, [isSubscribed, checkoutSuccess])

  // Auto-trigger checkout if ?plan= param is present
  useEffect(() => {
    if (isSubscribed) return
    const plan = searchParams.get("plan") as "monthly" | "annual" | null
    if (plan === "monthly" || plan === "annual") {
      handleCheckout(plan)
    }
  }, [isSubscribed, searchParams])

  if (isSubscribed) return <>{children}</>

  // Show loading spinner while waiting for webhook after payment
  if ((checkoutSuccess && !pollGaveUp) || polling) {
    return (
      <div style={{
        minHeight: "100vh", background: "#fafafa",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 32, fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111", letterSpacing: "-0.02em", marginBottom: 32 }}>Stacks OS</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>Setting up your account…</div>
          <div style={{ fontSize: 14, color: "#999" }}>This only takes a moment.</div>
        </div>
      </div>
    )
  }

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
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>Taking you to checkout…</div>
            <div style={{ fontSize: 14, color: "#999" }}>You'll be redirected to Stripe in a moment.</div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, margin: "0 0 12px", letterSpacing: "-0.02em" }}>
              Unlock your bonus plan
            </h1>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.5, margin: "0 0 8px" }}>
              Your first bonus typically earns $300–$400. Stacks costs $50/year.
            </p>
            <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5, margin: "0 0 28px" }}>
              Your plan updates as banks change their promotions.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <button onClick={() => handleCheckout("annual")} disabled={loading !== null} style={{
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

              <button onClick={() => handleCheckout("monthly")} disabled={loading !== null} style={{
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
              Cancel anytime.
            </p>
            <Link href="/" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>← Back to home</Link>
          </>
        )}
      </div>
    </div>
  )
}
