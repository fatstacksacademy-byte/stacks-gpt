import { describe, it, expect } from "vitest"
import { sequenceCards, formatCurrency, DEFAULT_MAX_CARDS_PER_YEAR } from "./ccSequencer"
import { creditCardBonuses } from "./data/creditCardBonuses"
import { transferKind } from "./data/travelValue"

describe("formatCurrency", () => {
  it("rounds to whole dollars with thousands separators", () => {
    expect(formatCurrency(1234.56)).toBe("$1,235")
    expect(formatCurrency(0)).toBe("$0")
  })
})

describe("sequenceCards — contract against real catalog", () => {
  it("at zero monthly budget, only $0-min-spend cards remain feasible", () => {
    const sequenced = sequenceCards(creditCardBonuses, 0)
    for (const s of sequenced) {
      expect(s.card.min_spend).toBeLessThanOrEqual(0)
    }
  })

  it("respects the per-year card cap", () => {
    const sequenced = sequenceCards(creditCardBonuses, 2000, null, 3)
    const year1 = sequenced.filter(s => s.cumulative_months <= 12)
    expect(year1.length).toBeLessThanOrEqual(3)
  })

  it("excludes cards without an apply link", () => {
    const broken = [
      ...creditCardBonuses,
      { ...creditCardBonuses[0], id: "broken-no-link", offer_link: "" },
    ]
    const sequenced = sequenceCards(broken as any, 2000)
    expect(sequenced.find(s => s.card.id === "broken-no-link")).toBeUndefined()
  })

  it("never returns duplicate cards", () => {
    const sequenced = sequenceCards(creditCardBonuses, 3000, null, DEFAULT_MAX_CARDS_PER_YEAR)
    const ids = sequenced.map(s => s.card.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("orders by ascending cumulative_months", () => {
    const sequenced = sequenceCards(creditCardBonuses, 2500)
    for (let i = 1; i < sequenced.length; i++) {
      expect(sequenced[i].cumulative_months).toBeGreaterThanOrEqual(sequenced[i - 1].cumulative_months)
    }
  })

  it("travel mode produces ≥ cash-mode net value for the same input (travel cpp is upper bound)", () => {
    const cash = sequenceCards(creditCardBonuses, 3000, null, 6, false)
    const travel = sequenceCards(creditCardBonuses, 3000, null, 6, true)
    const cashTotal = cash.reduce((s, c) => s + c.net_value, 0)
    const travelTotal = travel.reduce((s, c) => s + c.net_value, 0)
    expect(travelTotal).toBeGreaterThanOrEqual(cashTotal - 1) // -1 epsilon for rounding
  })

  it("filters infeasible min-spend cards at low monthly budgets", () => {
    // At $500/mo, Amex Biz Plat ($20k/3mo) must be excluded
    const low = sequenceCards(creditCardBonuses, 500)
    const highSpendIncluded = low.some(s => s.card.min_spend >= 10000 && s.card.spend_months <= 3)
    expect(highSpendIncluded).toBe(false)
  })

  it("net_value stays within a sane multiple of the gross sign-up value", () => {
    const sequenced = sequenceCards(creditCardBonuses, 5000)
    for (const s of sequenced) {
      const gross = s.value_breakdown.welcome_bonus + s.card.statement_credits_year1
      // Sanity guard — net shouldn't exceed gross by more than a few thousand
      // (accounts for category multiplier earn during the spend window).
      expect(s.net_value).toBeLessThanOrEqual(gross + 5000)
    }
  })

  it("can rank by max bonus or return on required spend", () => {
    const base = creditCardBonuses.find(c => c.offer_link && !c.expired)!
    const cards = [
      { ...base, id: "big-bonus", card_name: "Big Bonus", bonus_amount: 500, bonus_currency: "cash", cpp_value: 1, min_spend: 5000, spend_months: 3, annual_fee: 0 },
      { ...base, id: "efficient-bonus", card_name: "Efficient Bonus", bonus_amount: 300, bonus_currency: "cash", cpp_value: 1, min_spend: 1000, spend_months: 3, annual_fee: 0 },
    ]
    expect(sequenceCards(cards, 5000, null, 4, false, null, false, null, "max_bonus")[0].card.id).toBe("big-bonus")
    expect(sequenceCards(cards, 5000, null, 4, false, null, false, null, "return_on_spend")[0].card.id).toBe("efficient-bonus")
  })

  it("travel target filters to currencies that reach the selected program", () => {
    const sequenced = sequenceCards(creditCardBonuses, 10000, null, 8, true, null, false, null, "return_on_spend", "hyatt")
    expect(sequenced.length).toBeGreaterThan(0)
    expect(sequenced.every(s => transferKind(s.card, "hyatt") !== null)).toBe(true)
  })

  it.each([
    ["united", "United"],
    ["delta", "Delta SkyMiles"],
    ["hilton", "Hilton"],
  ])("includes direct %s co-brand cards when that currency is targeted", (program, cardName) => {
    const sequenced = sequenceCards(creditCardBonuses, 10000, null, 8, true, null, false, null, "max_bonus", program)
    expect(sequenced.some(s => s.card.card_name.includes(cardName))).toBe(true)
  })

  it("values legacy cash rows at face value", () => {
    const legacyCash = creditCardBonuses.find(c => c.offer_link && !c.expired)!
    const sequenced = sequenceCards([
      { ...legacyCash, id: "legacy-cash", card_name: "Legacy Cash", bonus_amount: 200, bonus_currency: "cash", cpp_value: 0.01, min_spend: 1000, spend_months: 3, annual_fee: 0 },
    ], 1000)
    expect(sequenced[0].net_value).toBe(200)
  })
})

describe("sequenceCards — state restriction", () => {
  it("excludes cards not allowed in user's state", () => {
    const withRestriction = creditCardBonuses.map(c =>
      c.id === creditCardBonuses[0].id
        ? { ...c, state_restricted: ["CA"] }
        : c
    )
    const sequenced = sequenceCards(withRestriction as any, 3000, "NY")
    expect(sequenced.find(s => s.card.id === creditCardBonuses[0].id)).toBeUndefined()
  })
})
