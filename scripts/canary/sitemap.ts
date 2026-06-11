import { XMLParser } from "fast-xml-parser"
import { UA } from "../discover-bonuses/env"
import { throttleHost } from "../discover-bonuses/ratelimit"
import { isAllowed } from "../discover-bonuses/robots"
import { log } from "./logger"
import type { CanarySource, CrawlResult, SitemapEntry } from "./types"

const parser = new XMLParser({ ignoreAttributes: false, trimValues: true })

type SitemapNode = { loc?: string; lastmod?: string }

function asArray<T>(v: T | T[] | undefined): T[] {
  return Array.isArray(v) ? v : v ? [v] : []
}

async function fetchXml(url: string, src: CanarySource): Promise<string | null> {
  if (!(await isAllowed(url))) {
    log("warn", "sitemap.skipped_by_robots", { source: src.name, url })
    return null
  }
  await throttleHost(url, src.throttle_seconds)
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) {
      log("error", "sitemap.fetch_failed", { source: src.name, url, status: r.status })
      return null
    }
    return await r.text()
  } catch (err) {
    log("error", "sitemap.fetch_error", {
      source: src.name,
      url,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Crawl a sitemap (index or flat urlset) and return every URL with its lastmod,
 * plus a crawl status. Follows one level of <sitemapindex> into child <urlset>
 * documents.
 *
 * The status is the critical production-safety signal: a partial crawl (some
 * child sitemap unreachable) must NOT be mistaken for offers being removed, so
 * we report `incomplete` and let the caller suppress "removed" + keep the prior
 * snapshot. A root failure is `failed` (no usable data at all).
 */
export async function crawlSitemap(src: CanarySource): Promise<CrawlResult> {
  const root = await fetchXml(src.sitemap_url, src)
  if (!root) return { entries: [], status: "failed", failedChildren: 0 }

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(root) as Record<string, unknown>
  } catch (err) {
    log("error", "sitemap.parse_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return { entries: [], status: "failed", failedChildren: 0 }
  }

  const includeRe = src.include_path ? new RegExp(src.include_path, "i") : null
  const excludeSitemapRe = src.exclude_sitemap ? new RegExp(src.exclude_sitemap, "i") : null

  // Case 1: sitemap index — recurse into child sitemaps.
  const index = parsed.sitemapindex as { sitemap?: SitemapNode | SitemapNode[] } | undefined
  if (index) {
    const children = asArray(index.sitemap)
      .map((s) => s.loc)
      .filter((loc): loc is string => !!loc && !(excludeSitemapRe?.test(loc) ?? false))

    const entries: SitemapEntry[] = []
    let failedChildren = 0
    for (const child of children) {
      const text = await fetchXml(child, src)
      if (!text) {
        failedChildren++
        continue
      }
      try {
        const childParsed = parser.parse(text) as { urlset?: { url?: SitemapNode | SitemapNode[] } }
        entries.push(...collectUrls(childParsed.urlset?.url, includeRe))
      } catch {
        failedChildren++
        log("warn", "sitemap.child_parse_error", { source: src.name, url: child })
      }
    }
    const status = failedChildren > 0 ? "incomplete" : "healthy"
    if (status === "incomplete") {
      log("warn", "sitemap.incomplete", { source: src.name, failedChildren, children: children.length })
    }
    return { entries, status, failedChildren }
  }

  // Case 2: flat urlset — root already fetched/parsed, so this is healthy.
  const urlset = parsed.urlset as { url?: SitemapNode | SitemapNode[] } | undefined
  return { entries: collectUrls(urlset?.url, includeRe), status: "healthy", failedChildren: 0 }
}

function collectUrls(
  nodes: SitemapNode | SitemapNode[] | undefined,
  includeRe: RegExp | null,
): SitemapEntry[] {
  const out: SitemapEntry[] = []
  for (const n of asArray(nodes)) {
    if (!n.loc) continue
    let path: string
    try {
      path = new URL(n.loc).pathname
    } catch {
      continue
    }
    if (includeRe && !includeRe.test(path)) continue
    out.push({ url: n.loc, lastmod: normalizeLastmod(n.lastmod) })
  }
  return out
}

/** Normalize lastmod to a stable ISO string; "" when absent/unparseable. */
function normalizeLastmod(raw: string | undefined): string {
  if (!raw) return ""
  const t = Date.parse(raw)
  return Number.isNaN(t) ? String(raw) : new Date(t).toISOString()
}
