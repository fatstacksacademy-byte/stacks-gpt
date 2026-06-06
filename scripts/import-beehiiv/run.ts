/* eslint-disable no-console */
/**
 * Beehiiv → contacts importer.
 *
 * Reads scratch/beehiiv-paste.txt (TSV pasted from the Beehiiv subscribers
 * page) and upserts each row into the contacts table. Idempotent: re-running
 * is safe — existing rows get their newsletter flag / source filled in but
 * not overwritten where the contact already has richer state.
 *
 * Dry-run by default. Pass --commit to actually write.
 *
 *   tsx scripts/import-beehiiv/run.ts            # preview
 *   tsx scripts/import-beehiiv/run.ts --commit   # apply
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createAdminClient } from "../../lib/stackhouse/supabaseAdmin"

const COMMIT = process.argv.includes("--commit")
const INPUT = join(process.cwd(), "scratch", "beehiiv-paste.txt")

// Hard skips — junk Nathaniel knows isn't a real subscriber.
const SKIP_EMAILS = new Set<string>([
  "a@b.com",
  "test@fatstacksacademy.com",
])

type Row = {
  email: string
  status: string
  source: string            // "beehiiv:youtube" | "beehiiv:direct" | "beehiiv:api"
  subscribedAt: string      // ISO
}

function parseSource(raw: string): string {
  // Examples:
  //   "website: youtube.com / referral"  →  "beehiiv:youtube"
  //   "website: direct / (none)"         →  "beehiiv:direct"
  //   "api: direct / (none)"             →  "beehiiv:api"
  const lower = raw.toLowerCase()
  if (lower.startsWith("api:")) return "beehiiv:api"
  if (lower.includes("youtube")) return "beehiiv:youtube"
  if (lower.includes("direct")) return "beehiiv:direct"
  return "beehiiv:other"
}

function parseDate(raw: string): string {
  // "June 4, 2026 3:01 PM" — V8 parses this natively.
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) {
    console.warn(`[warn] unparseable date "${raw}", falling back to now`)
    return new Date().toISOString()
  }
  return d.toISOString()
}

function parseTsv(content: string): Row[] {
  const rows: Row[] = []
  for (const line of content.split("\n")) {
    if (!line.trim()) continue
    const parts = line.split("\t").map(p => p.trim())
    // Beehiiv columns vary: some rows have a Tags col, some don't.
    //   no tag:  email | status | tier | date | source     (5 cols)
    //   w/ tag:  email | status | tag  | tier | date | source (6 cols)
    let email: string, status: string, date: string, source: string
    if (parts.length >= 6) {
      [email, status, , , date, source] = parts
    } else if (parts.length >= 5) {
      [email, status, , date, source] = parts
    } else {
      console.warn(`[warn] skipping malformed line: ${line}`)
      continue
    }
    rows.push({
      email: email.toLowerCase(),
      status,
      source: parseSource(source),
      subscribedAt: parseDate(date),
    })
  }
  return rows
}

function dedupePlusAliases(rows: Row[]): Row[] {
  // For Gmail-style "name+tag@gmail.com" addresses, the +tag is just a
  // filter — mail still lands in "name@gmail.com". If we have both, keep
  // the base address and drop the +alias.
  const baseAddresses = new Set(
    rows
      .filter(r => !r.email.includes("+"))
      .map(r => r.email)
  )
  return rows.filter(r => {
    if (!r.email.includes("+")) return true
    const base = r.email.replace(/\+[^@]+(?=@)/, "")
    if (baseAddresses.has(base)) {
      console.log(`[skip:+alias] ${r.email} (base ${base} already in list)`)
      return false
    }
    return true
  })
}

async function main() {
  const raw = readFileSync(INPUT, "utf-8")
  const allRows = parseTsv(raw)
  console.log(`parsed ${allRows.length} rows from ${INPUT}`)

  const filtered = dedupePlusAliases(allRows).filter(r => {
    if (r.status !== "active") {
      console.log(`[skip:inactive] ${r.email} (status=${r.status})`)
      return false
    }
    if (SKIP_EMAILS.has(r.email)) {
      console.log(`[skip:denylist] ${r.email}`)
      return false
    }
    return true
  })
  console.log(`after filters: ${filtered.length} rows to import`)

  const sb = createAdminClient()

  // Pull every auth.users row so we can link emails to existing accounts.
  const userByEmail = new Map<string, string>()
  let page = 1
  for (;;) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    for (const u of users) {
      if (u.email) userByEmail.set(u.email.toLowerCase(), u.id)
    }
    if (users.length < 1000) break
    page++
  }
  console.log(`loaded ${userByEmail.size} auth.users for matching`)

  const counters = {
    created: 0,
    updatedExisting: 0,
    linkedToUser: 0,
    skippedHonoringOptOut: 0,
  }

  for (const row of filtered) {
    const userId = userByEmail.get(row.email) ?? null

    const { data: existing } = await sb
      .from("contacts")
      .select("id, newsletter_opted_in, newsletter_opt_in_at, source, customer_status, stacks_os_user_id")
      .eq("email", row.email)
      .maybeSingle()

    // Don't silently re-opt-in someone who explicitly unsubscribed. If
    // they unsubscribed (newsletter_opted_in=false but an opt_in_at is
    // set), respect that and skip — they were once opted in and chose
    // out. A row with no opt_in_at means they were added but never
    // opted in (e.g. via /bonuses interest capture) — those are fair
    // to opt in via Beehiiv import.
    if (existing
        && existing.newsletter_opted_in === false
        && existing.newsletter_opt_in_at) {
      console.log(`[skip:opted-out] ${row.email}`)
      counters.skippedHonoringOptOut++
      continue
    }

    const desiredCustomerStatus =
      existing?.customer_status === "former" ? "former" :
      userId ? "current" :
      existing?.customer_status ?? "lead"

    const upsert = {
      email: row.email,
      newsletter_opted_in: true,
      newsletter_opt_in_at: existing?.newsletter_opt_in_at ?? row.subscribedAt,
      first_seen_at: row.subscribedAt,         // upsert: insert-only via onConflict
      source: existing?.source ?? row.source,  // keep richer earlier attribution
      customer_status: desiredCustomerStatus,
      stacks_os_user_id: existing?.stacks_os_user_id ?? userId,
      updated_at: new Date().toISOString(),
    }

    if (!COMMIT) {
      console.log(`[dry-run] ${existing ? "update" : "insert"}: ${row.email}` +
        (userId ? ` [user:${userId.slice(0, 8)}]` : "") +
        ` source=${upsert.source} status=${upsert.customer_status}`)
      if (existing) counters.updatedExisting++
      else counters.created++
      if (userId && existing?.stacks_os_user_id !== userId) counters.linkedToUser++
      continue
    }

    const { error } = await sb
      .from("contacts")
      .upsert(upsert, { onConflict: "email" })
    if (error) {
      console.error(`[error] ${row.email}: ${error.message}`)
      continue
    }
    if (existing) counters.updatedExisting++
    else counters.created++
    if (userId && existing?.stacks_os_user_id !== userId) counters.linkedToUser++
  }

  console.log("")
  console.log("===== summary =====")
  console.log(`mode:                  ${COMMIT ? "COMMIT" : "DRY-RUN (pass --commit to apply)"}`)
  console.log(`input rows:            ${allRows.length}`)
  console.log(`after filters:         ${filtered.length}`)
  console.log(`created (new):         ${counters.created}`)
  console.log(`updated (existing):    ${counters.updatedExisting}`)
  console.log(`linked to auth user:   ${counters.linkedToUser}`)
  console.log(`skipped (opted out):   ${counters.skippedHonoringOptOut}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
