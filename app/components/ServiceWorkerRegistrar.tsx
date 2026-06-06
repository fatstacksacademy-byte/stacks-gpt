"use client"

import { useEffect } from "react"

/**
 * Registers /sw.js so Stacks OS shows up as an installable PWA on Chrome,
 * Edge, Safari (iOS 16.4+), etc.  Browsers require an active service worker
 * before they'll show the install prompt; this hook is the registrar.
 *
 * Skips in dev — the dev server's HMR layer doesn't play nicely with
 * service workers and the constant reloads invalidate caches anyway.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal — log it for diagnostics but don't surface to the user.
          // eslint-disable-next-line no-console
          console.warn("[sw] registration failed:", err)
        })
    }

    // Defer registration until after page load so it doesn't compete with
    // initial route render for resources.
    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}
