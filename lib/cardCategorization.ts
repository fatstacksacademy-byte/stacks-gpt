/**
 * Detect whether a credit card is airline-loyalty-locked or hotel-loyalty-
 * locked. The Spending tab defaults to hiding these because their points
 * can't easily be redeemed as cash — and most users want a cashback /
 * transferable-points card unless they're specifically building airline or
 * hotel balances.
 *
 * Hotel detection is read off the catalog's `is_hotel_card` flag.
 *
 * Airline detection is name-based — the catalog's `bonus_currency` field
 * is too inconsistent (many RWP-imported cards bucket their currency as
 * generic "miles" even when it's actually Delta SkyMiles or AA AAdvantage).
 * The keyword match also runs against bonus_currency so things like
 * "United MileagePlus" still trip even if "United" doesn't show up in the
 * card_name.
 */

const AIRLINE_KEYWORDS = [
  // US carriers
  "delta", "american airlines", "aadvantage", "united", "mileageplus",
  "alaska airlines", "alaska mileage", "alaska atmos",
  "jetblue", "trueblue",
  "hawaiian", "frontier", "spirit", "allegiant", "sun country",
  // International / partner programs
  "aeroplan", "aer lingus", "british airways", "iberia", "avios",
  "air france", "klm", "flying blue",
  "avianca", "lifemiles",
  "singapore", "krisflyer",
  "cathay", "asia miles",
  "qantas", "emirates", "skywards", "etihad", "guest miles",
  "korean air", "skypass",
  "ana", "asiana", "lufthansa", "miles & more",
  // Train rewards (not airline strictly but same "loyalty-locked" trait)
  "amtrak guest rewards",
]

export function isAirlineCard(c: { card_name: string; bonus_currency: string }): boolean {
  const blob = `${c.card_name} ${c.bonus_currency}`.toLowerCase()
  return AIRLINE_KEYWORDS.some(kw => blob.includes(kw))
}

export function isAirlineOrHotelCard(c: { card_name: string; bonus_currency: string; is_hotel_card: boolean }): boolean {
  return c.is_hotel_card || isAirlineCard(c)
}

/**
 * Which redemption modes a card actually supports.
 *
 *   "cash"   — bonus pays out as cash, or points are redeemable as cash
 *              at >= 1¢ floor (transferable issuer points cash out at
 *              statement credit / Pay Yourself Back / Eraser at 1¢).
 *   "travel" — bonus is best redeemed through travel partners.
 *
 * Major issuer flexible-points programs (UR, MR, Capital One miles,
 * Citi ThankYou, BofA points, Wells Fargo Rewards) appear in BOTH —
 * they hold a cash floor AND transfer to travel partners. Loyalty-
 * locked currencies (specific airline / hotel programs) stay travel
 * only.
 *
 * This drives the Spending tab's cash / travel mode filter so a user
 * in cash mode sees Wells Fargo Autograph (cash + travel flexible)
 * but NOT Amex Hilton (hotel-locked) or AAdvantage (airline-locked).
 */
const FLEXIBLE_POINT_CURRENCIES = new Set([
  "Membership Rewards",
  "Ultimate Rewards",
  "ThankYou Points",
  "ThankYou",
  "Capital One miles",
  "BofA points",
  "Wells Fargo Rewards",
  "Points",  // generic fallback — assume flexible if unspecified
])

export type RedemptionMode = "cash" | "travel"

export function cardRedemptionModes(
  c: { card_name: string; bonus_currency: string; is_hotel_card: boolean },
): RedemptionMode[] {
  if (c.bonus_currency === "cash") return ["cash"]
  if (isAirlineOrHotelCard(c)) return ["travel"]
  if (FLEXIBLE_POINT_CURRENCIES.has(c.bonus_currency)) return ["cash", "travel"]
  // Unknown currency that isn't airline/hotel — be conservative and
  // mark travel-only so cash users don't see speculative entries.
  return ["travel"]
}
