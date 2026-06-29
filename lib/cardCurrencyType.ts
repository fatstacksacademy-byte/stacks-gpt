/**
 * Reward-currency classification + intro-promo detection.
 *
 * Why this exists: ranking cards "by dollars at 1¢/point" only works if you
 * exclude currencies where 1¢ overstates reality — airline & hotel co-brand
 * points (Marriott ~0.7¢, IHG ~0.5¢, United miles vary) and restricted
 * auto/brand points that only redeem on a vehicle. Some co-brand cards store a
 * generic `bonus_currency` of "Points"/"Miles", so currency alone isn't enough
 * — we also override on the card name.
 *
 * `cardCurrencyType()` is the single source of truth; every one of the 1,100+
 * catalog rows is classified deterministically (no per-row field to maintain),
 * but a row may set `reward_currency_type` to override the derivation.
 */
import type { CreditCardBonus } from "./data/creditCardBonuses"

export type RewardCurrencyType = "cash" | "flexible" | "fixed_value" | "airline" | "hotel" | "restricted"

/** Flexible bank points that transfer and reliably cash out near 1¢. */
const FLEXIBLE = new Set([
  "Membership Rewards", "Ultimate Rewards", "ThankYou Points", "ThankYou",
  "Capital One miles", "Wells Fargo Rewards", "Bilt Points",
])

/** Fixed-value bank/CU points that redeem at ~1¢ cash (no co-brand lock-in). */
const FIXED_VALUE = new Set([
  "points", "Points", "BofA points", "CURewards points", "CashPoints",
])

/** Named co-brand loyalty currencies. */
const HOTEL_CURRENCY = /hilton|honors|marriott|bonvoy|hyatt|ihg|wyndham|choice privileges/i
const AIRLINE_CURRENCY = /mileageplus|aadvantage|skymiles|trueblue|rapid ?rewards|lifemiles|priority miles|\bmiles\b/i

/** Co-brand / restricted detection by CARD NAME (catches generic-"Points" co-brands). */
const AIRLINE_NAME = /\bunited\b|iberia|hawaiian|aadvantage|american airlines|\bdelta\b|skymiles|southwest|jetblue|alaska air|avianca|lifemiles|frontier|spirit air|aeromexico|aer ?lingus|british airways|air france|\bklm\b|lufthansa|emirates|qatar|singapore air|turkish|copa air|aeroplan|air canada|sun country|allegiant|breeze|flying blue|avios|skypass|atmos|virgin atlantic|virgin red|\bvirgin\b|qantas|etihad|cathay/i
const HOTEL_NAME = /marriott|bonvoy|hilton|honors|hyatt|\bihg\b|holiday inn|wyndham|choice privileges|best western|radisson|sonesta|accor/i
const RESTRICTED_NAME = /\bford\b|\bgm\b|\bgmc\b|buick|cadillac|chevrolet|\bchevy\b|harley-?davidson|\bsubaru\b|\btoyota\b/i

/**
 * Classify a card's welcome-bonus currency. Name-based co-brand/restricted
 * matches win over the currency map (a "United" card stored as "Miles" is still
 * an airline card). `is_hotel_card` and an explicit `reward_currency_type`
 * override are both honored.
 */
export function cardCurrencyType(card: CreditCardBonus): RewardCurrencyType {
  if (card.reward_currency_type) return card.reward_currency_type
  const name = card.card_name || ""
  if (RESTRICTED_NAME.test(name)) return "restricted"
  if (AIRLINE_NAME.test(name)) return "airline"
  if (HOTEL_NAME.test(name) || card.is_hotel_card) return "hotel"

  const cur = card.bonus_currency || ""
  if (cur === "cash") return "cash"
  if (FLEXIBLE.has(cur)) return "flexible"
  if (FIXED_VALUE.has(cur)) return "fixed_value"
  if (HOTEL_CURRENCY.test(cur)) return "hotel"
  if (AIRLINE_CURRENCY.test(cur)) return "airline"
  // Unknown named currency → treat as fixed-value cash-equivalent (conservative).
  return "fixed_value"
}

/** Cash or cash-equivalent points — the only currencies where "value at 1¢" is honest. */
export function isCashEquivalent(card: CreditCardBonus): boolean {
  const t = cardCurrencyType(card)
  return t === "cash" || t === "flexible" || t === "fixed_value"
}

/**
 * Does this card advertise an INTRO promo reward rate (e.g. "5% for the first 6
 * months", "10x for the first 90 days")? Those inflate any ongoing-value model
 * that reads the headline multiplier as permanent — exclude/flag them for
 * "best keeper" rankings. APR-only intros ("0% intro APR for 12 months") do NOT
 * count, since they don't change the earn rate.
 */
export function isIntroPromoCard(card: CreditCardBonus): boolean {
  const texts = [...(card.key_benefits || []), ...((card.rewards || []).map((r) => r.note || ""))]
  return texts.some((t) =>
    /\d+\s*%|\b\d+x\b/i.test(t) &&
    /for the first \d+ (month|day|billing)|first \d+ (months|days|billing cycles)/i.test(t) &&
    !/\bapr\b/i.test(t)
  )
}
