// Stacks OS — Debt Payoff Strategy Simulator
//
// Educational simulator only. Not financial, lending, or tax advice. Actual
// lender disclosures and signed loan documents control. Estimated dates and
// savings are projections, never guarantees.
//
// Design goals (the "trustworthy" part):
//   - Debt is conserved. A balance transfer MOVES a balance to a new account;
//     it never disappears. A consolidation loan creates a new amortizing
//     liability. Fees are added to balances (or paid from cash) — never lost.
//   - Interest accrues monthly on the correct (promo vs post-promo) APR.
//   - Minimum payments are applied every month before extra payment capacity.
//   - Financing levers respect their availability date and approval status.
//   - Nothing is presented as approved unless the user says it is.
//
// All money is handled in dollars and rounded to whole cents at each step to
// keep results deterministic and auditable.

// ----------------------------------------------------------------------------
// Money + date helpers (deterministic — dates are passed in, never read here)
// ----------------------------------------------------------------------------

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatMoney(n: number): string {
  const r = Math.round(n)
  return r < 0 ? `-$${Math.abs(r).toLocaleString()}` : `$${r.toLocaleString()}`
}

function ym(iso: string): number {
  const [y, m] = iso.split("-").map(Number)
  return y * 12 + (m - 1)
}

/** Whole calendar months from `startISO` to `targetISO`, floored at 0. */
export function monthIndexOf(startISO: string, targetISO: string): number {
  return Math.max(0, ym(targetISO) - ym(startISO))
}

/** First-of-month ISO date `n` months after `startISO`. Deterministic. */
export function addMonthsISO(startISO: string, n: number): string {
  const base = ym(startISO) + n
  const y = Math.floor(base / 12)
  const m = (base % 12) + 1
  return `${y}-${String(m).padStart(2, "0")}-01`
}

// ----------------------------------------------------------------------------
// Public data model
// ----------------------------------------------------------------------------

export type FicoBand = "poor" | "fair" | "good" | "very_good" | "exceptional"

export const FICO_BAND_LABEL: Record<FicoBand, string> = {
  poor: "Poor (≤ 579)",
  fair: "Fair (580–669)",
  good: "Good (670–739)",
  very_good: "Very good (740–799)",
  exceptional: "Exceptional (800+)",
}

export type CreditCardDebt = {
  kind: "credit_card"
  id: string
  name: string
  balance: number
  apr: number
  minPayment: number
  creditLimit?: number
  promoApr?: number | null
  promoEndsOn?: string | null
  postPromoApr?: number | null
}

export type InstallmentDebt = {
  kind: "installment"
  id: string
  name: string
  balance: number
  apr: number
  monthlyPayment: number
  termRemainingMonths?: number | null
}

export type DebtInstrument = CreditCardDebt | InstallmentDebt

export type ApprovalStatus = "approved" | "prequalified" | "estimated"

export type BalanceTransferOffer = {
  id: string
  name: string
  enabled: boolean
  creditLimit: number
  approvedTransferAmount: number
  promoApr: number
  promoMonths: number
  postPromoApr: number
  transferFeePct: number
  minPayment: number
  availableOn: string
  payFeeWithCash: boolean
  approvalStatus: ApprovalStatus
}

export type ConsolidationLoanFeeMode = "financed" | "deducted"

export type ConsolidationLoanOffer = {
  id: string
  name: string
  enabled: boolean
  requestedAmount: number
  approvedAmount: number
  apr: number
  termMonths: number
  originationFeePct: number
  feeMode: ConsolidationLoanFeeMode
  /** Actual payment from a real offer; if omitted the simulator amortizes it. */
  monthlyPayment?: number | null
  availableOn: string
  status: ApprovalStatus
}

export type CreditProfile = {
  ficoBand?: FicoBand
  annualIncome?: number
  monthlyHousing?: number
  totalMinDebtPayments?: number
  revolvingUtilization?: number
  hardInquiries6mo?: number
  cardApps12mo?: number
  majorDerogatory?: boolean
  willingToOpenCredit?: boolean
  preserveChurningEligibility?: boolean
}

export type StrategyGoal = "lowest_cost" | "fastest" | "lowest_payment" | "protect_credit"

export const STRATEGY_GOAL_LABEL: Record<StrategyGoal, string> = {
  lowest_cost: "Lowest total cost",
  fastest: "Fastest debt-free date",
  lowest_payment: "Lowest required monthly payment",
  protect_credit: "Protect credit / churning capacity",
}

export type FinancialPicture = {
  debts: DebtInstrument[]
  /** Total dollars available per month for ALL debt (minimums + extra). */
  monthlyBudget: number
  /** Lump cash on hand right now. */
  availableCash: number
  /** Cash that must never be spent (emergency buffer). */
  emergencyBuffer: number
  balanceTransfers: BalanceTransferOffer[]
  consolidationLoans: ConsolidationLoanOffer[]
  creditProfile?: CreditProfile
  goal: StrategyGoal
  startDateISO: string
  horizonMonths?: number
}

export type StrategyKind =
  | "baseline"
  | "no_new_credit"
  | "balance_transfer"
  | "consolidation"
  | "hybrid"

export const STRATEGY_LABEL: Record<StrategyKind, string> = {
  baseline: "Baseline avalanche",
  no_new_credit: "No new credit",
  balance_transfer: "Balance transfer",
  consolidation: "Consolidation loan",
  hybrid: "Hybrid (transfer + loan)",
}

export type StrategyWarning = {
  severity: "info" | "warn" | "critical"
  message: string
}

export type MonthlySimulationResult = {
  month: number // 1-based
  dateISO: string
  startingBalance: number
  interest: number
  fees: number
  payment: number
  principal: number
  endingBalance: number
  events: string[]
  /** Ending balance per account id (rounded). */
  balances: Record<string, number>
}

export type NextMove = {
  type: "pay" | "transfer" | "consolidate" | "deploy_cash"
  headline: string
  detail: string
  amount: number
  deadline: string | null
  reason: string
}

export type StrategyResult = {
  kind: StrategyKind
  label: string
  monthsToDebtFree: number | null
  debtFreeDateISO: string | null
  totalInterest: number
  totalFees: number
  totalCost: number
  requiredMonthlyPayment: number
  monthsSavedVsBaseline: number | null
  dollarsSavedVsBaseline: number
  newAccounts: number
  newAccountDetails: string[]
  remainingAfterPromos: number
  assumptions: string[]
  warnings: StrategyWarning[]
  timeline: MonthlySimulationResult[]
  nextMove: NextMove | null
}

export type StrategyComparison = {
  goal: StrategyGoal
  baseline: StrategyResult
  strategies: StrategyResult[]
  recommended: StrategyResult
  runnerUp: StrategyResult | null
  whyRecommended: string
  whatWouldChange: string
  globalWarnings: StrategyWarning[]
}

// ----------------------------------------------------------------------------
// Internal simulation state
// ----------------------------------------------------------------------------

type SimAccount = {
  id: string
  name: string
  balance: number
  apr: number
  promoApr: number | null
  promoEndsIdx: number | null
  isInstallment: boolean
  installmentPayment: number
  minPayment: number
  openedThisSim: boolean
}

type TransferEvent = {
  kind: "transfer"
  atIdx: number
  offer: BalanceTransferOffer
}

type LoanEvent = {
  kind: "loan"
  atIdx: number
  offer: ConsolidationLoanOffer
}

type SimEvent = TransferEvent | LoanEvent

const DEFAULT_HORIZON = 600 // 50 years — long enough to always reach zero
const MIN_PAYMENT_PCT = 0.01
const MIN_PAYMENT_FLOOR = 25

function effectiveApr(acc: SimAccount, monthIdx: number): number {
  if (acc.promoApr != null && acc.promoEndsIdx != null && monthIdx < acc.promoEndsIdx) {
    return acc.promoApr
  }
  return acc.apr
}

function minimumDue(acc: SimAccount): number {
  if (acc.balance <= 0) return 0
  if (acc.isInstallment) return round2(Math.min(acc.balance, acc.installmentPayment))
  const pctMin = acc.balance * MIN_PAYMENT_PCT
  return round2(Math.min(acc.balance, Math.max(acc.minPayment, MIN_PAYMENT_FLOOR, pctMin)))
}

/** Amortized level payment for a fixed-rate installment loan. */
export function amortizedPayment(principal: number, annualApr: number, termMonths: number): number {
  if (termMonths <= 0) return round2(principal)
  const r = annualApr / 12
  if (r <= 0) return round2(principal / termMonths)
  const p = (principal * r) / (1 - Math.pow(1 + r, -termMonths))
  return round2(p)
}

function toSimAccount(d: DebtInstrument, startISO: string): SimAccount {
  if (d.kind === "installment") {
    return {
      id: d.id,
      name: d.name,
      balance: round2(d.balance),
      apr: d.apr,
      promoApr: null,
      promoEndsIdx: null,
      isInstallment: true,
      installmentPayment: d.monthlyPayment,
      minPayment: d.monthlyPayment,
      openedThisSim: false,
    }
  }
  const promoEndsIdx =
    d.promoApr != null && d.promoEndsOn ? monthIndexOf(startISO, d.promoEndsOn) : null
  return {
    id: d.id,
    name: d.name,
    balance: round2(d.balance),
    apr: d.promoApr != null && d.postPromoApr != null ? d.postPromoApr : d.apr,
    promoApr: d.promoApr ?? null,
    promoEndsIdx,
    isInstallment: false,
    installmentPayment: 0,
    minPayment: d.minPayment,
    openedThisSim: false,
  }
}

/** Avalanche order: highest current effective APR first, ties by larger balance. */
function avalancheOrder(accounts: SimAccount[], monthIdx: number): SimAccount[] {
  return [...accounts]
    .filter(a => a.balance > 0.005)
    .sort((a, b) => {
      const da = effectiveApr(b, monthIdx) - effectiveApr(a, monthIdx)
      if (Math.abs(da) > 1e-9) return da
      return b.balance - a.balance
    })
}

// ----------------------------------------------------------------------------
// Core monthly engine
// ----------------------------------------------------------------------------

type SimOptions = {
  monthlyBudget: number
  /** One-time lump sum applied to highest-APR debt at month 0 (after events). */
  lumpCash: number
  events: SimEvent[]
  startISO: string
  horizonMonths: number
}

type SimRun = {
  timeline: MonthlySimulationResult[]
  totalInterest: number
  totalFees: number
  monthsToDebtFree: number | null
  requiredMonthlyPayment: number
  remainingAfterPromos: number
  newAccountDetails: string[]
  warnings: StrategyWarning[]
}

function runSimulation(accounts: SimAccount[], opts: SimOptions): SimRun {
  const state = accounts.map(a => ({ ...a }))
  const events = [...opts.events].sort((a, b) => a.atIdx - b.atIdx)
  const warnings: StrategyWarning[] = []
  const newAccountDetails: string[] = []
  const timeline: MonthlySimulationResult[] = []

  let totalInterest = 0
  let totalFees = 0
  let monthsToDebtFree: number | null = null
  let requiredMonthlyPayment = 0
  const promoEndBalances: { id: string; idx: number }[] = []

  // Cash budgeting: fees the user elects to pay with cash come out of the lump
  // first, so cash stays conserved and the safety buffer is honest.
  let lumpRemaining = Math.max(0, opts.lumpCash)

  const applyTransfer = (ev: TransferEvent, idx: number) => {
    const o = ev.offer
    const capacity = Math.max(0, Math.min(o.approvedTransferAmount, o.creditLimit))
    if (capacity <= 0) return
    // Pull from credit-card balances, highest effective APR first (partial OK).
    const sources = avalancheOrder(
      state.filter(a => !a.isInstallment && a.balance > 0.005),
      idx,
    )
    let toMove = capacity
    let moved = 0
    for (const src of sources) {
      if (toMove <= 0.005) break
      const amt = round2(Math.min(src.balance, toMove))
      if (amt <= 0) continue
      src.balance = round2(src.balance - amt)
      moved = round2(moved + amt)
      toMove = round2(toMove - amt)
    }
    if (moved <= 0.005) return
    const fee = round2(moved * o.transferFeePct)
    let btBalance = moved
    if (o.payFeeWithCash) {
      if (fee > lumpRemaining + 0.005) {
        warnings.push({
          severity: "warn",
          message: `${o.name}: not enough cash to pay the ${formatMoney(fee)} transfer fee — it was financed onto the new balance instead.`,
        })
        btBalance = round2(btBalance + fee)
      } else {
        lumpRemaining = round2(lumpRemaining - fee)
      }
    } else {
      btBalance = round2(btBalance + fee)
    }
    totalFees = round2(totalFees + fee)
    const promoEndsIdx = idx + o.promoMonths
    state.push({
      id: o.id,
      name: o.name,
      balance: btBalance,
      apr: o.postPromoApr,
      promoApr: o.promoApr,
      promoEndsIdx,
      isInstallment: false,
      installmentPayment: 0,
      minPayment: o.minPayment,
      openedThisSim: true,
    })
    promoEndBalances.push({ id: o.id, idx: promoEndsIdx })
    newAccountDetails.push(
      `${o.name}: new card holding ${formatMoney(btBalance)} at ${(o.promoApr * 100).toFixed(1)}% for ${o.promoMonths} mo, then ${(o.postPromoApr * 100).toFixed(1)}%.`,
    )
    if (capacity < moved + 0.005 && sources.some(s => s.balance > 0.005)) {
      warnings.push({
        severity: "info",
        message: `${o.name}: approved/limit of ${formatMoney(capacity)} did not cover all targeted balances — remainder stays on the original cards.`,
      })
    }
  }

  const applyLoan = (ev: LoanEvent, idx: number) => {
    const o = ev.offer
    const base = o.approvedAmount > 0 ? o.approvedAmount : o.requestedAmount
    if (base <= 0) return
    const fee = round2(base * o.originationFeePct)
    let principal: number
    let proceeds: number
    if (o.feeMode === "financed") {
      principal = round2(base + fee)
      proceeds = base
    } else {
      principal = base
      proceeds = round2(base - fee)
    }
    totalFees = round2(totalFees + fee)

    // Pay off existing debts, highest effective APR first (partial OK).
    const targets = avalancheOrder(
      state.filter(a => a.balance > 0.005),
      idx,
    )
    let toApply = proceeds
    let applied = 0
    for (const t of targets) {
      if (toApply <= 0.005) break
      const amt = round2(Math.min(t.balance, toApply))
      if (amt <= 0) continue
      t.balance = round2(t.balance - amt)
      applied = round2(applied + amt)
      toApply = round2(toApply - amt)
    }
    const targetTotal = round2(targets.reduce((s, t) => s + t.balance, 0) + applied)
    if (applied + 0.005 < targetTotal) {
      warnings.push({
        severity: "warn",
        message: `${o.name}: ${formatMoney(proceeds)} in proceeds cannot cover all ${formatMoney(targetTotal)} of targeted balances — ${formatMoney(round2(targetTotal - applied))} stays on the original accounts.`,
      })
    }
    if (toApply > 0.005) {
      warnings.push({
        severity: "warn",
        message: `${o.name}: ${formatMoney(toApply)} of loan proceeds exceeded total debt — borrowing that much adds interest with nothing to pay off.`,
      })
    }
    const payment =
      o.monthlyPayment != null && o.monthlyPayment > 0
        ? o.monthlyPayment
        : amortizedPayment(principal, o.apr, o.termMonths)
    state.push({
      id: o.id,
      name: o.name,
      balance: principal,
      apr: o.apr,
      promoApr: null,
      promoEndsIdx: null,
      isInstallment: true,
      installmentPayment: payment,
      minPayment: payment,
      openedThisSim: true,
    })
    newAccountDetails.push(
      `${o.name}: new ${o.termMonths}-mo loan of ${formatMoney(principal)} at ${(o.apr * 100).toFixed(1)}% (${formatMoney(payment)}/mo, ${formatMoney(fee)} origination fee ${o.feeMode}).`,
    )
  }

  for (let idx = 0; idx < opts.horizonMonths; idx++) {
    const feesBeforeMonth = totalFees
    const monthEvents = events.filter(e => e.atIdx === idx)
    const monthNotes: string[] = []
    for (const ev of monthEvents) {
      const before = newAccountDetails.length
      if (ev.kind === "transfer") applyTransfer(ev, idx)
      else applyLoan(ev, idx)
      for (let i = before; i < newAccountDetails.length; i++) monthNotes.push(newAccountDetails[i])
    }

    // One-time lump-sum paydown at month 0 (avalanche order).
    if (idx === 0 && lumpRemaining > 0.005) {
      let cash = lumpRemaining
      for (const acc of avalancheOrder(state, idx)) {
        if (cash <= 0.005) break
        const amt = round2(Math.min(acc.balance, cash))
        acc.balance = round2(acc.balance - amt)
        cash = round2(cash - amt)
      }
      const used = round2(lumpRemaining - cash)
      if (used > 0.005) monthNotes.push(`Deployed ${formatMoney(used)} cash to highest-APR debt.`)
      lumpRemaining = cash
    }

    const startingBalance = round2(state.reduce((s, a) => s + Math.max(0, a.balance), 0))
    if (startingBalance <= 0.005) {
      // already done before this month
      monthsToDebtFree = idx
      break
    }

    // 1) Accrue interest on the correct APR.
    let monthInterest = 0
    for (const acc of state) {
      if (acc.balance <= 0.005) continue
      const apr = effectiveApr(acc, idx)
      const interest = round2((acc.balance * apr) / 12)
      acc.balance = round2(acc.balance + interest)
      monthInterest = round2(monthInterest + interest)
    }
    totalInterest = round2(totalInterest + monthInterest)

    // 2) Pay minimums on every account.
    let budget = opts.monthlyBudget
    let monthPayment = 0
    let totalMin = 0
    for (const acc of state) {
      const due = minimumDue(acc)
      totalMin = round2(totalMin + due)
      if (due <= 0) continue
      const pay = round2(Math.min(due, acc.balance, Math.max(0, budget)))
      acc.balance = round2(acc.balance - pay)
      budget = round2(budget - pay)
      monthPayment = round2(monthPayment + pay)
    }
    if (idx === 0 || requiredMonthlyPayment === 0) {
      // Required monthly payment = contractual minimums once the plan is in
      // motion (first month that has live balances captures new liabilities).
      requiredMonthlyPayment = Math.max(requiredMonthlyPayment, totalMin)
    }
    if (totalMin > opts.monthlyBudget + 0.005 && idx === 0) {
      warnings.push({
        severity: "critical",
        message: `Required minimum payments (${formatMoney(totalMin)}/mo) exceed your ${formatMoney(opts.monthlyBudget)}/mo budget — balances may grow. Raise the budget or reduce minimums first.`,
      })
    }

    // 3) Apply extra capacity to the avalanche target(s), cascading.
    for (const acc of avalancheOrder(state, idx)) {
      if (budget <= 0.005) break
      const pay = round2(Math.min(acc.balance, budget))
      if (pay <= 0) continue
      acc.balance = round2(acc.balance - pay)
      budget = round2(budget - pay)
      monthPayment = round2(monthPayment + pay)
    }

    const endingBalance = round2(state.reduce((s, a) => s + Math.max(0, a.balance), 0))
    const balances: Record<string, number> = {}
    for (const acc of state) balances[acc.id] = round2(Math.max(0, acc.balance))

    timeline.push({
      month: idx + 1,
      dateISO: addMonthsISO(opts.startISO, idx),
      startingBalance,
      interest: monthInterest,
      fees: round2(totalFees - feesBeforeMonth),
      payment: monthPayment,
      principal: round2(monthPayment - monthInterest),
      endingBalance,
      events: monthNotes,
      balances,
    })

    if (endingBalance <= 0.005) {
      monthsToDebtFree = idx + 1
      break
    }
  }

  // Remaining balance on promo accounts at the moment each promo expires.
  let remainingAfterPromos = 0
  for (const pe of promoEndBalances) {
    const row = timeline.find(t => t.month - 1 === pe.idx) ?? timeline[timeline.length - 1]
    if (row) remainingAfterPromos = round2(remainingAfterPromos + (row.balances[pe.id] ?? 0))
  }

  return {
    timeline,
    totalInterest: round2(totalInterest),
    totalFees: round2(totalFees),
    monthsToDebtFree,
    requiredMonthlyPayment: round2(requiredMonthlyPayment),
    remainingAfterPromos,
    newAccountDetails,
    warnings,
  }
}

// ----------------------------------------------------------------------------
// Strategy construction
// ----------------------------------------------------------------------------

function usableCash(p: FinancialPicture): number {
  return Math.max(0, round2(p.availableCash - p.emergencyBuffer))
}

function eventsFor(
  p: FinancialPicture,
  useTransfers: boolean,
  useLoans: boolean,
): SimEvent[] {
  const events: SimEvent[] = []
  if (useTransfers) {
    for (const o of p.balanceTransfers) {
      if (!o.enabled) continue
      events.push({ kind: "transfer", atIdx: monthIndexOf(p.startDateISO, o.availableOn), offer: o })
    }
  }
  if (useLoans) {
    for (const o of p.consolidationLoans) {
      if (!o.enabled) continue
      events.push({ kind: "loan", atIdx: monthIndexOf(p.startDateISO, o.availableOn), offer: o })
    }
  }
  return events
}

function approvalAssumptions(p: FinancialPicture, useTransfers: boolean, useLoans: boolean): string[] {
  const out: string[] = []
  if (useTransfers) {
    for (const o of p.balanceTransfers.filter(t => t.enabled)) {
      if (o.approvalStatus !== "approved") {
        out.push(
          `${o.name} is ${o.approvalStatus}, not approved. Approval and final terms are not guaranteed — enter your actual offer to compare it accurately.`,
        )
      }
      if (monthIndexOf(p.startDateISO, o.availableOn) > 0) {
        out.push(`${o.name} is modeled as available on ${o.availableOn}, not today.`)
      }
    }
  }
  if (useLoans) {
    for (const o of p.consolidationLoans.filter(l => l.enabled)) {
      if (o.status !== "approved") {
        out.push(
          `${o.name} is ${o.status}, not approved. Potentially worth prequalifying with a soft pull; approval and final APR are not guaranteed.`,
        )
      }
      if (monthIndexOf(p.startDateISO, o.availableOn) > 0) {
        out.push(`${o.name} is modeled as available on ${o.availableOn}, not today.`)
      }
    }
  }
  return out
}

function buildStrategy(
  p: FinancialPicture,
  kind: StrategyKind,
  baseline: SimRun | null,
): StrategyResult {
  const horizon = p.horizonMonths ?? DEFAULT_HORIZON
  const accounts = p.debts.map(d => toSimAccount(d, p.startDateISO))

  const useCash = kind !== "baseline"
  const useTransfers = kind === "balance_transfer" || kind === "hybrid"
  const useLoans = kind === "consolidation" || kind === "hybrid"

  const run = runSimulation(accounts, {
    monthlyBudget: p.monthlyBudget,
    lumpCash: useCash ? usableCash(p) : 0,
    events: eventsFor(p, useTransfers, useLoans),
    startISO: p.startDateISO,
    horizonMonths: horizon,
  })

  const totalCost = round2(run.totalInterest + run.totalFees)
  const debtFreeDateISO =
    run.monthsToDebtFree != null ? addMonthsISO(p.startDateISO, run.monthsToDebtFree) : null

  const newAccounts = run.newAccountDetails.length
  const assumptions: string[] = []
  if (useCash && usableCash(p) > 0) {
    assumptions.push(
      `Deploys ${formatMoney(usableCash(p))} of cash now, preserving a ${formatMoney(p.emergencyBuffer)} emergency buffer.`,
    )
  }
  if (kind === "baseline") {
    assumptions.push("Pays minimums plus your current monthly budget in avalanche order. No new credit, no lump-sum cash.")
  }
  assumptions.push(...approvalAssumptions(p, useTransfers, useLoans))
  assumptions.push(`Interest accrues monthly. Horizon ${horizon} months. Educational projection, not a guarantee.`)

  const warnings = [...run.warnings]

  // Reject financing that does not improve the selected objective vs no-new-credit.
  // (Filled in by buildComparison which has the no-new-credit baseline handy.)

  const monthsSavedVsBaseline =
    baseline && baseline.monthsToDebtFree != null && run.monthsToDebtFree != null
      ? baseline.monthsToDebtFree - run.monthsToDebtFree
      : null
  const dollarsSavedVsBaseline = baseline
    ? round2(baseline.totalInterest + baseline.totalFees - totalCost)
    : 0

  return {
    kind,
    label: STRATEGY_LABEL[kind],
    monthsToDebtFree: run.monthsToDebtFree,
    debtFreeDateISO,
    totalInterest: run.totalInterest,
    totalFees: run.totalFees,
    totalCost,
    requiredMonthlyPayment: run.requiredMonthlyPayment,
    monthsSavedVsBaseline,
    dollarsSavedVsBaseline,
    newAccounts,
    newAccountDetails: run.newAccountDetails,
    remainingAfterPromos: run.remainingAfterPromos,
    assumptions,
    warnings,
    timeline: run.timeline,
    nextMove: null,
  }
}

function goalMetric(s: StrategyResult, goal: StrategyGoal): number {
  switch (goal) {
    case "lowest_cost":
      return s.totalCost
    case "fastest":
      return s.monthsToDebtFree ?? Number.POSITIVE_INFINITY
    case "lowest_payment":
      return s.requiredMonthlyPayment
    case "protect_credit":
      // Primary: fewer new accounts. Secondary: lower cost (encoded as decimals).
      return s.newAccounts * 1e9 + s.totalCost
  }
}

function firstMove(p: FinancialPicture, s: StrategyResult): NextMove | null {
  // Find the first month with an event, else the first paydown.
  const firstEventMonth = s.timeline.find(t => t.events.length > 0)
  if (firstEventMonth) {
    const note = firstEventMonth.events[0]
    const isTransfer = /card holding|Deployed/.test(note)
    return {
      type: note.startsWith("Deployed") ? "deploy_cash" : isTransfer ? "transfer" : "consolidate",
      headline: note,
      detail: firstEventMonth.events.join(" "),
      amount: 0,
      deadline: firstEventMonth.dateISO,
      reason: `Scheduled for ${firstEventMonth.dateISO}.`,
    }
  }
  // Otherwise: avalanche paydown of the highest-APR account.
  const accounts = p.debts
    .map(d => toSimAccount(d, p.startDateISO))
    .filter(a => a.balance > 0.005)
  const ordered = avalancheOrder(accounts, 0)
  const target = ordered[0]
  if (!target) return null
  return {
    type: "pay",
    headline: `Throw every extra dollar at ${target.name}`,
    detail: `${target.name} carries the highest effective APR (${(effectiveApr(target, 0) * 100).toFixed(1)}%). Pay its minimum on everything else and direct all extra capacity here.`,
    amount: round2(Math.max(0, p.monthlyBudget)),
    deadline: null,
    reason: `Highest effective APR at ${(effectiveApr(target, 0) * 100).toFixed(1)}%.`,
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export function totalDebt(p: FinancialPicture): number {
  return round2(p.debts.reduce((s, d) => s + Math.max(0, d.balance), 0))
}

/** Run the full comparison across all five strategies for the chosen goal. */
export function compareStrategies(p: FinancialPicture): StrategyComparison {
  const horizon = p.horizonMonths ?? DEFAULT_HORIZON
  const baselineAccounts = p.debts.map(d => toSimAccount(d, p.startDateISO))
  const baselineRun = runSimulation(baselineAccounts, {
    monthlyBudget: p.monthlyBudget,
    lumpCash: 0,
    events: [],
    startISO: p.startDateISO,
    horizonMonths: horizon,
  })

  const baseline = buildStrategy(p, "baseline", null)
  const noNewCredit = buildStrategy(p, "no_new_credit", baselineRun)

  const candidates: StrategyResult[] = [noNewCredit]

  const hasTransfers = p.balanceTransfers.some(t => t.enabled)
  const hasLoans = p.consolidationLoans.some(l => l.enabled)

  if (hasTransfers) candidates.push(buildStrategy(p, "balance_transfer", baselineRun))
  if (hasLoans) candidates.push(buildStrategy(p, "consolidation", baselineRun))
  if (hasTransfers && hasLoans) candidates.push(buildStrategy(p, "hybrid", baselineRun))

  // Reject financing that does not improve the selected objective vs no-new-credit.
  const baseMetric = goalMetric(noNewCredit, p.goal)
  for (const s of candidates) {
    if (s.kind === "no_new_credit") continue
    const m = goalMetric(s, p.goal)
    if (m >= baseMetric - 0.005) {
      s.warnings.push({
        severity: "warn",
        message: `This financing does not improve your goal (${STRATEGY_GOAL_LABEL[p.goal]}) versus the no-new-credit plan. Opening new accounts here is not worth it for this objective.`,
      })
    }
    // Specifically warn when a lower payment costs more total interest.
    if (s.requiredMonthlyPayment < noNewCredit.requiredMonthlyPayment - 0.005 && s.totalCost > noNewCredit.totalCost + 0.005) {
      s.warnings.push({
        severity: "warn",
        message: `Lower monthly payment (${formatMoney(s.requiredMonthlyPayment)} vs ${formatMoney(noNewCredit.requiredMonthlyPayment)}) but ${formatMoney(round2(s.totalCost - noNewCredit.totalCost))} MORE in total cost. You pay less now and more overall.`,
      })
    }
  }

  // Credit-profile cautions (never present eligibility as approval).
  const globalWarnings: StrategyWarning[] = []
  const cp = p.creditProfile
  if (cp) {
    if (cp.willingToOpenCredit === false && (hasTransfers || hasLoans)) {
      globalWarnings.push({
        severity: "info",
        message: "You indicated you don't want to open new credit. The no-new-credit plan respects that; financing strategies are shown for comparison only.",
      })
    }
    if (cp.preserveChurningEligibility) {
      globalWarnings.push({
        severity: "info",
        message: "You want to preserve card/churning eligibility. New balance-transfer or loan accounts add inquiries and accounts that can affect future approvals (e.g. Chase 5/24).",
      })
    }
    if (cp.majorDerogatory) {
      globalWarnings.push({
        severity: "warn",
        message: "A major derogatory mark was noted. Prequalified APRs are estimates only and may be far higher or declined. Enter your actual offer to compare it accurately.",
      })
    }
    if (cp.ficoBand === "poor" || cp.ficoBand === "fair") {
      globalWarnings.push({
        severity: "info",
        message: "We never claim you'll qualify based on score alone. With your noted score band, treat any financing APR as an estimate until you have a real offer.",
      })
    }
  }

  const all = [baseline, ...candidates]

  // Rank candidates (excluding the conservative baseline) by goal metric.
  const ranked = [...candidates].sort((a, b) => goalMetric(a, p.goal) - goalMetric(b, p.goal))
  const recommended = ranked[0]
  const runnerUp = ranked[1] ?? null
  recommended.nextMove = firstMove(p, recommended)

  const whyRecommended = explainWhy(recommended, p.goal)
  const whatWouldChange = explainSwitch(recommended, runnerUp, p.goal)

  return {
    goal: p.goal,
    baseline,
    strategies: all,
    recommended,
    runnerUp,
    whyRecommended,
    whatWouldChange,
    globalWarnings,
  }
}

function explainWhy(s: StrategyResult, goal: StrategyGoal): string {
  switch (goal) {
    case "lowest_cost":
      return `${s.label} reaches the lowest total cost (${formatMoney(s.totalCost)} interest + fees) of the strategies available.`
    case "fastest":
      return `${s.label} reaches the earliest debt-free date (${s.debtFreeDateISO ?? "beyond horizon"}).`
    case "lowest_payment":
      return `${s.label} has the lowest required monthly payment (${formatMoney(s.requiredMonthlyPayment)}/mo) while still paying the debt off.`
    case "protect_credit":
      return s.newAccounts === 0
        ? `${s.label} opens no new accounts, protecting your credit and churning capacity, at ${formatMoney(s.totalCost)} total cost.`
        : `${s.label} balances protecting credit against cost; it opens ${s.newAccounts} new account(s).`
  }
}

function explainSwitch(rec: StrategyResult, runner: StrategyResult | null, goal: StrategyGoal): string {
  if (!runner) return "No other strategy was available to compare. Add a balance-transfer or consolidation offer to see alternatives."
  const recM = goalMetric(rec, goal)
  const runM = goalMetric(runner, goal)
  const gap = Math.abs(runM - recM)
  switch (goal) {
    case "lowest_cost":
      return `${runner.label} would win if its total cost dropped by ${formatMoney(gap)} — e.g. a lower APR or fee on that offer.`
    case "fastest":
      return `${runner.label} would win if it shaved ${Math.round(gap)} more month(s) off — e.g. more cash up front or a larger transfer.`
    case "lowest_payment":
      return `${runner.label} would win if its required payment fell by ${formatMoney(gap)} — e.g. a longer loan term.`
    case "protect_credit":
      return `${runner.label} would win if you accepted opening more accounts in exchange for lower cost.`
  }
}

// ----------------------------------------------------------------------------
// Consolidation-loan helpers
// ----------------------------------------------------------------------------

/**
 * Highest loan APR (for a given principal/term/fee) whose consolidation
 * strategy still beats the baseline on total cost. Returns null if even a 0%
 * loan does not beat baseline. Binary search to the nearest 0.01%.
 */
export function maxBeneficialLoanApr(
  p: FinancialPicture,
  loan: { principal: number; termMonths: number; originationFeePct: number; feeMode: ConsolidationLoanFeeMode; availableOn?: string },
): number | null {
  const horizon = p.horizonMonths ?? DEFAULT_HORIZON
  const baselineRun = runSimulation(
    p.debts.map(d => toSimAccount(d, p.startDateISO)),
    { monthlyBudget: p.monthlyBudget, lumpCash: 0, events: [], startISO: p.startDateISO, horizonMonths: horizon },
  )
  const baselineCost = round2(baselineRun.totalInterest + baselineRun.totalFees)

  const costAtApr = (apr: number): number => {
    const offer: ConsolidationLoanOffer = {
      id: "__probe__",
      name: "Probe loan",
      enabled: true,
      requestedAmount: loan.principal,
      approvedAmount: loan.principal,
      apr,
      termMonths: loan.termMonths,
      originationFeePct: loan.originationFeePct,
      feeMode: loan.feeMode,
      availableOn: loan.availableOn ?? p.startDateISO,
      status: "estimated",
    }
    const run = runSimulation(
      p.debts.map(d => toSimAccount(d, p.startDateISO)),
      {
        monthlyBudget: p.monthlyBudget,
        lumpCash: usableCash(p),
        events: [{ kind: "loan", atIdx: monthIndexOf(p.startDateISO, offer.availableOn), offer }],
        startISO: p.startDateISO,
        horizonMonths: horizon,
      },
    )
    return round2(run.totalInterest + run.totalFees)
  }

  if (costAtApr(0) >= baselineCost - 0.005) return null

  let lo = 0
  let hi = 0.6
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (costAtApr(mid) < baselineCost - 0.005) lo = mid
    else hi = mid
  }
  return Math.round(lo * 10000) / 10000
}

export type LoanScenario = {
  apr: number
  termMonths: number
  monthlyPayment: number
  totalCost: number
  monthsToDebtFree: number | null
  beatsBaseline: boolean
}

/** Generic scenario grid across several APRs and terms (no hardcoded lenders). */
export function loanScenarioGrid(
  p: FinancialPicture,
  principal: number,
  aprs: number[],
  terms: number[],
  originationFeePct = 0,
  feeMode: ConsolidationLoanFeeMode = "deducted",
): LoanScenario[] {
  const horizon = p.horizonMonths ?? DEFAULT_HORIZON
  const baselineRun = runSimulation(
    p.debts.map(d => toSimAccount(d, p.startDateISO)),
    { monthlyBudget: p.monthlyBudget, lumpCash: 0, events: [], startISO: p.startDateISO, horizonMonths: horizon },
  )
  const baselineCost = round2(baselineRun.totalInterest + baselineRun.totalFees)
  const out: LoanScenario[] = []
  for (const term of terms) {
    for (const apr of aprs) {
      const payment = amortizedPayment(
        feeMode === "financed" ? round2(principal * (1 + originationFeePct)) : principal,
        apr,
        term,
      )
      const offer: ConsolidationLoanOffer = {
        id: "__grid__",
        name: "Scenario loan",
        enabled: true,
        requestedAmount: principal,
        approvedAmount: principal,
        apr,
        termMonths: term,
        originationFeePct,
        feeMode,
        availableOn: p.startDateISO,
        status: "estimated",
      }
      const run = runSimulation(
        p.debts.map(d => toSimAccount(d, p.startDateISO)),
        {
          monthlyBudget: p.monthlyBudget,
          lumpCash: usableCash(p),
          events: [{ kind: "loan", atIdx: 0, offer }],
          startISO: p.startDateISO,
          horizonMonths: horizon,
        },
      )
      const totalCost = round2(run.totalInterest + run.totalFees)
      out.push({
        apr,
        termMonths: term,
        monthlyPayment: payment,
        totalCost,
        monthsToDebtFree: run.monthsToDebtFree,
        beatsBaseline: totalCost < baselineCost - 0.005,
      })
    }
  }
  return out
}
