/* eslint-disable no-console */
/**
 * One-shot: update review-queue/leads.json after the hand-curate pass.
 *  - 7 leads became live catalog entries → status: "applied"
 *  - 13 leads were duplicates / out-of-scope / expired → status: "dismissed"
 *  decision_notes explain disposition for the audit trail.
 */
import { readFileSync, writeFileSync, renameSync } from "node:fs"

const LEADS = "/Users/nathaniel/stacks-gpt/review-queue/leads.json"

type Lead = Record<string, unknown> & { id: string; status: string }

const APPLIED: Record<string, string> = {
  "b406e06a62e6": "Applied → savingsBonuses.ts chase-total-checking-900-tiered-2026 (tiered $450/$600/$900)",
  "5f4f0b38d8b2": "Applied → bonuses.ts four-leaf-fcu-550-checking-2026 (formerly Bethpage FCU)",
  "f3b8bc3e4f12": "Applied → bonuses.ts adelfi-cu-100-checking-2026 + savingsBonuses.ts adelfi-cu-100-savings-2026 (split $100/$100)",
  "ae77d11b9060": "Applied → bonuses.ts percapita-300-checking-2026 (debit-spend mechanic, $25/mo × 12)",
  "3d5b680c3e3b": "Applied → bonuses.ts horizon-bank-250-checking-2026 (IN/MI only)",
  "4a21d7a899d6": "Applied → savingsBonuses.ts rho-1000-business-checking-2026 (LLC+ only, sole prop excluded)",
  "a73e2d90eac8": "Applied → creditCardBonuses.ts usaa-bank-eagle-adapt-200 ($200 SUB, $0 AF)",
}

const DISMISSED: Record<string, string> = {
  "f1bd62e84745": "Dismissed → Venmo already in creditCardBonuses.ts. The DoC promo is a temporary rewards multiplier, not a SUB change.",
  "e84730a45372": "Dismissed → HSBC Premier already covered by hsbc-premier-checking-2026 + hsbc-premier-savings-2026. Same offer.",
  "7160bd3e2403": "Dismissed → Grasshopper Business Checking already in catalog. Refreshed offer expired 5/15/26.",
  "6af6650736c2": "Dismissed → Netspend is a prepaid card platform, not a real checking account. Out of catalog scope.",
  "1800f4d166ca": "Dismissed → Capital One 360 Savings already in savingsBonuses.ts (capital-one-360-savings-2026). Same tier structure.",
  "ab78e702089f": "Dismissed → Target Circle Card already in creditCardBonuses.ts. Current $100 promo is time-limited Circle Rewards, not a SUB.",
  "9cc5c43bb00c": "Dismissed → Chase Amazon Prime Visa already in creditCardBonuses.ts. $200 no-spend offer is a 1-month promo window (6/11–7/9), not a permanent SUB.",
  "b7f878d015ad": "Dismissed → All affected Amex Delta cards already in creditCardBonuses.ts. Increased offer expired 04/01/2026.",
  "77333abb4a9d": "Dismissed → Truist Bank $400 already in bonuses.ts (truist-400-checking-2026). Same terms, different promo code variant.",
  "4f3a90e7895e": "Dismissed → Chase Ink Business Premier already in creditCardBonuses.ts. SUB ($1k after $10k/3mo) matches stored value.",
  "c9e571104829": "Dismissed → Capital One Quicksilver Rewards already in creditCardBonuses.ts. $200 SUB matches stored.",
  "0055caae3036": "Dismissed → Novo Business already in creditCardBonuses.ts. Bonus amount ambiguous between source pages ($300 vs $500); verifier loop will resolve.",
  "15e7f826880c": "Dismissed → Duplicate-of-lead 5f4f0b38d8b2 (Four Leaf FCU surfaced from both DoC and ProfitableContent). Catalog entry created via the DoC lead.",
}

const leads = JSON.parse(readFileSync(LEADS, "utf8")) as Lead[]
const now = new Date().toISOString()
let touched = 0

for (const lead of leads) {
  const id = lead.id
  if (APPLIED[id]) {
    lead.status = "applied"
    ;(lead as any).decided_at = now
    ;(lead as any).decided_by = "booth.nathaniel@gmail.com"
    ;(lead as any).decision_notes = APPLIED[id]
    touched++
  } else if (DISMISSED[id]) {
    lead.status = "dismissed"
    ;(lead as any).decided_at = now
    ;(lead as any).decided_by = "booth.nathaniel@gmail.com"
    ;(lead as any).decision_notes = DISMISSED[id]
    touched++
  }
}

const tmp = `${LEADS}.tmp.${process.pid}.${Date.now()}`
writeFileSync(tmp, JSON.stringify(leads, null, 2))
renameSync(tmp, LEADS)
console.log(`Updated ${touched} lead(s).`)
const summary = leads.reduce((acc: Record<string, number>, l) => {
  acc[l.status] = (acc[l.status] ?? 0) + 1
  return acc
}, {})
console.log("Status counts:", summary)
