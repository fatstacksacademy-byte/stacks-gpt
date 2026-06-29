/**
 * ga:report — a plain-English snapshot of what's happening on fatstacksacademy.com.
 *
 * Pulls the GA4 Data API and prints: headline KPIs (vs the previous equal period),
 * a HOSTNAME split that fences out localhost/preview traffic (so you can see how
 * much of the "traffic" is just you editing locally), top pages, traffic sources,
 * devices, and a daily trend.
 *
 *   npm run ga:report                 # last 28 days vs the prior 28
 *   npm run ga:report -- 7d           # last 7 days
 *   npm run ga:report -- 90d
 *   npm run ga:report -- today
 *   npm run ga:report -- yesterday
 *   npx tsx scripts/ga/run.ts --days=14
 *
 * Output → scripts/ga/output/report-<end>.md
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")
import {
  runReport, productionOnly, productionHostnames, num, dim, fmt, dur, pctChange,
  type Report, type ReportSpec, type Row,
} from "./client"

// ── date window resolution ────────────────────────────────────────────────────
function iso(d: Date): string { return d.toISOString().slice(0, 10) }
function shift(base: Date, days: number): Date { const d = new Date(base); d.setUTCDate(d.getUTCDate() + days); return d }

/** Resolve the CLI arg into a current window + the immediately-preceding window. */
function resolveWindow(arg: string | undefined) {
  const today = new Date()
  let endDate = iso(today)
  let lengthDays = 28
  const m = arg?.match(/^--days=(\d+)$/) ?? arg?.match(/^(\d+)d$/)
  if (m) lengthDays = Math.max(1, Number(m[1]))
  else if (arg === "today") { lengthDays = 1 }
  else if (arg === "yesterday") { endDate = iso(shift(today, -1)); lengthDays = 1 }
  else if (arg === "week" || arg === "7d") lengthDays = 7
  else if (arg === "month" || arg === "30d") lengthDays = 30
  else if (arg === "quarter" || arg === "90d") lengthDays = 90

  const end = new Date(`${endDate}T00:00:00Z`)
  const start = shift(end, -(lengthDays - 1))
  const prevEnd = shift(start, -1)
  const prevStart = shift(prevEnd, -(lengthDays - 1))
  return {
    label: `${iso(start)} → ${iso(end)}  (${lengthDays} day${lengthDays > 1 ? "s" : ""})`,
    lengthDays,
    current: { startDate: iso(start), endDate: iso(end), name: "current" },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd), name: "previous" },
  }
}

// ── report builders ───────────────────────────────────────────────────────────
const KPI_METRICS = [
  "activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration",
].map((name) => ({ name }))

async function topline(cur: ReportSpec["dateRanges"][0], prev: ReportSpec["dateRanges"][0]) {
  const r = await runReport({ dateRanges: [cur, prev], metrics: KPI_METRICS, dimensionFilter: productionOnly() })
  // With 2 date ranges GA appends a `dateRange` dimension whose value is our name.
  const byRange: Record<string, Row> = {}
  for (const row of r.rows ?? []) byRange[dim(row, (row.dimensionValues?.length ?? 1) - 1)] = row
  return { now: byRange["current"], was: byRange["previous"] }
}

async function breakdown(opts: {
  dimension: string; metrics: string[]; filtered: boolean; limit?: number; orderByDate?: boolean; window: ReportSpec["dateRanges"]
}): Promise<Report> {
  return runReport({
    dateRanges: opts.window,
    dimensions: [{ name: opts.dimension }],
    metrics: opts.metrics.map((name) => ({ name })),
    ...(opts.filtered ? { dimensionFilter: productionOnly() } : {}),
    orderBys: opts.orderByDate
      ? [{ dimension: { dimensionName: opts.dimension } }]
      : [{ metric: { metricName: opts.metrics[0] }, desc: true }],
    limit: opts.limit ?? 15,
  })
}

function bar(v: number, max: number, width = 24): string {
  const n = max > 0 ? Math.round((v / max) * width) : 0
  return "█".repeat(n) + "·".repeat(width - n)
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-") || a.startsWith("--days="))
  const w = resolveWindow(arg)
  const window = [w.current]
  const prodHosts = productionHostnames()

  console.log(`\n📊  fatstacksacademy.com — Google Analytics\n    Window: ${w.label}`)
  console.log(`    Real traffic = hostname in [${prodHosts.join(", ")}]  (localhost/preview excluded from headline)\n`)

  // 1) Headline KPIs vs previous equal period
  const { now, was } = await topline(w.current, w.previous)
  const KPIS: Array<[string, number, number, (n: number) => string]> = [
    ["Active users", num(now, 0), num(was, 0), fmt],
    ["New users", num(now, 1), num(was, 1), fmt],
    ["Sessions", num(now, 2), num(was, 2), fmt],
    ["Page views", num(now, 3), num(was, 3), fmt],
    ["Engagement rate", num(now, 4) * 100, num(was, 4) * 100, (n) => n.toFixed(0) + "%"],
    ["Avg. session", num(now, 5), num(was, 5), dur],
  ]
  console.log("  HEADLINE (vs previous " + w.lengthDays + " days)")
  for (const [label, n, p, f] of KPIS) {
    console.log(`    ${label.padEnd(18)} ${f(n).padStart(8)}   ${pctChange(n, p).padStart(8)}   (was ${f(p)})`)
  }

  // 2) Hostname split — the "is this just me editing?" answer
  const hostRep = await breakdown({ dimension: "hostName", metrics: ["sessions", "activeUsers"], filtered: false, window })
  const hostRows = (hostRep.rows ?? []).map((r) => ({ host: dim(r, 0), sessions: num(r, 0), users: num(r, 1) }))
  const totalSessions = hostRows.reduce((a, h) => a + h.sessions, 0) || 1
  console.log(`\n  WHERE THE TRAFFIC LIVES (all hostnames — exposes dev/preview)`)
  for (const h of hostRows) {
    const real = prodHosts.includes(h.host)
    const tag = real ? "live " : h.host.includes("localhost") || h.host.includes("127.0.0.1") ? "DEV  " : "other"
    console.log(`    [${tag}] ${h.host.padEnd(34)} ${fmt(h.sessions).padStart(7)} sess  ${((h.sessions / totalSessions) * 100).toFixed(0).padStart(3)}%`)
  }
  const devSessions = hostRows.filter((h) => !prodHosts.includes(h.host)).reduce((a, h) => a + h.sessions, 0)
  console.log(`    → ${((devSessions / totalSessions) * 100).toFixed(0)}% of raw sessions were NON-production (dev/preview), excluded above.`)

  // 3) Top pages
  const pagesRep = await breakdown({ dimension: "pagePath", metrics: ["screenPageViews", "activeUsers"], filtered: true, limit: 15, window })
  console.log(`\n  TOP PAGES (live only)`)
  const pageMax = Math.max(1, ...(pagesRep.rows ?? []).map((r) => num(r, 0)))
  for (const r of pagesRep.rows ?? []) {
    console.log(`    ${fmt(num(r, 0)).padStart(6)}v  ${bar(num(r, 0), pageMax, 14)}  ${dim(r, 0).slice(0, 48)}`)
  }

  // 4) Traffic sources — channel groups + top source/medium
  const chanRep = await breakdown({ dimension: "sessionDefaultChannelGroup", metrics: ["sessions", "activeUsers"], filtered: true, limit: 12, window })
  const chanTotal = (chanRep.rows ?? []).reduce((a, r) => a + num(r, 0), 0) || 1
  console.log(`\n  HOW PEOPLE ARRIVE (channel)`)
  for (const r of chanRep.rows ?? []) {
    console.log(`    ${dim(r, 0).padEnd(20)} ${fmt(num(r, 0)).padStart(6)} sess  ${((num(r, 0) / chanTotal) * 100).toFixed(0).padStart(3)}%`)
  }
  const srcRep = await breakdown({ dimension: "sessionSourceMedium", metrics: ["sessions"], filtered: true, limit: 10, window })
  console.log(`\n  TOP SOURCE / MEDIUM (live only)`)
  for (const r of srcRep.rows ?? []) console.log(`    ${fmt(num(r, 0)).padStart(6)} sess  ${dim(r, 0)}`)

  // 5) Devices
  const devRep = await breakdown({ dimension: "deviceCategory", metrics: ["sessions"], filtered: true, limit: 5, window })
  const devTotal = (devRep.rows ?? []).reduce((a, r) => a + num(r, 0), 0) || 1
  console.log(`\n  DEVICES`)
  for (const r of devRep.rows ?? []) console.log(`    ${dim(r, 0).padEnd(10)} ${((num(r, 0) / devTotal) * 100).toFixed(0).padStart(3)}%  (${fmt(num(r, 0))} sess)`)

  // 6) Daily trend
  const trendRep = await breakdown({ dimension: "date", metrics: ["sessions", "activeUsers"], filtered: true, orderByDate: true, limit: 100, window })
  const trend = (trendRep.rows ?? []).map((r) => ({ d: dim(r, 0), sessions: num(r, 0), users: num(r, 1) }))
  const trendMax = Math.max(1, ...trend.map((t) => t.sessions))
  if (trend.length > 1) {
    console.log(`\n  DAILY SESSIONS (live only)`)
    for (const t of trend) {
      const d = `${t.d.slice(4, 6)}/${t.d.slice(6, 8)}`
      console.log(`    ${d}  ${bar(t.sessions, trendMax, 30)} ${fmt(t.sessions).padStart(6)}`)
    }
  }

  // ── markdown report ──────────────────────────────────────────────────────────
  const md: string[] = []
  md.push(`# fatstacksacademy.com — GA snapshot`)
  md.push(`\n_Window: **${w.label}** · generated ${iso(new Date())} · live traffic = \`${prodHosts.join("`, `")}\`_\n`)
  md.push(`## Headline (vs previous ${w.lengthDays} days)\n`)
  md.push(`| Metric | Now | Change | Prev |\n|---|--:|--:|--:|`)
  for (const [label, n, p, f] of KPIS) md.push(`| ${label} | ${f(n)} | ${pctChange(n, p)} | ${f(p)} |`)
  md.push(`\n## Where the traffic lives (all hostnames)\n`)
  md.push(`| Hostname | Type | Sessions | Share |\n|---|---|--:|--:|`)
  for (const h of hostRows) {
    const real = prodHosts.includes(h.host)
    md.push(`| \`${h.host}\` | ${real ? "live" : "dev/preview"} | ${fmt(h.sessions)} | ${((h.sessions / totalSessions) * 100).toFixed(0)}% |`)
  }
  md.push(`\n**${((devSessions / totalSessions) * 100).toFixed(0)}%** of raw sessions were non-production and are excluded from every other table.\n`)
  md.push(`## Top pages (live)\n`)
  md.push(`| Page | Views | Users |\n|---|--:|--:|`)
  for (const r of pagesRep.rows ?? []) md.push(`| \`${dim(r, 0)}\` | ${fmt(num(r, 0))} | ${fmt(num(r, 1))} |`)
  md.push(`\n## How people arrive (channel)\n`)
  md.push(`| Channel | Sessions | Share |\n|---|--:|--:|`)
  for (const r of chanRep.rows ?? []) md.push(`| ${dim(r, 0)} | ${fmt(num(r, 0))} | ${((num(r, 0) / chanTotal) * 100).toFixed(0)}% |`)
  md.push(`\n### Top source / medium\n`)
  md.push(`| Source / Medium | Sessions |\n|---|--:|`)
  for (const r of srcRep.rows ?? []) md.push(`| ${dim(r, 0)} | ${fmt(num(r, 0))} |`)
  md.push(`\n## Devices\n`)
  md.push(`| Device | Share | Sessions |\n|---|--:|--:|`)
  for (const r of devRep.rows ?? []) md.push(`| ${dim(r, 0)} | ${((num(r, 0) / devTotal) * 100).toFixed(0)}% | ${fmt(num(r, 0))} |`)
  if (trend.length > 1) {
    md.push(`\n## Daily sessions (live)\n`)
    md.push(`| Date | Sessions | Users |\n|---|--:|--:|`)
    for (const t of trend) md.push(`| ${t.d.slice(0, 4)}-${t.d.slice(4, 6)}-${t.d.slice(6, 8)} | ${fmt(t.sessions)} | ${fmt(t.users)} |`)
  }

  const out = join("scripts", "ga", "output")
  mkdirSync(out, { recursive: true })
  const path = join(out, `report-${w.current.endDate}.md`)
  writeFileSync(path, md.join("\n") + "\n")
  console.log(`\n✓ → ${path}\n`)
}

main().catch((e) => { console.error("\n✗ " + (e instanceof Error ? e.message : String(e))); process.exit(1) })
