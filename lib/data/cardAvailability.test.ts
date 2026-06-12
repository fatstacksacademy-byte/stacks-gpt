import { describe, it, expect } from "vitest"
import { availableInState, cardsForState, stateSpecificCards } from "./cardAvailability"
import { creditCardBonuses, type CreditCardBonus } from "./creditCardBonuses"

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

describe("availableInState", () => {
  it("treats cards without state_restricted as nationwide", () => {
    expect(availableInState(card({}), null)).toBe(true)
    expect(availableInState(card({}), "CA")).toBe(true)
    expect(availableInState(card({ state_restricted: [] }), null)).toBe(true)
  })
  it("hides restricted cards when no state is chosen", () => {
    expect(availableInState(card({ state_restricted: ["CA"] }), null)).toBe(false)
  })
  it("shows a restricted card only in its states", () => {
    const c = card({ state_restricted: ["CA", "NV"] })
    expect(availableInState(c, "CA")).toBe(true)
    expect(availableInState(c, "TX")).toBe(false)
  })
})

describe("cardsForState", () => {
  const nationwide = card({ id: "nat" })
  const caOnly = card({ id: "ca", state_restricted: ["CA"] })
  const txOnly = card({ id: "tx", state_restricted: ["TX"] })
  const dead = card({ id: "dead", expired: true })

  it("returns only nationwide cards when no state is set", () => {
    expect(cardsForState([nationwide, caOnly, txOnly, dead], null).map(c => c.id)).toEqual(["nat"])
  })
  it("adds the chosen state's cards to the nationwide set", () => {
    expect(cardsForState([nationwide, caOnly, txOnly], "CA").map(c => c.id)).toEqual(["nat", "ca"])
  })
})

describe("stateSpecificCards", () => {
  it("returns just the cards specific to the state", () => {
    const nationwide = card({ id: "nat" })
    const caOnly = card({ id: "ca", state_restricted: ["CA"] })
    expect(stateSpecificCards([nationwide, caOnly], "CA").map(c => c.id)).toEqual(["ca"])
    expect(stateSpecificCards([nationwide, caOnly], "TX")).toEqual([])
  })

  it("includes verified regional cards with eligibility provenance", () => {
    const regional = creditCardBonuses.filter(c => !c.expired && c.state_restricted?.length)
    expect(regional.length).toBeGreaterThanOrEqual(10)
    expect(regional.every(c => c.eligibility_notes && c.eligibility_source && c.offer_verified_at)).toBe(true)
    expect(stateSpecificCards(creditCardBonuses, "CO").some(c => c.issuer === "ent")).toBe(true)
    expect(stateSpecificCards(creditCardBonuses, "FL").some(c => c.issuer === "vystar")).toBe(true)
  })

  it("includes a broad verified Hawaii local-card catalog", () => {
    const hawaiiCards = stateSpecificCards(creditCardBonuses, "HI")
    const hawaiiIssuers = new Set(hawaiiCards.map(c => c.issuer))

    expect(hawaiiCards.length).toBeGreaterThanOrEqual(50)
    expect(hawaiiIssuers.size).toBeGreaterThanOrEqual(20)
    expect(hawaiiCards.some(c => c.id === "fhb-priority-destinations-50k")).toBe(true)
    expect(hawaiiCards.some(c => c.id === "hfs-visa-signature-30k")).toBe(true)
    expect(hawaiiCards.some(c => c.id === "hsfcu-platinum-rewards-5k")).toBe(true)
    expect(hawaiiCards.every(c => c.offer_link.startsWith("https://"))).toBe(true)
    expect(hawaiiCards.every(c => c.offer_verified_at === "2026-06-12")).toBe(true)
  })
})
