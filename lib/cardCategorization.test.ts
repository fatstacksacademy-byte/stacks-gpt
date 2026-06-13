import { describe, expect, it } from "vitest"
import { cardVisibleInRewardsMode } from "./cardCategorization"

const delta = {
  card_name: "Delta SkyMiles Gold",
  bonus_currency: "miles",
  is_hotel_card: false,
}

describe("cardVisibleInRewardsMode", () => {
  it("shows airline cards in travel mode", () => {
    expect(cardVisibleInRewardsMode(delta, "travel")).toBe(true)
  })

  it("keeps airline cards out of the default cash recommendations", () => {
    expect(cardVisibleInRewardsMode(delta, "cash")).toBe(false)
  })

  it("searches the full catalog regardless of mode", () => {
    expect(cardVisibleInRewardsMode(delta, "cash", true)).toBe(true)
  })
})
