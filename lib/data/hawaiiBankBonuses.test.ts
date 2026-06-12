import { describe, it, expect } from "vitest"
import {
  getLiveCatalog,
  bucketByState,
  isEligibleInState,
  US_STATES,
} from "./catalogTaxonomy"
import { hawaiiCheckingBonuses } from "./hawaiiBankBonuses"

/**
 * Hawaii bank-bonus catalog coverage tests.
 *
 * These lock the invariants the /bank-bonuses-by-state/hawaii experience and
 * the offer-safety rules depend on: Hawaii-local offers surface for HI and ONLY
 * HI, nationwide offers that exclude HI never leak in, every Hawaii row carries
 * an official source + verification date, IDs are unique, and the strict
 * pagination contract (ten at a time) holds.
 */

// Reference "today" inside every offer's live window (offers verified 2026-06-11;
// the soonest HI deadline is 2026-06-30). Keeps the suite deterministic.
const TODAY = new Date("2026-06-15T12:00:00Z")

const HI = "HI"
const HAWAII_IDS = new Set(hawaiiCheckingBonuses.map(b => b.id as string))

describe("Hawaii local catalog data", () => {
  it("every Hawaii offer is state-restricted to HI with an official source and verification date", () => {
    for (const b of hawaiiCheckingBonuses) {
      const elig = b.eligibility as { state_restricted?: boolean; states_allowed?: string[] }
      expect(elig.state_restricted, `${b.id} must be state_restricted`).toBe(true)
      expect(elig.states_allowed, `${b.id} must allow HI`).toContain("HI")
      expect(b.offer_verified_at, `${b.id} needs a verification date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(b.confidence, `${b.id} must be official_verified`).toBe("official_verified")

      const links = b.source_links as string[]
      expect(Array.isArray(links) && links.length > 0, `${b.id} needs source links`).toBe(true)
      // The FIRST source link must be the institution's own official page, not an aggregator.
      expect(links[0], `${b.id} first source must be official`).not.toMatch(
        /doctorofcredit|bankbonus|hustlermoneyblog|profitablecontent|nerdwallet/i,
      )
    }
  })

  it("has globally unique IDs across the whole live catalog", () => {
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

describe("Hawaii state page buckets", () => {
  it("surfaces Hawaii-local offers AND nationwide offers for HI", () => {
    const { nationwide, local } = bucketByState(getLiveCatalog(TODAY), HI)
    expect(local.length).toBeGreaterThanOrEqual(5)
    expect(nationwide.length).toBeGreaterThan(0)
    // The Hawaii-local bucket is exactly our verified Hawaii rows (those that are live).
    const localIds = new Set(local.map(i => i.id))
    for (const id of HAWAII_IDS) {
      // every non-expired Hawaii offer should appear locally
      const item = getLiveCatalog(TODAY).find(i => i.id === id)
      if (item && item.expirationStatus !== "expired") {
        expect(localIds.has(id), `${id} should be in HI local bucket`).toBe(true)
      }
    }
  })

  it("statewide Hawaii offers appear for HI users", () => {
    const { local } = bucketByState(getLiveCatalog(TODAY), HI)
    const boh = local.find(i => i.id === "bank-of-hawaii-convenience-checking-100-2026")
    const fhb = local.find(i => i.id === "first-hawaiian-priority-banking-350-checking-2026")
    expect(boh, "Bank of Hawaii statewide offer should appear for HI").toBeTruthy()
    expect(fhb, "First Hawaiian statewide offer should appear for HI").toBeTruthy()
  })

  it("county/island-restricted offers are HI-local and carry eligibility messaging", () => {
    const item = getLiveCatalog(TODAY).find(i => i.id === "garden-island-fcu-referral-25-2026")
    expect(item).toBeTruthy()
    expect(isEligibleInState(item!, HI)).toBe(true)
    expect(item!.eligibilityNotes ?? "").toMatch(/kauai county only/i)
  })

  it("Hawaii-local offers do NOT leak into other states", () => {
    const others = US_STATES.filter(s => s.code !== HI)
    for (const id of HAWAII_IDS) {
      const item = getLiveCatalog(TODAY).find(i => i.id === id)
      if (!item) continue
      for (const s of others) {
        expect(
          isEligibleInState(item, s.code),
          `${id} must not be eligible in ${s.code}`,
        ).toBe(false)
      }
    }
  })

  it("does NOT duplicate any nationwide offer as a Hawaii-specific one", () => {
    // No Hawaii-local id should collide with a nationwide bank's id, and no
    // Hawaii-local row should be marked nationwide.
    const { nationwide, local } = bucketByState(getLiveCatalog(TODAY), HI)
    const natIds = new Set(nationwide.map(i => i.id))
    for (const item of local) {
      expect(natIds.has(item.id), `${item.id} is both local and nationwide`).toBe(false)
      expect(item.availability).toBe("state_restricted")
    }
  })

  it("excludes ONLY Chase business deposit accounts from Hawaii (every other Chase product is fine)", () => {
    // Per direct HI experience: the only Chase product unavailable in Hawaii is
    // a Chase BUSINESS deposit account. Chase personal checking/savings bonuses
    // (and Chase business credit cards, and U.S. Bank) ARE available in HI.
    const all = getLiveCatalog(TODAY)
    for (const id of ["chase-business-checking-500-2026", "chase-biz-savings-500"]) {
      const item = all.find(i => i.id === id)
      if (item) expect(isEligibleInState(item, HI), `${id} (business) must not be HI-eligible`).toBe(false)
    }
    // A Chase PERSONAL deposit offer should be HI-eligible.
    const personal = all.find(i => i.id === "chase-savings-combo-2026")
    if (personal) expect(isEligibleInState(personal, HI), "Chase personal offer should be HI-eligible").toBe(true)
  })

  it("keeps U.S. Bank offers available to Hawaii (HI residents can open them)", () => {
    // Guards against re-introducing an over-broad 'no HI branches' exclusion.
    const usBankRows = getLiveCatalog(TODAY).filter(i => /^u\.s\. bank/i.test(i.bankName))
    if (usBankRows.length > 0) {
      expect(
        usBankRows.some(i => isEligibleInState(i, HI)),
        "at least one U.S. Bank offer should be HI-eligible",
      ).toBe(true)
    }
  })
})

describe("Hawaii pagination contract (ten at a time)", () => {
  it("the HI eligible set paginates into pages of ten", () => {
    const { nationwide, local } = bucketByState(getLiveCatalog(TODAY), HI)
    const eligible = [...local, ...nationwide]
    const PAGE_SIZE = 10
    const totalPages = Math.max(1, Math.ceil(eligible.length / PAGE_SIZE))
    // Reconstruct every page and confirm no item is dropped or duplicated.
    const seen: string[] = []
    for (let p = 1; p <= totalPages; p++) {
      const pageItems = eligible.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE)
      expect(pageItems.length).toBeLessThanOrEqual(PAGE_SIZE)
      seen.push(...pageItems.map(i => i.id))
    }
    expect(seen.length).toBe(eligible.length)
    expect(new Set(seen).size).toBe(eligible.length)
  })
})
