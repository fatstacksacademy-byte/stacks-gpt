import { bonuses as allBonuses } from "./data/bonuses"
import type { CompletedBonus } from "./churn"

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly"

export type SequencedBonus = {
  type?: "bonus"
  id: string
  bank_name: string
  bonus_amount: number
  dd_count_required: number | null
  min_direct_deposit_per_deposit: number | null
  min_direct_deposit_total: number | null
  deposit_window_days: number | null
  bonus_posting_days_est: number | null
  must_remain_open_days: number | null
  monthly_fee: number | null
  chex_sensitive: string | null
  hard_pull: boolean | null
  source_links: string[]
  weeks_to_complete: number
  velocity: number
  slot: number
  start_week: number
  end_week: number
  payout_week: number
  cycle: number
  cooldown_months: number | null
}

export type SlotPlaceholder = {
  type: "placeholder"
  slot: number
  start_week: number
  end_week: number
  waiting_for: string
  available_week: number
}

export type SlotEntry = SequencedBonus | SlotPlaceholder

export type SequencerResult = {
  slots: SlotEntry[][]
  total_bonus: number
  horizon_weeks: number
  skipped: { bank_name: string; reason: string }[]
}

const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7, biweekly: 14, semimonthly: 15.2, monthly: 30.4,
}

const MAX_WEEKS = 520
const MAX_PLACEMENTS = 200

function evaluate(
  bonus: (typeof allBonuses)[number],
  payFrequency: string,
  paycheckAmount: number
): { feasible: false; reason: string } | { feasible: true; weeksToComplete: number } {
  const req = bonus.requirements
  if (!req?.direct_deposit_required) return { feasible: false, reason: "No DD required" }
  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14
  const perDepositMin = req.min_direct_deposit_per_deposit ?? null
  const totalMin = req.min_direct_deposit_total ?? null
  const windowDays = req.deposit_window_days ?? null
  const ddCountRequired = req.dd_count_required ?? null

  if (perDepositMin && paycheckAmount < perDepositMin) {
    return { feasible: false, reason: `Paycheck $${paycheckAmount} below $${perDepositMin}/deposit minimum` }
  }
  if (totalMin && windowDays) {
    const maxDeposits = Math.max(1, Math.ceil(windowDays / daysPerPay))
    if (maxDeposits * paycheckAmount < totalMin) {
      return { feasible: false, reason: `Can only deposit ~$${(maxDeposits * paycheckAmount).toLocaleString()} in ${windowDays}-day window, need $${totalMin.toLocaleString()}` }
    }
  }
  let ddCount = ddCountRequired
  if (!ddCount && totalMin) ddCount = Math.ceil(totalMin / paycheckAmount)
  if (!ddCount) ddCount = 1
  return { feasible: true, weeksToComplete: Math.ceil((ddCount * daysPerPay) / 7) }
}

export function runSequencer({
  slots,
  payFrequency,
  paycheckAmount,
  completedRecords = [],
}: {
  slots: number
  payFrequency: string
  paycheckAmount: number
  completedRecords?: CompletedBonus[]
}): SequencerResult {
  const skipped: { bank_name: string; reason: string }[] = []

  type EvalBonus = {
    bonus: (typeof allBonuses)[number]
    weeksToComplete: number
    velocity: number
    cooldownMonths: number | null
    cooldownWeeks: number
    isLifetime: boolean
  }

  const pool: EvalBonus[] = []

  for (const b of allBonuses) {
    const result = evaluate(b, payFrequency, paycheckAmount)
    if (!result.feasible) { skipped.push({ bank_name: b.bank_name, reason: result.reason }); continue }
    const cooldownMonths = (b as any).cooldown_months ?? null
    const isLifetime = cooldownMonths === null
    const cooldownWeeks = isLifetime ? 0 : Math.ceil((cooldownMonths * 30.4) / 7)
    pool.push({ bonus: b, weeksToComplete: result.weeksToComplete, velocity: b.bonus_amount / result.weeksToComplete, cooldownMonths, cooldownWeeks, isLifetime })
  }

  pool.sort((a, b) => b.velocity - a.velocity)

  const bonusNextAvailableWeek: Record<string, number> = {}
  const bonusCycle: Record<string, number> = {}
  // Track which bank a slot is waiting on (for placeholder labels)
  const slotWaitingFor: Record<number, { bank_name: string; available_week: number }> = {}

  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (const eb of pool) {
    const b = eb.bonus
    const records = completedRecords.filter(r => r.bonus_id === b.id)
    const inProgress = records.find(r => !r.closed_date)
    const lastClosed = records
      .filter(r => r.closed_date)
      .sort((a, z) => new Date(z.closed_date!).getTime() - new Date(a.closed_date!).getTime())[0]

    if (inProgress) { bonusNextAvailableWeek[b.id] = MAX_WEEKS + 1; continue }
    if (lastClosed && eb.isLifetime) { bonusNextAvailableWeek[b.id] = MAX_WEEKS + 1; bonusCycle[b.id] = 2; continue }
    if (lastClosed && !eb.isLifetime) {
      const availDate = new Date(lastClosed.closed_date! + "T00:00:00")
      availDate.setMonth(availDate.getMonth() + eb.cooldownMonths!)
      const weeksUntil = availDate > today
        ? Math.ceil((availDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 0
      bonusNextAvailableWeek[b.id] = weeksUntil + 1
      bonusCycle[b.id] = 2
    }
  }

  const slotNextAvailable = Array(slots).fill(1) as number[]
  const slotBonuses: SlotEntry[][] = Array.from({ length: slots }, () => [])
  let totalPlacements = 0

  while (totalPlacements < MAX_PLACEMENTS) {
    // Find slot that opens soonest
    let bestSlot = 0
    for (let i = 1; i < slots; i++) {
      if (slotNextAvailable[i] < slotNextAvailable[bestSlot]) bestSlot = i
    }
    const slotAvail = slotNextAvailable[bestSlot]
    if (slotAvail > MAX_WEEKS) break

    // Find best bonus available now
    let bestIdx = -1
    let bestVelocity = -1
    for (let i = 0; i < pool.length; i++) {
      const eb = pool[i]
      const bonusAvail = bonusNextAvailableWeek[eb.bonus.id] ?? 1
      if (bonusAvail > slotAvail) continue
      if (eb.velocity > bestVelocity) { bestVelocity = eb.velocity; bestIdx = i }
    }

    if (bestIdx === -1) {
      // Nothing available yet — find next bonus availability and insert placeholder
      let nextAvailWeek = MAX_WEEKS + 1
      let nextBankName = ""
      for (const eb of pool) {
        const bonusAvail = bonusNextAvailableWeek[eb.bonus.id] ?? 1
        if (bonusAvail > slotAvail && bonusAvail < nextAvailWeek) {
          nextAvailWeek = bonusAvail
          nextBankName = eb.bonus.bank_name
        }
      }
      if (nextAvailWeek > MAX_WEEKS) break

      // Insert placeholder for this gap
      slotBonuses[bestSlot].push({
        type: "placeholder",
        slot: bestSlot,
        start_week: slotAvail,
        end_week: nextAvailWeek - 1,
        waiting_for: nextBankName,
        available_week: nextAvailWeek,
      })

      slotNextAvailable[bestSlot] = nextAvailWeek
      continue
    }

    const eb = pool[bestIdx]
    const b = eb.bonus
    const startWeek = slotAvail
    const endWeek = startWeek + eb.weeksToComplete - 1
    const payoutWeeks = b.timeline?.bonus_posting_days_est
      ? Math.ceil(b.timeline.bonus_posting_days_est / 7)
      : eb.weeksToComplete + 4
    const payoutWeek = startWeek + payoutWeeks - 1
    const cycle = bonusCycle[b.id] ?? 1

    slotBonuses[bestSlot].push({
      type: "bonus",
      id: b.id, bank_name: b.bank_name, bonus_amount: b.bonus_amount,
      dd_count_required: b.requirements?.dd_count_required ?? null,
      min_direct_deposit_per_deposit: b.requirements?.min_direct_deposit_per_deposit ?? null,
      min_direct_deposit_total: b.requirements?.min_direct_deposit_total ?? null,
      deposit_window_days: b.requirements?.deposit_window_days ?? null,
      bonus_posting_days_est: b.timeline?.bonus_posting_days_est ?? null,
      must_remain_open_days: b.timeline?.must_remain_open_days ?? null,
      monthly_fee: b.fees?.monthly_fee ?? null,
      chex_sensitive: b.screening?.chex_sensitive ?? null,
      hard_pull: b.screening?.hard_pull ?? null,
      source_links: b.source_links ?? [],
      weeks_to_complete: eb.weeksToComplete, velocity: eb.velocity,
      slot: bestSlot, start_week: startWeek, end_week: endWeek, payout_week: payoutWeek,
      cycle, cooldown_months: eb.cooldownMonths,
    })

    slotNextAvailable[bestSlot] = startWeek + eb.weeksToComplete

    // Cooldown starts from bonus posting date
    if (eb.isLifetime) {
      bonusNextAvailableWeek[b.id] = MAX_WEEKS + 1
    } else {
      bonusNextAvailableWeek[b.id] = payoutWeek + eb.cooldownWeeks
      bonusCycle[b.id] = cycle + 1
    }

    totalPlacements++
  }

  const allBonusEntries = slotBonuses.flat().filter(e => e.type === "bonus") as SequencedBonus[]
  const totalBonus = allBonusEntries.reduce((sum, b) => sum + b.bonus_amount, 0)
  const horizonWeeks = allBonusEntries.length > 0 ? Math.max(...allBonusEntries.map(b => b.payout_week)) : 0

  return { slots: slotBonuses, total_bonus: totalBonus, horizon_weeks: horizonWeeks, skipped }
}
