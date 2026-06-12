/**
 * Authoritative bank-currency → loyalty-program transfer map + point valuations.
 *
 * Why this module exists
 * ----------------------
 * Each transferable card used to carry its own hand-maintained
 * `travel.transfer_partners` list and a single `travel.max_transfer_cpp`
 * number. That had two failure modes the award-travel finder exposed:
 *
 *   1. Stale / inconsistent lists. Two Amex Gold rows shipped different
 *      partner sets; Chase rows still listed Emirates after Chase dropped it
 *      (Oct 16 2025); Bilt's list pre-dated its Alaska/Atmos partnership.
 *   2. One card-level cpp applied to *every* partner. A Chase card showed the
 *      same "2.0¢/pt" whether you transferred to Hyatt (~1.55¢) or Marriott
 *      (~0.80¢) — misleading on the per-program view.
 *
 * The fix: a transfer card's partners and per-program value are derived from
 * its REWARDS CURRENCY, which is the thing that actually determines them. A
 * card opts into transfer mode by having a non-empty `travel.transfer_partners`
 * (so co-brand/no-transfer cards on the same currency aren't swept in), but the
 * authoritative partner set + ratios come from here.
 *
 * Sourcing (all verified June 2026):
 *   - Amex MR partners/ratios: Upgraded Points (updated 2026-05-11), NerdWallet.
 *   - Chase UR: chase.com transfer page (Emirates removed 2025-10-16; Wyndham added).
 *   - Citi ThankYou: FrequentMiler (premium Strata-card ratios), Upgraded Points.
 *   - Capital One: capitalone.com official (Emirates 2:1.5 since 2026-01-13).
 *   - Bilt: Bilt support page + AwardWallet (Alaska/Atmos + Hyatt confirmed).
 *   - Point valuations: The Points Guy monthly valuations, June 2026.
 *
 * `ratio` = partner points received per 1 bank point (1.0 = 1:1; Amex→Hilton
 * is 1:2 → 2.0; Capital One→JetBlue is 5:3 → 0.6). Only canonical programs the
 * finder can filter/value are listed; "other" partners (Aer Lingus, Qatar, AA,
 * Turkish, etc.) are omitted because they aren't selectable or independently
 * valued here, and never beat the canonical best for headline cpp.
 */
import { resolveProgramSlug } from "./catalogTaxonomy"
import type { CreditCardBonus } from "./creditCardBonuses"

/** Cents-per-point for each loyalty currency (TPG monthly valuations, June 2026). */
export const PROGRAM_VALUATION_CENTS: Record<string, number> = {
  // Airlines
  united: 1.35,
  aeroplan: 1.4,
  "british-airways": 1.4,
  "flying-blue": 1.3,
  "virgin-atlantic": 1.3,
  avianca: 1.4,
  singapore: 1.3,
  cathay: 1.3,
  emirates: 1.2,
  jetblue: 1.35,
  southwest: 1.25,
  delta: 1.2,
  alaska: 1.4,
  // Hotels
  hyatt: 1.55,
  marriott: 0.8,
  hilton: 0.35,
  ihg: 0.55,
  wyndham: 0.7,
  choice: 0.6,
}

/** Program point value in DOLLARS per point (matches `travel.max_transfer_cpp` units). */
export function programValueDollars(programSlug: string): number {
  const cents = PROGRAM_VALUATION_CENTS[programSlug]
  return cents == null ? 0 : cents / 100
}

export type CurrencyKey = "amex" | "chase" | "citi" | "capone" | "bilt"
export type CurrencyTransfer = { program: string; ratio: number }

/**
 * Canonical, current transfer partners per bank currency. See module header
 * for sourcing. Programs NOT listed for a currency are deliberately absent
 * (e.g. Hyatt is Chase/Bilt-only; Chase no longer transfers to Emirates).
 */
export const CURRENCY_PARTNERS: Record<CurrencyKey, CurrencyTransfer[]> = {
  // American Express Membership Rewards. No United/Southwest/Alaska/Hyatt/IHG/Wyndham.
  amex: [
    { program: "aeroplan", ratio: 1 },
    { program: "british-airways", ratio: 1 },
    { program: "flying-blue", ratio: 1 },
    { program: "virgin-atlantic", ratio: 1 },
    { program: "avianca", ratio: 1 },
    { program: "singapore", ratio: 1 },
    { program: "cathay", ratio: 0.8 },
    { program: "emirates", ratio: 0.8 },
    { program: "jetblue", ratio: 0.8 },
    { program: "delta", ratio: 1 },
    { program: "marriott", ratio: 1 },
    { program: "hilton", ratio: 2 },
    { program: "choice", ratio: 1 },
  ],
  // Chase Ultimate Rewards. Emirates removed 2025-10-16; Wyndham added. All 1:1.
  chase: [
    { program: "united", ratio: 1 },
    { program: "aeroplan", ratio: 1 },
    { program: "british-airways", ratio: 1 },
    { program: "flying-blue", ratio: 1 },
    { program: "virgin-atlantic", ratio: 1 },
    { program: "singapore", ratio: 1 },
    { program: "jetblue", ratio: 1 },
    { program: "southwest", ratio: 1 },
    { program: "hyatt", ratio: 1 },
    { program: "marriott", ratio: 1 },
    { program: "ihg", ratio: 1 },
    { program: "wyndham", ratio: 1 },
  ],
  // Citi ThankYou (premium Strata-card ratios). No United/Aeroplan/Delta/Alaska/
  // Hyatt/Marriott/Hilton/IHG. Aeromexico removed 2026-01-25.
  citi: [
    { program: "british-airways", ratio: 1 },
    { program: "flying-blue", ratio: 1 },
    { program: "virgin-atlantic", ratio: 1 },
    { program: "avianca", ratio: 1 },
    { program: "singapore", ratio: 1 },
    { program: "cathay", ratio: 1 },
    { program: "emirates", ratio: 0.8 },
    { program: "jetblue", ratio: 1 },
    { program: "wyndham", ratio: 1 },
    { program: "choice", ratio: 1.5 },
  ],
  // Capital One miles. No United/Delta/Alaska/Southwest/Hyatt/Marriott/Hilton/IHG.
  capone: [
    { program: "aeroplan", ratio: 1 },
    { program: "british-airways", ratio: 1 },
    { program: "flying-blue", ratio: 1 },
    { program: "virgin-atlantic", ratio: 1 },
    { program: "avianca", ratio: 1 },
    { program: "singapore", ratio: 1 },
    { program: "cathay", ratio: 1 },
    { program: "emirates", ratio: 0.75 },
    { program: "jetblue", ratio: 0.6 },
    { program: "wyndham", ratio: 1 },
    { program: "choice", ratio: 1 },
  ],
  // Bilt Rewards. Alaska (Atmos) + Hyatt confirmed. No Singapore/JetBlue/Delta/Choice.
  bilt: [
    { program: "alaska", ratio: 1 },
    { program: "aeroplan", ratio: 1 },
    { program: "united", ratio: 1 },
    { program: "flying-blue", ratio: 1 },
    { program: "avianca", ratio: 1 },
    { program: "british-airways", ratio: 1 },
    { program: "cathay", ratio: 1 },
    { program: "emirates", ratio: 1 },
    { program: "virgin-atlantic", ratio: 1 },
    { program: "southwest", ratio: 1 },
    { program: "hyatt", ratio: 1 },
    { program: "marriott", ratio: 1 },
    { program: "hilton", ratio: 1 },
    { program: "ihg", ratio: 1 },
    { program: "wyndham", ratio: 1 },
  ],
}

/** Map a card's `bonus_currency` free-text to a known transferable bank currency. */
export function currencyKey(bonusCurrency: string | undefined | null): CurrencyKey | null {
  const c = (bonusCurrency ?? "").toLowerCase()
  if (c.includes("membership rewards")) return "amex"
  if (c.includes("ultimate rewards")) return "chase"
  if (c.includes("thankyou") || c.includes("thank you")) return "citi"
  if (c.includes("capital one")) return "capone"
  if (c.includes("bilt")) return "bilt"
  return null
}

/** A card's resolved transfer partner with its DOLLAR value per bank point. */
export type ResolvedTransfer = { program: string; cpp: number }

/**
 * Resolve a card's effective transfer partners and per-program value.
 *
 *  - Known currency  → authoritative `CURRENCY_PARTNERS` set, cpp derived as
 *    ratio × program valuation. The card's inline list/max_transfer_cpp are
 *    ignored (they're the stale data this module replaces).
 *  - Unknown currency → fall back to the card's inline `transfer_partners`,
 *    resolved to slugs, all valued at the card's single `max_transfer_cpp`.
 *    Preserves behavior for synthetic/test cards and any future currency.
 *
 * A card is only transfer-capable if it carries a non-empty
 * `travel.transfer_partners` (the opt-in signal), so co-brand and
 * non-transferable cards on the same currency are never swept in.
 */
export function resolveTransfers(card: CreditCardBonus): ResolvedTransfer[] {
  const inline = card.travel?.transfer_partners
  if (!inline || inline.length === 0) return []

  const key = currencyKey(card.bonus_currency)
  if (key) {
    return CURRENCY_PARTNERS[key].map(t => ({
      program: t.program,
      cpp: t.ratio * programValueDollars(t.program),
    }))
  }

  const cpp = card.travel?.max_transfer_cpp ?? 0
  const seen = new Set<string>()
  const out: ResolvedTransfer[] = []
  for (const name of inline) {
    const slug = resolveProgramSlug(name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push({ program: slug, cpp })
  }
  return out
}

/** Best (highest) dollar-per-point value across a card's transfer partners. */
export function bestTransferCpp(card: CreditCardBonus): number {
  return resolveTransfers(card).reduce((max, t) => (t.cpp > max ? t.cpp : max), 0)
}
