"use client"

import { GoogleAnalytics } from "@next/third-parties/google"
import { useEffect, useState } from "react"

/**
 * Owner opt-out for Google Analytics.
 *
 * Visit any page with `?noga=1` once per device to drop a long-lived cookie;
 * after that GA never loads on that device, regardless of IP or network (so it
 * survives the holes in GA's IP-based internal-traffic filter — dynamic home IP,
 * phone on cellular, VPN, etc.). Visit `?noga=0` to opt back in.
 *
 * Why a client gate and not a server cookie read: the root layout is statically
 * rendered, and calling cookies() in it would force every page to render
 * dynamically — a real SEO/perf cost. This decides at runtime in the browser
 * instead, so the page stays static and GA simply mounts a tick later for
 * everyone who isn't opted out.
 */
const COOKIE = "ga_optout"
const TWO_YEARS = 60 * 60 * 24 * 730

function isOptedOut(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").includes(`${COOKIE}=1`)
}

export default function AnalyticsGate({ gaId }: { gaId: string }) {
  // Render nothing until mounted so SSR and first client paint match (no
  // hydration mismatch); the effect then decides whether GA may load.
  const [mounted, setMounted] = useState(false)
  const [optedOut, setOptedOut] = useState(false)

  useEffect(() => {
    const noga = new URLSearchParams(window.location.search).get("noga")
    if (noga === "1") document.cookie = `${COOKIE}=1; path=/; max-age=${TWO_YEARS}; samesite=lax`
    else if (noga === "0") document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`
    setOptedOut(isOptedOut())
    setMounted(true)
  }, [])

  if (!mounted || optedOut) return null
  return <GoogleAnalytics gaId={gaId} />
}
