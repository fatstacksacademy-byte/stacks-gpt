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
import { resolveTransfers, bestTransferCpp, currencyKey, currencyTransferCpp, poolHint } from "./transferPartners"

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
export function travelPerkValue(t: TravelValue | undefined | null): number {
  if (!t) return 0
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
 * How a card reaches a transfer program:
 *  - "direct":   the card itself transfers there (premium/opt-in card).
 *  - "indirect": the card EARNS a currency that reaches the program, but didn't
 *                opt into transfers — its points get there only when pooled into
 *                a premium card of the same currency (e.g. no-fee Chase Inks →
 *                Hyatt via a Sapphire/Ink Preferred).
 *  - null:       the card can't reach the program at all.
 */
export function transferKind(card: CreditCardBonus, programSlug: string): "direct" | "indirect" | null {
  if (cardTransfersTo(card, programSlug)) return "direct"
  if (currencyTransferCpp(card.bonus_currency, programSlug) > 0) return "indirect"
  return null
}

/**
 * Dollar value of one of this card's points when transferred — into a specific
 * `program` if given, otherwise the card's best partner. Replaces reading the
 * single card-level `max_transfer_cpp` so a per-program view shows that
 * program's real worth (Hyatt ≠ Hilton) instead of one uniform number.
 */
export function travelTransferCpp(card: CreditCardBonus, program?: string): number {
  const resolved = resolveTransfers(card)
  if (program) {
    // Direct transfer if the card opted in; otherwise fall back to the value
    // its currency fetches once pooled (indirect). Same per-point worth — the
    // only difference is you need a premium card on hand to move the points.
    const direct = resolved.find(t => t.program === program)?.cpp
    return direct ?? currencyTransferCpp(card.bonus_currency, program)
  }
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
 * cards that reach that program — directly (own transfer partners) or
 * indirectly (earns the currency, pooled into a premium card). Indirect cards
 * always rank below direct ones so the "just apply and transfer" picks lead.
 */
export function rankByTravelValue(
  cards: CreditCardBonus[],
  mode: TravelMode,
  program?: string,
): CreditCardBonus[] {
  // With a program selected, transfer mode admits indirect earners too, so we
  // can't pre-filter on hasTravelValue (indirect cards have no travel block).
  let filtered: CreditCardBonus[]
  if (mode === "transfer" && program) {
    filtered = cards.filter(c => !c.expired && transferKind(c, program) !== null)
    // A card that transfers directly shouldn't ALSO show up as an indirect
    // "pool to transfer" row. This happens with duplicate catalog entries where
    // one twin carries transfer_partners and the other doesn't — suppress the
    // indirect twin so the same card isn't listed twice with conflicting advice.
    const directNames = new Set(
      filtered.filter(c => cardTransfersTo(c, program)).map(c => c.card_name),
    )
    filtered = filtered.filter(c => cardTransfersTo(c, program) || !directNames.has(c.card_name))
  } else {
    filtered = cards.filter(c => !c.expired && hasTravelValue(c, mode))
  }

  return filtered.sort((a, b) => {
    if (mode === "transfer") {
      if (program) {
        // Direct picks first, then by per-point value into the chosen program.
        const ad = cardTransfersTo(a, program) ? 1 : 0
        const bd = cardTransfersTo(b, program) ? 1 : 0
        if (ad !== bd) return bd - ad
      }
      const ac = travelTransferCpp(a, program)
      const bc = travelTransferCpp(b, program)
      if (ac !== bc) return bc - ac
      return travelPerkValue(b.travel) - travelPerkValue(a.travel)
    }
    const ap = travelPerkValue(a.travel)
    const bp = travelPerkValue(b.travel)
    if (ap !== bp) return bp - ap
    return bestTransferCpp(b) - bestTransferCpp(a)
  })
}

/** Human-readable summary of a card's travel value for the chosen lens. */
export function travelSummary(card: CreditCardBonus, mode: TravelMode, program?: string): string {
  // Indirect transfer earner: no own transfer partners, but its currency reaches
  // the selected program once pooled into a premium card. Handle before the
  // no-travel-data guard, since these cards carry no `travel` block.
  if (mode === "transfer" && program && transferKind(card, program) === "indirect") {
    const cpp = currencyTransferCpp(card.bonus_currency, program)
    const programName = findTransferProgram(program)?.name ?? program
    const via = poolHint(card.bonus_currency) ?? "a premium card on the same points"
    return `${(cpp * 100).toFixed(1)}¢/pt to ${programName} when pooled into ${via}`
  }

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
