"use client"

import { useState } from "react"

export default function NewsletterCTA() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    window.open(`https://fatstacksacademy.beehiiv.com/subscribe?email=${encodeURIComponent(email)}`, "_blank")
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f", marginBottom: 4 }}>Check your inbox</div>
        <div style={{ fontSize: 13, color: "#888" }}>Confirm your subscription to get weekly bank bonus updates.</div>
      </div>
    )
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>Get notified when new bonuses drop</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
        Weekly updates on the best bank and savings bonuses. No spam — just the offers worth doing.
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="you@email.com"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            flex: 1, padding: "10px 14px", fontSize: 14,
            background: "#fff", color: "#111", border: "1px solid #e0e0e0",
            borderRadius: 8, outline: "none",
          }}
        />
        <button type="submit" style={{
          padding: "10px 20px", fontSize: 13, fontWeight: 700,
          background: "#0d7c5f", color: "#fff", border: "none",
          borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          Subscribe
        </button>
      </form>
    </div>
  )
}
