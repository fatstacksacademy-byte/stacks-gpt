import { bonuses } from "./bonuses"
import { savingsBonuses } from "./savingsBonuses"

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: "Bank Bonuses" | "Savings Bonuses" | "Credit Cards" | "News"
  tags: string[]
  date: string // ISO date
  bonusId: string // references either bonuses or savingsBonuses
  bonusType: "checking" | "savings"
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
    return {
      slug: slugify(`${bankShort}-${b.bonus_amount}-checking-bonus`),
      title: `${bankShort} – ${amount} Checking Bonus`,
      excerpt: b.raw_excerpt || b.requirements?.other_requirements_text || "",
      category: "Bank Bonuses" as const,
      tags: ["Checking", "Nationwide", b.requirements?.direct_deposit_required ? "Direct Deposit" : ""].filter(Boolean),
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
    return {
      slug: slugify(`${bankShort}-${maxTier.bonus_amount}-savings-bonus`),
      title: `${bankShort} – ${amount} Savings Bonus`,
      excerpt: b.raw_excerpt || "",
      category: "Savings Bonuses" as const,
      tags: ["Savings", "Nationwide"],
      date: "2026-04-10",
      bonusId: b.id,
      bonusType: "savings" as const,
    }
  })

export const blogPosts: BlogPost[] = [...checkingPosts, ...savingsPosts]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}

export function getCheckingBonusById(id: string) {
  return bonuses.find((b: any) => b.id === id)
}

export function getSavingsBonusById(id: string) {
  return savingsBonuses.find(b => b.id === id)
}
