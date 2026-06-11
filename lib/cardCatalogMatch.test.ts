import { describe, it, expect } from "vitest"
import { matchStatementCardToCatalog } from "./cardCatalogMatch"
import { buildCatalogFlat } from "./spreadsheetImport"

const cards = buildCatalogFlat().filter(c => c.type === "credit_card")

describe("matchStatementCardToCatalog", () => {
  it("has credit cards in the catalog to match against (sanity)", () => {
    expect(cards.length).toBeGreaterThan(0)
  })

  it("matches a real catalog card fed its own label", () => {
    const sample = cards[0]
    const m = matchStatementCardToCatalog(sample.label)
    expect(m).not.toBeNull()
    expect(m!.catalogId).toBe(sample.id)
    expect(m!.confidence).toBeGreaterThanOrEqual(0.78)
  })

  it("matches an issuer+product name without the catalog's parenthetical", () => {
    // Labels look like "Chase Sapphire Reserve (chase)"; the importer produces
    // "Chase Sapphire Reserve". Strip the parenthetical and re-match.
    const sample = cards[0]
    const bareName = sample.label.replace(/\s*\([^)]*\)\s*$/, "")
    const m = matchStatementCardToCatalog(bareName)
    expect(m?.catalogId).toBe(sample.id)
  })

  it("ignores the importer's '(0% promo)' suffix when matching", () => {
    const sample = cards[0]
    const bareName = sample.label.replace(/\s*\([^)]*\)\s*$/, "")
    const m = matchStatementCardToCatalog(`${bareName} (0% promo)`)
    expect(m?.catalogId).toBe(sample.id)
  })

  it("returns null for an unrecognized card", () => {
    expect(matchStatementCardToCatalog("Zzyzx Imaginary Bank Ultra Card")).toBeNull()
  })

  it("returns null for empty / whitespace input", () => {
    expect(matchStatementCardToCatalog("")).toBeNull()
    expect(matchStatementCardToCatalog("   ")).toBeNull()
  })

  it("respects a higher threshold (a borderline match drops out)", () => {
    // An impossibly high threshold should reject everything.
    const sample = cards[0]
    expect(matchStatementCardToCatalog(sample.label, 1.01)).toBeNull()
  })
})
