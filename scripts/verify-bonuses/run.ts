/* eslint-disable no-console */
import { existsSync } from "node:fs"
// Auto-load .env.local so ANTHROPIC_API_KEY / Supabase keys are visible
// without needing `set -a; source .env.local` first. Node ≥21.7 ships
// process.loadEnvFile natively — no dotenv dep needed.
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { randomUUID } from "node:crypto"
import pLimit from "p-limit"
import { createClient } from "@supabase/supabase-js"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { extract } from "./extract"
import { compareRecord } from "./compare"
import { escalate, needsEscalation } from "./escalate"
import { loadCache, saveCache, isFresh } from "./cache"
import { writeReport } from "./report"
import { runConsensus, classifySource, type SourceReading } from "./consensus"
import {
  loadFeedbackState,
  resolveUrl,
  shouldSuppressEdit,
  getHint,
  EMPTY_STATE,
  type FeedbackState,
} from "./feedback-loop"
import type {
  BonusRecord,
  VerificationResult,
  ProposedEdit,
  FieldResult,
} from "./types"

// CLI flags: --only=<id>[,<id>...], --limit=<n>, --no-cache, --no-escalate, --include-expired, --persist
const args = process.argv.slice(2)
function flag(name: string): string | undefined {
  const found = args.find((a) => a.startsWith(`--${name}=`))
  return found?.split("=")[1]
}
const ONLY = flag("only")
const ONLY_IDS = ONLY ? new Set(ONLY.split(",").map((s) => s.trim()).filter(Boolean)) : null
const LIMIT = Number(flag("limit") ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const ESCALATE = !args.includes("--no-escalate")
const INCLUDE_EXPIRED = args.includes("--include-expired")
const PERSIST = args.includes("--persist")

const CONCURRENCY = 3
const MAX_ESCALATIONS_PER_RUN = 20

// Budget tracker for Claude calls
let escalationBudget = MAX_ESCALATIONS_PER_RUN

// Feedback-loop state is loaded once at startup and threaded into verifyOne so
// each bonus can pick up an admin URL override without an extra Supabase round
// trip per fetch. Defaults to an empty state if Supabase isn't reachable.
let feedbackState: FeedbackState = EMPTY_STATE

async function verifyOne(record: BonusRecord): Promise<VerificationResult> {
  const defaultUrl = record.source_links?.[0] ?? ""
  const url = resolveUrl(feedbackState, record.id, defaultUrl)
  const verifiedAt = new Date().toISOString()

  if (!url) {
    return {
      id: record.id,
      bank_name: record.bank_name,
      url: "",
      fetch: { ok: false, status: 0, finalUrl: "", redirected: false, error: "no source_link" },
      fields: [],
      pageSignal: "fetch_error",
      escalations: [],
      verifiedAt,
    }
  }

  // Cache
  const cached = USE_CACHE ? loadCache(record.id) : null
  const fresh = cached && cached.url === url && isFresh(cached)

  let textContent: string
  let fetch: VerificationResult["fetch"]
  let redirected = false
  let finalUrl = url
  let ok = true
  let status = 200

  if (fresh) {
    textContent = cached.textContent
    fetch = { ok: true, status: 200, finalUrl: cached.url, redirected: false }
  } else {
    const f = await fetchPage(url)
    textContent = f.textContent
    ok = f.ok
    status = f.status
    finalUrl = f.finalUrl
    redirected = f.redirected
    fetch = {
      ok: f.ok,
      status: f.status,
      finalUrl: f.finalUrl,
      redirected: f.redirected,
      error: f.error,
    }
    if (f.ok && textContent) {
      saveCache(record.id, {
        url,
        htmlHash: f.htmlHash,
        textContent: f.textContent,
        fetchedAt: f.fetchedAt,
      })
    }
  }

  // Page signals
  let pageSignal: VerificationResult["pageSignal"] = "ok"
  if (!ok) {
    if (status === 404 || status === 410) pageSignal = "offer_dead"
    else pageSignal = "fetch_error"
  } else if (redirected) {
    try {
      const orig = new URL(url).pathname
      const final = new URL(finalUrl).pathname
      if (orig.length > 3 && (final === "/" || final === ""))
        pageSignal = "promo_removed"
    } catch {}
  }

  const extracted = pageSignal === "ok" ? extract(textContent) : null
  if (extracted?.expiredText) pageSignal = "expired_text_on_page"

  let fields: FieldResult[] = []
  if (extracted) fields = compareRecord(record, extracted)

  // If every field came back "missing" AND the stored record has real values
  // to compare against, the page we fetched almost certainly isn't the live
  // offer page (it might be legal T&Cs, a generic product page, or a dead
  // product). Escalate from silent "missing" to a loud page signal.
  if (
    pageSignal === "ok" &&
    fields.length > 0 &&
    fields.every((f) => f.status === "missing") &&
    fields.some((f) => f.stored !== null && f.stored !== undefined)
  ) {
    pageSignal = "no_fields_extracted"
  }

  // Escalate ambiguous fields (budget-limited)
  const escalations: VerificationResult["escalations"] = []
  if (ESCALATE && extracted) {
    for (const f of fields) {
      if (!needsEscalation(f)) continue
      if (escalationBudget <= 0) break
      const snippet = "snippet" in f ? f.snippet ?? "" : ""
      if (!snippet) continue
      try {
        const adminHint = getHint(feedbackState, record.id, fieldPath(f.field) ?? f.field)
        const v = await escalate(
          record.bank_name,
          f.field,
          f.stored,
          f.extracted,
          snippet,
          adminHint
            ? {
                issue_category: adminHint.issue_category,
                issue_description: adminHint.issue_description,
                suggested_fix: adminHint.suggested_fix,
                corrected_value: adminHint.corrected_value,
              }
            : null,
        )
        escalations.push(v)
        escalationBudget--
      } catch (err) {
        console.warn(
          `[escalate] ${record.id}/${f.field} failed:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  // Phase 3: cross-source consensus. If the bonus has a secondary source
  // (usually a DoC article) re-fetch it, run the same extractors, and compare
  // bonus_amount. Only fires when the primary actually parsed — a broken
  // primary tells us nothing useful about consensus.
  let consensus: VerificationResult["consensus"]
  if (pageSignal === "ok" && extracted) {
    const primaryReading: SourceReading = {
      kind: classifySource(url),
      url,
      ok: true,
      extracted,
      fetch,
    }
    try {
      const c = await runConsensus(record, primaryReading, { useCache: USE_CACHE })
      if (c.secondary) {
        consensus = {
          sourcesAgree: c.sourcesAgree,
          disagreements: c.disagreements,
          secondary: { kind: c.secondary.kind, url: c.secondary.url, ok: c.secondary.ok },
        }
      }
    } catch (err) {
      console.warn(
        `[consensus] ${record.id} failed:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  return {
    id: record.id,
    bank_name: record.bank_name,
    url,
    fetch,
    fields,
    pageSignal,
    escalations,
    consensus,
    verifiedAt,
  }
}

// Build proposed edits from mismatches + escalations that say "different".
// Filters edits the admin has already triaged (approved-with-same-target or
// dismissed-with-unchanged-snippet) using the feedback-loop state.
function buildEdits(results: VerificationResult[]): ProposedEdit[] {
  const edits: ProposedEdit[] = []
  let suppressed = 0

  function tryPush(edit: ProposedEdit, snippet: string | null) {
    const decision = shouldSuppressEdit(
      feedbackState,
      edit.id,
      edit.path,
      { from: edit.from, to: edit.to },
      snippet,
    )
    if (decision.suppress) {
      suppressed++
      return
    }
    edits.push(edit)
  }

  for (const r of results) {
    if (r.pageSignal === "offer_dead" || r.pageSignal === "promo_removed" || r.pageSignal === "expired_text_on_page") {
      tryPush(
        {
          id: r.id,
          path: "expired",
          from: false,
          to: true,
          reason: `Page signal: ${r.pageSignal}${r.fetch.error ? ` (${r.fetch.error})` : ""}`,
        },
        r.pageSignal,
      )
      continue
    }
    const escalateMap = new Map(r.escalations.map((e) => [e.field, e]))
    for (const f of r.fields) {
      const path = fieldPath(f.field)
      if (!path) continue
      const snippet = "snippet" in f ? (f.snippet ?? null) : null
      if (f.status === "mismatch" && "confidence" in f && f.confidence === "high") {
        tryPush(
          { id: r.id, path, from: f.stored, to: f.extracted, reason: `High-confidence regex mismatch` },
          snippet,
        )
      } else if (f.status === "ambiguous") {
        const ver = escalateMap.get(f.field)
        if (ver?.verdict === "different") {
          tryPush(
            { id: r.id, path, from: f.stored, to: f.extracted, reason: `Claude: different — ${ver.rationale}` },
            snippet,
          )
        }
      }
    }
  }

  if (suppressed > 0) {
    console.log(`[feedback] suppressed ${suppressed} edit(s) based on prior admin decisions`)
  }
  return edits
}

function fieldPath(field: string): string | null {
  switch (field) {
    case "bonus_amount":
      return "bonus_amount"
    case "min_direct_deposit_total":
      return "requirements.min_direct_deposit_total"
    case "deposit_window_days":
      return "requirements.deposit_window_days"
    case "monthly_fee":
      return "fees.monthly_fee"
    default:
      return null
  }
}

// Maps each bonus id back to its catalog ("checking" or "savings") so the
// persist step can populate bonus_kind. Built once at startup.
const BONUS_KIND = new Map<string, "checking" | "savings">()
for (const b of bonuses as BonusRecord[]) BONUS_KIND.set(b.id, "checking")
for (const b of savingsBonuses as unknown as BonusRecord[]) BONUS_KIND.set(b.id, "savings")

/**
 * Map a VerificationResult to a confidence tier for the freshness badge UI.
 *   high   = page loaded + 0 mismatches
 *   medium = 1-2 mismatches OR ambiguous signals (likely regex false positives)
 *   low    = offer dead, fetch error, no fields extracted, or 3+ mismatches
 *
 * Cross-source consensus (Phase 3) then adjusts one step:
 *   - sources agree on bonus_amount      → bump up   (medium → high)
 *   - sources disagree on bonus_amount   → knock down (high → medium)
 * No consensus data (only one source) leaves the base tier untouched.
 */
function confidenceFor(r: VerificationResult): "high" | "medium" | "low" {
  if (r.pageSignal !== "ok") return "low"
  const mismatches = r.fields.filter((f) => f.status === "mismatch").length
  const ambiguous = r.fields.filter((f) => f.status === "ambiguous").length
  let base: "high" | "medium" | "low"
  if (mismatches === 0 && ambiguous === 0) base = "high"
  else if (mismatches + ambiguous <= 2) base = "medium"
  else base = "low"

  if (r.consensus?.secondary) {
    if (r.consensus.sourcesAgree && base === "medium") return "high"
    if (!r.consensus.sourcesAgree && base === "high") return "medium"
  }
  return base
}

async function persistResults(
  results: VerificationResult[],
  edits: ProposedEdit[],
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[persist] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --persist")
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const runId = randomUUID()
  const runAt = new Date().toISOString()

  // Group edits by bonus id so each row carries its own proposals.
  const editsByBonus = new Map<string, ProposedEdit[]>()
  for (const e of edits) {
    const arr = editsByBonus.get(e.id) ?? []
    arr.push(e)
    editsByBonus.set(e.id, arr)
  }

  // bonus_verifications: only problem rows (admin queue).
  const problemRows = results
    .filter((r) =>
      r.pageSignal !== "ok" ||
      r.fields.some((f) => f.status === "mismatch" || f.status === "ambiguous"),
    )
    .map((r) => ({
      run_id: runId,
      run_at: runAt,
      bonus_id: r.id,
      bank_name: r.bank_name,
      bonus_kind: BONUS_KIND.get(r.id) ?? "checking",
      url: r.url,
      final_url: r.fetch.finalUrl ?? null,
      status: r.fetch.status ?? null,
      page_signal: r.pageSignal,
      field_mismatches: r.fields.filter((f) => f.status === "mismatch" || f.status === "ambiguous"),
      proposed_edits: editsByBonus.get(r.id) ?? [],
      error_message: r.fetch.error ?? null,
    }))

  if (problemRows.length > 0) {
    const { error } = await supabase.from("bonus_verifications").insert(problemRows)
    if (error) {
      console.error(`[persist] bonus_verifications insert failed:`, error.message)
      process.exit(1)
    }
    console.log(`[persist] Wrote ${problemRows.length} problem rows for run ${runId}`)
  } else {
    console.log(`[persist] All bonuses OK — nothing to write to bonus_verifications.`)
  }

  // catalog_verification_state: one row per verified bonus, refreshed every run.
  // Drives the "Verified 4h ago ✓" freshness badge in the UI.
  const stateRows = results.map((r) => ({
    catalog_id: r.id,
    catalog_kind: BONUS_KIND.get(r.id) ?? "checking",
    verified_at: r.verifiedAt,
    verification_source: "bank_page",
    confidence: confidenceFor(r),
    mismatch_count: r.fields.filter((f) => f.status === "mismatch" || f.status === "ambiguous").length,
    page_signal: r.pageSignal,
    sources_agree: r.consensus?.secondary ? r.consensus.sourcesAgree : null,
    consensus_disagreements: r.consensus?.disagreements?.length ? r.consensus.disagreements : null,
    secondary_source_url: r.consensus?.secondary?.url ?? null,
    secondary_source_kind: r.consensus?.secondary?.kind ?? null,
    updated_at: runAt,
  }))
  const { error: stateErr } = await supabase
    .from("catalog_verification_state")
    .upsert(stateRows, { onConflict: "catalog_id" })
  if (stateErr) {
    console.error(`[persist] catalog_verification_state upsert failed:`, stateErr.message)
    process.exit(1)
  }
  console.log(`[persist] Refreshed freshness state for ${stateRows.length} bonuses`)

  // bonus_page_observations: append one row per OK fetch (skip fetch_errors).
  // Captures what the extractor actually saw so we can diff across runs and
  // surface "just bumped" UX signals. See migrations/013.
  const observationRows = results
    .filter((r) => r.pageSignal !== "fetch_error")
    .map((r) => {
      const extracted: Record<string, unknown> = {}
      const stored: Record<string, unknown> = {}
      for (const f of r.fields) {
        if (f.status === "match" || f.status === "mismatch" || f.status === "ambiguous") {
          extracted[f.field] = f.extracted
          stored[f.field] = f.stored
        }
      }
      return {
        catalog_id: r.id,
        catalog_kind: BONUS_KIND.get(r.id) ?? "checking",
        observed_at: r.verifiedAt,
        run_id: runId,
        source_url: r.url,
        extracted,
        stored_snapshot: stored,
      }
    })
  if (observationRows.length > 0) {
    const { error: obsErr } = await supabase.from("bonus_page_observations").insert(observationRows)
    if (obsErr) {
      console.error(`[persist] bonus_page_observations insert failed:`, obsErr.message)
      // Non-fatal: observations are a Phase 5 nice-to-have, don't block the run
    } else {
      console.log(`[persist] Logged ${observationRows.length} page observations`)
    }
  }
}

async function main() {
  // Pull admin URL overrides + verdicts from Supabase. No-op if env unset —
  // the run still completes, just without the feedback loop.
  feedbackState = await loadFeedbackState()

  const all: BonusRecord[] = [
    ...(bonuses as BonusRecord[]),
    ...(savingsBonuses as unknown as BonusRecord[]),
  ]

  let targets = all
  if (ONLY_IDS) targets = targets.filter((b) => ONLY_IDS.has(b.id))
  if (!INCLUDE_EXPIRED) targets = targets.filter((b) => !b.expired)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Verifying ${targets.length} bonuses (concurrency=${CONCURRENCY}, cache=${USE_CACHE ? "on" : "off"}, escalate=${ESCALATE ? "on" : "off"})`,
  )

  const limit = pLimit(CONCURRENCY)
  const results: VerificationResult[] = []
  let done = 0

  // Hard per-bonus timeout. Playwright's own 30s fetch timeout occasionally
  // fails to fire when a bank page streams chunks slowly or a DoC article
  // hangs on a third-party embed — we've seen single bonuses stall the whole
  // run indefinitely, blocking persist. 120s is generous (primary fetch +
  // consensus fetch + escalation each have their own sub-timeouts).
  const BONUS_TIMEOUT_MS = 120_000
  async function verifyWithTimeout(t: BonusRecord): Promise<VerificationResult> {
    return Promise.race([
      verifyOne(t),
      new Promise<VerificationResult>((resolve) =>
        setTimeout(
          () =>
            resolve({
              id: t.id,
              bank_name: t.bank_name,
              url: t.source_links?.[0] ?? "",
              fetch: {
                ok: false,
                status: 0,
                finalUrl: "",
                redirected: false,
                error: `verify timeout after ${BONUS_TIMEOUT_MS}ms`,
              },
              fields: [],
              pageSignal: "fetch_error",
              escalations: [],
              verifiedAt: new Date().toISOString(),
            }),
          BONUS_TIMEOUT_MS,
        ),
      ),
    ])
  }

  await Promise.all(
    targets.map((t) =>
      limit(async () => {
        const r = await verifyWithTimeout(t)
        results.push(r)
        done++
        const tag =
          r.pageSignal === "ok"
            ? r.fields.some((f) => f.status === "mismatch")
              ? "⚠️"
              : r.fields.some((f) => f.status === "ambiguous")
                ? "❓"
                : "✅"
            : "🚨"
        console.log(`[${done}/${targets.length}] ${tag} ${r.bank_name} (${r.id})`)
      }),
    ),
  )

  await closeBrowser()

  const edits = buildEdits(results)
  const rpt = writeReport(results, edits)
  console.log(``)
  console.log(`Done. Output: ${rpt.outDir}`)
  console.log(`Summary:`, rpt.totals, `| proposed edits: ${rpt.proposedEdits}`)
  console.log(`Claude escalations used: ${MAX_ESCALATIONS_PER_RUN - escalationBudget}/${MAX_ESCALATIONS_PER_RUN}`)

  if (PERSIST) {
    await persistResults(results, edits)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    closeBrowser().finally(() => process.exit(1))
  })
