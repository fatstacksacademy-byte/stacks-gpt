/* eslint-disable no-console */
/**
 * auto-triage — investigate the review queue so a human doesn't have to.
 *
 * For each pending discovery lead and each undecided verify mismatch, fetch the
 * live offer page and let Claude adjudicate (see adjudicate.ts):
 *   dismiss  → clear the noise (NEVER mutates the catalog)
 *   approve  → record an approval that flows into the daily review PR
 *   escalate → leave for a human in /admin/review
 *
 * Dry-run by default (prints what it WOULD do). Pass --write to persist:
 *   leads      → discovery_leads.status (approved / rejected); escalate stays 'new'
 *   mismatches → (bonus|card)_verification_decisions rows (approved / dismissed);
 *                escalate writes nothing, so it stays in the triage queue.
 *
 * Flags: --write  --limit-leads=N  --limit-mismatches=N  --kind=leads|mismatches|all
 */
import { existsSync } from "node:fs"
if (existsSync(".env.local")) process.loadEnvFile(".env.local")
import { writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { createClient } from "@supabase/supabase-js"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { adjudicateLead, adjudicateMismatch, type Verdict } from "./adjudicate"

const args = process.argv.slice(2)
const WRITE = args.includes("--write")
const KIND = (args.find((a) => a.startsWith("--kind="))?.split("=")[1] ?? "all") as "leads" | "mismatches" | "all"
const LIMIT_LEADS = Number(args.find((a) => a.startsWith("--limit-leads="))?.split("=")[1] ?? 0) || 0
const LIMIT_MM = Number(args.find((a) => a.startsWith("--limit-mismatches="))?.split("=")[1] ?? 0) || 0
const CONCURRENCY = 5

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

type Decision = {
  kind: "lead" | "bonus-mismatch" | "card-mismatch"
  ref: string
  label: string
  field?: string
  from?: unknown
  to?: unknown
  verdict: Verdict
}

async function pageText(url: string | null | undefined): Promise<{ ok: boolean; text: string; finalUrl: string }> {
  if (!url) return { ok: false, text: "", finalUrl: "" }
  try {
    const r = await fetchPage(url)
    return { ok: r.ok, text: r.textContent ?? "", finalUrl: r.finalUrl ?? url }
  } catch {
    return { ok: false, text: "", finalUrl: url }
  }
}

async function loadLeads() {
  const { data } = await sb.from("discovery_leads").select("*").eq("status", "new").order("discovered_at", { ascending: false })
  let rows = data ?? []
  if (LIMIT_LEADS > 0) rows = rows.slice(0, LIMIT_LEADS)
  return rows as any[]
}

async function loadMismatches(vt: string, dt: string, idcol: string, namecol: string) {
  const { data: run } = await sb.from(vt).select("run_at").order("run_at", { ascending: false }).limit(1)
  const runAt = run?.[0]?.run_at
  if (!runAt) return []
  const { data: rows } = await sb.from(vt).select(`${idcol},${namecol},url,final_url,page_signal,proposed_edits`).eq("run_at", runAt)
  const { data: decs } = await sb.from(dt).select(`${idcol},field_path`)
  const decided = new Set((decs ?? []).map((d: any) => `${d[idcol]}|${d.field_path}`))
  const out: any[] = []
  for (const r of rows ?? []) {
    const url = (r as any).final_url || (r as any).url
    for (const e of ((r as any).proposed_edits ?? [])) {
      if (String(e.path).startsWith("expired")) continue // "mark expired" stays human-only
      if (decided.has(`${(r as any)[idcol]}|${e.path}`)) continue
      out.push({ id: (r as any)[idcol], name: (r as any)[namecol], url, field: e.path, from: e.from, to: e.to })
    }
  }
  return LIMIT_MM > 0 ? out.slice(0, LIMIT_MM) : out
}

// Persist ONE decision immediately. Incremental writes mean a mid-run timeout
// (the step is time-boxed) keeps everything decided so far instead of losing it.
async function applyDecision(d: Decision): Promise<void> {
  const v = d.verdict
  if (v.decision === "escalate") return
  const now = new Date().toISOString()
  if (d.kind === "lead") {
    await sb.from("discovery_leads").update({
      status: v.decision === "approve" ? "approved" : "rejected",
      decided_by: "auto-triage", decided_at: now,
      decision_notes: `auto-triage (${v.confidence}): ${v.reason}`, updated_at: now,
    }).eq("id", d.ref)
  } else {
    const table = d.kind === "bonus-mismatch" ? "verification_decisions" : "card_verification_decisions"
    const idcol = d.kind === "bonus-mismatch" ? "bonus_id" : "card_id"
    await sb.from(table).insert({
      [idcol]: d.ref, field_path: d.field,
      verdict: v.decision === "approve" ? "approved" : "dismissed",
      // from_value lets apply-decisions confirm the catalog still holds the value
      // we judged against (race protection) before it patches.
      from_value: d.from ?? null,
      to_value: v.decision === "approve" ? (v.corrected_value ?? d.to ?? null) : null,
      decided_by: "auto-triage",
      notes: `auto-triage (${v.confidence}): ${v.reason}`,
    })
  }
}

async function main() {
  console.log(`auto-triage — ${WRITE ? "WRITE" : "DRY RUN"} | kind=${KIND}`)
  const decisions: Decision[] = []
  const limit = pLimit(CONCURRENCY)

  // ── Leads ──
  if (KIND === "all" || KIND === "leads") {
    const leads = await loadLeads()
    console.log(`Leads to investigate: ${leads.length}`)
    await Promise.all(
      leads.map((l) =>
        limit(async () => {
          const pg = await pageText(l.canonical_url || l.source_url)
          const verdict = await adjudicateLead({
            kind: l.kind, institution: l.institution, name: l.name,
            bonus_amount: l.bonus_amount, classification: l.classification,
            pageOk: pg.ok, pageText: pg.text, finalUrl: pg.finalUrl,
          })
          const dec: Decision = { kind: "lead", ref: l.id, label: `${l.institution ?? "?"} — ${l.name}`, verdict }
          decisions.push(dec)
          if (WRITE) await applyDecision(dec)
          console.log(`  [lead/${verdict.decision}/${verdict.confidence}] ${l.institution ?? "?"} — ${String(l.name).slice(0, 50)} :: ${verdict.reason}`)
        }),
      ),
    )
  }

  // ── Mismatches ──
  async function doMismatches(kind: "bonus-mismatch" | "card-mismatch", vt: string, dt: string, idc: string, nc: string) {
    const items = await loadMismatches(vt, dt, idc, nc)
    console.log(`${kind} to investigate: ${items.length}`)
    await Promise.all(
      items.map((m) =>
        limit(async () => {
          const pg = await pageText(m.url)
          let verdict = await adjudicateMismatch({
            name: m.name, field: m.field, stored: m.from, extracted: m.to,
            pageOk: pg.ok, pageText: pg.text, finalUrl: pg.finalUrl,
          })
          // Guard the model's biggest failure mode: an "approve" whose corrected
          // value is missing (can't apply) or equals our stored value (not a real
          // change — the reasoning actually confirmed the catalog). Never let
          // those write a catalog change.
          if (verdict.decision === "approve") {
            const cv = verdict.corrected_value
            if (cv === null || cv === undefined || String(cv).trim() === "") {
              verdict = { ...verdict, decision: "escalate", reason: `approve without a corrected value → escalated. ${verdict.reason}` }
            } else if (String(cv).trim().toLowerCase() === String(m.from).trim().toLowerCase()) {
              verdict = { ...verdict, decision: "dismiss", reason: `page confirms stored value → dismissed. ${verdict.reason}` }
            }
          }
          const dec: Decision = { kind, ref: m.id, label: m.name, field: m.field, from: m.from, to: m.to, verdict }
          decisions.push(dec)
          if (WRITE) await applyDecision(dec)
          console.log(`  [${kind}/${verdict.decision}/${verdict.confidence}] ${String(m.name).slice(0, 40)} ${m.field}: ${JSON.stringify(m.from)}→${JSON.stringify(verdict.corrected_value ?? m.to)} :: ${verdict.reason}`)
        }),
      ),
    )
  }
  if (KIND === "all" || KIND === "mismatches") {
    await doMismatches("bonus-mismatch", "bonus_verifications", "verification_decisions", "bonus_id", "bank_name")
    await doMismatches("card-mismatch", "card_verifications", "card_verification_decisions", "card_id", "card_name")
  }

  await closeBrowser()

  // ── Report ── (decisions were already written incrementally above when --write)
  const tally = (k: Decision["kind"]) => {
    const ds = decisions.filter((d) => d.kind === k)
    const c = { approve: 0, dismiss: 0, escalate: 0 }
    for (const d of ds) c[d.verdict.decision]++
    return { total: ds.length, ...c }
  }
  console.log(`\n=== Summary (${WRITE ? "applied" : "dry-run"}) ===`)
  console.log("leads:          ", JSON.stringify(tally("lead")))
  console.log("bonus-mismatch: ", JSON.stringify(tally("bonus-mismatch")))
  console.log("card-mismatch:  ", JSON.stringify(tally("card-mismatch")))
  const escalated = decisions.filter((d) => d.verdict.decision === "escalate").length
  console.log(`\nHuman still reviews: ${escalated} escalated item(s). Auto-cleared: ${decisions.length - escalated}.`)

  const OUT = join(process.cwd(), "verification-output")
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, "auto-triage-report.json"), JSON.stringify(decisions, null, 2))
  console.log(`Report: verification-output/auto-triage-report.json`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); closeBrowser().finally(() => process.exit(1)) })
