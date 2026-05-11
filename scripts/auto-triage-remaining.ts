/**
 * Apply heuristics learned from the user's 25 manual triage decisions to the
 * remaining queue. Output a recommendation per row that the user can review
 * and bulk-accept.
 *
 * Patterns extracted from user's verdicts:
 *
 * H1 — DISMISS conditional fee waivers
 *   "fees.monthly_fee: X → 0" where snippet contains "OR $0", "if", "when",
 *   "with", "under age", "no monthly fee with [condition]". These are
 *   conditional waivers — the stored fee is correct.
 *   User examples: BoA 4.95→0, Chase 15→0, us-bank-smartly 12→0
 *
 * H2 — APPROVE bonus_amount changes on a single-tier page
 *   When extracted differs from stored by < 50% AND no obvious tier table in
 *   snippet AND value is plausibly round.
 *   User examples: bmo 600→400, fifth-third 400→350
 *
 * H3 — DISMISS bonus_amount on multi-tier pages
 *   Snippet contains tier indicators ($X / $Y / $Z patterns or "Total Direct
 *   Deposits" tables). Stored is the documented tier.
 *   User example: figfcu 250→100 (it's the lower tier)
 *
 * H4 — DISMISS deposit_window_days when snippet mentions early-closure fee
 *   or "qualifying transactions"
 *   User example: us-bank-smartly 90→30 (was about fee waiver), figfcu 90→10
 *
 * H5 — APPROVE min_direct_deposit_total when extracted is round and snippet
 *   reads as a totaling/cumulative phrase
 *   User examples: psecu 1000→500, citizens 500→1000
 *
 * H6 — RECOMMEND_URL_OVERRIDE for tier-mismatch cases — these need manual
 *   URL discovery, not a simple verdict.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, writeFileSync } from "node:fs"

const env: Record<string, string> = {}
for (const line of readFileSync("/Users/nathaniel/stacks-gpt/.env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[m[1]] = v
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

type Reco = "approve" | "dismiss" | "needs_url" | "needs_eye"

function isConditionalFeeWaiver(snippet: string | null): boolean {
  if (!snippet) return false
  const s = snippet.toLowerCase()
  return (
    /\bor\s+\$\s*0\b/.test(s) ||                        // "$15 OR $0"
    /no\s+monthly\s+(service\s+|maintenance\s+)?fee\s+(with|when|if)/.test(s) || // conditional
    /no\s+monthly\s+fee.*(direct\s+deposit|under\s+age|balance|debit)/.test(s) ||
    /\$\d+\s+monthly.*\bor\b/.test(s) ||
    /(if|when|with|unless|under\s+age)\s+.{0,40}(direct\s+deposit|balance|debit|transactions?)/.test(s)
  )
}

function looksLikeTierTable(snippet: string | null): boolean {
  if (!snippet) return false
  // "$100 $2,000 $300 $5,000 $500 $10,000" pattern, or "Tier" word, or
  // 3+ dollar amounts in close succession
  const dollarHits = (snippet.match(/\$\d[\d,]{1,7}/g) ?? []).length
  if (dollarHits >= 4) return true
  if (/\btiers?\b/i.test(snippet)) return true
  if (/total\s+direct\s+deposits?/i.test(snippet)) return true
  return false
}

function isEarlyClosureContext(snippet: string | null): boolean {
  if (!snippet) return false
  return (
    /early\s+(account\s+)?(closure|termination|close)/i.test(snippet) ||
    /close\s+(the\s+)?account\s+within/i.test(snippet) ||
    /qualifying\s+transactions?/i.test(snippet)
  )
}

function isPlausibleBonusValue(v: unknown): boolean {
  if (typeof v !== "number") return false
  return v >= 25 && v <= 25000 && v % 25 === 0
}

function classify(row: any): { reco: Reco; reason: string } {
  const path = row.field_path as string
  const snippet = row.snippet as string | null
  const from = row.from_value
  const to = row.to_value

  // H1: conditional fee waiver
  if (path === "fees.monthly_fee" && to === 0 && typeof from === "number" && from > 0) {
    if (isConditionalFeeWaiver(snippet)) {
      return { reco: "dismiss", reason: "H1: conditional fee waiver — stored fee is correct, $0 is conditional on DD/age/balance" }
    }
  }

  // H3 / H4: tier-table or early-closure for amount/window/dd_total
  if (path === "bonus_amount") {
    if (!isPlausibleBonusValue(to)) {
      return { reco: "dismiss", reason: "H3: extracted not a plausible round bonus amount" }
    }
    if (looksLikeTierTable(snippet)) {
      return { reco: "needs_url", reason: "H3: tier-table page — needs URL override or split into separate bonuses per tier" }
    }
    if (typeof from === "number" && typeof to === "number") {
      const ratio = to / from
      if (ratio >= 0.5 && ratio <= 2.0 && Math.abs(to - from) >= 25) {
        return { reco: "approve", reason: "H2: plausible amount change on a single-tier page" }
      }
    }
  }

  if (path === "requirements.deposit_window_days") {
    if (isEarlyClosureContext(snippet)) {
      return { reco: "dismiss", reason: "H4: snippet is about early-closure / qualifying transactions, not deposit window" }
    }
    if (looksLikeTierTable(snippet)) {
      return { reco: "needs_eye", reason: "H4: multi-condition page — could be tier-specific window" }
    }
    if (typeof to === "number" && to > 0 && to <= 365) {
      return { reco: "approve", reason: "H4: plausible window change, snippet doesn't suggest fee/closure context" }
    }
  }

  if (path === "requirements.min_direct_deposit_total") {
    if (looksLikeTierTable(snippet)) {
      return { reco: "needs_url", reason: "H3: multi-tier DD page — stored value likely correct for the tier we track" }
    }
    if (typeof to === "number" && to >= 100 && to <= 50000) {
      // Look for cumulative/totaling language to be more confident
      const cumulative = snippet && /(totaling|cumulative|in\s+(qualifying\s+)?direct\s+deposits)/i.test(snippet)
      if (cumulative) {
        return { reco: "approve", reason: "H5: cumulative DD total mentioned in snippet, plausible value" }
      }
      return { reco: "needs_eye", reason: "H5: amount plausible but cumulative-language not in snippet" }
    }
  }

  if (path === "expired") {
    return { reco: "needs_url", reason: "expired-flip — verify with admin URL override workflow first" }
  }

  return { reco: "needs_eye", reason: "no heuristic matched" }
}

async function main() {
  // Pull triage queue from API logic — easier to query directly here.
  const { data: latestRun } = await supabase
    .from("bonus_verifications")
    .select("run_at")
    .order("run_at", { ascending: false })
    .limit(1)
    .single()

  if (!latestRun) {
    console.error("no runs found")
    return
  }
  const runAt = latestRun.run_at

  const { data: problems } = await supabase
    .from("bonus_verifications")
    .select("bonus_id, bank_name, url, page_signal, field_mismatches, proposed_edits")
    .eq("run_at", runAt)

  // Already-decided: skip
  const { data: decisions } = await supabase
    .from("verification_decisions")
    .select("bonus_id, field_path, verdict")
  // Skip anything the user has touched — approved, dismissed, OR snoozed.
  // Snoozed = "already worked on, wants to re-verify after URL change"; we
  // shouldn't auto-classify those.
  const decided = new Set<string>()
  for (const d of decisions ?? []) {
    decided.add(`${d.bonus_id}|${d.field_path}`)
  }

  const queue: any[] = []
  for (const p of problems ?? []) {
    const edits = (p.proposed_edits ?? []) as any[]
    const fields = (p.field_mismatches ?? []) as any[]
    for (const e of edits) {
      const key = `${p.bonus_id}|${e.path}`
      if (decided.has(key)) continue
      const leaf = e.path.split(".").pop()
      const fm = fields.find((f) => f.field === leaf)
      queue.push({
        bonus_id: p.bonus_id,
        bank_name: p.bank_name,
        url: p.url,
        page_signal: p.page_signal,
        field_path: e.path,
        from_value: e.from,
        to_value: e.to,
        reason: e.reason,
        snippet: fm?.snippet ?? null,
      })
    }
  }

  console.log(`Remaining queue: ${queue.length} edits across ${new Set(queue.map((q) => q.bonus_id)).size} bonuses\n`)

  type Bucket = { reco: Reco; rows: any[] }
  const buckets: Record<Reco, Bucket> = {
    approve: { reco: "approve", rows: [] },
    dismiss: { reco: "dismiss", rows: [] },
    needs_url: { reco: "needs_url", rows: [] },
    needs_eye: { reco: "needs_eye", rows: [] },
  }
  for (const r of queue) {
    const { reco, reason } = classify(r)
    buckets[reco].rows.push({ ...r, reasoning: reason })
  }

  for (const b of Object.values(buckets)) {
    console.log(`\n=== ${b.reco.toUpperCase()} (${b.rows.length}) ===`)
    for (const r of b.rows) {
      console.log(`  ${r.bonus_id} ${r.field_path}: ${JSON.stringify(r.from_value)} → ${JSON.stringify(r.to_value)}`)
      console.log(`    ↳ ${r.reasoning}`)
      if (r.snippet) console.log(`    snippet: ${r.snippet.replace(/\s+/g, " ").slice(0, 140)}`)
    }
  }

  // Persist for human review and for the bulk-apply step
  const out = {
    run_at: runAt,
    total: queue.length,
    counts: {
      approve: buckets.approve.rows.length,
      dismiss: buckets.dismiss.rows.length,
      needs_url: buckets.needs_url.rows.length,
      needs_eye: buckets.needs_eye.rows.length,
    },
    rows: queue.map((r) => {
      const c = classify(r)
      return { ...r, recommended_verdict: c.reco, reasoning: c.reason }
    }),
  }
  writeFileSync("/Users/nathaniel/stacks-gpt/verification-output/auto-triage.json", JSON.stringify(out, null, 2))
  console.log(`\nWrote /Users/nathaniel/stacks-gpt/verification-output/auto-triage.json`)
  console.log(`Counts: ${JSON.stringify(out.counts)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
