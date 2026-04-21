/* eslint-disable @typescript-eslint/no-require-imports */
import type { Browser, BrowserContext } from "playwright"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

// Stealth-patched chromium. playwright-extra layers the puppeteer-extra stealth
// plugin (navigator.webdriver hiding, WebGL vendor spoofing, language/permissions
// shims) on top of the stock chromium executable. Drops fetch_error rate from
// ~30% to <5% on Amex/BMO/PNC/Citizens/KeyBank pages that previously 403'd or
// returned Cloudflare challenge HTML.
const { chromium } = require("playwright-extra") as {
  chromium: {
    use: (plugin: unknown) => void
    launch: (opts?: Record<string, unknown>) => Promise<Browser>
  }
}
const stealth = require("puppeteer-extra-plugin-stealth")()
chromium.use(stealth)

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

let _browser: Browser | null = null
let _context: BrowserContext | null = null
let _contextUA: string | null = null

async function launchBrowser(): Promise<Browser> {
  // Persistent profile dir so cookies/consent banners persist across runs —
  // boosts stealth (sites trust returning-visitor cookies) and avoids
  // re-showing EU consent overlays that obscure the offer content.
  const profileDir = join(process.cwd(), ".cache", "playwright-profile")
  if (!existsSync(profileDir)) mkdirSync(profileDir, { recursive: true })

  return chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-features=IsolateOrigins,site-per-process",
      `--user-data-dir=${profileDir}`,
    ],
  })
}

export async function getContext(userAgent: string = DEFAULT_UA): Promise<BrowserContext> {
  if (_context && _contextUA === userAgent) return _context
  if (_context) {
    await _context.close()
    _context = null
  }
  if (!_browser) _browser = await launchBrowser()
  _context = await _browser.newContext({
    userAgent,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: REAL_CHROME_HEADERS,
  })
  _contextUA = userAgent
  return _context
}

export async function closeBrowser() {
  if (_context) await _context.close()
  if (_browser) await _browser.close()
  _context = null
  _browser = null
  _contextUA = null
}

/**
 * Fetch a page with retries. Anti-bot protection layers sometimes require
 * a second request with slightly different timing — the stealth plugin
 * survives this, naive Playwright doesn't.
 */
async function fetchOnce(url: string, timeoutMs: number, userAgent: string | undefined): Promise<FetchResult> {
  const ctx = await getContext(userAgent)
  const page = await ctx.newPage()
  const fetchedAt = new Date().toISOString()

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
    await page.close()
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
