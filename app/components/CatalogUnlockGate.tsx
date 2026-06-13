"use client"

import { useState } from "react"

/**
 * Email-capture panel shown in place of the regional/state-specific catalog
 * results until the visitor unlocks. Presentational only — the parent owns the
 * unlock state via useCatalogUnlock() and passes the action in, so one unlock
 * re-renders every gated section on the page at once.
 */
export default function CatalogUnlockGate({
  count,
  stateName,
  stateCode,
  source,
  unlock,
  unlocking,
  error,
  noun = "local cards",
}: {
  count: number
  stateName: string
  stateCode: string
  source: string
  unlock: (email: string, ctx?: { source?: string; state?: string }) => Promise<boolean>
  unlocking: boolean
  error: string | null
  noun?: string
}) {
  const [email, setEmail] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await unlock(email, { source, state: stateCode })
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)",
        border: "1px solid #a7f3d0",
        borderRadius: 14,
        padding: "26px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 8 }}>🔒</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#111", letterSpacing: "-0.01em", marginBottom: 6 }}>
        Unlock {count} {noun} in {stateName}
      </div>
      <p style={{ fontSize: 14, color: "#555", lineHeight: 1.55, margin: "0 auto 16px", maxWidth: 460 }}>
        These are verified local bank &amp; credit-union offers you won&apos;t find on the big aggregators.
        Drop your email to unlock every state and spin up a free Stacks OS account to track them — no password needed.
      </p>
      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 440, margin: "0 auto" }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          style={{
            flex: "1 1 220px",
            minWidth: 0,
            padding: "12px 14px",
            fontSize: 14,
            border: "1px solid #cbe8da",
            borderRadius: 10,
            background: "#fff",
            color: "#111",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={unlocking}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            background: "#0d7c5f",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: unlocking ? "default" : "pointer",
            opacity: unlocking ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {unlocking ? "Unlocking…" : `Unlock ${stateName} cards`}
        </button>
      </form>
      {error && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 10 }}>{error}</div>}
      <div style={{ fontSize: 11, color: "#999", marginTop: 12, lineHeight: 1.5 }}>
        One email unlocks every state · free Stacks OS account to track your bonuses · unsubscribe anytime.
      </div>
    </div>
  )
}

/**
 * Post-unlock confirmation banner. Shown once the magic-link account email has
 * gone out, above the now-revealed catalog, so the visitor knows to check their
 * inbox to finish their free account. Renders nothing if no link was sent
 * (e.g. already signed in, or OTP disabled).
 */
export function AccountLinkBanner({ email }: { email: string | null }) {
  if (!email) return null
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        background: "#e6f5f0",
        border: "1px solid #a7f3d0",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        fontSize: 13,
        color: "#0d6e51",
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontWeight: 700 }}>✓ Unlocked.</span>
      <span>
        Check <strong>{email}</strong> for a magic link to finish your free Stacks OS account and track these — no password needed.
      </span>
    </div>
  )
}
