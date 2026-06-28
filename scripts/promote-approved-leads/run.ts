/* eslint-disable no-console */
/**
 * Phase 3 — promote approved discover leads to the live catalog.
 *
 * Pipeline:
 *   1. Read review-queue/leads.json, find every lead with status === "approved"
 *   2. Run the cheap dedup gate (no API cost). If duplicate → dismiss with note.
 *   3. Fetch the DoC URL + call Claude to generate a complete catalog entry
 *      OR mark as dismiss-worthy (expired, prepaid, thin data).
 *   4. Append the entry to the target file (bonuses.ts / savingsBonuses.ts /
 *      creditCardBonuses.ts).
 *   5. Update the lead's status in leads.json with disposition + audit notes.
 *
 * Defaults to dry-run. Pass --write to actually mutate files + leads.json.
 * Pass --limit=N to process only the first N approved leads (debugging).
 *
 * Closes the loop the user asked for: "much less input from me that finds
 * new bonuses regularly and pushes them."
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
// Auto-load .env.local when present (local dev). On CI the workflow injects env.
if (existsSync(".env.local")) process.loadEnvFile(".env.local")

import { closeBrowser } from "../_shared/playwright"
import { dedupCheck, type Lead } from "./dedup"
import { enrichLead, type EnrichmentResult } from "./enrich"
import { appendEntry } from "./file-mutator"
import { loadApprovedLeads, stampLeadDisposition } from "../_shared/discovery-leads"

const ROOT = process.cwd()
const LEADS_PATH = join(ROOT, "review-queue", "leads.json")
const OUT_DIR = join(ROOT, "verification-output")

const args = process.argv.slice(2)
const WRITE = args.includes("--write")
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
// Where approved leads come from. Supabase is the cross-machine source of truth
// (CI + the prod /admin/review UI write here); "local" keeps the old leads.json
// flow for offline local runs.
const SOURCE = (args.find((a) => a.startsWith("--source="))?.split("=")[1] ?? "supabase") as
  | "supabase"
  | "local"

type Outcome = {
  lead_id: string
  bank: string
  product: string
  stage: "dedup" | "enrich" | "append" | "success"
  result: "applied" | "dismissed" | "snoozed" | "dry_run_applied"
  reason: string
  matchedId?: string
  targetFile?: string
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  // Bonus leads only for now — card promotion uses the discover-cards renderer
  // and is a separate follow-up. Approved card leads stay queued until then.
  let approved: Lead[]
  let localLeads: Lead[] | null = null
  if (SOURCE === "local") {
    localLeads = JSON.parse(readFileSync(LEADS_PATH, "utf8")) as Lead[]
    approved = localLeads.filter((l) => (l as any).status === "approved")
  } else {
    const rows = await loadApprovedLeads("bonus")
    approved = rows.map((r) => r.payload as Lead)
  }
  if (LIMIT > 0) approved = approved.slice(0, LIMIT)

  console.log(`Source: ${SOURCE}`)
  console.log(`Mode: ${WRITE ? "WRITE (mutate catalog + stamp source)" : "DRY RUN (preview only)"}`)
  console.log(`Approved leads to process: ${approved.length}`)
  console.log("")

  const outcomes: Outcome[] = []
  let claudeCalls = 0

  for (const lead of approved) {
    const tag = `${lead.bank}: ${lead.product.slice(0, 50)}`

    // Stage 1: dedup gate (free).
    const verdict = dedupCheck(lead)
    if (verdict.isDuplicate) {
      console.log(`⏭  ${tag}`)
      console.log(`     dedup → dismissed (matched ${verdict.matchedId} in ${verdict.matchedFile})`)
      outcomes.push({
        lead_id: lead.id,
        bank: lead.bank,
        product: lead.product,
        stage: "dedup",
        result: "dismissed",
        reason: verdict.reason,
        matchedId: verdict.matchedId,
        targetFile: verdict.matchedFile,
      })
      continue
    }

    // Stage 2: enrich + generate (Claude + Playwright).
    console.log(`🧠 ${tag}`)
    const enrichment: EnrichmentResult = await enrichLead(lead)
    claudeCalls++

    if (enrichment.kind === "dismiss") {
      console.log(`     enrich → dismissed (${enrichment.reason}: ${enrichment.note.slice(0, 100)})`)
      outcomes.push({
        lead_id: lead.id,
        bank: lead.bank,
        product: lead.product,
        stage: "enrich",
        result: "dismissed",
        reason: `${enrichment.reason}: ${enrichment.note}`,
      })
      continue
    }

    // Stage 3: append to file.
    const appended = appendEntry(enrichment.target_file, enrichment.entry, WRITE)
    if (!appended.ok) {
      console.log(`     append → snoozed (${appended.reason})`)
      outcomes.push({
        lead_id: lead.id,
        bank: lead.bank,
        product: lead.product,
        stage: "append",
        result: "snoozed",
        reason: appended.reason,
        targetFile: enrichment.target_file,
      })
      continue
    }

    console.log(
      `✅ ${tag}\n     → ${enrichment.target_file} as ${(enrichment.entry as any).id} (${enrichment.mechanic})`,
    )
    outcomes.push({
      lead_id: lead.id,
      bank: lead.bank,
      product: lead.product,
      stage: "success",
      result: WRITE ? "applied" : "dry_run_applied",
      reason: `Wrote entry ${(enrichment.entry as any).id} to ${enrichment.target_file}`,
      targetFile: enrichment.target_file,
    })
  }

  await closeBrowser()

  // Stamp every terminal disposition back onto the source of truth, when writing.
  if (WRITE) {
    const terminal = (r: Outcome["result"]): r is "applied" | "dismissed" | "snoozed" =>
      r === "applied" || r === "dismissed" || r === "snoozed"
    const stamped = outcomes.filter((o) => terminal(o.result))
    if (SOURCE === "supabase") {
      for (const o of stamped) {
        await stampLeadDisposition("bonus", o.lead_id, {
          status: o.result as "applied" | "dismissed" | "snoozed",
          decision_notes: `${o.stage} → ${o.reason}${o.matchedId ? ` (matched ${o.matchedId})` : ""}`,
        })
      }
      console.log(`\nStamped ${stamped.length} disposition(s) in Supabase discovery_leads.`)
    } else if (localLeads) {
      for (const o of stamped) {
        const lead = localLeads.find((l) => l.id === o.lead_id) as any
        if (!lead) continue
        lead.status = o.result
        lead.decided_at = new Date().toISOString()
        lead.decided_by = "promote-approved-leads"
        lead.decision_notes = `${o.stage} → ${o.reason}${o.matchedId ? ` (matched ${o.matchedId})` : ""}`
      }
      const tmp = `${LEADS_PATH}.tmp.${process.pid}.${Date.now()}`
      writeFileSync(tmp, JSON.stringify(localLeads, null, 2))
      renameSync(tmp, LEADS_PATH)
      console.log(`\nUpdated leads.json with dispositions.`)
    }
  }

  // Report.
  const counts = outcomes.reduce((acc: Record<string, number>, o) => {
    acc[o.result] = (acc[o.result] ?? 0) + 1
    return acc
  }, {})
  const byStage = outcomes.reduce((acc: Record<string, number>, o) => {
    if (o.result === "dismissed") acc[`dismissed_at_${o.stage}`] = (acc[`dismissed_at_${o.stage}`] ?? 0) + 1
    return acc
  }, {})

  console.log(`\n=== Summary ===`)
  console.log(`Claude calls (enrichment): ${claudeCalls}`)
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(20)} ${v}`)
  console.log(`\n  Dedup save rate: ${(((approved.length - claudeCalls) / Math.max(1, approved.length)) * 100).toFixed(0)}% of leads dismissed without spending Claude tokens.`)
  if (Object.keys(byStage).length > 0) {
    console.log(`\n=== Dismissals by stage ===`)
    for (const [k, v] of Object.entries(byStage)) console.log(`  ${k.padEnd(28)} ${v}`)
  }

  writeFileSync(`${OUT_DIR}/promote-approved-leads-report.json`, JSON.stringify(outcomes, null, 2))
  console.log(`\nFull report: verification-output/promote-approved-leads-report.json`)
  if (!WRITE) console.log(`(dry-run) Pass --write to actually mutate catalog files + leads.json.`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
