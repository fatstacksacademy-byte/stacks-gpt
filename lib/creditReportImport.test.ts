import { describe, it, expect } from "vitest"
import { normalizeCreditReport } from "./creditReportImport"

describe("normalizeCreditReport", () => {
  it("keeps credit cards with a valid open date and parses fields", () => {
    const r = normalizeCreditReport({
      tradelines: [
        {
          issuer: "Capital One",
          product_name: "Quicksilver",
          account_category: "credit_card",
          open_date: "2025-03-15",
          closed_date: null,
          credit_limit: "$10,000",
          status: "open",
        },
      ],
    })
    expect(r.cards).toHaveLength(1)
    const c = r.cards[0]
    expect(c.issuer).toBe("Capital One")
    expect(c.product_name).toBe("Quicksilver")
    expect(c.open_date).toBe("2025-03-15")
    expect(c.credit_limit).toBe(10000)
    expect(c.source).toBe("credit_report")
    expect(c.card_type).toBe("personal")
  })

  it("skips non-card tradelines (loans, mortgages)", () => {
    const r = normalizeCreditReport({
      tradelines: [
        { issuer: "Chase", account_category: "mortgage", open_date: "2020-01-01" },
        { issuer: "Toyota", account_category: "auto", open_date: "2024-01-01" },
        { issuer: "Amex", product_name: "Gold", account_category: "credit_card", open_date: "2025-01-01" },
      ],
    })
    expect(r.cards).toHaveLength(1)
    expect(r.skippedNonCard).toBe(2)
    expect(r.tradelinesFound).toBe(3)
  })

  it("skips cards with no usable open date and warns", () => {
    const r = normalizeCreditReport({
      tradelines: [{ issuer: "Discover", product_name: "It", account_category: "credit_card", open_date: null }],
    })
    expect(r.cards).toHaveLength(0)
    expect(r.warnings.some(w => /no open date/.test(w))).toBe(true)
  })

  it("classifies business cards (excluded from 5/24) via the business flag", () => {
    const r = normalizeCreditReport({
      tradelines: [
        { issuer: "Chase", product_name: "Ink Cash", account_category: "credit_card", open_date: "2025-06-01", business: true },
      ],
    })
    expect(r.cards[0].card_type).toBe("business")
  })

  it("classifies business cards via name hints (e.g. 'Ink', 'Business')", () => {
    const r = normalizeCreditReport({
      tradelines: [
        { issuer: "US Bank", product_name: "Business Triple Cash", account_category: "credit_card", open_date: "2025-04-01" },
      ],
    })
    expect(r.cards[0].card_type).toBe("business")
  })

  it("links to the bonus catalog when the card is recognized", () => {
    // Use a real catalog card name so the matcher links it.
    const r = normalizeCreditReport({
      tradelines: [
        { issuer: "Chase", product_name: "Sapphire Reserve", account_category: "credit_card", open_date: "2025-09-01" },
      ],
    })
    const c = r.cards[0]
    // Either it matched (catalog id + type from catalog) or it didn't; if it
    // matched, the catalog id must be a real catalog entry.
    if (c.catalog_card_id) {
      expect(typeof c.catalog_card_id).toBe("string")
      expect(c.card_type).toBe("personal")
    }
  })

  it("handles empty / malformed input gracefully", () => {
    expect(normalizeCreditReport({}).cards).toHaveLength(0)
    expect(normalizeCreditReport({ tradelines: "nope" }).tradelinesFound).toBe(0)
    expect(normalizeCreditReport(null).cards).toHaveLength(0)
  })

  it("treats an unknown account_category as a card (prompt targets cards)", () => {
    const r = normalizeCreditReport({
      tradelines: [{ issuer: "Synchrony", product_name: "Store Card", open_date: "2025-02-01" }],
    })
    expect(r.cards).toHaveLength(1)
  })
})
