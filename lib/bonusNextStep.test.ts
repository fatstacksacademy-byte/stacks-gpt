import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import {
  daysUntil,
  urgencyFor,
  checkingBonusStep,
  customBonusStep,
  spendingCardStep,
  savingsEntryStep,
} from "./bonusNextStep"

const FIXED_TODAY = "2026-06-04"

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(FIXED_TODAY + "T12:00:00Z"))
})

afterAll(() => {
  vi.useRealTimers()
})

describe("daysUntil", () => {
  it("returns null for null input", () => {
    expect(daysUntil(null)).toBeNull()
  })
  it("returns positive days for future date", () => {
    expect(daysUntil("2026-06-11")).toBe(7)
  })
  it("returns 0 for today", () => {
    expect(daysUntil("2026-06-04")).toBe(0)
  })
  it("returns negative for past date", () => {
    expect(daysUntil("2026-06-01")).toBe(-3)
  })
})

describe("urgencyFor", () => {
  it("'none' when no deadline", () => {
    expect(urgencyFor(null)).toBe("none")
  })
  it("'overdue' when past", () => {
    expect(urgencyFor("2026-06-01")).toBe("overdue")
  })
  it("'urgent' within 7 days", () => {
    expect(urgencyFor("2026-06-08")).toBe("urgent")
  })
  it("'urgent' exactly at 7 days", () => {
    expect(urgencyFor("2026-06-11")).toBe("urgent")
  })
  it("'soon' between 8 and 30 days", () => {
    expect(urgencyFor("2026-06-20")).toBe("soon")
    expect(urgencyFor("2026-07-04")).toBe("soon")
  })
  it("'none' beyond 30 days", () => {
    expect(urgencyFor("2026-07-10")).toBe("none")
  })
})

describe("checkingBonusStep", () => {
  const ddBonus = {
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 1000,
      dd_count_required: 2,
      deposit_window_days: 90,
    },
    timeline: { bonus_posting_days_est: 120 },
  }

  it("returns DD-flavored step inside the deposit window", () => {
    const result = checkingBonusStep(
      { opened_date: "2026-06-01" } as any,
      ddBonus,
    )
    expect(result.nextStep).toMatch(/2 DDs totaling \$1,000/)
    expect(result.deadline).toBe("2026-08-30")
    expect(result.urgency).toBe("none") // 87 days out
  })

  it("urgency goes 'urgent' as deposit window closes", () => {
    const result = checkingBonusStep(
      { opened_date: "2026-03-15" } as any, // window ends 2026-06-13 (9 days)
      ddBonus,
    )
    expect(result.urgency).toBe("soon")
  })

  it("flips to bonus-posting wait once deposit window passes", () => {
    const result = checkingBonusStep(
      { opened_date: "2026-01-01" } as any, // window ended 2026-04-01
      ddBonus,
    )
    expect(result.nextStep).toMatch(/bonus to post|Bonus should have posted/)
  })

  it("returns nulls when bonus catalog row is missing", () => {
    const result = checkingBonusStep({ opened_date: "2026-06-01" } as any, null)
    expect(result).toEqual({ nextStep: null, deadline: null, urgency: "none" })
  })
})

describe("customBonusStep", () => {
  const base = {
    id: "x", user_id: "u", bank_name: "Test Bank", bonus_amount: 300,
    opened_date: "2026-06-01", closed_date: null, bonus_received: false,
    actual_amount: null, notes: null, cooldown_months: null, created_at: "",
    dd_required: true, min_dd_total: 2500, min_dd_per_deposit: null,
    dd_count_required: 1, deposit_window_days: 60, holding_period_days: 90,
  } as any

  it("'account_opened' → asks for DD with deposit deadline", () => {
    const r = customBonusStep({ ...base, current_step: "account_opened" })
    expect(r.nextStep).toMatch(/DD totaling \$2,500/)
    expect(r.deadline).toBe("2026-07-31")
    expect(r.urgency).toBe("none") // 57 days out — beyond the 30-day "soon" threshold
  })

  it("null current_step treated like account_opened", () => {
    const r = customBonusStep({ ...base, current_step: null })
    expect(r.nextStep).toMatch(/DD totaling/)
  })

  it("'requirements_met' → wait for bonus to post", () => {
    const r = customBonusStep({ ...base, current_step: "requirements_met" })
    expect(r.nextStep).toBe("Wait for bonus to post")
    expect(r.deadline).toBe("2026-08-30") // opened + 90 days
  })

  it("'bonus_posted' with remaining hold time → 'hold N more days'", () => {
    const r = customBonusStep({ ...base, current_step: "bonus_posted" })
    expect(r.nextStep).toMatch(/Hold 87 more days/)
  })

  it("'bonus_posted' past hold period → 'Safe to close'", () => {
    const r = customBonusStep({
      ...base,
      current_step: "bonus_posted",
      opened_date: "2025-01-01",
    })
    expect(r.nextStep).toBe("Safe to close")
    expect(r.urgency).toBe("none")
  })
})

describe("spendingCardStep", () => {
  it("returns spend ask with deadline + urgency", () => {
    const r = spendingCardStep({
      spend_requirement: 4000,
      spend_deadline: "2026-06-10",
    } as any)
    expect(r.nextStep).toBe("Spend $4,000")
    expect(r.deadline).toBe("2026-06-10")
    expect(r.urgency).toBe("urgent")
  })

  it("falls back to generic ask without spend requirement", () => {
    const r = spendingCardStep({
      spend_requirement: null,
      spend_deadline: "2026-06-15",
    } as any)
    expect(r.nextStep).toBe("Hit spend requirement")
  })

  it("nulls all the way down when no deadline", () => {
    const r = spendingCardStep({ spend_requirement: 4000, spend_deadline: null } as any)
    expect(r).toEqual({ nextStep: null, deadline: null, urgency: "none" })
  })
})

describe("savingsEntryStep", () => {
  it("uses explicit deadline when present", () => {
    const r = savingsEntryStep({
      deposit_required: 10000,
      deadline: "2026-09-12",
      opened_date: "2026-06-01",
      holding_period_days: 90,
    } as any)
    expect(r.nextStep).toBe("Hold $10,000 until deadline")
    expect(r.deadline).toBe("2026-09-12")
  })

  it("computes deadline from opened_date + holding period when missing", () => {
    const r = savingsEntryStep({
      deposit_required: 5000,
      deadline: null,
      opened_date: "2026-06-01",
      holding_period_days: 30,
    } as any)
    expect(r.deadline).toBe("2026-07-01")
    expect(r.urgency).toBe("soon")
  })

  it("nulls out when no deadline at all", () => {
    const r = savingsEntryStep({
      deposit_required: 5000,
      deadline: null,
      opened_date: null,
      holding_period_days: null,
    } as any)
    expect(r).toEqual({ nextStep: null, deadline: null, urgency: "none" })
  })
})
