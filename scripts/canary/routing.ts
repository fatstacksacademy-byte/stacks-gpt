import type { CanaryChange, RoutingAction, RoutingEntry, SourceResult } from "./types"

const ACTION_BY_KIND: Record<CanaryChange["kind"], RoutingAction> = {
  new: "discover",
  changed: "verify",
  removed: "quarantine_review",
}

function reasonFor(change: CanaryChange, authority: SourceResult["authority"]): string {
  const what =
    change.kind === "new"
      ? "new URL"
      : change.kind === "changed"
        ? "lastmod changed"
        : "URL disappeared from sitemap"
  return `${what} on ${authority} source`
}

/**
 * Turn a run's changes into structured routing rows. This is advisory only —
 * downstream discovery/verify jobs decide what to do; the canary never edits the
 * live catalog. "removed" becomes quarantine_review (a human/job confirms the
 * offer is actually dead before anything is pulled), never an auto-delete.
 *
 * Incomplete crawls have already had their "removed" changes suppressed upstream
 * in the runner, so a quarantine_review row here always came from a healthy crawl.
 */
export function buildRouting(results: SourceResult[]): RoutingEntry[] {
  const rows: RoutingEntry[] = []
  for (const r of results) {
    for (const c of r.changes) {
      rows.push({
        action: ACTION_BY_KIND[c.kind],
        source: r.source,
        authority: r.authority,
        url: c.url,
        prev_lastmod: c.prev_lastmod,
        curr_lastmod: c.curr_lastmod,
        tags: c.tags,
        reason: reasonFor(c, r.authority),
      })
    }
  }
  return rows
}
