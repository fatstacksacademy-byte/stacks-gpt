import { describe, it, expect } from "vitest"
import { analyzeFeeStrategy, parseFeeWaiver, type FeeStrategyInput } from "./feeStrategy"

// First Hawaiian Bank Priority Banking $350 — the bonus this feature was built
// around. $15/mo fee, waived by $6,000 balance OR $2,000+ DD/cycle; $75 early-
// closing fee within 180 days; posts ~45 days; keep open 180 days (6 mo).
const FHB: FeeStrategyInput = {
  bonusAmount: 350,
  monthlyFee: 15,
  waiver: { minBalance: 6000, ddPerCycle: 2000 },
  userDdPerCycle: 500, // the bonus only requires a $500 DD — doesn't meet the $2k waiver
  monthsOpen: 6,
  bonusPostsMonths: 1.5,
  earlyClosureFee: 75,
  hysaApy: 0.045,
  accountApy: 0,
}

describe("parseFeeWaiver", () => {
  it("lifts balance and DD thresholds out of the FHB waiver text", () => {
    const w = parseFeeWaiver("$15/month, waived with a $6,000 combined balance OR $2,000+ direct deposit per statement cycle OR Private Banking enrollment.")
    expect(w.minBalance).toBe(6000)
    expect(w.ddPerCycle).toBe(2000)
  })

  it("returns empty for missing or unparseable text", () => {
    expect(parseFeeWaiver(null)).toEqual({})
    expect(parseFeeWaiver("waived for the first year")).toEqual({})
  })
})

describe("analyzeFeeStrategy — FHB worked example", () => {
  it("ranks pay > balance-park, and flags the $6k park as a trap", () => {
    const r = analyzeFeeStrategy(FHB)
    const pay = r.options.find(o => o.kind === "pay")!
    const bal = r.options.find(o => o.kind === "waive_balance")!
    expect(pay.cost).toBeCloseTo(90, 6)     // $15 × 6
    expect(pay.net).toBeCloseTo(260, 6)
    expect(bal.cost).toBeCloseTo(135, 6)     // $6,000 × 4.5%/12 × 6
    expect(bal.net).toBeCloseTo(215, 6)
    // Paying beats parking — best is "pay" when the $2k DD waiver isn't met.
    expect(r.best.kind).toBe("pay")
    expect(r.bestNet).toBeCloseTo(260, 6)
  })

  it("computes the $4,000 park-vs-pay break-even and warns above it", () => {
    const r = analyzeFeeStrategy(FHB)
    expect(r.breakEvenBalance).toBeCloseTo(4000, 6) // $15 × 12 / 0.045
    expect(r.recommendation).toMatch(/don't park/i)
  })

  it("does NOT offer close-early by default (conservative: assume clawback)", () => {
    const r = analyzeFeeStrategy(FHB)
    expect(r.options.some(o => o.kind === "close_early")).toBe(false)
  })

  it("waives the fee for free once the user routes a $2,000+ paycheck", () => {
    const r = analyzeFeeStrategy({ ...FHB, userDdPerCycle: 2500 })
    expect(r.best.kind).toBe("waive_dd")
    expect(r.bestNet).toBe(350)
    expect(r.bestCost).toBe(0)
  })
})

describe("analyzeFeeStrategy — guards & other shapes", () => {
  it("returns the full bonus with no strategy when there's no fee", () => {
    const r = analyzeFeeStrategy({ ...FHB, monthlyFee: 0 })
    expect(r.best.kind).toBe("no_fee")
    expect(r.bestNet).toBe(350)
  })

  it("prefers a low-balance waiver over paying when it's below break-even", () => {
    // $10/mo fee, waive with only $1,000 parked, 6 mo, 4.5% HYSA.
    // Park cost = 1000 × 0.045/12 × 6 = $22.50  vs  pay = $60 → park wins.
    const r = analyzeFeeStrategy({
      bonusAmount: 300, monthlyFee: 10, waiver: { minBalance: 1000 },
      userDdPerCycle: 0, monthsOpen: 6, bonusPostsMonths: 1, hysaApy: 0.045,
    })
    expect(r.best.kind).toBe("waive_balance")
    expect(r.best.cost).toBeCloseTo(22.5, 6)
  })

  it("offers close-early when a row is flagged non-clawback and it wins", () => {
    // Big fee, short posting, tiny ECF → closing early beats riding it out.
    const r = analyzeFeeStrategy({
      bonusAmount: 400, monthlyFee: 25, waiver: null, monthsOpen: 12,
      bonusPostsMonths: 2, earlyClosureFee: 0, earlyClosureClawback: false, hysaApy: 0.045,
    })
    expect(r.best.kind).toBe("close_early")
    expect(r.best.cost).toBeCloseTo(50, 6) // $25 × 2 months + $0 ECF
  })
})
