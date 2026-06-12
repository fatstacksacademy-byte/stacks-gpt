import { describe, it, expect } from "vitest"
import { stateInstitutions } from "./institutions"
import { getNormalizedCatalog, US_STATES } from "../catalogTaxonomy"

/**
 * Guards the shared institution inventory: well-formed rows, valid state codes,
 * and that every "active" deposit cross-link resolves to a real catalog offer.
 */

const CODES = new Set(US_STATES.map(s => s.code).concat("HI"))
const OUTCOMES = new Set(["active", "expired", "targeted", "unverified", "none", "not_checked"])

describe("state institution inventory", () => {
  it("rows are well-formed (states, domains, outcomes)", () => {
    for (const r of stateInstitutions) {
      expect(r.states.length, `${r.name} needs states`).toBeGreaterThan(0)
      for (const c of r.states) expect(CODES.has(c), `${r.name} bad state ${c}`).toBe(true)
      expect(r.domain, `${r.name} domain`).toMatch(/\./)
      expect(["bank", "credit_union"]).toContain(r.type)
      expect(OUTCOMES.has(r.deposit), `${r.name} bad deposit outcome`).toBe(true)
      expect(OUTCOMES.has(r.card), `${r.name} bad card outcome`).toBe(true)
      expect(r.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("every active deposit cross-link resolves to a catalog offer", () => {
    const ids = new Set(getNormalizedCatalog().map(b => b.id))
    for (const r of stateInstitutions) {
      if (r.deposit === "active" && r.deposit_offer_id) {
        expect(ids.has(r.deposit_offer_id), `${r.name} deposit_offer_id ${r.deposit_offer_id} not in catalog`).toBe(true)
      }
    }
  })

  it("has no duplicate institutions", () => {
    const seen = new Set<string>()
    const dups: string[] = []
    for (const r of stateInstitutions) {
      const k = r.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (seen.has(k)) dups.push(r.name)
      seen.add(k)
    }
    expect(dups).toEqual([])
  })
})
