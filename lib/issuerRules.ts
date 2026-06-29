// Approval-odds engine — issuer eligibility from held cards + a credit profile.
//
// Philosophy (see the user's "credibility over fake finance" rule): we do NOT
// invent a probability percentage — there's no public profile→outcome dataset,
// so a "73% approved" number would be made up. Instead we return an honest,
// explainable verdict with the REASONS, and we track which missing inputs
// would sharpen it (drives the "*" asterisk in the UI):
//
//   clear    — no known blocker
//   caution  — a soft signal or near-limit velocity rule applies (with why)
//   deny     — a hard gate is tripped right now (with when it clears)
//   unknown  — issuer is genuinely opaque (Capital One; Amex pop-up jail)
//
// HARD gates come from held cards + open dates (5/24, 2/90, 7/12, 1/65, …).
// SOFT signals come from the credit profile (score, inquiries, utilization).
// A deny can't be rescued by a good profile; a weak profile can downgrade a
// clear to a caution. Pure + deterministic: the as-of date is passed in.

import { addMonths, computeFive24, type Five24Card } from "./five24"

export type HeldCard = {
  id?: string
  issuer?: string | null
  product_name?: string | null
  catalog_card_id?: string | null
  card_type: "personal" | "business"
  open_date: string // ISO YYYY-MM-DD; cards without a valid date are ignored for velocity
  closed_date?: string | null
  /** Did the user earn this product's welcome bonus? true/false/null(unknown). */
  bonus_earned?: boolean | null
}

export type CreditProfile = {
  score?: number | null
  hard_inquiries_6mo?: number | null
  hard_inquiries_12mo?: number | null
  utilization_pct?: number | null
  annual_income?: number | null
}

export type Verdict = "clear" | "caution" | "deny" | "unknown"

export type Reason = {
  severity: "deny" | "caution" | "info"
  rule: string
  text: string
}

export type NeedInfoField =
  | "score" | "inquiries" | "income" | "utilization"
  | "amex_bonus_history" | "open_dates"

export type NeedInfo = { field: NeedInfoField; text: string }

export type IssuerEligibility = {
  issuer: string // normalized slug
  label: string
  verdict: Verdict
  /** Missing inputs lower confidence → the UI shows a "*" next to the verdict. */
  confidence: "high" | "medium" | "low"
  reasons: Reason[]
  needsInfo: NeedInfo[]
  /** When the soonest hard gate clears (deny only), else null. */
  nextEligibleDate: string | null
}

// ── issuer normalization ──────────────────────────────────────────────
const ISSUER_ALIASES: Record<string, string> = {
  "american-express": "amex", "americanexpress": "amex",
  "bank-of-america": "bofa", "bankofamerica": "bofa",
  "capitalone": "capital-one", "cap-one": "capital-one", "capone": "capital-one",
  "usbank": "us-bank", "u-s-bank": "us-bank",
  "wellsfargo": "wells-fargo",
}

export function normalizeIssuer(raw?: string | null): string {
  if (!raw) return ""
  const slug = raw.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-")
  return ISSUER_ALIASES[slug] ?? slug
}

export const ISSUER_LABELS: Record<string, string> = {
  chase: "Chase", amex: "American Express", citi: "Citi", "capital-one": "Capital One",
  bofa: "Bank of America", "us-bank": "U.S. Bank", barclays: "Barclays",
  "wells-fargo": "Wells Fargo", discover: "Discover",
}

export function issuerLabel(slug: string): string {
  if (ISSUER_LABELS[slug]) return ISSUER_LABELS[slug]
  return slug.split("-").map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ")
}

/** Issuers we encode rules for, in matrix display order. */
export const MAJOR_ISSUERS = [
  "chase", "amex", "citi", "capital-one", "bofa", "us-bank", "barclays", "wells-fargo", "discover",
]

export const VERDICT_RANK: Record<Verdict, number> = { clear: 0, caution: 1, unknown: 2, deny: 3 }

// ── date / counting helpers ───────────────────────────────────────────
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
function validOpen(c: HeldCard): boolean { return !!c.open_date && ISO_DATE.test(c.open_date) }
function isHeld(c: HeldCard): boolean { return !c.closed_date }

function toUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}
function pad(n: number): string { return String(n).padStart(2, "0") }
function addDaysIso(iso: string, days: number): string {
  const d = new Date(toUTC(iso) + days * 86400000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function daysBetween(aIso: string, bIso: string): number {
  return Math.round((toUTC(aIso) - toUTC(bIso)) / 86400000)
}

/** Cards opened in (sinceIso, asOf], newest first. */
function opensSince(cards: HeldCard[], asOf: string, sinceIso: string, pred: (c: HeldCard) => boolean): HeldCard[] {
  return cards
    .filter(c => validOpen(c) && c.open_date <= asOf && c.open_date > sinceIso && pred(c))
    .sort((a, b) => (a.open_date < b.open_date ? 1 : a.open_date > b.open_date ? -1 : 0))
}
const issuerIs = (slug: string) => (c: HeldCard) => normalizeIssuer(c.issuer) === slug
const personal = (c: HeldCard) => c.card_type === "personal"

function toFive24(cards: HeldCard[]): Five24Card[] {
  return cards.map(c => ({
    id: c.id, issuer: c.issuer ?? undefined, product_name: c.product_name ?? null,
    card_type: c.card_type, open_date: c.open_date,
  }))
}

// ── soft profile signals (apply to every issuer) ──────────────────────
function profileSignals(profile: CreditProfile | null | undefined): { reasons: Reason[]; needsInfo: NeedInfo[] } {
  const reasons: Reason[] = []
  const needsInfo: NeedInfo[] = []
  const p = profile ?? {}

  if (p.score == null) {
    needsInfo.push({ field: "score", text: "Add your credit score — it shifts every verdict." })
  } else if (p.score < 670) {
    reasons.push({ severity: "caution", rule: "Credit score", text: `Score ${p.score} is below ~670 — many rewards cards want 700+.` })
  } else if (p.score < 720) {
    reasons.push({ severity: "caution", rule: "Credit score", text: `Score ${p.score} is workable but on the low side for premium cards (~720+ is comfortable).` })
  }

  if (p.hard_inquiries_6mo == null) {
    needsInfo.push({ field: "inquiries", text: "Add hard inquiries (last 6 mo) — issuers get sensitive past ~6." })
  } else if (p.hard_inquiries_6mo >= 6) {
    reasons.push({ severity: "caution", rule: "Hard inquiries", text: `${p.hard_inquiries_6mo} hard pulls in 6 months — past ~6 some issuers auto-decline.` })
  }

  if (p.utilization_pct != null && p.utilization_pct > 30) {
    reasons.push({ severity: "caution", rule: "Utilization", text: `Reported utilization is ${p.utilization_pct}% — under 30% reads much better at application.` })
  }

  if (p.annual_income == null) {
    needsInfo.push({ field: "income", text: "Add income — it gates premium cards and the credit line you'll get." })
  }

  return { reasons, needsInfo }
}

// ── the engine ────────────────────────────────────────────────────────
export function evaluateIssuer(
  issuerRaw: string,
  cards: HeldCard[],
  profile: CreditProfile | null,
  asOf: string,
): IssuerEligibility {
  const issuer = normalizeIssuer(issuerRaw)
  const reasons: Reason[] = []
  const needsInfo: NeedInfo[] = []
  let severity = 0 // 0 clear, 1 caution, 2 deny
  let nextEligibleDate: string | null = null
  let opaque = false

  const add = (r: Reason) => {
    reasons.push(r)
    if (r.severity === "deny") severity = Math.max(severity, 2)
    else if (r.severity === "caution") severity = Math.max(severity, 1)
  }
  const gate = (d?: string | null) => {
    if (d) nextEligibleDate = !nextEligibleDate || d < nextEligibleDate ? d : nextEligibleDate
  }

  // Velocity math needs open dates — flag missing ones up front.
  const missingDates = cards.filter(c => !validOpen(c)).length
  if (missingDates > 0) {
    needsInfo.push({ field: "open_dates", text: `${missingDates} card${missingDates === 1 ? "" : "s"} missing an open date — add it so velocity rules are accurate.` })
  }

  switch (issuer) {
    case "chase": {
      const f = computeFive24(toFive24(cards), asOf)
      if (!f.under_524) {
        add({ severity: "deny", rule: "Chase 5/24", text: `You're at ${f.count}/24 — Chase declines most personal cards until a slot opens.` })
        gate(f.next_slot_opens)
      } else if (f.count === 4) {
        add({ severity: "caution", rule: "Chase 5/24", text: "You're at 4/24 — this would be your 5th and final slot before 5/24 locks Chase out." })
      } else {
        add({ severity: "info", rule: "Chase 5/24", text: `Under 5/24 (${f.count}/24) — ${f.slots_remaining} personal slot${f.slots_remaining === 1 ? "" : "s"} open.` })
      }
      // 2/30: Chase rarely approves more than ~2 new cards in any 30-day stretch.
      const last30 = opensSince(cards, asOf, addDaysIso(asOf, -30), () => true)
      if (last30.length >= 2) {
        add({ severity: "caution", rule: "Chase 2/30", text: `${last30.length} cards opened in the last 30 days — Chase's ~2/30 velocity may bite.` })
      }
      // Sapphire 48-month bonus is per-product; flag it as info if they hold one.
      if (cards.some(c => issuerIs("chase")(c) && /sapphire/i.test(c.product_name ?? ""))) {
        add({ severity: "info", rule: "Sapphire 48-mo", text: "You hold a Sapphire — a new Sapphire bonus is locked for 48 months after your last Sapphire bonus." })
      }
      break
    }

    case "amex": {
      const amexHeld = cards.filter(c => issuerIs("amex")(c))
      // 2/90: at most 2 Amex credit cards in any 90 days; a 3rd is denied.
      const amex90 = opensSince(cards, asOf, addDaysIso(asOf, -90), c => issuerIs("amex")(c) && personal(c))
      if (amex90.length >= 2) {
        add({ severity: "deny", rule: "Amex 2/90", text: "You've opened 2 Amex cards in 90 days — a 3rd will be denied (2/90 rule)." })
        gate(addDaysIso(amex90[1].open_date, 90))
      }
      // 5-credit-card limit (consumer credit cards; charge/business exempt — approximated).
      const amexOpenPersonal = amexHeld.filter(c => isHeld(c) && personal(c)).length
      if (amexOpenPersonal >= 5) {
        add({ severity: "caution", rule: "Amex 5-card limit", text: `You hold ~${amexOpenPersonal} Amex personal cards — Amex caps consumer credit cards around 5.` })
      }
      // Lifetime bonus — the gap this feature exists to close.
      const amexBonusUnknown = amexHeld.filter(c => c.bonus_earned == null).length
      if (amexBonusUnknown > 0) {
        needsInfo.push({ field: "amex_bonus_history", text: `Mark which of your ${amexBonusUnknown} Amex card${amexBonusUnknown === 1 ? "" : "s"} you've earned the bonus on — Amex pays each welcome bonus once per lifetime.` })
      }
      // Pop-up jail: genuinely unpredictable.
      add({ severity: "info", rule: "Amex pop-up", text: "Amex may show a 'you're not eligible for the welcome offer' pop-up that no public rule predicts." })
      opaque = true
      break
    }

    case "citi": {
      const citi8 = opensSince(cards, asOf, addDaysIso(asOf, -8), c => issuerIs("citi")(c))
      if (citi8.length >= 1 && daysBetween(asOf, citi8[0].open_date) < 8) {
        add({ severity: "deny", rule: "Citi 1/8", text: "Your last Citi card was within 8 days — Citi requires 8 days between applications." })
        gate(addDaysIso(citi8[0].open_date, 8))
      }
      const citi65 = opensSince(cards, asOf, addDaysIso(asOf, -65), c => issuerIs("citi")(c))
      if (citi65.length >= 2) {
        add({ severity: "deny", rule: "Citi 1/65", text: "You've opened 2 Citi cards in 65 days — Citi allows at most 2 per 65-day window." })
        gate(addDaysIso(citi65[1].open_date, 65))
      }
      if (cards.some(c => issuerIs("citi")(c))) {
        add({ severity: "info", rule: "Citi 48-mo", text: "Citi bonuses lock for 48 months per card family — re-earning the same family's bonus may not pay." })
      }
      break
    }

    case "bofa": {
      // 7/12: 7+ new personal accounts (all issuers) in 12 months → decline.
      const p12 = opensSince(cards, asOf, addMonths(asOf, -12), personal)
      if (p12.length >= 7) {
        add({ severity: "deny", rule: "BofA 7/12", text: `${p12.length} new personal cards in 12 months — BofA's 7/12 rule declines at 7+.` })
        const asc = [...p12].reverse() // oldest first
        gate(addMonths(asc[p12.length - 7].open_date, 12))
      }
      // 2/3/4 (BofA-issued): 2 in 2mo / 3 in 12mo / 4 in 24mo.
      const bofa2mo = opensSince(cards, asOf, addMonths(asOf, -2), issuerIs("bofa"))
      const bofa12 = opensSince(cards, asOf, addMonths(asOf, -12), issuerIs("bofa"))
      const bofa24 = opensSince(cards, asOf, addMonths(asOf, -24), issuerIs("bofa"))
      if (bofa2mo.length >= 2) {
        add({ severity: "deny", rule: "BofA 2/3/4", text: "2 BofA cards in 2 months — BofA's 2/3/4 rule blocks the next one." })
        gate(addMonths(bofa2mo[1].open_date, 2))
      } else if (bofa12.length >= 3 || bofa24.length >= 4) {
        add({ severity: "caution", rule: "BofA 2/3/4", text: "You're near BofA's 3-per-12-months / 4-per-24-months limit on BofA cards." })
      }
      break
    }

    case "capital-one": {
      opaque = true
      const cap6 = opensSince(cards, asOf, addMonths(asOf, -6), issuerIs("capital-one"))
      if (cap6.length >= 1) {
        add({ severity: "caution", rule: "Cap One velocity", text: `Capital One rarely approves a 2nd card within ~6 months — your last was ${cap6[0].open_date}.` })
        gate(addMonths(cap6[0].open_date, 6))
      }
      add({ severity: "info", rule: "Cap One pulls 3", text: "Capital One pulls all three bureaus and its approval rules are opaque — treat it as a wildcard." })
      break
    }

    case "barclays": {
      // Barclays is sensitive to a high 24-month new-account count (~6/24).
      const p24 = opensSince(cards, asOf, addMonths(asOf, -24), personal)
      if (p24.length >= 6) {
        add({ severity: "caution", rule: "Barclays 6/24", text: `${p24.length} personal cards in 24 months — Barclays rarely approves much above ~6/24.` })
      }
      break
    }

    case "wells-fargo": {
      const wf6 = opensSince(cards, asOf, addMonths(asOf, -6), issuerIs("wells-fargo"))
      if (wf6.length >= 1) {
        add({ severity: "caution", rule: "WF ~1/6", text: `Wells Fargo prefers ~6 months between its cards — your last was ${wf6[0].open_date}.` })
        gate(addMonths(wf6[0].open_date, 6))
      }
      break
    }

    case "us-bank": {
      add({ severity: "info", rule: "U.S. Bank", text: "U.S. Bank favors an existing banking relationship and is conservative on thin/new files." })
      break
    }

    case "discover": {
      add({ severity: "info", rule: "Discover", text: "Discover is relatively lenient but typically approves one card at a time." })
      break
    }

    default: {
      add({ severity: "info", rule: issuerLabel(issuer), text: "No issuer-specific velocity rules encoded — verdict reflects your credit profile only." })
    }
  }

  // Soft profile signals (every issuer).
  const sig = profileSignals(profile)
  sig.reasons.forEach(add)
  needsInfo.push(...sig.needsInfo)

  const verdict: Verdict = severity >= 2 ? "deny" : severity === 1 ? "caution" : opaque ? "unknown" : "clear"

  // Confidence: a missing input that materially moves THIS issuer → low (asterisk
  // with a real reason); minor gaps → medium; nothing missing → high.
  const keyGap = needsInfo.some(n =>
    n.field === "score" || n.field === "inquiries" || (issuer === "amex" && n.field === "amex_bonus_history"))
  const confidence = keyGap ? "low" : needsInfo.length > 0 ? "medium" : "high"

  // Order reasons: blockers first, then cautions, then info.
  reasons.sort((a, b) => sevRank(a.severity) - sevRank(b.severity))

  return { issuer, label: issuerLabel(issuer), verdict, confidence, reasons, needsInfo, nextEligibleDate }
}

function sevRank(s: Reason["severity"]): number {
  return s === "deny" ? 0 : s === "caution" ? 1 : 2
}

/** Evaluate the major issuers plus any extra issuer the user already holds. */
export function evaluateAllIssuers(
  cards: HeldCard[],
  profile: CreditProfile | null,
  asOf: string,
): IssuerEligibility[] {
  const held = cards.map(c => normalizeIssuer(c.issuer)).filter(Boolean)
  const extras = held.filter(s => !MAJOR_ISSUERS.includes(s))
  const slugs = [...MAJOR_ISSUERS, ...Array.from(new Set(extras)).sort()]
  return slugs.map(s => evaluateIssuer(s, cards, profile, asOf))
}

// ── per-card helpers (used by the sequencer / card-targeted views) ────
/** True when the issuer is a hard "deny" right now (skip recommending it). */
export function issuerHardBlocked(issuerRaw: string, cards: HeldCard[], asOf: string): boolean {
  return evaluateIssuer(issuerRaw, cards, null, asOf).verdict === "deny"
}

/**
 * Whether a specific card's WELCOME BONUS is likely off the table (Amex
 * once-per-lifetime; same product already earned). "unknown" when we lack the
 * bonus history to say. Card identity matches on catalog id, else product name.
 */
export function bonusLikelyUnavailable(
  target: { issuer?: string | null; catalog_card_id?: string | null; product_name?: string | null },
  cards: HeldCard[],
): "yes" | "no" | "unknown" {
  const issuer = normalizeIssuer(target.issuer)
  if (issuer !== "amex") return "no" // lifetime rule is the Amex case we model
  const sameProduct = (c: HeldCard) => {
    if (target.catalog_card_id && c.catalog_card_id) return c.catalog_card_id === target.catalog_card_id
    const a = (c.product_name ?? "").trim().toLowerCase()
    const b = (target.product_name ?? "").trim().toLowerCase()
    return a !== "" && a === b
  }
  const matches = cards.filter(c => issuerIs("amex")(c) && sameProduct(c))
  if (matches.length === 0) return "no"
  if (matches.some(c => c.bonus_earned === true)) return "yes"
  if (matches.every(c => c.bonus_earned === false)) return "no"
  return "unknown"
}
