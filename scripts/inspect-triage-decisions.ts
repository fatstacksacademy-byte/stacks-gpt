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

async function main() {
  const { data: decisions } = await supabase
    .from("verification_decisions")
    .select("*")
    .order("decided_at", { ascending: true })

  const { data: overrides } = await supabase
    .from("bonus_url_overrides")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  console.log(`=== Decisions (${decisions?.length ?? 0}) ===`)
  for (const d of decisions ?? []) {
    const v = d.verdict.padEnd(10)
    const from = JSON.stringify(d.from_value)
    const to = JSON.stringify(d.to_value)
    console.log(`  ${v} ${d.bonus_id} ${d.field_path}: ${from} → ${to}${d.notes ? "  // " + d.notes : ""}`)
  }

  console.log(`\n=== URL Overrides (${overrides?.length ?? 0}) ===`)
  for (const o of overrides ?? []) {
    console.log(`  ${o.bonus_id}`)
    console.log(`    new: ${o.override_url}`)
    console.log(`    old: ${o.previous_url ?? "(none)"}`)
    console.log(`    method: ${o.discovery_method}`)
    console.log()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
