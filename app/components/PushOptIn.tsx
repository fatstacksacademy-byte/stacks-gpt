"use client"

import { useEffect, useState } from "react"
import {
  pushSupported,
  getPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermission,
} from "../../lib/push/client"
import { DK, moduleGradient } from "../../lib/stacksTheme"

/**
 * Single-line opt-in / opt-out for web push notifications.  Renders nothing
 * when push isn't supported (older Safari, missing VAPID env).  Lives in
 * the Stacks OS hub so users see it on every visit until they decide.
 */
export default function PushOptIn() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [perm, setPerm] = useState<PushPermission>("default")
  const [subscribed, setSubscribed] = useState<boolean>(false)
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported(pushSupported())
    setPerm(getPermission())
    isSubscribed().then(setSubscribed)
  }, [])

  if (supported === null) return null // SSR / first paint
  if (!supported) return null
  if (perm === "denied") {
    // Browser-level denial — the user has to flip it back in browser
    // settings, no point showing a button that won't work.
    return null
  }

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      const ok = await subscribeToPush()
      if (ok) {
        setSubscribed(true)
        setPerm("granted")
      } else {
        setError("Permission not granted.")
        setPerm(getPermission())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable notifications.")
    }
    setBusy(false)
  }

  async function handleDisable() {
    setBusy(true)
    setError(null)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to turn off notifications.")
    }
    setBusy(false)
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        background: DK.panel,
        border: `1px solid ${DK.border}`,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DK.text }}>
          {subscribed ? "Notifications on" : "Get deadline reminders on your phone"}
        </div>
        <div style={{ fontSize: 12, color: DK.textMute, marginTop: 2, lineHeight: 1.4 }}>
          {subscribed
            ? "You'll get a notification 7 days and 1 day before each bonus deadline."
            : "Install Stacks OS to your home screen, then enable push to skip the inbox."}
        </div>
        {error && (
          <div style={{ fontSize: 11, color: DK.red, marginTop: 4 }}>{error}</div>
        )}
      </div>
      <button
        onClick={subscribed ? handleDisable : handleEnable}
        disabled={busy}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 700,
          color: subscribed ? DK.textDim : "#fff",
          background: subscribed ? DK.panel2 : moduleGradient("paycheck"),
          border: subscribed ? `1px solid ${DK.border2}` : "none",
          borderRadius: 8,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "…" : subscribed ? "Off" : "Enable"}
      </button>
    </div>
  )
}
