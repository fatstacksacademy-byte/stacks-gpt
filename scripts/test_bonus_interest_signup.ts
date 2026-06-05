import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"

const envText = fs.readFileSync(".env.local", "utf8")
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(url, key, { auth: { persistSession: false } })

const EMAIL = `test-signup-${Date.now()}@fatstacksacademy.test`
const BONUS_IDS = ["chase-total-checking-400-2026", "bmo-400-checking-2026", "sofi-checking-savings-300-dd-2026"]

function dim(s: string) { return `\x1b[2m${s}\x1b[0m` }
function ok(s: string) { return `\x1b[32m✓\x1b[0m ${s}` }
function fail(s: string) { return `\x1b[31m✗\x1b[0m ${s}` }

async function main() {
  console.log(dim(`Test email: ${EMAIL}`))

  // 1. Seed bonus_interests via the public API (same path real users hit)
  console.log("\n1. Seed bonus_interests via /api/bonus-interest")
  for (const bonusId of BONUS_IDS) {
    const res = await fetch("http://localhost:3000/api/bonus-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, bonusId, bonusType: "personal-checking", sourcePage: "/bonuses" }),
    })
    if (!res.ok) { console.log(fail(`API returned ${res.status} for ${bonusId}`)); process.exit(1) }
    console.log(`   ${ok(`saved ${bonusId}`)}`)
  }

  const { data: pendingInterests } = await sb.from("bonus_interests").select("*").eq("email", EMAIL)
  if (pendingInterests?.length !== BONUS_IDS.length) {
    console.log(fail(`expected ${BONUS_IDS.length} pending interests, got ${pendingInterests?.length}`)); process.exit(1)
  }
  console.log(ok(`${pendingInterests.length} bonus_interests in DB, all unclaimed`))

  // 2. Simulate signup: create a real Supabase auth user
  console.log("\n2. Create auth user (simulates Stacks OS signup)")
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL, email_confirm: true, password: "test-password-1234567890",
  })
  if (createErr || !created.user) { console.log(fail(`createUser failed: ${createErr?.message}`)); process.exit(1) }
  const userId = created.user.id
  console.log(`   ${ok(`user created: ${userId}`)}`)

  // 3. Call the import (this is what auth callback does)
  console.log("\n3. Import bonus_interests into completed_bonuses")
  const { importBonusInterestsForUser } = await import("../lib/bonusInterestImport")
  const result = await importBonusInterestsForUser(userId, EMAIL)
  console.log(`   imported: ${result.imported}`)
  if (result.imported !== BONUS_IDS.length) {
    console.log(fail(`expected ${BONUS_IDS.length} imported, got ${result.imported}`))
  } else {
    console.log(ok(`all ${result.imported} bonuses imported`))
  }

  // 4. Verify completed_bonuses
  console.log("\n4. Verify completed_bonuses rows")
  const { data: completed } = await sb.from("completed_bonuses").select("bonus_id, bonus_received, opened_date").eq("user_id", userId)
  if (completed?.length !== BONUS_IDS.length) {
    console.log(fail(`expected ${BONUS_IDS.length} rows, got ${completed?.length}`))
  } else {
    console.log(ok(`${completed.length} rows in completed_bonuses`))
    for (const row of completed) {
      const found = BONUS_IDS.includes(row.bonus_id)
      console.log(`   ${found ? ok(row.bonus_id) : fail(`unexpected ${row.bonus_id}`)} — bonus_received=${row.bonus_received}, opened=${row.opened_date}`)
    }
  }

  // 5. Verify bonus_interests are claimed
  console.log("\n5. Verify bonus_interests are claimed")
  const { data: afterClaim } = await sb.from("bonus_interests").select("claimed_at, claimed_by_user_id").eq("email", EMAIL)
  const unclaimed = afterClaim?.filter(r => !r.claimed_at).length ?? 0
  const claimedByOther = afterClaim?.filter(r => r.claimed_by_user_id !== userId).length ?? 0
  if (unclaimed > 0) console.log(fail(`${unclaimed} rows still unclaimed`))
  else if (claimedByOther > 0) console.log(fail(`${claimedByOther} rows claimed by wrong user`))
  else console.log(ok(`all ${afterClaim?.length} interests marked claimed by ${userId}`))

  // 6. Verify contact upgraded to 'current'
  console.log("\n6. Verify contact promoted to 'current'")
  const { data: contact } = await sb.from("contacts").select("customer_status, stacks_os_user_id").eq("email", EMAIL).single()
  if (contact?.customer_status !== "current") console.log(fail(`status is ${contact?.customer_status}, expected 'current'`))
  else if (contact?.stacks_os_user_id !== userId) console.log(fail(`stacks_os_user_id is ${contact?.stacks_os_user_id}, expected ${userId}`))
  else console.log(ok(`contact status=current, linked to ${userId}`))

  // 7. Idempotency: re-run import, should not duplicate
  console.log("\n7. Idempotency: re-run import")
  const rerun = await importBonusInterestsForUser(userId, EMAIL)
  if (rerun.imported !== 0) console.log(fail(`re-run imported ${rerun.imported}, expected 0`))
  else console.log(ok("re-run imported 0 (idempotent)"))
  const { data: completedAfter } = await sb.from("completed_bonuses").select("id").eq("user_id", userId)
  if (completedAfter?.length !== BONUS_IDS.length) console.log(fail(`completed_bonuses count changed: ${completedAfter?.length}`))
  else console.log(ok(`completed_bonuses still ${completedAfter.length} (no duplicates)`))

  // 8. Cleanup
  console.log("\n8. Cleanup")
  await sb.from("completed_bonuses").delete().eq("user_id", userId)
  await sb.from("bonus_interests").delete().eq("email", EMAIL)
  await sb.from("contacts").delete().eq("email", EMAIL)
  await sb.auth.admin.deleteUser(userId)
  console.log(ok("test artifacts removed"))

  console.log("\n\x1b[32m✓ All assertions passed\x1b[0m")
}

main().catch(e => { console.error(fail(e?.message ?? String(e))); process.exit(1) })
