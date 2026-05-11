/**
 * Phase 3 consensus report — pulls current catalog_verification_state from
 * Supabase and summarizes cross-source consensus coverage + disagreements.
 *
 * Usage: npx tsx scripts/verify-bonuses/consensus-report.ts
 *
 * Output: verification-output/consensus-report.md + console summary.
 */
import { createClient } from "@supabase/supabase-js"
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs"

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

async function main() {
  const env = loadEnv("/Users/nathaniel/stacks-gpt/.env.local")
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Missing Supabase env")
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data, error } = await supabase
    .from("catalog_verification_state")
    .select(
      "catalog_id, catalog_kind, verified_at, confidence, mismatch_count, page_signal, sources_agree, consensus_disagreements, secondary_source_url, secondary_source_kind",
    )
  if (error) {
    console.error("query failed:", error.message)
    process.exit(1)
  }
  if (!data) {
    console.log("no rows")
    return
  }

  const total = data.length
  const verified = data.filter((r) => r.page_signal === "ok").length
  const withSecondary = data.filter((r) => r.secondary_source_url).length
  const agree = data.filter((r) => r.sources_agree === true).length
  const disagree = data.filter((r) => r.sources_agree === false).length
  const notChecked = data.filter((r) => r.sources_agree === null).length

  const lowConf = data.filter((r) => r.confidence === "low").length
  const medConf = data.filter((r) => r.confidence === "medium").length
  const highConf = data.filter((r) => r.confidence === "high").length

  const lines: string[] = []
  lines.push(`# Phase 3 Consensus Report`)
  lines.push(``)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(``)
  lines.push(`## Coverage`)
  lines.push(`| Metric | Count | % of total |`)
  lines.push(`|---|---:|---:|`)
  lines.push(`| Bonuses with verification row | ${total} | 100% |`)
  lines.push(`| Primary page loaded OK | ${verified} | ${pct(verified, total)} |`)
  lines.push(`| Has secondary source (DoC or other) | ${withSecondary} | ${pct(withSecondary, total)} |`)
  lines.push(`| Sources AGREE | ${agree} | ${pct(agree, total)} |`)
  lines.push(`| Sources DISAGREE | ${disagree} | ${pct(disagree, total)} |`)
  lines.push(`| Consensus not checked (no secondary) | ${notChecked} | ${pct(notChecked, total)} |`)
  lines.push(``)
  lines.push(`## Confidence tier distribution`)
  lines.push(`| Tier | Count |`)
  lines.push(`|---|---:|`)
  lines.push(`| high | ${highConf} |`)
  lines.push(`| medium | ${medConf} |`)
  lines.push(`| low | ${lowConf} |`)
  lines.push(``)

  const disagreements = data.filter(
    (r) => r.sources_agree === false && (r.consensus_disagreements?.length ?? 0) > 0,
  )
  if (disagreements.length) {
    lines.push(`## Disagreements (${disagreements.length})`)
    lines.push(``)
    lines.push(`These bonuses returned different data from the bank page vs the`)
    lines.push(`secondary source. Each one is worth eyeballing — the bank page is`)
    lines.push(`usually authoritative but the gap is a signal that something changed.`)
    lines.push(``)
    for (const r of disagreements) {
      lines.push(`### ${r.catalog_id} (${r.catalog_kind})`)
      lines.push(`- Confidence: **${r.confidence}**`)
      lines.push(`- Secondary: ${r.secondary_source_url}`)
      lines.push(`- Disagreements:`)
      for (const d of r.consensus_disagreements ?? []) {
        lines.push(`  - ${d}`)
      }
      lines.push(``)
    }
  } else {
    lines.push(`## Disagreements`)
    lines.push(``)
    lines.push(`_None_ — every bonus with a secondary source matched the primary.`)
    lines.push(``)
  }

  const notCheckedRows = data.filter((r) => r.sources_agree === null && r.page_signal === "ok")
  if (notCheckedRows.length) {
    lines.push(`## Single-source bonuses (${notCheckedRows.length})`)
    lines.push(``)
    lines.push(`These have no secondary source in source_links — Phase 3 skipped them.`)
    lines.push(`Add a DoC article URL to source_links on the bonus record to enable`)
    lines.push(`cross-source consensus next run.`)
    lines.push(``)
    for (const r of notCheckedRows) {
      lines.push(`- \`${r.catalog_id}\` (${r.catalog_kind})`)
    }
    lines.push(``)
  }

  if (!existsSync("/Users/nathaniel/stacks-gpt/verification-output")) {
    mkdirSync("/Users/nathaniel/stacks-gpt/verification-output")
  }
  const out = "/Users/nathaniel/stacks-gpt/verification-output/consensus-report.md"
  writeFileSync(out, lines.join("\n"))

  console.log(`Coverage: ${verified}/${total} primary OK, ${withSecondary}/${total} with secondary`)
  console.log(`Consensus: ${agree} agree / ${disagree} disagree / ${notChecked} not checked`)
  console.log(`Confidence: ${highConf} high / ${medConf} medium / ${lowConf} low`)
  console.log(`Report written to ${out}`)
}

function pct(n: number, d: number): string {
  if (!d) return "0%"
  return `${Math.round((n / d) * 100)}%`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
