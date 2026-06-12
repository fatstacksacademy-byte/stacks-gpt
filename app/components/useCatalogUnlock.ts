"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Shared email-gate state for the regional card / state-bonus catalog.
 *
 * One successful unlock is remembered in localStorage and applies across every
 * page that uses this hook (so unlocking a state on /spending also unlocks the
 * state filter on /bonuses, and vice versa). `hydrated` guards against an
 * SSR/client flash for returning visitors.
 */
const STORAGE_KEY = "fsa_catalog_unlocked"

export function useCatalogUnlock() {
  const [unlocked, setUnlocked] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return { unlocked, hydrated, unlocking, error, unlock }
}
