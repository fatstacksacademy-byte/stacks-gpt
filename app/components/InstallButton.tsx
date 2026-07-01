"use client"

import { useEffect, useState } from "react"

// The install prompt event isn't in the standard TS DOM lib yet. This is the
// Chromium shape: a normal Event plus prompt() and a userChoice promise.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// iOS reports navigator.userAgent containing "iPhone" / "iPad" / "iPod".
// iPadOS 13+ lies as a Mac, so we also gate on touch + the standalone API.
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return true
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true
  return false
}

// On iOS every browser is forced onto WebKit, but only Safari can install a
// PWA. CriOS/FxiOS/EdgiOS/OPiOS are non-Safari shells that can't.
function isNonSafariIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(navigator.userAgent)
}

function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

const DISMISS_KEY = "stacksos-install-dismissed"

/**
 * Floating "Install Stacks OS" button, mounted once in the root layout.
 *
 * Two platforms, two behaviors:
 *   • Android / Chrome / Edge / desktop — the browser fires
 *     `beforeinstallprompt`, which we capture and re-fire on click. That
 *     turns a native install banner into an in-app CTA we control. iOS has
 *     no such API, which is why this is effectively "the Android button."
 *   • iOS Safari — no programmatic install exists, so we show the manual
 *     Share → "Add to Home Screen" instructions instead.
 *
 * Hides itself once the app is already installed (standalone display mode),
 * and stays hidden for the session after the user installs or dismisses.
 * Sits bottom-LEFT so it never collides with the bottom-right push button.
 */
export default function InstallButton() {
  const [mounted, setMounted] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Already installed → never show.
    if (isInstalledPWA()) return
    // Dismissed earlier this session → stay hidden.
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true)
      return
    }

    // Android / Chromium: capture the prompt so we can trigger it on click.
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBIP)

    // Hide as soon as an install completes (either via our button or the
    // browser's own UI).
    const onInstalled = () => {
      setDeferred(null)
      setIosHint(false)
    }
    window.addEventListener("appinstalled", onInstalled)

    // iOS Safari never fires beforeinstallprompt. If we're on installable
    // iOS Safari, offer the manual instructions instead.
    if (isIOS() && !isNonSafariIOS() && !isInstalledPWA()) {
      setIosHint(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (!mounted || dismissed) return null
  // Nothing to show unless the browser gave us a prompt or we're on iOS Safari.
  if (!deferred && !iosHint) return null

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // sessionStorage can throw in private mode — non-fatal, just skip.
    }
  }

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      setDeferred(null)
      if (outcome === "dismissed") dismiss()
      return
    }
    // iOS path — toggle the step-by-step instructions.
    setShowIosSteps((s) => !s)
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        pointerEvents: "none",
      }}
    >
      {iosHint && showIosSteps && (
        <div
          role="status"
          style={{
            pointerEvents: "auto",
            background: "#fff",
            border: "1px solid #e8e8e8",
            color: "#333",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            maxWidth: 280,
            lineHeight: 1.5,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          <strong style={{ color: "#0d7c5f" }}>Add Stacks OS to your home screen</strong>
          <br />
          1. Tap the <strong>Share</strong> button (the □↑ icon) at the bottom of Safari.
          <br />
          2. Scroll down and tap <strong>Add to Home Screen</strong>.
          <br />
          3. Tap <strong>Add</strong> — then open Stacks OS from your home screen like any app.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "auto" }}>
        <button
          onClick={handleClick}
          aria-label="Install Stacks OS"
          style={{
            background: "#0d7c5f",
            color: "#fff",
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
          <span aria-hidden style={{ fontSize: 14 }}>📲</span>
          Install app
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          style={{
            background: "#fff",
            color: "#999",
            border: "1px solid #e8e8e8",
            borderRadius: 999,
            width: 28,
            height: 28,
            fontSize: 14,
            lineHeight: 1,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
