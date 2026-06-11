/**
 * Run with: `tsx scripts/data-quality/report.ts`
 *
 * Surfaces every catalog row that needs human review. The taxonomy
 * module already exposes a typed report; this script prints it as a
 * grouped, scannable summary so it can be wired into the canary or
 * a weekly digest later.
 */

import { reportDataQuality, getLiveCatalog } from "../../lib/data/catalogTaxonomy"

const items = getLiveCatalog()
const issues = reportDataQuality(items)

const byKind = new Map<string, typeof issues>()
for (const issue of issues) {
  const list = byKind.get(issue.kind) ?? []
  list.push(issue)
  byKind.set(issue.kind, list)
}

console.log(`# Catalog data-quality report`)
console.log(`Generated against ${items.length} live offers.\n`)
console.log(`${issues.length} issues found.\n`)

const order = [
  "state_restricted_without_states_allowed",
  "conflicting_state_fields",
  "checking_with_unknown_funding",
  "missing_expiration",
  "savings_categorized_as_checking",
  "untrackable_missing_id_or_category",
]

for (const kind of order) {
  const list = byKind.get(kind)
  if (!list || list.length === 0) continue
  console.log(`## ${kind} (${list.length})`)
  for (const issue of list) {
    console.log(`  - [${issue.severity}] ${issue.bankName} (${issue.id}): ${issue.detail}`)
  }
  console.log("")
}

if (issues.length === 0) {
  console.log("✓ No issues detected.")
}
