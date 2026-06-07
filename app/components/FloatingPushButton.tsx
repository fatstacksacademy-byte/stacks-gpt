"use client"

import { useEffect, useState } from "react"
import {
  pushSupported,
  getPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../lib/push/client"

/**
 * Fixed-position floating "Enable notifications" button. Mounted once in
 * the root layout so it shows on every page (except the offline shell,
 * which has its own minimal layout).
 *
 * Always renders when the browser supports push; collapses to a small
 * "On" pill once the user has subscribed.  Doesn't hide itself behind
 * environment checks — the goal is one obvious always-available CTA so
 * users don't have to hunt for it on a specific page.
 *
 * On mobile-installed PWAs this is the primary way to opt in.  On
 * desktop it sits in the bottom-right corner and stays out of the way.
 */
export default function FloatingPushButton() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setSupported(pushSupported())
    isSubscribed().then(setSubscribed)
  }, [])

  // First paint + unsupported browsers → render nothing.
  if (supported === null) return null
  if (!supported) return null

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
      } else {
        const perm = getPermission()
        if (perm === "denied") {
          setError("Notifications are blocked. Allow them in your browser settings, then try again.")
          setBusy(false)
          return
        }
        const ok = await subscribeToPush()
        if (ok) {
          setSubscribed(true)
        } else {
          setError("Permission not granted.")
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update notification setting.")
    }
    setBusy(false)
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
        pointerEvents: "none",
      }}
    >
      {expanded && error && (
        <div
          role="alert"
          style={{
            pointerEvents: "auto",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            maxWidth: 260,
            lineHeight: 1.4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {error}
        </div>
      )}
      {expanded && !subscribed && !error && (
        <div
          style={{
            pointerEvents: "auto",
            background: "#fff",
            border: "1px solid #e8e8e8",
            color: "#333",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            maxWidth: 260,
            lineHeight: 1.4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          Get a notification 7 days + 1 day before each bonus deadline.
        </div>
      )}
      <button
        onClick={() => {
          if (!expanded) {
            setExpanded(true)
            return
          }
          handleClick()
        }}
        onBlur={() => {
          // Collapse the explainer/error after a short delay so the user has
          // time to read it but it doesn't linger between page navigations.
          setTimeout(() => setExpanded(false), 1200)
        }}
        disabled={busy}
        aria-label={subscribed ? "Disable push notifications" : "Enable push notifications"}
        style={{
          pointerEvents: "auto",
          background: subscribed ? "#0d7c5f" : "#fff",
          color: subscribed ? "#fff" : "#0d7c5f",
          border: subscribed ? "1px solid #0d7c5f" : "1px solid #0d7c5f",
          borderRadius: 999,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
          boxShadow: "0 4px 16px rgba(13,124,95,0.18)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          opacity: busy ? 0.7 : 1,
          transition: "background 120ms ease",
          minHeight: 40,
        }}
      >
        <span aria-hidden style={{ fontSize: 14 }}>🔔</span>
        {busy
          ? "…"
          : subscribed
            ? "Alerts on"
            : expanded
              ? "Enable alerts"
              : "Get alerts"}
      </button>
    </div>
  )
}
