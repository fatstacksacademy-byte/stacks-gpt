"use client"

import { useState } from "react"
import Link from "next/link"
import { track } from "../../lib/analytics"

type Props = {
  feature: string
  description: string
  bullets: string[]
  source: string
}

export default function UpgradeUpsell({ feature, description, bullets, source }: Props) {
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout(plan: "monthly" | "annual") {
    setLoading(plan)
    setError(null)
    track("checkout_started", { plan, source })
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
      setError("Network error. Please try again.")
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)", background: "#fafafa",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 20px", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, textAlign: "center" }}>
          Stacks OS Pro
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1.2, margin: "0 0 10px", letterSpacing: "-0.02em", textAlign: "center" }}>
          {feature} is a Pro feature
        </h1>
        <p style={{ fontSize: 15, color: "#777", lineHeight: 1.5, margin: "0 0 24px", textAlign: "center" }}>
          {description}
        </p>

        <div style={{
          background: "#fff", border: "2px solid #0d7c5f", borderRadius: 14,
          padding: 28, marginBottom: 18,
          boxShadow: "0 4px 20px rgba(13,124,95,0.08)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {bullets.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "#0d7c5f", fontSize: 15, fontWeight: 700, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => handleCheckout("annual")} disabled={loading !== null} style={{
              padding: "16px 20px", borderRadius: 10, border: "2px solid #0d7c5f", background: "#0d7c5f",
              color: "#fff", cursor: loading ? "wait" : "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: 15, fontWeight: 700,
            }}>
              <span>{loading === "annual" ? "Loading…" : "Upgrade — $50/year"}</span>
              <span style={{ fontSize: 11, background: "#fff", color: "#0d7c5f", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>SAVE 17%</span>
            </button>
            <button onClick={() => handleCheckout("monthly")} disabled={loading !== null} style={{
              padding: "14px 20px", borderRadius: 10, border: "1px solid #e0e0e0", background: "#fff",
              color: "#111", cursor: loading ? "wait" : "pointer",
              fontSize: 14, fontWeight: 600,
            }}>
              {loading === "monthly" ? "Loading…" : "Or $5/month"}
            </button>
          </div>

          {error && (
            <div style={{
              background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8,
              padding: "10px 14px", marginTop: 12,
              fontSize: 13, color: "#dc2626",
            }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", margin: "14px 0 0" }}>
            Cancel anytime.
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/stacksos" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
