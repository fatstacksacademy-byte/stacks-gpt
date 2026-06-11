// Credit-report import — normalization layer.
//
// A credit report lists every tradeline: issuer, product, OPEN DATE, limit,
// status. Open dates are exactly what 5/24 / churning math need (a statement
// can't provide them). This pure module turns the AI extraction into validated
// card-account drafts: it keeps only credit cards, validates open dates,
// classifies personal vs business (business cards don't count toward 5/24),
// and links to the bonus catalog when recognized.

import { matchStatementCardToCatalog } from "./cardCatalogMatch"
import { creditCardBonuses } from "./data/creditCardBonuses"

export type CardAccountSource = "credit_report" | "statement" | "manual"

export type CardAccountDraft = {
  issuer: string
  product_name: string | null
  card_type: "personal" | "business"
  open_date: string // ISO YYYY-MM-DD
  closed_date: string | null
  credit_limit: number | null
  catalog_card_id: string | null
  source: CardAccountSource
}

export type ExtractedTradeline = {
  issuer?: unknown
  product_name?: unknown
  account_category?: unknown // "credit_card" | "charge_card" | "loan" | "mortgage" | "auto" | "student" | "other"
  open_date?: unknown
  closed_date?: unknown
  credit_limit?: unknown
  status?: unknown // "open" | "closed"
  business?: unknown // true if the report marks it a business card
}

export type CreditReportExtraction = { tradelines?: unknown }

export type CreditReportImportResult = {
  cards: CardAccountDraft[]
  warnings: string[]
  tradelinesFound: number
  skippedNonCard: number
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CARD_CATEGORIES = new Set(["credit_card", "charge_card", "revolving", "card"])
const BUSINESS_HINT = /\b(business|biz|ink)\b/i

function cleanStr(v: unknown, max = 80): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s.slice(0, max)
}

function parseNum(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function validIsoDate(v: unknown): string | null {
  const s = cleanStr(v, 10)
  if (!s || !ISO_DATE.test(s)) return null
  const [, m, d] = s.split("-").map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return s
}

const CATALOG_BY_ID = new Map(creditCardBonuses.map(c => [c.id, c]))

/** personal/business + catalog id for an extracted card. */
function classify(
  name: string,
  businessFlag: unknown,
): { card_type: "personal" | "business"; catalog_card_id: string | null } {
  const match = matchStatementCardToCatalog(name)
  if (match) {
    const cat = CATALOG_BY_ID.get(match.catalogId)
    if (cat) return { card_type: cat.card_type, catalog_card_id: cat.id }
  }
  if (businessFlag === true) return { card_type: "business", catalog_card_id: null }
  if (BUSINESS_HINT.test(name)) return { card_type: "business", catalog_card_id: null }
  return { card_type: "personal", catalog_card_id: null }
}

function isCardCategory(v: unknown): boolean {
  const s = cleanStr(v, 40)?.toLowerCase().replace(/[\s-]+/g, "_")
  if (!s) return true // unknown category — assume card (the prompt targets cards)
  return CARD_CATEGORIES.has(s)
}

/**
 * Normalize a credit-report extraction into validated card-account drafts.
 * Deterministic given the raw input. Non-card tradelines and cards without a
 * usable open date are skipped (with warnings) — open_date is required.
 */
export function normalizeCreditReport(raw: CreditReportExtraction | unknown): CreditReportImportResult {
  const obj = (raw ?? {}) as CreditReportExtraction
  const rows = Array.isArray(obj.tradelines) ? obj.tradelines : []
  const warnings: string[] = []
  const cards: CardAccountDraft[] = []
  let skippedNonCard = 0

  for (const r of rows) {
    if (!r || typeof r !== "object") continue
    const t = r as ExtractedTradeline

    if (!isCardCategory(t.account_category)) {
      skippedNonCard++
      continue
    }

    const issuer = cleanStr(t.issuer, 40) ?? "Unknown issuer"
    const productName = cleanStr(t.product_name, 60)
    const name = [issuer, productName].filter(Boolean).join(" ")

    const openDate = validIsoDate(t.open_date)
    if (!openDate) {
      warnings.push(`${name}: no open date found — skipped (5/24 needs the open date). Add it manually if you know it.`)
      continue
    }

    const { card_type, catalog_card_id } = classify(name, t.business)
    cards.push({
      issuer,
      product_name: productName,
      card_type,
      open_date: openDate,
      closed_date: validIsoDate(t.closed_date),
      credit_limit: parseNum(t.credit_limit),
      catalog_card_id,
      source: "credit_report",
    })
  }

  if (cards.length === 0 && rows.length > 0) {
    warnings.push("No credit cards with a usable open date were found in that report.")
  }

  return { cards, warnings, tradelinesFound: rows.length, skippedNonCard }
}
