import { describe, it, expect } from "vitest"
import { runIntroAprArbitrage, type IntroAprInputs } from "./introAprArbitrage"

// Base case mirrors the "standard offer" worked example from the BBP video:
// Blue Business Plus, 15,000 MR for $3,000 spend in 3 months, 0% for 12 months,
// $1,000/mo of spend for the first 6 months, cash parked at 4.5% APY.
const STANDARD: IntroAprInputs = {
  monthlySpend: 1000,
  spendMonths: 6,
  promoMonths: 12,
  hysaApy: 0.045,
  pointsPerDollar: 2,
  cpp: 0.01,
  welcomeBonusPoints: 15000,
  welcomeBonusMinSpend: 3000,
  welcomeBonusWindowMonths: 3,
  taxRateOnInterest: 0,
}

describe("runIntroAprArbitrage — decaying float curve", () => {
  it("month 0 floats the full promo and earns the headline APY on spend", () => {
    const r = runIntroAprArbitrage(STANDARD)
    const first = r.schedule[0]
    expect(first.floatMonths).toBe(12)
    // 4.5% APY over a full 12 months → the full 4.5% on that month's spend
    expect(first.effectiveRateOnSpend).toBeCloseTo(0.045, 6)
    expect(first.interest).toBeCloseTo(45, 6) // $1,000 × 4.5%
  })

  it("reproduces the on-camera 'April purchases earn ~2.6%' figure", () => {
    const r = runIntroAprArbitrage(STANDARD)
    // April = month index 5 (Nov=0 … Apr=5); floats 12-5 = 7 months
    const april = r.schedule[5]
    expect(april.floatMonths).toBe(7)
    expect(april.effectiveRateOnSpend).toBeCloseTo(0.045 * 7 / 12, 6) // ≈ 0.02625
    expect(april.interest).toBeCloseTo(26.25, 6)
  })

  it("sums the decaying curve to the expected gross float interest", () => {
    const r = runIntroAprArbitrage(STANDARD)
    // 45 + 41.25 + 37.5 + 33.75 + 30 + 26.25
    expect(r.grossInterest).toBeCloseTo(213.75, 4)
    expect(r.totalSpend).toBe(6000)
  })
})

describe("runIntroAprArbitrage — blended return on spend", () => {
  it("stacks float + everyday earn + welcome bonus into the headline % (≈ the video's 7-8%)", () => {
    const r = runIntroAprArbitrage(STANDARD)
    // Everyday earn: 6,000 × 2 = 12,000 MR; welcome 15,000 MR; @1¢ → $270
    expect(r.basePoints).toBe(12000)
    expect(r.welcomeBonusEarned).toBe(true)
    expect(r.rewardsValue).toBeCloseTo(270, 6)
    // Profit (no tax): 270 + 213.75 = 483.75 on 6,000 spend
    expect(r.totalProfit).toBeCloseTo(483.75, 4)
    expect(r.returnOnSpend).toBeCloseTo(0.080625, 6)
    expect(r.blendedMultiplier).toBeCloseTo(8.0625, 4)
  })

  it("nets the float interest down by the tax rate on 1099-INT income", () => {
    const r = runIntroAprArbitrage({ ...STANDARD, taxRateOnInterest: 0.15 })
    expect(r.taxOnInterest).toBeCloseTo(213.75 * 0.15, 4) // ≈ 32.06
    expect(r.netInterest).toBeCloseTo(213.75 * 0.85, 4) // ≈ 181.69
    // Rewards are untouched by the interest tax in this model
    expect(r.rewardsValue).toBeCloseTo(270, 6)
    expect(r.totalProfit).toBeCloseTo(270 + 213.75 * 0.85, 4)
  })
})

describe("runIntroAprArbitrage — guards & edge cases", () => {
  it("does not award the welcome bonus when min spend is missed in the window", () => {
    // $500/mo × 3-month window = $1,500 < $3,000 min
    const r = runIntroAprArbitrage({ ...STANDARD, monthlySpend: 500 })
    expect(r.welcomeBonusEarned).toBe(false)
    expect(r.welcomeBonusPoints).toBe(0)
  })

  it("never floats spend past the promo window", () => {
    const r = runIntroAprArbitrage({ ...STANDARD, spendMonths: 24 })
    // spend is clamped to the 12-month promo
    expect(r.schedule.length).toBe(12)
    // the last in-promo month floats just 1 month
    expect(r.schedule[11].floatMonths).toBe(1)
  })

  it("honors an explicit ramped spend schedule over the flat default", () => {
    const r = runIntroAprArbitrage({ ...STANDARD, spendSchedule: [4, 100, 500, 2000, 3000, 3000] })
    expect(r.totalSpend).toBe(8604)
    // month 0 only $4 of spend floats the full 12 months
    expect(r.schedule[0].interest).toBeCloseTo(4 * 0.045, 6)
  })

  it("returns zeros for an empty plan without dividing by zero", () => {
    const r = runIntroAprArbitrage({ ...STANDARD, monthlySpend: 0, spendMonths: 0, welcomeBonusPoints: 0 })
    expect(r.totalSpend).toBe(0)
    expect(r.returnOnSpend).toBe(0)
    expect(r.totalProfit).toBe(0)
  })

  it("subtracts an annual fee from the blended profit", () => {
    const r = runIntroAprArbitrage({ ...STANDARD, annualFee: 95 })
    expect(r.totalProfit).toBeCloseTo(483.75 - 95, 4)
  })
})
