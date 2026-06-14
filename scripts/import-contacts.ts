/**
 * Import a Beehiiv (or any) subscriber CSV export into the owned `contacts`
 * table, so all your email sources live in one place and you can retire Beehiiv.
 *
 * Beehiiv subscribers opted into the newsletter, so imported rows are marked
 * `newsletter_opted_in = true`. Only ACTIVE subscribers are imported —
 * unsubscribed / inactive rows are skipped (emailing them is exactly what tanks
 * deliverability).
 *
 * Existing contacts are preserved: we only (re)confirm their newsletter consent;
 * we never overwrite their `source`, `customer_status`, or account link.
 *
 * Usage:
 *   npx tsx scripts/import-contacts.ts <path-to-export.csv> [--dry-run]
 *
 * Export the CSV from Beehiiv: Audience → Subscribers → Export.
 */
import { readFileSync } from "node:fs"

// ── Load .env.local (same pattern as the other scripts in this repo) ──
for (const line of readFileSync(`${process.cwd()}/.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1")
}

import { createAdminClient } from "../lib/stackhouse/supabaseAdmin"

const csvPath = process.argv[2]
const dryRun = process.argv.includes("--dry-run")
if (!csvPath || csvPath.startsWith("--")) {
  console.error("Usage: npx tsx scripts/import-contacts.ts <path-to-export.csv> [--dry-run]")
  process.exit(1)
}

// ── Minimal RFC-4180-ish CSV parser (handles quoted fields + embedded commas) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field); field = ""
      if (row.length > 1 || row[0] !== "") rows.push(row)
      row = []
    } else field += c
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row) }
  return rows
}

function pick(header: string[], ...candidates: string[]): number {
  const lower = header.map(h => h.trim().toLowerCase())
  for (const c of candidates) {
    const idx = lower.indexOf(c)
    if (idx !== -1) return idx
  }
  return -1
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, "utf8"))
  if (rows.length < 2) {
    console.error("CSV has no data rows.")
    process.exit(1)
  }
  const header = rows[0]
  const emailIdx = pick(header, "email", "email address")
  const statusIdx = pick(header, "status", "subscription status")
  const createdIdx = pick(header, "created_at", "subscribed on", "subscribed_at", "created")
  const sourceIdx = pick(header, "acquisition source", "utm_source", "source")
  if (emailIdx === -1) {
    console.error(`No email column found. Headers: ${header.join(", ")}`)
    process.exit(1)
  }

  type Row = { email: string; optInAt: string | null; source: string }
  const seen = new Set<string>()
  const valid: Row[] = []
  let skippedInactive = 0
  let skippedInvalid = 0
  let skippedDupe = 0

  for (const r of rows.slice(1)) {
    const email = (r[emailIdx] ?? "").trim().toLowerCase()
    if (!email.includes("@") || email.length < 5) { skippedInvalid++; continue }
    if (statusIdx !== -1) {
      const status = (r[statusIdx] ?? "").trim().toLowerCase()
      // Only import people still actively subscribed.
      if (status && !["active", "validated", "confirmed", "subscribed"].includes(status)) {
        skippedInactive++
        continue
      }
    }
    if (seen.has(email)) { skippedDupe++; continue }
    seen.add(email)
    const rawDate = createdIdx !== -1 ? (r[createdIdx] ?? "").trim() : ""
    const parsed = rawDate ? new Date(rawDate) : null
    const optInAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null
    const src = sourceIdx !== -1 && r[sourceIdx]?.trim() ? `beehiiv:${r[sourceIdx].trim()}` : "beehiiv_import"
    valid.push({ email, optInAt, source: src })
  }

  console.log(`Parsed ${rows.length - 1} rows → ${valid.length} importable`)
  console.log(`  skipped: ${skippedInactive} inactive · ${skippedInvalid} invalid · ${skippedDupe} dupes`)

  const admin = createAdminClient()
  const emails = valid.map(v => v.email)

  // Which of these already exist? We only re-confirm consent for them; we never
  // clobber an existing contact's source / status / account link.
  const existing = new Set<string>()
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500)
    const { data, error } = await admin.from("contacts").select("email").in("email", chunk)
    if (error) throw new Error(`lookup failed: ${error.message}`)
    for (const c of data ?? []) existing.add((c as { email: string }).email)
  }

  const toInsert = valid.filter(v => !existing.has(v.email))
  const toUpdate = valid.filter(v => existing.has(v.email))
  console.log(`  ${toInsert.length} new · ${toUpdate.length} existing (consent re-confirmed)`)

  if (dryRun) {
    console.log("\n--dry-run: no writes. Sample of new contacts:")
    for (const v of toInsert.slice(0, 5)) console.log(`  ${v.email}  (${v.source})`)
    return
  }

  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let failed = 0

  // New contacts: full insert (source + opt-in). customer_status / unsubscribe_token
  // fall back to table defaults ('lead' + generated token).
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500).map(v => ({
      email: v.email,
      source: v.source,
      newsletter_opted_in: true,
      newsletter_opt_in_at: v.optInAt ?? now,
      updated_at: now,
    }))
    const { error } = await admin.from("contacts").insert(chunk)
    if (error) { console.error(`insert chunk failed: ${error.message}`); failed += chunk.length }
    else inserted += chunk.length
  }

  // Existing contacts: only (re)confirm newsletter consent — leave everything else.
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

main().catch(e => { console.error(e); process.exit(1) })
