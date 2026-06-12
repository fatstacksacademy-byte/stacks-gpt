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
// We use Node's native fetch() here instead of the shared Playwright
// helper because that helper returns `main.innerText` — all anchor
// markup is stripped. The issuer "all cards" indexes are server-rendered
// HTML, so a plain fetch gives us the <a href> tags directly.

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

/** Plain HTML fetch with a UA header and a 30s timeout. Returns the
 *  raw response body, or null on failure (status >=400, network error,
 *  empty body). The shared Playwright helper is overkill for these
 *  server-rendered pages AND strips the markup we need. */
async function fetchHtml(url: string, userAgent: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`[issuer-index] ${url} → HTTP ${res.status}`)
      return null
    }
    const text = await res.text()
    return text.length > 0 ? text : null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[issuer-index] ${url} → ${msg}`)
    return null
  } finally {
    clearTimeout(timer)
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

const CHASE_INDEX = "https://creditcards.chase.com/personal-credit-cards"

export async function scrapeChaseIndex(userAgent: string): Promise<IssuerLead[]> {
  const html = await fetchHtml(CHASE_INDEX, userAgent)
  if (!html) return []
  // Chase's individual card detail pages have a TWO-segment shape under
  // a category root — both a brand AND a product:
  //   /cash-back-credit-cards/freedom/unlimited
  //   /a1/sapphire-reserve/41124            ← campaign-style with id
  //   /business-credit-cards/ink/cash
  //   /travel-credit-cards/southwest-rapid-rewards/priority
  //
  // What we DON'T want (matched too aggressively last run):
  //   /cash-back-credit-cards          ← category root (lists multiple cards)
  //   /travel-credit-cards             ← same
  //   /a1/sapphire                     ← brand landing (lists Sapphire family)
  //
  // The discriminator: a valid card page has at LEAST 2 path segments AFTER
  // the category root. The regex below enforces that and rejects the
  // tracking suffixes (?, #) that turn navigation links into noise.
  const hrefRe =
    /^\/(?:cash-back-credit-cards|rewards-credit-cards|travel-credit-cards|business-credit-cards|a1)\/[\w-]+\/[\w-]+(?:\/[\w-]+)?(?:[?#]|$)/
  // Anchor TEXT cleanup. We saw "Chase Cash Back (10)Opens Cash Back
  // page in the same window.Opens in the same window" — Chase's nav
  // includes accessibility-label suffixes glued onto link text. Strip
  // those + the digit count "(10)" + the trademark glyphs + the
  // "Apply Now / Compare / Learn More" chrome.
  const cleaner = (raw: string) => raw
    .replace(/®|℠|™|©/g, "")
    // Chase wraps every card-link anchor body with a screen-reader
    // companion phrase like "Links to product page" — strip it. We can't
    // require a word boundary because Chase concatenates without a space
    // ("Credit CardLinks to product page"); use a non-word-boundary
    // anchor instead.
    .replace(/Links?\s+to\s+(?:product|details)\s+page/gi, " ")
    // Strip "Opens X page in the same window" / "Opens in the same
    // window" accessibility suffixes Chase adds to every nav link.
    .replace(/Opens[^.]*\.?\s*(?:Opens[^.]*\.?\s*)*/gi, " ")
    // Strip a parenthesized digit count like "(10)" that follows nav labels.
    .replace(/\s*\(\d+\)\s*/g, " ")
    .replace(/\bApply Now\b/gi, "")
    .replace(/\bCompare\b/gi, "")
    .replace(/\bPre-?qualify\b/gi, "")
    .replace(/\bLearn More\b/gi, "")
    .replace(/\bSee details\b/gi, "")
    // Trim "Credit Card" / "Card" suffix — adds noise without info.
    .replace(/\b(?:Credit\s+Card|Card)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
  const anchors = extractAnchors(html, hrefRe, cleaner)
  // Bail out if the page returned very few matches — markup change
  // defense. Better to emit zero leads than garbage.
  if (anchors.length < 3) {
    console.error(`[issuer-index] Chase index returned ${anchors.length} anchors — markup may have changed. Skipping.`)
    return []
  }
  const leads: IssuerLead[] = anchors
    // Drop residue anchors whose cleaned text is suspiciously short or
    // matches a category-marker we couldn't fully strip. A real Chase
    // card name reads like "Sapphire Preferred" or "Freedom Unlimited" —
    // 2 words minimum after cleaning, and we reject obvious navigation
    // residue.
    .filter((a) => {
      if (a.text.length < 6) return false
      if (!/\w+\s+\w+/.test(a.text)) return false
      // "See details" / "Apply" / "Compare" with no real card name left.
      if (/^(?:see details|apply|compare|learn more)\s*$/i.test(a.text)) return false
      return true
    })
    .map((a) => ({
      card_name: a.text.startsWith("Chase ") ? a.text : `Chase ${a.text}`,
      issuer_link: resolveUrl(a.href, CHASE_INDEX),
      issuer: "chase" as const,
      source_url: CHASE_INDEX,
    }))
  return dedupeByName(leads)
}

const AMEX_INDEX = "https://www.americanexpress.com/us/credit-cards/"

/**
 * Amex's /us/credit-cards/ index is a fully client-rendered React SPA —
 * the initial HTML is just a shell with one anchor. A static fetch
 * here surfaces nothing. To make this actually return cards we'd need
 * a Playwright-backed fetcher that returns the post-hydration HTML
 * (not main.innerText, which is what the existing shared helper does).
 *
 * For now this function still exists and is wired up — it just emits
 * a clean "0 anchors" warning instead of crashing. When someone adds
 * a proper Playwright-HTML extractor, swap fetchHtml() here.
 */
export async function scrapeAmexIndex(userAgent: string): Promise<IssuerLead[]> {
  const html = await fetchHtml(AMEX_INDEX, userAgent)
  if (!html) return []
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
  const anchors = extractAnchors(html, hrefRe, cleaner)
  if (anchors.length < 3) {
    console.error(`[issuer-index] Amex index returned ${anchors.length} anchors — markup may have changed. Skipping.`)
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
