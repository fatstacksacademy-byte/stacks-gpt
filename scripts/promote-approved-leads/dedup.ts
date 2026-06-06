/**
 * Phase 3 — cheap dedup gate. Runs BEFORE any Claude calls so we don't burn
 * tokens on leads that already have a catalog entry.
 *
 * Strategy:
 *   bank bonuses (checking / savings) — match on normalized bank_name + product_type.
 *     If the catalog already has an entry for that bank + kind, dedupe regardless
 *     of bonus amount. Reason: the verifier loop handles bonus-amount drift; we
 *     only want to ADD catalog entries when the bank isn't yet represented.
 *
 *   card bonuses — match on fuzzy card_name (token overlap, threshold 0.55).
 *     Bank bonuses use bank-level dedup because the same bank rarely has multiple
 *     distinct checking bonuses live at once; cards do (e.g. Amex has many).
 *
 * Returns a DedupVerdict per lead. Cheap: no API calls, just in-memory string
 * matching against the catalog .ts modules.
 */
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"

export type Lead = {
  id: string
  bank: string
  product: string
  bonus_amount: number | null
  classification: "credit_card_bonus" | "bank_account_bonus" | string
  source_urls: string[]
  canonical_url?: string | null
}

export type DedupVerdict =
  | { isDuplicate: true; matchedId: string; matchedFile: "bonuses.ts" | "savingsBonuses.ts" | "creditCardBonuses.ts"; matchType: "bank_kind" | "card_name_fuzzy"; reason: string }
  | { isDuplicate: false }

// ─── Bank-name normalization ─────────────────────────────────────────

const BANK_NOISE_TOKENS = new Set([
  "bank", "credit", "union", "fcu", "federal", "national", "savings",
  "the", "and", "&", "n.a.", "na",
])

/** "Four Leaf Federal Credit Union" → ["four", "leaf"]. */
function normalizeBankTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 &]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !BANK_NOISE_TOKENS.has(t))
}

/**
 * Banks vs credit unions are distinct institutions even when they share names
 * ("Horizon Bank" of Indiana ≠ "Horizon Credit Union" of Washington).  If both
 * sides explicitly declare a type and the types differ → not a match.
 */
function extractBankKind(name: string): "bank" | "cu" | "unknown" {
  const lower = name.toLowerCase()
  if (/\b(credit union|fcu|federal credit)\b/.test(lower)) return "cu"
  if (/\bbank\b/.test(lower)) return "bank"
  return "unknown"
}

function banksMatch(a: string, b: string): boolean {
  const aKind = extractBankKind(a)
  const bKind = extractBankKind(b)
  if (aKind !== "unknown" && bKind !== "unknown" && aKind !== bKind) return false

  const ta = new Set(normalizeBankTokens(a))
  const tb = new Set(normalizeBankTokens(b))
  if (ta.size === 0 || tb.size === 0) return false
  let overlap = 0
  for (const t of ta) if (tb.has(t)) overlap++
  const smaller = Math.min(ta.size, tb.size)
  return overlap === smaller
}

/**
 * Extract a candidate bank name from a discover lead's product headline. The
 * discover pipeline sometimes mis-parses the `bank` field to a prefix like
 * "Existing Users" or "Increased American Express Delta". The headline almost
 * always contains the real bank name as the leading token sequence.
 */
function bankCandidatesFromLead(lead: Lead): string[] {
  const candidates = new Set<string>()
  if (lead.bank) candidates.add(lead.bank)
  if (lead.product) {
    // Strip leading "[Targeted]", "[Existing Users]", "Increased", "New", etc.
    let p = lead.product
      .replace(/^\s*\[[^\]]+\]\s*/i, "")
      .replace(/^\s*(?:increased|new|live|targeted|update|updated|expired|extended)\s+/i, "")
    // Take everything up to the first $ or digit or "checking|savings|business|credit card".
    const m = p.match(/^([\w &'\-./]+?)\s*(?:\$|\d|checking|savings|business|credit card)/i)
    if (m) candidates.add(m[1].trim())
    // Also use the first N tokens as a fallback.
    candidates.add(p.split(/\s+/).slice(0, 4).join(" "))
  }
  return Array.from(candidates).filter((s) => s.length >= 3)
}

/**
 * Bonus-amount delta gate. Same bank can run distinct concurrent offers
 * (Chase $400 vs Chase $900). If the leads's amount is >50% different from
 * the existing entry's amount, treat as a different product.
 */
function bonusAmountsClose(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return true // unknown → be conservative, treat as match
  if (a === 0 || b === 0) return a === b
  const ratio = Math.abs(a - b) / Math.max(a, b)
  return ratio <= 0.5
}

// ─── Card-name fuzzy match ──────────────────────────────────────────

const CARD_NOISE_TOKENS = new Set([
  "card", "credit", "rewards", "the", "and", "with", "a", "an", "for",
  "®", "™", "©", "sm", "visa", "mastercard", "signature", "preferred",
])

const ISSUER_TOKENS = new Set([
  "capital", "one", "chase", "citi", "amex", "american", "express",
  "wells", "fargo", "barclays", "bofa", "bank", "us", "discover",
  "synchrony", "fnbo", "truist", "regions", "penfed", "sofi", "ally",
])

function normalizeCardTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 +&]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !CARD_NOISE_TOKENS.has(t))
}

function cardNameSimilarity(a: string, b: string): number {
  const ta = normalizeCardTokens(a)
  const tb = normalizeCardTokens(b)
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
  // Require at least one non-issuer token in common — otherwise every Capital
  // One card "matches" every other Capital One card.
  if (nonIssuerOverlap === 0) return 0
  return overlap / Math.min(sa.size, sb.size)
}

const CARD_DEDUP_THRESHOLD = 0.55

// ─── Public API ─────────────────────────────────────────────────────

type CatalogIndex = {
  bonus: { id: string; bank_name: string; product_type: string; bonus_amount: number | null }[]
  savings: { id: string; bank_name: string; bonus_amount: number | null }[]
  card: { id: string; card_name: string; issuer: string; bonus_amount: number | null }[]
}

let _index: CatalogIndex | null = null

function loadIndex(): CatalogIndex {
  if (_index) return _index
  _index = {
    bonus: (bonuses as Array<{ id: string; bank_name: string; product_type?: string; bonus_amount?: number | null }>).map(
      (b) => ({ id: b.id, bank_name: b.bank_name, product_type: b.product_type ?? "checking", bonus_amount: b.bonus_amount ?? null }),
    ),
    savings: (savingsBonuses as Array<{ id: string; bank_name: string; tiers?: Array<{ bonus_amount: number }> }>).map((b) => ({
      id: b.id,
      bank_name: b.bank_name,
      // Savings bonuses use a tiers array; the headline is the top tier.
      bonus_amount: b.tiers && b.tiers.length > 0 ? Math.max(...b.tiers.map((t) => t.bonus_amount)) : null,
    })),
    card: (creditCardBonuses as Array<{ id: string; card_name: string; issuer: string; bonus_amount?: number | null }>).map(
      (c) => ({ id: c.id, card_name: c.card_name, issuer: c.issuer, bonus_amount: c.bonus_amount ?? null }),
    ),
  }
  return _index
}

/**
 * Should this lead be auto-dismissed as a duplicate of an existing catalog entry?
 *
 * For bank bonuses: match by bank-name overlap. We assume the verifier loop
 *   handles bonus-amount drift — discover's job is to surface NEW banks/products,
 *   not refresh known ones.
 *
 * For card bonuses: fuzzy match on card name with the same scorer used by
 *   scripts/find-card-url-overrides. Threshold 0.55 — empirically picks up
 *   "Chase Amazon Prime Visa" ↔ "Amazon Prime Rewards" and similar.
 */
export function dedupCheck(lead: Lead): DedupVerdict {
  const idx = loadIndex()

  if (lead.classification === "credit_card_bonus") {
    let best: { id: string; score: number } | null = null
    for (const c of idx.card) {
      const s = cardNameSimilarity(lead.product, c.card_name)
      if (s >= CARD_DEDUP_THRESHOLD && (!best || s > best.score)) best = { id: c.id, score: s }
    }
    if (best) {
      return {
        isDuplicate: true,
        matchedId: best.id,
        matchedFile: "creditCardBonuses.ts",
        matchType: "card_name_fuzzy",
        reason: `Fuzzy match (score ${best.score.toFixed(2)}) against existing card ${best.id}.`,
      }
    }
    return { isDuplicate: false }
  }

  if (lead.classification === "bank_account_bonus") {
    const candidateNames = bankCandidatesFromLead(lead)
    for (const b of idx.bonus) {
      if (candidateNames.some((name) => banksMatch(name, b.bank_name))) {
        return {
          isDuplicate: true,
          matchedId: b.id,
          matchedFile: "bonuses.ts",
          matchType: "bank_kind",
          reason: `Same-bank match against ${b.id}. Bonus-amount drift handled by the verifier loop; same-bank distinct products are rare enough to warrant human triage.`,
        }
      }
    }
    for (const s of idx.savings) {
      if (candidateNames.some((name) => banksMatch(name, s.bank_name))) {
        return {
          isDuplicate: true,
          matchedId: s.id,
          matchedFile: "savingsBonuses.ts",
          matchType: "bank_kind",
          reason: `Same-bank match against ${s.id}. Bonus-amount drift handled by the verifier loop.`,
        }
      }
    }
    // Cross-classification: maybe discover mis-classified a card as a bank
    // account (Novo is the known case).
    let bestCard: { id: string; score: number } | null = null
    for (const c of idx.card) {
      const s = cardNameSimilarity(lead.product, c.card_name)
      if (s >= CARD_DEDUP_THRESHOLD && (!bestCard || s > bestCard.score)) bestCard = { id: c.id, score: s }
    }
    if (bestCard) {
      return {
        isDuplicate: true,
        matchedId: bestCard.id,
        matchedFile: "creditCardBonuses.ts",
        matchType: "card_name_fuzzy",
        reason: `Discover classified as bank account bonus, but fuzzy match (score ${bestCard.score.toFixed(2)}) against existing card ${bestCard.id} suggests the classifier was wrong.`,
      }
    }
    return { isDuplicate: false }
  }

  // Unknown classification — treat as not-duplicate so the enrichment step
  // can dismiss it as out-of-scope.
  return { isDuplicate: false }
}
