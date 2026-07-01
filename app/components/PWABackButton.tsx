"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

// Routes that are themselves a "home" — no back affordance needed because
// there's nowhere sensible to go back to. The Stacks OS hub is the app's
// home base; "/" is the marketing root.
const HOME_ROUTES = new Set(["/", "/stacksos"])

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  // Older iOS Safari reports install state via navigator.standalone.
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/**
 * A floating "← Back" button that only appears when the app is running as an
 * INSTALLED PWA (standalone display mode).
 *
 * Why standalone-only: a normal browser tab already has the browser's own
 * back button, so showing our own would just be clutter. But an installed
 * PWA has NO browser chrome — tap into an offer guide or a tool sub-page and
 * there's no way back. This restores exactly the affordance the standalone
 * window strips out, on every page.
 *
 * Sits bottom-left. That corner is free in standalone mode because the
 * InstallButton (also bottom-left) only shows *before* install — the two are
 * never visible at the same time. The push button lives bottom-right.
 *
 * Hidden on the app's home routes (see HOME_ROUTES). Uses router.back() when
 * there's history to pop, otherwise falls back to the hub so the button is
 * never a no-op.
 */
export default function PWABackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setStandalone(isStandalonePWA())
    // Keep in sync if the display mode changes mid-session (rare, e.g. the
    // user installs while a tab is open).
    const mq = window.matchMedia?.("(display-mode: standalone)")
    const onChange = () => setStandalone(isStandalonePWA())
    mq?.addEventListener?.("change", onChange)
    return () => mq?.removeEventListener?.("change", onChange)
  }, [])

  if (!standalone) return null
  if (pathname && HOME_ROUTES.has(pathname)) return null

  function goBack() {
    // Pop history when we can; otherwise send them to the hub so there's
    // always a real destination.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/stacksos")
    }
  }

  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      style={{
        position: "fixed",
        left: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9998, // just under the install/push buttons (9999)
        background: "#fff",
        color: "#0d7c5f",
        border: "1px solid #0d7c5f",
        borderRadius: 999,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(13,124,95,0.18)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 40,
      }}
    >
      <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>←</span>
      Back
    </button>
  )
}
