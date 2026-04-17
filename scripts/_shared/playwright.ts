import { chromium, Browser, BrowserContext } from "playwright"
import { createHash } from "node:crypto"

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

let _browser: Browser | null = null
let _context: BrowserContext | null = null
let _contextUA: string | null = null

export async function getContext(userAgent: string = DEFAULT_UA): Promise<BrowserContext> {
  if (_context && _contextUA === userAgent) return _context
  if (_context) {
    await _context.close()
    _context = null
  }
  if (!_browser) _browser = await chromium.launch({ headless: true })
  _context = await _browser.newContext({
    userAgent,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
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

export async function fetchPage(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {},
): Promise<FetchResult> {
  const { timeoutMs = 30000, userAgent } = opts
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
