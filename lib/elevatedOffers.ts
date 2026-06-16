import type { CreditCardBonus } from "./data/creditCardBonuses"

/** True when a card's current bonus is an elevated/limited-time offer above its usual SUB. */
export function isElevated(c: Pick<CreditCardBonus, "elevated" | "bonus_amount">): boolean {
  return !!c.elevated && (c.bonus_amount ?? 0) > 0
}

function fmtBonus(amount: number, currency: string): string {
  return currency === "cash" ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} ${currency}`
}

/** "75,000 Ultimate Rewards" / "$200" — the card's normal offer, for "usually X" copy. Null if unknown. */
export function elevatedStandardLabel(c: CreditCardBonus): string | null {
  if (!isElevated(c) || c.standard_bonus_amount == null) return null
  return fmtBonus(c.standard_bonus_amount, c.bonus_currency)
}

/** "Aug 1, 2026" if a known end date, else null (treat as "limited time"). */
export function elevatedEndsLabel(c: CreditCardBonus): string | null {
  if (!c.elevated_ends) return null
  const d = new Date(c.elevated_ends)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** The link to send applicants to — the public elevated offer link if set, else the standard offer link. */
export function bestOfferLink(c: CreditCardBonus): string | undefined {
  return c.public_offer_link || c.offer_link
}
