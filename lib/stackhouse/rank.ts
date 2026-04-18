/**
 * Rank + XP curve — "medium" option from the proposal.
 * threshold(N) = 100 * N * (N+1)
 *
 * Rank 1 starts at 0 XP. Rank N requires total current_xp >= threshold(N).
 * Cap at RANK_MAX.
 *
 * XP scale calibration (matches the proposal):
 *   - small bonus ($100-$299):  100 XP
 *   - medium bonus ($300-$599): 300 XP
 *   - large bonus ($600+):      600 XP
 *   - side hustle milestone:    50-100 XP each
 *   - street win:               see achievement.xp_reward (500-10000)
 *   - daily round:              10 XP
 */

export const RANK_MAX = 20

/** XP required to reach rank N (N >= 1). Rank 1 = 0 XP. */
export function xpForRank(rank: number): number {
  if (rank <= 1) return 0
  const r = Math.min(rank, RANK_MAX)
  return 100 * r * (r + 1)
}

/** The rank a user is at given total XP. */
export function rankFromXp(xp: number): number {
  if (xp <= 0) return 1
  for (let r = RANK_MAX; r >= 1; r--) {
    if (xp >= xpForRank(r)) return r
  }
  return 1
}

/** Progress toward the next rank as a 0..1 fraction. At RANK_MAX returns 1. */
export function progressToNextRank(xp: number): number {
  const current = rankFromXp(xp)
  if (current >= RANK_MAX) return 1
  const base = xpForRank(current)
  const next = xpForRank(current + 1)
  const span = next - base
  if (span <= 0) return 1
  return Math.min(1, Math.max(0, (xp - base) / span))
}

/** XP remaining until the next rank. Zero at RANK_MAX. */
export function xpToNextRank(xp: number): number {
  const current = rankFromXp(xp)
  if (current >= RANK_MAX) return 0
  return xpForRank(current + 1) - xp
}

/**
 * XP awarded for completing a bonus (cook) of the given dollar amount.
 * Tiered so the feedback feels discrete, not linear.
 */
export function xpForCook(bonusAmount: number): number {
  if (bonusAmount >= 600) return 600
  if (bonusAmount >= 300) return 300
  if (bonusAmount >= 100) return 100
  return 50
}

/**
 * Purity % — Option A from the proposal: clean-rate with a 20% floor.
 *
 * purity = clamp(20, 100, 100 * bonuses_received / max(bonuses_started, 1))
 *
 * Edge case: a brand-new user with zero starts has purity = 100 (full credit,
 * no failures on record).
 */
export function purityPct(
  bonusesStarted: number,
  bonusesReceived: number,
): number {
  if (bonusesStarted <= 0) return 100
  const raw = (100 * bonusesReceived) / bonusesStarted
  return Math.max(20, Math.min(100, Math.round(raw * 10) / 10))
}
