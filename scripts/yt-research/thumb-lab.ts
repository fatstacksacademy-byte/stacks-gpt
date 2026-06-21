/**
 * thumb-lab — thumbnail intelligence for Fat Stacks.
 *
 * "See what thumbnails are doing best, then copy those elements." Mines winner
 * video IDs already collected by the other yt-research scans (format-radar,
 * velocity, competitor stats → output/**.md, ~zero search quota), pulls each
 * video's real thumbnail + stats, vision-tags the winning visual elements with
 * Claude, and writes a playbook + machine recipe.
 *
 * IDs are split into TWO pools so big-channel views/day doesn't drown the niche:
 *   - NICHE  (your finance/competitor scans) → the recipe you FOLLOW
 *   - CROSS  (format-radar viral, all categories) → packaging tricks to BORROW
 *
 *   npm run yt:thumbs                 # mine existing IDs (no search quota)
 *   npm run yt:thumbs -- --fresh      # + small niche search top-up (uses quota)
 *   npm run yt:thumbs -- --niche=28 --cross=14
 *
 * Output → scripts/yt-research/output/_thumbs/{playbook.md, playbook.json, img/}
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"
if (process.loadEnvFile) { try { process.loadEnvFile(".env.local") } catch {} }
import Anthropic from "@anthropic-ai/sdk"
import { getAccessToken, searchIds } from "./youtube"

const OUT = join("scripts", "yt-research", "output", "_thumbs")
const IMG = join(OUT, "img")
const CACHE_FILE = join(OUT, "cache.json")
const MODEL = "claude-haiku-4-5-20251001"
const ROOT = join("scripts", "yt-research", "output")

function arg(name: string, def: string): string {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const NICHE_N = Number(arg("niche", "28"))
const CROSS_N = Number(arg("cross", "14"))
const FRESH = process.argv.includes("--fresh")
const NICHE_QUERIES = [
  "best credit cards 2026", "credit card tier list", "best bank account bonus",
  "churning credit cards", "best travel credit card 2026", "i tried every bank bonus",
]

/** id -> "niche" | "cross", classified by which scan surfaced it. */
function mineIds(): Map<string, "niche" | "cross"> {
  const ids = new Map<string, "niche" | "cross">()
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      const s = statSync(p)
      if (s.isDirectory()) { if (f !== "_thumbs") walk(p) }
      else if (f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".json")) {
        const cross = /_formats|format-radar/.test(p)
        const t = readFileSync(p, "utf8")
        for (const m of t.matchAll(/watch\?v=([A-Za-z0-9_-]{11})/g)) {
          const id = m[1]
          // niche wins ties (a finance video that also matched a format query is still finance)
          if (!ids.has(id) || !cross) ids.set(id, cross ? "cross" : "niche")
        }
      }
    }
  }
  if (existsSync(ROOT)) walk(ROOT)
  return ids
}

type V = {
  id: string; title: string; channel: string; publishedAt: string; ageDays: number
  views: number; viewsPerDay: number; durationSec: number; isShort: boolean
  categoryId: string; thumb: string; url: string; pool: "niche" | "cross"
}
function durSec(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0
}
async function fetchWithThumbs(token: string, pools: Map<string, "niche" | "cross">, nowMs: number): Promise<V[]> {
  const ids = [...pools.keys()]
  const out: V[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const qs = new URLSearchParams({ part: "snippet,statistics,contentDetails", id: chunk.join(","), maxResults: "50" })
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, { headers: { authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`videos.list ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      items?: Array<{ id: string
        snippet?: { title?: string; channelTitle?: string; publishedAt?: string; categoryId?: string; thumbnails?: Record<string, { url?: string }> }
        statistics?: { viewCount?: string }; contentDetails?: { duration?: string } }>
    }
    for (const v of data.items ?? []) {
      const pub = v.snippet?.publishedAt ?? ""
      const ageDays = pub ? Math.max(1, (nowMs - Date.parse(pub)) / 86_400_000) : 1
      const views = Number(v.statistics?.viewCount ?? 0)
      const d = durSec(v.contentDetails?.duration ?? "")
      const th = v.snippet?.thumbnails ?? {}
      const thumb = th.maxres?.url ?? th.standard?.url ?? th.high?.url ?? th.medium?.url ?? th.default?.url ?? ""
      out.push({
        id: v.id, title: v.snippet?.title ?? "", channel: v.snippet?.channelTitle ?? "",
        publishedAt: pub.slice(0, 10), ageDays: Math.round(ageDays), views,
        viewsPerDay: Math.round(views / ageDays), durationSec: d, isShort: d > 0 && d <= 60,
        categoryId: v.snippet?.categoryId ?? "?", thumb, url: `https://www.youtube.com/watch?v=${v.id}`,
        pool: pools.get(v.id)!,
      })
    }
  }
  return out
}

type Tags = {
  format: string; has_face: boolean; face_count: number; expression: string
  face_position: string; text: string; word_count: number; text_color: string
  accent_colors: string[]; has_arrow_or_circle: boolean; has_card_or_product: boolean
  has_number_or_dollar: boolean; bg_type: string; hook_type: string; why_it_works: string
}
const VISION_PROMPT =
  `You are a YouTube thumbnail analyst. Analyze ONLY the thumbnail image. Return ONE minified JSON object, no prose, EXACTLY these keys:\n` +
  `{"format":"tier_list|listicle|experiential|alert_news|comparison|tutorial|reaction|other","has_face":bool,"face_count":int,` +
  `"expression":"shocked|excited|serious|smug|neutral|none","face_position":"left|right|center|none","text":"big on-image text verbatim (<=8 words)",` +
  `"word_count":int,"text_color":"dominant text color word","accent_colors":["1-3 dominant non-text colors"],"has_arrow_or_circle":bool,` +
  `"has_card_or_product":bool,"has_number_or_dollar":bool,"bg_type":"solid|gradient|photo|collage","hook_type":"curiosity|fear|greed|authority|controversy|how_to","why_it_works":"<=14 words"}`

async function analyze(client: Anthropic, b64: string): Promise<Tags | null> {
  try {
    const resp = await client.messages.create({
      model: MODEL, max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
        { type: "text", text: VISION_PROMPT },
      ] }],
    })
    const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim()
    const s = text.indexOf("{"), e = text.lastIndexOf("}")
    return JSON.parse(text.slice(s, e + 1)) as Tags
  } catch (err) { console.warn(`  ! vision failed: ${err instanceof Error ? err.message.slice(0, 80) : err}`); return null }
}

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0)
const mode = (list: Tags[], sel: (t: Tags) => string) => {
  const c: Record<string, number> = {}
  for (const t of list) { const v = sel(t) || "?"; c[v] = (c[v] ?? 0) + 1 }
  return Object.entries(c).sort((a, b) => b[1] - a[1])
}

type AV = V & { tags: Tags }
function recipesFor(items: AV[]) {
  const byFormat: Record<string, AV[]> = {}
  for (const a of items) (byFormat[a.tags.format] ??= []).push(a)
  return Object.entries(byFormat).map(([format, list]) => {
    const wc = list.map((a) => a.tags.word_count).filter(Boolean).sort((a, b) => a - b)
    return {
      format, n: list.length,
      face_position: mode(list.map((a) => a.tags), (t) => t.face_position)[0]?.[0] ?? "right",
      expression: mode(list.map((a) => a.tags), (t) => t.expression)[0]?.[0] ?? "shocked",
      text_color: mode(list.map((a) => a.tags), (t) => t.text_color)[0]?.[0] ?? "yellow",
      bg_type: mode(list.map((a) => a.tags), (t) => t.bg_type)[0]?.[0] ?? "gradient",
      hook_type: mode(list.map((a) => a.tags), (t) => t.hook_type)[0]?.[0] ?? "curiosity",
      median_words: wc.length ? wc[Math.floor(wc.length / 2)] : 4,
      accent_colors: [...new Set(list.flatMap((a) => a.tags.accent_colors || []))].slice(0, 4),
      arrow_or_circle: pct(list.filter((a) => a.tags.has_arrow_or_circle).length, list.length) >= 40,
      exemplars: list.sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, 3)
        .map((a) => ({ img: `img/${a.id}.jpg`, text: a.tags.text, vpd: a.viewsPerDay, channel: a.channel, url: a.url })),
    }
  }).sort((a, b) => b.n - a.n)
}
function globalFor(items: AV[]) {
  const tags = items.map((a) => a.tags)
  const wc = tags.map((t) => t.word_count).filter(Boolean).sort((a, b) => a - b)
  const boolKeys: Array<keyof Tags> = ["has_face", "has_arrow_or_circle", "has_card_or_product", "has_number_or_dollar"]
  const lift = boolKeys.map((k) => ({ k: String(k), pct: pct(items.filter((a) => a.tags[k] as boolean).length, items.length) })).sort((a, b) => b.pct - a.pct)
  return {
    median_title_words: wc.length ? wc[Math.floor(wc.length / 2)] : 4,
    top_expression: mode(tags, (t) => t.expression)[0]?.[0],
    top_face_position: mode(tags, (t) => t.face_position)[0]?.[0],
    top_text_color: mode(tags, (t) => t.text_color)[0]?.[0],
    top_bg: mode(tags, (t) => t.bg_type)[0]?.[0],
    element_pct: lift,
  }
}

async function analyzePool(client: Anthropic, vids: V[], cache: Record<string, Tags>): Promise<AV[]> {
  const out: AV[] = []
  for (let i = 0; i < vids.length; i++) {
    const v = vids[i]
    try {
      const imgPath = join(IMG, `${v.id}.jpg`)
      let b64: string | null = null
      if (!existsSync(imgPath)) {
        const r = await fetch(v.thumb)
        if (!r.ok) { console.log(`    skip ${v.id} (thumb ${r.status})`); continue }
        const buf = Buffer.from(await r.arrayBuffer())
        writeFileSync(imgPath, buf); b64 = buf.toString("base64")
      }
      let tags = cache[v.id]
      if (!tags) {
        if (!b64) b64 = readFileSync(imgPath).toString("base64")
        const t = await analyze(client, b64); if (!t) continue
        tags = t; cache[v.id] = t
      }
      out.push({ ...v, tags })
      console.log(`    ${v.viewsPerDay.toLocaleString()}/day · ${tags.format} · "${tags.text}" (${v.channel.slice(0, 20)})`)
    } catch (e) { console.log(`    err ${v.id}: ${e instanceof Error ? e.message.slice(0, 60) : e}`) }
  }
  return out
}

async function main() {
  mkdirSync(IMG, { recursive: true })
  const nowMs = Date.now()
  console.log("\n🖼  thumb-lab — thumbnail intelligence (niche + cross-niche)\n")
  const pools = mineIds()
  console.log(`  mined ${pools.size} IDs (niche=${[...pools.values()].filter((x) => x === "niche").length}, cross=${[...pools.values()].filter((x) => x === "cross").length})`)
  const token = await getAccessToken()
  if (FRESH) for (const q of NICHE_QUERIES) {
    try { const got = await searchIds(token, q, 15); got.forEach((id) => { if (!pools.has(id)) pools.set(id, "niche") }); console.log(`  + "${q}" → ${got.length}`) }
    catch (e) { console.log(`  ! "${q}" ${e instanceof Error ? e.message.slice(0, 50) : e}`) }
  }

  const all = (await fetchWithThumbs(token, pools, nowMs)).filter((v) => !v.isShort && v.thumb && v.durationSec > 120)
  const niche = all.filter((v) => v.pool === "niche").sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, NICHE_N)
  const cross = all.filter((v) => v.pool === "cross").sort((a, b) => b.viewsPerDay - a.viewsPerDay).slice(0, CROSS_N)
  const cache: Record<string, Tags> = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {}
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  console.log(`\n  NICHE (finance) — analyzing ${niche.length}:`)
  const nicheA = await analyzePool(client, niche, cache)
  console.log(`\n  CROSS-NICHE (viral packaging) — analyzing ${cross.length}:`)
  const crossA = await analyzePool(client, cross, cache)
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  if (!nicheA.length && !crossA.length) { console.error("\n✗ nothing analyzed"); process.exit(1) }

  const playbook = {
    generatedAt: new Date().toISOString(),
    niche: { sample: nicheA.length, global: globalFor(nicheA), recipes: recipesFor(nicheA) },
    crossniche: { sample: crossA.length, global: globalFor(crossA), patterns: recipesFor(crossA) },
  }
  writeFileSync(join(OUT, "playbook.json"), JSON.stringify(playbook, null, 2))

  const md: string[] = []
  md.push(`# Thumbnail playbook — Fat Stacks`, ``)
  md.push(`_Generated ${playbook.generatedAt.slice(0, 16).replace("T", " ")}. NICHE = ${nicheA.length} finance/competitor winners (the recipe you follow). CROSS = ${crossA.length} all-category viral thumbnails (packaging to borrow). Ranked by views/day WITHIN each pool so big channels don't drown the niche._`, ``)
  const section = (title: string, g: ReturnType<typeof globalFor>, recipes: ReturnType<typeof recipesFor>) => {
    md.push(`## ${title}`, ``)
    md.push(`- **Title length:** median ${g.median_title_words} words · **Face:** ${g.top_expression}, ${g.top_face_position} · **Text:** ${g.top_text_color} · **BG:** ${g.top_bg}`)
    md.push(`- **Element presence:** ${g.element_pct.map((e) => `${e.k.replace(/_/g, " ")} ${e.pct}%`).join(" · ")}`, ``)
    for (const r of recipes) {
      md.push(`**${r.format}** (${r.n}) — face ${r.expression}/${r.face_position} · ${r.median_words} words · ${r.text_color} text · ${r.bg_type} bg · accents ${r.accent_colors.join(",")} · arrow:${r.arrow_or_circle ? "y" : "n"}`)
      for (const ex of r.exemplars) md.push(`  - \`${ex.img}\` "${ex.text}" — ${ex.vpd.toLocaleString()}/day · ${ex.channel} · ${ex.url}`)
    }
    md.push(``)
  }
  section("FINANCE NICHE — follow this", playbook.niche.global, playbook.niche.recipes)
  section("CROSS-NICHE VIRAL — borrow these tricks", playbook.crossniche.global, playbook.crossniche.patterns)
  writeFileSync(join(OUT, "playbook.md"), md.join("\n"))

  console.log(`\n✓ playbook → ${join(OUT, "playbook.md")}`)
  console.log(`✓ recipe  → ${join(OUT, "playbook.json")}  (generator reads .niche.recipes)`)
  console.log(`✓ exemplars + cache → ${IMG}`)
  console.log(`\nNICHE formats: ${mode(nicheA.map((a) => a.tags), (t) => t.format).slice(0, 5).map((f) => `${f[0]}×${f[1]}`).join(", ")}`)
  console.log(`CROSS formats: ${mode(crossA.map((a) => a.tags), (t) => t.format).slice(0, 5).map((f) => `${f[0]}×${f[1]}`).join(", ")}`)
}
main().catch((e) => { console.error("\n✗ " + (e instanceof Error ? e.message : String(e))); process.exit(1) })
