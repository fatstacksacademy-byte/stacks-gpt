/**
 * Suppress leads that exactly match a live catalog entry.
 *
 * Why: the in-run dedupe (dedupe.ts) only catches duplicates *within the
 * current batch* — it doesn't know about lib/data/bonuses.ts. Leads like
 * "HSBC Premier Checking Bonus $5000" kept showing up as "new" even
 * though hsbc-premier-checking-2026 was already in the catalog.
 *
 * Match heuristic:
 *   - Bank tokens overlap (first-word or substring after normalization).
 *     Catches "HSBC" vs "HSBC Premier Checking Bonus" and
 *     "Citadel Credit Union" vs "Citadel Credit Union" (which normalize
 *     identically because the suffix gets stripped).
 *   - Product type compatible: lead title contains "checking" → only
 *     match catalog rows where product_type === "checking" (same for
 *     "savings"). Stops cross-product false-positives.
 *   - Bonus amount buckets to the same $25-step (existing leadKey
 *     convention). Different amounts mean a different offer tier (or a
 *     genuine revision worth surfacing), so we keep them.
 *   - Skip catalog rows already marked expired — those are exactly the
 *     ones a refresh lead is supposed to replace.
 */
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses, type SavingsBonus } from "../../lib/data/savingsBonuses"
import { normalizeBankName } from "./dedupe"
import type { Lead } from "./types"

type CatalogEntry = {
  id: string
  bank_name: string
  product_type: string
  bonus_amount: number | null
  expired?: boolean
}

// Savings bonuses use tiered amounts. Flatten to the max-tier amount
// for matching — the headline figure is the one a discovery lead is
// most likely to extract from a blog title.
function flattenSavings(s: SavingsBonus): CatalogEntry {
  const maxAmount = s.tiers.reduce((max, t) => Math.max(max, t.bonus_amount), 0)
  return {
    id: s.id,
    bank_name: s.bank_name,
    product_type: s.product_type,
    bonus_amount: maxAmount || null,
    expired: s.expired,
  }
}

const LIVE_CATALOG: CatalogEntry[] = [
  ...(bonuses as CatalogEntry[]),
  ...savingsBonuses.map(flattenSavings),
]

function bucketAmount(n: number | null | undefined): string {
  if (n === null || n === undefined) return "x"
  return String(Math.round(n / 25) * 25)
}

export function matchesLiveCatalog(lead: Lead): { id: string } | null {
  const leadBank = normalizeBankName(lead.bank)
  if (!leadBank) return null
  const leadTokens = leadBank.split(" ").filter(Boolean)
  if (leadTokens.length === 0) return null

  const productText = `${lead.product} ${lead.bank}`.toLowerCase()
  const isChecking = /\bchecking\b/.test(productText)
  const isSavings = /\bsavings\b/.test(productText)
  const isBrokerage = /\b(brokerage|invest(?:ing)?)\b/.test(productText)

  const leadBucket = bucketAmount(lead.bonus_amount)

  for (const c of LIVE_CATALOG) {
    if (c.expired) continue
    const catBank = normalizeBankName(c.bank_name)
    if (!catBank) continue

    // Bank match: tokens must overlap. Either the catalog bank is a
    // prefix/substring of the lead bank, or vice versa, or they share
    // the first token (common when the lead is "BankName Promotions").
    const catTokens = catBank.split(" ").filter(Boolean)
    const tokenOverlap =
      catBank === leadBank ||
      catBank.includes(leadBank) ||
      leadBank.includes(catBank) ||
      catTokens[0] === leadTokens[0]
    if (!tokenOverlap) continue

    // Product type compatible. If the lead clearly mentions a category
    // and the catalog row's type disagrees, skip — don't cross-match
    // a checking lead to a savings catalog entry.
    if (isChecking && c.product_type !== "checking") continue
    if (isSavings && c.product_type !== "savings") continue
    if (isBrokerage && c.product_type !== "brokerage") continue

    // Same amount bucket → genuine duplicate.
    if (bucketAmount(c.bonus_amount) !== leadBucket) continue

    return { id: c.id }
  }
  return null
}
