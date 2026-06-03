export type UsePool = "personal" | "business"

export type DebtAccount = {
  id: string
  display_name: string
  balance: number
  use_for: UsePool
  apr: number
  promo_apr: number | null
  promo_ends_on: string | null
  min_payment: number
  issuer: string
}

export type LeverKind = "cash" | "loan" | "withdrawal" | "bt_card" | "hsa_receipts" | "points_cashout"

export type Lever = {
  id: string
  kind: LeverKind
  pool: UsePool | "either"
  label: string
  amount_available: number
  available_on: string
  cost_apr: number
  intro_months?: number
  bt_fee_pct?: number
  repayment_monthly?: number
  repayment_months?: number
  notes?: string
  eligible: boolean
  ineligible_reason?: string
}

export type NextMoveType = "pay" | "bt" | "loan_payoff" | "withdraw_to_pay"

export type NextMove = {
  type: NextMoveType
  debt_id: string
  debt_name: string
  amount: number
  source_lever_id: string
  source_label: string
  deadline: string | null
  urgency: "cliff" | "high_apr" | "cleanup"
  reason: string
  fee?: number
}

export type MonthSnapshot = {
  month: number
  date: string
  total_debt: number
  interest_paid_cumulative: number
  fees_paid_cumulative: number
}

export type DebtPlan = {
  scope: UsePool
  total_debt: number
  next_move: NextMove | null
  upcoming_moves: NextMove[]
  projection: {
    monthly_capacity: number
    months_to_zero: number | null
    total_interest: number
    total_fees: number
    timeline: MonthSnapshot[]
  }
  unused_levers: Lever[]
  warnings: string[]
}

export type SequencerInput = {
  debts: DebtAccount[]
  levers: Lever[]
  monthly_capacity_personal: number
  monthly_capacity_business: number
  horizon_months: number
  today: string
}

const DAY_MS = 86400000

function monthsBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  return (to.getTime() - from.getTime()) / (DAY_MS * 30.4375)
}

function addMonths(fromISO: string, n: number): string {
  const d = new Date(fromISO)
  d.setMonth(d.getMonth() + Math.round(n))
  return d.toISOString().split("T")[0]
}

function effectiveApr(debt: DebtAccount, today: string): number {
  if (debt.promo_apr == null || !debt.promo_ends_on) return debt.apr
  if (new Date(debt.promo_ends_on).getTime() <= new Date(today).getTime()) return debt.apr
  return debt.promo_apr
}

function urgency(debt: DebtAccount, today: string): "cliff" | "high_apr" | "cleanup" {
  if (debt.promo_ends_on) {
    const months = monthsBetween(today, debt.promo_ends_on)
    if (months <= 3) return "cliff"
  }
  if (effectiveApr(debt, today) >= 0.15 && debt.balance > 500) return "high_apr"
  return "cleanup"
}

function leverFits(lever: Lever, debt: DebtAccount): boolean {
  if (!lever.eligible) return false
  if (lever.pool === "either") return true
  return lever.pool === debt.use_for
}

function scoreLeverForDebt(lever: Lever, debt: DebtAccount, today: string): number {
  if (!leverFits(lever, debt)) return -Infinity
  const debtCost = effectiveApr(debt, today)
  const leverCost = lever.cost_apr
  const intro = lever.kind === "bt_card" ? (lever.intro_months ?? 0) : 0
  const fee = lever.kind === "bt_card" ? (lever.bt_fee_pct ?? 0) : 0
  const spread = Math.max(0, debtCost - leverCost)
  const introBonus = lever.kind === "bt_card" ? intro * 0.005 : 0
  return spread + introBonus - fee
}

function pickBestLever(
  levers: Lever[],
  debt: DebtAccount,
  today: string,
  used: Record<string, number>,
): Lever | null {
  const candidates = levers
    .filter(l => leverFits(l, debt))
    .filter(l => (l.amount_available - (used[l.id] ?? 0)) > 0)
    .map(l => ({ l, score: scoreLeverForDebt(l, debt, today) }))
    .filter(c => c.score > -Infinity)
    .sort((a, b) => b.score - a.score)
  return candidates[0]?.l ?? null
}

function buildMove(debt: DebtAccount, lever: Lever, amount: number, today: string): NextMove {
  const u = urgency(debt, today)
  let reason = ""
  if (u === "cliff" && debt.promo_ends_on) {
    const months = monthsBetween(today, debt.promo_ends_on)
    reason = `0% promo expires ${debt.promo_ends_on} (${Math.round(months * 30.4375)} days). At ${(debt.apr * 100).toFixed(1)}% APR this balance accrues ~$${Math.round(debt.balance * debt.apr / 12)}/mo.`
  } else if (u === "high_apr") {
    reason = `Accruing ${(effectiveApr(debt, today) * 100).toFixed(1)}% APR. Each $1k cleared saves ~$${Math.round(1000 * debt.apr / 12)}/mo.`
  } else {
    reason = `Cleanup balance. Clearing frees up $${Math.round(debt.min_payment)}/mo minimum payment.`
  }
  const fee = lever.kind === "bt_card" ? Math.round(amount * (lever.bt_fee_pct ?? 0)) : undefined
  const type: NextMoveType =
    lever.kind === "bt_card" ? "bt" :
    lever.kind === "loan" ? "loan_payoff" :
    (lever.kind === "withdrawal" || lever.kind === "hsa_receipts" || lever.kind === "points_cashout") ? "withdraw_to_pay" :
    "pay"
  return {
    type,
    debt_id: debt.id,
    debt_name: debt.display_name,
    amount: Math.round(amount),
    source_lever_id: lever.id,
    source_label: lever.label,
    deadline: debt.promo_ends_on,
    urgency: u,
    reason,
    fee,
  }
}

function sortDebtsForPool(debts: DebtAccount[], today: string): DebtAccount[] {
  const score = (d: DebtAccount): number => {
    if (d.promo_ends_on) {
      const months = monthsBetween(today, d.promo_ends_on)
      if (months <= 0) return -1000 + (1 / (d.balance + 1))
      if (months <= 3) return -500 - (3 - months) * 10 + 1 / (d.balance + 1)
      if (months <= 9) return -100 - (9 - months) * 5
    }
    const apr = effectiveApr(d, today)
    return -apr * 100
  }
  return [...debts].sort((a, b) => score(a) - score(b))
}

function runPool(
  pool: UsePool,
  input: SequencerInput,
  used: Record<string, number>,
): DebtPlan {
  const debts = input.debts.filter(d => d.use_for === pool && d.balance > 0)
  const levers = input.levers.filter(l => l.pool === pool || l.pool === "either")
  const monthlyCapacity = pool === "personal" ? input.monthly_capacity_personal : input.monthly_capacity_business

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const warnings: string[] = []

  const sortedDebts = sortDebtsForPool(debts, input.today)
  const upcoming: NextMove[] = []

  const workingBalances: Record<string, number> = {}
  for (const d of debts) workingBalances[d.id] = d.balance

  for (const debt of sortedDebts) {
    let remaining = workingBalances[debt.id]
    while (remaining > 0) {
      const lever = pickBestLever(levers, debt, input.today, used)
      if (!lever) break
      const leverRemaining = lever.amount_available - (used[lever.id] ?? 0)
      const amount = Math.min(remaining, leverRemaining)
      if (amount <= 0) break
      upcoming.push(buildMove(debt, lever, amount, input.today))
      used[lever.id] = (used[lever.id] ?? 0) + amount
      remaining -= amount
      workingBalances[debt.id] = remaining
    }
  }

  const nextMove = upcoming[0] ?? null
  const restMoves = upcoming.slice(1)

  const projection = simulate(debts, levers, monthlyCapacity, input.horizon_months, input.today)

  const unused = levers.filter(l => (used[l.id] ?? 0) < l.amount_available)

  if (totalDebt > 0 && monthlyCapacity === 0) {
    warnings.push("Monthly capacity is $0. Set a number to see months-to-zero.")
  }
  for (const d of debts) {
    if (d.promo_ends_on && workingBalances[d.id] > 0) {
      const months = monthsBetween(input.today, d.promo_ends_on)
      if (months <= 3) {
        warnings.push(`${d.display_name} cliff in ~${Math.round(months * 30.4375)} days with $${Math.round(workingBalances[d.id]).toLocaleString()} not yet covered by a lever.`)
      }
    }
  }

  return {
    scope: pool,
    total_debt: totalDebt,
    next_move: nextMove,
    upcoming_moves: restMoves,
    projection: {
      monthly_capacity: monthlyCapacity,
      months_to_zero: projection.monthsToZero,
      total_interest: projection.totalInterest,
      total_fees: projection.totalFees,
      timeline: projection.timeline,
    },
    unused_levers: unused,
    warnings,
  }
}

function simulate(
  debts: DebtAccount[],
  levers: Lever[],
  monthlyCapacity: number,
  horizonMonths: number,
  today: string,
): { monthsToZero: number | null; totalInterest: number; totalFees: number; timeline: MonthSnapshot[] } {
  const balances: Record<string, number> = {}
  const promoEnds: Record<string, string | null> = {}
  for (const d of debts) {
    balances[d.id] = d.balance
    promoEnds[d.id] = d.promo_ends_on
  }
  const leverRemaining: Record<string, number> = {}
  const leverAvailableMonth: Record<string, number> = {}
  for (const l of levers) {
    leverRemaining[l.id] = l.amount_available
    leverAvailableMonth[l.id] = Math.max(0, Math.floor(monthsBetween(today, l.available_on)))
  }

  const timeline: MonthSnapshot[] = []
  let totalInterest = 0
  let totalFees = 0
  let monthsToZero: number | null = null

  let recurringLoanPayment = 0
  for (const l of levers) {
    if (l.kind === "loan" && l.repayment_monthly && l.repayment_months) {
      recurringLoanPayment += l.repayment_monthly
    }
  }

  for (let m = 0; m < horizonMonths; m++) {
    const monthDate = addMonths(today, m)

    for (const l of levers) {
      if (m === leverAvailableMonth[l.id] && leverRemaining[l.id] > 0) {
        const sortedTargets = sortDebtsForPool(
          debts.filter(d => (l.pool === "either" || l.pool === d.use_for) && balances[d.id] > 0),
          monthDate,
        )
        for (const debt of sortedTargets) {
          if (leverRemaining[l.id] <= 0) break
          const amount = Math.min(balances[debt.id], leverRemaining[l.id])
          if (amount <= 0) continue
          if (l.kind === "bt_card") {
            const fee = amount * (l.bt_fee_pct ?? 0)
            totalFees += fee
            promoEnds[debt.id] = addMonths(monthDate, l.intro_months ?? 12)
          }
          balances[debt.id] -= amount
          leverRemaining[l.id] -= amount
        }
      }
    }

    const available = Math.max(0, monthlyCapacity - recurringLoanPayment)
    let capacity = available

    let minPaymentsBudget = 0
    for (const d of debts) {
      if (balances[d.id] > 0) minPaymentsBudget += Math.min(balances[d.id], d.min_payment)
    }
    if (minPaymentsBudget > capacity) {
      capacity = 0
    } else {
      capacity -= minPaymentsBudget
    }

    const ranked = sortDebtsForPool(debts.filter(d => balances[d.id] > 0), monthDate)
    if (ranked.length > 0 && capacity > 0) {
      const target = ranked[0]
      const payment = Math.min(capacity, balances[target.id])
      balances[target.id] -= payment
      capacity -= payment
    }

    for (const d of debts) {
      if (balances[d.id] <= 0) continue
      const promoActive = promoEnds[d.id] && new Date(promoEnds[d.id]!).getTime() > new Date(monthDate).getTime()
      const apr = promoActive ? (d.promo_apr ?? 0) : d.apr
      const interest = balances[d.id] * apr / 12
      totalInterest += interest
      balances[d.id] += interest
    }

    const total = Object.values(balances).reduce((s, b) => s + Math.max(0, b), 0)
    timeline.push({
      month: m + 1,
      date: monthDate,
      total_debt: Math.round(total),
      interest_paid_cumulative: Math.round(totalInterest),
      fees_paid_cumulative: Math.round(totalFees),
    })

    if (total <= 1 && monthsToZero === null) {
      monthsToZero = m + 1
      break
    }
  }

  return {
    monthsToZero,
    totalInterest: Math.round(totalInterest),
    totalFees: Math.round(totalFees),
    timeline,
  }
}

export function runDebtSequencer(input: SequencerInput): { personal: DebtPlan; business: DebtPlan } {
  const used: Record<string, number> = {}
  const personal = runPool("personal", input, used)
  const business = runPool("business", input, used)
  return { personal, business }
}

export function formatMoney(n: number): string {
  return n >= 0 ? `$${Math.round(n).toLocaleString()}` : `-$${Math.round(Math.abs(n)).toLocaleString()}`
}
