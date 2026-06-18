import { describe, it, expect } from "vitest"
import { computeCardValue, defaultAprSchedule } from "./cardValueCalculator"
import type { CreditCardBonus } from "./data/creditCardBonuses"

// Minimal fixture carrying only the fields computeCardValue reads.
function makeCard(overrides: Partial<CreditCardBonus> = {}): CreditCardBonus {
  return {
    id: "test", card_name: "Test Card", issuer: "Test",
    bonus_amount: 60000, bonus_currency: "points", cpp_value: 0.01,
    min_spend: 4000, spend_months: 3,
    annual_fee: 95, annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    expired: false,
    rewards: [
      { categories: ["dining"], multiplier: 3, unit: "points" },
      { categories: ["everything_else"], multiplier: 1, unit: "points" },
    ],
    ...overrides,
  } as unknown as CreditCardBonus
}

const SPEND = { dining: 100, other: 100 } // $200/mo → $2,400/yr

describe("computeCardValue", () => {
  it("composes Year 1 = bonus + credits − first-year fee + rewards", () => {
    const r = computeCardValue(makeCard(), SPEND)
    expect(r.signupBonus).toBe(600)          // 60,000 × $0.01
    expect(r.rewardsAnnual).toBe(48)         // dining 1,200×3% + other 1,200×1%
    expect(r.firstYearFee).toBe(95)
    expect(r.year1).toBe(553)                // 600 + 0 − 95 + 48
  })

  it("Year 2 = ongoing rewards + recurring credits − annual fee", () => {
    const r = computeCardValue(makeCard(), SPEND)
    expect(r.year2).toBe(-47)                // 48 + 0 − 95
  })

  it("waives the first-year fee but keeps the ongoing fee in Year 2", () => {
    const r = computeCardValue(makeCard({ annual_fee_waived_first_year: true }), SPEND)
    expect(r.firstYearFee).toBe(0)
    expect(r.year1).toBe(648)                // 600 + 0 − 0 + 48
    expect(r.year2).toBe(-47)                // fee still applies in year 2
  })

  it("annualizes recurring credits by cadence for Year 2", () => {
    const r = computeCardValue(
      makeCard({ statement_credits_year1: 120, annual_credits_detail: [{ label: "Dining", amount: 10, cadence: "monthly" }] }),
      SPEND
    )
    expect(r.recurringCredits).toBe(120)     // $10/mo × 12
    expect(r.year2).toBe(73)                 // 48 + 120 − 95
  })

  it("treats an empty annual_credits_detail as one-time credits — $0 recurs", () => {
    // e.g. Marriott Bonvoy Business: $125 is a one-time welcome credit.
    const r = computeCardValue(
      makeCard({ statement_credits_year1: 125, annual_credits_detail: [] }),
      SPEND
    )
    expect(r.year1Credits).toBe(125)         // still counted in year 1
    expect(r.recurringCredits).toBe(0)       // explicit empty list → nothing recurs
    expect(r.year2).toBe(-47)                // 48 − 95, credit excluded
  })

  it("adds the 0% APR float to Year 1 only when toggled and offered", () => {
    const base = computeCardValue(makeCard({ intro_apr: { purchase_apr_months: 12 } }), SPEND)
    expect(base.hasIntroApr).toBe(true)
    expect(base.floatBenefit).toBe(0)        // toggle off → no float

    const floated = computeCardValue(makeCard({ intro_apr: { purchase_apr_months: 12 } }), SPEND, { zeroApr: true, hysaApy: 0.045 })
    expect(floated.floatBenefit).toBeGreaterThan(0)
    expect(floated.year1).toBe(base.year1 + floated.floatBenefit)
    expect(floated.year2).toBe(base.year2)   // float never touches Year 2
  })

  it("ignores the float toggle on cards without an intro-APR offer", () => {
    const r = computeCardValue(makeCard({ intro_apr: undefined }), SPEND, { zeroApr: true })
    expect(r.hasIntroApr).toBe(false)
    expect(r.floatBenefit).toBe(0)
    expect(r.floatValue).toBe(0)
  })

  it("counts the full bonus when the SUB-window spend meets the minimum (the default)", () => {
    const r = computeCardValue(makeCard(), SPEND) // min_spend 4,000; subWindowSpend defaults to it
    expect(r.minSpend).toBe(4000)
    expect(r.spendMonths).toBe(3)
    expect(r.bonusEarned).toBe(true)
    expect(r.signupBonus).toBe(600)
    expect(r.signupBonusPotential).toBe(600)
  })

  it("forfeits the bonus when the SUB-window spend falls short", () => {
    const r = computeCardValue(makeCard(), SPEND, { subWindowSpend: 1000 })
    expect(r.bonusEarned).toBe(false)
    expect(r.signupBonus).toBe(0)              // not counted
    expect(r.signupBonusPotential).toBe(600)   // but still surfaced as forfeited value
    expect(r.year1).toBe(-47)                  // 0 + 0 − 95 + 48 (no bonus)
  })

  it("treats a no-minimum-spend card as always earning the bonus", () => {
    const r = computeCardValue(makeCard({ min_spend: 0 }), SPEND, { subWindowSpend: 0 })
    expect(r.bonusEarned).toBe(true)
    expect(r.signupBonus).toBe(600)
  })

  it("prices the float from an explicit month-by-month schedule", () => {
    const card = makeCard({ intro_apr: { purchase_apr_months: 12 } })
    // All spend in month 0 floats the full 12 months at 4.5% → $12,000 × 0.045 = $540.
    const schedule = [12000, ...Array(11).fill(0)]
    const r = computeCardValue(card, SPEND, { zeroApr: true, hysaApy: 0.045, aprSchedule: schedule })
    expect(r.floatValue).toBe(540)
    expect(r.floatBenefit).toBe(540)
    // Float is computed even with the toggle off, just not folded into Year 1.
    const off = computeCardValue(card, SPEND, { hysaApy: 0.045, aprSchedule: schedule })
    expect(off.floatValue).toBe(540)
    expect(off.floatBenefit).toBe(0)
  })
})

describe("defaultAprSchedule", () => {
  it("front-loads the minimum spend across the bonus window, then $0", () => {
    expect(defaultAprSchedule(4000, 3)).toEqual([1333, 1333, 1333, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it("is all zeros when the card has no minimum spend", () => {
    expect(defaultAprSchedule(0, 3)).toEqual(Array(12).fill(0))
  })

  it("guards against a zero/missing window (no divide-by-zero)", () => {
    expect(defaultAprSchedule(4000, 0)).toEqual([1333, 1333, 1333, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})
