"use client"

import { useEffect, useState } from "react"
import {
  pushSupported,
  getPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../lib/push/client"

// iOS reports navigator.userAgent containing "iPhone" / "iPad" / "iPod".
// iPadOS lies as a Mac so we also gate on touch + the standalone API.
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return true
  // iPadOS 13+ pretends to be Mac. Detect via touch support + the
  // iOS-specific standalone API.
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true
  return false
}

// On iOS every browser is forced onto WebKit, but only Safari can install
// PWAs and receive push. CriOS/FxiOS/EdgiOS/OPiOS = non-Safari shells.
function isNonSafariIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(navigator.userAgent)
}

function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  // Older iOS Safari uses navigator.standalone.
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return false
}

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
  const [mounted, setMounted] = useState(false)
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSupported(pushSupported())
    isSubscribed().then(setSubscribed)
  }, [])

  // Skip SSR/first paint only — we always render on the client so users
  // can find the button no matter their platform/install state.
  if (!mounted) return null

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setError(null)
    setInfo(null)

    // Unsupported path: explain what to do instead of silently failing.
    if (!supported) {
      if (isIOS() && isNonSafariIOS()) {
        setInfo(
          "On iPhone, push notifications only work in Safari (Apple's rule, not ours). Open fatstacksacademy.com in Safari, then tap the Share button → 'Add to Home Screen'.",
        )
      } else if (isIOS() && !isInstalledPWA()) {
        setInfo(
          "On iPhone, push notifications work only after you install Stacks OS to your home screen. Tap the Share button at the bottom of Safari, then 'Add to Home Screen' — once installed, open it and tap this button again.",
        )
      } else if (isIOS()) {
        setInfo(
          "Your iOS version doesn't support web push yet. Update to iOS 16.4 or newer to enable.",
        )
      } else {
        setInfo(
          "Your browser doesn't support push notifications. Try Chrome / Edge / Firefox / Safari on a modern device.",
        )
      }
      setBusy(false)
      return
    }

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
            maxWidth: 280,
            lineHeight: 1.4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {error}
        </div>
      )}
      {expanded && info && !error && (
        <div
          role="status"
          style={{
            pointerEvents: "auto",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#92400e",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            maxWidth: 280,
            lineHeight: 1.45,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {info}
        </div>
      )}
      {expanded && !subscribed && !error && !info && (
        <div
          style={{
            pointerEvents: "auto",
            background: "#fff",
            border: "1px solid #e8e8e8",
            color: "#333",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            maxWidth: 280,
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
