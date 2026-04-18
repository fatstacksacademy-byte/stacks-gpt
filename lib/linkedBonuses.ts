import { bonuses } from "./data/bonuses"
import { savingsBonuses } from "./data/savingsBonuses"

/**
 * Curated list of bonuses that can be opened at the same institution at
 * the same time for extra earnings. The pairs are bidirectional — if you
 * look up either ID, the helper returns the other(s).
 *
 * Keep this list small and high-quality. Each entry here means "yes, Chase
 * lets you open checking and savings simultaneously with both bonuses,"
 * not "Chase has a checking and a savings offer." The distinction matters
 * for UX — we're only surfacing these when they truly stack.
 */
export const LINKED_BONUS_GROUPS: string[][] = [
  // Chase Total Checking + Chase Savings combo — explicit combo offer
  ["chase-total-checking-400-2026", "chase-savings-combo-2026"],
  // Capital One 360 Checking + 360 Savings — dual-product account opening
  ["capital-one-360-checking-300-offer300", "capital-one-360-savings-2026"],
  // Citi checking + savings — dual relationship with bonuses on each
  ["citi-regular-checking-325-edd-2026", "citi-savings-2026"],
  // HSBC Premier checking + savings — Premier relationship bundles them
  ["hsbc-premier-checking-2026", "hsbc-premier-savings-2026"],
  // Wells Fargo Everyday Checking + Platinum Savings — common branch bundle
  ["wells-fargo-400-everyday-checking-2026", "wells-fargo-platinum-savings-2026"],
]

export type LinkedBonus =
  | { kind: "checking"; entry: (typeof bonuses)[number] }
  | { kind: "savings"; entry: (typeof savingsBonuses)[number] }

function findEntry(id: string): LinkedBonus | null {
  const cc = bonuses.find((b) => b.id === id)
  if (cc) return { kind: "checking", entry: cc }
  const sv = savingsBonuses.find((b) => b.id === id)
  if (sv) return { kind: "savings", entry: sv }
  return null
}

/**
 * Returns all linked bonuses for a given bonus ID (excluding the source bonus itself).
 * Filters out expired linked bonuses.
 */
export function getLinkedBonuses(id: string): LinkedBonus[] {
  const group = LINKED_BONUS_GROUPS.find((g) => g.includes(id))
  if (!group) return []
  return group
    .filter((lid) => lid !== id)
    .map(findEntry)
    .filter((x): x is LinkedBonus => x !== null)
    .filter((lb) => {
      const expired = (lb.entry as { expired?: boolean }).expired
      return !expired
    })
}

/**
 * Returns all linked-bonus groups where at least one member is non-expired.
 * Used on the hub to surface "best combos available now."
 */
export function getActiveCombos(): { ids: string[]; members: LinkedBonus[] }[] {
  return LINKED_BONUS_GROUPS.map((group) => {
    const members = group
      .map(findEntry)
      .filter((x): x is LinkedBonus => x !== null)
      .filter((lb) => !(lb.entry as { expired?: boolean }).expired)
    return { ids: group, members }
  }).filter((g) => g.members.length >= 2)
}

/**
 * Sum bonus amounts across all members of a combo group.
 */
export function getComboTotal(members: LinkedBonus[]): number {
  return members.reduce((sum, m) => {
    if (m.kind === "checking") return sum + (m.entry.bonus_amount ?? 0)
    // savings bonus has tiers; we report the top tier as the upside
    const top = (m.entry.tiers ?? [])[m.entry.tiers?.length ? m.entry.tiers.length - 1 : 0]
    return sum + (top?.bonus_amount ?? 0)
  }, 0)
}
