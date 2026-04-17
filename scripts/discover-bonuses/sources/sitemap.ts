import { XMLParser } from "fast-xml-parser"
import { UA } from "../env"
import { throttleHost } from "../ratelimit"
import { isAllowed } from "../robots"
import { log } from "../logger"
import type { RawItem, SourceConfig } from "../types"

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true })

type SitemapUrl = { loc?: string; lastmod?: string }

export async function pullSitemap(src: SourceConfig): Promise<RawItem[]> {
  if (!(await isAllowed(src.url))) {
    log("warn", "sitemap.skipped_by_robots", { source: src.name })
    return []
  }
  await throttleHost(src.url, src.throttle_seconds)

  let text: string
  try {
    const r = await fetch(src.url, {
      headers: { "User-Agent": UA, Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) {
      log("error", "sitemap.fetch_failed", { source: src.name, status: r.status })
      return []
    }
    text = await r.text()
  } catch (err) {
    log("error", "sitemap.fetch_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(text) as Record<string, unknown>
  } catch (err) {
    log("error", "sitemap.parse_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  const urlset = parsed.urlset as { url?: SitemapUrl | SitemapUrl[] } | undefined
  const urls: SitemapUrl[] = Array.isArray(urlset?.url)
    ? urlset.url
    : urlset?.url
      ? [urlset.url]
      : []

  // Filter to likely-offer pages (heuristic: URL path contains "bonus", "promo", "offer")
  const max = src.max_items ?? 50
  const relevant = urls
    .filter((u) => u.loc && /bonus|promo|offer/i.test(u.loc))
    .sort((a, b) => {
      // newest first
      const at = a.lastmod ? Date.parse(a.lastmod) : 0
      const bt = b.lastmod ? Date.parse(b.lastmod) : 0
      return bt - at
    })
    .slice(0, max)

  const raws: RawItem[] = relevant.map((u) => ({
    source_name: src.name,
    source_kind: "sitemap",
    source_url: u.loc!,
    title: slugToTitle(u.loc!),
    published_at: u.lastmod ? new Date(u.lastmod).toISOString() : null,
    outbound_urls: [],
    snippet: slugToTitle(u.loc!),
  }))

  log("info", "sitemap.pulled", { source: src.name, items: raws.length })
  return raws
}

function slugToTitle(url: string): string {
  try {
    const path = new URL(url).pathname
    const last = path.split("/").filter(Boolean).pop() ?? ""
    return last.replace(/[-_]+/g, " ").replace(/\.\w+$/, "").trim().slice(0, 200)
  } catch {
    return ""
  }
}
