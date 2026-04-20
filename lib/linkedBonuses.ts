import { bonuses } from "./data/bonuses"
import { savingsBonuses } from "./data/savingsBonuses"

/**
 * Curated list of bonuses that can be opened at the same institution at
 * the same time for extra earnings. Each entry is a combo group.
 *
 * `overrides` lets us capture combo-only pricing: e.g., Chase's standalone
 * checking pays $400, but when opened via the checking+savings combo URL
 * the checking portion is only $300 (the combo URL has a different offer
 * structure). Without overrides, the combo UI would show "$1,000 combo"
 * when the real combo total is $900.
 *
 * Keep this list small and high-quality — only add a group when both
 * offers can genuinely be opened together and credited together.
 */
export type LinkedBonusGroup = {
  ids: string[]
  /** Per-member combo-specific pricing. Keyed by bonus id. */
  overrides?: Record<string, { bonus_amount?: number; note?: string }>
  /** URL the user should actually visit to start the combo (overrides member source_links for CombosStrip). */
  combo_url?: string
}

export const LINKED_BONUS_GROUPS: LinkedBonusGroup[] = [
  // Chase checking+savings combo — opened via the combo URL, the CHECKING
  // portion pays $300 (not the $400 standalone). Savings pays $200 base
  // plus a $400 combo-completion bonus (already reflected in the savings
  // entry's top tier at $600).
  {
    ids: ["chase-total-checking-400-2026", "chase-savings-combo-2026"],
    overrides: {
      "chase-total-checking-400-2026": {
        bonus_amount: 300,
        note: "Combo pricing: $300 checking (vs. $400 standalone). Opened via the combo URL.",
      },
    },
    combo_url: "https://account.chase.com/consumer/banking/checkingandsavingsoffer",
  },
  // Capital One 360 Checking + 360 Savings — dual-product account opening
  { ids: ["capital-one-360-checking-300-offer300", "capital-one-360-savings-2026"] },
  // (Citi combo removed — "citi-savings-2026" is actually the same checking
  // offer as citi-regular-checking-325-edd-2026, so pairing them double-counts.)
  // HSBC Premier checking + savings — Premier relationship bundles them
  { ids: ["hsbc-premier-checking-2026", "hsbc-premier-savings-2026"] },
  // Wells Fargo Everyday Checking + Platinum Savings — common branch bundle
  { ids: ["wells-fargo-400-everyday-checking-2026", "wells-fargo-platinum-savings-2026"] },
]

export type LinkedBonus =
  | {
      kind: "checking"
      entry: (typeof bonuses)[number]
      effective_bonus_amount: number
      override_note?: string
    }
  | {
      kind: "savings"
      entry: (typeof savingsBonuses)[number]
      effective_bonus_amount: number
      override_note?: string
    }

function materialize(
  id: string,
  group: LinkedBonusGroup,
): LinkedBonus | null {
  const override = group.overrides?.[id]
  const cc = bonuses.find((b) => b.id === id)
  if (cc) {
    return {
      kind: "checking",
      entry: cc,
      effective_bonus_amount: override?.bonus_amount ?? cc.bonus_amount ?? 0,
      override_note: override?.note,
    }
  }
  const sv = savingsBonuses.find((b) => b.id === id)
  if (sv) {
    const topTier = (sv.tiers ?? [])[sv.tiers?.length ? sv.tiers.length - 1 : 0]
    return {
      kind: "savings",
      entry: sv,
      effective_bonus_amount: override?.bonus_amount ?? topTier?.bonus_amount ?? 0,
      override_note: override?.note,
    }
  }
  return null
}

/**
 * Returns all linked bonuses for a given bonus ID (excluding the source).
 * Filters out expired members. Each returned lead carries the effective
 * combo pricing (`effective_bonus_amount`) so the UI can show the right
 * number without recomputing overrides.
 */
export function getLinkedBonuses(id: string): LinkedBonus[] {
  const group = LINKED_BONUS_GROUPS.find((g) => g.ids.includes(id))
  if (!group) return []
  return group.ids
    .filter((lid) => lid !== id)
    .map((lid) => materialize(lid, group))
    .filter((x): x is LinkedBonus => x !== null)
    .filter((lb) => !(lb.entry as { expired?: boolean }).expired)
}

/** All groups where at least 2 members are non-expired. */
export function getActiveCombos(): {
  group: LinkedBonusGroup
  members: LinkedBonus[]
}[] {
  return LINKED_BONUS_GROUPS.map((group) => {
    const members = group.ids
      .map((id) => materialize(id, group))
      .filter((x): x is LinkedBonus => x !== null)
      .filter((lb) => !(lb.entry as { expired?: boolean }).expired)
    return { group, members }
  }).filter((g) => g.members.length >= 2)
}

/**
 * Sum effective (override-aware) bonus amounts across all members.
 * This is what the user will actually be paid if they complete the combo.
 */
export function getComboTotal(members: LinkedBonus[]): number {
  return members.reduce((sum, m) => sum + m.effective_bonus_amount, 0)
}

/**
 * Get full combo context for a single bonus id — useful for the combo
 * toggle on paycheck + savings hero cards. Returns null when the bonus
 * isn't part of any combo (or when its partners are expired).
 */
export function getComboFor(id: string): {
  combo_url?: string
  partners: LinkedBonus[]           // the OTHER members, not including `id`
  selfOverride?: { bonus_amount?: number; note?: string }
  selfEffectiveAmount: number       // what the `id` member is worth in combo pricing
  comboTotal: number                // sum across all members (incl. self)
} | null {
  const group = LINKED_BONUS_GROUPS.find((g) => g.ids.includes(id))
  if (!group) return null
  const allMembers = group.ids
    .map((lid) => materialize(lid, group))
    .filter((x): x is LinkedBonus => x !== null)
    .filter((lb) => !(lb.entry as { expired?: boolean }).expired)
  if (allMembers.length < 2) return null
  const self = allMembers.find((m) => {
    const entryId = (m.entry as { id?: string }).id
    return entryId === id
  })
  if (!self) return null
  const partners = allMembers.filter((m) => {
    const entryId = (m.entry as { id?: string }).id
    return entryId !== id
  })
  return {
    combo_url: group.combo_url,
    partners,
    selfOverride: group.overrides?.[id],
    selfEffectiveAmount: self.effective_bonus_amount,
    comboTotal: getComboTotal(allMembers),
  }
}
