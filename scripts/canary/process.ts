import { diff } from "./snapshot"
import type { CanaryChange, CanarySource, CrawlResult, Snapshot, SourceResult } from "./types"

export type ProcessOutcome = {
  result: SourceResult
  /** Entries to persist as the new snapshot, or null to preserve the prior one. */
  snapshotToSave: CrawlResult["entries"] | null
}

/**
 * Pure decision logic for a single source's crawl. Kept free of I/O so the
 * production-safety rules can be tested directly:
 *
 *  - failed crawl            → no changes, snapshot preserved (null).
 *  - incomplete first crawl  → no baseline seeded, snapshot preserved.
 *  - healthy first crawl     → baseline seeded (save), no changes emitted.
 *  - incomplete later crawl  → emit new/changed, DROP removed, preserve snapshot.
 *  - healthy later crawl     → emit new/changed/removed, save snapshot.
 */
export function processCrawl(
  src: Pick<CanarySource, "name" | "authority">,
  crawl: CrawlResult,
  prior: Snapshot | null,
): ProcessOutcome {
  const base = { source: src.name, authority: src.authority, status: crawl.status }

  if (crawl.status === "failed" || crawl.entries.length === 0) {
    return {
      result: { ...base, baseline: false, tracked: crawl.entries.length, changes: [] },
      snapshotToSave: null,
    }
  }

  if (!prior) {
    // Only seed a baseline from a complete crawl.
    if (crawl.status !== "healthy") {
      return {
        result: { ...base, baseline: false, tracked: crawl.entries.length, changes: [] },
        snapshotToSave: null,
      }
    }
    return {
      result: { ...base, baseline: true, tracked: crawl.entries.length, changes: [] },
      snapshotToSave: crawl.entries,
    }
  }

  let changes = diff(src.name, prior, crawl.entries)
  const incomplete = crawl.status !== "healthy"
  if (incomplete) {
    changes = changes.filter((c: CanaryChange) => c.kind !== "removed")
  }

  return {
    result: { ...base, baseline: false, tracked: crawl.entries.length, changes },
    snapshotToSave: incomplete ? null : crawl.entries,
  }
}
