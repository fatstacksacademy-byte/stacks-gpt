"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react"
import type { UserProfile, PayFrequency } from "../../lib/profileServer"
import { DEFAULT_PROFILE } from "../../lib/profileServer"
import { upsertProfileClient } from "../../lib/profileClient"

// ─── Context ──────────────────────────────────────────────────────────────────

type ProfileContextValue = {
  profile: UserProfile
  setProfile: (updates: Partial<Omit<UserProfile, "user_id">>) => void
  loaded: boolean
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

const LS_KEY = "stacksgpt_profile_cache"
const DEBOUNCE_MS = 400

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProfileProvider({
  children,
  serverProfile,
}: {
  children: ReactNode
  serverProfile: UserProfile
}) {
  // Hydrate from server profile immediately — no flicker
  const [profile, setProfileState] = useState<UserProfile>(() => {
    // On server render, just use serverProfile directly
    if (typeof window === "undefined") return serverProfile

    // On client, try localStorage as optimistic layer
    // but only if it's for the same user and more recent
    try {
      const cached = localStorage.getItem(LS_KEY)
      if (cached) {
        const parsed: UserProfile = JSON.parse(cached)
        if (parsed.user_id === serverProfile.user_id) {
          const cachedTime = parsed.updated_at ? new Date(parsed.updated_at).getTime() : 0
          const serverTime = serverProfile.updated_at
            ? new Date(serverProfile.updated_at).getTime()
            : 0
          // Use whichever is more recent
          return cachedTime > serverTime ? parsed : serverProfile
        }
      }
    } catch {}

    return serverProfile
  })

  const [loaded, setLoaded] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoaded(true)
  }, [])

  const setProfile = useCallback(
    (updates: Partial<Omit<UserProfile, "user_id">>) => {
      setProfileState((prev) => {
        const next: UserProfile = {
          ...prev,
          ...updates,
          updated_at: new Date().toISOString(),
        }

        // Write to localStorage immediately (optimistic)
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(next))
        } catch {}

        // Debounced write to Supabase
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          upsertProfileClient(next)
        }, DEBOUNCE_MS)

        return next
      })
    },
    []
  )

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loaded }}>
      {children}
    </ProfileContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider")
  return ctx
}

// Re-export types for convenience
export type { UserProfile, PayFrequency }