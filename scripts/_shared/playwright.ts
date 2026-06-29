/* eslint-disable @typescript-eslint/no-require-imports */
import type { BrowserContext, Page } from "playwright"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

// Stealth-patched chromium. playwright-extra layers the puppeteer-extra stealth
// plugin (navigator.webdriver hiding, WebGL vendor spoofing, language/permissions
// shims) on top of the stock chromium executable. Drops fetch_error rate from
// ~30% to <5% on Amex/BMO/PNC/Citizens/KeyBank pages that previously 403'd or
// returned Cloudflare challenge HTML.
const { chromium } = require("playwright-extra") as {
  chromium: {
    use: (plugin: unknown) => void
    launchPersistentContext: (
      userDataDir: string,
      opts?: Record<string, unknown>,
    ) => Promise<BrowserContext>
  }
}
const stealth = require("puppeteer-extra-plugin-stealth")()
chromium.use(stealth)

// Errors that mean "the browser / context / page went away" — expected during
// teardown, or when Chromium crashes mid-run (OOM on a memory-starved CI runner
// after ~1k page loads). We recover from these instead of letting them abort a
// 1000+ item verify run.
const BROWSER_GONE_RX =
  /(Target (page, context or browser )?(has been )?closed|Target closed|Session closed|Browser has been closed|browser has (been closed|disconnected)|Execution context was destroyed|Protocol error|cdpSession)/i

function isBrowserGone(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return BROWSER_GONE_RX.test(msg)
}

// playwright-extra's stealth plugin fires CDP commands on each new page
// asynchronously (navigator.webdriver hiding, WebGL spoofing, etc.). If the
// target closes mid-flight — Chromium crash, or our own page.close() — that
// send() rejects with no owner, and Node's default unhandled-rejection policy
// kills the whole process with exit 1. That's exactly what aborted the
// 2026-06-28 weekly run at bonus 176/267, before persist could write anything.
// Swallow the browser-teardown class (the corresponding fetch already returned
// a fetch_error through our own try/catch) and preserve fail-fast for real bugs.
let _rejectionGuardInstalled = false
function installRejectionGuard(): void {
  if (_rejectionGuardInstalled) return
  _rejectionGuardInstalled = true
  process.on("unhandledRejection", (reason) => {
    if (isBrowserGone(reason)) {
      console.warn(
        `[playwright] swallowed post-teardown rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      )
      return
    }
    console.error("Unhandled rejection:", reason)
    process.exit(1)
  })
}
installRejectionGuard()

export type FetchResult = {
  url: string
  ok: boolean
  status: number
  finalUrl: string
  redirected: boolean
  textContent: string
  htmlHash: string
  fetchedAt: string
  error?: string
}

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"

// Headers a real Chrome sends that naive Playwright doesn't — anti-bot WAFs
// (Akamai, PerimeterX) fingerprint on these being absent.
const REAL_CHROME_HEADERS: Record<string, string> = {
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Chromium";v="129", "Not=A?Brand";v="8", "Google Chrome";v="129"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
}

let _context: BrowserContext | null = null
let _contextUA: string | null = null
// Single-flight latch: CONCURRENCY parallel fetches must not each launch a
// context — concurrent launches race on Chromium's user-data-dir lock.
let _launching: Promise<BrowserContext> | null = null

// Persistent profile dir so cookies/consent banners persist across runs —
// boosts stealth (sites trust returning-visitor cookies) and avoids
// re-showing EU consent overlays that obscure the offer content.
// Must use launchPersistentContext (not launch + --user-data-dir) — recent
// Playwright refuses the flag-based form and directs callers to this API.
async function launchContext(userAgent: string): Promise<BrowserContext> {
  // Profile dir lives in os.tmpdir() instead of {cwd}/.cache so Turbopack's
  // static analyzer doesn't treat the path as a project-relative glob. The
  // old `.cache/playwright-profile` location was matching 26k+ files during
  // build analysis and emitting an "overly broad pattern" warning. Vercel
  // serverless restarts wipe /tmp anyway, so the cache lifetime is
  // appropriate for both local (persisted across script invocations) and
  // serverless (recreated per cold start) — exactly what stealth cookies
  // need without leaking into the deploy bundle.
  const profileDir = join(tmpdir(), "fsa-playwright-profile")
  if (!existsSync(profileDir)) mkdirSync(profileDir, { recursive: true })

  return chromium.launchPersistentContext(profileDir, {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
    userAgent,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: REAL_CHROME_HEADERS,
  })
}

async function ensureContext(userAgent: string): Promise<BrowserContext> {
  if (_context && _contextUA === userAgent) return _context
  if (_context) {
    // UA changed — drop the old context before launching the replacement.
    try {
      await _context.close()
    } catch {}
    _context = null
    _contextUA = null
  }
  const ctx = await launchContext(userAgent)
  // When Chromium crashes (OOM on CI after ~1k page loads) the persistent
  // context emits 'close'. Null our handle so the next getContext() relaunches
  // a fresh browser instead of handing back the dead one — the cause of the
  // fetch_error cascade we saw at bonus 168→176 on 2026-06-28.
  ctx.once("close", () => {
    if (_context === ctx) {
      _context = null
      _contextUA = null
    }
  })
  _context = ctx
  _contextUA = userAgent
  return ctx
}

export async function getContext(userAgent: string = DEFAULT_UA): Promise<BrowserContext> {
  // Fast path: a live context with the right UA and no launch in flight.
  if (!_launching && _context && _contextUA === userAgent) return _context
  // Coalesce concurrent callers behind one launch. The assignment is atomic
  // w.r.t. other callers — JS runs this synchronously up to the await below, so
  // a second caller always observes the in-flight latch rather than re-launching.
  if (!_launching) _launching = ensureContext(userAgent)
  try {
    return await _launching
  } finally {
    _launching = null
  }
}

export async function closeBrowser() {
  _launching = null
  const ctx = _context
  _context = null
  _contextUA = null
  if (ctx) {
    try {
      await ctx.close()
    } catch {}
  }
}

/**
 * Open a page, recovering from a context that died between getContext() and
 * newPage() — Chromium can crash a tick before its 'close' event fires, so the
 * cached context may still look live. On a browser-gone error we relaunch once;
 * any other error propagates to the caller's try/catch.
 */
async function newPageResilient(userAgent: string | undefined): Promise<Page> {
  const ua = userAgent ?? DEFAULT_UA
  let ctx = await getContext(ua)
  try {
    return await ctx.newPage()
  } catch (err) {
    if (!isBrowserGone(err)) throw err
    // Force a relaunch: null the handle only if it's still the dead one (an
    // identity guard so we never clobber a context another fetch just launched).
    if (_context === ctx) {
      _context = null
      _contextUA = null
    }
    ctx.close().catch(() => {})
    ctx = await getContext(ua)
    return await ctx.newPage()
  }
}

/**
 * Fetch a page and return its post-hydration HTML — the full DOM
 * markup including every anchor — instead of the readable-text form
 * that fetchPage() returns.
 *
 * Use this for scraping anchor lists on SPA-rendered pages
 * (Amex, Citi, BofA "all credit cards" indexes) where a naive
 * `fetch()` only sees the React shell. fetchPage() runs
 * `main.innerText` which strips <a> markup and breaks anchor regexes.
 *
 * Caller responsibility: this returns LARGE strings (Amex card index
 * is ~800KB). Run a tight href regex over the result and discard.
 */
export async function fetchRenderedHtml(
  url: string,
  opts: { userAgent?: string; timeoutMs?: number; waitForSelector?: string } = {},
): Promise<{ ok: boolean; status: number; html: string; finalUrl: string; error?: string }> {
  let page: Page
  try {
    page = await newPageResilient(opts.userAgent)
  } catch (err) {
    return {
      ok: false,
      status: 0,
      html: "",
      finalUrl: url,
      error: err instanceof Error ? err.message : String(err),
    }
  }
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: opts.timeoutMs ?? 30000,
    })
    // Wait for either an opt-in selector or a brief network-idle window so
    // SPA hydration has a chance to render the card grid. We give up
    // after a short bound — pages that never settle still return useful
    // HTML, we just won't have the fully populated grid.
    if (opts.waitForSelector) {
      await page.waitForSelector(opts.waitForSelector, { timeout: 12000 }).catch(() => {})
    } else {
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {})
    }
    const html = await page.content()
    const status = response?.status() ?? 0
    return {
      ok: status >= 200 && status < 400 && html.length > 0,
      status,
      html,
      finalUrl: page.url(),
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      html: "",
      finalUrl: url,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * Fetch a page with retries. Anti-bot protection layers sometimes require
 * a second request with slightly different timing — the stealth plugin
 * survives this, naive Playwright doesn't.
 */
async function fetchOnce(url: string, timeoutMs: number, userAgent: string | undefined): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString()
  let page: Page
  try {
    page = await newPageResilient(userAgent)
  } catch (err) {
    return {
      url,
      ok: false,
      status: 0,
      finalUrl: url,
      redirected: false,
      textContent: "",
      htmlHash: "",
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    })

    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})

    const status = response?.status() ?? 0
    const finalUrl = page.url()
    const redirected = new URL(finalUrl).href !== new URL(url).href

    let textContent = ""
    try {
      textContent = await page.evaluate(() => {
        const main =
          document.querySelector("main") ||
          document.querySelector("[role=main]") ||
          document.body
        return (main?.innerText || "").replace(/\s+/g, " ").trim()
      })
    } catch (evalErr) {
      const msg = evalErr instanceof Error ? evalErr.message : String(evalErr)
      if (/eval is disabled|Content Security Policy/i.test(msg)) {
        const html = await page.content()
        textContent = html
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
          .replace(/\s+/g, " ")
          .trim()
      } else {
        throw evalErr
      }
    }

    const htmlHash = createHash("sha256").update(textContent).digest("hex").slice(0, 16)

    return {
      url,
      ok: status >= 200 && status < 400,
      status,
      finalUrl,
      redirected,
      textContent,
      htmlHash,
      fetchedAt,
    }
  } catch (err) {
    return {
      url,
      ok: false,
      status: 0,
      finalUrl: url,
      redirected: false,
      textContent: "",
      htmlHash: "",
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    await page.close().catch(() => {})
  }
}

const RETRYABLE_ERROR_PATTERNS = [
  /ERR_HTTP2_PROTOCOL_ERROR/i,
  /ERR_CONNECTION_CLOSED/i,
  /ERR_CONNECTION_RESET/i,
  /ERR_TIMED_OUT/i,
  /net::ERR_/i,
]
const RETRYABLE_STATUS = new Set([403, 429, 503])

export async function fetchPage(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {},
): Promise<FetchResult> {
  const { timeoutMs = 30000, userAgent } = opts

  // First attempt
  let r = await fetchOnce(url, timeoutMs, userAgent)

  // Retry once with a short delay if we hit a transient anti-bot signal.
  // Stealth plugin sometimes needs a second touch before the WAF clears it.
  const shouldRetry =
    RETRYABLE_STATUS.has(r.status) ||
    (r.error && RETRYABLE_ERROR_PATTERNS.some((rx) => rx.test(r.error!)))
  if (shouldRetry) {
    await new Promise((res) => setTimeout(res, 2500 + Math.floor(Math.random() * 1500)))
    r = await fetchOnce(url, timeoutMs, userAgent)
  }

  return r
}
