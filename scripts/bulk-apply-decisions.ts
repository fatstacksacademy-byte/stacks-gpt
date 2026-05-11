/**
 * Bulk-apply auto-triage classifications + reverse the us-bank-smartly mistake.
 * Writes directly to verification_decisions using service role.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const env: Record<string, string> = {}
for (const line of readFileSync("/Users/nathaniel/stacks-gpt/.env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (!m) continue
  let v = m[2]
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  env[m[1]] = v
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ADMIN_EMAIL = "booth.nathaniel@gmail.com"

async function main() {
  // 1. Reverse the us-bank-smartly mistake. Both edits are now "dismissed"
  //    because stored $450 / $8000 are correct.
  const usbankFixes = [
    {
      bonus_id: "us-bank-smartly-checking-450-2026",
      field_path: "bonus_amount",
      verdict: "dismissed",
      from_value: 450,
      to_value: 250,
      notes: "Reversed earlier approve. Stored $450 is correct — it is the $8k DD tier on the multi-tier page. Pipeline extracted the lower $5k tier. (User correction)",
    },
    {
      bonus_id: "us-bank-smartly-checking-450-2026",
      field_path: "requirements.min_direct_deposit_total",
      verdict: "dismissed",
      from_value: 8000,
      to_value: 1500,
      notes: "Reversed earlier snooze. Stored $8,000 is correct DD threshold for the $450 tier. (User correction)",
    },
  ]

  // Delete the prior decisions on those two so there's only one canonical row
  // each (instead of stacking corrections).
  for (const fix of usbankFixes) {
    const { error: delErr } = await supabase
      .from("verification_decisions")
      .delete()
      .eq("bonus_id", fix.bonus_id)
      .eq("field_path", fix.field_path)
    if (delErr) console.error(`delete prior ${fix.bonus_id}/${fix.field_path}:`, delErr.message)
  }
  for (const fix of usbankFixes) {
    const { error } = await supabase.from("verification_decisions").insert({
      bonus_id: fix.bonus_id,
      field_path: fix.field_path,
      verdict: fix.verdict,
      from_value: fix.from_value,
      to_value: fix.to_value,
      notes: fix.notes,
      decided_by: ADMIN_EMAIL,
    })
    if (error) {
      console.error(`insert ${fix.bonus_id}/${fix.field_path}:`, error.message)
    } else {
      console.log(`✓ ${fix.bonus_id}/${fix.field_path} → ${fix.verdict}`)
    }
  }

  // 2. Apply the auto-triage recommendations
  const triage = JSON.parse(readFileSync("/Users/nathaniel/stacks-gpt/verification-output/auto-triage.json", "utf8"))
  const toApply = triage.rows.filter((r: any) => r.recommended_verdict === "approve" || r.recommended_verdict === "dismiss")

  let approved = 0
  let dismissed = 0
  for (const row of toApply) {
    const { error } = await supabase.from("verification_decisions").insert({
      bonus_id: row.bonus_id,
      field_path: row.field_path,
      verdict: row.recommended_verdict === "approve" ? "approved" : "dismissed",
      from_value: row.from_value,
      to_value: row.to_value,
      notes: `Auto-triage: ${row.reasoning}`,
      decided_by: ADMIN_EMAIL,
    })
    if (error) {
      console.error(`  ✗ ${row.bonus_id}/${row.field_path}:`, error.message)
      continue
    }
    if (row.recommended_verdict === "approve") approved++
    else dismissed++
  }

  console.log(`\n=== Bulk apply complete ===`)
  console.log(`  US Bank Smartly fixes:  2 (reversed prior approve + snooze)`)
  console.log(`  Auto-approved:         ${approved}`)
  console.log(`  Auto-dismissed:         ${dismissed}`)
  console.log(`  Still in queue:         ${triage.rows.length - approved - dismissed} (needs_url + needs_eye)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
