/**
 * Sitemap-lastmod canary runner.
 *
 *   npm run canary:scan                 # crawl all enabled sources, diff, persist
 *   npm run canary:scan -- --only=bankbonus
 *   npm run canary:scan -- --dry        # preview: no snapshot/digest writes
 *   npm run canary:scan -- --reset      # re-seed baselines (ignore prior snapshot)
 *
 * First run per source seeds a baseline (no changes emitted). Subsequent runs
 * emit new / changed / removed URLs into review-queue/canary/<date>.{json,md}.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { crawlSitemap } from "./sitemap"
import { loadSnapshot, saveSnapshot } from "./snapshot"
import { processCrawl } from "./process"
import { runId, writeChangesDigest, writeChangesJson, writeRoutingJson } from "./digest"
import { log } from "./logger"
import type { CanarySource, SourceResult } from "./types"

function parseArgs(argv: string[]) {
  const only = argv.find((a) => a.startsWith("--only="))?.split("=")[1]
  return {
    only,
    dry: argv.includes("--dry"),
    reset: argv.includes("--reset"),
  }
}

function loadSources(): CanarySource[] {
  const p = join(process.cwd(), "scripts", "canary", "config", "sources.json")
  return JSON.parse(readFileSync(p, "utf8")) as CanarySource[]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const sources = loadSources().filter(
    (s) => s.enabled && (!args.only || s.name === args.only),
  )

  if (sources.length === 0) {
    log("warn", "run.no_sources", { only: args.only ?? "(all)" })
    return
  }

  log("info", "run.start", { sources: sources.map((s) => s.name), dry: args.dry, reset: args.reset })

  const results: SourceResult[] = []

  for (const src of sources) {
    const crawl = await crawlSitemap(src)
    const prior = args.reset ? null : loadSnapshot(src.name)
    const { result, snapshotToSave } = processCrawl(src, crawl, prior)

    if (result.status === "failed") {
      log("warn", "run.crawl_failed", { source: src.name })
    } else if (result.baseline) {
      log("info", "run.baseline_seeded", { source: src.name, tracked: result.tracked })
    } else if (crawl.entries.length === 0) {
      log("warn", "run.no_entries", { source: src.name, status: result.status })
    } else if (!prior && result.status !== "healthy") {
      log("warn", "run.baseline_skipped_incomplete", { source: src.name, status: result.status, tracked: result.tracked })
    } else {
      log("info", "run.diffed", {
        source: src.name,
        status: result.status,
        tracked: result.tracked,
        new: result.changes.filter((c) => c.kind === "new").length,
        changed: result.changes.filter((c) => c.kind === "changed").length,
        removed: result.changes.filter((c) => c.kind === "removed").length,
      })
    }

    if (!args.dry && snapshotToSave) saveSnapshot(src.name, snapshotToSave)
    results.push(result)
  }

  const anyChanges = results.some((r) => r.changes.length > 0)
  if (args.dry) {
    log("info", "run.dry_done", { note: "no files written" })
  } else if (anyChanges) {
    const id = runId()
    const jsonPath = writeChangesJson(results, id)
    const mdPath = writeChangesDigest(results, id)
    const routingPath = writeRoutingJson(results, id)
    log("info", "run.wrote_digest", { json: jsonPath, md: mdPath, routing: routingPath })
  } else {
    log("info", "run.no_changes", { note: "snapshots updated, no digest written" })
  }

  const total = results.reduce((n, r) => n + r.changes.length, 0)
  log("info", "run.done", {
    sources: results.length,
    total_changes: total,
    baselines: results.filter((r) => r.baseline).length,
  })
}

main().catch((err) => {
  log("error", "run.fatal", { error: err instanceof Error ? err.stack || err.message : String(err) })
  process.exit(1)
})
