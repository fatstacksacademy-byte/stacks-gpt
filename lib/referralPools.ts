/**
 * Rotating referral-link pools.
 *
 * Each Chase business refer-a-friend link caps at ~200k bonus points/year, so
 * funneling every click to one link wastes the others' headroom. /go picks a
 * live link from the pool at click time (even random spread, stateless) and the
 * click registry logs which one (link_label) — so you can watch per-link usage
 * and retire a link as it nears its cap (set `retired: true` to pull it).
 *
 * The 200k cap is on APPROVED referrals (points earned), not clicks — so clicks
 * are a proxy. Retire a link based on what Chase actually shows you, or set
 * `retired: true` here and it drops out of rotation immediately.
 *
 * To add a link: paste a `{ label, url }` into the pool. To retire one: add
 * `retired: true` (keep it for the click-history record).
 */
export type PooledLink = { label: string; url: string; retired?: boolean }

export const referralPools: Record<string, PooledLink[]> = {
  // All Chase business Ink + Sapphire Reserve Business cards share this pool —
  // one referyourchasecard.com link works for any of them.
  "chase-business": [
    { label: "21g-2XCDJ70WA6", url: "https://www.referyourchasecard.com/21g/2XCDJ70WA6" },
    // Add your other live Chase business referral links here to spread the cap:
    // { label: "21x-XXXXXXXXXX", url: "https://www.referyourchasecard.com/21x/XXXXXXXXXX" },
  ],
}

/** Which bonus ids draw their apply link from which pool. */
export const poolForBonus: Record<string, string> = {
  "chase-ink-business-preferred-100k": "chase-business",
  "chase-chase-ink-business-cash-rwp": "chase-business",
  "chase-chase-ink-business-unlimited-rwp": "chase-business",
  "chase-chase-ink-business-premier-rwp": "chase-business",
  "chase-chase-sapphire-reserve-business-rwp": "chase-business",
}

/** Pick a live link from the bonus's pool, or null if none applies. Even random spread. */
export function pickPooledLink(bonusId: string): PooledLink | null {
  const poolKey = poolForBonus[bonusId]
  const pool = poolKey ? referralPools[poolKey] : undefined
  if (!pool) return null
  const live = pool.filter((l) => !l.retired && l.url)
  if (live.length === 0) return null
  return live[Math.floor(Math.random() * live.length)]
}
