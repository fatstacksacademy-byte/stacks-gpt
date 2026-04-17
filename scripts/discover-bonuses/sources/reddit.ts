import { REDDIT_THROTTLE_SECONDS, UA } from "../env"
import { throttleHost } from "../ratelimit"
import { log } from "../logger"
import type { RawItem, SourceConfig } from "../types"

// Reddit's public JSON endpoints. No auth required, but a non-default UA is mandatory.
// We treat URLs like https://www.reddit.com/r/churning/new.json?limit=50 as the entry point.

type RedditListing = {
  data: {
    children: { data: RedditPost }[]
  }
}

type RedditPost = {
  id: string
  title: string
  permalink: string
  url?: string // outbound link if link-post
  url_overridden_by_dest?: string
  selftext?: string
  selftext_html?: string | null
  created_utc: number
  over_18?: boolean
  stickied?: boolean
  link_flair_text?: string | null
}

export async function pullReddit(src: SourceConfig): Promise<RawItem[]> {
  // robots.txt on reddit.com allows /.json endpoints for named bots — still check
  const throttle = src.throttle_seconds ?? REDDIT_THROTTLE_SECONDS
  await throttleHost(src.url, throttle)

  let json: RedditListing
  try {
    const r = await fetch(src.url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      log("error", "reddit.fetch_failed", {
        source: src.name,
        status: r.status,
        statusText: r.statusText,
      })
      return []
    }
    json = (await r.json()) as RedditListing
  } catch (err) {
    log("error", "reddit.fetch_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }

  const posts = json?.data?.children ?? []
  const max = src.max_items ?? 50
  const raws: RawItem[] = []

  for (const { data: p } of posts.slice(0, max)) {
    if (p.over_18) continue
    // Extract outbound URLs: (1) the post's link target if it's a link-post,
    // (2) any URLs in the selftext HTML (we do NOT keep selftext itself).
    const outbound = new Set<string>()
    const linkTarget = p.url_overridden_by_dest || p.url
    if (linkTarget && !linkTarget.includes("reddit.com")) outbound.add(linkTarget)
    if (p.selftext_html) {
      for (const u of extractHrefs(decodeHtml(p.selftext_html))) {
        if (!u.includes("reddit.com")) outbound.add(u)
      }
    }

    raws.push({
      source_name: src.name,
      source_kind: "reddit",
      source_url: `https://www.reddit.com${p.permalink}`,
      title: p.title,
      published_at: new Date(p.created_utc * 1000).toISOString(),
      outbound_urls: Array.from(outbound).slice(0, 8),
      snippet: p.title.slice(0, 200),
    })
  }

  log("info", "reddit.pulled", { source: src.name, items: raws.length })
  return raws
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

function extractHrefs(html: string): string[] {
  const urls: string[] = []
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) urls.push(m[1])
  return urls
}
