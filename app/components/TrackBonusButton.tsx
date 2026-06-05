"use client"

import { useState } from "react"

type Props = {
  bonusId: string
  bonusType?: string
  bankName: string
  sourcePage?: string
  compact?: boolean
}

export default function TrackBonusButton({ bonusId, bonusType, bankName, sourcePage, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) return
    setStatus("loading")
    try {
      const res = await fetch("/api/bonus-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, bonusId, bonusType, sourcePage }),
      })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: compact ? "8px 12px" : "10px 14px",
        background: "#e6f5f0", border: "1px solid #a7f3d0", borderRadius: 8,
        fontSize: compact ? 12 : 13, color: "#0d7c5f", fontWeight: 600,
      }}>
        ✓ Saved — we&apos;ll add this to your Stacks OS account
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        style={{
          padding: compact ? "8px 12px" : "10px 16px",
          background: "#fff", color: "#0d7c5f",
          border: "1px solid #0d7c5f", borderRadius: 8,
          fontSize: compact ? 12 : 13, fontWeight: 700,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>
        Track this bonus →
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
        Drop your email — we&apos;ll save {bankName} to your Stacks OS account when you sign up, plus weekly bonus updates.
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="email"
          required
          autoFocus
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, padding: "8px 12px", fontSize: 13,
            background: "#fff", color: "#111", border: "1px solid #e0e0e0",
            borderRadius: 8, outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          onClick={(e) => e.stopPropagation()}
          style={{
            padding: "8px 14px", fontSize: 12, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", border: "none",
            borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
          }}>
          {status === "loading" ? "..." : "Track"}
        </button>
      </div>
      {status === "error" && <div style={{ fontSize: 11, color: "#ef4444" }}>Something went wrong. Try again.</div>}
    </form>
  )
}
