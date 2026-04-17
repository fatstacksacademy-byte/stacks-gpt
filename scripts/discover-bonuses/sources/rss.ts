import { XMLParser } from "fast-xml-parser"
import { UA } from "../env"
import { throttleHost } from "../ratelimit"
import { isAllowed } from "../robots"
import { log } from "../logger"
import type { RawItem, SourceConfig } from "../types"

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: true,
  trimValues: true,
})

type RssItem = {
  title?: string | { "#text"?: string }
  link?: string
  pubDate?: string
  description?: string | { "#text"?: string }
  "content:encoded"?: string
  guid?: string | { "#text"?: string }
}

export async function pullRss(src: SourceConfig): Promise<RawItem[]> {
  if (!(await isAllowed(src.url))) {
    log("warn", "rss.skipped_by_robots", { source: src.name, url: src.url })
    return []
  }
  await throttleHost(src.url, src.throttle_seconds)

  let text: string
  try {
    const r = await fetch(src.url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      log("error", "rss.fetch_failed", { source: src.name, status: r.status })
      return []
    }
    text = await r.text()
  } catch (err) {
    log("error", "rss.fetch_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  let parsed: Record<string, unknown>
  try {
    parsed = parser.parse(text) as Record<string, unknown>
  } catch (err) {
    log("error", "rss.parse_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  const channel = extractChannel(parsed)
  const items = Array.isArray(channel?.item)
    ? channel.item
    : channel?.item
      ? [channel.item]
      : []

  const max = src.max_items ?? 40
  const limited = (items as RssItem[]).slice(0, max)

  const raws: RawItem[] = limited.map((it) => toRaw(src, it))
  log("info", "rss.pulled", { source: src.name, items: raws.length })
  return raws
}

function extractChannel(parsed: Record<string, unknown>): { item?: RssItem | RssItem[] } {
  const rss = parsed.rss as { channel?: { item?: RssItem | RssItem[] } } | undefined
  if (rss?.channel) return rss.channel
  // Atom fallback: items under "feed.entry"
  const feed = parsed.feed as { entry?: RssItem | RssItem[] } | undefined
  if (feed?.entry) return { item: feed.entry }
  return {}
}

function textOf(v: unknown): string {
  if (typeof v === "string") return v
  if (v && typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"] ?? "")
  }
  return ""
}

function toRaw(src: SourceConfig, item: RssItem): RawItem {
  const title = textOf(item.title).trim()
  const link =
    typeof item.link === "string"
      ? item.link
      : (item as { link?: { "@_href"?: string } }).link?.["@_href"] || ""
  const desc = textOf(item.description).trim()
  // outbound URLs from description (stripped of HTML). We do NOT keep the description text itself.
  const outbound = extractHrefs(
    (item as { "content:encoded"?: string })["content:encoded"] || desc,
  ).filter((u) => {
    try {
      return new URL(u).host !== new URL(link).host
    } catch {
      return false
    }
  })

  return {
    source_name: src.name,
    source_kind: "rss",
    source_url: link,
    title,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    outbound_urls: Array.from(new Set(outbound)).slice(0, 8),
    // snippet = title only (avoid copying body copy)
    snippet: title.slice(0, 200),
  }
}

function extractHrefs(html: string): string[] {
  const urls: string[] = []
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) urls.push(m[1])
  return urls
}
