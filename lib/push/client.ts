"use client"

/**
 * Browser helpers for opting into / out of web push.
 *
 * Used by app/components/PushOptIn.tsx; safe to import in any client
 * component — every entry point checks for browser API support first.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

/** Are push notifications supported in the current browser? */
export function pushSupported(): boolean {
  if (typeof window === "undefined") return false
  if (!("Notification" in window)) return false
  if (!("serviceWorker" in navigator)) return false
  if (!("PushManager" in window)) return false
  return Boolean(VAPID_PUBLIC_KEY)
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported"

export function getPermission(): PushPermission {
  if (!pushSupported()) return "unsupported"
  return Notification.permission as PushPermission
}

/**
 * Convert a base64url-encoded VAPID public key to the Uint8Array shape
 * PushManager.subscribe() expects. Spec-compliant: '+' / '-' and '/' / '_'
 * swaps, '=' padding to multiple of 4.
 */
function urlBase64ToUint8Array(b64url: string): Uint8Array {
  const padding = "=".repeat((4 - (b64url.length % 4)) % 4)
  const b64 = (b64url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Convert ArrayBuffer to base64url-encoded string (no padding). */
function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return ""
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Idempotent subscribe flow:
 *   1. Request permission (no-op if already granted).
 *   2. Pull the existing PushSubscription off the active service worker,
 *      or create a new one.
 *   3. POST it to /api/push/subscribe so the server can later send to it.
 *
 * Returns true on success, false on permission denial or any error. The
 * UI is expected to surface the user-friendly state itself.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) return false

  // Step 1: permission
  let perm = Notification.permission
  if (perm === "default") {
    perm = await Notification.requestPermission()
  }
  if (perm !== "granted") return false

  // Step 2: service worker + subscription
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    // Copy into a fresh ArrayBuffer so TS's narrower BufferSource typing
    // (no SharedArrayBuffer / no ArrayBufferLike) is satisfied. The browser
    // doesn't care about the distinction — it's purely a TS lib.dom.d.ts
    // tightening introduced around TS 5.7.
    const applicationServerKey = new Uint8Array(keyBytes.byteLength)
    applicationServerKey.set(keyBytes)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    })
  }

  // Step 3: send to server. Body matches push_subscriptions row shape.
  const body = {
    endpoint: sub.endpoint,
    p256dh: arrayBufferToBase64Url(sub.getKey("p256dh")),
    auth: arrayBufferToBase64Url(sub.getKey("auth")),
    user_agent: navigator.userAgent,
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.ok
}

/**
 * Remove the local PushSubscription + tell the server to delete the row.
 * Idempotent — calling on an unsubscribed user is a no-op.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!pushSupported()) return true
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return true

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  })
  return await sub.unsubscribe()
}

/**
 * Has the user already opted in on THIS browser/device?  We treat the
 * presence of a PushSubscription as authoritative — the server might have
 * other devices' rows but they're not relevant to THIS browser's UI.
 */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  } catch {
    return false
  }
}
