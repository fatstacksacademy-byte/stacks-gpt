import { bonuses } from "./bonuses"
import { savingsBonuses } from "./savingsBonuses"
import { creditCardBonuses } from "./creditCardBonuses"

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
    const amount = formatMoney(b.bonus_amount)
    // Build tags based on bonus characteristics
    const tags: string[] = ["Checking", "Bank Bonus"]
    if (b.requirements?.direct_deposit_required) tags.push("Direct Deposit")
    if (b.requirements?.debit_transactions_required) tags.push("Transaction Requirement")
    if (b.eligibility?.state_restricted) tags.push("Regional")
    else tags.push("Nationwide")
    if (b.screening?.chex_sensitive === "low") tags.push("Easy Approval")
    if (b.fees?.monthly_fee === 0) tags.push("No Monthly Fee")
    return {
      slug: slugify(`${bankShort}-${b.bonus_amount}-checking-bonus`),
      title: `${bankShort} ${amount} Checking Account Bonus (2026) - Review & Requirements`,
      excerpt: b.raw_excerpt || b.requirements?.other_requirements_text || "",
      category: "Bank Bonuses" as const,
      tags,
      date: "2026-04-10",
      bonusId: b.id,
      bonusType: "checking" as const,
    }
  })

// Generate savings bonus posts from savingsBonuses.ts
const savingsPosts: BlogPost[] = savingsBonuses
  .filter(b => !b.expired)
  .map(b => {
    const bankShort = b.bank_name.split("(")[0].trim()
    const maxTier = b.tiers[b.tiers.length - 1]
    const amount = formatMoney(maxTier.bonus_amount)
    // Calculate best effective APY for tags
    const minTier = b.tiers[0]
    const interest = minTier.min_deposit * b.base_apy * (b.total_hold_days / 365)
    const effApy = (((minTier.bonus_amount + interest) / minTier.min_deposit) * (365 / b.total_hold_days) * 100).toFixed(1)
    const tags: string[] = ["Savings", "Bank Bonus", "Nationwide"]
    if (b.base_apy >= 0.03) tags.push("High Yield")
    if (b.fees.monthly_fee === 0) tags.push("No Monthly Fee")
    if (b.tiers.length > 1) tags.push("Tiered Bonus")
    return {
      slug: slugify(`${bankShort}-${maxTier.bonus_amount}-savings-bonus`),
      title: `${bankShort} ${amount} Savings Bonus (${effApy}% Effective APY) - 2026 Review`,
      excerpt: b.raw_excerpt || "",
      category: "Savings Bonuses" as const,
      tags,
      date: "2026-04-10",
      bonusId: b.id,
      bonusType: "savings" as const,
    }
  })

// Generate credit card posts from creditCardBonuses.ts (active only).
const cardPosts: BlogPost[] = creditCardBonuses
  .filter(c => !c.expired)
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
