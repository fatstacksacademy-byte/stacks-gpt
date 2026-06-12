/**
 * Normalized catalog taxonomy.
 *
 * The raw catalog (`bonuses.ts`, `savingsBonuses.ts`) is loose-typed JSON
 * with inconsistent shape and a handful of known data gaps. This module
 * collapses both sources into a single `CatalogItem` shape with derived
 * metadata that downstream surfaces (browse page, state directory,
 * filters, tracking) can rely on without re-running regex/JSON probes.
 *
 * Design rules:
 *
 * 1. Never label an offer "nationwide" when eligibility data is unknown
 *    or contradictory. Prefer `availability: "unknown"` so the UI can
 *    surface that honestly.
 * 2. Prefer structured source fields. Fall back to text inference only
 *    when no structured value exists, and tag the result with reduced
 *    `eligibilityConfidence`.
 * 3. `eligibleStates` is `null` for nationwide and `string[]` for
 *    restricted; `excludedStates` is always a list (may be empty).
 * 4. `category` is the SINGLE source of truth for routing tracked items
 *    — checking → completed_bonuses, savings → savings_entries.
 * 5. State filtering treats null eligibility as ineligible (the strict
 *    "available to me" check) — matches the sequencer's behavior since
 *    the better-than-a-spreadsheet sprint.
 */

import { bonuses as rawCheckingBonuses } from "./bonuses"
import { savingsBonuses as rawSavingsBonuses } from "./savingsBonuses"

// ── Public types ─────────────────────────────────────────────────────

export type CatalogCategory =
  | "personal_checking"
  | "personal_savings"
  | "business_checking"
  | "business_savings"
  | "brokerage"

export type FundingMethod =
  | "direct_deposit"
  | "cash_deposit"
  | "debit_transactions"
  | "mixed"
  | "unknown"

export type Availability =
  | "nationwide"
  | "state_restricted"
  | "branch_only"
  | "unknown"

export type EligibilityConfidence = "verified" | "incomplete" | "unknown"

/**
 * Live/expired/unknown classification for the offer's expiration.
 *
 *   live     — explicit expirationDate parsed and in the future
 *   expired  — raw `expired: true` flag OR expirationDate in the past
 *   unknown  — no `expired` flag and no expirationDate at all. The
 *              catalog doesn't tell us. Surfaced explicitly so safety-
 *              sensitive consumers (state pages, anywhere we claim
 *              eligibility) can filter these out instead of pretending
 *              they're live.
 */
export type ExpirationStatus = "live" | "expired" | "unknown"

/**
 * Stable identifier for routing tracked items into the right Stacks OS
 * module. Maps onto `lib/trackBonus.ts > TrackKind` extensions.
 */
export type TrackingKind =
  | "personal-checking"
  | "business-checking"
  | "personal-savings"
  | "business-savings"
  | "brokerage"

export type CatalogItem = {
  id: string
  bankName: string
  shortBankName: string
  category: CatalogCategory
  /** TrackKind for the TrackBonusButton + lib/trackBonus.ts routing. */
  trackingKind: TrackingKind
  fundingMethod: FundingMethod
  availability: Availability
  /** `null` when nationwide or unknown; `string[]` of 2-letter postal codes when restricted. */
  eligibleStates: string[] | null
  excludedStates: string[]
  onlineOpening: boolean | null    // null = unknown
  branchRequired: boolean          // true → onlineOpening is false
  minimumDirectDeposit: number | null
  minimumCashDeposit: number | null
  bonusAmount: number
  monthlyFee: number | null
  expirationDate: string | null    // ISO yyyy-mm-dd
  eligibilityConfidence: EligibilityConfidence
  /** Free-text from the catalog — used in result-card "see terms" links. */
  eligibilityNotes: string | null
  /** Whether this offer is military-only (gated by user profile flag). */
  militaryOnly: boolean
  /** Whether the offer expired or was flagged expired in raw catalog. */
  expired: boolean
  /**
   * Classification of the offer's freshness — `unknown` means the
   * catalog ships no expirationDate AND no `expired` flag, which is the
   * common case for nearly every row. Treat as "we don't know if this
   * is still running" instead of pretending it's live.
   */
  expirationStatus: ExpirationStatus
  /** Pointer back to the raw catalog row for downstream rendering that
   *  needs fields we don't normalize yet (timeline, screening, etc.). */
  raw: unknown
}

// ── State helpers ────────────────────────────────────────────────────

export const US_STATES: ReadonlyArray<{ code: string; name: string; slug: string }> = [
  { code: "AL", name: "Alabama", slug: "alabama" },
  { code: "AK", name: "Alaska", slug: "alaska" },
  { code: "AZ", name: "Arizona", slug: "arizona" },
  { code: "AR", name: "Arkansas", slug: "arkansas" },
  { code: "CA", name: "California", slug: "california" },
  { code: "CO", name: "Colorado", slug: "colorado" },
  { code: "CT", name: "Connecticut", slug: "connecticut" },
  { code: "DE", name: "Delaware", slug: "delaware" },
  { code: "DC", name: "District of Columbia", slug: "district-of-columbia" },
  { code: "FL", name: "Florida", slug: "florida" },
  { code: "GA", name: "Georgia", slug: "georgia" },
  { code: "HI", name: "Hawaii", slug: "hawaii" },
  { code: "ID", name: "Idaho", slug: "idaho" },
  { code: "IL", name: "Illinois", slug: "illinois" },
  { code: "IN", name: "Indiana", slug: "indiana" },
  { code: "IA", name: "Iowa", slug: "iowa" },
  { code: "KS", name: "Kansas", slug: "kansas" },
  { code: "KY", name: "Kentucky", slug: "kentucky" },
  { code: "LA", name: "Louisiana", slug: "louisiana" },
  { code: "ME", name: "Maine", slug: "maine" },
  { code: "MD", name: "Maryland", slug: "maryland" },
  { code: "MA", name: "Massachusetts", slug: "massachusetts" },
  { code: "MI", name: "Michigan", slug: "michigan" },
  { code: "MN", name: "Minnesota", slug: "minnesota" },
  { code: "MS", name: "Mississippi", slug: "mississippi" },
  { code: "MO", name: "Missouri", slug: "missouri" },
  { code: "MT", name: "Montana", slug: "montana" },
  { code: "NE", name: "Nebraska", slug: "nebraska" },
  { code: "NV", name: "Nevada", slug: "nevada" },
  { code: "NH", name: "New Hampshire", slug: "new-hampshire" },
  { code: "NJ", name: "New Jersey", slug: "new-jersey" },
  { code: "NM", name: "New Mexico", slug: "new-mexico" },
  { code: "NY", name: "New York", slug: "new-york" },
  { code: "NC", name: "North Carolina", slug: "north-carolina" },
  { code: "ND", name: "North Dakota", slug: "north-dakota" },
  { code: "OH", name: "Ohio", slug: "ohio" },
  { code: "OK", name: "Oklahoma", slug: "oklahoma" },
  { code: "OR", name: "Oregon", slug: "oregon" },
  { code: "PA", name: "Pennsylvania", slug: "pennsylvania" },
  { code: "RI", name: "Rhode Island", slug: "rhode-island" },
  { code: "SC", name: "South Carolina", slug: "south-carolina" },
  { code: "SD", name: "South Dakota", slug: "south-dakota" },
  { code: "TN", name: "Tennessee", slug: "tennessee" },
  { code: "TX", name: "Texas", slug: "texas" },
  { code: "UT", name: "Utah", slug: "utah" },
  { code: "VT", name: "Vermont", slug: "vermont" },
  { code: "VA", name: "Virginia", slug: "virginia" },
  { code: "WA", name: "Washington", slug: "washington" },
  { code: "WV", name: "West Virginia", slug: "west-virginia" },
  { code: "WI", name: "Wisconsin", slug: "wisconsin" },
  { code: "WY", name: "Wyoming", slug: "wyoming" },
]

const STATE_BY_CODE: Map<string, { code: string; name: string; slug: string }> = new Map(
  US_STATES.map(s => [s.code, s]),
)
const STATE_BY_SLUG: Map<string, { code: string; name: string; slug: string }> = new Map(
  US_STATES.map(s => [s.slug, s]),
)

export function findStateByCode(code: string): { code: string; name: string; slug: string } | null {
  return STATE_BY_CODE.get(code.toUpperCase()) ?? null
}

export function findStateBySlug(slug: string): { code: string; name: string; slug: string } | null {
  return STATE_BY_SLUG.get(slug.toLowerCase()) ?? null
}

// ── Award-travel transfer programs ────────────────────────────────────
// Canonical list of loyalty programs that bank points transfer into. Used by
// the award-travel finder so a user can pick the currency they're collecting
// (e.g. "I want Hyatt points") and filter to cards that feed it. Stored on a
// card as `travel.transfer_partners` (free-form names tolerated; resolved back
// to these slugs via resolveProgramSlug).
export type TransferProgram = { slug: string; name: string; kind: "airline" | "hotel" }

export const TRANSFER_PROGRAMS: ReadonlyArray<TransferProgram> = [
  // Airlines
  { slug: "united", name: "United MileagePlus", kind: "airline" },
  { slug: "aeroplan", name: "Air Canada Aeroplan", kind: "airline" },
  { slug: "british-airways", name: "British Airways Avios", kind: "airline" },
  { slug: "flying-blue", name: "Air France-KLM Flying Blue", kind: "airline" },
  { slug: "virgin-atlantic", name: "Virgin Atlantic Flying Club", kind: "airline" },
  { slug: "avianca", name: "Avianca LifeMiles", kind: "airline" },
  { slug: "singapore", name: "Singapore KrisFlyer", kind: "airline" },
  { slug: "cathay", name: "Cathay Asia Miles", kind: "airline" },
  { slug: "emirates", name: "Emirates Skywards", kind: "airline" },
  { slug: "jetblue", name: "JetBlue TrueBlue", kind: "airline" },
  { slug: "southwest", name: "Southwest Rapid Rewards", kind: "airline" },
  { slug: "delta", name: "Delta SkyMiles", kind: "airline" },
  { slug: "alaska", name: "Alaska Mileage Plan", kind: "airline" },
  // Hotels
  { slug: "hyatt", name: "World of Hyatt", kind: "hotel" },
  { slug: "marriott", name: "Marriott Bonvoy", kind: "hotel" },
  { slug: "hilton", name: "Hilton Honors", kind: "hotel" },
  { slug: "ihg", name: "IHG One Rewards", kind: "hotel" },
  { slug: "wyndham", name: "Wyndham Rewards", kind: "hotel" },
  { slug: "choice", name: "Choice Privileges", kind: "hotel" },
]

/** Normalize any program string to a comparable key: lowercase, alnum-joined. */
function normalizeProgramKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// Common short forms / brand-only names that should resolve to a slug.
const PROGRAM_ALIASES: Record<string, string> = {
  ba: "british-airways",
  avios: "british-airways",
  krisflyer: "singapore",
  lifemiles: "avianca",
  "asia-miles": "cathay",
  bonvoy: "marriott",
  honors: "hilton",
  "world-of-hyatt": "hyatt",
}

const PROGRAM_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const p of TRANSFER_PROGRAMS) {
    m.set(normalizeProgramKey(p.slug), p.slug)
    m.set(normalizeProgramKey(p.name), p.slug)
    // first word of the name, e.g. "United", "Hilton", "Emirates"
    m.set(normalizeProgramKey(p.name.split(/\s+/)[0]), p.slug)
  }
  for (const [alias, slug] of Object.entries(PROGRAM_ALIASES)) m.set(alias, slug)
  return m
})()

/** Resolve a free-form partner name (or slug) to a canonical program slug, or null. */
export function resolveProgramSlug(partner: string): string | null {
  if (!partner) return null
  return PROGRAM_INDEX.get(normalizeProgramKey(partner)) ?? null
}

export function findTransferProgram(slug: string): TransferProgram | null {
  return TRANSFER_PROGRAMS.find(p => p.slug === slug) ?? null
}

// ── Lightweight raw-record shapes ─────────────────────────────────────
// We don't strongly type the entire catalog; we just describe the
// fields we touch. Anything else is forwarded via `raw`.

type RawEligibility = {
  state_restricted?: boolean | null
  states_allowed?: string[] | null
  states_excluded?: string[] | null
  military_only?: boolean
  eligibility_notes?: string | null
}

type RawCheckingRow = {
  id: string
  bank_name: string
  product_type?: string
  bonus_amount?: number
  expired?: boolean
  business?: boolean
  expiration_date?: string | null
  offer_expiration?: string | null
  requirements?: {
    direct_deposit_required?: boolean | null
    debit_transactions_required?: boolean | null | number
    min_direct_deposit_total?: number | null
    min_direct_deposit_per_deposit?: number | null
    min_opening_deposit?: number | null
    other_requirements_text?: string | null
    expiration_date?: string | null
  }
  fees?: { monthly_fee?: number | null }
  eligibility?: RawEligibility
  raw_excerpt?: string
}

type RawSavingsRow = {
  id: string
  bank_name: string
  bonus_amount?: number
  expired?: boolean
  business?: boolean
  brokerage?: boolean
  tiers?: { min_deposit?: number; bonus_amount?: number }[]
  fees?: { monthly_fee?: number | null }
  eligibility?: RawEligibility
  raw_excerpt?: string
  expiration_date?: string | null
}

// ── Helpers (internal) ───────────────────────────────────────────────

const ONLINE_PATTERNS = /online banking|enroll in online|online (?:account|opening|application)|apply online|sign up online|open online/i
const BRANCH_PATTERNS = /in-branch|in branch|visit (?:a )?branch|branch only|come into a branch|branch (?:opening|visit)/i
const DEBIT_PATTERNS = /debit (?:card )?(?:purchase|transaction|swipe|use)/i
const NO_DD_PATTERNS = /no (?:direct deposit|dd) required|without direct deposit|no payroll required/i

function shortName(raw: string): string {
  return (raw || "").split("(")[0].trim()
}

function isBrokerageRow(b: { id: string; bank_name: string; brokerage?: boolean }): boolean {
  if (b.brokerage === true) return true
  const lowered = `${b.bank_name} ${b.id}`.toLowerCase()
  return /brokerage|sofi-invest|tastytrade|moomoo|merrill-edge|schwab-brokerage|etrade-brokerage|public-brokerage|robinhood|webull|firstrade|wealthfront|betterment|m1 finance|public\.com/.test(
    lowered,
  )
}

function isBusinessRow(b: { id: string; bank_name: string; business?: boolean; raw_excerpt?: string }): boolean {
  if (b.business === true) return true
  const blob = `${b.bank_name} ${b.id} ${b.raw_excerpt ?? ""}`.toLowerCase()
  return /business checking|biz checking|business advantage|business banking|business account|business savings|innovator business|small business/.test(
    blob,
  )
}

function parseExpiration(value: unknown): string | null {
  if (!value || typeof value !== "string") return null
  // Accept either ISO or month-day strings; normalize to YYYY-MM-DD when possible.
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function parseExpirationFromText(...values: Array<string | null | undefined>): string | null {
  const dates: string[] = []
  const pattern = /(?:expires?|expiration(?: date)?|offer ends?|enrollment closes?|open by|apply by|register by)\s*(?:on\s*)?[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|[A-Z][a-z]+\s+\d{1,2},\s+\d{4})/gi
  for (const value of values) {
    if (!value) continue
    for (const match of value.matchAll(pattern)) {
      const parsed = parseExpiration(match[1])
      if (parsed) dates.push(parsed)
    }
  }
  return dates.sort()[0] ?? null
}

/**
 * Classify an offer's expiration status. Used both at normalization
 * time (sets CatalogItem.expirationStatus) and at filter time.
 *
 *   expired  — raw `expired: true` flag OR expirationDate parsed and in
 *              the past. We never want to ship these.
 *   live     — expirationDate parsed and in the future. Safe.
 *   unknown  — no `expired` flag, no expirationDate. The catalog
 *              doesn't tell us either way.
 */
function classifyExpiration(
  item: { expired?: boolean; expirationDate: string | null },
  today: Date,
): ExpirationStatus {
  if (item.expired) return "expired"
  if (!item.expirationDate) return "unknown"
  const exp = new Date(item.expirationDate + "T23:59:59")
  if (Number.isNaN(exp.getTime())) return "unknown"
  return exp >= today ? "live" : "expired"
}

/**
 * Convert a `states_allowed` list to canonical 2-letter postal codes.
 * Returns `null` when the data is unusable as state codes (e.g. it's
 * just a "Nationwide (U.S.)" sentinel — that's handled separately).
 */
function normalizeStates(values: string[] | null | undefined): string[] | null {
  if (!values || values.length === 0) return null
  const out: string[] = []
  for (const raw of values) {
    if (!raw) continue
    const v = raw.trim()
    // Detect the common nationwide sentinels
    if (/^nationwide/i.test(v)) continue
    // Already a 2-letter code?
    if (/^[A-Z]{2}$/.test(v)) {
      if (STATE_BY_CODE.has(v)) out.push(v)
      continue
    }
    // Name match (Hawaii, "New York", etc.) — case-insensitive
    const match = US_STATES.find(s => s.name.toLowerCase() === v.toLowerCase())
    if (match) out.push(match.code)
  }
  return out.length > 0 ? out : null
}

function classifyAvailability(
  elig: RawEligibility | undefined,
  branchRequired: boolean,
): {
  availability: Availability
  eligibleStates: string[] | null
  excludedStates: string[]
  confidence: EligibilityConfidence
} {
  const stateRestricted = elig?.state_restricted ?? false
  const allowedRaw = elig?.states_allowed ?? null
  const excludedRaw = elig?.states_excluded ?? null

  const excluded = normalizeStates(excludedRaw) ?? []

  // Branch-only flag wins regardless of state metadata — if you have to walk in,
  // the implicit availability is "wherever there's a branch".
  if (branchRequired) {
    return {
      availability: "branch_only",
      eligibleStates: null,
      excludedStates: excluded,
      confidence: "incomplete",
    }
  }

  // Restricted, with usable state codes → state_restricted, verified.
  if (stateRestricted) {
    const allowed = normalizeStates(allowedRaw)
    if (allowed && allowed.length > 0) {
      return {
        availability: "state_restricted",
        eligibleStates: allowed,
        excludedStates: excluded,
        confidence: "verified",
      }
    }
    // Restricted, but no usable allow-list → eligibility is unknown.
    return {
      availability: "unknown",
      eligibleStates: null,
      excludedStates: excluded,
      confidence: "unknown",
    }
  }

  // Not state-restricted, but we still need a Nationwide sentinel OR an
  // implicit "no restrictions" signal. Allow either:
  //  - states_allowed contains a Nationwide sentinel → verified nationwide
  //  - states_allowed is empty / "Nationwide" / null while state_restricted=false → verified nationwide
  const hasNationwideSentinel = (allowedRaw ?? []).some(s => /nationwide/i.test(s ?? ""))
  if (hasNationwideSentinel || stateRestricted === false) {
    return {
      availability: "nationwide",
      eligibleStates: null,
      excludedStates: excluded,
      confidence: "verified",
    }
  }

  // Fallthrough — eligibility data is missing or contradictory.
  return {
    availability: "unknown",
    eligibleStates: null,
    excludedStates: excluded,
    confidence: "unknown",
  }
}

function classifyFunding(req: RawCheckingRow["requirements"]): FundingMethod {
  const dd = req?.direct_deposit_required === true
  const debit = req?.debit_transactions_required != null && req?.debit_transactions_required !== false
  const text = (req?.other_requirements_text ?? "").toLowerCase()
  const noDdText = NO_DD_PATTERNS.test(text)
  const debitText = DEBIT_PATTERNS.test(text)

  // Conservative: structured fields win.
  if (dd && (debit || debitText)) return "mixed"
  if (dd) return "direct_deposit"
  if (debit || debitText) return "debit_transactions"
  if (noDdText) return "cash_deposit"
  return "unknown"
}

function classifyOnlineOpening(req: RawCheckingRow["requirements"]): {
  online: boolean | null
  branch: boolean
} {
  const text = (req?.other_requirements_text ?? "").toLowerCase()
  if (BRANCH_PATTERNS.test(text)) return { online: false, branch: true }
  if (ONLINE_PATTERNS.test(text)) return { online: true, branch: false }
  return { online: null, branch: false }
}

// ── Normalization ────────────────────────────────────────────────────

function normalizeChecking(row: RawCheckingRow): CatalogItem {
  const brokerage = isBrokerageRow(row)
  const business = isBusinessRow(row)
  const category: CatalogCategory =
    brokerage ? "brokerage" : business ? "business_checking" : "personal_checking"
  const trackingKind: TrackingKind =
    category === "business_checking" ? "business-checking" :
    category === "brokerage" ? "brokerage" :
    "personal-checking"

  const { online, branch } = classifyOnlineOpening(row.requirements)
  const eligibility = classifyAvailability(row.eligibility, branch)

  const expirationDate = parseExpiration(row.expiration_date)
    ?? parseExpiration(row.offer_expiration)
    ?? parseExpiration(row.requirements?.expiration_date)
    ?? parseExpirationFromText(
      row.requirements?.other_requirements_text,
      row.eligibility?.eligibility_notes,
      row.raw_excerpt,
    )

  const expired = row.expired === true
  return {
    id: row.id,
    bankName: row.bank_name,
    shortBankName: shortName(row.bank_name),
    category,
    trackingKind,
    fundingMethod: classifyFunding(row.requirements),
    availability: eligibility.availability,
    eligibleStates: eligibility.eligibleStates,
    excludedStates: eligibility.excludedStates,
    onlineOpening: branch ? false : online,
    branchRequired: branch,
    minimumDirectDeposit: row.requirements?.min_direct_deposit_total ?? null,
    minimumCashDeposit: row.requirements?.min_opening_deposit ?? null,
    bonusAmount: row.bonus_amount ?? 0,
    monthlyFee: row.fees?.monthly_fee ?? null,
    expirationDate,
    eligibilityConfidence: eligibility.confidence,
    eligibilityNotes: row.eligibility?.eligibility_notes ?? null,
    militaryOnly: row.eligibility?.military_only === true,
    expired,
    expirationStatus: classifyExpiration({ expired, expirationDate }, new Date()),
    raw: row,
  }
}

function normalizeSavings(row: RawSavingsRow): CatalogItem {
  const brokerage = isBrokerageRow(row)
  const business = isBusinessRow(row)
  const category: CatalogCategory =
    brokerage ? "brokerage" : business ? "business_savings" : "personal_savings"
  const trackingKind: TrackingKind =
    category === "business_savings" ? "business-savings" :
    category === "brokerage" ? "brokerage" :
    "personal-savings"

  // Savings rows don't carry the granular online/branch text we look for on
  // checking. Assume online opening is true unless `eligibility_notes` says
  // otherwise — almost every modern HYSA/brokerage promotion is online.
  const notes = (row.eligibility?.eligibility_notes ?? "").toLowerCase()
  const branchRequired = BRANCH_PATTERNS.test(notes)
  const eligibility = classifyAvailability(row.eligibility, branchRequired)

  const minDeposit = row.tiers?.[0]?.min_deposit ?? null
  const tierBonus = row.tiers?.[0]?.bonus_amount ?? row.bonus_amount ?? 0

  const expirationDate = parseExpiration(row.expiration_date)
    ?? parseExpirationFromText(row.eligibility?.eligibility_notes, row.raw_excerpt)
  const expired = row.expired === true
  return {
    id: row.id,
    bankName: row.bank_name,
    shortBankName: shortName(row.bank_name),
    category,
    trackingKind,
    fundingMethod: "cash_deposit",
    availability: eligibility.availability,
    eligibleStates: eligibility.eligibleStates,
    excludedStates: eligibility.excludedStates,
    onlineOpening: branchRequired ? false : true,
    branchRequired,
    minimumDirectDeposit: null,
    minimumCashDeposit: minDeposit,
    bonusAmount: tierBonus,
    monthlyFee: row.fees?.monthly_fee ?? null,
    expirationDate,
    eligibilityConfidence: eligibility.confidence,
    eligibilityNotes: row.eligibility?.eligibility_notes ?? null,
    militaryOnly: row.eligibility?.military_only === true,
    expired,
    expirationStatus: classifyExpiration({ expired, expirationDate }, new Date()),
    raw: row,
  }
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Cached normalized catalog. The raw data is module-scoped immutable, so
 * we can normalize once at load time.
 */
let cached: CatalogItem[] | null = null

export function getNormalizedCatalog(): CatalogItem[] {
  if (cached) return cached
  const checking = (rawCheckingBonuses as RawCheckingRow[]).map(normalizeChecking)
  const savings = (rawSavingsBonuses as unknown as RawSavingsRow[]).map(normalizeSavings)
  cached = [...checking, ...savings]
  return cached
}

/**
 * Catalog excluding offers we KNOW are expired. Includes offers with
 * unknown expiration — preserves the pre-existing behavior for the main
 * browse surface, where filtering out everything unverified would empty
 * the page (most catalog rows ship no expirationDate).
 *
 * Recomputes `expirationStatus` against `referenceDate` so a "live" cache
 * doesn't stay live after its date passes.
 */
export function getLiveCatalog(referenceDate: Date = new Date()): CatalogItem[] {
  return getNormalizedCatalog()
    .map(item => withFreshExpirationStatus(item, referenceDate))
    .filter(item => item.expirationStatus !== "expired")
}

/**
 * Strict variant: only offers with a confirmed live expiration. Use on
 * surfaces that make eligibility claims (state pages) where surfacing
 * an unverified offer is worse than surfacing none. Items with
 * `expirationStatus: "unknown"` are deliberately excluded.
 */
export function getStrictlyLiveCatalog(referenceDate: Date = new Date()): CatalogItem[] {
  return getNormalizedCatalog()
    .map(item => withFreshExpirationStatus(item, referenceDate))
    .filter(item => item.expirationStatus === "live")
}

function withFreshExpirationStatus(item: CatalogItem, referenceDate: Date): CatalogItem {
  const status = classifyExpiration(
    { expired: item.expired, expirationDate: item.expirationDate },
    referenceDate,
  )
  return status === item.expirationStatus ? item : { ...item, expirationStatus: status }
}

/** Lean shape suitable for crossing the server→client boundary: drops
 *  the heavy `raw` blob (the full JSON row) which client surfaces don't
 *  need. Use this when passing items into a `"use client"` component. */
export type ClientCatalogItem = Omit<CatalogItem, "raw">

export function toClientItem(item: CatalogItem): ClientCatalogItem {
  // Spread + drop. Forces TS to forget `raw` exists on the result.
  const { raw, ...rest } = item
  void raw
  return rest
}

export function getLiveCatalogForClient(referenceDate: Date = new Date()): ClientCatalogItem[] {
  return getLiveCatalog(referenceDate).map(toClientItem)
}

// ── Eligibility predicate ────────────────────────────────────────────

/**
 * Does this item match the given state?
 *
 *  - Nationwide → true (no exclusion list match needed for nationwide:
 *    by definition excluded states have already been moved into
 *    `excludedStates` during normalization).
 *  - State-restricted → true if state is in `eligibleStates` AND NOT in
 *    `excludedStates`.
 *  - Unknown → false. Unknown availability is NEVER treated as eligible
 *    for the strict "available to me" filter; the UI can still surface
 *    these as "Eligibility unverified" cards in a separate bucket.
 *  - Branch-only → unknown for state-availability purposes; defer.
 *
 * `stateCode` is the 2-letter postal code (uppercased). Accepts both the
 * full `CatalogItem` and the lean `ClientCatalogItem` (no `raw`).
 */
export function isEligibleInState(
  item: Pick<CatalogItem, "availability" | "eligibleStates" | "excludedStates">,
  stateCode: string,
): boolean {
  const code = stateCode.toUpperCase()
  if (item.excludedStates.includes(code)) return false
  switch (item.availability) {
    case "nationwide":
      return true
    case "state_restricted":
      return item.eligibleStates?.includes(code) ?? false
    case "branch_only":
    case "unknown":
      return false
  }
}

/**
 * Items eligible for a given state, plus a side bucket of items whose
 * eligibility could not be verified. Used by the state-page UI to render
 * nationwide + local sections while keeping unverified offers visible
 * without claiming they're confirmed.
 */
export function bucketByState(items: CatalogItem[], stateCode: string): {
  nationwide: CatalogItem[]
  local: CatalogItem[]
  unverified: CatalogItem[]
} {
  const code = stateCode.toUpperCase()
  const nationwide: CatalogItem[] = []
  const local: CatalogItem[] = []
  const unverified: CatalogItem[] = []
  for (const it of items) {
    if (it.excludedStates.includes(code)) continue
    if (it.availability === "nationwide") nationwide.push(it)
    else if (it.availability === "state_restricted" && it.eligibleStates?.includes(code)) local.push(it)
    else if (it.availability === "unknown" || it.availability === "branch_only") unverified.push(it)
  }
  return { nationwide, local, unverified }
}

// ── Data-quality validator ───────────────────────────────────────────

export type DataQualityIssue = {
  id: string
  bankName: string
  severity: "warn" | "info"
  kind:
    | "state_restricted_without_states_allowed"
    | "conflicting_state_fields"
    | "missing_expiration"
    | "checking_with_unknown_funding"
    | "savings_categorized_as_checking"
    | "untrackable_missing_id_or_category"
  detail: string
}

export function reportDataQuality(items: CatalogItem[] = getLiveCatalog()): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  for (const it of items) {
    if (!it.id || !it.category) {
      issues.push({
        id: it.id || "(no id)",
        bankName: it.bankName,
        severity: "warn",
        kind: "untrackable_missing_id_or_category",
        detail: "Missing id or category — cannot be tracked.",
      })
    }
    if (it.availability === "unknown" && it.eligibilityConfidence === "unknown") {
      // The PNC-style case: state_restricted: true, states_allowed: null.
      const raw = it.raw as { eligibility?: RawEligibility } | undefined
      if (raw?.eligibility?.state_restricted === true) {
        issues.push({
          id: it.id,
          bankName: it.bankName,
          severity: "warn",
          kind: "state_restricted_without_states_allowed",
          detail: "Flagged state_restricted but states_allowed is null/empty.",
        })
      }
    }
    if (it.category === "personal_checking" && it.fundingMethod === "unknown") {
      issues.push({
        id: it.id,
        bankName: it.bankName,
        severity: "info",
        kind: "checking_with_unknown_funding",
        detail: "Checking offer with unclear funding requirements (DD/debit/cash).",
      })
    }
    if (!it.expirationDate && !it.expired) {
      issues.push({
        id: it.id,
        bankName: it.bankName,
        severity: "info",
        kind: "missing_expiration",
        detail: "No expiration date — eligibility refresh window unknown.",
      })
    }
  }
  return issues
}
