import { describe, it, expect } from "vitest"
import {
  currencyKey,
  resolveTransfers,
  bestTransferCpp,
  programValueDollars,
  CURRENCY_PARTNERS,
} from "./transferPartners"
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

describe("currencyKey", () => {
  it("maps the five transferable bank currencies", () => {
    expect(currencyKey("Membership Rewards")).toBe("amex")
    expect(currencyKey("Ultimate Rewards")).toBe("chase")
    expect(currencyKey("ThankYou Points")).toBe("citi")
    expect(currencyKey("Capital One miles")).toBe("capone")
    expect(currencyKey("Bilt Points")).toBe("bilt")
  })
  it("returns null for co-brand / unknown currencies", () => {
    expect(currencyKey("AAdvantage miles")).toBeNull()
    expect(currencyKey("BofA points")).toBeNull()
    expect(currencyKey("points")).toBeNull()
    expect(currencyKey(undefined)).toBeNull()
  })
})

describe("resolveTransfers — authoritative currency lists", () => {
  it("Chase no longer transfers to Emirates and now includes Wyndham", () => {
    const chase = card({ bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["stale"] } })
    const slugs = resolveTransfers(chase).map(t => t.program)
    expect(slugs).not.toContain("emirates")
    expect(slugs).toContain("wyndham")
    expect(slugs).toContain("hyatt")
  })
  it("Bilt transfers to Alaska and Hyatt (Atmos partnership)", () => {
    const bilt = card({ bonus_currency: "Bilt Points", travel: { transfer_partners: ["stale"] } })
    const slugs = resolveTransfers(bilt).map(t => t.program)
    expect(slugs).toContain("alaska")
    expect(slugs).toContain("hyatt")
  })
  it("ignores the stale inline list when the currency is known", () => {
    // Inline says Emirates, but Chase's authoritative set doesn't include it.
    const chase = card({ bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["emirates"], max_transfer_cpp: 0.05 } })
    expect(resolveTransfers(chase).map(t => t.program)).not.toContain("emirates")
  })
  it("requires the inline opt-in signal (co-brand cards on a flexible currency don't transfer)", () => {
    const freedom = card({ bonus_currency: "Ultimate Rewards" }) // no travel.transfer_partners
    expect(resolveTransfers(freedom)).toEqual([])
    expect(bestTransferCpp(freedom)).toBe(0)
  })
})

describe("per-program valuation", () => {
  it("values a point into a specific program by ratio × program worth", () => {
    // Amex → Hilton is 1:2; Hilton is 0.35¢ → 0.7¢ per MR point.
    const amex = card({ bonus_currency: "Membership Rewards", travel: { transfer_partners: ["x"] } })
    const hilton = resolveTransfers(amex).find(t => t.program === "hilton")
    expect(hilton?.cpp).toBeCloseTo(2 * programValueDollars("hilton"), 10)
    expect(hilton?.cpp).toBeCloseTo(0.007, 10)
  })
  it("best partner for Chase is Hyatt (highest-value 1:1 partner)", () => {
    const chase = card({ bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["x"] } })
    expect(bestTransferCpp(chase)).toBeCloseTo(programValueDollars("hyatt"), 10)
  })
  it("Hyatt and Marriott no longer share one uniform card-level cpp", () => {
    const chase = card({ bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["x"] } })
    const byProgram = Object.fromEntries(resolveTransfers(chase).map(t => [t.program, t.cpp]))
    expect(byProgram.hyatt).not.toBe(byProgram.marriott)
    expect(byProgram.hyatt).toBeGreaterThan(byProgram.marriott)
  })
})

describe("data integrity", () => {
  it("every listed partner has a known valuation", () => {
    for (const [key, partners] of Object.entries(CURRENCY_PARTNERS)) {
      for (const p of partners) {
        expect(programValueDollars(p.program), `${key} → ${p.program}`).toBeGreaterThan(0)
      }
    }
  })
})
