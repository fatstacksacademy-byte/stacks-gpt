import { describe, expect, it } from "vitest"
import { compareRecord } from "./compare"
import type { BonusRecord, Extracted } from "./types"

const baseExtracted: Extracted = {
  bonusAmount: null,
  minDirectDepositTotal: null,
  depositWindowDays: null,
  monthlyFee: null,
  rawSnippets: {
    bonusAmount: null,
    minDirectDepositTotal: null,
    depositWindowDays: null,
    monthlyFee: null,
  },
}

describe("compareRecord safeguards", () => {
  it("does not propose a lower tier as the canonical value", () => {
    const record: BonusRecord = {
      id: "tiered",
      bank_name: "Tiered Bank",
      product_type: "checking",
      bonus_amount: 500,
      tiers: [
        { bonus: 250, min_dd_total: 2500 },
        { bonus: 500, min_dd_total: 5000 },
      ],
      requirements: { min_direct_deposit_total: 5000 },
    }
    const results = compareRecord(record, {
      ...baseExtracted,
      bonusAmount: 250,
      minDirectDepositTotal: 2500,
      rawSnippets: {
        ...baseExtracted.rawSnippets,
        bonusAmount: "$250 or $500 bonus",
        minDirectDepositTotal: "$2,500 or $5,000 in direct deposits",
      },
    })

    expect(results.find((result) => result.field === "bonus_amount")?.status).toBe("ambiguous")
    expect(results.find((result) => result.field === "min_direct_deposit_total")?.status).toBe("ambiguous")
  })

  it("treats fee-waiver numbers as ambiguous", () => {
    const record: BonusRecord = {
      id: "fee-waiver",
      bank_name: "Fee Bank",
      product_type: "checking",
      requirements: { min_direct_deposit_total: 8000, deposit_window_days: 90 },
      fees: { monthly_fee: 25 },
    }
    const results = compareRecord(record, {
      ...baseExtracted,
      minDirectDepositTotal: 1500,
      monthlyFee: 1,
      depositWindowDays: 180,
      rawSnippets: {
        ...baseExtracted.rawSnippets,
        minDirectDepositTotal: "monthly maintenance fee can be waived with $1,500 in direct deposits",
        monthlyFee: "no monthly fee with $1,000 in monthly deposits",
        depositWindowDays: "if the account is closed within 6 months after account opening",
      },
    })

    expect(results.filter((result) => result.status === "ambiguous")).toHaveLength(3)
  })
})
