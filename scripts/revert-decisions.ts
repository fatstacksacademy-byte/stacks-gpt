/* eslint-disable no-console */
/**
 * Quick one-shot: flip a list of verification_decisions or
 * card_verification_decisions from verdict='approved' to verdict='dismissed'.
 * Used to undo a wrong Approve in /admin/triage before
 * scripts/apply-decisions-to-catalog.ts touches the live files.
 *
 *   npx tsx scripts/revert-decisions.ts <decision_id> [<decision_id>...]
 *
 * Passes through both decision tables (bank + card). Ignores ids that don't
 * exist in either. Adds a notes prefix so you can see in the DB which rows
 * were manually reverted.
 */
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const ROOT = "/Users/nathaniel/stacks-gpt"
const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Usage: tsx scripts/revert-decisions.ts <decision_id> [<decision_id>...]")
  process.exit(1)
}

const env: Record<string, string> = {}
for (const line of readFileSync(`${ROOT}/.env.local`, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[m[1]] = v
}

async function main() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const note = `Manually reverted via scripts/revert-decisions.ts on ${new Date().toISOString()}`

  let touched = 0
  for (const id of args) {
    // Try bank-bonus decision first.
    const { data: bd, error: bErr } = await supabase
      .from("verification_decisions")
      .update({
        verdict: "dismissed",
        notes: note,
        applied_at: null, // clear stamp so apply pipeline doesn't see it
      })
      .eq("id", id)
      .select("id, bonus_id, field_path")
      .maybeSingle()
    if (bErr) console.error(`✗ ${id} bank lookup error:`, bErr.message)
    if (bd) {
      console.log(`✓ bank ${bd.bonus_id} / ${bd.field_path} → dismissed`)
      touched++
      continue
    }

    // Fall back to card decision.
    const { data: cd, error: cErr } = await supabase
      .from("card_verification_decisions")
      .update({
        verdict: "dismissed",
        notes: note,
        applied_at: null,
      })
      .eq("id", id)
      .select("id, card_id, field_path")
      .maybeSingle()
    if (cErr) console.error(`✗ ${id} card lookup error:`, cErr.message)
    if (cd) {
      console.log(`✓ card ${cd.card_id} / ${cd.field_path} → dismissed`)
      touched++
      continue
    }

    console.log(`⚠ ${id} not found in either decision table`)
  }
  console.log(`\nReverted ${touched} of ${args.length} decision(s).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
