/**
 * Fuzzy match user-created entries against the official catalog so users
 * who tracked something as a "custom" (before we had it in the catalog)
 * can promote it to a first-class entry later.
 *
 * Two flavors:
 *   - customBonus (user's free-form bank bonus) → checking bonus catalog
 *   - ownedCard (free-form credit card entry)  → creditCardBonuses catalog
 *
 * Score: Jaccard-like token overlap on normalized names, plus a small
 * bonus for prefix match on the first token (handles cases like "Chase
 * Total Checking" vs "Chase Total" where a user may have dropped the
 * qualifier). Returns top N candidates sorted highest-first.
 */

import { bonuses } from "./data/bonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"

const NOISE = new Set([
  "the", "and", "a", "an", "for", "with", "of", "card", "credit", "rewards",
  "bank", "bonus", "checking", "savings", "account", "2026", "new", "visa",
  "mastercard", "signature",
])

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    .replace(/\b(?:[a-z]\.){2,}/g, m => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !NOISE.has(t))
}

function score(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const sa = new Set(ta)
  const sb = new Set(tb)
  let overlap = 0
  for (const t of sa) if (sb.has(t)) overlap++
  const smaller = Math.min(sa.size, sb.size)
  let s = overlap / smaller
  // Small boost if both start with the same token (issuer prefix usually).
  if (ta[0] && tb[0] && ta[0] === tb[0]) s += 0.05
  return s
}

export type CatalogMatch = {
  id: string
  name: string
  score: number
}

/** Top catalog checking bonuses matching a custom bonus by bank_name. */
export function matchCustomBonusCandidates(
  customBankName: string,
  limit = 5,
): CatalogMatch[] {
  return (bonuses as { id: string; bank_name: string; expired?: boolean }[])
    .filter(b => !b.expired)
    .map(b => ({ id: b.id, name: b.bank_name, score: score(customBankName, b.bank_name) }))
    .filter(m => m.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Top catalog credit cards matching an owned card by card_name. */
export function matchOwnedCardCandidates(
  cardName: string,
  limit = 5,
): CatalogMatch[] {
  return creditCardBonuses
    .filter(c => !c.expired)
    .map(c => ({ id: c.id, name: c.card_name, score: score(cardName, c.card_name) }))
    .filter(m => m.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
