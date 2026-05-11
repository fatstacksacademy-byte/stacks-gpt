/**
 * Classify the proposed-edits.json output from verify-bonuses into buckets:
 *
 *   SAFE          — apply without review. expired-flips from offer_dead and
 *                   Tier-3 Claude "different" verdicts (the LLM has already
 *                   looked at context and rendered a judgment).
 *
 *   NEEDS_EYE     — regex-only high-confidence mismatches. Page said
 *                   something different from what's stored, but could be a
 *                   tier mismatch (different deposit bucket shown on page)
 *                   or a wording issue. Worth a human pass.
 *
 *   LIKELY_NOISE  — extracted value is suspicious (e.g. $1 per-deposit
 *                   mistaken for total threshold, or field is oddly missing).
 *
 * Output:
 *   verification-output/triage.md            — human review doc
 *   verification-output/safe-patch.json      — edits to auto-apply to data files
 *   verification-output/needs-eye.json       — flagged for user
 */
import { readFileSync, writeFileSync } from "node:fs"

type Edit = {
  id: string
  path: string
  from: unknown
  to: unknown
  reason: string
}

type Field = {
  field: string
  status: string
  stored: unknown
  extracted: unknown
  confidence?: string
  snippet?: string
}

type Result = {
  id: string
  bank_name: string
  url: string
  fields: Field[]
  pageSignal: string
  consensus?: { sourcesAgree: boolean; secondary: { url: string } }
}

const edits: Edit[] = JSON.parse(
  readFileSync("/Users/nathaniel/stacks-gpt/verification-output/proposed-edits.json", "utf8"),
)
const results: Result[] = JSON.parse(
  readFileSync("/Users/nathaniel/stacks-gpt/verification-output/results.json", "utf8"),
)
const byId = new Map(results.map((r) => [r.id, r]))

type Bucket = "SAFE" | "NEEDS_EYE" | "LIKELY_NOISE"

type Classified = Edit & {
  bucket: Bucket
  bank_name: string
  url: string
  snippet?: string
  consensus_agrees?: boolean | null
  tier_hint?: string
}

function fieldKeyFor(path: string): string {
  // fields[].field uses the leaf name; proposed-edit.path uses dotted path
  const parts = path.split(".")
  return parts[parts.length - 1]
}

function classify(e: Edit, r: Result | undefined): Omit<Classified, keyof Edit> {
  const bank = r?.bank_name ?? ""
  const url = r?.url ?? ""
  const field = r?.fields.find((f) => f.field === fieldKeyFor(e.path))
  const snippet = field?.snippet

  // expired-flip from a hard 404/410 is safe — the bank's own server told us.
  if (e.path === "expired" && typeof e.reason === "string" && e.reason.includes("offer_dead")) {
    return {
      bucket: "SAFE",
      bank_name: bank,
      url,
      snippet,
      consensus_agrees: r?.consensus?.sourcesAgree ?? null,
      tier_hint: "page_404_or_410",
    }
  }

  // Tier-3 Claude "different" verdicts already looked at context.
  if (e.reason?.startsWith("Claude: different")) {
    return {
      bucket: "SAFE",
      bank_name: bank,
      url,
      snippet,
      consensus_agrees: r?.consensus?.sourcesAgree ?? null,
      tier_hint: "llm_judged",
    }
  }

  // Tier-mismatch detector: if the snippet contains multiple dollar amounts
  // or a table-of-tiers pattern, this is likely a different row in the page's
  // offer matrix, not a real change. Flag for human.
  if (e.path === "bonus_amount" || e.path === "requirements.min_direct_deposit_total") {
    const tierHint = snippet && /\$\d[\d,]+\s+\$\d[\d,]+\s+\$\d[\d,]+/.test(snippet)
    if (tierHint) {
      return {
        bucket: "NEEDS_EYE",
        bank_name: bank,
        url,
        snippet,
        consensus_agrees: r?.consensus?.sourcesAgree ?? null,
        tier_hint: "multi_tier_page",
      }
    }
  }

  // Monthly fee=0 with "no monthly fee" in snippet is usually real but has
  // a conditional waiver ("no fee WITH direct deposit"). Flag for eye.
  if (e.path === "fees.monthly_fee" && e.to === 0) {
    const conditional = snippet && /(?:if|when|with|unless|under\s+age)/i.test(snippet)
    return {
      bucket: conditional ? "NEEDS_EYE" : "SAFE",
      bank_name: bank,
      url,
      snippet,
      consensus_agrees: r?.consensus?.sourcesAgree ?? null,
      tier_hint: conditional ? "fee_waived_conditionally" : "no_fee_stated",
    }
  }

  // Default for remaining high-confidence regex mismatches: needs eye.
  return {
    bucket: "NEEDS_EYE",
    bank_name: bank,
    url,
    snippet,
    consensus_agrees: r?.consensus?.sourcesAgree ?? null,
  }
}

const classified: Classified[] = edits.map((e) => {
  const r = byId.get(e.id)
  return { ...e, ...classify(e, r) }
})

const safe = classified.filter((c) => c.bucket === "SAFE")
const needsEye = classified.filter((c) => c.bucket === "NEEDS_EYE")
const noise = classified.filter((c) => c.bucket === "LIKELY_NOISE")

// ── Write outputs ──────────────────────────────────────────────────────────
const OUT = "/Users/nathaniel/stacks-gpt/verification-output"

writeFileSync(
  `${OUT}/safe-patch.json`,
  JSON.stringify(
    safe.map((c) => ({ id: c.id, path: c.path, from: c.from, to: c.to, reason: c.reason })),
    null,
    2,
  ),
)
writeFileSync(
  `${OUT}/needs-eye.json`,
  JSON.stringify(
    needsEye.map((c) => ({
      id: c.id,
      bank: c.bank_name,
      path: c.path,
      from: c.from,
      to: c.to,
      tier_hint: c.tier_hint,
      url: c.url,
      consensus_agrees: c.consensus_agrees,
      snippet: c.snippet?.replace(/\s+/g, " ").slice(0, 200),
    })),
    null,
    2,
  ),
)

const md: string[] = []
md.push(`# Proposed Edits — Triage`)
md.push(``)
md.push(`Generated: ${new Date().toISOString()}`)
md.push(``)
md.push(`- **Total proposed edits**: ${classified.length}`)
md.push(`- ✅ SAFE (auto-apply): ${safe.length}`)
md.push(`- 👀 NEEDS EYE: ${needsEye.length}`)
md.push(`- 🗑️ LIKELY NOISE: ${noise.length}`)
md.push(``)
md.push(`## ✅ SAFE — ready to apply`)
md.push(``)
md.push(`See \`safe-patch.json\` for a machine-readable version.`)
md.push(``)
md.push(`| Bonus | Path | From | To | Source | Rationale |`)
md.push(`|---|---|---|---|---|---|`)
for (const c of safe) {
  const from = JSON.stringify(c.from)
  const to = JSON.stringify(c.to)
  // Strip the "Claude: different — " prefix that adds no info in a table
  const rationale = (c.reason ?? "").replace(/^Claude:\s+different\s+—\s+/, "").replace(/\|/g, "\\|").slice(0, 180)
  md.push(`| \`${c.id}\` | \`${c.path}\` | ${from} | ${to} | ${c.tier_hint ?? ""} | ${rationale} |`)
}
md.push(``)
md.push(`## 👀 NEEDS EYE — human review`)
md.push(``)
md.push(`| Bonus | Path | From | To | Hint | Consensus | Snippet |`)
md.push(`|---|---|---|---|---|---|---|`)
for (const c of needsEye) {
  const from = JSON.stringify(c.from)
  const to = JSON.stringify(c.to)
  const ca =
    c.consensus_agrees === null || c.consensus_agrees === undefined
      ? "—"
      : c.consensus_agrees
        ? "agree"
        : "disagree"
  const sn = c.snippet?.replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 120) ?? ""
  md.push(
    `| \`${c.id}\` | \`${c.path}\` | ${from} | ${to} | ${c.tier_hint ?? ""} | ${ca} | ${sn} |`,
  )
}

writeFileSync(`${OUT}/triage.md`, md.join("\n"))

console.log(`Total proposed edits: ${classified.length}`)
console.log(`  SAFE:        ${safe.length}`)
console.log(`  NEEDS_EYE:   ${needsEye.length}`)
console.log(`  LIKELY_NOISE: ${noise.length}`)
console.log(``)
console.log(`Output:`)
console.log(`  ${OUT}/triage.md         (human review)`)
console.log(`  ${OUT}/safe-patch.json   (auto-apply manifest)`)
console.log(`  ${OUT}/needs-eye.json    (flagged for user)`)
