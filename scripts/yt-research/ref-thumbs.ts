/** ref-thumbs — download recent thumbnails from benchmark finance creators for
 *  side-by-side thumbnail audits. Output → /tmp/state-sweep/ref-thumbs/<creator>/ */
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
if (process.loadEnvFile) { try { process.loadEnvFile(".env.local") } catch {} }
import { getAccessToken, searchIds } from "./youtube"

const OUT = "/tmp/state-sweep/ref-thumbs"
const creators = [
  { name: "Daniel Braun", q: "Daniel Braun credit card", match: "braun" },
  { name: "Naam Wynn", q: "Naam Wynn credit card", match: "naam" },
  { name: "Humphrey Yang", q: "Humphrey Yang credit card", match: "humphrey" },
]

async function main() {
  const token = await getAccessToken()
  for (const c of creators) {
    mkdirSync(join(OUT, c.match), { recursive: true })
    const ids = await searchIds(token, c.q, 25)
    const qs = new URLSearchParams({ part: "snippet,statistics", id: ids.join(","), maxResults: "50" })
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, { headers: { authorization: `Bearer ${token}` } })
    const data = (await res.json()) as { items?: Array<{ id: string; snippet?: { title?: string; channelTitle?: string; thumbnails?: Record<string, { url?: string }> } }> }
    let n = 0
    for (const v of data.items ?? []) {
      const ch = (v.snippet?.channelTitle ?? "").toLowerCase()
      if (!ch.includes(c.match)) continue
      const th = v.snippet?.thumbnails ?? {}
      const url = th.maxres?.url ?? th.high?.url ?? th.standard?.url
      if (!url) continue
      const b = Buffer.from(await (await fetch(url)).arrayBuffer())
      writeFileSync(join(OUT, c.match, `${v.id}.jpg`), b)
      console.log(`  ${c.name}: ${v.id}  "${(v.snippet?.title ?? "").slice(0, 52)}"`)
      if (++n >= 4) break
    }
    console.log(`${c.name}: ${n} thumbnails saved`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
