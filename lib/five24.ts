// Chase 5/24 + card-velocity math.
//
// 5/24: Chase declines most cards if you've opened 5+ PERSONAL credit cards
// (across all issuers) in the last 24 months. Key rules encoded here:
//   - Only PERSONAL cards count. Business cards from most issuers (Chase Ink,
//     Amex/US Bank business, etc.) don't report to personal credit, so they're
//     excluded. (See the user's note: business Ink doesn't count.)
//   - A card counts for 24 months FROM ITS OPEN DATE, whether it's still open
//     or already closed. Closing a card does NOT remove it from 5/24.
//   - "Opened in the last 24 months" = open_date strictly after (asOf - 24mo).
//
// Pure + deterministic: the as-of date is always passed in.

export type Five24Card = {
  id?: string
  issuer?: string
  product_name?: string | null
  card_type: "personal" | "business"
  open_date: string // ISO YYYY-MM-DD
}

export type Five24Contributor = {
  id?: string
  issuer?: string
  product_name?: string | null
  open_date: string
  /** Date this card stops counting (open_date + 24 months). */
  falls_off: string
}

export type Five24Status = {
  count: number
  /** Chase will generally approve only when count < 5. */
  under_524: boolean
  /** How many more personal cards you can open before hitting 5/24. */
  slots_remaining: number
  contributors: Five24Contributor[]
  /** When `count` next drops (the soonest contributor falls off), or null. */
  next_slot_opens: string | null
}

function ym(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number)
  return { y, m, d }
}

/** Add `months` to an ISO date, clamping the day to the month's length. */
export function addMonths(iso: string, months: number): string {
  const { y, m, d } = ym(iso)
  const base = y * 12 + (m - 1) + months
  const ny = Math.floor(base / 12)
  const nm = (base % 12) + 1
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`
}

/** True when `a` is strictly before `b` (ISO dates compare lexically). */
function isBefore(a: string, b: string): boolean {
  return a < b
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Compute 5/24 status as of `asOf` (ISO date). Cards without a valid open date
 * or that aren't personal are ignored for the count.
 */
export function computeFive24(cards: Five24Card[], asOf: string, limit = 5): Five24Status {
  const cutoff = addMonths(asOf, -24) // cards opened on/before this no longer count
  const contributors: Five24Contributor[] = []

  for (const c of cards) {
    if (c.card_type !== "personal") continue
    if (!c.open_date || !ISO_DATE.test(c.open_date)) continue
    if (c.open_date > asOf) continue // opened in the future — ignore
    // Counts when opened strictly after the cutoff (within the last 24 months).
    if (isBefore(cutoff, c.open_date)) {
      contributors.push({
        id: c.id,
        issuer: c.issuer,
        product_name: c.product_name ?? null,
        open_date: c.open_date,
        falls_off: addMonths(c.open_date, 24),
      })
    }
  }

  contributors.sort((a, b) => (a.falls_off < b.falls_off ? -1 : a.falls_off > b.falls_off ? 1 : 0))
  const count = contributors.length
  const under_524 = count < limit
  const slots_remaining = Math.max(0, limit - count)

  // The count drops when the soonest contributor crosses 24 months. If already
  // under the limit, a slot is open now (null = no wait needed).
  let next_slot_opens: string | null = null
  if (!under_524 && contributors.length > 0) {
    // Need to drop to limit-1; that happens when the (count - limit + 1)th
    // soonest-to-fall-off card falls off. For the common count===limit case,
    // that's the soonest contributor.
    const idx = count - limit
    next_slot_opens = contributors[idx]?.falls_off ?? contributors[0].falls_off
  }

  return { count, under_524, slots_remaining, contributors, next_slot_opens }
}
