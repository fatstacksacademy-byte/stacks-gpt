"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { usePathname, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * PostHog provider — initializes the client, emits $pageview on route
 * changes, and identifies the user via the Supabase auth listener so
 * identification works on every route (no need for the root layout to
 * fetch the user). No-ops whenever NEXT_PUBLIC_POSTHOG_KEY is unset.
 *
 * To enable in production, set:
 *   NEXT_PUBLIC_POSTHOG_KEY   = ph_project_*
 *   NEXT_PUBLIC_POSTHOG_HOST  = https://us.i.posthog.com  (or your region)
 */
export default function PostHogProvider() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    if (posthog.__loaded) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,            // we fire our own below
      capture_pageleave: true,
      person_profiles: "identified_only", // skip anonymous profiles
      autocapture: false,                 // explicit events only
    })
  }, [])

  // Identify off the Supabase auth state: fires immediately with the current
  // session and again on sign-in / sign-out. No server-side handoff needed.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!posthog.__loaded) return
      if (session?.user) posthog.identify(session.user.id)
      else posthog.reset()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!posthog.__loaded || !pathname) return
    const url = pathname + (search?.toString() ? `?${search.toString()}` : "")
    posthog.capture("$pageview", { $current_url: url })
  }, [pathname, search])

  return null
}
