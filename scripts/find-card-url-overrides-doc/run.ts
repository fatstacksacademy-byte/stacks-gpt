/* eslint-disable no-console */
/**
 * Find URL overrides for broken card pages using Doctor of Credit as the
 * source. Companion to scripts/find-card-url-overrides/run.ts (which uses
 * issuer catalog pages and fails on Amex CSP).
 *
 * For each broken card from the latest verify-cards run:
 *   1. Hit DoC's WordPress search (/?s=<card_name>)
 *   2. Harvest (article_title, article_url) pairs
 *   3. Score each result by:
 *        - title token overlap with card_name (heavier weight)
 *        - URL slug token overlap with card_name (lighter weight)
 *   4. If the best score ≥ threshold, propose that DoC URL as the override
 *
 * Why DoC works where issuer catalogs don't:
 *   - No CSP blocking Playwright eval
 *   - Standard WordPress theme — predictable .entry-title anchors
 *   - URL slugs include card-name tokens
 *   - Existing card has a dedicated review page for nearly every card we track
 *
 * Flags:
 *   --apply           insert overrides (default: dry-run JSON only)
 *   --threshold=N     minimum score (default 0.55 — DoC titles often have
 *                     "Review" / "Increase!" / etc. so we accept a lower bar)
 *   --limit=N         only process N cards (debugging)
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { createClient } from "@supabase/supabase-js"
import { closeBrowser, getContext } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const THRESHOLD = Number(args.find((a) => a.startsWith("--threshold="))?.split("=")[1] ?? 0.55)
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0)

const ROOT = process.cwd()
const OUT_DIR = join(ROOT, "verification-output")
const CACHE_DIR = join(ROOT, ".cache", "find-card-url-overrides-doc")
const ADMIN_EMAIL = "booth.nathaniel@gmail.com"
const CONCURRENCY = 2 // be polite to DoC

const NOISE_TOKENS = new Set([
  "card", "credit", "rewards", "the", "and", "with", "a", "an", "for",
  "review", "increased", "increase", "bonus", "offer", "best", "new",
  "®", "™", "©", "sm", "visa", "mastercard", "signature",
])

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 +&]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !NOISE_TOKENS.has(t))
}

const ISSUER_TOKENS = new Set([
  "capital", "one", "chase", "citi", "amex", "american", "express",
  "wells", "fargo", "barclays", "bofa", "bank", "us", "discover",
  "synchrony", "fnbo", "truist", "regions", "penfed", "sofi", "ally",
])

function nameSimilarity(a: string, b: string): number {
  const ta = normalizeTokens(a)
  const tb = normalizeTokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const sa = new Set(ta)
  const sb = new Set(tb)
  let overlap = 0
  let nonIssuerOverlap = 0
  for (const t of sa) {
    if (sb.has(t)) {
      overlap++
      if (!ISSUER_TOKENS.has(t)) nonIssuerOverlap++
    }
  }
  if (nonIssuerOverlap === 0) return 0
  return overlap / Math.min(sa.size, sb.size)
}

// URL slug: e.g. "/american-express-platinum-card-review/" → ["american","express","platinum"]
function slugTokens(url: string): string[] {
  try {
    const u = new URL(url)
    return normalizeTokens(u.pathname.replace(/[-_/]+/g, " "))
  } catch {
    return []
  }
}

function combinedScore(cardName: string, articleTitle: string, articleUrl: string): number {
  const titleScore = nameSimilarity(cardName, articleTitle)
  const slugScore = nameSimilarity(cardName, slugTokens(articleUrl).join(" "))
  // Weight title 0.7, slug 0.3 — title is more semantic, slug is more reliable.
  return titleScore * 0.7 + slugScore * 0.3
}

type DocResult = { title: string; url: string }

const cacheFor = (key: string) => join(CACHE_DIR, key.replace(/[^a-z0-9-_]/gi, "_") + ".json")

async function searchDoc(query: string, cacheKey: string): Promise<DocResult[]> {
  const cachePath = cacheFor(cacheKey)
  if (existsSync(cachePath)) {
    try {
      return JSON.parse(readFileSync(cachePath, "utf8"))
    } catch {}
  }
  const ctx = await getContext()
  const page = await ctx.newPage()
  const searchUrl = `https://www.doctorofcredit.com/?s=${encodeURIComponent(query)}`
  try {
    const res = await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
    if (!res || res.status() >= 400) return []
    await page.waitForTimeout(1500)
    const results = await page.evaluate(() => {
      const out: { title: string; url: string }[] = []
      // DoC uses WordPress; article titles live in h2.entry-title > a or h3.entry-title > a.
      // Fall back to any article > a[href*=doctorofcredit] just in case the theme changes.
      const titleAnchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          "h1.entry-title a, h2.entry-title a, h3.entry-title a",
        ),
      )
      for (const a of titleAnchors) {
        const title = (a.innerText || a.textContent || "").trim().replace(/\s+/g, " ")
        if (!title || title.length < 5) continue
        try {
          const u = new URL(a.href)
          if (!/doctorofcredit\.com/.test(u.host)) continue
          // Skip tag/category index pages.
          if (/^\/(tag|category|page|author)\//.test(u.pathname)) continue
          out.push({ title, url: u.href.split("#")[0] })
        } catch {}
      }
      return out.slice(0, 10)
    })
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(cachePath, JSON.stringify(results))
    return results
  } catch (e) {
    console.log(`  [doc-search] error for "${query}": ${e instanceof Error ? e.message : String(e)}`)
    return []
  } finally {
    await page.close()
  }
}

type Proposal = {
  card_id: string
  card_name: string
  issuer: string
  page_signal: string
  current_url: string | null
  override_url: string
  match_title: string
  score: number
}

function urlsEquivalent(a: string, b: string): boolean {
  if (a === b) return true
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    const norm = (u: URL) => `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}`
    return norm(ua) === norm(ub)
  } catch {
    return false
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  const { data: latest } = await supabase
    .from("card_verifications")
    .select("run_at")
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latest?.run_at) {
    console.error("No card_verifications rows found.")
    process.exit(1)
  }
  const { data: brokenRows, error: bErr } = await supabase
    .from("card_verifications")
    .select("card_id, card_name, page_signal, url")
    .eq("run_at", latest.run_at)
    .in("page_signal", ["card_name_mismatch", "no_fields_extracted", "redirected_to_generic"])
  if (bErr) {
    console.error("broken-cards query failed:", bErr.message)
    process.exit(1)
  }
  let targets = brokenRows ?? []
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)
  console.log(`Broken-page cards to attempt: ${targets.length}`)

  const { data: existingOverrides } = await supabase
    .from("card_url_overrides")
    .select("card_id")
    .eq("is_active", true)
  const existingByCard = new Set<string>((existingOverrides ?? []).map((o) => o.card_id))

  const cardById = new Map<string, CreditCardBonus>()
  for (const c of creditCardBonuses) cardById.set(c.id, c)

  const proposals: Proposal[] = []
  const sameUrl: Array<{ card_id: string; card_name: string; issuer: string; page_signal: string; match_title: string; score: number }> = []
  const lowScore: Array<{ card_id: string; card_name: string; issuer: string; page_signal: string; best?: { title: string; url: string; score: number } }> = []
  const noResults: Array<{ card_id: string; card_name: string; issuer: string; page_signal: string }> = []
  const skippedExisting: string[] = []

  const limit = pLimit(CONCURRENCY)
  let done = 0

  await Promise.all(
    targets.map((t) =>
      limit(async () => {
        const card = cardById.get(t.card_id)
        const issuer = card?.issuer ?? "unknown"
        if (existingByCard.has(t.card_id)) {
          skippedExisting.push(t.card_id)
          done++
          return
        }
        // Search DoC. Try with issuer prefix first; if no results, retry without.
        const query = `${issuer} ${t.card_name}`.replace(/-/g, " ")
        let results = await searchDoc(query, `${t.card_id}__withissuer`)
        if (results.length === 0) {
          results = await searchDoc(t.card_name, `${t.card_id}__nameonly`)
        }
        done++
        if (results.length === 0) {
          noResults.push({ card_id: t.card_id, card_name: t.card_name, issuer, page_signal: t.page_signal })
          console.log(`[${done}/${targets.length}] ⚪ ${t.card_name} — no DoC results`)
          return
        }
        let best: { r: DocResult; s: number } | null = null
        for (const r of results) {
          const s = combinedScore(t.card_name, r.title, r.url)
          if (!best || s > best.s) best = { r, s }
        }
        if (!best || best.s < THRESHOLD) {
          lowScore.push({
            card_id: t.card_id,
            card_name: t.card_name,
            issuer,
            page_signal: t.page_signal,
            best: best ? { title: best.r.title, url: best.r.url, score: best.s } : undefined,
          })
          console.log(`[${done}/${targets.length}] ⚠️  ${t.card_name} — best ${best?.s.toFixed(2)} < ${THRESHOLD} (${best?.r.title ?? "n/a"})`)
          return
        }
        if (t.url && urlsEquivalent(t.url, best.r.url)) {
          sameUrl.push({ card_id: t.card_id, card_name: t.card_name, issuer, page_signal: t.page_signal, match_title: best.r.title, score: best.s })
          console.log(`[${done}/${targets.length}] ➖ ${t.card_name} — same URL`)
          return
        }
        proposals.push({
          card_id: t.card_id,
          card_name: t.card_name,
          issuer,
          page_signal: t.page_signal,
          current_url: t.url,
          override_url: best.r.url,
          match_title: best.r.title,
          score: best.s,
        })
        console.log(`[${done}/${targets.length}] ✅ ${t.card_name} → ${best.r.url} (${best.s.toFixed(2)})`)
      }),
    ),
  )

  await closeBrowser()

  console.log(``)
  console.log(`=== Summary ===`)
  console.log(`Proposed overrides (different URL, score >= ${THRESHOLD}): ${proposals.length}`)
  console.log(`Same URL as catalog (override won't help): ${sameUrl.length}`)
  console.log(`Low-score (best result below threshold): ${lowScore.length}`)
  console.log(`No DoC search results: ${noResults.length}`)
  console.log(`Skipped (already has active override): ${skippedExisting.length}`)
  console.log(``)

  writeFileSync(
    join(OUT_DIR, "card-url-override-proposals-doc.json"),
    JSON.stringify({ proposals, sameUrl, lowScore, noResults, skippedExisting }, null, 2),
  )
  console.log(`Wrote ${join(OUT_DIR, "card-url-override-proposals-doc.json")}`)

  if (!APPLY) {
    console.log(`(dry-run) Pass --apply to insert ${proposals.length} card_url_overrides rows.`)
    return
  }

  let inserted = 0
  for (const p of proposals) {
    const { error: deactErr } = await supabase
      .from("card_url_overrides")
      .update({ is_active: false })
      .eq("card_id", p.card_id)
      .eq("is_active", true)
    if (deactErr) {
      console.error(`  ✗ ${p.card_id} deactivate failed:`, deactErr.message)
      continue
    }
    const discoveryMethod = `Auto-discovered via Doctor of Credit search. Match title: "${p.match_title}" (score ${p.score.toFixed(2)}, threshold ${THRESHOLD}). Prior verifier signal: ${p.page_signal}.`
    const { error } = await supabase.from("card_url_overrides").insert({
      card_id: p.card_id,
      override_url: p.override_url,
      previous_url: p.current_url ?? null,
      discovery_method: discoveryMethod,
      is_active: true,
      created_by: ADMIN_EMAIL,
    })
    if (error) {
      console.error(`  ✗ ${p.card_id} insert failed:`, error.message)
      continue
    }
    inserted++
    console.log(`  ✓ ${p.card_id} → ${p.override_url}`)
  }
  console.log(``)
  console.log(`Inserted ${inserted}/${proposals.length} overrides.`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
