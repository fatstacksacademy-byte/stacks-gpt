"use client"

// Debug utility — only rendered when NEXT_PUBLIC_STACKHOUSE_DEBUG=1.
// Lets you QA high-rank UI states without waiting a year of real play.
// Calls /stackhouse/api/xp-events with source_type=admin_adjust, which
// the server-side route accepts only from authenticated sessions and
// writes via the service-role client. Delete or unset the env var in
// prod if you don't want QA testers to grant themselves XP.

import { useState } from "react"
import type { StackhouseProfile } from "../../../lib/stackhouse/types"

export default function DebugXpPanel({
  userId,
  currentXp,
  onProfileUpdate,
}: {
  userId: string
  currentXp: number
  onProfileUpdate: (p: StackhouseProfile) => void
}) {
  void userId
  const [amount, setAmount] = useState("1000")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function grant(delta: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/stackhouse/api/xp-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: "admin_adjust",
          amount: delta,
          note: "debug xp panel",
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const body = await res.json()
      if (body.profile) onProfileUpdate(body.profile as StackhouseProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const preset = [1000, 5000, 10000, 42000]

  return (
    <section
      style={{
        marginTop: 30,
        padding: 16,
        border: "1px dashed var(--sh-amber)",
        borderRadius: "var(--sh-radius)",
        background: "var(--sh-bg-card)",
      }}
      aria-label="Debug XP"
    >
      <div
        className="sh-eyebrow"
        style={{ color: "var(--sh-amber)", marginBottom: 8 }}
      >
        Debug · XP grant · current {currentXp.toLocaleString()}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: 120,
            padding: "6px 10px",
            fontSize: 13,
            background: "var(--sh-bg-card-elev)",
            color: "var(--sh-text-primary)",
            border: "1px solid var(--sh-divider)",
            borderRadius: "var(--sh-radius)",
          }}
        />
        <button
          onClick={() => grant(Number(amount) || 0)}
          disabled={busy}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "var(--sh-font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            background: "var(--sh-amber)",
            color: "#1a1816",
            border: "none",
            borderRadius: "var(--sh-radius)",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Grant
        </button>
        {preset.map((p) => (
          <button
            key={p}
            onClick={() => grant(p)}
            disabled={busy}
            style={{
              padding: "6px 10px",
              fontSize: 11,
              fontFamily: "var(--sh-font-mono)",
              color: "var(--sh-text-secondary)",
              background: "transparent",
              border: "1px solid var(--sh-divider)",
              borderRadius: "var(--sh-radius)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            +{p.toLocaleString()}
          </button>
        ))}
        <button
          onClick={() => grant(-currentXp)}
          disabled={busy}
          style={{
            marginLeft: "auto",
            padding: "6px 10px",
            fontSize: 11,
            fontFamily: "var(--sh-font-mono)",
            color: "var(--sh-red)",
            background: "transparent",
            border: "1px solid var(--sh-red)",
            borderRadius: "var(--sh-radius)",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Reset to 0
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--sh-red)" }}>
          {error}
        </div>
      )}
    </section>
  )
}
