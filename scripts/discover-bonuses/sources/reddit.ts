import { REDDIT_THROTTLE_SECONDS, UA, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET } from "../env"
import { throttleHost } from "../ratelimit"
import { log } from "../logger"
import type { RawItem, SourceConfig } from "../types"

// Reddit endpoints. As of mid-2025 the public /.json paths return 403 for
// unauthenticated callers, so when REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are
// set we acquire a client-credentials OAuth token and hit the authenticated
// oauth.reddit.com mirror instead. Without credentials we fall through to the
// unauthenticated request (which usually 403s now — kept for parity).
//
// We treat URLs like https://www.reddit.com/r/churning/new.json?limit=50 as
// the entry point. When using OAuth we rewrite the host to oauth.reddit.com,
// which is required because www.reddit.com rejects Bearer tokens.

// In-memory token cache. Tokens last 1 hour; discover runs finish in minutes.
let tokenCache: { token: string; expiresAt: number } | null = null

async function getOAuthToken(): Promise<string | null> {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) return null
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) return tokenCache.token

  const basic = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64")
  try {
    const r = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      log("error", "reddit.oauth_failed", { status: r.status, statusText: r.statusText })
      return null
    }
    const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: string }
    if (!j.access_token) {
      log("error", "reddit.oauth_no_token", { body: JSON.stringify(j).slice(0, 200) })
      return null
    }
    const ttlMs = (j.expires_in ?? 3600) * 1000
    tokenCache = { token: j.access_token, expiresAt: Date.now() + ttlMs }
    return j.access_token
  } catch (err) {
    log("error", "reddit.oauth_error", { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

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
  const throttle = src.throttle_seconds ?? REDDIT_THROTTLE_SECONDS
  await throttleHost(src.url, throttle)

  // When OAuth credentials are set, rewrite the host to oauth.reddit.com and
  // attach Bearer auth. The path + query are preserved, so existing source
  // entries pointing at www.reddit.com keep working transparently.
  const token = await getOAuthToken()
  let fetchUrl = src.url
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "application/json" }
  if (token) {
    try {
      const u = new URL(src.url)
      u.host = "oauth.reddit.com"
      fetchUrl = u.toString()
      headers.Authorization = `Bearer ${token}`
    } catch {
      // Bad URL — fall through with the original.
    }
  }

  let json: RedditListing
  try {
    const r = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) {
      log("error", "reddit.fetch_failed", {
        source: src.name,
        status: r.status,
        statusText: r.statusText,
        authed: Boolean(token),
        hint: token ? undefined : "Set REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET — Reddit blocks unauthenticated JSON now",
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
