import { describe, it, expect } from "vitest"
import {
  estimateCard,
  rankCardsForSpend,
  signupYearOneValue,
  type SpendInput,
} from "./cardSpendValue"
import type { CreditCardBonus } from "./creditCardBonuses"

function card(partial: Partial<CreditCardBonus>): CreditCardBonus {
  return {
    id: "x",
    card_name: "Test",
    issuer: "test",
    card_type: "personal",
    bonus_amount: 0,
    bonus_currency: "points",
    is_hotel_card: false,
    cpp_value: 0.01,
    min_spend: 0,
    spend_months: 3,
    annual_fee: 0,
    annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    offer_link: "",
    expired: false,
    key_benefits: [],
    ...partial,
  }
}

const noSpend: SpendInput = { groceries: 0, gas: 0, dining: 0, travel: 0, online: 0, other: 0 }

describe("estimateCard", () => {
  it("values a category multiplier through cpp", () => {
    // 5x groceries @ 1cpp on $500/mo = $500*12*5*0.01 = $300/yr
    const c = card({ rewards: [{ categories: ["groceries"], multiplier: 5 }, { categories: ["all_other"], multiplier: 1 }] })
    const e = estimateCard(c, { ...noSpend, groceries: 500 })
    expect(e.breakdown.groceries).toBe(300)
    expect(e.annualRewards).toBe(300)
  })

  it("falls back to the base (all_other) rate for unbucketed spend", () => {
    const c = card({ rewards: [{ categories: ["all_other"], multiplier: 2 }] })
    const e = estimateCard(c, { ...noSpend, other: 1000 })
    // $1000*12*2*0.01 = $240
    expect(e.breakdown.other).toBe(240)
  })

  it("applies an annual cap, dropping overflow to base rate", () => {
    // 6x groceries capped at $6000/yr, base 1x. Spend $1000/mo = $12000/yr.
    const c = card({
      cpp_value: 0.01,
      rewards: [
        { categories: ["groceries"], multiplier: 6, annual_cap: 6000 },
        { categories: ["all_other"], multiplier: 1 },
      ],
    })
    const e = estimateCard(c, { ...noSpend, groceries: 1000 })
    // 6000*0.06 + 6000*0.01 = 360 + 60 = 420
    expect(e.breakdown.groceries).toBe(420)
  })

  it("normalizes cashback cards (cpp_value: 1, multiplier as percent)", () => {
    // Real catalog shape: cash card stores cpp 1 + multiplier 5 meaning 5% back.
    // Must NOT compute 5 * 1 = $5/$ ($36k on $7.2k spend).
    const c = card({
      bonus_currency: "cash",
      cpp_value: 1,
      rewards: [{ categories: ["groceries"], multiplier: 5 }, { categories: ["all_other"], multiplier: 1 }],
    })
    const e = estimateCard(c, { ...noSpend, groceries: 600 })
    // $600*12 = $7200 * 5% = $360
    expect(e.breakdown.groceries).toBe(360)
  })

  it("handles percent-cashback cards without cpp", () => {
    const c = card({ rewards: [{ categories: ["all_other"], multiplier: 2, unit: "%" }] })
    const e = estimateCard(c, { ...noSpend, other: 1000 })
    // $12000 * 2% = $240
    expect(e.breakdown.other).toBe(240)
  })

  it("nets out the annual fee", () => {
    const c = card({ annual_fee: 95, rewards: [{ categories: ["dining"], multiplier: 4 }, { categories: ["all_other"], multiplier: 1 }] })
    const e = estimateCard(c, { ...noSpend, dining: 250 })
    // 250*12*4*0.01 = 120 rewards; net = 120 - 95 = 25
    expect(e.annualRewards).toBe(120)
    expect(e.netAnnual).toBe(25)
  })
})

describe("signupYearOneValue", () => {
  it("combines points, credits, and fee", () => {
    const c = card({ bonus_amount: 60000, cpp_value: 0.01, statement_credits_year1: 100, annual_fee: 95 })
    // 600 + 100 - 95 = 605
    expect(signupYearOneValue(c)).toBe(605)
  })
  it("ignores a waived first-year fee", () => {
    const c = card({ bonus_amount: 50000, cpp_value: 0.01, annual_fee: 95, annual_fee_waived_first_year: true })
    expect(signupYearOneValue(c)).toBe(500)
  })
})

describe("rankCardsForSpend", () => {
  const grocer = card({ id: "grocer", rewards: [{ categories: ["groceries"], multiplier: 6 }, { categories: ["all_other"], multiplier: 1 }] })
  const diner = card({ id: "diner", bonus_amount: 90000, cpp_value: 0.01, rewards: [{ categories: ["dining"], multiplier: 4 }, { categories: ["all_other"], multiplier: 1 }] })

  it("ranks by net ongoing rewards for a grocery-heavy profile", () => {
    const r = rankCardsForSpend([grocer, diner], { ...noSpend, groceries: 800 })
    expect(r[0].card.id).toBe("grocer")
  })

  it("first_year mode lets a big signup bonus win", () => {
    const r = rankCardsForSpend([grocer, diner], { ...noSpend, groceries: 800 }, "first_year")
    // diner has a 90k ($900) signup that outweighs grocer's ongoing edge
    expect(r[0].card.id).toBe("diner")
  })

  it("excludes expired cards", () => {
    const dead = card({ id: "dead", expired: true, rewards: [{ categories: ["all_other"], multiplier: 9 }] })
    const r = rankCardsForSpend([dead, grocer], { ...noSpend, other: 1000 })
    expect(r.find(e => e.card.id === "dead")).toBeUndefined()
  })
})
