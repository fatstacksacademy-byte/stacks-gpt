import { bonuses } from "./bonuses"
import { savingsBonuses, practicalHoldDays } from "./savingsBonuses"

export type Category = "personal-checking" | "personal-savings" | "business" | "brokerage"

function blob(b: any): string {
  return JSON.stringify(b).toLowerCase()
}

export function isBusinessBonus(b: any): boolean {
  return /business checking|biz checking|business advantage|business banking|business account|business savings|innovator business/.test(blob(b))
}

export function isBrokerageBonus(b: any): boolean {
  const name = (b.bank_name || "").toLowerCase()
  const id = (b.id || "").toLowerCase()
  if (/brokerage|invest |m1 finance|public\.com|tastytrade|moomoo|wealthfront|betterment|robinhood|webull|firstrade/.test(name)) return true
  if (/brokerage|sofi-invest|tastytrade|moomoo|merrill-edge|schwab-brokerage|etrade-brokerage|public-brokerage|robinhood/.test(id)) return true
  return false
}

export function categorize(b: any): Category {
  if (isBrokerageBonus(b)) return "brokerage"
  if (isBusinessBonus(b)) return "business"
  return "personal-checking"
}

function isLive(b: any): boolean {
  if (b.expired) return false
  const exp = b.expiration_date || b.offer_expiration || b.requirements?.expiration_date
  if (!exp) return true
  try { return new Date(exp) >= new Date() } catch { return true }
}

function isNationwide(b: { eligibility?: { state_restricted?: boolean } }): boolean {
  return b.eligibility?.state_restricted !== true
}

export function getCategorizedBonuses() {
  // Public ranking tables stay nationwide. State-restricted bonuses are
  // available through the email-gated state catalog instead of leaking into
  // the same static lists for every visitor.
  const liveChecking = bonuses.filter(isLive).filter(isNationwide)
  const liveSavings = savingsBonuses.filter(isLive).filter(isNationwide)

  const personalChecking = liveChecking
    .filter(b => !isBusinessBonus(b) && !isBrokerageBonus(b))
    .sort((a, b) => (b.bonus_amount || 0) - (a.bonus_amount || 0))

  const businessChecking = liveChecking
    .filter(b => isBusinessBonus(b))
    .sort((a, b) => (b.bonus_amount || 0) - (a.bonus_amount || 0))

  const personalSavings = liveSavings
    .filter(b => !isBusinessBonus(b) && !isBrokerageBonus(b))
    .map(b => ({ bonus: b, effApy: effectiveApy(b) }))
    .sort((a, b) => b.effApy - a.effApy)

  const businessSavings = liveSavings
    .filter(b => isBusinessBonus(b))
    .map(b => ({ bonus: b, effApy: effectiveApy(b) }))
    .sort((a, b) => b.effApy - a.effApy)

  const brokerage = liveSavings
    .filter(b => isBrokerageBonus(b))
    .map(b => ({ bonus: b, effApy: effectiveApy(b) }))
    .sort((a, b) => b.effApy - a.effApy)

  return { personalChecking, personalSavings, businessChecking, businessSavings, brokerage }
}

export function effectiveApy(savingsBonus: any): number {
  const t = savingsBonus.tiers[0]
  const holdDays = practicalHoldDays(savingsBonus)
  const interest = t.min_deposit * savingsBonus.base_apy * (holdDays / 365)
  return ((t.bonus_amount + interest) / t.min_deposit) * (365 / holdDays) * 100
}

export function shortBankName(b: any): string {
  return (b.bank_name || "").split("(")[0].trim()
}
