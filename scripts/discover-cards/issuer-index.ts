/**
 * Scrape each major issuer's "all credit cards" index page for the
 * names + apply-page URLs of every product they currently sell.
 * Output feeds into discover-cards/run.ts alongside the curated
 * SEED_CARDS list — anything an issuer launches that isn't already
 * in the seed gets a chance to land in the catalog automatically.
 *
 * Why we need this on top of richwithpoints / SEED_CARDS:
 *   - Seed list is hand-curated; new launches lag until someone updates it.
 *   - Issuer pages are the source of truth — if Chase puts it on
 *     creditcards.chase.com, it's a real product.
 *   - Catches niche/co-brand cards that aggregators skip.
 *
 * Per issuer the scraper:
 *   1. Playwright-fetches the public "all cards" index page
 *   2. Extracts <a href> targets that look like individual card pages
 *   3. Normalizes the card name (drop "Apply Now", trademark glyphs, etc.)
 *   4. Returns { card_name, issuer_link, issuer } records
 *
 * We're DELIBERATELY conservative: each per-issuer scraper has guard
 * rails (URL regex, minimum match count, dedup against the seed list)
 * so a markup change at the issuer's end produces zero leads, not bogus
 * ones. The downstream pipeline (per-card enrichment, dedup against
 * catalog) is the safety net for anything that slips through.
 */
import { fetchPage } from "../_shared/playwright"

export type IssuerLead = {
  card_name: string
  issuer_link: string
  issuer: "chase" | "amex"
  source_url: string
}

/**
 * Pull card-name + apply-link tuples out of an HTML blob using a
 * regex over <a href="…">…</a> patterns. Issuer-specific filters keep
 * us off the noise (e.g. Chase wraps its "Sapphire Reserve" anchor
 * inside the main grid; we only want anchors whose href starts with
 * the canonical card-detail path).
 */
function extractAnchors(
  html: string,
  hrefPattern: RegExp,
  textCleaner: (raw: string) => string,
): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = []
  // <a … href="…" …>label</a> — non-greedy across attributes.
  const anchorRe = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1]
    if (!hrefPattern.test(href)) continue
    // Strip HTML tags from anchor body to recover the visible text.
    const rawText = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    const cleaned = textCleaner(rawText)
    if (cleaned.length < 4) continue
    out.push({ href, text: cleaned })
  }
  return out
}

/**
 * Resolve a possibly-relative URL against the page origin so the
 * downstream scraper doesn't try to fetch "/cash-back-credit-cards/…".
 */
function resolveUrl(href: string, base: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function dedupeByName(leads: IssuerLead[]): IssuerLead[] {
  const seen = new Set<string>()
  const out: IssuerLead[] = []
  for (const l of leads) {
    const key = l.card_name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l)
  }
  return out
}

// ─── Per-issuer scrapers ─────────────────────────────────────────────

const CHASE_INDEX = "https://creditcards.chase.com/credit-cards"

export async function scrapeChaseIndex(userAgent: string): Promise<IssuerLead[]> {
  const result = await fetchPage(CHASE_INDEX, { userAgent })
  if (!result.ok) {
    console.error(`[issuer-index] Chase fetch failed (${result.status}): ${result.error ?? "unknown"}`)
    return []
  }
  // Chase's individual card pages live under paths like
  //   /cash-back-credit-cards/freedom/unlimited
  //   /a1/sapphire-reserve/41124
  //   /business-credit-cards/ink/cash
  // We accept any anchor whose href matches one of those families and
  // ignore navigation chrome (apply, login, prequalify).
  const hrefRe = /^\/(cash-back-credit-cards|rewards-credit-cards|travel-credit-cards|business-credit-cards|a1\b)/
  // Many anchors wrap the literal card name + visual chrome ("Apply Now",
  // "Compare", trademark glyphs). Strip those.
  const cleaner = (raw: string) => raw
    .replace(/®|℠|™|©/g, "")
    .replace(/\bApply Now\b/gi, "")
    .replace(/\bCompare\b/gi, "")
    .replace(/\bPre-?qualify\b/gi, "")
    .replace(/\bLearn More\b/gi, "")
    .replace(/^Chase\s+/i, "Chase ")
    .replace(/\s+/g, " ")
    .trim()
  const anchors = extractAnchors(result.textContent, hrefRe, cleaner)
  // The textContent we get from the Playwright fetcher is markdownish, not
  // raw HTML — for an HTML page it returns serialized markup. If we get
  // zero hits the page is probably JS-rendered into a SPA shell — bail out
  // gracefully rather than emit garbage.
  if (anchors.length < 3) {
    console.error(`[issuer-index] Chase index returned ${anchors.length} anchors — markup may have changed or be JS-rendered. Skipping.`)
    return []
  }
  const leads: IssuerLead[] = anchors.map((a) => ({
    card_name: a.text.startsWith("Chase ") ? a.text : `Chase ${a.text}`,
    issuer_link: resolveUrl(a.href, CHASE_INDEX),
    issuer: "chase" as const,
    source_url: CHASE_INDEX,
  }))
  return dedupeByName(leads)
}

const AMEX_INDEX = "https://www.americanexpress.com/us/credit-cards/all-cards/personal/"

export async function scrapeAmexIndex(userAgent: string): Promise<IssuerLead[]> {
  const result = await fetchPage(AMEX_INDEX, { userAgent })
  if (!result.ok) {
    console.error(`[issuer-index] Amex fetch failed (${result.status}): ${result.error ?? "unknown"}`)
    return []
  }
  // Amex card-detail pages live under
  //   /us/credit-cards/card/blue-cash-everyday/
  //   /us/credit-cards/card/platinum/
  // …all containing the "/credit-cards/card/" segment.
  const hrefRe = /\/us\/credit-cards\/card\//
  const cleaner = (raw: string) => raw
    .replace(/®|℠|™|©/g, "")
    .replace(/\bApply Now\b/gi, "")
    .replace(/\bLearn More\b/gi, "")
    .replace(/\bThe\s+/i, "")
    .replace(/American Express ®?/gi, "American Express ")
    .replace(/\s+/g, " ")
    .trim()
  const anchors = extractAnchors(result.textContent, hrefRe, cleaner)
  if (anchors.length < 3) {
    console.error(`[issuer-index] Amex index returned ${anchors.length} anchors — markup may have changed or be JS-rendered. Skipping.`)
    return []
  }
  const leads: IssuerLead[] = anchors.map((a) => {
    const name = a.text.toLowerCase().includes("american express")
      ? a.text
      : `American Express ${a.text}`
    return {
      card_name: name,
      issuer_link: resolveUrl(a.href, AMEX_INDEX),
      issuer: "amex" as const,
      source_url: AMEX_INDEX,
    }
  })
  return dedupeByName(leads)
}

// ─── Orchestrator ────────────────────────────────────────────────────

export async function scrapeAllIssuerIndexes(userAgent: string): Promise<IssuerLead[]> {
  const chase = await scrapeChaseIndex(userAgent).catch((e) => {
    console.error(`[issuer-index] Chase threw: ${e instanceof Error ? e.message : String(e)}`)
    return [] as IssuerLead[]
  })
  const amex = await scrapeAmexIndex(userAgent).catch((e) => {
    console.error(`[issuer-index] Amex threw: ${e instanceof Error ? e.message : String(e)}`)
    return [] as IssuerLead[]
  })
  return [...chase, ...amex]
}
