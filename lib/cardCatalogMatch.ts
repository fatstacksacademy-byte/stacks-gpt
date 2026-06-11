// Match an extracted card name (from a statement import) to a card in the
// bonus catalog, so one statement upload can also feed the churning profile.
//
// Reuses the existing heuristic matcher (lib/spreadsheetImport) that already
// powers the spreadsheet importer — no new AI call, fully deterministic and
// client-safe. Conservative by default: we only surface a match we're fairly
// sure about, because telling someone they hold a specific card (and gating
// its churn recommendation) on a bad match would be worse than no match.

import {
  buildCatalogFlat,
  heuristicMatch,
  HEURISTIC_ACCEPT_THRESHOLD,
  type CatalogEntryFlat,
} from "./spreadsheetImport"

export type CardCatalogMatch = {
  catalogId: string
  label: string
  confidence: number
}

// The flat catalog is derived from static data; build it once per process.
let cardCatalogCache: CatalogEntryFlat[] | null = null
function creditCardCatalog(): CatalogEntryFlat[] {
  if (cardCatalogCache) return cardCatalogCache
  cardCatalogCache = buildCatalogFlat().filter(c => c.type === "credit_card")
  return cardCatalogCache
}

/**
 * Best credit-card catalog match for an extracted card name, or null when
 * nothing is confident enough. `name` is the importer's debt name, e.g.
 * "Chase Sapphire Reserve".
 */
export function matchStatementCardToCatalog(
  name: string,
  threshold: number = HEURISTIC_ACCEPT_THRESHOLD,
): CardCatalogMatch | null {
  if (!name || !name.trim()) return null
  // Strip the "(0% promo)" suffix the importer adds when splitting balances.
  const cleaned = name.replace(/\s*\(0% promo\)\s*$/i, "").trim()
  const res = heuristicMatch(cleaned, "credit card", creditCardCatalog())
  if (!res || !res.top || res.top.type !== "credit_card") return null
  if (res.confidence < threshold) return null
  return {
    catalogId: res.top.catalog_id,
    label: res.top.label,
    confidence: Math.round(res.confidence * 100) / 100,
  }
}
