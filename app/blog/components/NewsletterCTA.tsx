"use client"

import { useState } from "react"

export default function NewsletterCTA() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) return
    setStatus("loading")
    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setStatus(res.ok ? "done" : "error")
  }

  if (status === "done") {
    return (
      <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0d7c5f", marginBottom: 4 }}>You&apos;re subscribed!</div>
        <div style={{ fontSize: 13, color: "#888" }}>You&apos;ll get notified when new bonuses drop.</div>
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
        <button type="submit" disabled={status === "loading"} style={{
          padding: "10px 20px", fontSize: 13, fontWeight: 700,
          background: "#0d7c5f", color: "#fff", border: "none",
          borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
        }}>
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>Something went wrong. Try again.</div>}
    </div>
  )
}
