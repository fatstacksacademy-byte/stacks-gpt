"use client"

import { useEffect } from "react"

/**
 * Catches Supabase password-recovery hash fragments on any page where
 * this component is mounted. Hash fragments are NOT sent to the server,
 * so a server-side `?code=` handler can't see them; this is the only
 * way to deal with the case where Supabase falls back to Site URL and
 * returns a recovery session via `#access_token=...&type=recovery&...`.
 *
 * Runs synchronously in a useEffect on mount. We forward the entire
 * hash to /reset-password so the Supabase client there has the same
 * material to consume — only the destination changes.
 *
 * Renders nothing.
 */
export default function RecoveryGate() {
  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash
    if (!hash) return

    // Look for either the recovery-type marker or the raw access token —
    // either is a clear signal Supabase just landed us with auth material
    // that wasn't meant for the homepage.
    const looksLikeRecovery =
      /\btype=recovery\b/.test(hash) || /\baccess_token=/.test(hash)
    if (!looksLikeRecovery) return

    // Use replace() (not href=) so back-button can't loop the user back
    // to the bare hash on the homepage.
    window.location.replace(`/reset-password${hash}`)
  }, [])

  return null
}
