/* eslint-disable no-console */
/**
 * Phase 1 of the auto-apply pipeline: closes the loop between admin Approve
 * / Modify decisions in /admin/triage (and /admin/card-triage) and the live
 * lib/data/*.ts catalog files.
 *
 * Pulls every pending decision + URL override from Supabase (applied_at IS
 * NULL), applies the edit to the matching catalog file, and stamps applied_at
 * when the write succeeds. The patch engine refuses to mutate if the existing
 * stored value doesn't match the decision's from_value — so a stale or
 * race-conditioned decision never silently overwrites something else.
 *
 * Sources of pending changes:
 *   - verification_decisions       — bank/savings bonus field updates
 *   - card_verification_decisions  — credit card field updates
 *   - card_url_overrides           — credit card offer_link replacements
 *
 * Not yet handled (left for Phase 2/3):
 *   - bonus_url_overrides — source_links is an array; the patcher doesn't
 *     handle array indices yet
 *   - approved discover leads — adding new bonuses to the catalog needs more
 *     editorial decisions (related_slugs, blog content, etc.) than the
 *     triage decisions carry
 *
 * Usage:
 *   npm run catalog:apply-decisions             # dry-run, prints diff
 *   npm run catalog:apply-decisions -- --write  # actually mutate files + stamp applied_at
 *
 * After --write succeeds you still need to git diff + commit + push. Phase 4
 * will wire that into a GHA cron so this whole loop runs nightly.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { applyEditToText, type Edit, type ApplyStatus } from "./_shared/catalog-patcher"

const args = process.argv.slice(2)
const WRITE = args.includes("--write")
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0

const ROOT = "/Users/nathaniel/stacks-gpt"
const FILES = {
  bonus: [`${ROOT}/lib/data/bonuses.ts`, `${ROOT}/lib/data/savingsBonuses.ts`],
  card: [`${ROOT}/lib/data/creditCardBonuses.ts`],
} as const

type Source = "bonus_decision" | "card_decision" | "card_url_override"

type PendingEdit = Edit & {
  source: Source
  decision_id: string
  table: "verification_decisions" | "card_verification_decisions" | "card_url_overrides"
}

type Outcome = {
  source: Source
  decision_id: string
  target_id: string
  field_path: string
  file: string | null
  status: ApplyStatus
  from: unknown
  to: unknown
  actualStored?: unknown
}

function envFile(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync(`${ROOT}/.env.local`, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

async function main() {
  const env = envFile()
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )

  console.log(`Mode: ${WRITE ? "WRITE (modifies files + stamps applied_at)" : "DRY RUN (no changes)"}`)
  console.log("")

  // ─── Gather pending edits ─────────────────────────────────────────────

  const pending: PendingEdit[] = []

  // Bank/savings bonus decisions (approved verdict only — dismissed = "keep stored").
  const { data: bonusDecisions, error: bdErr } = await supabase
    .from("verification_decisions")
    .select("id, bonus_id, field_path, from_value, to_value, notes")
    .eq("verdict", "approved")
    .is("applied_at", null)
  if (bdErr) {
    console.error("Failed to fetch verification_decisions:", bdErr.message)
    process.exit(1)
  }
  for (const d of bonusDecisions ?? []) {
    pending.push({
      source: "bonus_decision",
      decision_id: d.id,
      table: "verification_decisions",
      id: d.bonus_id,
      path: d.field_path,
      from: d.from_value,
      to: d.to_value,
      reason: d.notes ?? undefined,
    })
  }
  console.log(`Bonus decisions pending: ${bonusDecisions?.length ?? 0}`)

  // Card decisions.
  const { data: cardDecisions, error: cdErr } = await supabase
    .from("card_verification_decisions")
    .select("id, card_id, field_path, from_value, to_value, notes")
    .eq("verdict", "approved")
    .is("applied_at", null)
  if (cdErr) {
    console.error("Failed to fetch card_verification_decisions:", cdErr.message)
    process.exit(1)
  }
  for (const d of cardDecisions ?? []) {
    pending.push({
      source: "card_decision",
      decision_id: d.id,
      table: "card_verification_decisions",
      id: d.card_id,
      path: d.field_path,
      from: d.from_value,
      to: d.to_value,
      reason: d.notes ?? undefined,
    })
  }
  console.log(`Card decisions pending:  ${cardDecisions?.length ?? 0}`)

  // Card URL overrides — the catalog field is offer_link (single string),
  // matches the patcher's scalar replace.
  const { data: cardUrls, error: cuErr } = await supabase
    .from("card_url_overrides")
    .select("id, card_id, override_url, previous_url, discovery_method")
    .eq("is_active", true)
    .is("applied_at", null)
  if (cuErr) {
    console.error("Failed to fetch card_url_overrides:", cuErr.message)
    process.exit(1)
  }
  for (const o of cardUrls ?? []) {
    pending.push({
      source: "card_url_override",
      decision_id: o.id,
      table: "card_url_overrides",
      id: o.card_id,
      path: "offer_link",
      from: o.previous_url, // may be null if catalog had no link — patcher will skip those
      to: o.override_url,
      reason: o.discovery_method,
    })
  }
  console.log(`Card URL overrides pend: ${cardUrls?.length ?? 0}`)
  console.log(`────────────────────────────`)
  console.log(`Total pending:           ${pending.length}`)
  console.log("")

  if (LIMIT > 0) pending.splice(LIMIT)
  if (pending.length === 0) {
    console.log("Nothing to apply.")
    return
  }

  // ─── Apply ────────────────────────────────────────────────────────────

  const outcomes: Outcome[] = []
  // Cache the file text we're mutating so a single run can apply multiple
  // edits to the same file efficiently.
  const fileCache = new Map<string, string>()
  const fileDirty = new Set<string>()

  function loadFile(path: string): string {
    if (!fileCache.has(path)) fileCache.set(path, readFileSync(path, "utf8"))
    return fileCache.get(path)!
  }

  for (const p of pending) {
    const candidateFiles = p.source === "card_decision" || p.source === "card_url_override"
      ? FILES.card
      : FILES.bonus

    let matched = false
    for (const file of candidateFiles) {
      const text = loadFile(file)
      const r = applyEditToText(text, p, WRITE)
      if (r.status === "not-found") continue
      matched = true
      if (r.status === "applied" || r.status === "dry-run") {
        fileCache.set(file, r.newText)
        if (r.status === "applied") fileDirty.add(file)
      }
      outcomes.push({
        source: p.source,
        decision_id: p.decision_id,
        target_id: p.id,
        field_path: p.path,
        file,
        status: r.status,
        from: p.from,
        to: p.to,
        actualStored: r.actualStored,
      })
      break
    }
    if (!matched) {
      outcomes.push({
        source: p.source,
        decision_id: p.decision_id,
        target_id: p.id,
        field_path: p.path,
        file: null,
        status: "not-found",
        from: p.from,
        to: p.to,
      })
    }
  }

  // ─── Write the dirty files ────────────────────────────────────────────

  if (WRITE && fileDirty.size > 0) {
    for (const file of fileDirty) {
      writeFileSync(file, fileCache.get(file)!)
      console.log(`✓ wrote ${file.replace(`${ROOT}/`, "")}`)
    }
  }

  // ─── Stamp applied_at on the successful ones ──────────────────────────

  if (WRITE) {
    const successesByTable = new Map<PendingEdit["table"], string[]>()
    for (const o of outcomes) {
      if (o.status !== "applied") continue
      const tbl = pending.find((p) => p.decision_id === o.decision_id)?.table
      if (!tbl) continue
      const arr = successesByTable.get(tbl) ?? []
      arr.push(o.decision_id)
      successesByTable.set(tbl, arr)
    }
    const now = new Date().toISOString()
    for (const [tbl, ids] of successesByTable) {
      const { error } = await supabase.from(tbl).update({ applied_at: now }).in("id", ids)
      if (error) {
        console.error(`⚠ failed to stamp applied_at on ${tbl}:`, error.message)
      } else {
        console.log(`✓ stamped applied_at on ${ids.length} row(s) in ${tbl}`)
      }
    }
  }

  // ─── Report ───────────────────────────────────────────────────────────

  const counts = {
    applied: outcomes.filter((o) => o.status === "applied").length,
    dryRun: outcomes.filter((o) => o.status === "dry-run").length,
    fromMismatch: outcomes.filter((o) => o.status === "from-mismatch").length,
    notFound: outcomes.filter((o) => o.status === "not-found").length,
    parseError: outcomes.filter((o) => o.status === "parse-error").length,
  }
  console.log("")
  console.log(`=== Report ===`)
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(15)} ${v}`)

  if (counts.fromMismatch > 0) {
    console.log(`\n⚠ ${counts.fromMismatch} edit(s) skipped — stored value doesn't match expected "from":`)
    for (const o of outcomes.filter((x) => x.status === "from-mismatch")) {
      console.log(
        `   ${o.target_id} ${o.field_path}: stored=${JSON.stringify(o.actualStored)} expected=${JSON.stringify(o.from)} (catalog probably hand-edited since decision was made)`,
      )
    }
  }
  if (counts.notFound > 0) {
    console.log(`\n⚠ ${counts.notFound} edit(s) had no matching id in any catalog file:`)
    for (const o of outcomes.filter((x) => x.status === "not-found").slice(0, 10)) {
      console.log(`   ${o.target_id} ${o.field_path}`)
    }
  }

  writeFileSync(
    `${ROOT}/verification-output/apply-decisions-report.json`,
    JSON.stringify(outcomes, null, 2),
  )
  console.log(`\nFull report: verification-output/apply-decisions-report.json`)
  if (!WRITE) console.log(`(dry-run) Pass --write to actually mutate files + stamp applied_at.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
