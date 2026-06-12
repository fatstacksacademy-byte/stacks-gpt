/**
 * Award-travel finder logic.
 *
 * A fourth lens on the same catalog. Signup asks "biggest year-one payout",
 * spend asks "most rewards on my everyday dollars" — this asks "which card is
 * worth the most for *travel*", which is a different question because a travel
 * card's value lives in redemption (transfer partners) and hard-dollar perks
 * (travel credits, free-night certs, lounge access), not its earn rate.
 *
 * Cards carry these terms in `CreditCardBonus.travel`, which is sparse today
 * (fields are scaffolded, not yet populated). Everything here degrades to an
 * empty result set when no card has data, so the UI can ship now and light up
 * as the data is filled in.
 */
import type { CreditCardBonus, TravelValue } from "./creditCardBonuses"
import { resolveProgramSlug, findTransferProgram } from "./catalogTaxonomy"
import { resolveTransfers, bestTransferCpp, currencyKey } from "./transferPartners"

export type TravelMode = "perks" | "transfer"

/**
 * Conservative nominal values for non-dollar perks, so they can be folded into
 * a single comparable "annual travel value". Deliberately understated — a
 * Priority Pass retails ~$469 but most people don't use it that hard.
 */
export const LOUNGE_VALUE = 200
/** Global Entry is $120 every 5 years → ~$24/yr amortized. */
export const GLOBAL_ENTRY_ANNUAL = 24

/** Does this card have any usable travel data for the given lens? */
export function hasTravelValue(card: CreditCardBonus, mode: TravelMode): boolean {
  const t = card.travel
  if (!t) return false
  return mode === "transfer" ? bestTransferCpp(card) > 0 : travelPerkValue(t) > 0
}

/**
 * Hard-dollar annual value of a card's travel perks: travel credit + free-night
 * cert + nominal lounge + amortized Global Entry. Excludes transfer upside,
 * which is mode-specific (you only realize it if you redeem that way).
 */
export function travelPerkValue(t: TravelValue): number {
  let v = 0
  v += t.travel_credit ?? 0
  v += t.free_night_value ?? 0
  if (t.lounge_access) v += LOUNGE_VALUE
  if (t.global_entry_credit) v += GLOBAL_ENTRY_ANNUAL
  return v
}

/** Does this card transfer points into the given program (canonical slug)? */
export function cardTransfersTo(card: CreditCardBonus, programSlug: string): boolean {
  return resolveTransfers(card).some(t => t.program === programSlug)
}

/**
 * Dollar value of one of this card's points when transferred — into a specific
 * `program` if given, otherwise the card's best partner. Replaces reading the
 * single card-level `max_transfer_cpp` so a per-program view shows that
 * program's real worth (Hyatt ≠ Hilton) instead of one uniform number.
 */
export function travelTransferCpp(card: CreditCardBonus, program?: string): number {
  const resolved = resolveTransfers(card)
  if (program) return resolved.find(t => t.program === program)?.cpp ?? 0
  return resolved.reduce((max, t) => (t.cpp > max ? t.cpp : max), 0)
}

/**
 * Display labels for a card's transfer partners. Known currencies use canonical
 * program names ordered by value (or the selected program first); unknown
 * currencies fall back to the card's raw inline partner names in original order.
 */
function transferLabels(card: CreditCardBonus, program?: string): string[] {
  if (!currencyKey(card.bonus_currency)) {
    const seen = new Set<string>()
    const out: string[] = []
    for (const name of card.travel?.transfer_partners ?? []) {
      const slug = resolveProgramSlug(name)
      if (slug && seen.has(slug)) continue
      if (slug) seen.add(slug)
      out.push(name)
    }
    return out
  }
  const resolved = [...resolveTransfers(card)].sort((a, b) => b.cpp - a.cpp)
  if (program) {
    const i = resolved.findIndex(t => t.program === program)
    if (i > 0) resolved.unshift(resolved.splice(i, 1)[0])
  }
  return resolved.map(t => findTransferProgram(t.program)?.name ?? t.program)
}

/**
 * Rank cards for an award-travel use case.
 *  - perks:    highest annual hard-dollar travel value first; ties by transfer cpp.
 *  - transfer: best transfer-partner redemption (cpp) first; ties by perk value.
 *
 * `program` (transfer mode only): when set to a canonical program slug, keep
 * only cards that transfer into that currency — for users collecting a specific
 * loyalty program rather than browsing all transferable cards.
 */
export function rankByTravelValue(
  cards: CreditCardBonus[],
  mode: TravelMode,
  program?: string,
): CreditCardBonus[] {
  return cards
    .filter(c => !c.expired && hasTravelValue(c, mode))
    .filter(c => !(mode === "transfer" && program) || cardTransfersTo(c, program!))
    .sort((a, b) => {
      if (mode === "transfer") {
        // Rank by value into the chosen program (or best partner if browsing all).
        const ac = travelTransferCpp(a, program)
        const bc = travelTransferCpp(b, program)
        if (ac !== bc) return bc - ac
        return travelPerkValue(b.travel!) - travelPerkValue(a.travel!)
      }
      const ap = travelPerkValue(a.travel!)
      const bp = travelPerkValue(b.travel!)
      if (ap !== bp) return bp - ap
      return bestTransferCpp(b) - bestTransferCpp(a)
    })
}

/** Human-readable summary of a card's travel value for the chosen lens. */
export function travelSummary(card: CreditCardBonus, mode: TravelMode, program?: string): string {
  const t = card.travel
  if (!t) return "No travel data"

  if (mode === "transfer") {
    const cpp = travelTransferCpp(card, program)
    const labels = transferLabels(card, program)
    if (!labels.length || !cpp) return "No transfer partners"
    const cppStr = `${(cpp * 100).toFixed(1)}¢/pt`
    const head = labels.slice(0, 3).join(", ")
    const more = labels.length > 3 ? ` +${labels.length - 3} more` : ""
    return program
      ? `${cppStr} to ${head}${more}`
      : `up to ${cppStr} · transfers to ${head}${more}`
  }

  const bits: string[] = []
  if (t.travel_credit) bits.push(`$${t.travel_credit} travel credit`)
  if (t.free_night_value) bits.push(`$${t.free_night_value} free night`)
  if (t.lounge_access) bits.push("lounge access")
  if (t.global_entry_credit) bits.push("Global Entry")
  if (t.no_foreign_tx_fee) bits.push("no FX fees")
  return bits.length ? bits.join(" · ") : "No travel perks"
}
