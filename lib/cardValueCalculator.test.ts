import { describe, it, expect } from "vitest"
import { computeCardValue } from "./cardValueCalculator"
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
  })
})
