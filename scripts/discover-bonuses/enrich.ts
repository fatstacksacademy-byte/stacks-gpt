import { fetchPage } from "../_shared/playwright"
import { extractAll } from "../_shared/extract"
import { UA } from "./env"
import { throttleHost } from "./ratelimit"
import { isAllowed } from "./robots"
import { log } from "./logger"
import type { Lead, RawItem } from "./types"

// Domains we treat as LEAD sites, not canonical — never enrich from these.
const LEAD_DOMAINS = [
  "doctorofcredit.com",
  "hustlermoneyblog.com",
  "bankbonus.com",
  "reddit.com",
  "redd.it",
  "bankbonus.io",
]

function isLeadDomain(url: string): boolean {
  try {
    const h = new URL(url).host.toLowerCase()
    return LEAD_DOMAINS.some((d) => h.endsWith(d))
  } catch {
    return true
  }
}

/** From a raw item's outbound URLs, pick the best candidate for the bank's own page. */
export function pickCanonical(item: RawItem): string | null {
  const candidates = (item.outbound_urls ?? []).filter((u) => !isLeadDomain(u))
  if (candidates.length === 0) return null
  // Prefer URLs that look promo-y
  const scored = candidates
    .map((u) => {
      let s = 0
      const lc = u.toLowerCase()
      if (/\/(promo|offer|bonus|campaign|landing|specials)/i.test(lc)) s += 3
      if (/\/personal-banking|\/checking|\/savings|\/credit-cards?/i.test(lc)) s += 1
      return { u, s }
    })
    .sort((a, b) => b.s - a.s)
  return scored[0]?.u ?? candidates[0]
}

export async function enrich(lead: Lead, canonicalUrl: string | null): Promise<Lead> {
  if (!canonicalUrl) return lead
  if (!(await isAllowed(canonicalUrl))) {
    log("warn", "enrich.skipped_by_robots", { canonicalUrl })
    lead.flags.push("enrich_skipped_robots")
    return lead
  }
  await throttleHost(canonicalUrl)

  const f = await fetchPage(canonicalUrl, { userAgent: UA })
  if (!f.ok) {
    log("warn", "enrich.fetch_failed", { canonicalUrl, status: f.status, error: f.error })
    lead.flags.push("enrich_fetch_failed")
    return lead
  }

  const e = extractAll(f.textContent)
  lead.canonical_url = f.finalUrl
  lead.enrichment = {
    fetched_at: f.fetchedAt,
    deposit_requirement: e.minDirectDepositTotal,
    direct_deposit_required:
      e.minDirectDepositTotal !== null ? true : lead.enrichment.direct_deposit_required,
    deposit_window_days: e.depositWindowDays,
    expiration: e.expiresDate,
    states: lead.enrichment.states, // states from regex are noisy; keep source-provided if any
    terms_url: findTermsLink(f.textContent, canonicalUrl),
    monthly_fee: e.monthlyFee,
  }

  if (e.expiredText) lead.flags.push("page_says_expired")
  if (
    lead.bonus_amount !== null &&
    lead.bonus_amount > 0 &&
    e.bonusAmount !== null &&
    Math.abs(e.bonusAmount - lead.bonus_amount) / lead.bonus_amount > 0.5
  ) {
    lead.flags.push("bonus_amount_disagrees_with_bank_page")
  }
  return lead
}

function findTermsLink(_text: string, _base: string): string | null {
  // Conservative: we don't re-open Playwright for the link scan. Callers can upgrade later.
  return null
}
