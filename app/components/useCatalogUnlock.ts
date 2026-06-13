"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "../../lib/supabase/client"

/**
 * Shared email-gate state for the regional card / state-bonus catalog.
 *
 * One successful unlock is remembered in localStorage and applies across every
 * page that uses this hook (so unlocking a state on /spending also unlocks the
 * state filter on /bonuses, and vice versa). `hydrated` guards against an
 * SSR/client flash for returning visitors.
 *
 * On unlock we also start a FREE Stacks OS account for the captured email via a
 * passwordless magic link (Supabase signInWithOtp, shouldCreateUser). This is
 * best-effort: if the user is already signed in, or OTP isn't enabled, the
 * cards still unlock and the lead is still captured — only the account step
 * no-ops. `accountLinkSent` lets the page show a "check your email" nudge.
 */
const STORAGE_KEY = "fsa_catalog_unlocked"

export function useCatalogUnlock() {
  const [unlocked, setUnlocked] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountLinkSent, setAccountLinkSent] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) setUnlocked(true)
    } catch {
      /* localStorage unavailable (private mode) — gate stays locked, that's fine */
    }
    setHydrated(true)
  }, [])

  const unlock = useCallback(
    async (email: string, ctx?: { source?: string; state?: string }): Promise<boolean> => {
      const trimmed = email.trim()
      if (!trimmed.includes("@") || trimmed.length < 5) {
        setError("Enter a valid email address.")
        return false
      }
      setUnlocking(true)
      setError(null)
      try {
        const res = await fetch("/api/catalog-unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed, source: ctx?.source, state: ctx?.state }),
        })
        if (!res.ok) {
          setError("Something went wrong — try again.")
          return false
        }

        // Best-effort: spin up a free account via magic link (skip if already
        // signed in). Never block the unlock on this.
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            const { error: otpErr } = await supabase.auth.signInWithOtp({
              email: trimmed,
              options: {
                shouldCreateUser: true,
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/stacksos`,
              },
            })
            if (!otpErr) {
              setAccountLinkSent(true)
              setPendingEmail(trimmed)
            }
          }
        } catch {
          /* OTP unavailable — unlock + lead capture still succeeded */
        }

        try {
          localStorage.setItem(STORAGE_KEY, trimmed)
        } catch {
          /* ignore persistence failure — unlock still applies for this session */
        }
        setUnlocked(true)
        return true
      } catch {
        setError("Network error — try again.")
        return false
      } finally {
        setUnlocking(false)
      }
    },
    [],
  )

  return { unlocked, hydrated, unlocking, error, unlock, accountLinkSent, pendingEmail }
}
