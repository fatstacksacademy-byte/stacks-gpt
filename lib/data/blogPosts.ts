import { bonuses } from "./bonuses"
import { savingsBonuses, practicalHoldDays } from "./savingsBonuses"
import { creditCardBonuses } from "./creditCardBonuses"
import { isBusinessBonus, isBrokerageBonus } from "./bonusCategories"

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: "Bank Bonuses" | "Savings Bonuses" | "Credit Cards" | "News"
  tags: string[]
  date: string // ISO date
  bonusId: string // references bonuses, savingsBonuses, or creditCardBonuses
  bonusType: "checking" | "savings" | "card"
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

// Generate checking bonus posts from bonuses.ts
const checkingPosts: BlogPost[] = bonuses
  .filter((b: any) => !b.expired)
  .map((b: any) => {
    const bankShort = b.bank_name.split("(")[0].trim()
    const isBusiness = !!b.business
    const hasTiers = Array.isArray(b.tiers) && b.tiers.length > 1
    const minTierAmount: number = hasTiers ? b.tiers[0].bonus : b.bonus_amount
    const maxTierAmount: number = b.bonus_amount
    const amountLabel = hasTiers
      ? `${formatMoney(minTierAmount)}–${formatMoney(maxTierAmount)}`
      : formatMoney(maxTierAmount)
    const accountLabel = isBusiness ? "Business Checking" : "Checking Account"
    const tags: string[] = ["Checking", "Bank Bonus"]
    if (isBusiness) tags.push("Business")
    if (b.requirements?.direct_deposit_required) tags.push("Direct Deposit")
    if (b.requirements?.debit_transactions_required) tags.push("Transaction Requirement")
    if (b.eligibility?.state_restricted) tags.push("Regional")
    else tags.push("Nationwide")
    if (b.screening?.chex_sensitive === "low") tags.push("Easy Approval")
    if (b.fees?.monthly_fee === 0) tags.push("No Monthly Fee")
    if (hasTiers) tags.push("Tiered Bonus")
    return {
      slug: slugify(`${bankShort}-${b.bonus_amount}-${isBusiness ? "business-" : ""}checking-bonus`),
      title: `${bankShort} ${amountLabel} ${accountLabel} Bonus (2026) - Review & Requirements`,
      excerpt: b.raw_excerpt || b.requirements?.other_requirements_text || "",
      category: "Bank Bonuses" as const,
      tags,
      date: "2026-04-10",
      bonusId: b.id,
      bonusType: "checking" as const,
    }
  })

// Generate savings/brokerage bonus posts from savingsBonuses.ts
const savingsPosts: BlogPost[] = savingsBonuses
  .filter(b => !b.expired)
  .map(b => {
    const bankShort = b.bank_name.split("(")[0].trim()
    const isBusiness = isBusinessBonus(b)
    const isBrokerage = isBrokerageBonus(b)
    const hasTiers = b.tiers.length > 1
    const minTier = b.tiers[0]
    const maxTier = b.tiers[b.tiers.length - 1]
    const amountLabel = hasTiers
      ? `${formatMoney(minTier.bonus_amount)}–${formatMoney(maxTier.bonus_amount)}`
      : formatMoney(maxTier.bonus_amount)
    const accountLabel = isBrokerage ? "Brokerage" : isBusiness ? "Business Savings" : "Savings"
    // Effective APY from lowest tier (most achievable)
    const holdDays = practicalHoldDays(b)
    const interest = minTier.min_deposit * b.base_apy * (holdDays / 365)
    const effApy = (((minTier.bonus_amount + interest) / minTier.min_deposit) * (365 / holdDays) * 100).toFixed(1)
    const tags: string[] = [accountLabel, "Bank Bonus", "Nationwide"]
    if (isBusiness) tags.push("Business")
    if (isBrokerage) tags.push("Brokerage")
    if (b.base_apy >= 0.03) tags.push("High Yield")
    if (b.fees.monthly_fee === 0) tags.push("No Monthly Fee")
    if (hasTiers) tags.push("Tiered Bonus")
    const slugSuffix = isBrokerage ? "brokerage-bonus" : isBusiness ? "business-savings-bonus" : "savings-bonus"
    return {
      slug: slugify(`${bankShort}-${maxTier.bonus_amount}-${slugSuffix}`),
      title: `${bankShort} ${amountLabel} ${accountLabel} Bonus (${effApy}% Effective APY) - 2026 Review`,
      excerpt: b.raw_excerpt || "",
      category: "Savings Bonuses" as const,
      tags,
      date: "2026-04-10",
      bonusId: b.id,
      bonusType: "savings" as const,
    }
  })

// Generate credit card posts from creditCardBonuses.ts (active only).
// Only cards with a real welcome offer get a "Sign-Up Bonus" page — skip $0-bonus
// cards (no-SUB everyday/store/secured cards) so they don't render broken "$0 after $0"
// stubs. Discover Cashback Match cards have bonus_amount=0 but a real offer, so they
// opt in via the cashback_match flag.
const cardPosts: BlogPost[] = creditCardBonuses
  .filter(c => !c.expired && ((c.bonus_amount ?? 0) > 0 || c.cashback_match))
  .map(c => {
    const tags: string[] = ["Credit Card", c.issuer.charAt(0).toUpperCase() + c.issuer.slice(1)]
    if (c.card_type === "business") tags.push("Business")
    else tags.push("Personal")
    if ((c.annual_fee ?? 0) === 0) tags.push("No Annual Fee")
    if ((c.statement_credits_year1 ?? 0) > 0) tags.push("Statement Credits")
    if (c.is_hotel_card) tags.push("Hotel")
    const bonusLabel = c.bonus_currency === "cash"
      ? `$${c.bonus_amount.toLocaleString()}`
      : `${c.bonus_amount.toLocaleString()} ${c.bonus_currency}`
    return {
      slug: slugify(`${c.card_name}-${c.bonus_amount}-${c.bonus_currency}`),
      title: `${c.card_name} — ${bonusLabel} Sign-Up Bonus (2026 Review)`,
      excerpt: c.key_benefits?.[0] || `Earn ${bonusLabel} after $${c.min_spend.toLocaleString()} in ${c.spend_months} months.`,
      category: "Credit Cards" as const,
      tags,
      date: "2026-04-19",
      bonusId: c.id,
      bonusType: "card" as const,
    }
  })

export const blogPosts: BlogPost[] = [...checkingPosts, ...savingsPosts, ...cardPosts]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

/** Reverse lookup: find the blog post for a given bonus or card id. */
export function getPostByBonusId(bonusId: string): BlogPost | undefined {
  return blogPosts.find(p => p.bonusId === bonusId)
}

export function getCheckingBonusById(id: string) {
  return bonuses.find((b: any) => b.id === id)
}

export function getSavingsBonusById(id: string) {
  return savingsBonuses.find(b => b.id === id)
}

export function getCardById(id: string) {
  return creditCardBonuses.find(c => c.id === id)
}
