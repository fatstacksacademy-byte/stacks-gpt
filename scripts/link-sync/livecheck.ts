/**
 * Live destination check. The deterministic registry diff catches links you've
 * already rotated; this catches the ones that died *without* you knowing —
 * the Amex case, where an expired referral returns HTTP 200 with a
 * "no longer available" page rather than a 404.
 *
 * Network-tolerant by design: a timeout or transient error returns "unknown",
 * never "dead", so a flaky fetch never triggers a destructive rewrite.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

// Statuses that mean "a bot was blocked", NOT "the link is dead". A real
// browser would load these fine, so we report "unknown" and never auto-act.
const SOFT_STATUSES = new Set([401, 403, 429])

// NOTE: we deliberately do NOT keep a broad generic expired-text list. JS-heavy
// issuer pages (e.g. Chase) embed hidden error templates like "…no longer
// available…" in the DOM of *valid* pages, which produced false positives.
// Dead detection now relies on HTTP status (404/410) plus the *precise*,
// per-program `expiredFingerprints` from the registry, scoped by domain.

export type LiveStatus = "alive" | "dead" | "unknown"

export interface LiveResult {
  url: string
  status: LiveStatus
  httpStatus?: number
  finalUrl?: string
  reason: string
}

export async function checkUrl(
  url: string,
  expiredFingerprints: string[] = [],
  timeoutMs = 12_000,
): Promise<LiveResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": UA, accept: "text/html,*/*" },
    })
    const finalUrl = res.url || url

    if (SOFT_STATUSES.has(res.status)) {
      return { url, status: "unknown", httpStatus: res.status, finalUrl, reason: `HTTP ${res.status} (bot-blocked — verify in a browser)` }
    }
    if (res.status >= 400) {
      return { url, status: "dead", httpStatus: res.status, finalUrl, reason: `HTTP ${res.status}` }
    }

    // 200 OK: only the precise, domain-scoped registry fingerprints can flag
    // dead here — no broad generics (they false-positive on hidden templates).
    if (expiredFingerprints.length) {
      const body = (await res.text()).slice(0, 200_000).toLowerCase()
      const hit = expiredFingerprints.map((f) => f.toLowerCase()).find((f) => body.includes(f))
      if (hit) {
        return { url, status: "dead", httpStatus: res.status, finalUrl, reason: `Expired-page marker: "${hit}"` }
      }
    }

    return { url, status: "alive", httpStatus: res.status, finalUrl, reason: "OK" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const aborted = msg.includes("abort")
    return { url, status: "unknown", reason: aborted ? "timeout" : `fetch error: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}
