import { savingsBonuses, SavingsBonus, SavingsBonusTier } from "./data/savingsBonuses"

export type SavingsSequencedEntry = {
  id: string
  bank_name: string
  deposit: number
  bonus_amount: number
  base_apy: number
  interest_earned: number
  total_earnings: number
  effective_apy: number // annualized
  hold_days: number
  tier: SavingsBonusTier
  bonus: SavingsBonus
  start_day: number
  end_day: number
  rotation: number // which rotation this falls in (1, 2, 3...)
}

export type SavingsSequencerResult = {
  entries: SavingsSequencedEntry[]
  total_earnings: number
  total_days: number
  skipped: { bank_name: string; reason: string }[]
}

/**
 * Find the best tier a user can afford for a given bonus
 */
function bestTier(bonus: SavingsBonus, availableBalance: number): SavingsBonusTier | null {
  // Tiers are sorted ascending by min_deposit — pick the highest affordable
  let best: SavingsBonusTier | null = null
  for (const tier of bonus.tiers) {
    if (availableBalance >= tier.min_deposit) {
      best = tier
    }
  }
  return best
}

/**
 * Calculate effective APY for a given bonus tier
 * effective_apy = (bonus + interest) / deposit * (365 / hold_days)
 */
function calcEffectiveApy(
  deposit: number,
  bonusAmount: number,
  baseApy: number,
  holdDays: number,
): { effectiveApy: number; interestEarned: number; totalEarnings: number } {
  const interestEarned = Math.round(deposit * baseApy * (holdDays / 365))
  const totalEarnings = bonusAmount + interestEarned
  const effectiveApy = (totalEarnings / deposit) * (365 / holdDays)
  return { effectiveApy, interestEarned, totalEarnings }
}

/**
 * Run the savings sequencer.
 *
 * Strategy: Rank all eligible bonuses by effective APY, then allocate
 * capital sequentially. After each bonus's lockup ends, the capital
 * is freed and can rotate into the next bonus.
 *
 * For simplicity, we assume the user deploys their full available
 * balance into one bonus at a time (serial rotation). In the future
 * this could support parallel allocation across multiple bonuses.
 */
export function runSavingsSequencer({
  availableBalance,
  completedBonusIds = [],
  skippedBonusIds = [],
}: {
  availableBalance: number
  completedBonusIds?: string[]
  skippedBonusIds?: string[]
}): SavingsSequencerResult {
  const skipped: { bank_name: string; reason: string }[] = []
  const candidates: {
    bonus: SavingsBonus
    tier: SavingsBonusTier
    effectiveApy: number
    interestEarned: number
    totalEarnings: number
  }[] = []

  for (const bonus of savingsBonuses) {
    if (bonus.expired) {
      skipped.push({ bank_name: bonus.bank_name, reason: "Offer expired" })
      continue
    }
    if (completedBonusIds.includes(bonus.id)) {
      skipped.push({ bank_name: bonus.bank_name, reason: "Already completed" })
      continue
    }
    if (skippedBonusIds.includes(bonus.id)) {
      skipped.push({ bank_name: bonus.bank_name, reason: "Skipped by user" })
      continue
    }

    const tier = bestTier(bonus, availableBalance)
    if (!tier) {
      skipped.push({
        bank_name: bonus.bank_name,
        reason: `Need $${bonus.tiers[0].min_deposit.toLocaleString()} minimum (have $${availableBalance.toLocaleString()})`,
      })
      continue
    }

    const { effectiveApy, interestEarned, totalEarnings } = calcEffectiveApy(
      tier.min_deposit,
      tier.bonus_amount,
      bonus.base_apy,
      bonus.total_hold_days,
    )

    candidates.push({ bonus, tier, effectiveApy, interestEarned, totalEarnings })
  }

  // Sort by effective APY descending
  candidates.sort((a, b) => b.effectiveApy - a.effectiveApy)

  // Build sequential rotation plan
  const entries: SavingsSequencedEntry[] = []
  let currentDay = 0

  for (let i = 0; i < candidates.length; i++) {
    const { bonus, tier, effectiveApy, interestEarned, totalEarnings } = candidates[i]
    const startDay = currentDay
    const endDay = startDay + bonus.total_hold_days

    entries.push({
      id: bonus.id,
      bank_name: bonus.bank_name,
      deposit: tier.min_deposit,
      bonus_amount: tier.bonus_amount,
      base_apy: bonus.base_apy,
      interest_earned: interestEarned,
      total_earnings: totalEarnings,
      effective_apy: effectiveApy,
      hold_days: bonus.total_hold_days,
      tier,
      bonus,
      start_day: startDay,
      end_day: endDay,
      rotation: i + 1,
    })

    currentDay = endDay
  }

  const totalEarnings = entries.reduce((s, e) => s + e.total_earnings, 0)
  const totalDays = entries.length > 0 ? entries[entries.length - 1].end_day : 0

  return { entries, total_earnings: totalEarnings, total_days: totalDays, skipped }
}
