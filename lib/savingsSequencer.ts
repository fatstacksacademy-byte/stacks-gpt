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
  userState,
  currentHysaApy = 0,
  includeBusiness = false,
  includeBrokerage = false,
}: {
  availableBalance: number
  completedBonusIds?: string[]
  skippedBonusIds?: string[]
  userState?: string | null
  currentHysaApy?: number
  includeBusiness?: boolean
  includeBrokerage?: boolean
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
    // Business/brokerage filter
    if (bonus.business && !includeBusiness) continue
    if (bonus.brokerage && !includeBrokerage) continue

    if (userState && bonus.eligibility?.state_restricted) {
      const allowed = bonus.eligibility.states_allowed ?? []
      if (allowed.length > 0 && !allowed.some(s => s === userState || s === "Nationwide (U.S.)")) {
        skipped.push({ bank_name: bonus.bank_name, reason: `Not available in ${userState}` })
        continue
      }
    }

    // Evaluate ALL affordable tiers and pick the one with the best effective APY
    const affordableTiers = bonus.tiers.filter(t => availableBalance >= t.min_deposit)
    if (affordableTiers.length === 0) {
      skipped.push({
        bank_name: bonus.bank_name,
        reason: `Need $${bonus.tiers[0].min_deposit.toLocaleString()} minimum (have $${availableBalance.toLocaleString()})`,
      })
      continue
    }

    let bestCandidate: { tier: SavingsBonusTier; effectiveApy: number; interestEarned: number; totalEarnings: number } | null = null
    for (const tier of affordableTiers) {
      const result = calcEffectiveApy(tier.min_deposit, tier.bonus_amount, bonus.base_apy, bonus.total_hold_days)
      if (!bestCandidate || result.effectiveApy > bestCandidate.effectiveApy) {
        bestCandidate = { tier, ...result }
      }
    }

    if (!bestCandidate) continue

    // Skip if effective APY doesn't beat the user's current HYSA
    if (currentHysaApy > 0 && bestCandidate.effectiveApy <= currentHysaApy) {
      skipped.push({
        bank_name: bonus.bank_name,
        reason: `Effective APY ${(bestCandidate.effectiveApy * 100).toFixed(1)}% doesn't beat your ${(currentHysaApy * 100).toFixed(1)}% HYSA`,
      })
      continue
    }

    const { tier, effectiveApy, interestEarned, totalEarnings } = bestCandidate
    candidates.push({ bonus, tier, effectiveApy, interestEarned, totalEarnings })
  }

  // Sort by effective APY descending
  candidates.sort((a, b) => b.effectiveApy - a.effectiveApy)

  // Build parallel deployment plan
  // At each time step, deploy capital across as many bonuses as possible
  const entries: SavingsSequencedEntry[] = []
  const remaining = [...candidates]
  let rotation = 0

  // Track active deployments: when capital frees up
  type ActiveDeploy = { endDay: number; amount: number }
  const active: ActiveDeploy[] = []
  let currentDay = 0

  while (remaining.length > 0) {
    // Free up any capital from ended deployments
    const freed = active.filter(a => a.endDay <= currentDay)
    for (const f of freed) active.splice(active.indexOf(f), 1)

    // Available capital = total balance minus what's currently locked
    const locked = active.reduce((s, a) => s + a.amount, 0)
    let freeCapital = availableBalance - locked

    // Try to deploy to multiple bonuses simultaneously
    const toRemove: number[] = []
    for (let i = 0; i < remaining.length; i++) {
      const { bonus, tier, effectiveApy, interestEarned, totalEarnings } = remaining[i]
      if (tier.min_deposit > freeCapital) continue

      rotation++
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
        rotation,
      })

      active.push({ endDay, amount: tier.min_deposit })
      freeCapital -= tier.min_deposit
      toRemove.push(i)
    }

    // Remove deployed candidates
    for (let i = toRemove.length - 1; i >= 0; i--) remaining.splice(toRemove[i], 1)

    if (toRemove.length === 0) {
      // No bonuses could be deployed — advance to the next capital release
      if (active.length > 0) {
        const nextFree = Math.min(...active.map(a => a.endDay))
        currentDay = nextFree
      } else {
        // No active deployments and can't deploy anything — skip remaining
        for (const r of remaining) {
          skipped.push({ bank_name: r.bonus.bank_name, reason: `Need $${r.tier.min_deposit.toLocaleString()} but only $${freeCapital.toLocaleString()} available` })
        }
        break
      }
    }
  }

  // Sort entries by start_day for clean display
  entries.sort((a, b) => a.start_day - b.start_day || b.effective_apy - a.effective_apy)

  const totalEarnings = entries.reduce((s, e) => s + e.total_earnings, 0)
  const totalDays = entries.length > 0 ? Math.max(...entries.map(e => e.end_day)) : 0

  return { entries, total_earnings: totalEarnings, total_days: totalDays, skipped }
}
