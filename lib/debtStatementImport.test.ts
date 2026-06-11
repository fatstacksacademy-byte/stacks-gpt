import { describe, it, expect } from "vitest"
import {
  normalizeStatementExtraction,
  percentToDecimal,
} from "./debtStatementImport"

describe("percentToDecimal", () => {
  it("converts percents to decimals and passes through decimals", () => {
    expect(percentToDecimal(24.99)).toBeCloseTo(0.2499, 6)
    expect(percentToDecimal("29.99%")).toBeCloseTo(0.2999, 6)
    expect(percentToDecimal(0)).toBe(0)
    expect(percentToDecimal(0.2499)).toBeCloseTo(0.2499, 6) // already a decimal
  })
  it("rejects junk and implausibly high rates", () => {
    expect(percentToDecimal(null)).toBeNull()
    expect(percentToDecimal("n/a")).toBeNull()
    expect(percentToDecimal(-5)).toBeNull()
    expect(percentToDecimal(250)).toBeNull() // 250% -> 2.5 decimal, implausible
  })
})

describe("normalizeStatementExtraction", () => {
  it("normalizes a plain revolving card", () => {
    const r = normalizeStatementExtraction({
      accounts: [
        {
          issuer: "Chase",
          product_name: "Freedom Unlimited",
          statement_balance: "$4,250.00",
          purchase_apr_pct: 24.99,
          minimum_payment_due: 105,
          credit_limit: 9000,
        },
      ],
    })
    expect(r.debts).toHaveLength(1)
    const d = r.debts[0]
    expect(d.kind).toBe("credit_card")
    expect(d.name).toBe("Chase Freedom Unlimited")
    expect(d.balance).toBe(4250)
    expect(d.apr).toBeCloseTo(0.2499, 6)
    expect(d.minPayment).toBe(105)
    expect(d.creditLimit).toBe(9000)
  })

  it("splits a promo sub-balance into two correctly-rated entries", () => {
    const r = normalizeStatementExtraction(
      {
        accounts: [
          {
            issuer: "Citi",
            product_name: "Diamond",
            statement_balance: 10000,
            purchase_apr_pct: 26.99,
            minimum_payment_due: 200,
            promo_apr_pct: 0,
            promo_balance: 4000,
            promo_expiration: "2027-01-31",
            post_promo_apr_pct: 26.99,
          },
        ],
      },
      "imp",
    )
    expect(r.debts).toHaveLength(2)
    const promo = r.debts.find(d => d.name.includes("promo"))!
    const revolving = r.debts.find(d => !d.name.includes("promo"))!
    // Principal is conserved across the split.
    expect(promo.balance + revolving.balance).toBe(10000)
    expect(promo.balance).toBe(4000)
    expect(revolving.balance).toBe(6000)
    // Promo entry carries the 0% rate + expiration; revolving carries 26.99%.
    expect(promo.promoApr).toBe(0)
    expect(promo.promoEndsOn).toBe("2027-01-31")
    expect(revolving.apr).toBeCloseTo(0.2699, 6)
    // Deterministic ids from the prefix.
    expect(promo.id.startsWith("imp-")).toBe(true)
    expect(r.warnings.some(w => /split/.test(w))).toBe(true)
  })

  it("models a whole-balance promo as one entry with promo fields", () => {
    const r = normalizeStatementExtraction({
      accounts: [
        {
          issuer: "Wells Fargo",
          product_name: "Reflect",
          statement_balance: 8000,
          purchase_apr_pct: 27.99,
          minimum_payment_due: 80,
          promo_apr_pct: 0,
          promo_expiration: "2027-06-30",
          post_promo_apr_pct: 27.99,
        },
      ],
    })
    expect(r.debts).toHaveLength(1)
    const d = r.debts[0]
    expect(d.balance).toBe(8000)
    expect(d.promoApr).toBe(0)
    expect(d.promoEndsOn).toBe("2027-06-30")
    expect(d.apr).toBeCloseTo(0.2799, 6)
  })

  it("estimates a missing minimum payment and warns", () => {
    const r = normalizeStatementExtraction({
      accounts: [{ issuer: "Amex", statement_balance: 3000, purchase_apr_pct: 22 }],
    })
    expect(r.debts[0].minPayment).toBe(Math.max(25, 30)) // 1% of 3000 = 30
    expect(r.warnings.some(w => /minimum payment estimated/.test(w))).toBe(true)
  })

  it("flags a missing APR but still produces a valid (apr=0) entry to edit", () => {
    const r = normalizeStatementExtraction({
      accounts: [{ issuer: "Store", statement_balance: 500 }],
    })
    expect(r.debts).toHaveLength(1)
    expect(r.debts[0].apr).toBe(0)
    expect(r.warnings.some(w => /APR couldn't be read/.test(w))).toBe(true)
  })

  it("ignores a promo with no valid expiration date (treats as revolving)", () => {
    const r = normalizeStatementExtraction({
      accounts: [
        {
          issuer: "X",
          statement_balance: 5000,
          purchase_apr_pct: 25,
          promo_apr_pct: 0,
          promo_balance: 2000,
          promo_expiration: "soon", // invalid
        },
      ],
    })
    expect(r.debts).toHaveLength(1)
    expect(r.debts[0].promoApr).toBeUndefined()
    expect(r.debts[0].apr).toBeCloseTo(0.25, 6)
  })

  it("skips accounts with no positive balance and warns", () => {
    const r = normalizeStatementExtraction({
      accounts: [{ issuer: "Paid Off", statement_balance: 0, purchase_apr_pct: 20 }],
    })
    expect(r.debts).toHaveLength(0)
    expect(r.accountsFound).toBe(1)
    expect(r.warnings.some(w => /skipped/.test(w))).toBe(true)
  })

  it("handles empty / malformed input gracefully", () => {
    expect(normalizeStatementExtraction({}).debts).toHaveLength(0)
    expect(normalizeStatementExtraction({ accounts: "nope" }).accountsFound).toBe(0)
    expect(normalizeStatementExtraction(null).debts).toHaveLength(0)
  })

  it("produces unique ids across multiple accounts and splits", () => {
    const r = normalizeStatementExtraction(
      {
        accounts: [
          { issuer: "A", statement_balance: 1000, purchase_apr_pct: 20 },
          {
            issuer: "B",
            statement_balance: 5000,
            purchase_apr_pct: 25,
            promo_apr_pct: 0,
            promo_balance: 2000,
            promo_expiration: "2027-03-31",
            post_promo_apr_pct: 25,
          },
        ],
      },
      "imp",
    )
    const ids = r.debts.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(["imp-0", "imp-1", "imp-2"])
  })
})
