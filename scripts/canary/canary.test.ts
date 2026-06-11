import { describe, expect, it } from "vitest"
import { diff } from "./snapshot"
import { processCrawl } from "./process"
import { buildRouting } from "./routing"
import { runId } from "./digest"
import type { CrawlResult, Snapshot, SitemapEntry } from "./types"

const SRC = { name: "test-src", authority: "primary_specialist" as const }

function snap(urls: Record<string, string>): Snapshot {
  return { source: SRC.name, updated_at: "2026-06-10T00:00:00.000Z", urls }
}

function crawl(entries: SitemapEntry[], status: CrawlResult["status"] = "healthy"): CrawlResult {
  return { entries, status, failedChildren: status === "incomplete" ? 1 : 0 }
}

describe("diff", () => {
  it("detects new, changed, and removed URLs", () => {
    const prior = snap({
      "https://x.com/a": "2026-06-01T00:00:00.000Z",
      "https://x.com/b": "2026-06-01T00:00:00.000Z",
    })
    const entries: SitemapEntry[] = [
      { url: "https://x.com/a", lastmod: "2026-06-01T00:00:00.000Z" }, // unchanged
      { url: "https://x.com/b", lastmod: "2026-06-09T00:00:00.000Z" }, // changed
      { url: "https://x.com/c", lastmod: "2026-06-09T00:00:00.000Z" }, // new
    ]
    const changes = diff(SRC.name, prior, entries)
    const byKind = (k: string) => changes.filter((c) => c.kind === k).map((c) => c.url)

    expect(byKind("new")).toEqual(["https://x.com/c"])
    expect(byKind("changed")).toEqual(["https://x.com/b"])
    expect(byKind("removed")).toEqual([]) // b is present, a is unchanged
  })

  it("flags a URL missing from the crawl as removed", () => {
    const prior = snap({ "https://x.com/a": "2026-06-01T00:00:00.000Z" })
    const changes = diff(SRC.name, prior, [])
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: "removed", url: "https://x.com/a" })
  })
})

describe("processCrawl — production-safety gating", () => {
  const prior = snap({
    "https://x.com/a": "2026-06-01T00:00:00.000Z",
    "https://x.com/b": "2026-06-01T00:00:00.000Z",
  })

  it("healthy first crawl seeds a baseline and saves the snapshot", () => {
    const { result, snapshotToSave } = processCrawl(
      SRC,
      crawl([{ url: "https://x.com/a", lastmod: "1" }]),
      null,
    )
    expect(result.baseline).toBe(true)
    expect(result.changes).toHaveLength(0)
    expect(snapshotToSave).not.toBeNull()
  })

  it("incomplete first crawl does NOT seed a baseline and preserves snapshot", () => {
    const { result, snapshotToSave } = processCrawl(
      SRC,
      crawl([{ url: "https://x.com/a", lastmod: "1" }], "incomplete"),
      null,
    )
    expect(result.baseline).toBe(false)
    expect(snapshotToSave).toBeNull()
  })

  it("full failure: no changes and snapshot preserved", () => {
    const { result, snapshotToSave } = processCrawl(SRC, crawl([], "failed"), prior)
    expect(result.status).toBe("failed")
    expect(result.changes).toHaveLength(0)
    expect(snapshotToSave).toBeNull() // baseline is NOT overwritten on failure
  })

  it("incomplete later crawl suppresses 'removed' and preserves the snapshot", () => {
    // Only /a comes back (a partial crawl) — /b looks removed but must be suppressed.
    const { result, snapshotToSave } = processCrawl(
      SRC,
      crawl([{ url: "https://x.com/a", lastmod: "2026-06-01T00:00:00.000Z" }], "incomplete"),
      prior,
    )
    expect(result.changes.filter((c) => c.kind === "removed")).toHaveLength(0)
    expect(snapshotToSave).toBeNull() // last known-good baseline retained
  })

  it("healthy later crawl emits removed and saves the snapshot", () => {
    const { result, snapshotToSave } = processCrawl(
      SRC,
      crawl([{ url: "https://x.com/a", lastmod: "2026-06-01T00:00:00.000Z" }], "healthy"),
      prior,
    )
    const removed = result.changes.filter((c) => c.kind === "removed").map((c) => c.url)
    expect(removed).toEqual(["https://x.com/b"])
    expect(snapshotToSave).not.toBeNull()
  })
})

describe("routing", () => {
  it("maps new→discover, changed→verify, removed→quarantine_review with authority", () => {
    const { result } = processCrawl(
      SRC,
      crawl([
        { url: "https://x.com/new", lastmod: "2026-06-09T00:00:00.000Z" },
        { url: "https://x.com/a", lastmod: "2026-06-09T00:00:00.000Z" }, // changed
      ]),
      snap({
        "https://x.com/a": "2026-06-01T00:00:00.000Z",
        "https://x.com/gone": "2026-06-01T00:00:00.000Z",
      }),
    )
    const routes = buildRouting([result])
    const action = (url: string) => routes.find((r) => r.url.endsWith(url))?.action

    expect(action("/new")).toBe("discover")
    expect(action("/a")).toBe("verify")
    expect(action("/gone")).toBe("quarantine_review")
    expect(routes.every((r) => r.authority === "primary_specialist")).toBe(true)
  })
})

describe("runId", () => {
  it("is unique across runs on the same calendar date (no digest overwrite)", () => {
    const a = runId(new Date("2026-06-11T18:53:11.810Z"))
    const b = runId(new Date("2026-06-11T21:04:00.000Z"))
    expect(a).not.toBe(b)
    // Both share the date prefix but differ by time → distinct filenames.
    expect(a.slice(0, 10)).toBe(b.slice(0, 10))
    expect(a).not.toContain(":") // filesystem-safe
  })
})
