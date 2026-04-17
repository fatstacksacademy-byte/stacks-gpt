/* eslint-disable no-console */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { closeBrowser } from "../_shared/playwright"
import { pullRss } from "./sources/rss"
import { pullReddit } from "./sources/reddit"
import { pullSitemap } from "./sources/sitemap"
import { classify, claudeCallsUsed, claudeBudgetRemaining } from "./classify"
import { dedupe, rawToLead } from "./dedupe"
import { enrich, pickCanonical } from "./enrich"
import { loadLeads, upsertLeads, writeQueue, writeDigest } from "./queue"
import { applyApproved } from "./apply"
import { log } from "./logger"
import type { RawItem, SourceConfig, Lead } from "./types"

// CLI
const args = process.argv.slice(2)
const FLAG_APPLY = args.includes("--apply-approved")
const FLAG_NO_ENRICH = args.includes("--no-enrich")
const FLAG_NO_CLAUDE = args.includes("--no-claude")
const FLAG_DRY = args.includes("--dry-run")
function optVal(name: string): string | undefined {
  const f = args.find((a) => a.startsWith(`--${name}=`))
  return f?.split("=")[1]
}
const ONLY_SOURCE = optVal("source")
const LIMIT_LEADS = Number(optVal("limit") ?? 0) || 0

const SOURCES_PATH = join(process.cwd(), "scripts", "discover-bonuses", "config", "sources.json")
const ENRICH_CONCURRENCY = 2

async function pullSource(src: SourceConfig): Promise<RawItem[]> {
  try {
    if (src.type === "rss") return await pullRss(src)
    if (src.type === "reddit") return await pullReddit(src)
    if (src.type === "sitemap") return await pullSitemap(src)
  } catch (err) {
    log("error", "source.pull_error", {
      source: src.name,
      error: err instanceof Error ? err.message : String(err),
    })
  }
  return []
}

async function main() {
  if (FLAG_APPLY) {
    const { wroteFiles, approvedCount } = applyApproved()
    console.log(
      `applied ${approvedCount} approved lead(s) to:\n  ${wroteFiles.join("\n  ") || "(no files written)"}`,
    )
    return
  }

  const sources: SourceConfig[] = JSON.parse(readFileSync(SOURCES_PATH, "utf8"))
  const active = sources.filter((s) => s.enabled && (!ONLY_SOURCE || s.name === ONLY_SOURCE))
  if (active.length === 0) {
    console.log(`No active sources. Enable some in ${SOURCES_PATH}.`)
    return
  }

  log("info", "run.start", {
    sources: active.map((s) => s.name),
    enrich: !FLAG_NO_ENRICH,
    claude: !FLAG_NO_CLAUDE,
  })

  // 1. Pull raw items from all sources in parallel
  const rawArrays = await Promise.all(active.map(pullSource))
  const rawItems: RawItem[] = rawArrays.flat()
  log("info", "run.raw_items_collected", { count: rawItems.length })

  // 2. Classify (heuristic + selective Claude)
  const leads: Lead[] = []
  for (const item of rawItems) {
    const c = FLAG_NO_CLAUDE
      ? // heuristic only
        (await import("./classify")).heuristicClassify(item)
      : await classify(item)
    const lead = rawToLead(item, c.classification, c.confidence)
    // Discard "other" with very low confidence — noise filter
    if (c.classification === "other" && c.confidence < 0.3) continue
    leads.push(lead)
  }

  // 3. Dedupe
  let deduped = dedupe(leads)
  log("info", "run.deduped", { before: leads.length, after: deduped.length })

  if (LIMIT_LEADS > 0) deduped = deduped.slice(0, LIMIT_LEADS)

  // 4. Enrich (Playwright on bank's own page)
  if (!FLAG_NO_ENRICH) {
    const limit = pLimit(ENRICH_CONCURRENCY)
    await Promise.all(
      deduped.map((l, i) =>
        limit(async () => {
          // The original item isn't available here, so we use the first source URL
          // to re-derive outbound URLs — but since we already captured them on the
          // raw item level, we stash them on the lead as unused. For now, we only
          // enrich if we can find a non-lead-domain URL in source_urls.
          const canonical = pickCanonical({
            source_url: l.source_urls[0],
            outbound_urls: l.outbound_candidates ?? [],
            source_name: "",
            source_kind: "rss",
            title: l.product,
          })
          const start = Date.now()
          await enrich(l, canonical)
          log("info", "run.enriched", {
            idx: i,
            id: l.id,
            ok: !!l.enrichment.fetched_at,
            ms: Date.now() - start,
          })
        }),
      ),
    )
  }

  // 5. Merge into queue + write digest
  const existing = loadLeads()
  const existingIds = new Set(existing.map((l) => l.id))
  const newLeads = deduped.filter((l) => !existingIds.has(l.id))

  const merged = upsertLeads(existing, deduped)
  if (!FLAG_DRY) {
    writeQueue(merged)
    const digestPath = writeDigest(newLeads)
    log("info", "run.digest_written", { digestPath, newLeads: newLeads.length })
  }

  await closeBrowser()

  console.log(``)
  console.log(`Raw items: ${rawItems.length}`)
  console.log(`Deduped leads: ${deduped.length}`)
  console.log(`New leads this run: ${newLeads.length}`)
  console.log(`Total queue size: ${merged.length}`)
  console.log(
    `Claude calls: ${claudeCallsUsed()} used, ${claudeBudgetRemaining()} remaining`,
  )
  if (!FLAG_DRY) {
    console.log(`Queue: review-queue/leads.json`)
    console.log(`Digest: review-queue/digests/`)
  } else {
    console.log(`(dry run — nothing written)`)
  }
}

main().catch(async (err) => {
  log("error", "run.fatal", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  await closeBrowser()
  process.exit(1)
})
