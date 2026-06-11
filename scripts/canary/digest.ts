import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { buildRouting } from "./routing"
import type { CanaryChange, SourceResult } from "./types"

const OUT_DIR = join(process.cwd(), "review-queue", "canary")

function ensureDir() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
}

/**
 * A run ID that is unique per run yet sorts chronologically, so multiple runs on
 * the same date never overwrite each other:  2026-06-11T18-53-11-810Z
 */
export function runId(now: Date = new Date()): string {
  return now.toISOString().replace(/:/g, "-").replace(/\./g, "-")
}

/** Machine-readable output consumed by discovery/verify triage. */
export function writeChangesJson(results: SourceResult[], id: string): string {
  ensureDir()
  const path = join(OUT_DIR, `${id}.json`)
  writeFileSync(
    path,
    JSON.stringify({ generated_at: new Date().toISOString(), run_id: id, sources: results }, null, 2),
  )
  return path
}

/** Structured routing rows: new→discover, changed→verify, removed→quarantine_review. */
export function writeRoutingJson(results: SourceResult[], id: string): string {
  ensureDir()
  const path = join(OUT_DIR, `${id}.routing.json`)
  writeFileSync(
    path,
    JSON.stringify(
      { generated_at: new Date().toISOString(), run_id: id, routes: buildRouting(results) },
      null,
      2,
    ),
  )
  return path
}

/** Human-readable digest, mirroring the discovery digest style. */
export function writeChangesDigest(results: SourceResult[], id: string): string {
  ensureDir()
  const path = join(OUT_DIR, `${id}.md`)

  const all = results.flatMap((r) => r.changes)
  const out: string[] = []
  out.push(`# Sitemap Canary — ${id}`)
  out.push(``)

  const baselines = results.filter((r) => r.baseline)
  if (baselines.length) {
    out.push(
      `_Baseline seeded for: ${baselines.map((b) => `${b.source} (${b.tracked} urls)`).join(", ")}. No changes emitted on first run._`,
    )
    out.push(``)
  }

  const degraded = results.filter((r) => r.status !== "healthy" && !r.baseline)
  if (degraded.length) {
    out.push(
      `_⚠️ Degraded crawl (removed-signals suppressed, snapshot preserved): ${degraded
        .map((d) => `${d.source} (${d.status})`)
        .join(", ")}._`,
    )
    out.push(``)
  }

  out.push(
    `New: **${count(all, "new")}** · Changed: **${count(all, "changed")}** · Removed: **${count(all, "removed")}**`,
  )

  for (const r of results) {
    if (r.baseline || r.changes.length === 0) continue
    out.push(``)
    out.push(`## ${r.source} — _${r.authority}_ (${r.tracked} tracked, ${r.status})`)
    section(out, "🆕 New offers/pages — candidate discovery leads", r.changes.filter((c) => c.kind === "new"))
    section(out, "✏️ Changed — re-verify terms", r.changes.filter((c) => c.kind === "changed"))
    section(out, "🪦 Removed — quarantine for review", r.changes.filter((c) => c.kind === "removed"))
  }

  writeFileSync(path, out.join("\n"))
  return path
}

function section(out: string[], heading: string, changes: CanaryChange[]) {
  if (changes.length === 0) return
  // State-specific and offer pages first — those are the high-value signals.
  const ranked = [...changes].sort((a, b) => weight(b) - weight(a))
  out.push(``)
  out.push(`### ${heading} (${changes.length})`)
  out.push(``)
  for (const c of ranked) {
    const tags = c.tags.length ? ` _[${c.tags.join(", ")}]_` : ""
    const when =
      c.kind === "changed"
        ? ` (${c.prev_lastmod || "?"} → ${c.curr_lastmod || "?"})`
        : c.curr_lastmod
          ? ` (${c.curr_lastmod})`
          : ""
    out.push(`- <${c.url}>${tags}${when}`)
  }
}

function weight(c: CanaryChange): number {
  let w = 0
  if (c.tags.includes("state")) w += 3
  if (c.tags.includes("offer")) w += 2
  if (c.tags.includes("review") || c.tags.includes("best-list")) w += 1
  return w
}

function count(changes: CanaryChange[], kind: CanaryChange["kind"]): number {
  return changes.filter((c) => c.kind === kind).length
}
