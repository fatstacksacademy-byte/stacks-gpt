import { describe, it, expect } from "vitest"
import {
  hasTravelValue,
  travelPerkValue,
  rankByTravelValue,
  cardTransfersTo,
  travelSummary,
  transferKind,
  travelTransferCpp,
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

describe("indirect transfer earners (pooling)", () => {
  // A no-fee Chase Ink: earns Ultimate Rewards but never opted into transfers.
  const inkCash = card({ id: "ink", card_name: "Ink Cash", bonus_currency: "Ultimate Rewards" })
  // A premium UR card that does transfer to Hyatt directly.
  const inkPreferred = card({ id: "pref", card_name: "Ink Preferred", bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["Hyatt", "United"] } })

  it("classifies a UR earner as indirect for Hyatt", () => {
    expect(transferKind(inkCash, "hyatt")).toBe("indirect")
    expect(transferKind(inkPreferred, "hyatt")).toBe("direct")
  })
  it("is null for a program the currency can't reach", () => {
    expect(transferKind(inkCash, "delta")).toBeNull() // Chase UR doesn't do Delta
  })
  it("is null when the currency isn't transferable at all", () => {
    expect(transferKind(card({ bonus_currency: "cash" }), "hyatt")).toBeNull()
  })
  it("includes indirect earners in the program list, ranked below direct cards", () => {
    const r = rankByTravelValue([inkCash, inkPreferred], "transfer", "hyatt")
    expect(r.map(c => c.id)).toEqual(["pref", "ink"])
  })
  it("values an indirect earner at the currency's per-point worth", () => {
    // Chase UR → Hyatt is 1:1 at 1.55¢ → $0.0155/pt
    expect(travelTransferCpp(inkCash, "hyatt")).toBeCloseTo(0.0155, 6)
  })
  it("summarizes the pooling requirement", () => {
    expect(travelSummary(inkCash, "transfer", "hyatt"))
      .toBe("1.6¢/pt to World of Hyatt when pooled into a premium Chase card (Sapphire or Ink Preferred)")
  })
  it("suppresses an indirect twin when a same-named direct card exists (dup-catalog guard)", () => {
    // Duplicate catalog entries: one Sapphire carries transfer_partners (direct),
    // the twin doesn't (would classify indirect). The finder must not list the
    // same card twice with conflicting 'pool to transfer' advice.
    const direct = card({ id: "csp1", card_name: "Chase Sapphire Preferred", bonus_currency: "Ultimate Rewards", travel: { transfer_partners: ["Hyatt"] } })
    const twin = card({ id: "csp2", card_name: "Chase Sapphire Preferred", bonus_currency: "Ultimate Rewards" })
    const r = rankByTravelValue([twin, direct], "transfer", "hyatt")
    expect(r.map(c => c.id)).toEqual(["csp1"])
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
