"use client"

import { useEffect } from "react"
import posthog from "posthog-js"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * PostHog provider — initializes the client and emits $pageview on
 * route changes. No-ops in dev (or whenever NEXT_PUBLIC_POSTHOG_KEY
 * is unset) so we don't poison the dataset with developer traffic.
 *
 * To enable in production, set:
 *   NEXT_PUBLIC_POSTHOG_KEY   = ph_project_*
 *   NEXT_PUBLIC_POSTHOG_HOST  = https://us.i.posthog.com  (or your region)
 */
export default function PostHogProvider({ userId }: { userId: string | null }) {
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

  useEffect(() => {
    if (!posthog.__loaded) return
    if (userId) posthog.identify(userId)
    else posthog.reset()
  }, [userId])

  useEffect(() => {
    if (!posthog.__loaded || !pathname) return
    const url = pathname + (search?.toString() ? `?${search.toString()}` : "")
    posthog.capture("$pageview", { $current_url: url })
  }, [pathname, search])

  return null
}
