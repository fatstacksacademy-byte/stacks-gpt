import { describe, expect, it } from "vitest"
import { getCategorizedBonuses } from "./bonusCategories"

describe("getCategorizedBonuses", () => {
  it("keeps state-restricted offers out of public ranking groups", () => {
    const groups = getCategorizedBonuses()
    const checking = [...groups.personalChecking, ...groups.businessChecking]
    const savings = [
      ...groups.personalSavings.map(item => item.bonus),
      ...groups.businessSavings.map(item => item.bonus),
      ...groups.brokerage.map(item => item.bonus),
    ]

    expect([...checking, ...savings].every(item => item.eligibility?.state_restricted !== true)).toBe(true)
    expect(checking.some(item => item.id === "bank-of-hawaii-400-checking-2026")).toBe(false)
    expect(checking.some(item => item.id === "capital-one-360-checking-300-offer300")).toBe(true)
  })
})
