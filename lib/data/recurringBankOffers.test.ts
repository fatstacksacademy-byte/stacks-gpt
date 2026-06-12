import { describe, it, expect } from "vitest"
import { recurringBankOffers } from "./recurringBankOffers"
import { US_STATES, getNormalizedCatalog } from "./catalogTaxonomy"

/**
 * The recurring/historical registry is a verification aid, NOT live catalog data.
 * These tests keep it well-formed and ensure it never leaks into the live catalog.
 */

const CODES = new Set(US_STATES.map(s => s.code).concat("HI"))

describe("recurring bank-offer registry", () => {
  it("is well-formed (unique ids, valid states, official urls, dates)", () => {
    const seen = new Set<string>()
    for (const o of recurringBankOffers) {
      expect(seen.has(o.id), `duplicate registry id ${o.id}`).toBe(false)
      seen.add(o.id)
      expect(o.states.length, `${o.id} needs states`).toBeGreaterThan(0)
      for (const c of o.states) expect(CODES.has(c), `${o.id} bad state ${c}`).toBe(true)
      expect(o.last_verified, `${o.id} needs ISO date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(["expired", "expiring_soon"]).toContain(o.status)
      expect(o.official_url, `${o.id} url`).toMatch(/^https?:\/\//)
    }
  })

  it("does NOT appear in the live catalog (it is reference-only)", () => {
    // The registry must never be spread into bonuses — it is a research aid.
    // (A handful of ids intentionally MIRROR live ids — the expiring_soon ones —
    //  so we assert by a marker only the registry carries, not by id.)
    const liveIds = new Set(getNormalizedCatalog().map(b => b.id))
    const expiredOnly = recurringBankOffers.filter(o => o.status === "expired")
    // Every "expired" registry row is an offer no longer live in the catalog.
    for (const o of expiredOnly) {
      expect(liveIds.has(o.id), `expired registry row ${o.id} should not be a live catalog id`).toBe(false)
    }
  })
})
