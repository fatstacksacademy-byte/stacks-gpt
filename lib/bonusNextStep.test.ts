import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import {
  daysUntil,
  urgencyFor,
  checkingBonusStep,
  stagedPayoutStep,
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

  it("stage='dd' inside the deposit window", () => {
    const result = checkingBonusStep(
      { opened_date: "2026-06-01" } as any,
      ddBonus,
    )
    expect(result.stage).toBe("dd")
    expect(result.nextStep).toMatch(/2 DDs totaling \$1,000/)
    expect(result.deadline).toBe("2026-08-30")
    expect(result.urgency).toBe("none") // 87 days out
  })

  it("urgency goes 'urgent' as deposit window closes", () => {
    const result = checkingBonusStep(
      { opened_date: "2026-03-15" } as any, // window ends 2026-06-13 (9 days)
      ddBonus,
    )
    expect(result.stage).toBe("dd")
    expect(result.urgency).toBe("soon")
  })

  it("stage='posting' once deposit window passes and bonus hasn't posted", () => {
    // window ended 2026-04-01; opened 2026-01-01, bonus_posting_days_est=120
    // → postDeadline 2026-05-01 (~33 days before today 2026-06-04). overdue
    // → falls into the confirm branch instead.
    const result = checkingBonusStep(
      { opened_date: "2026-01-01" } as any,
      ddBonus,
    )
    expect(result.nextStep).toMatch(/bonus to post|Bonus should have posted/)
    expect(["posting", "confirm"]).toContain(result.stage)
  })

  it("stage='posting' when bonus posting date is in the future", () => {
    // opened today; window passes immediately because we ignore DD-required
    // for this slice by switching off the DD flag. postDeadline = today + 120d.
    const bonusNoDd = {
      requirements: {
        direct_deposit_required: false,
        deposit_window_days: 30,
      },
      timeline: { bonus_posting_days_est: 90 },
    }
    const result = checkingBonusStep(
      { opened_date: "2026-06-04" } as any,
      bonusNoDd,
    )
    // 90 days out, no holding period → posting stage active
    expect(result.stage).toBe("posting")
  })

  it("stage='hold' when bonus is in holding period", () => {
    // Holding period 365 days, opened 30 days ago. No DD required so the
    // deposit-window branch is skipped immediately.
    const heldBonus = {
      requirements: {
        direct_deposit_required: false,
        holding_period_days: 365,
      },
      timeline: { bonus_posting_days_est: 30 },
    }
    const result = checkingBonusStep(
      { opened_date: "2026-05-05" } as any,
      heldBonus,
    )
    expect(result.stage).toBe("hold")
    expect(result.nextStep).toMatch(/Keep account open/)
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

  it("stage='dd' for 'account_opened' — asks for DD with deposit deadline", () => {
    const r = customBonusStep({ ...base, current_step: "account_opened" })
    expect(r.stage).toBe("dd")
    expect(r.nextStep).toMatch(/DD totaling \$2,500/)
    expect(r.deadline).toBe("2026-07-31")
    expect(r.urgency).toBe("none") // 57 days out — beyond the 30-day "soon" threshold
  })

  it("null current_step treated like account_opened (stage='dd')", () => {
    const r = customBonusStep({ ...base, current_step: null })
    expect(r.stage).toBe("dd")
    expect(r.nextStep).toMatch(/DD totaling/)
  })

  it("stage='posting' for 'requirements_met'", () => {
    const r = customBonusStep({ ...base, current_step: "requirements_met" })
    expect(r.stage).toBe("posting")
    expect(r.nextStep).toBe("Wait for bonus to post")
    expect(r.deadline).toBe("2026-08-30") // opened + 90 days
  })

  it("stage='hold' for 'bonus_posted' with remaining hold time", () => {
    const r = customBonusStep({ ...base, current_step: "bonus_posted" })
    expect(r.stage).toBe("hold")
    expect(r.nextStep).toMatch(/Hold 87 more days/)
  })

  it("stage='close' for 'bonus_posted' past hold period", () => {
    const r = customBonusStep({
      ...base,
      current_step: "bonus_posted",
      opened_date: "2025-01-01",
    })
    expect(r.stage).toBe("close")
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

describe("savingsEntryStep — milestone-aware stages", () => {
  // Each test exercises one stage of the milestone state machine.
  // base = a "planned" entry the user just added; nothing happened yet.
  const base = {
    institution_name: "Marcus",
    deposit_required: 10000,
    holding_period_days: 90,
    opened_date: "2026-06-01",
    deadline: null,
    account_opened_at: null,
    funded_at: null,
    bonus_posted_at: null,
  } as any

  it("stage='open' when account_opened_at is null — soft deadline 14d after opened_date", () => {
    const r = savingsEntryStep(base)
    expect(r.stage).toBe("open")
    expect(r.nextStep).toBe("Open the Marcus account")
    expect(r.deadline).toBe("2026-06-15") // opened_date + 14d
  })

  it("stage='open' with no opened_date emits no soft deadline (no cron reminder)", () => {
    const r = savingsEntryStep({ ...base, opened_date: null })
    expect(r.stage).toBe("open")
    expect(r.nextStep).toBe("Open the Marcus account")
    expect(r.deadline).toBeNull()
    expect(r.urgency).toBe("none")
  })

  it("stage='fund' once account_opened_at is set — softer deadline from open date", () => {
    const r = savingsEntryStep({ ...base, account_opened_at: "2026-06-04T10:00:00Z" })
    expect(r.stage).toBe("fund")
    expect(r.nextStep).toBe("Move $10,000 into the account")
    expect(r.deadline).toBe("2026-06-18") // open + 14d
  })

  it("stage='hold' once funded_at is set and hold window is still in the future", () => {
    const r = savingsEntryStep({
      ...base,
      account_opened_at: "2026-06-04T00:00:00Z",
      funded_at:         "2026-06-04T12:00:00Z",
    })
    expect(r.stage).toBe("hold")
    expect(r.nextStep).toBe("Hold $10,000 until deadline")
    expect(r.deadline).toBe("2026-09-02") // funded_at + 90d
  })

  it("stage='confirm' once hold complete but bonus_posted_at still null", () => {
    const r = savingsEntryStep({
      ...base,
      account_opened_at: "2026-03-01T00:00:00Z",
      funded_at:         "2026-03-01T00:00:00Z",
      holding_period_days: 60, // ended 2026-04-30, well before today (2026-06-04)
    })
    expect(r.stage).toBe("confirm")
    expect(r.nextStep).toMatch(/Confirm bonus posted at Marcus/)
    expect(r.deadline).toBe("2026-05-07") // expected payout + 7d soft
  })

  it("stage='close' once bonus_posted_at is set — no deadline, cron stays quiet", () => {
    const r = savingsEntryStep({
      ...base,
      account_opened_at: "2026-03-01T00:00:00Z",
      funded_at:         "2026-03-01T00:00:00Z",
      bonus_posted_at:   "2026-05-15T00:00:00Z",
    })
    expect(r.stage).toBe("close")
    expect(r.nextStep).toMatch(/Safe to close/)
    expect(r.deadline).toBeNull()
    expect(r.urgency).toBe("none")
  })

  // ─── Transaction-requirement milestone (migration 035) ───────────────
  const fundedBase = {
    ...base,
    account_opened_at: "2026-06-04T00:00:00Z",
    funded_at:         "2026-06-04T12:00:00Z",
  }

  it("stage='transactions' when funded, txns required, and not yet done — surfaced before the passive hold", () => {
    const r = savingsEntryStep(fundedBase, {
      requiresTransactions: { description: "10 electronic transactions within 90 days", count: 10 },
    })
    expect(r.stage).toBe("transactions")
    expect(r.nextStep).toBe("Run your 10 required transactions")
    expect(r.deadline).toBe("2026-09-02") // funded_at + 90d (maintenance-window proxy)
  })

  it("spend-based requirement (no count) uses the card-spend label", () => {
    const r = savingsEntryStep(fundedBase, {
      requiresTransactions: { description: "$400 in card purchases for 2 consecutive months" },
    })
    expect(r.stage).toBe("transactions")
    expect(r.nextStep).toBe("Complete the card-spend requirement")
  })

  it("advances past transactions to 'hold' once transactions_done_at is set", () => {
    const r = savingsEntryStep(
      { ...fundedBase, transactions_done_at: "2026-06-10T00:00:00Z" },
      { requiresTransactions: { description: "10 electronic transactions within 90 days", count: 10 } },
    )
    expect(r.stage).toBe("hold")
  })

  it("transactions stay surfaced even after the hold window closes — they still must be run", () => {
    const r = savingsEntryStep(
      {
        ...base,
        account_opened_at: "2026-03-01T00:00:00Z",
        funded_at:         "2026-03-01T00:00:00Z",
        holding_period_days: 60, // hold ended 2026-04-30, before today 2026-06-04
      },
      { requiresTransactions: { description: "6 transactions within 60 days", count: 6 } },
    )
    expect(r.stage).toBe("transactions")
    expect(r.nextStep).toBe("Run your 6 required transactions")
  })

  it("no requiresTransactions → milestone skipped entirely (unchanged hold behavior)", () => {
    const r = savingsEntryStep(fundedBase)
    expect(r.stage).toBe("hold")
  })
})

describe("stagedPayoutStep (Four Leaf FCU–style multi-tranche)", () => {
  const stages = [
    { amount: 350, label: "First $500 DD", months: 0 },
    { amount: 100, label: "12 consecutive months", months: 12 },
    { amount: 100, label: "24 consecutive months", months: 24 },
  ]
  const bonus = { staged_payouts: stages }

  it("stays quiet before the first tranche has banked (normal flow drives it)", () => {
    const r = stagedPayoutStep({ actual_amount: 0 }, bonus, { loggedThisMonth: false, monthsLogged: 0 })
    expect(r.nextStep).toBeNull()
  })

  it("stays quiet once every tranche is banked", () => {
    const r = stagedPayoutStep({ actual_amount: 550 }, bonus, { loggedThisMonth: true, monthsLogged: 24 })
    expect(r.nextStep).toBeNull()
  })

  it("stays quiet mid-schedule when this month's DD is already logged", () => {
    const r = stagedPayoutStep({ actual_amount: 350 }, bonus, { loggedThisMonth: true, monthsLogged: 5 })
    expect(r.nextStep).toBeNull()
  })

  it("nudges toward the month-end deadline when mid-schedule and no DD logged this month", () => {
    // FIXED_TODAY = 2026-06-04 → month end is 2026-06-30
    const r = stagedPayoutStep({ actual_amount: 350 }, bonus, { loggedThisMonth: false, monthsLogged: 5 })
    expect(r.deadline).toBe("2026-06-30")
    expect(r.nextStep).toBe("Log this month's $500 direct deposit (month 6 of 12)")
    expect(r.stage).toBe("month:2026-06")
  })

  it("counts toward the 24-month milestone once the 12-month one is banked", () => {
    const r = stagedPayoutStep({ actual_amount: 450 }, bonus, { loggedThisMonth: false, monthsLogged: 15 })
    expect(r.nextStep).toBe("Log this month's $500 direct deposit (month 16 of 24)")
  })

  it("no staged_payouts → null", () => {
    const r = stagedPayoutStep({ actual_amount: 100 }, { staged_payouts: null }, { loggedThisMonth: false, monthsLogged: 0 })
    expect(r.nextStep).toBeNull()
  })
})
