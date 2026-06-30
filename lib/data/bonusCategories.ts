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

/**
 * All live business bank bonuses, split the same way the rest of the site
 * gates: `nationwide` offers anyone can open (shown free, good for SEO) and
 * `regional` state-restricted ones (revealed behind the email gate). Both are
 * ranked by effective APY and derived from the catalog, so this stays current
 * automatically as `savingsBonuses` changes.
 */
/**
 * Business checking bonuses live in the main `bonuses` catalog (balance +
 * transaction offers like PNC $400), while balance-only ones live in
 * `savingsBonuses`. The business page ranks everything by effective APY, which
 * needs the savings shape (tiers of {min_deposit, bonus_amount} + total_hold_days),
 * so reshape a checking-catalog business bonus into that form: park-cash = its
 * required maintained balance, hold = must-remain-open days.
 */
function normalizeBizChecking(b: any) {
  const minBal =
    b.requirements?.min_balance ??
    b.tiers?.[0]?.min_balance ??
    b.tiers?.[0]?.min_dd_total ??
    b.bonus_amount ??
    1
  return {
    ...b,
    base_apy: b.base_apy ?? 0,
    total_hold_days: b.total_hold_days ?? b.timeline?.must_remain_open_days ?? 90,
    tiers: [{ min_deposit: Math.max(1, minBal), bonus_amount: b.bonus_amount }],
  }
}

export function getBusinessBonuses() {
  // Pull business bonuses from BOTH catalogs — balance-only ones from savings,
  // and checking/transaction ones from the main catalog (normalized) — so the
  // page surfaces every live business offer, not just the savings-modeled ones.
  const liveBiz = [
    ...savingsBonuses.filter(isLive).filter(isBusinessBonus),
    ...bonuses.filter(isLive).filter(isBusinessBonus).map(normalizeBizChecking),
  ]
  const withApy = (b: any) => ({ bonus: b, effApy: effectiveApy(b) })
  const nationwide = liveBiz.filter(isNationwide).map(withApy).sort((a, b) => b.effApy - a.effApy)
  const regional = liveBiz.filter(b => !isNationwide(b)).map(withApy).sort((a, b) => b.effApy - a.effApy)
  return { nationwide, regional }
}

export type BizBonusTier = {
  deposit: number
  bonus: number
  effApy: number
}

export type BizBonusRow = {
  id: string
  bank: string
  bonus: number
  deposit: number
  holdDays: number
  effApy: number
  monthlyFee: number | null
  blurb: string
  /** Every deposit/bonus tier, so the table can show all the options. */
  tiers: BizBonusTier[]
}

/** Flatten ranked business bonuses into serializable rows for client tables. */
export function toBizBonusRows(list: { bonus: any; effApy: number }[]): BizBonusRow[] {
  return list.map(({ bonus, effApy }) => {
    const t = bonus.tiers[0]
    const holdDays = practicalHoldDays(bonus)
    const tiers: BizBonusTier[] = bonus.tiers.map((tier: any) => ({
      deposit: tier.min_deposit,
      bonus: tier.bonus_amount,
      effApy: Math.round(
        ((tier.bonus_amount + tier.min_deposit * (bonus.base_apy || 0) * (holdDays / 365)) /
          tier.min_deposit) *
          (365 / holdDays) *
          100,
      ),
    }))
    const notes: string = bonus.eligibility?.eligibility_notes ?? ""
    const blurb = notes.split(/\.\s/)[0]?.slice(0, 120) ?? ""
    return {
      id: bonus.id,
      bank: shortBankName(bonus),
      bonus: t.bonus_amount,
      deposit: t.min_deposit,
      holdDays,
      effApy: Math.round(effApy),
      monthlyFee: bonus.fees?.monthly_fee ?? null,
      blurb,
      tiers,
    }
  })
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
