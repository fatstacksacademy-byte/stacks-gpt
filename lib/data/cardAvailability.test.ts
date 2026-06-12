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

describe("nationwide regional catalog", () => {
  const ALL_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI",
    "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
    "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
    "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
    "WV", "WI", "WY",
  ]

  const regional = creditCardBonuses.filter(c => !c.expired && c.state_restricted?.length)

  it("has globally unique ids across the entire live catalog", () => {
    const live = creditCardBonuses.filter(c => !c.expired)
    const ids = live.map(c => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toEqual([])
  })

  it("gives every state + DC at least one verified regional card", () => {
    for (const st of ALL_STATES) {
      const local = stateSpecificCards(creditCardBonuses, st)
      expect(local.length, `no regional cards for ${st}`).toBeGreaterThan(0)
    }
  })

  it("requires full eligibility provenance on every regional card", () => {
    for (const c of regional) {
      expect(c.eligibility_notes, `${c.id} missing eligibility_notes`).toBeTruthy()
      expect(c.eligibility_source?.startsWith("https://"), `${c.id} bad eligibility_source`).toBe(true)
      expect(c.offer_link.startsWith("https://"), `${c.id} bad offer_link`).toBe(true)
      expect(c.offer_verified_at, `${c.id} missing offer_verified_at`).toBeTruthy()
    }
  })

  it("hides all regional cards when no state is chosen", () => {
    const noState = cardsForState(creditCardBonuses, null)
    expect(noState.some(c => c.state_restricted?.length)).toBe(false)
  })

  it("excludes expired cards from state results", () => {
    for (const st of ["CA", "TX", "NY", "MA"]) {
      expect(stateSpecificCards(creditCardBonuses, st).every(c => !c.expired)).toBe(true)
    }
  })

  it("surfaces representative regional issuers across regions", () => {
    const has = (st: string, issuer: string) =>
      stateSpecificCards(creditCardBonuses, st).some(c => c.issuer === issuer)
    // West / Mountain / Midwest / South / Mid-Atlantic / New England
    expect(has("CO", "ent")).toBe(true)
    expect(has("FL", "vystar")).toBe(true)
    expect(has("MA", "metro-cu-ma")).toBe(true)
    expect(has("CT", "american-eagle-fcu")).toBe(true)
    expect(has("ME", "bangor-savings-bank")).toBe(true)
    expect(has("VT", "vermont-federal-cu")).toBe(true)
  })

  it("shows nationwide plus regional cards when a state is selected", () => {
    const maCards = cardsForState(creditCardBonuses, "MA")
    expect(maCards.some(c => !c.state_restricted?.length)).toBe(true) // nationwide present
    expect(maCards.some(c => c.state_restricted?.includes("MA"))).toBe(true) // regional present
  })

  it("respects multi-state field-of-membership on shared cards", () => {
    // BrightBridge serves MA/CT/NH/RI; Bangor everblue serves ME/NH.
    const bb = creditCardBonuses.find(c => c.id === "brightbridge-visa-cash-back")
    expect(bb?.state_restricted).toEqual(["MA", "CT", "NH", "RI"])
    for (const st of ["MA", "CT", "NH", "RI"]) {
      expect(availableInState(bb!, st)).toBe(true)
    }
    expect(availableInState(bb!, "CA")).toBe(false)
  })
})
