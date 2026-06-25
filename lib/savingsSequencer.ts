import { savingsBonuses, SavingsBonus, SavingsBonusTier, practicalHoldDays } from "./data/savingsBonuses"

export type SavingsSequencedEntry = {
  id: string
  bank_name: string
  deposit: number
  bonus_amount: number
  base_apy: number
  interest_earned: number
  total_earnings: number // net of fee_cost
  effective_apy: number // annualized, net of fees
  /** Net monthly-fee cost over the hold (0 when waived/no fee). Already
   *  subtracted from total_earnings / effective_apy; surfaced so the card can
   *  show the deduction explicitly. */
  fee_cost: number
  hold_days: number
  tier: SavingsBonusTier
  bonus: SavingsBonus
  start_day: number
  end_day: number
  rotation: number // which rotation this falls in (1, 2, 3...)
  /**
   * Profit ABOVE what the same capital would have earned in the user's
   * current HYSA during the holding period. This is the honest "did this
   * bonus actually beat my current account" number — it accounts for the
   * opportunity cost of locking the deposit at the bonus bank's base APY
   * instead of the user's higher HYSA. May be negative when a bonus's
   * combined (bonus + base APY) doesn't beat the user's HYSA.
   */
  incremental_vs_hysa: number
  /** What the user's current HYSA would have earned on this deposit over the same hold window. */
  hysa_baseline_earnings: number
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
 * Net monthly-fee cost over the bonus hold.
 *
 * Most business-checking bonuses waive the monthly fee for anyone holding the
 * qualifying balance, so the net cost is $0 — those are flagged
 * `fees.monthly_fee_waived`. When the fee is NOT waived at the deposit level
 * (e.g. First Hawaiian: $25/mo, waived only at $50k but the bonus tiers are
 * $10k/$20k), the fee is a real drag and gets netted out of the bonus. We
 * charge one fee per statement cycle the account is funded (~30-day months).
 */
function feeCostFor(bonus: SavingsBonus): number {
  const fee = bonus.fees?.monthly_fee ?? 0
  if (fee <= 0 || bonus.fees?.monthly_fee_waived) return 0
  const months = Math.max(1, Math.ceil(bonus.total_hold_days / 30))
  return fee * months
}

/**
 * Calculate effective APY for a given bonus tier
 * effective_apy = (bonus + interest - fees) / deposit * (365 / hold_days)
 */
function calcEffectiveApy(
  deposit: number,
  bonusAmount: number,
  baseApy: number,
  holdDays: number,
  feeCost = 0,
): { effectiveApy: number; interestEarned: number; totalEarnings: number } {
  const interestEarned = Math.round(deposit * baseApy * (holdDays / 365))
  const totalEarnings = bonusAmount + interestEarned - feeCost
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
  businessOnly = false,
  militaryAffiliated = false,
  prioritize = "apy",
  horizonDays = 1095,
}: {
  availableBalance: number
  completedBonusIds?: string[]
  skippedBonusIds?: string[]
  userState?: string | null
  currentHysaApy?: number
  includeBusiness?: boolean
  includeBrokerage?: boolean
  /** When true, show ONLY business bonuses — personal and brokerage are
   * excluded regardless of includeBusiness/includeBrokerage. */
  businessOnly?: boolean
  /** USAA / Navy Federal / AAFES-type offers gate on this. */
  militaryAffiliated?: boolean
  /**
   * Optimization objective for tier selection AND deployment order.
   * - "apy" (default): rank by effective APY; churnable bonuses take their
   *   highest-APY tier so capital frees fastest for more rotations.
   * - "amount": rank by raw bonus dollars; every bonus takes the biggest
   *   absolute payout it can afford (still gated on beating the user's HYSA).
   *   This is the "biggest bonus even if lower APY" mode the savings page's
   *   sort toggle drives — it changes the plan, not just the card order.
   */
  prioritize?: "apy" | "amount"
  /**
   * How far out (in days) to plan. New deployments never START past this
   * window, which both bounds the projection to the displayed horizon and
   * gives churnable bonuses a finite span to redeploy into after cooldown.
   * Default 1095 (3 years) so even 24-month-cooldown bonuses can recur once.
   */
  horizonDays?: number
}): SavingsSequencerResult {
  const skipped: { bank_name: string; reason: string }[] = []
  type Candidate = {
    bonus: SavingsBonus
    tier: SavingsBonusTier
    effectiveApy: number
    interestEarned: number
    totalEarnings: number
    feeCost: number
    isChurnable: boolean
    /** Days to wait after the hold ends before this bonus can be redeployed
     *  (null = one-and-done, never redeploys). */
    cooldownDays: number | null
  }
  const candidates: Candidate[] = []

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
    // Business/brokerage filter.
    // Business-only mode is exclusive: show ONLY business bonuses (personal +
    // brokerage are both hidden). Otherwise honor the include* toggles.
    if (businessOnly) {
      if (!bonus.business) continue
    } else {
      if (bonus.business && !includeBusiness) continue
      if (bonus.brokerage && !includeBrokerage) continue
    }

    // State filter: when no state is set, hide all state-restricted bonuses
    // (default to nationwide only — picking a state unlocks more, not fewer).
    if (bonus.eligibility?.state_restricted) {
      if (!userState) {
        skipped.push({ bank_name: bonus.bank_name, reason: "State-specific — set your state to unlock" })
        continue
      }
      const allowed = bonus.eligibility.states_allowed ?? []
      if (allowed.length > 0 && !allowed.some(s => s === userState || s === "Nationwide (U.S.)")) {
        skipped.push({ bank_name: bonus.bank_name, reason: `Not available in ${userState}` })
        continue
      }
    }

    // Military-only bonuses — hide unless the user has flagged themselves
    // military_affiliated in their profile.
    if ((bonus as { eligibility?: { military_only?: boolean } }).eligibility?.military_only === true && !militaryAffiliated) {
      skipped.push({ bank_name: bonus.bank_name, reason: "Military members and families only" })
      continue
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

    // Tier selection strategy depends on whether this bonus is churnable.
    //
    // - CHURNABLE (cooldown_months set): we can redeploy capital to the SAME
    //   bank again after the cooldown window. Picking the highest-APY tier
    //   frees capital faster and stacks more rotations.
    //
    // - ONE-AND-DONE (cooldown_months == null OR lifetime_language = true):
    //   we only get one shot at this bank ever. We should take the biggest
    //   absolute payout as long as its effective APY still beats the user's
    //   baseline HYSA. "Many of these aren't churnable" was the user's
    //   explicit feedback; splitting into a smaller-tier play here leaves
    //   real dollars on the table.
    const isChurnable =
      bonus.cooldown_months !== null &&
      bonus.cooldown_months !== undefined &&
      bonus.eligibility?.lifetime_language !== true

    // Net monthly-fee drag (0 for waived/no-fee bonuses) — applied to every
    // tier's effective-APY math below so fees aren't silently ignored.
    const feeCost = feeCostFor(bonus)

    let bestCandidate: { tier: SavingsBonusTier; effectiveApy: number; interestEarned: number; totalEarnings: number } | null = null
    // In "amount" mode the user has explicitly asked for the biggest absolute
    // payout, so even churnable bonuses take their highest affordable tier
    // (the one-and-done branch below) rather than the capital-efficient
    // highest-APY tier.
    if (isChurnable && prioritize !== "amount") {
      // Max APY: feeds parallel redeployment math
      for (const tier of affordableTiers) {
        const result = calcEffectiveApy(tier.min_deposit, tier.bonus_amount, bonus.base_apy, practicalHoldDays(bonus), feeCost)
        if (!bestCandidate || result.effectiveApy > bestCandidate.effectiveApy) {
          bestCandidate = { tier, ...result }
        }
      }
    } else {
      // One-and-done: take the highest tier we can afford whose APY still
      // beats the user's HYSA. affordableTiers is ascending by min_deposit,
      // so walk from the top down.
      for (let i = affordableTiers.length - 1; i >= 0; i--) {
        const tier = affordableTiers[i]
        const result = calcEffectiveApy(tier.min_deposit, tier.bonus_amount, bonus.base_apy, practicalHoldDays(bonus), feeCost)
        if (currentHysaApy > 0 && result.effectiveApy <= currentHysaApy) continue
        bestCandidate = { tier, ...result }
        break
      }
      // Fallback: if every tier fails the APY floor, take the highest-APY
      // tier anyway (we'll filter it out below on the same threshold, but at
      // least the candidate reflects what the user would actually do if they
      // decided to take it).
      if (!bestCandidate) {
        for (const tier of affordableTiers) {
          const result = calcEffectiveApy(tier.min_deposit, tier.bonus_amount, bonus.base_apy, practicalHoldDays(bonus), feeCost)
          if (!bestCandidate || result.effectiveApy > bestCandidate.effectiveApy) {
            bestCandidate = { tier, ...result }
          }
        }
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
    // ~30-day months, consistent with feeCostFor() and the rest of the app.
    const cooldownDays = isChurnable ? (bonus.cooldown_months as number) * 30 : null
    candidates.push({ bonus, tier, effectiveApy, interestEarned, totalEarnings, feeCost, isChurnable, cooldownDays })
  }

  // Rank candidates by the chosen objective: effective APY by default, or raw
  // bonus dollars when the user wants the biggest absolute payout.
  const byObjective = (a: Candidate, b: Candidate) =>
    prioritize === "amount"
      ? b.tier.bonus_amount - a.tier.bonus_amount || b.effectiveApy - a.effectiveApy
      : b.effectiveApy - a.effectiveApy
  candidates.sort(byObjective)

  // Build the deployment plan.
  // Capital rotates: as each hold ends, the freed cash redeploys into the next
  // best bonus. Churnable bonuses re-enter the pool once their cooldown elapses
  // (tracked in `pending`), so the same bank can recur across the horizon —
  // this is what makes business/personal churn bonuses show up again after
  // their cooldown instead of appearing exactly once. New deployments never
  // START past `horizonDays`, which keeps the projection bounded and the loop
  // finite.
  const entries: SavingsSequencedEntry[] = []
  const remaining = [...candidates]
  // Churn redeploys waiting on their cooldown window to expire before they can
  // re-enter `remaining`.
  const pending: { cand: Candidate; availableDay: number }[] = []
  // Bonuses deployed at least once — so we don't mislabel a time-contended
  // bonus as "can't afford" in the skip list.
  const everDeployed = new Set<string>()
  let rotation = 0

  // Track active deployments: when capital frees up
  type ActiveDeploy = { endDay: number; amount: number }
  const active: ActiveDeploy[] = []
  let currentDay = 0

  // Each rotation advances time by >0 days and capital/horizon are finite, so
  // this can't trip in practice — it's just a backstop against a logic slip
  // spinning forever.
  let guard = 0
  const GUARD_MAX = 10000

  while ((remaining.length > 0 || pending.length > 0) && currentDay < horizonDays) {
    if (++guard > GUARD_MAX) break

    // Free up capital from holds that have ended by now.
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].endDay <= currentDay) active.splice(i, 1)
    }

    // Promote any churn redeploys whose cooldown has elapsed back into the pool.
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].availableDay <= currentDay) {
        remaining.push(pending[i].cand)
        pending.splice(i, 1)
      }
    }
    // Keep the deployable pool ordered by the chosen objective so freshly
    // promoted redeploys slot in against the other candidates correctly.
    remaining.sort(byObjective)

    // Available capital = total balance minus what's currently locked
    const locked = active.reduce((s, a) => s + a.amount, 0)
    let freeCapital = availableBalance - locked

    // Try to deploy to multiple bonuses simultaneously
    const toRemove: number[] = []
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]
      const { bonus, tier, effectiveApy, interestEarned, totalEarnings, feeCost } = cand
      if (tier.min_deposit > freeCapital) continue

      rotation++
      everDeployed.add(bonus.id)
      const startDay = currentDay
      const endDay = startDay + practicalHoldDays(bonus)

      // What would the same deposit have earned in the user's current HYSA
      // over the same hold window? This is the opportunity-cost baseline.
      // When currentHysaApy isn't set, baseline is 0 and incremental ==
      // total_earnings (consistent with previous behavior).
      const hysaBaseline = Math.round(tier.min_deposit * currentHysaApy * (practicalHoldDays(bonus) / 365))
      const incremental = totalEarnings - hysaBaseline

      entries.push({
        id: bonus.id,
        bank_name: bonus.bank_name,
        deposit: tier.min_deposit,
        bonus_amount: tier.bonus_amount,
        base_apy: bonus.base_apy,
        interest_earned: interestEarned,
        total_earnings: totalEarnings,
        effective_apy: effectiveApy,
        fee_cost: feeCost,
        hold_days: practicalHoldDays(bonus),
        tier,
        bonus,
        start_day: startDay,
        end_day: endDay,
        rotation,
        incremental_vs_hysa: incremental,
        hysa_baseline_earnings: hysaBaseline,
      })

      active.push({ endDay, amount: tier.min_deposit })
      freeCapital -= tier.min_deposit
      toRemove.push(i)

      // Churnable bonus: schedule its next eligibility after the cooldown,
      // provided that re-entry still lands inside the planning horizon.
      if (cand.isChurnable && cand.cooldownDays != null) {
        const nextDay = endDay + cand.cooldownDays
        if (nextDay < horizonDays) pending.push({ cand, availableDay: nextDay })
      }
    }

    // Remove deployed candidates
    for (let i = toRemove.length - 1; i >= 0; i--) remaining.splice(toRemove[i], 1)

    if (toRemove.length === 0) {
      // Nothing deployed this tick — jump to the next moment something changes:
      // a hold ending (capital frees) or a cooldown expiring.
      const nextActive = active.length ? Math.min(...active.map(a => a.endDay)) : Infinity
      const nextPending = pending.length ? Math.min(...pending.map(p => p.availableDay)) : Infinity
      const nextEvent = Math.min(nextActive, nextPending)
      if (!isFinite(nextEvent)) break // nothing will free or reopen — done
      currentDay = nextEvent
    }
  }

  // Anything still queued that never got a capital slot inside the horizon:
  // surface it honestly rather than dropping it silently. These are affordable
  // on their own but got crowded out by higher-ranked bonuses for the whole
  // window — distinct from the "can't afford the minimum" skips above.
  const reportedSkip = new Set<string>()
  for (const r of remaining) {
    if (everDeployed.has(r.bonus.id) || reportedSkip.has(r.bonus.id)) continue
    reportedSkip.add(r.bonus.id)
    skipped.push({
      bank_name: r.bonus.bank_name,
      reason: `Didn't fit the ${Math.round(horizonDays / 30)}-month plan — capital stayed committed to higher-ranked bonuses`,
    })
  }

  // Sort entries by start_day for clean display
  entries.sort((a, b) => a.start_day - b.start_day || b.effective_apy - a.effective_apy)

  const totalEarnings = entries.reduce((s, e) => s + e.total_earnings, 0)
  const totalDays = entries.length > 0 ? Math.max(...entries.map(e => e.end_day)) : 0

  return { entries, total_earnings: totalEarnings, total_days: totalDays, skipped }
}
