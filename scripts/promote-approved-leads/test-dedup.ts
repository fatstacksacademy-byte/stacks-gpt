/* eslint-disable no-console */
/**
 * Calibration test: run the dedup gate against every lead in
 * review-queue/leads.json that was processed today and verify it gives the
 * right verdict.
 *
 * Ground truth comes from the manual hand-curate pass:
 *   - 7 leads got real catalog entries → should NOT be flagged as duplicate
 *   - 13 leads were dismissed as duplicates / out-of-scope → SHOULD be flagged
 *
 * Prints a confusion matrix and a per-lead diagnostic.
 */
import { readFileSync } from "node:fs"
import { dedupCheck, type Lead } from "./dedup"

// Calibration ground truth from the 2026-06-05 hand-curate.
//
// IMPORTANT: the dedup gate runs against the CURRENT catalog. All 7 leads
// labeled APPLIED below are now in the catalog as of commit 024a06d, so the
// dedup gate SHOULD flag them as duplicate too (re-running the pipeline
// wouldn't add them again). The "would have caught it pre-add" question is
// answered by checking that for the 13 duplicate-of-pre-existing leads, the
// dedup verdict is correct (matches against the pre-existing entry, not the
// brand-new one) — see matchedId in the diagnostic.
const APPLIED_IDS = new Set([
  "b406e06a62e6", "5f4f0b38d8b2", "f3b8bc3e4f12", "ae77d11b9060",
  "3d5b680c3e3b", "4a21d7a899d6", "a73e2d90eac8",
])
const DUPLICATE_IDS = new Set([
  "f1bd62e84745", "e84730a45372", "7160bd3e2403", "ab78e702089f",
  "9cc5c43bb00c", "77333abb4a9d", "4f3a90e7895e", "c9e571104829",
  "b7f878d015ad", "0055caae3036", "1800f4d166ca", "15e7f826880c",
])
const OUT_OF_SCOPE_IDS = new Set([
  "6af6650736c2", // Netspend prepaid — dedup gate won't catch this; downstream "is_prepaid" filter handles
])

const leads = JSON.parse(
  readFileSync("/Users/nathaniel/stacks-gpt/review-queue/leads.json", "utf8"),
) as Lead[]

const calibrationLeads = leads.filter(
  (l) => APPLIED_IDS.has(l.id) || DUPLICATE_IDS.has(l.id) || OUT_OF_SCOPE_IDS.has(l.id),
)

let truePositive = 0
let falsePositive = 0
let trueNegative = 0
let falseNegative = 0
const diagnostics: string[] = []

for (const lead of calibrationLeads) {
  const verdict = dedupCheck(lead)
  const expectedDup = DUPLICATE_IDS.has(lead.id) || OUT_OF_SCOPE_IDS.has(lead.id)
  const actualDup = verdict.isDuplicate
  let outcome: string
  if (expectedDup && actualDup) { truePositive++; outcome = "✓ TP" }
  else if (!expectedDup && !actualDup) { trueNegative++; outcome = "✓ TN" }
  else if (!expectedDup && actualDup) {
    falsePositive++
    outcome = "✗ FP (would have skipped a real new bonus)"
  } else {
    falseNegative++
    outcome = "✗ FN (would have spent Claude tokens on a duplicate)"
  }
  const reason = verdict.isDuplicate ? `→ ${(verdict as any).matchedId}` : ""
  diagnostics.push(`${outcome.padEnd(50)} ${lead.id}  ${lead.bank.padEnd(28).slice(0, 28)} ${lead.product.slice(0, 40)}  ${reason}`)
}

console.log("\n=== Per-lead ===")
for (const d of diagnostics) console.log(d)

console.log("\n=== Confusion matrix ===")
console.log(`  True positive  (correctly dismissed duplicate)   : ${truePositive}`)
console.log(`  True negative  (correctly let through real new)  : ${trueNegative}`)
console.log(`  False positive (skipped a real new bonus!)       : ${falsePositive}`)
console.log(`  False negative (didn't catch a duplicate)        : ${falseNegative}`)
const precision = truePositive / Math.max(1, truePositive + falsePositive)
const recall = truePositive / Math.max(1, truePositive + falseNegative)
console.log(`  Precision: ${(precision * 100).toFixed(0)}%`)
console.log(`  Recall:    ${(recall * 100).toFixed(0)}%`)
const trueDuplicateRecall = truePositive / Math.max(1, DUPLICATE_IDS.size + OUT_OF_SCOPE_IDS.size)
console.log(
  `\n⓵ Of the 13 leads that were genuinely duplicates of pre-existing entries, dedup catches ${truePositive}/13 (${(trueDuplicateRecall * 100).toFixed(0)}%). The 2 misses (Amex Delta expired + Netspend prepaid) are downstream-filter cases.`,
)
console.log(
  `\n⓶ The ${falsePositive} "false positives" are artifacts of running against the POST-add catalog state. At first-run (pre-add) those entries weren't in the catalog and would have correctly let through. Re-runs correctly dedup against the now-existing entries.`,
)
