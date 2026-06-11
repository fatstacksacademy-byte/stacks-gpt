import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { CanaryChange, SitemapEntry, Snapshot } from "./types"

/**
 * Snapshot persistence boundary.
 *
 * The canary's whole value depends on the snapshot surviving between runs.
 * Today that's a local JSON file per source (gitignored), which means the
 * canary CANNOT run in a stateless cloud routine — a fresh checkout has no
 * snapshots and re-baselines every source, emitting nothing. To run durably in
 * GitHub Actions / a remote scheduler, the snapshot layer must move to a shared
 * store. Everything routes through this interface so swapping in Supabase is a
 * single new implementation, no caller changes.
 *
 * ── Supabase schema required to move off the filesystem ──────────────────────
 *   table  canary_snapshots
 *     source      text         primary key   -- CanarySource.name
 *     updated_at  timestamptz  not null       -- Snapshot.updated_at
 *     urls        jsonb        not null        -- Record<url, lastmod>
 *   -- (RLS: service-role only; the canary runs server-side, never client.)
 *
 *   Optional, if we'd rather store one row per URL than a jsonb blob
 *   (better for indexing / incremental updates at scale):
 *   table  canary_snapshot_urls
 *     source      text         not null
 *     url         text         not null
 *     lastmod     text         not null        -- "" when sitemap omitted it
 *     updated_at  timestamptz  not null
 *     primary key (source, url)
 *
 * A SupabaseSnapshotStore would implement `load`/`save` against either shape;
 * `save` must be transactional per source so a partial write can't corrupt a
 * baseline (mirrors the "only save on healthy crawl" rule the runner enforces).
 */
export interface SnapshotStore {
  load(source: string): Snapshot | null
  save(source: string, entries: SitemapEntry[]): void
}

const SNAP_DIR = join(process.cwd(), "scripts", "canary", "snapshots")

function snapPath(source: string): string {
  return join(SNAP_DIR, `${source}.json`)
}

function entriesToUrls(entries: SitemapEntry[]): Record<string, string> {
  const urls: Record<string, string> = {}
  for (const e of entries) urls[e.url] = e.lastmod
  return urls
}

/** Current implementation: one JSON file per source under scripts/canary/snapshots/. */
export const fileSnapshotStore: SnapshotStore = {
  load(source) {
    const p = snapPath(source)
    if (!existsSync(p)) return null
    try {
      return JSON.parse(readFileSync(p, "utf8")) as Snapshot
    } catch {
      return null
    }
  },
  save(source, entries) {
    if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true })
    const snap: Snapshot = {
      source,
      updated_at: new Date().toISOString(),
      urls: entriesToUrls(entries),
    }
    writeFileSync(snapPath(source), JSON.stringify(snap, null, 2))
  },
}

/** Thin back-compat wrappers over the default (filesystem) store. */
export function loadSnapshot(source: string, store: SnapshotStore = fileSnapshotStore): Snapshot | null {
  return store.load(source)
}

export function saveSnapshot(source: string, entries: SitemapEntry[], store: SnapshotStore = fileSnapshotStore) {
  store.save(source, entries)
}

/** Diff freshly-crawled entries against the prior snapshot. */
export function diff(
  source: string,
  prior: Snapshot,
  entries: SitemapEntry[],
): CanaryChange[] {
  const changes: CanaryChange[] = []
  const seen = new Set<string>()

  for (const e of entries) {
    seen.add(e.url)
    const prev = prior.urls[e.url]
    if (prev === undefined) {
      changes.push(mk(source, "new", e.url, null, e.lastmod))
    } else if (prev !== e.lastmod) {
      // A lastmod that only moved backwards (clock skew / re-publish glitch) is
      // still worth surfacing, but flag genuine forward moves as the strong case.
      changes.push(mk(source, "changed", e.url, prev, e.lastmod))
    }
  }

  for (const url of Object.keys(prior.urls)) {
    if (!seen.has(url)) {
      changes.push(mk(source, "removed", url, prior.urls[url], null))
    }
  }

  return changes
}

function mk(
  source: string,
  kind: CanaryChange["kind"],
  url: string,
  prev: string | null,
  curr: string | null,
): CanaryChange {
  return { source, kind, url, prev_lastmod: prev, curr_lastmod: curr, tags: tagsFor(url) }
}

/** Cheap URL-path tags so the digest can prioritize offer/state pages. */
export function tagsFor(url: string): string[] {
  let path = ""
  try {
    path = new URL(url).pathname.toLowerCase()
  } catch {
    return []
  }
  const tags: string[] = []
  if (/state|promotions-by-state/.test(path)) tags.push("state")
  if (/bonus|promo|offer/.test(path)) tags.push("offer")
  if (/review/.test(path)) tags.push("review")
  if (/\/best\//.test(path)) tags.push("best-list")
  return tags
}
