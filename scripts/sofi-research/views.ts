/**
 * SoFi YouTube performance scan — finds what's actually performed best.
 *
 * Reuses the link-sync OAuth client (getAccessToken) to hit YouTube Data API v3.
 * search.list searches ALL public YouTube (not just your channel), so we can
 * pull real view counts for SoFi videos and rank them — the thing web search
 * can't give us, because YouTube renders view counts client-side.
 *
 * What it does:
 *   1. search.list across several SoFi queries — an all-time pass (order=viewCount)
 *      and a recent pass (publishedAfter) so fresh breakouts aren't missed.
 *   2. videos.list (statistics + snippet + contentDetails) for real numbers.
 *   3. Computes views/day (momentum), splits Shorts vs long-form, flags outliers
 *      (videos far above the median for their format).
 *   4. Writes a ranked markdown report + prints a console summary.
 *
 * Run:  npm run sofi:views
 *       npm run sofi:views -- --recent=12 --per-query=50 --min-views=5000
 *       npm run sofi:views -- --queries="SoFi review;SoFi bonus"
 *
 * Quota: search.list = 100 units/call; with the default queries × 2 passes this
 * is ~1,600 units (default daily quota is 10,000). videos.list is ~1 unit/50 ids.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { getAccessToken } from "../link-sync/youtube"

const API = "https://www.googleapis.com/youtube/v3"

// Default search set — the niche's main intent buckets. Override with --queries.
const DEFAULT_QUERIES = [
  "SoFi review",
  "SoFi bank review",
  "SoFi high yield savings",
  "SoFi checking savings bonus",
  "SoFi worth it",
  "SoFi Plus",
  "SoFi vs Ally",
  "SoFi vs Marcus",
]

type Args = {
  recentMonths: number // recency window for the "recent" pass
  perQuery: number // search results per query per pass (max 50)
  minViews: number // drop noise below this
  queries: string[]
}

function parseArgs(argv: string[]): Args {
  const get = (k: string) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`))
    return hit ? hit.slice(k.length + 3) : undefined
  }
  const q = get("queries")
  return {
    recentMonths: Number(get("recent") ?? 18),
    perQuery: Math.min(Number(get("per-query") ?? 50), 50),
    minViews: Number(get("min-views") ?? 1000),
    queries: q ? q.split(";").map((s) => s.trim()).filter(Boolean) : DEFAULT_QUERIES,
  }
}

async function apiGet<T>(token: string, path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API}/${path}?${qs}`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`YouTube GET ${path} failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/** One search pass → video ids. publishedAfter is optional (ISO date). */
async function searchIds(
  token: string,
  query: string,
  perQuery: number,
  publishedAfter?: string,
): Promise<string[]> {
  const data = await apiGet<{ items?: Array<{ id?: { videoId?: string } }> }>(token, "search", {
    part: "id",
    q: query,
    type: "video",
    order: "viewCount",
    maxResults: String(perQuery),
    regionCode: "US",
    relevanceLanguage: "en",
    ...(publishedAfter ? { publishedAfter } : {}),
  })
  return (data.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => Boolean(v))
}

type Video = {
  id: string
  title: string
  channel: string
  publishedAt: string
  ageDays: number
  views: number
  likes: number
  comments: number
  durationSec: number
  isShort: boolean
  viewsPerDay: number
  url: string
}

/** ISO-8601 PT#H#M#S → seconds. */
function durationToSec(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

async function fetchStats(token: string, ids: string[], nowMs: number): Promise<Video[]> {
  const out: Video[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const data = await apiGet<{
      items?: Array<{
        id: string
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string }
        statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
        contentDetails?: { duration?: string }
      }>
    }>(token, "videos", { part: "snippet,statistics,contentDetails", id: chunk.join(","), maxResults: "50" })
    for (const v of data.items ?? []) {
      const publishedAt = v.snippet?.publishedAt ?? ""
      const ageDays = publishedAt ? Math.max(1, (nowMs - Date.parse(publishedAt)) / 86_400_000) : 1
      const views = Number(v.statistics?.viewCount ?? 0)
      const durationSec = durationToSec(v.contentDetails?.duration ?? "")
      out.push({
        id: v.id,
        title: v.snippet?.title ?? "",
        channel: v.snippet?.channelTitle ?? "",
        publishedAt: publishedAt.slice(0, 10),
        ageDays: Math.round(ageDays),
        views,
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
        durationSec,
        isShort: durationSec > 0 && durationSec <= 60,
        viewsPerDay: Math.round(views / ageDays),
        url: `https://www.youtube.com/watch?v=${v.id}`,
      })
    }
  }
  return out
}

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function table(rows: Video[], medViews: number): string {
  const head = "| # | Views | Views/day | Age | Channel | Title | Link |\n|--:|--:|--:|--:|---|---|---|"
  const body = rows
    .map((v, i) => {
      const star = v.views >= medViews * 5 ? " 🚀" : "" // outlier flag: 5× the median
      const age = v.ageDays >= 365 ? `${(v.ageDays / 365).toFixed(1)}y` : `${v.ageDays}d`
      const title = v.title.replace(/\|/g, "\\|").slice(0, 70)
      return `| ${i + 1}${star} | ${fmt(v.views)} | ${fmt(v.viewsPerDay)} | ${age} | ${v.channel} | ${title} | [▶](${v.url}) |`
    })
    .join("\n")
  return `${head}\n${body}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const nowMs = Date.parse(new Date().toISOString())
  const recentCutoff = new Date(nowMs - args.recentMonths * 30 * 86_400_000).toISOString()

  console.log(`\n🔎 SoFi YouTube scan — ${args.queries.length} queries × 2 passes (all-time + last ${args.recentMonths}mo)\n`)
  const token = await getAccessToken()

  // Gather ids: an all-time pass + a recent pass per query, then dedupe.
  const ids = new Set<string>()
  for (const q of args.queries) {
    const [allTime, recent] = await Promise.all([
      searchIds(token, q, args.perQuery),
      searchIds(token, q, args.perQuery, recentCutoff),
    ])
    ;[...allTime, ...recent].forEach((id) => ids.add(id))
    console.log(`  · "${q}" → ${allTime.length}+${recent.length} hits`)
  }
  console.log(`\n📊 ${ids.size} unique videos → fetching real view counts…\n`)

  // "SoFi" collides with SoFi Stadium, the movie "Sofi", NBA games, concerts,
  // people named Sofi. Keep only finance/banking videos: title names SoFi AND a
  // money keyword, and hits none of the noise terms.
  const FINANCE = /\b(bank|banking|saving|checking|hysa|apy|interest|bonus|invest|brokerage|roth|ira|credit|loan|refinance|money|account|review|worth it|pros|cons|deposit|fintech|app|honest|exposed)\b/i
  const NOISE = /\b(stadium|nba|nfl|rams|chargers|super bowl|concert|kanye|ye |tour|movie|film|malayalam|season|episode|scene|highlights|full game|play-in|model|patrona|wrestling|gameplay|book|novel|philosophy|sansaar)\b/i
  // SoFi-the-stock (ticker SOFI) is a different niche from SoFi-the-bank.
  const STOCK = /\b(stock|shares|price target|earnings|ticker|nyse|nasdaq|buy now|sell|short squeeze|nu battle|forecast|bull|bear|dividend)\b/i
  const all = (await fetchStats(token, [...ids], nowMs))
    .filter((v) => v.views >= args.minViews)
    .filter((v) => /\bsofi\b/i.test(v.title))
    .filter((v) => FINANCE.test(v.title))
    .filter((v) => !NOISE.test(v.title))
    .filter((v) => !STOCK.test(v.title))
    .filter((v) => v.channel.toLowerCase() !== "sofi") // drop SoFi's own brand channel — we want creator models

  const long = all.filter((v) => !v.isShort).sort((a, b) => b.views - a.views)
  const shorts = all.filter((v) => v.isShort).sort((a, b) => b.views - a.views)
  const recent = all
    .filter((v) => !v.isShort && Date.parse(`${v.publishedAt}T00:00:00Z`) >= nowMs - args.recentMonths * 30 * 86_400_000)
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay)

  const medLong = median(long.map((v) => v.views))
  const topLong = long.slice(0, 25)
  const outliers = long.filter((v) => v.views >= medLong * 5)

  const report =
    `# SoFi YouTube — Real Performance Scan\n\n` +
    `Pulled via YouTube Data API v3 (real view counts). Date: ${new Date(nowMs).toISOString().slice(0, 10)}. ` +
    `${all.length} SoFi videos analyzed (${long.length} long-form, ${shorts.length} Shorts). ` +
    `Long-form median = **${fmt(medLong)}** views. 🚀 = outlier (≥5× median).\n\n` +
    `## 🏆 Best performers — long-form (by total views)\n\n${table(topLong, medLong)}\n\n` +
    `## 🔥 Recent momentum — last ${args.recentMonths} months (by views/day)\n\n` +
    `What's accumulating views fastest *right now* — the freshest signal for what's working.\n\n${table(recent.slice(0, 15), medLong)}\n\n` +
    `## 📈 Statistical outliers (≥5× the median — the breakout hits)\n\n` +
    (outliers.length ? table(outliers.slice(0, 15), medLong) : "_None found in this run._") +
    `\n\n## 📱 Shorts (separate scale — don't compare to long-form)\n\n${table(shorts.slice(0, 10), median(shorts.map((s) => s.views)))}\n\n` +
    `---\n_Queries: ${args.queries.map((q) => `"${q}"`).join(", ")}. ` +
    `Titles must contain "SoFi"; min ${fmt(args.minViews)} views. Shorts = ≤60s._\n`

  const outDir = join("scripts", "sofi-research", "output")
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, "top-sofi-videos.md")
  writeFileSync(outFile, report)

  // Console summary — top 15 long-form.
  console.log("RANK  VIEWS    V/DAY   AGE     CHANNEL                TITLE")
  topLong.slice(0, 15).forEach((v, i) => {
    const age = v.ageDays >= 365 ? `${(v.ageDays / 365).toFixed(1)}y` : `${v.ageDays}d`
    const star = v.views >= medLong * 5 ? "🚀" : "  "
    console.log(
      `${String(i + 1).padStart(2)} ${star} ${fmt(v.views).padStart(6)}  ${fmt(v.viewsPerDay).padStart(5)}  ${age.padStart(5)}  ${v.channel.slice(0, 20).padEnd(20)}  ${v.title.slice(0, 50)}`,
    )
  })
  console.log(`\n✓ Full report → ${outFile}\n`)
}

main().catch((e) => {
  console.error("\n✗ " + (e instanceof Error ? e.message : String(e)))
  process.exit(1)
})
