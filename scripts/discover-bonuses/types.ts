export type Classification =
  | "bank_account_bonus"
  | "credit_card_bonus"
  | "brokerage_bonus"
  | "other"

export type SourceKind = "rss" | "sitemap" | "reddit"

export type SourceConfig = {
  name: string
  type: SourceKind
  url: string
  enabled: boolean
  /** Optional per-source override (seconds between requests to its host) */
  throttle_seconds?: number
  /** Optional: how many items to pull from this source per run (defaults differ per kind) */
  max_items?: number
}

/**
 * A "raw" item harvested from a source. Intentionally minimal — no article body.
 * We only keep the metadata we need to identify a potential offer.
 */
export type RawItem = {
  source_name: string
  source_kind: SourceKind
  source_url: string // URL on the source site (DoC post, reddit thread, etc.)
  title: string
  published_at?: string | null // ISO
  /** URLs the source links out to — we'll look for the canonical bank page here */
  outbound_urls: string[]
  /** Short snippet (headline + subtitle only, NOT body text) for classification/dedupe */
  snippet?: string
}

export type Lead = {
  id: string // hash of bank+product+amount
  bank: string // canonical bank/issuer name
  product: string // "Premier eChecking", "Sapphire Preferred", etc.
  bonus_amount: number | null // dollars or points
  classification: Classification
  confidence: number // 0–1
  discovered_at: string // ISO
  source_urls: string[] // all LEAD sources that mentioned it
  canonical_url: string | null // bank's own offer page, if we found/enriched it
  enrichment: {
    fetched_at: string | null
    deposit_requirement: number | null
    direct_deposit_required: boolean | null
    deposit_window_days: number | null
    expiration: string | null
    states: string[] // state codes or ["Nationwide (U.S.)"]
    terms_url: string | null
    monthly_fee: number | null
  }
  flags: string[]
  /** Candidates for the canonical bank page, discovered from source item. Consumed by enrich. */
  outbound_candidates?: string[]
  /** For --apply-approved: status of this lead in the review queue */
  status?: "new" | "approved" | "rejected"
  /** Debug: which source_kind first surfaced this */
  first_seen_via?: SourceKind
}

export type ClassifyResult = {
  classification: Classification
  confidence: number
  via: "heuristic" | "claude"
  reason?: string
}
