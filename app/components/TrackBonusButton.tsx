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
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "duplicate" | "error">("idle")
  const [userId, setUserId] = useState<string | null>(null)
  const [doneMessage, setDoneMessage] = useState<string>("")
  const [errorMsg, setErrorMsg] = useState<string>("")

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

  // Logged-out flow: create a free account (or sign into an existing one) right
  // here, then write the bonus straight into the new dashboard — no email-only
  // lead-capture detour. Email confirmation is off (see app/signup/page.tsx),
  // so signInWithPassword establishes a session immediately after signUp.
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@") || password.length < 6) return
    setStatus("loading")
    setErrorMsg("")
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      const alreadyRegistered =
        !!signUpError && /already|registered|exists/i.test(signUpError.message)
      if (signUpError && !alreadyRegistered) {
        setStatus("error")
        setErrorMsg(signUpError.message)
        return
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !signInData.user) {
        setStatus("error")
        setErrorMsg(
          alreadyRegistered
            ? "That email already has an account — check your password or sign in."
            : "Account created — please sign in to finish tracking.",
        )
        return
      }

      const newUserId = signInData.user.id
      setUserId(newUserId)
      if (!alreadyRegistered) {
        track("account_created", { source: sourcePage ?? "catalog_track_button", bonusId, kind })
      }
      track("custom_bonus_added", { source: sourcePage ?? "catalog_track_button", kind, bonusId })

      const result: TrackResult = await trackCatalogBonus(newUserId, bonusId, kind)
      if (result === "added") {
        setDoneMessage(`✓ ${bankName} added to your dashboard`)
        setOpen(false)
        setStatus("added")
      } else if (result === "duplicate") {
        setDoneMessage(`Already tracking ${bankName}`)
        setOpen(false)
        setStatus("duplicate")
      } else {
        setStatus("error")
        setErrorMsg("Your account is ready, but we couldn't add the bonus. Open Stacks OS and try again.")
      }
    } catch {
      setStatus("error")
      setErrorMsg("Something went wrong. Try again.")
    }
  }

  // ── Terminal states — success / duplicate ──
  // Reached by both an already-logged-in one-click track and a fresh inline
  // signup (which sets userId mid-flow, so "View in Stacks OS →" shows too).
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

  // Logged-in user → one-click tracking, no signup form. Gated on !open so an
  // inline signup that established a session mid-flow (but errored on the track)
  // stays in the form to show the error instead of silently swapping views.
  if (userId && !open) {
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
    <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
        Create a free account and we&apos;ll drop <strong style={{ color: "#111" }}>{bankName}</strong> straight into your Stacks OS dashboard — pick a password and you&apos;re tracking in seconds.
      </div>
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
        style={inputStyle}
      />
      <input
        type="password"
        name="new-password"
        autoComplete="new-password"
        required
        minLength={6}
        placeholder="Create a password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: "9px 14px", fontSize: 13, fontWeight: 700,
          background: status === "loading" ? "#5aaa8a" : "#0d7c5f", color: "#fff", border: "none",
          borderRadius: 8, cursor: status === "loading" ? "wait" : "pointer", whiteSpace: "nowrap",
        }}>
        {status === "loading" ? "Creating your account…" : "Create free account & track →"}
      </button>
      {errorMsg && <div style={{ fontSize: 11, color: "#ef4444", lineHeight: 1.4 }}>{errorMsg}</div>}
      <div style={{ fontSize: 11, color: "#999" }}>
        Already have an account?{" "}
        <Link href="/login" onClick={(e) => e.stopPropagation()} style={{ color: "#0d7c5f", fontWeight: 600, textDecoration: "underline" }}>
          Sign in
        </Link>
        {" "}— or just enter your email and password above to sign in and track.
      </div>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 13,
  background: "#fff", color: "#111", border: "1px solid #e0e0e0",
  borderRadius: 8, outline: "none", boxSizing: "border-box",
}
