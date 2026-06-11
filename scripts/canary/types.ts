/**
 * Sitemap-lastmod canary: cheap change-detection over WordPress sources.
 *
 * Instead of re-pulling and re-classifying every feed daily, we poll each
 * source's sitemap (which carries a per-URL <lastmod>) and diff it against the
 * snapshot from the previous run. A brand-new URL is a discovery signal; a URL
 * whose lastmod moved is a "terms may have changed" signal. ~95% of URLs are
 * unchanged each run, so this costs almost nothing and never trips anti-bot.
 */

/**
 * How much we trust a source's numbers.
 *  - official:           the issuer/bank itself (e.g. citi.com). Authoritative terms.
 *  - primary_specialist: hand-curated bonus desks we corroborate against
 *                        (Doctor of Credit, BankBonus, Frequent Miler, US Credit Card Guide).
 *  - discovery_only:     useful for *finding* offers, never for publishing numbers
 *                        (AwardWallet, WalletHacks, MoneyCrashers, MyMillennialGuide,
 *                        MoneysMyLife, Fit Small Business, Hustler Money Blog).
 */
export type SourceAuthority = "official" | "primary_specialist" | "discovery_only"

export type CanarySource = {
  name: string
  /** The sitemap index (or a flat urlset) to crawl. */
  sitemap_url: string
  enabled: boolean
  /** Trust tier — gates how downstream consumers treat this source's signals. */
  authority: SourceAuthority
  /** Seconds between requests to this host. Honor each site's Crawl-delay. */
  throttle_seconds?: number
  /**
   * Only track URLs whose path matches this regex (case-insensitive). Keeps the
   * snapshot focused on offer/review pages and out of guides/about/etc.
   * Omit to track every URL in the sitemap.
   */
  include_path?: string
  /** Skip child sitemaps whose <loc> matches this (e.g. author/tag sitemaps). */
  exclude_sitemap?: string
}

/** One URL as seen in a sitemap. */
export type SitemapEntry = {
  url: string
  lastmod: string // ISO, or "" if the sitemap omitted it
}

/** Persisted per-source snapshot: url -> lastmod, plus run metadata. */
export type Snapshot = {
  source: string
  updated_at: string // ISO
  urls: Record<string, string>
}

export type ChangeKind = "new" | "changed" | "removed"

export type CanaryChange = {
  source: string
  kind: ChangeKind
  url: string
  /** Prior lastmod (for "changed"/"removed"); null for "new". */
  prev_lastmod: string | null
  /** Current lastmod (for "new"/"changed"); null for "removed". */
  curr_lastmod: string | null
  /** Derived tags from the URL path: "state", "offer", etc. */
  tags: string[]
}

/**
 * Outcome of crawling a single source.
 *  - healthy:    root + every child sitemap fetched and parsed. Safe to diff,
 *                emit "removed", and replace the snapshot.
 *  - incomplete: at least one child sitemap failed. The URL set is partial, so
 *                a "removed" might just be an unfetched child — suppress removed
 *                signals and DO NOT overwrite the snapshot.
 *  - failed:     the root sitemap itself couldn't be fetched/parsed. No usable
 *                data; skip entirely.
 */
export type CrawlStatus = "healthy" | "incomplete" | "failed"

export type CrawlResult = {
  entries: SitemapEntry[]
  status: CrawlStatus
  /** Count of child sitemaps that failed to fetch/parse (0 when healthy). */
  failedChildren: number
}

export type SourceResult = {
  source: string
  authority: SourceAuthority
  status: CrawlStatus
  /** True on the very first run for this source: snapshot seeded, no changes emitted. */
  baseline: boolean
  tracked: number
  changes: CanaryChange[]
}

/** What a change should trigger downstream. The canary never mutates the live catalog itself. */
export type RoutingAction = "discover" | "verify" | "quarantine_review"

/** One actionable routing row derived from a CanaryChange. */
export type RoutingEntry = {
  action: RoutingAction
  source: string
  authority: SourceAuthority
  url: string
  prev_lastmod: string | null
  curr_lastmod: string | null
  tags: string[]
  /** Human-readable why-this-row, e.g. "new URL on primary specialist". */
  reason: string
}
