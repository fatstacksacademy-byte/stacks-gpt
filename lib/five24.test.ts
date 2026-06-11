import { describe, it, expect } from "vitest"
import { computeFive24, addMonths, type Five24Card } from "./five24"

const ASOF = "2026-06-11"

function card(open: string, type: "personal" | "business" = "personal", id?: string): Five24Card {
  return { open_date: open, card_type: type, id }
}

describe("addMonths", () => {
  it("adds and subtracts months across year boundaries", () => {
    expect(addMonths("2026-06-11", -24)).toBe("2024-06-11")
    expect(addMonths("2026-01-15", 24)).toBe("2028-01-15")
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28") // clamps to Feb
  })
})

describe("computeFive24", () => {
  it("counts personal cards opened within the last 24 months", () => {
    const r = computeFive24(
      [card("2025-01-01"), card("2024-12-01"), card("2026-03-01")],
      ASOF,
    )
    expect(r.count).toBe(3)
    expect(r.under_524).toBe(true)
    expect(r.slots_remaining).toBe(2)
  })

  it("excludes business cards (don't report to personal credit)", () => {
    const r = computeFive24(
      [card("2025-06-01", "personal"), card("2025-07-01", "business"), card("2026-01-01", "business")],
      ASOF,
    )
    expect(r.count).toBe(1)
  })

  it("excludes cards opened more than 24 months ago", () => {
    // 2024-06-11 is exactly the cutoff (asOf - 24mo); strictly-after means it
    // no longer counts. 2024-07-01 still counts.
    const r = computeFive24([card("2024-06-11"), card("2024-07-01")], ASOF)
    expect(r.count).toBe(1)
    expect(r.contributors[0].open_date).toBe("2024-07-01")
  })

  it("still counts closed cards (closing doesn't remove from 5/24)", () => {
    // closed_date isn't even an input to the count — only open_date + type.
    const r = computeFive24([card("2025-02-01"), card("2025-08-01")], ASOF)
    expect(r.count).toBe(2)
  })

  it("flags at/over 5/24 and computes when the next slot opens", () => {
    const opens = ["2024-09-01", "2024-12-01", "2025-03-01", "2025-06-01", "2025-09-01"]
    const r = computeFive24(opens.map(o => card(o)), ASOF)
    expect(r.count).toBe(5)
    expect(r.under_524).toBe(false)
    expect(r.slots_remaining).toBe(0)
    // Soonest contributor (2024-09-01) falls off at +24 months.
    expect(r.next_slot_opens).toBe(addMonths("2024-09-01", 24))
  })

  it("returns next_slot_opens=null when already under the limit", () => {
    const r = computeFive24([card("2025-01-01")], ASOF)
    expect(r.under_524).toBe(true)
    expect(r.next_slot_opens).toBeNull()
  })

  it("ignores invalid or future open dates", () => {
    const r = computeFive24(
      [card("not-a-date"), card("2099-01-01"), card("2025-05-01")],
      ASOF,
    )
    expect(r.count).toBe(1)
  })

  it("contributors are sorted by soonest fall-off and carry the fall-off date", () => {
    const r = computeFive24([card("2025-06-01", "personal", "b"), card("2024-12-01", "personal", "a")], ASOF)
    expect(r.contributors.map(c => c.id)).toEqual(["a", "b"])
    expect(r.contributors[0].falls_off).toBe("2026-12-01")
  })

  it("over 5/24 (e.g. 6 cards): next slot opens when it drops to 4", () => {
    const opens = ["2024-08-01", "2024-10-01", "2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01"]
    const r = computeFive24(opens.map(o => card(o)), ASOF)
    expect(r.count).toBe(6)
    // count - limit = 1 → the 2nd soonest (2024-10-01) falling off brings it to 4 (under 5).
    expect(r.next_slot_opens).toBe(addMonths("2024-10-01", 24))
  })
})
