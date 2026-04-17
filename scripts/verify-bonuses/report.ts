import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import type { VerificationResult, ProposedEdit } from "./types"

const OUT_DIR = join(process.cwd(), "verification-output")

export function writeReport(
  results: VerificationResult[],
  proposedEdits: ProposedEdit[],
) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  // Raw JSON
  writeFileSync(
    join(OUT_DIR, "results.json"),
    JSON.stringify(results, null, 2),
  )
  writeFileSync(
    join(OUT_DIR, "proposed-edits.json"),
    JSON.stringify(proposedEdits, null, 2),
  )

  // Markdown summary
  const md = buildMarkdown(results, proposedEdits)
  writeFileSync(join(OUT_DIR, "report.md"), md)

  // needs_review — ambiguous only
  const ambiguous = results.filter(
    (r) =>
      r.fields.some((f) => f.status === "ambiguous") || r.escalations.length > 0,
  )
  writeFileSync(
    join(OUT_DIR, "needs-review.json"),
    JSON.stringify(ambiguous, null, 2),
  )

  return {
    outDir: OUT_DIR,
    totals: summarize(results),
    proposedEdits: proposedEdits.length,
  }
}

function summarize(results: VerificationResult[]) {
  let ok = 0
  let mismatch = 0
  let ambiguous = 0
  let dead = 0
  let fetchError = 0
  for (const r of results) {
    if (r.pageSignal === "offer_dead" || r.pageSignal === "promo_removed")
      dead++
    else if (r.pageSignal === "fetch_error") fetchError++
    else if (r.fields.some((f) => f.status === "mismatch")) mismatch++
    else if (r.fields.some((f) => f.status === "ambiguous")) ambiguous++
    else ok++
  }
  return { total: results.length, ok, mismatch, ambiguous, dead, fetchError }
}

function buildMarkdown(
  results: VerificationResult[],
  edits: ProposedEdit[],
): string {
  const t = summarize(results)
  const lines: string[] = []
  lines.push(`# Bonus Verification Report`)
  lines.push(``)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(``)
  lines.push(`## Summary`)
  lines.push(``)
  lines.push(`- Total verified: **${t.total}**`)
  lines.push(`- ✅ OK: ${t.ok}`)
  lines.push(`- ⚠️ Mismatch (high confidence): ${t.mismatch}`)
  lines.push(`- ❓ Ambiguous (needs review): ${t.ambiguous}`)
  lines.push(`- 🪦 Offer dead/removed: ${t.dead}`)
  lines.push(`- 🚨 Fetch error: ${t.fetchError}`)
  lines.push(`- 📝 Proposed edits: **${edits.length}**`)
  lines.push(``)

  if (edits.length > 0) {
    lines.push(`## Proposed Edits`)
    lines.push(``)
    lines.push(`Review \`verification-output/proposed-edits.json\` for the full list.`)
    lines.push(``)
    lines.push(`| Bonus ID | Path | From | To | Reason |`)
    lines.push(`|---|---|---|---|---|`)
    for (const e of edits.slice(0, 50)) {
      lines.push(
        `| ${e.id} | \`${e.path}\` | ${json(e.from)} | ${json(e.to)} | ${e.reason} |`,
      )
    }
    if (edits.length > 50) {
      lines.push(`| ... | ${edits.length - 50} more in proposed-edits.json | | | |`)
    }
    lines.push(``)
  }

  // Per-record details for anything not OK
  lines.push(`## Issues by Bonus`)
  lines.push(``)
  for (const r of results) {
    const hasIssue =
      r.pageSignal !== "ok" ||
      r.fields.some((f) => f.status !== "match" && f.status !== "missing") ||
      r.escalations.length > 0
    if (!hasIssue) continue
    lines.push(`### ${r.bank_name} — \`${r.id}\``)
    lines.push(``)
    lines.push(`- URL: ${r.url}`)
    lines.push(`- Page signal: **${r.pageSignal}**`)
    if (r.fetch.error) lines.push(`- Fetch error: ${r.fetch.error}`)
    if (r.fetch.redirected) lines.push(`- Redirected to: ${r.fetch.finalUrl}`)
    for (const f of r.fields) {
      if (f.status === "match" || f.status === "missing") continue
      lines.push(
        `- **${f.field}**: ${f.status} — stored \`${json(f.stored)}\` vs extracted \`${json(f.extracted)}\``,
      )
    }
    for (const e of r.escalations) {
      lines.push(`  - 🤖 Claude: \`${e.field}\` → **${e.verdict}** — ${e.rationale}`)
    }
    lines.push(``)
  }

  return lines.join("\n")
}

function json(v: unknown): string {
  if (v === null || v === undefined) return "null"
  return "`" + JSON.stringify(v) + "`"
}
