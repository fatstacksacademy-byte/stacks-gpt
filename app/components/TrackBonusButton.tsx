"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "../../lib/supabase/client"
import { trackCatalogBonus, type TrackKind, type TrackResult } from "../../lib/trackBonus"
import { track } from "../../lib/analytics"

type Props = {
  bonusId: string
  bonusType?: string
  bankName: string
  sourcePage?: string
  compact?: boolean
}

/**
 * Returns the Stacks OS module a tracked bonus lands in, so the success
 * link can deep-link the user straight to the right surface.
 */
function moduleHrefFor(kind: TrackKind): string {
  switch (kind) {
    case "personal-savings":
    case "business-savings":
    case "brokerage":
      return "/stacksos/savings"
    case "credit-card":
      return "/stacksos/spending"
    case "personal-checking":
    case "business":
    case "business-checking":
    default:
      return "/stacksos/paycheck"
  }
}

export default function TrackBonusButton({ bonusId, bonusType, bankName, sourcePage, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "duplicate" | "error">("idle")
  const [userId, setUserId] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<string>("")

  // The TrackKind we route by. Defaults to checking for catalog rows that
  // don't ship an explicit bonusType (kept for back-compat with older
  // call sites that were checking-only).
  const kind: TrackKind = (bonusType as TrackKind) || "personal-checking"
  const moduleHref = moduleHrefFor(kind)

  // Detect logged-in user so we can write directly to the right module
  // instead of taking the email-capture lead-magnet path.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  async function trackAsLoggedInUser() {
    if (!userId) return
    setStatus("loading")
    track("custom_bonus_added", { source: sourcePage ?? "catalog_track_button", kind, bonusId })
    const result: TrackResult = await trackCatalogBonus(userId, bonusId, kind)
    if (result === "added") {
      setDoneMessage(`✓ ${bankName} added to your dashboard`)
      setStatus("added")
    } else if (result === "duplicate") {
      setDoneMessage(`Already tracking ${bankName}`)
      setStatus("duplicate")
    } else {
      setStatus("error")
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) return
    setStatus("loading")
    try {
      const res = await fetch("/api/bonus-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, bonusId, bonusType: kind, sourcePage }),
      })
      if (res.ok) {
        setDoneMessage(`✓ Saved — we'll add ${bankName} to your account when you sign up`)
        setStatus("added")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  // ── Terminal states (logged-in user only) — success / duplicate ──
  if (status === "added" || status === "duplicate") {
    const bg = status === "duplicate" ? "#fff7ed" : "#e6f5f0"
    const border = status === "duplicate" ? "#fed7aa" : "#a7f3d0"
    const fg = status === "duplicate" ? "#9a3412" : "#0d7c5f"
    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 4,
        padding: compact ? "8px 12px" : "10px 14px",
        background: bg, border: `1px solid ${border}`, borderRadius: 8,
        fontSize: compact ? 12 : 13, color: fg, fontWeight: 600,
      }}>
        <span>{doneMessage}</span>
        {userId && (
          <Link
            href={moduleHref}
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: 11, color: fg, textDecoration: "underline", fontWeight: 500 }}
          >
            View in Stacks OS →
          </Link>
        )}
      </div>
    )
  }

  // Logged-in user → one-click tracking, no email form
  if (userId) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); trackAsLoggedInUser() }}
        disabled={status === "loading"}
        style={{
          padding: compact ? "8px 12px" : "10px 16px",
          background: status === "loading" ? "#5aaa8a" : "#0d7c5f", color: "#fff",
          border: "none", borderRadius: 8,
          fontSize: compact ? 12 : 13, fontWeight: 700,
          cursor: status === "loading" ? "wait" : "pointer", whiteSpace: "nowrap",
        }}>
        {status === "loading" ? "Adding…" : "Track this bonus →"}
      </button>
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
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
