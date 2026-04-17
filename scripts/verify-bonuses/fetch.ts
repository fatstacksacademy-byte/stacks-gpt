import { chromium, Browser, BrowserContext } from "playwright"
import { createHash } from "node:crypto"
import type { FetchResult } from "./types"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"

let _browser: Browser | null = null
let _context: BrowserContext | null = null

export async function getContext(): Promise<BrowserContext> {
  if (_context) return _context
  _browser = await chromium.launch({ headless: true })
  _context = await _browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  })
  return _context
}

export async function closeBrowser() {
  if (_context) await _context.close()
  if (_browser) await _browser.close()
  _context = null
  _browser = null
}

export async function fetchPage(url: string, timeoutMs = 30000): Promise<FetchResult> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  const fetchedAt = new Date().toISOString()

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    })

    // Small settle time for JS-rendered content (banks often lazy-load promo details)
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})

    const status = response?.status() ?? 0
    const finalUrl = page.url()
    const redirected = new URL(finalUrl).href !== new URL(url).href

    // Prefer main content text; fall back to body
    const textContent = await page.evaluate(() => {
      const main =
        document.querySelector("main") ||
        document.querySelector("[role=main]") ||
        document.body
      return (main?.innerText || "").replace(/\s+/g, " ").trim()
    })

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
