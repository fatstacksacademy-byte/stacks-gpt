/**
 * Backfill existing Supabase auth users into the owned `contacts` table, so
 * `contacts` is the single source of truth for everyone you have a relationship
 * with (newsletter subs + product accounts). The API-driven equivalent of
 * migration 032 — run it instead of applying that SQL by hand.
 *
 * Consent (this is the spam-safety part): users signed up for the PRODUCT, not
 * necessarily the newsletter, so new rows are inserted with
 * newsletter_opted_in = false. They're linked to their account and marked
 * `current`, but stay out of marketing sends until they opt in. Existing
 * contacts keep their newsletter consent + source untouched — we only link the
 * account and mark them current.
 *
 * Usage:
 *   npx tsx scripts/backfill-users-to-contacts.ts            # dry run, no writes
 *   npx tsx scripts/backfill-users-to-contacts.ts --write    # apply
 */
import { readFileSync } from "node:fs"

for (const line of readFileSync(`${process.cwd()}/.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
}

import { createAdminClient } from "../lib/stackhouse/supabaseAdmin"

const write = process.argv.includes("--write")

async function main() {
  const admin = createAdminClient()

  // ── Page through every auth user ──
  const users: { id: string; email: string }[] = []
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    for (const u of data.users) {
      if (u.email) users.push({ id: u.id, email: u.email.trim().toLowerCase() })
    }
    if (data.users.length < 1000) break
    page++
  }
  console.log(`Found ${users.length} auth users with an email`)

  // ── Which already have a contact row? ──
  const emails = users.map(u => u.email)
  const existing = new Set<string>()
  for (let i = 0; i < emails.length; i += 500) {
    const { data, error } = await admin.from("contacts").select("email").in("email", emails.slice(i, i + 500))
    if (error) throw new Error(`lookup failed: ${error.message}`)
    for (const c of data ?? []) existing.add((c as { email: string }).email)
  }

  const toInsert = users.filter(u => !existing.has(u.email))
  const toUpdate = users.filter(u => existing.has(u.email))
  console.log(`  ${toInsert.length} new · ${toUpdate.length} existing (will link account + mark current)`)

  if (!write) {
    console.log("\nDRY RUN (no writes). Sample of new:")
    for (const u of toInsert.slice(0, 8)) console.log(`  ${u.email}`)
    console.log(`\nRe-run with --write to apply.`)
    return
  }

  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500).map(u => ({
      email: u.email,
      source: "supabase_user",
      stacks_os_user_id: u.id,
      customer_status: "current",
      newsletter_opted_in: false,
      updated_at: now,
    }))
    const { error } = await admin.from("contacts").insert(chunk)
    if (error) { console.error(`insert failed: ${error.message}`); failed += chunk.length }
    else inserted += chunk.length
  }

  // Existing contacts: only link the account + mark current. Never touch their
  // newsletter consent or original source.
  for (const u of toUpdate) {
    const { error } = await admin
      .from("contacts")
      .update({ stacks_os_user_id: u.id, customer_status: "current", updated_at: now })
      .eq("email", u.email)
    if (error) { console.error(`update ${u.email} failed: ${error.message}`); failed++ }
    else updated++
  }

  console.log(`\nDone: ${inserted} inserted · ${updated} linked · ${failed} failed`)
}

main().catch(e => { console.error(String(e)); process.exit(1) })
