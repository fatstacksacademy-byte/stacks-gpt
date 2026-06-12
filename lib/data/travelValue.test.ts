import { describe, it, expect } from "vitest"
import {
  hasTravelValue,
  travelPerkValue,
  rankByTravelValue,
  cardTransfersTo,
  travelSummary,
  LOUNGE_VALUE,
  GLOBAL_ENTRY_ANNUAL,
} from "./travelValue"
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

describe("hasTravelValue", () => {
  it("is false when no travel block exists", () => {
    expect(hasTravelValue(card({}), "perks")).toBe(false)
    expect(hasTravelValue(card({}), "transfer")).toBe(false)
  })
  it("requires partners AND a cpp for transfer mode", () => {
    expect(hasTravelValue(card({ travel: { transfer_partners: ["United"] } }), "transfer")).toBe(false)
    expect(hasTravelValue(card({ travel: { max_transfer_cpp: 0.02 } }), "transfer")).toBe(false)
    expect(hasTravelValue(card({ travel: { transfer_partners: ["United"], max_transfer_cpp: 0.02 } }), "transfer")).toBe(true)
  })
  it("perks mode needs at least one hard-dollar perk", () => {
    expect(hasTravelValue(card({ travel: { no_foreign_tx_fee: true } }), "perks")).toBe(false)
    expect(hasTravelValue(card({ travel: { travel_credit: 300 } }), "perks")).toBe(true)
  })
})

describe("travelPerkValue", () => {
  it("sums credits, free nights, and nominal perks", () => {
    expect(travelPerkValue({ travel_credit: 300, free_night_value: 200, lounge_access: true, global_entry_credit: true }))
      .toBe(300 + 200 + LOUNGE_VALUE + GLOBAL_ENTRY_ANNUAL)
  })
  it("ignores FX-fee flag (not a dollar value)", () => {
    expect(travelPerkValue({ no_foreign_tx_fee: true })).toBe(0)
  })
})

describe("rankByTravelValue", () => {
  const reserve = card({ id: "reserve", travel: { travel_credit: 300, lounge_access: true, max_transfer_cpp: 0.02, transfer_partners: ["Hyatt"] } })
  const prefer = card({ id: "prefer", travel: { travel_credit: 50, max_transfer_cpp: 0.018, transfer_partners: ["United"] } })
  const hotel = card({ id: "hotel", travel: { free_night_value: 250 } })

  it("perks mode ranks by hard-dollar value desc", () => {
    const r = rankByTravelValue([prefer, hotel, reserve], "perks")
    expect(r.map(c => c.id)).toEqual(["reserve", "hotel", "prefer"])
  })
  it("transfer mode ranks by cpp and excludes no-partner cards", () => {
    const r = rankByTravelValue([prefer, hotel, reserve], "transfer")
    expect(r.map(c => c.id)).toEqual(["reserve", "prefer"])
  })
  it("returns empty when no card has data (ships dark until populated)", () => {
    expect(rankByTravelValue([card({}), card({})], "perks")).toEqual([])
  })
  it("excludes expired cards", () => {
    const dead = card({ id: "dead", expired: true, travel: { travel_credit: 999 } })
    expect(rankByTravelValue([dead, reserve], "perks").map(c => c.id)).toEqual(["reserve"])
  })
})

describe("cardTransfersTo", () => {
  it("matches a partner by brand name, full program name, or slug", () => {
    const c = card({ travel: { transfer_partners: ["Hyatt", "United MileagePlus", "british-airways"] } })
    expect(cardTransfersTo(c, "hyatt")).toBe(true)
    expect(cardTransfersTo(c, "united")).toBe(true)
    expect(cardTransfersTo(c, "british-airways")).toBe(true)
    expect(cardTransfersTo(c, "delta")).toBe(false)
  })
  it("is false when the card has no travel block", () => {
    expect(cardTransfersTo(card({}), "hyatt")).toBe(false)
  })
})

describe("rankByTravelValue with a program filter", () => {
  const hyattCard = card({ id: "hyatt", travel: { transfer_partners: ["World of Hyatt", "United"], max_transfer_cpp: 0.02 } })
  const deltaCard = card({ id: "delta", travel: { transfer_partners: ["Delta SkyMiles"], max_transfer_cpp: 0.012 } })

  it("keeps only cards that feed the chosen currency (transfer mode)", () => {
    const r = rankByTravelValue([hyattCard, deltaCard], "transfer", "hyatt")
    expect(r.map(c => c.id)).toEqual(["hyatt"])
  })
  it("ignores the program filter in perks mode", () => {
    const a = card({ id: "a", travel: { travel_credit: 100 } })
    const b = card({ id: "b", travel: { travel_credit: 50 } })
    expect(rankByTravelValue([a, b], "perks", "hyatt").map(c => c.id)).toEqual(["a", "b"])
  })
  it("returns empty when no card feeds the chosen currency", () => {
    expect(rankByTravelValue([deltaCard], "transfer", "hyatt")).toEqual([])
  })
})

describe("travelSummary", () => {
  it("summarizes transfer partners with cpp", () => {
    expect(travelSummary(card({ travel: { transfer_partners: ["United", "Hyatt", "Southwest", "JetBlue"], max_transfer_cpp: 0.021 } }), "transfer"))
      .toBe("up to 2.1¢/pt · transfers to United, Hyatt, Southwest +1 more")
  })
  it("summarizes perks", () => {
    expect(travelSummary(card({ travel: { travel_credit: 300, lounge_access: true, global_entry_credit: true, no_foreign_tx_fee: true } }), "perks"))
      .toBe("$300 travel credit · lounge access · Global Entry · no FX fees")
  })
})
