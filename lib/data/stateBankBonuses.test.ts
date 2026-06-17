import { describe, it, expect } from "vitest"
import {
  getLiveCatalog,
  getNormalizedCatalog,
  bucketByState,
  isEligibleInState,
  US_STATES,
} from "./catalogTaxonomy"
import { stateBankBonuses } from "./stateBankBonuses"

/**
 * All-states regional bank-bonus catalog tests. Companion to
 * hawaiiBankBonuses.test.ts; locks the same offer-safety invariants for the
 * 49-state + DC regional layer in stateBankBonuses.ts.
 */

// Deterministic "today" — the verification date, inside every offer's window
// (the soonest deadline is Royal CU, 2026-06-12). Keeps the suite stable.
const TODAY = new Date("2026-06-12T12:00:00Z")
const CODES = new Set(US_STATES.map(s => s.code))
const AGGREGATOR = /doctorofcredit|bankbonus|hustlermoneyblog|profitablecontent|nerdwallet|wallethacks|moneycrashers/i

describe("state-local catalog data integrity", () => {
  it("every row is state-restricted to valid codes, official-sourced, and dated", () => {
    for (const b of stateBankBonuses) {
      const elig = b.eligibility as { state_restricted?: boolean; states_allowed?: string[] }
      expect(elig.state_restricted, `${b.id} must be state_restricted`).toBe(true)
      expect(Array.isArray(elig.states_allowed) && elig.states_allowed!.length > 0, `${b.id} needs states`).toBe(true)
      for (const code of elig.states_allowed!) {
        expect(CODES.has(code), `${b.id} has invalid state code ${code}`).toBe(true)
      }
      expect(b.offer_verified_at, `${b.id} needs a verification date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(b.confidence, `${b.id} must be official_verified`).toBe("official_verified")

      const links = b.source_links as string[]
      expect(Array.isArray(links) && links.length > 0, `${b.id} needs source links`).toBe(true)
      expect(links[0], `${b.id} first source must be an official page, not an aggregator`).not.toMatch(AGGREGATOR)
    }
  })

  it("does not re-list a bank already covered by the base catalog (no superseded ids leak in)", () => {
    const superseded = [
      "visions-fcu-500-checking-2026",
      "berkshire-bank-300-checking-2026",
      "becu-150-new-member-2026",
      "midflorida-cu-400-checking-2026",
      "provident-bank-nj-300-checking-2026",
    ]
    const ids = new Set(stateBankBonuses.map(b => b.id))
    for (const id of superseded) expect(ids.has(id), `${id} should be excluded from the live export`).toBe(false)
  })

  it("keeps globally-unique IDs across the whole live catalog", () => {
    const ids = getLiveCatalog(TODAY).map(i => i.id)
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id)
      seen.add(id)
    }
    expect(dupes).toEqual([])
  })
})

describe("state-local eligibility", () => {
  it("each offer is eligible in exactly its declared states and nowhere else", () => {
    // Eligibility is independent of expiration, so check against the full
    // normalized catalog — an offer that has since expired (and dropped out of
    // the live catalog) must still resolve to its declared states here.
    const catalog = getNormalizedCatalog()
    for (const b of stateBankBonuses) {
      const allowed = (b.eligibility as { states_allowed: string[] }).states_allowed
      const item = catalog.find(i => i.id === b.id)
      expect(item, `${b.id} should be in the normalized catalog`).toBeTruthy()
      for (const s of US_STATES) {
        expect(
          isEligibleInState(item!, s.code),
          `${b.id} eligibility in ${s.code}`,
        ).toBe(allowed.includes(s.code))
      }
    }
  })

  it("surfaces local offers for a broad set of states (regional coverage)", () => {
    const live = getLiveCatalog(TODAY)
    const withLocal = US_STATES.filter(s => bucketByState(live, s.code).local.length > 0)
    // The regional layer (base catalog + this module) should cover the large majority of states.
    expect(withLocal.length).toBeGreaterThanOrEqual(40)
  })

  it("spot-checks representative offers appear for their state and not a neighbor", () => {
    // Eligibility, not liveness — use the normalized catalog so an expired
    // representative (e.g. Citadel, whose offer has since ended) still resolves.
    const catalog = getNormalizedCatalog()
    const cases: Array<[string, string, string]> = [
      ["weokie-fcu-200-checking-2026", "OK", "TX"],
      ["bellco-cu-300-checking-2026", "CO", "WY"],
      ["citadel-cu-500-checking-2026", "PA", "OH"],
      ["delta-community-cu-250-checking-2026", "GA", "FL"], // superseded → absent from this module but base catalog covers GA
    ]
    for (const [id, inState, outState] of cases) {
      const item = stateBankBonuses.find(b => b.id === id)
      if (!item) continue // superseded ids are intentionally excluded
      const catalog_item = catalog.find(i => i.id === id)!
      expect(isEligibleInState(catalog_item, inState), `${id} eligible in ${inState}`).toBe(true)
      expect(isEligibleInState(catalog_item, outState), `${id} not eligible in ${outState}`).toBe(false)
    }
  })
})
