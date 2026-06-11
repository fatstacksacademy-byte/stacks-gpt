"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "../../lib/supabase/client"

/**
 * Stacks OS account control. Shown on every signed-in module surface so
 * logout, profile editing, and the active account email are reachable
 * in one place instead of being re-implemented per module.
 *
 * Renders nothing when there is no signed-in user — call sites can mount
 * it unconditionally without flicker handling.
 *
 * The menu opens on click, closes on outside click or Escape, and is
 * keyboard-accessible. Logout calls Supabase signOut, redirects to "/"
 * on success, and surfaces a graceful error if signOut throws (we don't
 * leave the user stranded with no feedback).
 */

export default function StacksAccountMenu({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!email) return null

  async function handleLogout() {
    setError(null)
    setLoggingOut(true)
    try {
      const supabase = createClient()
      const { error: sErr } = await supabase.auth.signOut()
      if (sErr) {
        setError(sErr.message || "Could not sign out — please try again.")
        setLoggingOut(false)
        return
      }
      window.location.href = "/"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out — please try again.")
      setLoggingOut(false)
    }
  }

  const trigger = compact ? truncateMiddle(email, 18) : truncateEmail(email, 28)

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "5px 10px" : "6px 14px",
          background: open ? "#f6f6f5" : "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          color: "#333",
          cursor: "pointer",
          maxWidth: 280,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22, height: 22, borderRadius: 11,
            background: "#0d7c5f", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
          }}
        >
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {trigger}
        </span>
        <span style={{ fontSize: 10, color: "#999" }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 50,
            minWidth: 240,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            padding: 6,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Signed in as
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111", wordBreak: "break-all" }}>
              {email}
            </div>
          </div>
          <Link
            href="/stacksos/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            Edit profile
          </Link>
          <Link
            href="/stacksos"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={menuItemStyle}
          >
            Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              ...menuItemStyle,
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              cursor: loggingOut ? "wait" : "pointer",
              color: "#b91c1c",
            }}
          >
            {loggingOut ? "Signing out…" : "Log out"}
          </button>
          {error && (
            <div style={{ padding: "8px 12px", fontSize: 11, color: "#b91c1c" }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  padding: "9px 12px",
  fontSize: 13,
  color: "#111",
  textDecoration: "none",
  borderRadius: 8,
  fontWeight: 500,
}

function truncateEmail(email: string, max: number): string {
  if (email.length <= max) return email
  return email.slice(0, max - 1) + "…"
}

function truncateMiddle(email: string, max: number): string {
  if (email.length <= max) return email
  const [user, domain = ""] = email.split("@")
  const keep = Math.max(2, Math.floor((max - domain.length - 2) / 2))
  return `${user.slice(0, keep)}…@${domain}`
}
