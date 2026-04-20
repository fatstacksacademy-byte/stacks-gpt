/* eslint-disable no-console */
/**
 * Search-based offer-link finder for the long tail.
 *
 * After find-offer-links covers the top-7 issuer catalogs (~93 links),
 * 186 cards still have offer_link === "". Many are co-brand (Marriott,
 * AAdvantage, Hilton family, Bilt) or live at credit-union and smaller-
 * issuer sites we don't have bespoke scrapers for.
 *
 * Strategy: per-card DuckDuckGo HTML search → pick the first result on
 * a known issuer/brand domain. DDG has no JS, no API key required, and
 * returns plain HTML that's trivial to regex.
 *
 * Conservative match rules to avoid junk:
 *   - URL host must be on a curated allowlist of issuer/brand domains
 *   - URL path must NOT look like a comparison / blog / review page
 *     (we want the actual issuer apply or product page)
 *   - We try queries in priority order; first hit wins
 *
 * Flags:
 *   --limit=N    only process the first N missing cards (handy for testing)
 *   --dry-run    (default) write proposals, don't patch the catalog
 *   --apply      patch creditCardBonuses.ts in place
 *   --concurrency=N   parallel DDG requests (default 1; bump cautiously)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"

const args = process.argv.slice(2)
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const DRY_RUN = args.includes("--dry-run") || !args.includes("--apply")
const CONCURRENCY = Number(args.find(a => a.startsWith("--concurrency="))?.split("=")[1] ?? 1) || 1

const ROOT = process.cwd()
const OUT_DIR = join(ROOT, "verification-output")
const CATALOG_PATH = join(ROOT, "lib", "data", "creditCardBonuses.ts")

// Denylist approach: block aggregator/review/blog domains and let
// everything else through. The web is too big to allowlist every
// credit-union and small-issuer domain in advance, and false negatives
// (skipping a real card) cost more than false positives (the verify:cards
// cron will catch a bad URL on its next run).
const DENYLIST_HOSTS = [
  // Aggregators / comparison sites
  "nerdwallet.com",
  "bankrate.com",
  "creditkarma.com",
  "creditcards.com",
  "wallethub.com",
  "magnifymoney.com",
  "lendingtree.com",
  "smartasset.com",
  "thebalance.com", "thebalancemoney.com",
  "doctorofcredit.com",
  "thepointsguy.com",
  "frequentmiler.com",
  "milesgeek.com", "milestomemories.com",
  "onemileatatime.com",
  "uponarriving.com",
  "viewfromthewing.com",
  "godsavethepoints.com",
  "awardwallet.com",
  "investopedia.com",
  "forbes.com", "fool.com", "kiplinger.com",
  "wsj.com", "nytimes.com", "cnbc.com",
  "reddit.com", "youtube.com", "wikipedia.org",
  "linkedin.com", "facebook.com", "twitter.com", "x.com",
  "fatstacksacademy.com", "richwithpoints.com", "creditshifu.com",
  // Generic search / aggregator nav
  "google.com", "bing.com", "yahoo.com", "duckduckgo.com",
]

// Path patterns to exclude from any candidate URL (blog/comparison/news).
const PATH_EXCLUDES = [
  "/blog/", "/news/", "/article", "/help/", "/faq", "/guide", "/insights",
  "/compare", "/best-", "/review/", "/customer-service",
  "/topic/", "/learning-center", "/learning/",
]

type SearchResult = { url: string; title: string }
type Match = { catalogId: string; catalogName: string; chosenUrl: string; chosenTitle: string }
type Skip = { catalogId: string; catalogName: string; reason: string }

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase()
  return !DENYLIST_HOSTS.some(d => h === d || h.endsWith("." + d))
}

function isExcludedPath(path: string): boolean {
  const p = path.toLowerCase()
  return PATH_EXCLUDES.some(ex => p.includes(ex))
}

async function ddgSearch(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  })
  if (!res.ok) {
    throw new Error(`DDG ${res.status}`)
  }
  const html = await res.text()
  // DDG HTML results: <a class="result__a" href="...">title</a>
  // The href has DDG's own redirect wrapper that includes a `uddg` query param
  // pointing at the real URL. We unwrap it.
  const out: SearchResult[] = []
  const anchorRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html)) !== null) {
    let href = m[1]
    // Unwrap DDG redirect if present
    try {
      const u = new URL(href, "https://html.duckduckgo.com/")
      const real = u.searchParams.get("uddg")
      if (real) href = real
      else href = u.href
    } catch { continue }
    const title = m[2].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim()
    out.push({ url: href, title })
    if (out.length >= 8) break
  }
  return out
}

function buildQueries(cardName: string, issuer: string): string[] {
  // Try most-specific first, fall back to broader.
  const issuerHint = issuer === "amex" ? "American Express"
    : issuer === "bofa" ? "Bank of America"
    : issuer === "us-bank" ? "US Bank"
    : issuer === "capital-one" ? "Capital One"
    : issuer === "fnbo" ? "First National Bank of Omaha"
    : issuer.charAt(0).toUpperCase() + issuer.slice(1).replace(/-/g, " ")
  return [
    `"${cardName}" ${issuerHint} apply`,
    `${cardName} ${issuerHint} credit card apply`,
    `${cardName} apply credit card`,
  ]
}

// Tokens we'd expect to see in the host of a legitimate issuer page.
function expectedHostTokens(cardName: string, issuer: string): string[] {
  const out = new Set<string>()
  // Issuer normalization back to a likely host token.
  const issuerHostTokens: Record<string, string[]> = {
    "amex": ["americanexpress"],
    "bofa": ["bankofamerica", "bofa"],
    "capital-one": ["capitalone"],
    "us-bank": ["usbank"],
    "wells-fargo": ["wellsfargo"],
    "fnbo": ["fnbo", "firstnational"],
    "abound-fcu": ["abound"],
    "affinity-fcu": ["affinityfcu"],
    "alliant": ["alliantcreditunion"],
    "navy-federal": ["navyfederal"],
    "penfed": ["penfed"],
    "comenity": ["comenity"],
    "cardless": ["cardless"],
  }
  const issuerHosts = issuerHostTokens[issuer] ?? [issuer.replace(/-/g, "")]
  for (const t of issuerHosts) out.add(t)
  // Card-name tokens long enough to be meaningful (skip 1-2 char noise).
  for (const t of cardName.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)) {
    if (t.length >= 4) out.add(t)
  }
  return Array.from(out)
}

function hostMatchesAny(host: string, tokens: string[]): boolean {
  const h = host.toLowerCase()
  return tokens.some(t => h.includes(t))
}

async function findLinkForCard(card: { id: string; card_name: string; issuer: string }): Promise<Match | Skip> {
  const queries = buildQueries(card.card_name, card.issuer)
  const expectedTokens = expectedHostTokens(card.card_name, card.issuer)
  for (const q of queries) {
    let results: SearchResult[]
    try {
      results = await ddgSearch(q)
    } catch (e) {
      // Wait briefly on rate-limit / network blips and try the next query.
      await new Promise(r => setTimeout(r, 1500))
      continue
    }
    for (const r of results) {
      let url: URL
      try { url = new URL(r.url) } catch { continue }
      if (!isAllowedHost(url.host)) continue                  // denylist (aggregators)
      if (!hostMatchesAny(url.host, expectedTokens)) continue // host must look related
      if (isExcludedPath(url.pathname)) continue
      if (url.pathname === "/" || url.pathname === "") continue
      return {
        catalogId: card.id,
        catalogName: card.card_name,
        chosenUrl: url.href.split("#")[0],
        chosenTitle: r.title,
      }
    }
    // Small inter-query pause to be polite to DDG.
    await new Promise(r => setTimeout(r, 500))
  }
  return { catalogId: card.id, catalogName: card.card_name, reason: "no related-host result" }
}

function patchCatalog(matches: Match[]): number {
  let src = readFileSync(CATALOG_PATH, "utf8")
  let patched = 0
  for (const m of matches) {
    const idLine = `id: ${JSON.stringify(m.catalogId)},`
    const idIdx = src.indexOf(idLine)
    if (idIdx < 0) continue
    const window = src.slice(idIdx, idIdx + 1500)
    const newWindow = window.replace(/offer_link:\s*"",/, `offer_link: ${JSON.stringify(m.chosenUrl)},`)
    if (newWindow === window) continue
    src = src.slice(0, idIdx) + newWindow + src.slice(idIdx + 1500)
    patched++
  }
  writeFileSync(CATALOG_PATH, src)
  return patched
}

async function main() {
  ensureDir(OUT_DIR)
  let targets = creditCardBonuses
    .filter(c => !c.expired && (!c.offer_link || c.offer_link.length === 0))
    .map(c => ({ id: c.id, card_name: c.card_name, issuer: c.issuer }))
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Searching DDG for ${targets.length} cards (concurrency ${CONCURRENCY})…`)
  const limit = pLimit(CONCURRENCY)
  const matches: Match[] = []
  const skipped: Skip[] = []
  let done = 0
  await Promise.all(
    targets.map(t =>
      limit(async () => {
        const r = await findLinkForCard(t)
        if ("chosenUrl" in r) matches.push(r)
        else skipped.push(r)
        done++
        const tag = "chosenUrl" in r ? "✅" : "⏭️"
        const detail = "chosenUrl" in r ? r.chosenUrl : r.reason
        console.log(`[${done}/${targets.length}] ${tag} ${t.card_name} (${t.issuer}) — ${detail}`)
        // Conservative pace between cards to avoid DDG rate-limit.
        await new Promise(r => setTimeout(r, 750))
      }),
    ),
  )

  console.log(``)
  console.log(`Matched: ${matches.length}, Skipped: ${skipped.length}`)

  writeFileSync(join(OUT_DIR, "search-offer-links-proposals.json"), JSON.stringify({ matches, skipped }, null, 2))
  console.log(`Proposals written to ${join(OUT_DIR, "search-offer-links-proposals.json")}`)

  if (DRY_RUN) {
    console.log(`(dry-run) Pass --apply to patch creditCardBonuses.ts.`)
    return
  }
  const patched = patchCatalog(matches)
  console.log(`Patched ${patched} catalog entries`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
