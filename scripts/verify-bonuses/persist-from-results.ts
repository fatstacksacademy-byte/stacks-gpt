/**
 * One-off: replay the persist step against verification-output/results.json
 * and verification-output/proposed-edits.json. Used when a long verify run
 * completed but the final DB insert failed (transient fetch error, oversized
 * batch, etc.) — re-running the verifier would re-burn Claude escalations and
 * Playwright fetches, so we replay from the local snapshot instead.
 *
 * Batches inserts to dodge the "TypeError: fetch failed" that hits when the
 * payload exceeds the Supabase fetch limit.
 */
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import type { BonusRecord, VerificationResult, ProposedEdit } from "./types"

const OUT = "/Users/nathaniel/stacks-gpt/verification-output"
const BATCH = 25

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const results: VerificationResult[] = JSON.parse(
    readFileSync(join(OUT, "results.json"), "utf8"),
  )
  const edits: ProposedEdit[] = JSON.parse(
    readFileSync(join(OUT, "proposed-edits.json"), "utf8"),
  )

  const BONUS_KIND = new Map<string, "checking" | "savings">()
  for (const b of bonuses as BonusRecord[]) BONUS_KIND.set(b.id, "checking")
  for (const b of savingsBonuses as unknown as BonusRecord[]) BONUS_KIND.set(b.id, "savings")

  const runId = randomUUID()
  const runAt = new Date().toISOString()

  const editsByBonus = new Map<string, ProposedEdit[]>()
  for (const e of edits) {
    const arr = editsByBonus.get(e.id) ?? []
    arr.push(e)
    editsByBonus.set(e.id, arr)
  }

  const problemRows = results
    .filter(
      (r) =>
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
      field_mismatches: r.fields.filter(
        (f) => f.status === "mismatch" || f.status === "ambiguous",
      ),
      proposed_edits: editsByBonus.get(r.id) ?? [],
      error_message: r.fetch.error ?? null,
    }))

  let inserted = 0
  for (let i = 0; i < problemRows.length; i += BATCH) {
    const slice = problemRows.slice(i, i + BATCH)
    const { error } = await supabase.from("bonus_verifications").insert(slice)
    if (error) {
      console.error(`[persist] bonus_verifications batch ${i}-${i + slice.length} failed:`, error.message)
      process.exit(1)
    }
    inserted += slice.length
    console.log(`[persist] bonus_verifications: ${inserted}/${problemRows.length}`)
  }

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
  let upserted = 0
  for (let i = 0; i < stateRows.length; i += BATCH) {
    const slice = stateRows.slice(i, i + BATCH)
    const { error } = await supabase
      .from("catalog_verification_state")
      .upsert(slice, { onConflict: "catalog_id" })
    if (error) {
      console.error(`[persist] catalog_verification_state batch ${i}-${i + slice.length} failed:`, error.message)
      process.exit(1)
    }
    upserted += slice.length
    console.log(`[persist] catalog_verification_state: ${upserted}/${stateRows.length}`)
  }

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
  let obsInserted = 0
  for (let i = 0; i < observationRows.length; i += BATCH) {
    const slice = observationRows.slice(i, i + BATCH)
    const { error } = await supabase.from("bonus_page_observations").insert(slice)
    if (error) {
      console.error(`[persist] bonus_page_observations batch ${i}-${i + slice.length} failed:`, error.message)
      // non-fatal — observations are nice-to-have
      break
    }
    obsInserted += slice.length
    console.log(`[persist] bonus_page_observations: ${obsInserted}/${observationRows.length}`)
  }

  console.log(`\n✅ Persist complete. run_id=${runId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
