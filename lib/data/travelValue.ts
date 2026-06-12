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
  return mode === "transfer"
    ? (t.transfer_partners?.length ?? 0) > 0 && (t.max_transfer_cpp ?? 0) > 0
    : travelPerkValue(t) > 0
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

/**
 * Rank cards for an award-travel use case.
 *  - perks:    highest annual hard-dollar travel value first; ties by transfer cpp.
 *  - transfer: best transfer-partner redemption (cpp) first; ties by perk value.
 */
export function rankByTravelValue(cards: CreditCardBonus[], mode: TravelMode): CreditCardBonus[] {
  return cards
    .filter(c => !c.expired && hasTravelValue(c, mode))
    .sort((a, b) => {
      const at = a.travel!
      const bt = b.travel!
      if (mode === "transfer") {
        const ac = at.max_transfer_cpp ?? 0
        const bc = bt.max_transfer_cpp ?? 0
        if (ac !== bc) return bc - ac
        return travelPerkValue(bt) - travelPerkValue(at)
      }
      const ap = travelPerkValue(at)
      const bp = travelPerkValue(bt)
      if (ap !== bp) return bp - ap
      return (bt.max_transfer_cpp ?? 0) - (at.max_transfer_cpp ?? 0)
    })
}

/** Human-readable summary of a card's travel value for the chosen lens. */
export function travelSummary(card: CreditCardBonus, mode: TravelMode): string {
  const t = card.travel
  if (!t) return "No travel data"

  if (mode === "transfer") {
    const partners = t.transfer_partners ?? []
    if (!partners.length || !(t.max_transfer_cpp ?? 0)) return "No transfer partners"
    const cpp = `${((t.max_transfer_cpp ?? 0) * 100).toFixed(1)}¢/pt`
    const head = partners.slice(0, 3).join(", ")
    const more = partners.length > 3 ? ` +${partners.length - 3} more` : ""
    return `up to ${cpp} · transfers to ${head}${more}`
  }

  const bits: string[] = []
  if (t.travel_credit) bits.push(`$${t.travel_credit} travel credit`)
  if (t.free_night_value) bits.push(`$${t.free_night_value} free night`)
  if (t.lounge_access) bits.push("lounge access")
  if (t.global_entry_credit) bits.push("Global Entry")
  if (t.no_foreign_tx_fee) bits.push("no FX fees")
  return bits.length ? bits.join(" · ") : "No travel perks"
}
