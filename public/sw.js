/* eslint-disable no-restricted-globals */
/**
 * Stacks OS service worker.
 *
 * Goals (kept narrow on purpose):
 *   1. Make the app installable — a service worker that registers is one of
 *      the requirements browsers check before showing the install prompt.
 *   2. Provide an offline fallback so the app shell loads even when the
 *      user is offline — critical when they tap the home-screen icon on
 *      a flaky connection.
 *
 * Strategy:
 *   - Pre-cache a tiny app shell at install (offline page, manifest, icon)
 *   - For navigation requests (HTML pages): network-first, fall back to
 *     the cached offline page if both network and a cached HTML response
 *     are unavailable.
 *   - For everything else (API, JSON, JS, CSS, images): network-first with
 *     no special caching. We deliberately do NOT cache API responses
 *     because the user's bonus tracking + verification state must always
 *     reflect server truth.
 *
 * Cache bump pattern: when changing this file, bump CACHE_VERSION. The
 * activate handler purges any cache that doesn't match the current name,
 * which is what releases the update to existing installed users.
 */

const CACHE_VERSION = "stacksos-v1"
const APP_SHELL = ["/offline", "/icon", "/apple-icon", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request

  // Only intercept GETs. POSTs / PUTs / etc. go straight to the network.
  if (req.method !== "GET") return

  // Bail out for cross-origin requests (analytics, Stripe, etc.) — let
  // them pass through unmodified.
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigation requests: network-first, with the offline page as the last
  // resort. This is what makes the installed app "work" while offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_VERSION)
        const offline = await cache.match("/offline")
        return offline ?? new Response("Offline", { status: 503 })
      }),
    )
    return
  }

  // Static assets: serve from cache when present, otherwise network.
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req)
        if (cached) return cached
        const resp = await fetch(req)
        if (resp.ok) cache.put(req, resp.clone())
        return resp
      }),
    )
    return
  }

  // Everything else (API, JSON, JS, CSS, images): network-first, no cache.
  // We don't want stale user data — bonus tracking should always reflect
  // server truth.
})
