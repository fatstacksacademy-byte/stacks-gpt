import { describe, it, expect } from "vitest"
import { creditCardBonuses } from "./creditCardBonuses"

// Guard against the "low-rate intro miscoded as 0%" bug (the First Northern /
// regional-CU class): a card carries intro_apr.purchase_apr_months or
// bt_apr_months — which BOTH mean *0%* intro months — while its own key_benefits
// text quotes a NON-zero intro rate (e.g. "2.99% intro APR for 24 months"). That
// surfaces a non-0% card in the 0% finder. 82 such cards were removed in
// 2026-06; this test stops the next sweep from re-introducing them.
//
// Heuristic: a benefit line mentions "<n.nn>% intro / introductory / for N months"
// with a NON-zero rate, and no "0%" appears anywhere in the benefits.
const NONZERO_INTRO = /(\d{1,2}\.\d{1,2})\s*%\s*(intro|introductory|for \d+ ?(months|mo))/i
const SAYS_ZERO = /\b0(\.0+)?\s*%/

describe("catalog: intro_apr 0% claims are consistent with benefit text", () => {
  it("no card flagged 0% has key_benefits stating a non-zero intro rate", () => {
    const offenders = creditCardBonuses
      .filter(c => !c.expired)
      .filter(c => (c.intro_apr?.purchase_apr_months ?? 0) > 0 || (c.intro_apr?.bt_apr_months ?? 0) > 0)
      .filter(c => {
        const kb = (c.key_benefits ?? []).join(" | ")
        return NONZERO_INTRO.test(kb) && !SAYS_ZERO.test(kb)
      })
      .map(c => {
        const kb = (c.key_benefits ?? []).join(" | ")
        return `${c.id} (${c.card_name}) — benefits say "${kb.match(NONZERO_INTRO)?.[0]}" but coded as 0%`
      })

    expect(offenders, `False 0% cards (low-rate intro miscoded as 0%):\n  ${offenders.join("\n  ")}`).toEqual([])
  })
})
