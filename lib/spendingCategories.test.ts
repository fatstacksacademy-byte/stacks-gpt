import { describe, expect, it } from "vitest"
import {
  SPENDING_CATEGORIES,
  SPENDING_CATEGORIES_PRIMARY,
  SPENDING_CATEGORY_BY_KEY,
  SPENDING_TO_CATALOG_TOKENS,
} from "./spendingCategories"

describe("spending categories", () => {
  it("keeps every category uniquely addressable", () => {
    expect(new Set(SPENDING_CATEGORIES).size).toBe(SPENDING_CATEGORIES.length)
    expect(Object.keys(SPENDING_CATEGORY_BY_KEY)).toHaveLength(SPENDING_CATEGORIES.length)
  })

  it("separates direct travel from issuer portal rewards", () => {
    expect(SPENDING_TO_CATALOG_TOKENS.hotels_direct).toContain("hotels")
    expect(SPENDING_TO_CATALOG_TOKENS.hotels_direct).not.toContain("hotels_(portal)")
    expect(SPENDING_TO_CATALOG_TOKENS.hotels_portal).toContain("hotels_(portal)")
    expect(SPENDING_CATEGORY_BY_KEY.hotels_portal.portalOnly).toBe(true)
  })

  it("keeps the default form compact", () => {
    expect(SPENDING_CATEGORIES_PRIMARY).toHaveLength(7)
    expect(SPENDING_CATEGORIES.length).toBeGreaterThan(35)
  })
})
