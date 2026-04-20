/* eslint-disable no-console */
/**
 * Find offer links for cards that ingested with offer_link === "".
 *
 * RWP gates the issuer apply URL behind login, so 279 cards landed with
 * empty offer_link. This script fills as many as it can by:
 *   1. Loading each major issuer's public /credit-cards catalog page
 *   2. Harvesting (card_name, detail_url) pairs from that page's DOM
 *   3. Fuzzy-matching our missing-link cards by token overlap
 *   4. Writing best-match proposals → optionally patching the catalog
 *
 * Coverage target: top 7 issuers (~155 cards, 56% of the gap).
 *
 * Flags:
 *   --only=ISSUER   only run for one issuer (chase/amex/bofa/...)
 *   --dry-run       (default) write proposals to verification-output, no patch
 *   --apply         actually patch creditCardBonuses.ts in place
 *   --threshold=N   token-overlap fraction needed for a match (default 0.7)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { closeBrowser, getContext } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

const args = process.argv.slice(2)
const ONLY = args.find(a => a.startsWith("--only="))?.split("=")[1]
const DRY_RUN = args.includes("--dry-run") || !args.includes("--apply")
const THRESHOLD = Number(args.find(a => a.startsWith("--threshold="))?.split("=")[1] ?? 0.6)

const ROOT = process.cwd()
const OUT_DIR = join(ROOT, "verification-output")
const CATALOG_PATH = join(ROOT, "lib", "data", "creditCardBonuses.ts")

// Issuer catalog config. Each entry tells the harvester:
//   - which page lists the issuer's full card lineup
//   - which host to filter anchors to (apply links sometimes point to a sub-domain)
//   - URL path patterns that signal a card-detail page (vs. Apply Now / Compare)
type IssuerConfig = {
  issuer: string
  catalogUrls: string[]              // crawl all of these and merge candidates
  hosts: string[]                    // anchors must point to one of these hosts
  pathIncludes?: string[]            // path must include at least one of these
  pathExcludes?: string[]            // skip if path includes any of these
}

const ISSUERS: IssuerConfig[] = [
  {
    issuer: "chase",
    catalogUrls: [
      "https://creditcards.chase.com/all-credit-cards",
      "https://creditcards.chase.com/travel-credit-cards/united",
    ],
    hosts: ["creditcards.chase.com", "www.chase.com"],
    pathIncludes: ["credit-cards/"],
    pathExcludes: ["/compare", "/applynow", "/apply-now"],
  },
  {
    issuer: "amex",
    catalogUrls: [
      // Their app blocks page.evaluate via CSP — handler falls back to HTML regex.
      "https://www.americanexpress.com/us/credit-cards/all-cards/personal-cards/",
      "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/",
    ],
    hosts: ["www.americanexpress.com", "americanexpress.com"],
    pathIncludes: ["/credit-cards/card/", "/business-credit-cards/"],
    pathExcludes: ["compare", "/apply", "view-all", "best-business"],
  },
  {
    issuer: "bofa",
    catalogUrls: ["https://www.bankofamerica.com/credit-cards/"],
    hosts: ["www.bankofamerica.com", "bankofamerica.com"],
    pathIncludes: ["/credit-cards/products/"],
    pathExcludes: ["compare"],
  },
  {
    issuer: "barclays",
    catalogUrls: ["https://cards.barclaycardus.com/cards/"],
    hosts: ["cards.barclaycardus.com", "www.barclaycardus.com", "barclaycardus.com"],
    pathIncludes: ["/cards/"],
    pathExcludes: ["compare", "applynow", "apply-now"],
  },
  {
    issuer: "capital-one",
    catalogUrls: [
      "https://www.capitalone.com/credit-cards/cash-back/",
      "https://www.capitalone.com/credit-cards/travel-and-miles/",
      "https://www.capitalone.com/credit-cards/fair-and-building/",
      "https://www.capitalone.com/credit-cards/students/",
      "https://www.capitalone.com/small-business/credit-cards/",
    ],
    hosts: ["www.capitalone.com", "capitalone.com"],
    pathIncludes: ["/credit-cards/"],
    // Skip overhead pages but allow the per-card slugs nested under category dirs.
    pathExcludes: ["compare", "/tools/", "/guides/", "card-finder", "preapprove", "/get-my-card", "/benefits/", "/faq", "/credit-cards/$", "/lp/", "/refer"],
  },
  {
    issuer: "citi",
    catalogUrls: [
      "https://www.citi.com/credit-cards/rewards-credit-cards",
      "https://www.citi.com/credit-cards/travel-reward-credit-cards",
      "https://www.citi.com/credit-cards/savings-and-cash-back-credit-cards",
      "https://www.citi.com/credit-cards/balance-transfer-credit-cards",
    ],
    hosts: ["www.citi.com", "citi.com", "online.citi.com"],
    pathIncludes: ["/credit-cards/citi-"],
    pathExcludes: ["compare", "all-credit-cards"],
  },
  {
    issuer: "us-bank",
    catalogUrls: ["https://www.usbank.com/credit-cards.html"],
    hosts: ["www.usbank.com", "usbank.com"],
    pathIncludes: ["/credit-cards/"],
    pathExcludes: [
      "compare", "credit-cards.html", "credit-card-insider", "extendpay",
      "buy-now-pay-later", "credit-cards/all-credit-cards",
    ],
  },
]

// ─── Name normalization for fuzzy matching ──────────────────────────

const NOISE_TOKENS = new Set([
  "card", "credit", "rewards", "the", "and", "with", "a", "an", "for",
  "®", "™", "©", "sm", "visa", "mastercard", "signature", "preferred",
])

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    // Collapse "U.S." → "us", "A.T.&T." → "att", etc. before stripping punctuation.
    .replace(/\b(?:[a-z]\.){2,}/g, m => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 +&]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map(t => t.trim())
    .filter(t => t.length > 1 && !NOISE_TOKENS.has(t))   // also drop single-char tokens
}

// Issuer/family tokens that appear in nearly every card name from a given
// issuer. Matching on these alone (e.g. "capital" + "one") doesn't actually
// disambiguate one Capital One card from another, so we require AT LEAST
// ONE non-issuer token to also overlap.
const ISSUER_TOKENS = new Set([
  "capital", "one", "chase", "citi", "amex", "american", "express",
  "wells", "fargo", "barclays", "bofa", "bank", "us", "discover",
  "synchrony", "fnbo", "truist", "regions",
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
  // Hard requirement: at least one non-issuer token must overlap. Otherwise
  // every Capital One card matches every other Capital One landing page.
  if (nonIssuerOverlap === 0) return 0
  return overlap / Math.min(sa.size, sb.size)
}

// ─── Issuer page harvest ────────────────────────────────────────────

type Harvested = { card_name: string; url: string }

async function harvestIssuer(cfg: IssuerConfig): Promise<Harvested[]> {
  const all: Harvested[] = []
  for (const url of cfg.catalogUrls) {
    const fromUrl = await harvestSinglePage(cfg, url)
    all.push(...fromUrl)
  }
  // De-dupe by url. Keep the longest name per url.
  const byUrl = new Map<string, string>()
  for (const h of all) {
    const prev = byUrl.get(h.url)
    if (!prev || h.card_name.length > prev.length) byUrl.set(h.url, h.card_name)
  }
  const deduped = Array.from(byUrl.entries()).map(([url, card_name]) => ({ url, card_name }))
  console.log(`[${cfg.issuer}] total ${deduped.length} unique candidates across ${cfg.catalogUrls.length} pages`)
  return deduped
}

async function harvestSinglePage(cfg: IssuerConfig, catalogUrl: string): Promise<Harvested[]> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  console.log(`[${cfg.issuer}] loading ${catalogUrl}`)
  try {
    const res = await page.goto(catalogUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    if (!res || res.status() >= 400) {
      console.log(`[${cfg.issuer}]   ${res?.status() ?? 0} — skipping`)
      return []
    }
    await page.waitForTimeout(5000)

    // Try DOM-based harvest first.
    let harvested: Harvested[] = []
    try {
      harvested = await page.evaluate(({ hosts, pathIncludes, pathExcludes }) => {
        const out: { card_name: string; url: string }[] = []
        const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        for (const a of anchors) {
          let u: URL
          try { u = new URL(a.href) } catch { continue }
          const host = u.host.toLowerCase()
          if (!hosts.some(h => host === h || host.endsWith("." + h))) continue
          const path = u.pathname.toLowerCase()
          if (pathIncludes && pathIncludes.length > 0 && !pathIncludes.some(p => path.includes(p))) continue
          if (pathExcludes && pathExcludes.some(p => path.includes(p))) continue
          let name = (a.innerText || "").trim().replace(/\s+/g, " ")
          if (!name || name.length < 4 || /apply|learn more|compare|see (all|details)|view (all|details)|see if/i.test(name)) {
            let cur: Element | null = a
            for (let i = 0; i < 6 && cur; i++) {
              const heading = cur.querySelector("h1, h2, h3, h4, [class*='title'], [class*='name']")
              if (heading && heading.textContent) {
                const t = heading.textContent.trim().replace(/\s+/g, " ")
                if (t && t.length > 4 && !/apply|learn more|compare/i.test(t)) {
                  name = t
                  break
                }
              }
              cur = cur.parentElement
            }
          }
          if (!name || name.length < 4) continue
          if (/^(home|all (cards|credit)|cards?|credit cards?)$/i.test(name)) continue
          if (/\(\d+\)/.test(name)) continue
          out.push({ card_name: name, url: u.href.split("#")[0] })
        }
        return out
      }, { hosts: cfg.hosts, pathIncludes: cfg.pathIncludes ?? [], pathExcludes: cfg.pathExcludes ?? [] })
    } catch (evalErr) {
      const msg = evalErr instanceof Error ? evalErr.message : String(evalErr)
      if (!/eval is disabled|Content Security Policy/i.test(msg)) throw evalErr
      // Amex CSP fallback: parse anchors from raw HTML with regex.
      const html = await page.content()
      const anchorRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      let m: RegExpExecArray | null
      while ((m = anchorRe.exec(html)) !== null) {
        let href = m[1]
        try {
          const u = new URL(href, catalogUrl)
          href = u.href
          const host = u.host.toLowerCase()
          if (!cfg.hosts.some(h => host === h || host.endsWith("." + h))) continue
          const path = u.pathname.toLowerCase()
          if (cfg.pathIncludes && cfg.pathIncludes.length > 0 && !cfg.pathIncludes.some(p => path.includes(p))) continue
          if (cfg.pathExcludes && cfg.pathExcludes.some(p => path.includes(p))) continue
          // Strip nested tags from anchor body to extract name.
          const name = m[2]
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim()
          if (!name || name.length < 4) continue
          if (/^(home|all (cards|credit)|cards?|credit cards?)$/i.test(name)) continue
          if (/\(\d+\)/.test(name)) continue
          if (/apply|learn more|compare|see (all|details)|view (all|details)/i.test(name)) continue
          harvested.push({ card_name: name, url: href.split("#")[0] })
        } catch { continue }
      }
      console.log(`[${cfg.issuer}]   used HTML-regex fallback (CSP blocks evaluate)`)
    }
    console.log(`[${cfg.issuer}]   ${harvested.length} from this page`)
    return harvested
  } catch (e) {
    console.log(`[${cfg.issuer}]   error: ${e instanceof Error ? e.message : String(e)}`)
    return []
  } finally {
    await page.close()
  }
}

// ─── Catalog patching ───────────────────────────────────────────────

type Match = { catalogId: string; catalogName: string; chosenName: string; chosenUrl: string; score: number }

function patchCatalog(matches: Match[]): void {
  let src = readFileSync(CATALOG_PATH, "utf8")
  let patched = 0
  for (const m of matches) {
    // Find the card's record by id and replace its `offer_link: ""`
    // with the discovered URL. Match the pattern carefully so we don't
    // touch unrelated entries.
    const idLine = `id: ${JSON.stringify(m.catalogId)},`
    const idIdx = src.indexOf(idLine)
    if (idIdx < 0) continue
    // Find the card's offer_link line within the next 1500 chars (inside
    // the same object literal).
    const window = src.slice(idIdx, idIdx + 1500)
    const newWindow = window.replace(/offer_link:\s*"",/, `offer_link: ${JSON.stringify(m.chosenUrl)},`)
    if (newWindow === window) continue   // already had a link or pattern not found
    src = src.slice(0, idIdx) + newWindow + src.slice(idIdx + 1500)
    patched++
  }
  writeFileSync(CATALOG_PATH, src)
  console.log(`Patched ${patched} catalog entries`)
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  // Build the work list: cards in the catalog that have no offer_link.
  let issuers = ISSUERS
  if (ONLY) issuers = issuers.filter(i => i.issuer === ONLY)
  if (issuers.length === 0) {
    console.error(`No issuer config matches --only=${ONLY}. Choices: ${ISSUERS.map(i => i.issuer).join(", ")}`)
    process.exit(1)
  }

  const allMatches: Match[] = []
  const allCandidates: Record<string, Harvested[]> = {}
  const noMatchByIssuer: Record<string, string[]> = {}

  for (const cfg of issuers) {
    const targets = creditCardBonuses.filter(c => c.issuer === cfg.issuer && !c.offer_link && !c.expired)
    if (targets.length === 0) {
      console.log(`[${cfg.issuer}] 0 targets — skipping`)
      continue
    }
    console.log(`[${cfg.issuer}] ${targets.length} cards need a link`)
    const candidates = await harvestIssuer(cfg)
    allCandidates[cfg.issuer] = candidates
    if (candidates.length === 0) continue

    // Match each target to best candidate.
    for (const t of targets) {
      let best: { c: Harvested; s: number } | null = null
      for (const c of candidates) {
        const s = nameSimilarity(t.card_name, c.card_name)
        if (s >= THRESHOLD && (!best || s > best.s)) best = { c, s }
      }
      if (best) {
        allMatches.push({
          catalogId: t.id,
          catalogName: t.card_name,
          chosenName: best.c.card_name,
          chosenUrl: best.c.url,
          score: best.s,
        })
      } else {
        if (!noMatchByIssuer[cfg.issuer]) noMatchByIssuer[cfg.issuer] = []
        noMatchByIssuer[cfg.issuer].push(t.card_name)
      }
    }
  }

  await closeBrowser()

  // Report
  console.log(``)
  console.log(`=== Match summary ===`)
  for (const cfg of issuers) {
    const total = creditCardBonuses.filter(c => c.issuer === cfg.issuer && !c.offer_link && !c.expired).length
    const matched = allMatches.filter(m => creditCardBonuses.find(c => c.id === m.catalogId)?.issuer === cfg.issuer).length
    console.log(`  ${cfg.issuer}: ${matched}/${total} matched`)
  }
  console.log(`Total matches: ${allMatches.length}`)

  writeFileSync(join(OUT_DIR, "find-offer-links-proposals.json"), JSON.stringify({
    matches: allMatches,
    candidatesByIssuer: allCandidates,
    noMatchByIssuer,
  }, null, 2))
  console.log(`Proposals written to ${join(OUT_DIR, "find-offer-links-proposals.json")}`)

  if (DRY_RUN) {
    console.log(`(dry-run) Pass --apply to patch creditCardBonuses.ts in place.`)
    return
  }
  patchCatalog(allMatches)
}

main().catch(async err => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
