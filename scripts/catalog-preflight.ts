import type { CreditCardBonus } from "../lib/data/creditCardBonuses"

export type CatalogPreflightIssue = {
  id: string
  kind:
    | "zero_fee_marked_waived"
    | "positive_bonus_zero_spend"
    | "personal_card_business_url"
    | "balance_transfer_fee_missing"
    | "duplicate_active_offer_url"
    | "duplicate_active_id"
    | "active_expiration_in_past"
    | "stale_deadline_in_copy"
    | "generic_sources_only"
  detail: string
}

type BankCatalogRecord = {
  id: string
  bank_name?: string
  expired?: boolean
  expiration_date?: string
  requirements?: { other_requirements_text?: string | null }
  source_links?: string[]
  raw_excerpt?: string
}

function normalizeCardName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(card|credit|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ""
    for (const key of [...url.searchParams.keys()]) {
      if (["afc", "category", "icell", "intlink"].includes(key.toLowerCase())) {
        url.searchParams.delete(key)
      }
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return value.trim().replace(/\/$/, "")
  }
}

export function auditCreditCards(cards: CreditCardBonus[]): CatalogPreflightIssue[] {
  const issues: CatalogPreflightIssue[] = []
  const activeUrls = new Map<string, CreditCardBonus[]>()

  for (const card of cards) {
    if (card.expired) continue

    if (card.annual_fee === 0 && card.annual_fee_waived_first_year) {
      issues.push({
        id: card.id,
        kind: "zero_fee_marked_waived",
        detail: "A $0 annual fee cannot also be waived for the first year.",
      })
    }
    if (card.bonus_amount > 0 && card.min_spend === 0) {
      issues.push({
        id: card.id,
        kind: "positive_bonus_zero_spend",
        detail: `Positive bonus (${card.bonus_amount}) has a $0 spend requirement; verify approval-triggered offers explicitly.`,
      })
    }
    if (card.card_type === "personal" && /(?:\/business\/|business-credit-card)/i.test(card.offer_link)) {
      issues.push({
        id: card.id,
        kind: "personal_card_business_url",
        detail: `Personal card points to a business-card URL: ${card.offer_link}`,
      })
    }
    if ((card.intro_apr?.bt_apr_months ?? 0) > 0 && card.intro_apr?.bt_fee_pct == null) {
      issues.push({
        id: card.id,
        kind: "balance_transfer_fee_missing",
        detail: "Balance-transfer intro APR is present without a balance-transfer fee.",
      })
    }
    if (card.offer_link) {
      const url = normalizeUrl(card.offer_link)
      activeUrls.set(url, [...(activeUrls.get(url) ?? []), card])
    }
  }

  // A shared offer URL is only a problem when two ACTIVE records describe the
  // same product. Small banks and credit unions legitimately list every distinct
  // card tier on one family landing page (e.g. classic/gold/platinum/secured),
  // so a bare URL collision is not evidence of a duplicate. We therefore flag a
  // collision only when records share the same card_type AND normalized product
  // name — the signature of a genuine duplicate (typically a curated record and a
  // bulk-imported re-add of the identical product).
  for (const [url, matches] of activeUrls) {
    if (matches.length < 2) continue
    const bySignature = new Map<string, CreditCardBonus[]>()
    for (const card of matches) {
      const signature = `${card.card_type}::${normalizeCardName(card.card_name)}`
      bySignature.set(signature, [...(bySignature.get(signature) ?? []), card])
    }
    for (const sameProduct of bySignature.values()) {
      if (sameProduct.length < 2) continue
      const ids = sameProduct.map((card) => card.id).join(", ")
      for (const card of sameProduct) {
        issues.push({
          id: card.id,
          kind: "duplicate_active_offer_url",
          detail: `Same product appears multiple times at one URL: ${ids} (${url}).`,
        })
      }
    }
  }

  return issues
}

function parseDate(value: string): Date | null {
  const parsed = new Date(`${value}T23:59:59Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function copyDeadlines(text: string): Date[] {
  const results: Date[] = []
  const patterns = [
    /(?:apply by|open by|expires?|offer ends?|expiration date)\s*:?[ ]*(\d{4}-\d{2}-\d{2})/gi,
    /(?:apply by|open by|expires?|offer ends?|expiration date)\s*:?[ ]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(?:apply by|open by|expires?|offer ends?|expiration date)\s*:?[ ]*([A-Z][a-z]+ \d{1,2}, \d{4})/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const date = new Date(match[1])
      if (!Number.isNaN(date.getTime())) results.push(date)
    }
  }
  return results
}

function isGenericSource(value: string): boolean {
  try {
    const url = new URL(value)
    const path = url.pathname.replace(/\/+$/, "") || "/"
    if (path === "/") return true
    if (/doctorofcredit\.com$/i.test(url.hostname) && /\/best-bank-account-bonuses$/i.test(path)) return true
    if (/bankbonus\.com$/i.test(url.hostname) && /\/promotions-by-state\//i.test(path)) return true
    return false
  } catch {
    return true
  }
}

export function auditBankBonuses(
  records: BankCatalogRecord[],
  referenceDate = new Date(),
): CatalogPreflightIssue[] {
  const issues: CatalogPreflightIssue[] = []
  const activeById = new Map<string, BankCatalogRecord[]>()

  for (const record of records) {
    if (record.expired) continue
    activeById.set(record.id, [...(activeById.get(record.id) ?? []), record])

    if (record.expiration_date) {
      const expiration = parseDate(record.expiration_date)
      if (expiration && expiration < referenceDate) {
        issues.push({
          id: record.id,
          kind: "active_expiration_in_past",
          detail: `Active record expired on ${record.expiration_date}.`,
        })
      }
    }

    const copy = [record.requirements?.other_requirements_text, record.raw_excerpt]
      .filter(Boolean)
      .join(" ")
    const staleDeadlines = copyDeadlines(copy).filter((date) => date < referenceDate)
    if (staleDeadlines.length > 0) {
      const latest = staleDeadlines.sort((a, b) => b.getTime() - a.getTime())[0]
      issues.push({
        id: record.id,
        kind: "stale_deadline_in_copy",
        detail: `Active copy contains a past deadline (${latest.toISOString().slice(0, 10)}).`,
      })
    }

    const sources = record.source_links?.filter(Boolean) ?? []
    if (sources.length === 0 || sources.every(isGenericSource)) {
      issues.push({
        id: record.id,
        kind: "generic_sources_only",
        detail: sources.length === 0 ? "No source link is present." : "Only generic homepages or roundup pages are cited.",
      })
    }
  }

  for (const [id, matches] of activeById) {
    if (matches.length < 2) continue
    issues.push({
      id,
      kind: "duplicate_active_id",
      detail: `${matches.length} active catalog rows share this ID.`,
    })
  }

  return issues
}

export function printCatalogPreflight(label: string, issues: CatalogPreflightIssue[]): void {
  if (issues.length === 0) {
    console.log(`[preflight:${label}] no catalog warnings`)
    return
  }
  console.warn(`[preflight:${label}] ${issues.length} catalog warning(s)`)
  const counts = new Map<string, number>()
  for (const issue of issues) counts.set(issue.kind, (counts.get(issue.kind) ?? 0) + 1)
  console.warn(`  ${[...counts].map(([kind, count]) => `${kind}=${count}`).join(", ")}`)
  const detailLimit = 40
  for (const issue of issues.slice(0, detailLimit)) {
    console.warn(`  - ${issue.kind}: ${issue.id} — ${issue.detail}`)
  }
  if (issues.length > detailLimit) {
    console.warn(`  ... ${issues.length - detailLimit} more warning(s) omitted`)
  }
}
