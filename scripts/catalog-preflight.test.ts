import { describe, expect, it } from "vitest"
import type { CreditCardBonus } from "../lib/data/creditCardBonuses"
import { auditBankBonuses, auditCreditCards } from "./catalog-preflight"

function card(overrides: Partial<CreditCardBonus>): CreditCardBonus {
  return {
    id: "card",
    card_name: "Card",
    issuer: "issuer",
    card_type: "personal",
    bonus_amount: 0,
    bonus_currency: "cash",
    is_hotel_card: false,
    cpp_value: 1,
    min_spend: 0,
    spend_months: 3,
    annual_fee: 0,
    annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    offer_link: "https://example.com/card",
    expired: false,
    key_benefits: [],
    ...overrides,
  }
}

describe("catalog preflight", () => {
  it("flags risky credit-card metadata", () => {
    const issues = auditCreditCards([
      card({
        bonus_amount: 100,
        annual_fee_waived_first_year: true,
        offer_link: "https://example.com/business/business-credit-card",
        intro_apr: { bt_apr_months: 15 },
      }),
    ])

    expect(issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining([
      "zero_fee_marked_waived",
      "positive_bonus_zero_spend",
      "personal_card_business_url",
      "balance_transfer_fee_missing",
    ]))
  })

  it("flags a genuine same-product duplicate at one URL", () => {
    const issues = auditCreditCards([
      card({ id: "one", card_name: "Acme Gold", offer_link: "https://example.com/gold" }),
      card({ id: "two", card_name: "Acme Gold Card", offer_link: "https://example.com/gold/" }),
    ])
    expect(issues.filter((issue) => issue.kind === "duplicate_active_offer_url")).toHaveLength(2)
  })

  it("does NOT flag distinct products sharing one family landing page", () => {
    const family = "https://cu.example.com/credit-cards"
    const issues = auditCreditCards([
      card({ id: "classic", card_name: "CU Visa Classic", offer_link: family }),
      card({ id: "gold", card_name: "CU Visa Gold", offer_link: family }),
      card({ id: "platinum", card_name: "CU Visa Platinum", offer_link: family }),
      card({ id: "platinum-rewards", card_name: "CU Visa Platinum Rewards", offer_link: family }),
      card({ id: "secured", card_name: "CU Visa Secured", offer_link: family }),
    ])
    expect(issues.filter((issue) => issue.kind === "duplicate_active_offer_url")).toHaveLength(0)
  })

  it("does NOT conflate a personal and business card of the same name", () => {
    const url = "https://issuer.example.com/rewards"
    const issues = auditCreditCards([
      card({ id: "personal", card_name: "Rewards", card_type: "personal", offer_link: url }),
      card({ id: "business", card_name: "Rewards Business", card_type: "business", offer_link: url }),
    ])
    expect(issues.filter((issue) => issue.kind === "duplicate_active_offer_url")).toHaveLength(0)
  })

  it("flags stale and weak bank records", () => {
    const issues = auditBankBonuses([
      {
        id: "bank",
        expiration_date: "2026-01-01",
        requirements: { other_requirements_text: "Apply by 01/01/2026." },
        source_links: ["https://example.com/"],
      },
      { id: "bank", source_links: ["https://example.com/offer"] },
    ], new Date("2026-06-12T12:00:00Z"))

    expect(issues.map((issue) => issue.kind)).toEqual(expect.arrayContaining([
      "active_expiration_in_past",
      "stale_deadline_in_copy",
      "generic_sources_only",
      "duplicate_active_id",
    ]))
  })
})
