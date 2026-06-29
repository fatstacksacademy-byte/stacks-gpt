import { describe, it, expect } from "vitest"
import {
  normalizeIssuer,
  evaluateIssuer,
  evaluateAllIssuers,
  issuerHardBlocked,
  bonusLikelyUnavailable,
  MAJOR_ISSUERS,
  type HeldCard,
  type CreditProfile,
} from "./issuerRules"

const ASOF = "2026-06-28"

function card(issuer: string, open: string, extra: Partial<HeldCard> = {}): HeldCard {
  return { issuer, open_date: open, card_type: "personal", ...extra }
}

describe("normalizeIssuer", () => {
  it("maps aliases and slugifies", () => {
    expect(normalizeIssuer("American Express")).toBe("amex")
    expect(normalizeIssuer("Bank of America")).toBe("bofa")
    expect(normalizeIssuer("capital one")).toBe("capital-one")
    expect(normalizeIssuer("Capital_One")).toBe("capital-one")
    expect(normalizeIssuer("US Bank")).toBe("us-bank")
    expect(normalizeIssuer("Chase")).toBe("chase")
    expect(normalizeIssuer(null)).toBe("")
  })
})

describe("Chase 5/24", () => {
  it("denies at 5/24 and reports when a slot opens", () => {
    const cards = [
      card("Chase", "2025-01-01"), card("Amex", "2025-02-01"), card("Citi", "2025-03-01"),
      card("BofA", "2025-04-01"), card("Barclays", "2025-05-01"),
    ]
    const e = evaluateIssuer("chase", cards, null, ASOF)
    expect(e.verdict).toBe("deny")
    expect(e.nextEligibleDate).toBe("2027-01-01") // soonest contributor + 24mo
    expect(e.reasons.some(r => r.rule === "Chase 5/24" && r.severity === "deny")).toBe(true)
  })

  it("cautions at 4/24", () => {
    const cards = [
      card("Chase", "2025-01-01"), card("Amex", "2025-02-01"),
      card("Citi", "2025-03-01"), card("BofA", "2025-04-01"),
    ]
    expect(evaluateIssuer("chase", cards, null, ASOF).verdict).toBe("caution")
  })

  it("is clear (info only) under 5/24 with a full profile", () => {
    const profile: CreditProfile = { score: 760, hard_inquiries_6mo: 1, utilization_pct: 5, annual_income: 90000 }
    const e = evaluateIssuer("chase", [card("Chase", "2025-01-01")], profile, ASOF)
    expect(e.verdict).toBe("clear")
    expect(e.confidence).toBe("high")
    expect(e.needsInfo).toHaveLength(0)
  })
})

describe("Amex", () => {
  it("denies on 2/90 and surfaces the lifetime-bonus asterisk", () => {
    const cards = [card("Amex", "2026-05-01"), card("Amex", "2026-06-01")]
    const e = evaluateIssuer("amex", cards, null, ASOF)
    expect(e.verdict).toBe("deny")
    expect(e.reasons.some(r => r.rule === "Amex 2/90")).toBe(true)
    // Bonus history unknown → needs-info (the asterisk driver)
    expect(e.needsInfo.some(n => n.field === "amex_bonus_history")).toBe(true)
    expect(e.confidence).toBe("low")
  })

  it("is unknown (pop-up jail) when no hard gate fires", () => {
    const profile: CreditProfile = { score: 780, hard_inquiries_6mo: 0, utilization_pct: 3, annual_income: 120000 }
    const e = evaluateIssuer("amex", [card("Amex", "2020-01-01", { bonus_earned: true })], profile, ASOF)
    expect(e.verdict).toBe("unknown")
  })
})

describe("Citi velocity", () => {
  it("denies within 8 days of the last Citi app", () => {
    const e = evaluateIssuer("citi", [card("Citi", "2026-06-25")], null, ASOF)
    expect(e.verdict).toBe("deny")
    expect(e.nextEligibleDate).toBe("2026-07-03")
  })

  it("denies 2 Citi cards inside 65 days", () => {
    const e = evaluateIssuer("citi", [card("Citi", "2026-05-10"), card("Citi", "2026-06-20")], null, ASOF)
    expect(e.verdict).toBe("deny")
    expect(e.reasons.some(r => r.rule === "Citi 1/65")).toBe(true)
  })
})

describe("BofA 7/12", () => {
  it("denies at 7 new personal cards in 12 months", () => {
    const cards = Array.from({ length: 7 }, (_, i) => card("Issuer" + i, `2025-1${i % 2}-05`))
    const e = evaluateIssuer("bofa", cards, null, ASOF)
    expect(e.verdict).toBe("deny")
    expect(e.reasons.some(r => r.rule === "BofA 7/12")).toBe(true)
  })
})

describe("profile downgrades", () => {
  it("downgrades a clear issuer to caution on a low score", () => {
    const e = evaluateIssuer("chase", [card("Chase", "2025-01-01")], { score: 640, hard_inquiries_6mo: 1, annual_income: 50000 }, ASOF)
    expect(e.verdict).toBe("caution")
  })

  it("a weak profile can NOT rescue a hard deny", () => {
    const cards = [
      card("Chase", "2025-01-01"), card("Amex", "2025-02-01"), card("Citi", "2025-03-01"),
      card("BofA", "2025-04-01"), card("Barclays", "2025-05-01"),
    ]
    expect(evaluateIssuer("chase", cards, { score: 800 }, ASOF).verdict).toBe("deny")
  })
})

describe("evaluateAllIssuers", () => {
  it("covers every major issuer plus held extras", () => {
    const rows = evaluateAllIssuers([card("Synchrony", "2025-01-01")], null, ASOF)
    expect(rows.length).toBe(MAJOR_ISSUERS.length + 1)
    expect(rows.some(r => r.issuer === "synchrony")).toBe(true)
  })
})

describe("issuerHardBlocked + bonusLikelyUnavailable", () => {
  it("flags a hard-blocked issuer", () => {
    const cards = [
      card("Chase", "2025-01-01"), card("Amex", "2025-02-01"), card("Citi", "2025-03-01"),
      card("BofA", "2025-04-01"), card("Barclays", "2025-05-01"),
    ]
    expect(issuerHardBlocked("chase", cards, ASOF)).toBe(true)
    expect(issuerHardBlocked("discover", cards, ASOF)).toBe(false)
  })

  it("detects an already-earned Amex lifetime bonus by product", () => {
    const held = [card("Amex", "2021-01-01", { product_name: "Amex Gold", bonus_earned: true })]
    expect(bonusLikelyUnavailable({ issuer: "Amex", product_name: "Amex Gold" }, held)).toBe("yes")
    expect(bonusLikelyUnavailable({ issuer: "Amex", product_name: "Amex Platinum" }, held)).toBe("no")
  })

  it("returns unknown when bonus history is missing", () => {
    const held = [card("Amex", "2021-01-01", { product_name: "Amex Gold", bonus_earned: null })]
    expect(bonusLikelyUnavailable({ issuer: "Amex", product_name: "Amex Gold" }, held)).toBe("unknown")
  })
})
