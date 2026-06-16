/**
 * link-sync CLI.
 *
 *   npm run linksync:scan                 # read-only: scan + live check, write report
 *   npm run linksync:scan -- --no-live    # skip destination fetches (registry diff only)
 *   npm run linksync:apply                # DRY RUN: show every rewrite it would make
 *   npm run linksync:apply -- --commit    # actually push the safe rewrites
 *   npm run linksync:apply -- --only=VIDEOID
 *   npm run linksync:apply -- --commit --limit=25   # quota guard (≈50 units/update)
 *
 * Safe-by-default: only links equal to a known alias in registry.ts are
 * rewritten. Everything else is reported for you to act on, never auto-edited.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { join } from "node:path"
import { scanChannel, applyRewrites } from "./core"
import { buildReport, buildSummary } from "./report"
import type { VideoVerdict } from "./types"

const OUT_DIR = join("scripts", "link-sync", "output")

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}
function opt(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.split("=").slice(1).join("=")
}

/** Line-level diff for the dry-run preview (only lines that changed). */
function previewDiff(before: string, after: string): string[] {
  const a = before.split(/\r?\n/)
  const b = after.split(/\r?\n/)
  const lines: string[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      if (a[i] !== undefined) lines.push(`    - ${a[i]}`)
      if (b[i] !== undefined) lines.push(`    + ${b[i]}`)
    }
  }
  return lines
}

async function runScan() {
  const live = !flag("no-live")
  console.log(`Scanning channel (live check: ${live ? "on" : "off"})…`)
  const scan = await scanChannel({ live })
  const report = buildReport(scan)

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, "report.md"), report)
  writeFileSync(join(OUT_DIR, "summary.md"), buildSummary(scan))
  writeFileSync(
    join(OUT_DIR, "proposed-edits.json"),
    JSON.stringify(
      scan.videos.filter((v) => v.changed).map((v) => ({ videoId: v.videoId, title: v.title })),
      null,
      2,
    ),
  )

  const changed = scan.videos.filter((v) => v.changed).length
  const deadHealth = scan.registryHealth.filter((h) => h.result.status === "dead")
  console.log(`\n✓ Scanned ${scan.videos.length} videos.`)
  if (deadHealth.length) console.log(`🔴 ${deadHealth.length} of your CURRENT registry links are themselves dead — fix registry.ts first.`)
  console.log(`🟡 ${changed} videos have a safe auto-fix queued (run linksync:apply to preview).`)
  console.log(`📄 Full report: ${join(OUT_DIR, "report.md")}`)
}

async function runApply() {
  const live = !flag("no-live")
  const commit = flag("commit")
  const only = opt("only")
  const program = opt("program")
  const limit = opt("limit") ? Number(opt("limit")) : Infinity

  console.log(`${commit ? "APPLYING" : "DRY RUN"} (live check: ${live ? "on" : "off"})…`)
  const scan = await scanChannel({ live })

  let targets: VideoVerdict[] = scan.videos.filter((v) => v.changed)
  if (only) targets = targets.filter((v) => v.videoId === only)
  if (program) targets = targets.filter((v) => v.verdicts.some((x) => x.autoFixable && x.programKey === program))
  if (targets.length > limit) targets = targets.slice(0, limit)

  if (!targets.length) {
    console.log("Nothing to rewrite. (Stale links only get auto-fixed once you've set the new URL in registry.ts.)")
    return
  }

  for (const v of targets) {
    console.log(`\n▸ ${v.title}  (${v.url})`)
    for (const line of previewDiff(scan.rawVideos.find((r) => r.videoId === v.videoId)!.description, v.proposedDescription!))
      console.log(line)
  }

  if (!commit) {
    console.log(`\nDRY RUN — ${targets.length} video(s) would be updated. Re-run with --commit to push.`)
    return
  }

  console.log(`\nPushing ${targets.length} update(s)…`)
  const n = await applyRewrites(scan.token, scan.rawVideos, targets)
  console.log(`✓ Updated ${n} video description(s).`)
}

const command = process.argv[2]
const run = command === "apply" ? runApply : command === "scan" ? runScan : null

if (!run) {
  console.error("Usage: linksync <scan|apply> [--no-live] [--commit] [--only=ID] [--program=KEY] [--limit=N]")
  process.exit(1)
}

run().catch((e) => {
  console.error("\n✗", e instanceof Error ? e.message : e)
  process.exit(1)
})
