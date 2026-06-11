import { describe, it, expect } from "vitest"
import {
  compareStrategies,
  maxBeneficialLoanApr,
  loanScenarioGrid,
  amortizedPayment,
  monthIndexOf,
  addMonthsISO,
  round2,
  formatMoney,
  totalDebt,
  type FinancialPicture,
  type DebtInstrument,
  type BalanceTransferOffer,
  type ConsolidationLoanOffer,
  type StrategyResult,
} from "./debtSimulator"

const START = "2026-01-01"

function card(
  id: string,
  balance: number,
  apr: number,
  minPayment = 25,
  extra: Partial<DebtInstrument> = {},
): DebtInstrument {
  return { kind: "credit_card", id, name: id, balance, apr, minPayment, ...extra } as DebtInstrument
}

function base(overrides: Partial<FinancialPicture> = {}): FinancialPicture {
  return {
    debts: [],
    monthlyBudget: 1000,
    availableCash: 0,
    emergencyBuffer: 0,
    balanceTransfers: [],
    consolidationLoans: [],
    goal: "lowest_cost",
    startDateISO: START,
    horizonMonths: 600,
    ...overrides,
  }
}

function pick(c: ReturnType<typeof compareStrategies>, kind: StrategyResult["kind"]): StrategyResult {
  const s = c.strategies.find(x => x.kind === kind)
  if (!s) throw new Error(`strategy ${kind} not found`)
  return s
}

// Sum of all ending balances at a given (1-based) month in a timeline.
function balanceAtMonth(s: StrategyResult, month: number): number {
  const row = s.timeline.find(t => t.month === month)
  if (!row) return 0
  return round2(Object.values(row.balances).reduce((a, b) => a + b, 0))
}

describe("date + money helpers", () => {
  it("monthIndexOf counts whole calendar months and floors at 0", () => {
    expect(monthIndexOf("2026-01-01", "2026-01-15")).toBe(0)
    expect(monthIndexOf("2026-01-01", "2026-02-01")).toBe(1)
    expect(monthIndexOf("2026-01-01", "2027-01-01")).toBe(12)
    expect(monthIndexOf("2026-06-01", "2026-01-01")).toBe(0)
  })
  it("addMonthsISO rolls over years deterministically", () => {
    expect(addMonthsISO("2026-01-01", 0)).toBe("2026-01-01")
    expect(addMonthsISO("2026-11-01", 3)).toBe("2027-02-01")
  })
  it("round2 rounds to cents", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.005)).toBe(1.01)
  })
})

describe("baseline avalanche", () => {
  it("pays the highest-APR debt first", () => {
    const c = compareStrategies(
      base({
        debts: [card("low", 5000, 0.1, 100), card("high", 5000, 0.25, 100)],
        monthlyBudget: 1000,
      }),
    )
    const b = c.baseline
    // After month 1, the high-APR card should have absorbed all extra capacity,
    // so its balance falls faster than the low-APR card.
    const row1 = b.timeline[0]
    expect(row1.balances["high"]).toBeLessThan(row1.balances["low"])
  })

  it("eventually reaches a debt-free date and positive total interest", () => {
    const c = compareStrategies(
      base({ debts: [card("a", 10000, 0.2, 200)], monthlyBudget: 800 }),
    )
    expect(c.baseline.monthsToDebtFree).not.toBeNull()
    expect(c.baseline.debtFreeDateISO).not.toBeNull()
    expect(c.baseline.totalInterest).toBeGreaterThan(0)
    expect(c.baseline.totalFees).toBe(0)
  })

  it("amortizes interest correctly for a single card (known-ish value)", () => {
    // $1,000 at 12% APR (1%/mo). Interest accrues to $1,010 before the $1,000
    // payment, leaving $10 → cleared the next month. ~$10 total interest.
    const c = compareStrategies(
      base({ debts: [card("a", 1000, 0.12, 25)], monthlyBudget: 1000 }),
    )
    expect(c.baseline.monthsToDebtFree).toBeLessThanOrEqual(2)
    expect(c.baseline.totalInterest).toBeGreaterThan(9)
    expect(c.baseline.totalInterest).toBeLessThan(12)
  })
})

describe("minimum payments", () => {
  it("reduces balances every month even with no extra capacity", () => {
    // Budget exactly covers minimums + interest so principal still drops slowly.
    const c = compareStrategies(
      base({ debts: [card("a", 1000, 0.0, 100)], monthlyBudget: 100 }),
    )
    const m1 = balanceAtMonth(c.baseline, 1)
    expect(m1).toBeLessThan(1000)
    expect(m1).toBeCloseTo(900, 5)
  })

  it("flags negative amortization when minimums exceed the budget", () => {
    const c = compareStrategies(
      base({ debts: [card("a", 20000, 0.3, 600)], monthlyBudget: 100 }),
    )
    const warned = c.baseline.warnings.some(w => /exceed/.test(w.message))
    expect(warned).toBe(true)
  })
})

describe("balance transfers — debt is conserved", () => {
  const bt = (over: Partial<BalanceTransferOffer> = {}): BalanceTransferOffer => ({
    id: "bt",
    name: "BT Card",
    enabled: true,
    creditLimit: 20000,
    approvedTransferAmount: 20000,
    promoApr: 0,
    promoMonths: 12,
    postPromoApr: 0.26,
    transferFeePct: 0,
    minPayment: 50,
    availableOn: START,
    payFeeWithCash: false,
    approvalStatus: "approved",
    ...over,
  })

  it("REGRESSION: a 0-fee transfer never makes debt disappear", () => {
    const debts = [card("a", 8000, 0.27, 100)]
    const c = compareStrategies(base({ debts, balanceTransfers: [bt({ transferFeePct: 0 })], monthlyBudget: 50 }))
    const s = pick(c, "balance_transfer")
    // Right after the transfer the only reduction to total debt is the month's
    // $50 payment — the $8,000 principal is fully preserved on the new card
    // (promo APR 0 → no interest). It must NOT vanish.
    const m1 = balanceAtMonth(s, 1)
    expect(m1).toBeGreaterThan(7900)
    expect(m1).toBeLessThanOrEqual(8000)
    expect(m1).toBeCloseTo(7950, 0)
  })

  it("adds the transfer fee to the new balance when not paid with cash", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, balanceTransfers: [bt({ transferFeePct: 0.03 })], monthlyBudget: 50 }),
    )
    const s = pick(c, "balance_transfer")
    expect(s.totalFees).toBeCloseTo(300, 0)
    // Month 1 total debt ≈ 10000 + 300 fee − 50 payment (promo APR 0).
    expect(balanceAtMonth(s, 1)).toBeCloseTo(10250, 0)
  })

  it("pays the fee from cash when elected, keeping it off the balance", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({
        debts,
        balanceTransfers: [bt({ transferFeePct: 0.03, payFeeWithCash: true })],
        availableCash: 1000,
        emergencyBuffer: 0,
        monthlyBudget: 50,
      }),
    )
    const s = pick(c, "balance_transfer")
    expect(s.totalFees).toBeCloseTo(300, 0)
    // Fee paid from cash → new balance is just the principal less cash deployed
    // (1000 − 300 fee = 700) less the month's 50 payment.
    expect(balanceAtMonth(s, 1)).toBeCloseTo(10000 - 700 - 50, 0)
  })

  it("handles a partial transfer when the approved amount is below the balance", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({
        debts,
        balanceTransfers: [bt({ approvedTransferAmount: 4000, creditLimit: 4000, transferFeePct: 0 })],
        monthlyBudget: 50,
      }),
    )
    const s = pick(c, "balance_transfer")
    // 4000 moved to a 0% card, 6000 left on the 27% card. Total still ≈ 10000
    // plus one month of interest on the remaining 6000.
    const m1 = balanceAtMonth(s, 1)
    expect(m1).toBeGreaterThan(10000)
    expect(m1).toBeLessThan(10000 + 6000 * 0.27 / 12 + 5)
  })

  it("accrues post-promo interest after the promo expires", () => {
    const debts = [card("a", 12000, 0.27, 50)]
    const c = compareStrategies(
      base({
        debts,
        // Budget only covers the minimum, so the 0% balance survives to expiry.
        balanceTransfers: [bt({ promoMonths: 6, postPromoApr: 0.3, transferFeePct: 0 })],
        monthlyBudget: 60,
      }),
    )
    const s = pick(c, "balance_transfer")
    // During promo (months 1-6) interest accrual is ~0.
    const m6 = balanceAtMonth(s, 6)
    const m7 = balanceAtMonth(s, 7)
    expect(m7).toBeGreaterThan(m6) // post-promo interest now accrues
    expect(s.remainingAfterPromos).toBeGreaterThan(0)
  })

  it("respects a future availability date (no transfer before it)", () => {
    const debts = [card("a", 8000, 0.27, 50)]
    const c = compareStrategies(
      base({
        debts,
        balanceTransfers: [bt({ availableOn: "2026-04-01", transferFeePct: 0 })],
        monthlyBudget: 60,
      }),
    )
    const s = pick(c, "balance_transfer")
    // Months 1-3: full APR accrues on the original card. The transfer note
    // appears in month index 3 (April), i.e. the 4th month row.
    const transferMonth = s.timeline.find(t => t.events.some(e => /card holding/.test(e)))
    expect(transferMonth?.month).toBe(4)
  })
})

describe("consolidation loans — new amortizing liability", () => {
  const loan = (over: Partial<ConsolidationLoanOffer> = {}): ConsolidationLoanOffer => ({
    id: "loan",
    name: "Loan",
    enabled: true,
    requestedAmount: 10000,
    approvedAmount: 10000,
    apr: 0.1,
    termMonths: 36,
    originationFeePct: 0,
    feeMode: "deducted",
    availableOn: START,
    status: "approved",
    ...over,
  })

  it("amortizedPayment matches the standard formula", () => {
    // $10,000 at 10% APR over 36 months ≈ $322.67/mo.
    expect(amortizedPayment(10000, 0.1, 36)).toBeCloseTo(322.67, 1)
    // 0% APR is just principal / term.
    expect(amortizedPayment(1200, 0, 12)).toBeCloseTo(100, 2)
  })

  it("REGRESSION: refinanced debt stays in the total debt", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ originationFeePct: 0 })], monthlyBudget: 50 }),
    )
    const s = pick(c, "consolidation")
    // After the loan pays off the card, the loan balance carries the debt — it
    // does not vanish. (Loan accrues interest, minimal budget pays it down.)
    const m1 = balanceAtMonth(s, 1)
    expect(m1).toBeGreaterThan(9950)
    expect(m1).toBeLessThan(10100)
    // The card's debt is fully present on the new loan — none was lost.
    expect(s.newAccountDetails.some(d => /new .*loan/.test(d))).toBe(true)
  })

  it("deducts an origination fee from proceeds (less debt paid off)", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ originationFeePct: 0.05, feeMode: "deducted" })], monthlyBudget: 50 }),
    )
    const s = pick(c, "consolidation")
    expect(s.totalFees).toBeCloseTo(500, 0)
    // Loan principal 10000, but only 9500 proceeds → 500 of the card remains.
    // Total month-1 debt ≈ 10000 (loan) + 500 (card) + small interest.
    expect(balanceAtMonth(s, 1)).toBeGreaterThan(10000)
  })

  it("finances an origination fee into the loan principal", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ originationFeePct: 0.05, feeMode: "financed" })], monthlyBudget: 50 }),
    )
    const s = pick(c, "consolidation")
    expect(s.totalFees).toBeCloseTo(500, 0)
    // Loan principal = 10500, proceeds = 10000 → card fully paid. Debt ≈ 10500
    // plus a month of interest less the small payment.
    expect(balanceAtMonth(s, 1)).toBeCloseTo(10537.5, 0)
  })

  it("warns when proceeds cannot cover all target balances", () => {
    const debts = [card("a", 20000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ requestedAmount: 10000, approvedAmount: 10000 })], monthlyBudget: 50 }),
    )
    const s = pick(c, "consolidation")
    expect(s.warnings.some(w => /cannot cover/.test(w.message))).toBe(true)
  })

  it("handles partial refinancing (loan smaller than total debt)", () => {
    const debts = [card("a", 8000, 0.27, 80), card("b", 8000, 0.22, 80)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ requestedAmount: 8000, approvedAmount: 8000, originationFeePct: 0 })], monthlyBudget: 200 }),
    )
    const s = pick(c, "consolidation")
    // The 27% card (higher APR) gets refinanced first; the 22% card remains.
    expect(balanceAtMonth(s, 1)).toBeCloseTo(16000, -2)
  })

  it("respects a future loan availability date", () => {
    const debts = [card("a", 10000, 0.27, 100)]
    const c = compareStrategies(
      base({ debts, consolidationLoans: [loan({ availableOn: "2026-03-01", originationFeePct: 0 })], monthlyBudget: 100 }),
    )
    const s = pick(c, "consolidation")
    const loanMonth = s.timeline.find(t => t.events.some(e => /new .*loan/.test(e)))
    expect(loanMonth?.month).toBe(3)
  })
})

describe("strategies with no financing approval", () => {
  it("offers a no-new-credit strategy whenever there is debt", () => {
    const c = compareStrategies(base({ debts: [card("a", 5000, 0.24, 100)] }))
    expect(c.strategies.some(s => s.kind === "no_new_credit")).toBe(true)
  })
  it("does not invent financing strategies when no offers are enabled", () => {
    const c = compareStrategies(base({ debts: [card("a", 5000, 0.24, 100)] }))
    expect(c.strategies.some(s => s.kind === "balance_transfer")).toBe(false)
    expect(c.strategies.some(s => s.kind === "consolidation")).toBe(false)
  })
})

describe("financing must improve the objective", () => {
  it("warns when a loan costs more than the baseline avalanche", () => {
    const debts = [card("a", 10000, 0.12, 200)]
    // A 24% loan is worse than the 12% card it replaces.
    const c = compareStrategies(
      base({
        debts,
        consolidationLoans: [
          {
            id: "bad",
            name: "Bad Loan",
            enabled: true,
            requestedAmount: 10000,
            approvedAmount: 10000,
            apr: 0.24,
            termMonths: 60,
            originationFeePct: 0.05,
            feeMode: "deducted",
            availableOn: START,
            status: "approved",
          },
        ],
        monthlyBudget: 400,
      }),
    )
    const s = pick(c, "consolidation")
    expect(s.totalCost).toBeGreaterThan(c.baseline.totalCost)
    expect(s.warnings.some(w => /does not improve/.test(w.message))).toBe(true)
  })

  it("warns when a lower monthly payment produces more total interest", () => {
    // Low-APR card with a high minimum vs a high-APR loan stretched over a long
    // term. Budget == the card's minimum, so the card path has no extra. The
    // loan's required payment is far lower, but its 22% APR costs more overall.
    const debts = [card("a", 10000, 0.1, 450)]
    const c = compareStrategies(
      base({
        debts,
        goal: "lowest_payment",
        consolidationLoans: [
          {
            id: "stretch",
            name: "Stretch Loan",
            enabled: true,
            requestedAmount: 10000,
            approvedAmount: 10000,
            apr: 0.22,
            termMonths: 84,
            originationFeePct: 0,
            feeMode: "deducted",
            availableOn: START,
            status: "approved",
          },
        ],
        monthlyBudget: 450,
      }),
    )
    const s = pick(c, "consolidation")
    const nnc = c.strategies.find(x => x.kind === "no_new_credit")!
    expect(s.requiredMonthlyPayment).toBeLessThan(nnc.requiredMonthlyPayment)
    expect(s.totalCost).toBeGreaterThan(nnc.totalCost)
    expect(s.warnings.some(w => /MORE in total cost/.test(w.message))).toBe(true)
  })
})

describe("hybrid strategy", () => {
  it("uses both a balance transfer and a consolidation loan", () => {
    const debts = [card("a", 10000, 0.27, 100), card("b", 10000, 0.25, 100)]
    const c = compareStrategies(
      base({
        debts,
        monthlyBudget: 400,
        balanceTransfers: [
          {
            id: "bt",
            name: "BT",
            enabled: true,
            creditLimit: 6000,
            approvedTransferAmount: 6000,
            promoApr: 0,
            promoMonths: 18,
            postPromoApr: 0.26,
            transferFeePct: 0.03,
            minPayment: 50,
            availableOn: START,
            payFeeWithCash: false,
            approvalStatus: "approved",
          },
        ],
        consolidationLoans: [
          {
            id: "loan",
            name: "Loan",
            enabled: true,
            requestedAmount: 8000,
            approvedAmount: 8000,
            apr: 0.1,
            termMonths: 36,
            originationFeePct: 0,
            feeMode: "deducted",
            availableOn: START,
            status: "approved",
          },
        ],
      }),
    )
    const s = pick(c, "hybrid")
    expect(s.newAccounts).toBe(2)
    expect(s.kind).toBe("hybrid")
  })
})

describe("goal-driven ranking", () => {
  function setup(goal: FinancialPicture["goal"]) {
    const debts: DebtInstrument[] = [card("a", 15000, 0.26, 300)]
    return compareStrategies(
      base({
        debts,
        goal,
        monthlyBudget: 500,
        availableCash: 0,
        balanceTransfers: [
          {
            id: "bt",
            name: "BT",
            enabled: true,
            creditLimit: 15000,
            approvedTransferAmount: 15000,
            promoApr: 0,
            promoMonths: 21,
            postPromoApr: 0.26,
            transferFeePct: 0.03,
            minPayment: 50,
            availableOn: START,
            payFeeWithCash: false,
            approvalStatus: "approved",
          },
        ],
        consolidationLoans: [
          {
            id: "loan",
            name: "Loan",
            enabled: true,
            requestedAmount: 15000,
            approvedAmount: 15000,
            apr: 0.13,
            termMonths: 72,
            originationFeePct: 0.02,
            feeMode: "deducted",
            availableOn: START,
            status: "approved",
          },
        ],
      }),
    )
  }

  it("different goals can produce different recommendations", () => {
    const cost = setup("lowest_cost").recommended.kind
    const payment = setup("lowest_payment").recommended.kind
    const credit = setup("protect_credit").recommended.kind
    // Lowest-payment should favor the long-term loan; protect-credit should
    // favor opening nothing new. They should not all be identical.
    expect(new Set([cost, payment, credit]).size).toBeGreaterThan(1)
    expect(credit).toBe("no_new_credit")
  })

  it("lowest_payment recommends the strategy with the lowest required payment", () => {
    const c = setup("lowest_payment")
    const minPay = Math.min(
      ...c.strategies.filter(s => s.kind !== "baseline").map(s => s.requiredMonthlyPayment),
    )
    expect(c.recommended.requiredMonthlyPayment).toBeCloseTo(minPay, 2)
  })
})

describe("cash + emergency buffer", () => {
  it("never deploys cash below the emergency buffer", () => {
    const debts = [card("a", 5000, 0.24, 100)]
    const c = compareStrategies(
      base({ debts, availableCash: 3000, emergencyBuffer: 2000, monthlyBudget: 100 }),
    )
    const nnc = pick(c, "no_new_credit")
    // Only 1000 (3000 - 2000) may be deployed, so month-1 balance ≈ 5000 - 1000.
    expect(balanceAtMonth(nnc, 1)).toBeGreaterThan(3900)
    expect(balanceAtMonth(nnc, 1)).toBeLessThan(4100)
  })

  it("baseline never uses lump cash; no-new-credit does", () => {
    const debts = [card("a", 5000, 0.24, 100)]
    const c = compareStrategies(
      base({ debts, availableCash: 2000, emergencyBuffer: 0, monthlyBudget: 100 }),
    )
    expect(balanceAtMonth(c.baseline, 1)).toBeGreaterThan(balanceAtMonth(pick(c, "no_new_credit"), 1))
  })
})

describe("consolidation helpers", () => {
  it("maxBeneficialLoanApr finds a rate that beats baseline, and rejects when impossible", () => {
    const p = base({ debts: [card("a", 12000, 0.24, 250)], monthlyBudget: 400 })
    const maxApr = maxBeneficialLoanApr(p, {
      principal: 12000,
      termMonths: 48,
      originationFeePct: 0,
      feeMode: "deducted",
    })
    expect(maxApr).not.toBeNull()
    expect(maxApr!).toBeGreaterThan(0)
    expect(maxApr!).toBeLessThanOrEqual(0.6)

    // A debt already at 0% can't be beaten by any positive-APR loan.
    const p2 = base({ debts: [card("z", 5000, 0.0, 100)], monthlyBudget: 500 })
    expect(
      maxBeneficialLoanApr(p2, { principal: 5000, termMonths: 36, originationFeePct: 0, feeMode: "deducted" }),
    ).toBeNull()
  })

  it("loanScenarioGrid returns one row per APR×term and flags beatsBaseline", () => {
    const p = base({ debts: [card("a", 12000, 0.26, 250)], monthlyBudget: 400 })
    const grid = loanScenarioGrid(p, 12000, [0.08, 0.14, 0.2], [36, 60])
    expect(grid).toHaveLength(6)
    // A cheap short loan should beat baseline; an expensive one need not.
    expect(grid.find(g => g.apr === 0.08 && g.termMonths === 36)!.beatsBaseline).toBe(true)
  })
})

describe("runaway / bad-input guard", () => {
  it("REGRESSION: a percent-entered APR (29.99 = 2999%) doesn't explode to Infinity", () => {
    // The exact shape that broke production: a card whose post-promo APR was
    // typed as a percent (29.99) instead of a decimal (0.2999).
    const c = compareStrategies(
      base({
        debts: [
          {
            kind: "credit_card",
            id: "x",
            name: "Blue Business Cash",
            balance: 39729,
            apr: 0,
            minPayment: 985,
            promoApr: 0,
            promoEndsOn: "2026-07-20",
            postPromoApr: 29.99, // <- 2999% if taken literally
          },
        ],
        monthlyBudget: 1500,
        startDateISO: "2026-06-11",
      }),
    )
    const nnc = pick(c, "no_new_credit")
    expect(Number.isFinite(nnc.totalInterest)).toBe(true)
    expect(Number.isFinite(nnc.totalCost)).toBe(true)
    // It never pays off, and the user is told why.
    expect(nnc.monthsToDebtFree).toBeNull()
    expect(nnc.warnings.some(w => w.severity === "critical" && /growing/.test(w.message))).toBe(true)
  })

  it("clamps absurd APRs but leaves normal ones untouched", () => {
    const sane = compareStrategies(base({ debts: [card("a", 10000, 0.2499, 300)], monthlyBudget: 600 }))
    expect(sane.baseline.monthsToDebtFree).not.toBeNull()
    expect(Number.isFinite(sane.baseline.totalInterest)).toBe(true)
  })

  it("formatMoney renders non-finite values as a dash, never $Infinity/$NaN", () => {
    expect(formatMoney(Infinity)).toBe("—")
    expect(formatMoney(NaN)).toBe("—")
    expect(formatMoney(-Infinity)).toBe("—")
    expect(formatMoney(1234)).toBe("$1,234")
  })
})

describe("comparison shape + savings", () => {
  it("computes months and dollars saved vs baseline and names a recommendation", () => {
    const debts = [card("a", 15000, 0.26, 300)]
    const c = compareStrategies(
      base({
        debts,
        monthlyBudget: 500,
        balanceTransfers: [
          {
            id: "bt",
            name: "BT",
            enabled: true,
            creditLimit: 15000,
            approvedTransferAmount: 15000,
            promoApr: 0,
            promoMonths: 21,
            postPromoApr: 0.26,
            transferFeePct: 0.03,
            minPayment: 50,
            availableOn: START,
            payFeeWithCash: false,
            approvalStatus: "approved",
          },
        ],
      }),
    )
    const bt = pick(c, "balance_transfer")
    expect(bt.dollarsSavedVsBaseline).toBeGreaterThan(0)
    expect(bt.monthsSavedVsBaseline).not.toBeNull()
    expect(c.recommended).toBeTruthy()
    expect(c.whyRecommended.length).toBeGreaterThan(0)
    expect(c.whatWouldChange.length).toBeGreaterThan(0)
  })

  it("totalDebt sums instrument balances", () => {
    expect(totalDebt(base({ debts: [card("a", 100, 0.2), card("b", 250, 0.2)] }))).toBe(350)
  })
})
