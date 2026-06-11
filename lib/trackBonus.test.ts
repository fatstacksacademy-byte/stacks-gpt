import { describe, it, expect, vi, beforeEach } from "vitest"
import type { TrackKind, TrackResult } from "./trackBonus"

// We mock the per-table lib helpers so the routing logic in
// `trackCatalogBonus` is the actual unit under test. Each mock records
// its call so we can assert the right table was hit for each kind.

const mocks = vi.hoisted(() => ({
  markBonusStarted: vi.fn(),
  getCompletedBonuses: vi.fn(),
  addSavingsEntry: vi.fn(),
  getSavingsEntries: vi.fn(),
  addOwnedCard: vi.fn(),
}))

vi.mock("./completedBonuses", () => ({
  markBonusStarted: mocks.markBonusStarted,
  getCompletedBonuses: mocks.getCompletedBonuses,
}))
vi.mock("./savingsEntries", () => ({
  addSavingsEntry: mocks.addSavingsEntry,
  getSavingsEntries: mocks.getSavingsEntries,
}))
vi.mock("./ownedCards", () => ({
  addOwnedCard: mocks.addOwnedCard,
}))

// Mock the savings + cc catalogs so we don't depend on real bonus IDs
// to test routing.
vi.mock("./data/savingsBonuses", () => ({
  savingsBonuses: [
    {
      id: "fake-savings-1",
      bank_name: "Test Bank",
      base_apy: 0.04,
      total_hold_days: 90,
      tiers: [{ min_deposit: 10000, bonus_amount: 250 }],
      notes: null,
    },
  ],
}))
vi.mock("./data/creditCardBonuses", () => ({
  creditCardBonuses: [
    {
      id: "fake-card-1",
      card_name: "Test Card",
      issuer: "Test Issuer",
      bonus_amount: 60000,
      cpp_value: 0.015,
      annual_fee: 95,
      annual_fee_waived_first_year: true,
      statement_credits_year1: 0,
      min_spend: 4000,
      spend_months: 3,
    },
  ],
}))

// Import AFTER mocks are wired up.
import { trackCatalogBonus } from "./trackBonus"

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset()
})

describe("trackCatalogBonus — routing", () => {
  it.each<[TrackKind, "completed_bonuses" | "savings_entries" | "owned_cards"]>([
    ["personal-checking",    "completed_bonuses"],
    ["business",             "completed_bonuses"],
    ["business-checking",    "completed_bonuses"],
    ["personal-savings",     "savings_entries"],
    ["business-savings",     "savings_entries"],
    ["brokerage",            "savings_entries"],
    ["credit-card",          "owned_cards"],
  ])("%s routes to %s", async (kind, table) => {
    mocks.getCompletedBonuses.mockResolvedValue([])
    mocks.getSavingsEntries.mockResolvedValue([])
    mocks.markBonusStarted.mockResolvedValue({ id: "x" })
    mocks.addSavingsEntry.mockResolvedValue({ id: "y" })
    mocks.addOwnedCard.mockResolvedValue({ id: "z" })

    // For non-checking kinds we need a bonusId that exists in the
    // mocked catalogs.
    const bonusId = kind === "credit-card" ? "fake-card-1" :
                    (kind === "personal-savings" || kind === "business-savings" || kind === "brokerage")
                      ? "fake-savings-1"
                      : "any-checking-id"

    const result: TrackResult = await trackCatalogBonus("user-1", bonusId, kind)
    expect(result).toBe("added")

    if (table === "completed_bonuses") expect(mocks.markBonusStarted).toHaveBeenCalledTimes(1)
    if (table === "savings_entries") expect(mocks.addSavingsEntry).toHaveBeenCalledTimes(1)
    if (table === "owned_cards") expect(mocks.addOwnedCard).toHaveBeenCalledTimes(1)
  })
})

describe("trackCatalogBonus — duplicate guard", () => {
  it("checking duplicate: returns 'duplicate' when an open completed_bonuses row already exists", async () => {
    mocks.getCompletedBonuses.mockResolvedValue([
      { bonus_id: "chase-1", closed_date: null }, // open
    ])
    const result = await trackCatalogBonus("user-1", "chase-1", "personal-checking")
    expect(result).toBe("duplicate")
    expect(mocks.markBonusStarted).not.toHaveBeenCalled()
  })

  it("checking with only closed rows is NOT a duplicate", async () => {
    mocks.getCompletedBonuses.mockResolvedValue([
      { bonus_id: "chase-1", closed_date: "2025-01-01" }, // closed
    ])
    mocks.markBonusStarted.mockResolvedValue({ id: "x" })
    const result = await trackCatalogBonus("user-1", "chase-1", "personal-checking")
    expect(result).toBe("added")
    expect(mocks.markBonusStarted).toHaveBeenCalledTimes(1)
  })

  it("savings duplicate: returns 'duplicate' for an active matching savings_entry", async () => {
    mocks.getSavingsEntries.mockResolvedValue([
      { bonus_name: "fake-savings-1", status: "active" },
    ])
    const result = await trackCatalogBonus("user-1", "fake-savings-1", "personal-savings")
    expect(result).toBe("duplicate")
    expect(mocks.addSavingsEntry).not.toHaveBeenCalled()
  })

  it("savings with a completed prior entry is NOT a duplicate", async () => {
    mocks.getSavingsEntries.mockResolvedValue([
      { bonus_name: "fake-savings-1", status: "completed" },
    ])
    mocks.addSavingsEntry.mockResolvedValue({ id: "y" })
    const result = await trackCatalogBonus("user-1", "fake-savings-1", "personal-savings")
    expect(result).toBe("added")
    expect(mocks.addSavingsEntry).toHaveBeenCalledTimes(1)
  })

  it("brokerage uses the savings dedupe path (same table)", async () => {
    mocks.getSavingsEntries.mockResolvedValue([
      { bonus_name: "fake-savings-1", status: "planned" },
    ])
    const result = await trackCatalogBonus("user-1", "fake-savings-1", "brokerage")
    expect(result).toBe("duplicate")
  })
})

describe("trackCatalogBonus — failure modes", () => {
  it("returns 'error' for an unknown savings bonusId", async () => {
    mocks.getSavingsEntries.mockResolvedValue([])
    const result = await trackCatalogBonus("user-1", "no-such-bonus", "personal-savings")
    expect(result).toBe("error")
    expect(mocks.addSavingsEntry).not.toHaveBeenCalled()
  })

  it("returns 'error' for an unknown card id", async () => {
    const result = await trackCatalogBonus("user-1", "no-such-card", "credit-card")
    expect(result).toBe("error")
    expect(mocks.addOwnedCard).not.toHaveBeenCalled()
  })

  it("returns 'error' when the underlying write fails", async () => {
    mocks.getCompletedBonuses.mockResolvedValue([])
    mocks.markBonusStarted.mockResolvedValue(null)
    const result = await trackCatalogBonus("user-1", "chase-1", "personal-checking")
    expect(result).toBe("error")
  })
})
