/**
 * Pull every active subscriber from Beehiiv via the API and import them into the
 * owned `contacts` table — no CSV needed (handy on the Beehiiv free plan, where
 * export is disabled). Lets you consolidate onto the in-house Resend list and
 * then retire Beehiiv.
 *
 * Beehiiv subscribers opted into the newsletter, so imported rows are marked
 * `newsletter_opted_in = true`. Only ACTIVE subscribers are imported. Existing
 * contacts only get consent re-confirmed — never their source/status/link.
 *
 * Usage:
 *   npx tsx scripts/import-beehiiv.ts            # dry run: fetch + report, no writes
 *   npx tsx scripts/import-beehiiv.ts --write    # actually upsert into contacts
 *
 * Requires BEEHIIV_API_KEY + BEEHIIV_PUBLICATION_ID (+ Supabase service role for --write).
 */
import { readFileSync } from "node:fs"

// ── Load .env.local (same pattern as the other scripts in this repo) ──
for (const line of readFileSync(`${process.cwd()}/.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
}

import { createAdminClient } from "../lib/stackhouse/supabaseAdmin"

const write = process.argv.includes("--write")

type BeehiivSub = { email?: string; status?: string; created?: number; subscription_tier?: string; utm_source?: string }

async function fetchAllSubscribers(): Promise<BeehiivSub[]> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !pubId) throw new Error("BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID not set in .env.local")

  const out: BeehiivSub[] = []
  let page = 1
  let totalPages = 1
  do {
    const url = `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions?status=active&limit=100&page=${page}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Beehiiv API ${res.status}: ${body.slice(0, 300)}`)
    }
    const json = (await res.json()) as { data?: BeehiivSub[]; total_pages?: number }
    out.push(...(json.data ?? []))
    totalPages = json.total_pages ?? 1
    page++
  } while (page <= totalPages)
  return out
}

async function main() {
  console.log("Fetching subscribers from Beehiiv…")
  const subs = await fetchAllSubscribers()

  const seen = new Set<string>()
  const valid: { email: string; optInAt: string | null; source: string }[] = []
  let skipped = 0
  for (const s of subs) {
    const email = (s.email ?? "").trim().toLowerCase()
    if (!email.includes("@") || email.length < 5) { skipped++; continue }
    if (s.status && s.status.toLowerCase() !== "active") { skipped++; continue }
    if (seen.has(email)) { skipped++; continue }
    seen.add(email)
    const optInAt = s.created ? new Date(s.created * 1000).toISOString() : null
    valid.push({ email, optInAt, source: s.utm_source ? `beehiiv:${s.utm_source}` : "beehiiv_import" })
  }

  console.log(`Fetched ${subs.length} · importable ${valid.length} · skipped ${skipped}`)

  if (!write) {
    console.log("\nDRY RUN (no writes). Sample:")
    for (const v of valid.slice(0, 8)) console.log(`  ${v.email}  (${v.source})`)
    console.log(`\nRe-run with --write to import ${valid.length} contacts.`)
    return
  }

  const admin = createAdminClient()
  const emails = valid.map(v => v.email)
  const existing = new Set<string>()
  for (let i = 0; i < emails.length; i += 500) {
    const { data, error } = await admin.from("contacts").select("email").in("email", emails.slice(i, i + 500))
    if (error) throw new Error(`lookup failed: ${error.message}`)
    for (const c of data ?? []) existing.add((c as { email: string }).email)
  }

  const toInsert = valid.filter(v => !existing.has(v.email))
  const toUpdate = valid.filter(v => existing.has(v.email))
  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500).map(v => ({
      email: v.email,
      source: v.source,
      newsletter_opted_in: true,
      newsletter_opt_in_at: v.optInAt ?? now,
      updated_at: now,
    }))
    const { error } = await admin.from("contacts").insert(chunk)
    if (error) { console.error(`insert failed: ${error.message}`); failed += chunk.length }
    else inserted += chunk.length
  }

  for (const v of toUpdate) {
    const { error } = await admin
      .from("contacts")
      .update({ newsletter_opted_in: true, updated_at: now })
      .eq("email", v.email)
    if (error) { console.error(`update ${v.email} failed: ${error.message}`); failed++ }
    else updated++
  }

  console.log(`\nDone: ${inserted} inserted · ${updated} re-confirmed · ${failed} failed`)
}

main().catch(e => { console.error(String(e)); process.exit(1) })
