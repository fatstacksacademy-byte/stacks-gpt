/**
 * Markdown report rendering for a scan. Grouped by what you need to act on:
 * dead/needs-current links first (the Amex fire drills), then safe auto-fixes,
 * then review/orphan items, then a clean bill of health.
 */
import type { ScanResult } from "./core"
import type { LinkStatus, VideoVerdict } from "./types"

const LABELS: Record<LinkStatus, string> = {
  dead: "🔴 Dead / expired (needs a fresh link)",
  "needs-current": "🟠 No current link set (paste one into the registry)",
  stale: "🟡 Stale → safe auto-fix",
  review: "🔵 Review (recognized domain, unknown link)",
  orphan: "⚪ Orphan (affiliate-shaped, untracked)",
  current: "✅ Current",
  ignore: "ignore",
}

const ORDER: LinkStatus[] = ["dead", "needs-current", "stale", "review", "orphan", "current"]

export function buildReport(scan: ScanResult): string {
  const out: string[] = []
  const now = new Date().toISOString()
  out.push(`# YouTube affiliate-link scan`)
  out.push(`Generated ${now} · ${scan.videos.length} videos · live check: ${scan.live ? "on" : "off"}\n`)

  // Registry health — is each canonical link itself alive?
  if (scan.registryHealth.length) {
    out.push(`## Registry health (your current links)`)
    for (const h of scan.registryHealth) {
      const icon = h.result.status === "alive" ? "✅" : h.result.status === "dead" ? "🔴" : "❔"
      out.push(`- ${icon} **${h.label}** — ${h.result.status} (${h.result.reason})\n  ${h.currentUrl}`)
    }
    out.push("")
  }

  // Tally
  const tally = new Map<LinkStatus, number>()
  for (const v of scan.videos)
    for (const verdict of v.verdicts) tally.set(verdict.status, (tally.get(verdict.status) ?? 0) + 1)
  out.push(`## Summary`)
  for (const s of ORDER) if (tally.get(s)) out.push(`- ${LABELS[s]}: **${tally.get(s)}**`)
  const willFix = scan.videos.filter((v) => v.changed).length
  out.push(`- Videos with a safe auto-fix queued: **${willFix}**\n`)

  // Per-status sections (skip current + ignore in the detail body)
  for (const status of ORDER) {
    if (status === "current") continue
    const rows = collect(scan.videos, status)
    if (!rows.length) continue
    out.push(`## ${LABELS[status]} — ${rows.length}`)
    for (const r of rows) {
      out.push(`- **${r.title}** — ${r.url}`)
      out.push(`  - \`${r.link}\``)
      out.push(`  - ${r.reason}${r.target ? `\n  - → would become: \`${r.target}\`` : ""}`)
    }
    out.push("")
  }

  return out.join("\n")
}

/**
 * Compact summary (registry health + counts only) for the scheduled scan's
 * tracking issue — the full per-link report goes up as a CI artifact.
 */
export function buildSummary(scan: ScanResult): string {
  const out: string[] = []
  out.push(`Generated ${new Date().toISOString()} · ${scan.videos.length} videos · live check: ${scan.live ? "on" : "off"}\n`)

  const deadHealth = scan.registryHealth.filter((h) => h.result.status === "dead")
  if (deadHealth.length) {
    out.push(`> ⚠️ ${deadHealth.length} of your CURRENT registry links are themselves dead — fix registry.ts.\n`)
  }

  if (scan.registryHealth.length) {
    out.push(`### Registry health`)
    for (const h of scan.registryHealth) {
      const icon = h.result.status === "alive" ? "✅" : h.result.status === "dead" ? "🔴" : "❔"
      out.push(`- ${icon} ${h.label} — ${h.result.status}`)
    }
    out.push("")
  }

  const tally = new Map<LinkStatus, number>()
  for (const v of scan.videos)
    for (const verdict of v.verdicts) tally.set(verdict.status, (tally.get(verdict.status) ?? 0) + 1)
  out.push(`### Counts`)
  for (const s of ORDER) if (tally.get(s)) out.push(`- ${LABELS[s]}: **${tally.get(s)}**`)
  out.push(`- Videos with a safe auto-fix queued: **${scan.videos.filter((v) => v.changed).length}**`)
  out.push(`\n_Full per-link report is attached as the \`link-sync-report\` workflow artifact._`)
  return out.join("\n")
}

function collect(videos: VideoVerdict[], status: LinkStatus) {
  const rows: { title: string; url: string; link: string; reason: string; target?: string }[] = []
  for (const v of videos)
    for (const verdict of v.verdicts)
      if (verdict.status === status)
        rows.push({ title: v.title, url: v.url, link: verdict.link.url, reason: verdict.reason, target: verdict.target })
  return rows
}
