/**
 * Cross-source consensus pass (Phase 3).
 *
 * Every bonus carries one or more source URLs in `source_links`: a primary
 * bank / issuer page, plus one or more DoC articles. Historically we only
 * checked the primary URL. This module runs the same extractors against
 * the DoC article (when present) and compares both readings. When both
 * sources agree on the bonus amount, confidence goes up; when they
 * disagree materially, we flag the bonus for admin review.
 *
 * DoC uses a fairly consistent prose style ("Open checking with $500+
 * in direct deposits within 90 days to earn $400 bonus") so the same
 * regex extractors from extract.ts produce usable signal against DoC
 * text. We don't need a DoC-specific parser to get value from this.
 */
import type { BonusRecord, Extracted, FetchResult } from "./types"
import { fetchPage } from "../_shared/playwright"
import { extract as extractFields } from "./extract"
import { loadCache, saveCache, isFresh } from "./cache"

export type SourceReading = {
  kind: "bank_page" | "doc" | "other"
  url: string
  ok: boolean
  extracted: Extracted | null
  fetch: Pick<FetchResult, "ok" | "status" | "finalUrl" | "redirected" | "error">
}

export type Consensus = {
  primary: SourceReading
  secondary: SourceReading | null
  /** True if we had multiple sources AND every compared field matched. */
  sourcesAgree: boolean
  /** Fields where primary and secondary extracted different values. */
  disagreements: string[]
}

function classifySource(url: string): "bank_page" | "doc" | "other" {
  if (/doctorofcredit\.com/i.test(url)) return "doc"
  return "bank_page"
}

/** Rounds-to-compare — small differences (e.g. $495 vs $500 from rounding) shouldn't be flagged. */
function numericallyClose(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null || b == null) return true // missing = can't disagree
  const tolerance = Math.max(10, Math.abs(a) * 0.05) // 5% or $10, whichever is larger
  return Math.abs(a - b) <= tolerance
}

export async function runConsensus(
  record: BonusRecord,
  primaryReading: SourceReading,
  opts: { useCache: boolean },
): Promise<Consensus> {
  const links = record.source_links ?? []
  // Find the first DoC link that isn't the primary (usually the primary is
  // the bank page and DoC is at position 1 or 2 — but some bonuses have
  // DoC as the only source, in which case the primary IS doc).
  const primaryUrl = primaryReading.url
  const docUrl = links.find((l) => /doctorofcredit\.com/i.test(l) && l !== primaryUrl)

  if (!docUrl) {
    return { primary: primaryReading, secondary: null, sourcesAgree: true, disagreements: [] }
  }

  // Fetch the DoC article. Uses its own cache key namespace so it doesn't
  // clobber the primary cache for this bonus.
  const cacheKey = `${record.id}::doc`
  const cached = opts.useCache ? loadCache(cacheKey) : null
  const fresh = cached && cached.url === docUrl && isFresh(cached)

  let textContent: string
  let fetch: Pick<FetchResult, "ok" | "status" | "finalUrl" | "redirected" | "error">
  if (fresh && cached) {
    textContent = cached.textContent
    fetch = { ok: true, status: 200, finalUrl: cached.url, redirected: false }
  } else {
    const r = await fetchPage(docUrl)
    if (!r.ok) {
      return {
        primary: primaryReading,
        secondary: {
          kind: "doc",
          url: docUrl,
          ok: false,
          extracted: null,
          fetch: { ok: r.ok, status: r.status, finalUrl: r.finalUrl, redirected: r.redirected, error: r.error },
        },
        sourcesAgree: true, // secondary unavailable; don't penalize primary
        disagreements: [],
      }
    }
    textContent = r.textContent
    fetch = { ok: r.ok, status: r.status, finalUrl: r.finalUrl, redirected: r.redirected, error: r.error }
    if (opts.useCache) saveCache(cacheKey, { url: docUrl, textContent, fetchedAt: r.fetchedAt, htmlHash: r.htmlHash })
  }

  const extracted = extractFields(textContent)
  const secondary: SourceReading = {
    kind: "doc",
    url: docUrl,
    ok: true,
    extracted,
    fetch,
  }

  // Compare bonus_amount between sources — the money number matters most.
  // Window days, DD totals, monthly fee can drift in wording and aren't
  // reliable enough to gate consensus on. Bonus amount is unambiguous.
  const disagreements: string[] = []
  const pAmt = primaryReading.extracted?.bonusAmount
  const sAmt = extracted.bonusAmount
  if (!numericallyClose(pAmt, sAmt) && pAmt != null && sAmt != null) {
    disagreements.push(`bonusAmount (${pAmt} vs ${sAmt})`)
  }

  return {
    primary: primaryReading,
    secondary,
    sourcesAgree: disagreements.length === 0,
    disagreements,
  }
}

export { classifySource }
