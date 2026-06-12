import { describe, it, expect } from "vitest"
import {
  hasIntroApr,
  rankByIntroApr,
  balanceTransferCost,
  introAprSummary,
} from "./introApr"
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

describe("hasIntroApr", () => {
  it("is false when no intro_apr block exists", () => {
    expect(hasIntroApr(card({}), "balance_transfer")).toBe(false)
    expect(hasIntroApr(card({}), "purchases")).toBe(false)
  })
  it("distinguishes BT vs purchase offers", () => {
    const btOnly = card({ intro_apr: { bt_apr_months: 21 } })
    expect(hasIntroApr(btOnly, "balance_transfer")).toBe(true)
    expect(hasIntroApr(btOnly, "purchases")).toBe(false)
  })
})

describe("balanceTransferCost", () => {
  it("computes the upfront BT fee", () => {
    const c = card({ intro_apr: { bt_apr_months: 18, bt_fee_pct: 3 } })
    expect(balanceTransferCost(c, 5000)).toBe(150)
  })
  it("returns null for purchase-only cards", () => {
    const c = card({ intro_apr: { purchase_apr_months: 15 } })
    expect(balanceTransferCost(c, 5000)).toBeNull()
  })
})

describe("rankByIntroApr", () => {
  const long = card({ id: "long", intro_apr: { bt_apr_months: 21, bt_fee_pct: 3 } })
  const short = card({ id: "short", intro_apr: { bt_apr_months: 15, bt_fee_pct: 3 } })
  const lowFee = card({ id: "lowfee", intro_apr: { bt_apr_months: 21, bt_fee_pct: 0 } })
  const purchase = card({ id: "purchase", intro_apr: { purchase_apr_months: 12 } })

  it("orders by longest window, then lowest fee", () => {
    const r = rankByIntroApr([short, long, lowFee], "balance_transfer")
    expect(r.map(c => c.id)).toEqual(["lowfee", "long", "short"])
  })
  it("excludes cards without the relevant offer", () => {
    const r = rankByIntroApr([long, purchase], "balance_transfer")
    expect(r.map(c => c.id)).toEqual(["long"])
  })
  it("returns empty when no card has data (ships dark until populated)", () => {
    expect(rankByIntroApr([card({}), card({})], "purchases")).toEqual([])
  })
  it("excludes expired cards", () => {
    const dead = card({ id: "dead", expired: true, intro_apr: { bt_apr_months: 30 } })
    expect(rankByIntroApr([dead, long], "balance_transfer").map(c => c.id)).toEqual(["long"])
  })
})

describe("introAprSummary", () => {
  it("summarizes a BT offer with fee", () => {
    expect(introAprSummary(card({ intro_apr: { bt_apr_months: 21, bt_fee_pct: 3 } }), "balance_transfer"))
      .toBe("21mo 0% on transfers · 3% fee")
  })
  it("summarizes a purchase offer", () => {
    expect(introAprSummary(card({ intro_apr: { purchase_apr_months: 15 } }), "purchases"))
      .toBe("15mo 0% on purchases")
  })
})
