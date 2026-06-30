import { describe, it, expect } from "vitest"
import { feeGuidance } from "./bonusFees"

// First Hawaiian Priority: $15/mo (waived at $6,000), $75 early-closure within 180 days.
const FH = { monthly_fee: 15, monthly_fee_waiver_balance: 6000, early_closure_fee: 75, early_closure_fee_days: 180 }

describe("feeGuidance — early closure", () => {
  it("computes a concrete keep-open date from the open date + window", () => {
    const g = feeGuidance(FH, { openDateISO: "2026-07-01" })
    expect(g.keepOpenDays).toBe(180)
    expect(g.keepOpenUntil).toBe("2026-12-28")
    expect(g.lines[0]).toContain("Keep the account open until 2026-12-28")
    expect(g.lines[0]).toContain("$75")
  })

  it("falls back to days-only when no open date is given", () => {
    const g = feeGuidance(FH)
    expect(g.keepOpenUntil).toBeNull()
    expect(g.lines[0]).toContain("180 days")
  })

  it("flags an unknown window when the fee exists but no days are set", () => {
    const g = feeGuidance({ early_closure_fee: 50 })
    expect(g.keepOpenDays).toBeNull()
    expect(g.lines[0]).toMatch(/doesn't publish the window/)
  })
})

describe("feeGuidance — monthly fee minimizer (net cost vs HYSA)", () => {
  it("recommends parking the waiver balance when it's cheaper than the fees", () => {
    // 180 days ≈ 6 months × $15 = $90 in fees; $6,000 @ 4% for 6 months ≈ $120 carry cost.
    // Carry cost ($120) > fees ($90) → it should tell you to just pay the fee.
    const g = feeGuidance(FH, { hysaApy: 0.04 })
    expect(g.monthsHeld).toBe(6)
    expect(g.feesIfNoBalance).toBe(90)
    expect(Math.round(g.carryCostIfWaiverBalance!)).toBe(120)
    expect(g.lines.some(l => l.includes("Just pay"))).toBe(true)
  })

  it("recommends the waiver balance when parking it is cheaper than the fees", () => {
    // Small waiver balance, big fee → parking is worth it.
    const g = feeGuidance(
      { monthly_fee: 25, monthly_fee_waiver_balance: 500, early_closure_fee: 0 },
      { hysaApy: 0.04, monthsHeld: 6 },
    )
    expect(g.feesIfNoBalance).toBe(150)            // $25 × 6
    expect(Math.round(g.carryCostIfWaiverBalance!)).toBe(10) // $500 @ 4% × 0.5y
    expect(g.lines.some(l => l.startsWith("Leave $500"))).toBe(true)
  })

  it("says no extra cash needed when the fee is already waived by the bonus balance", () => {
    const g = feeGuidance({ monthly_fee: 15, monthly_fee_waived: true })
    expect(g.recommendedBalance).toBeNull()
    expect(g.lines[0]).toMatch(/waived while you hold the bonus balance/)
  })
})

describe("feeGuidance — empty/no-fee", () => {
  it("returns no guidance for a fee-free account", () => {
    const g = feeGuidance({ monthly_fee: 0, early_closure_fee: 0 })
    expect(g.hasGuidance).toBe(false)
    expect(g.lines).toHaveLength(0)
  })

  it("handles null/undefined fees safely", () => {
    expect(feeGuidance(null).hasGuidance).toBe(false)
    expect(feeGuidance(undefined).lines).toEqual([])
  })
})
