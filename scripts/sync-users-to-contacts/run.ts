/* eslint-disable no-console */
/**
 * Sync auth.users → contacts.
 *
 * Pulls every Stacks OS user account and upserts a contacts row for it.
 * Also reads the subscriptions table to decide current vs former. The end
 * state guarantees: every auth.users row has a matching contacts row, with
 * customer_status reflecting their billing state right now.
 *
 *   tsx scripts/sync-users-to-contacts/run.ts             # preview
 *   tsx scripts/sync-users-to-contacts/run.ts --commit    # apply
 *
 * Idempotent: re-running is safe. Respects existing rows — only fills in
 * missing fields, never overwrites richer state (e.g. newsletter opt-in
 * from the Beehiiv import).
 */

import { createAdminClient } from "../../lib/stackhouse/supabaseAdmin"

const COMMIT = process.argv.includes("--commit")

// Stripe subscription.status → customer_status. Anything paying or in a
// grace period is 'current'; anything that ended is 'former'.
const CURRENT_STATUSES = new Set(["active", "trialing", "past_due"])
const FORMER_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
])

function classifySubscription(status: string | null | undefined): "current" | "former" | "current_no_sub" {
  if (!status) return "current_no_sub"
  if (CURRENT_STATUSES.has(status)) return "current"
  if (FORMER_STATUSES.has(status)) return "former"
  return "current_no_sub"
}

async function main() {
  const sb = createAdminClient()

  // 1. All auth users.
  const users: Array<{ id: string; email: string }> = []
  let page = 1
  for (;;) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = data?.users ?? []
    for (const u of batch) {
      if (u.email) users.push({ id: u.id, email: u.email.toLowerCase() })
    }
    if (batch.length < 1000) break
    page++
  }
  console.log(`loaded ${users.length} auth.users`)

  // 2. Subscription state per user.
  const { data: subs } = await sb
    .from("subscriptions")
    .select("user_id, status")
  const subByUserId = new Map<string, string>()
  for (const s of subs ?? []) {
    if (s.user_id) subByUserId.set(s.user_id, s.status)
  }
  console.log(`loaded ${subByUserId.size} subscription rows`)

  const counters = { created: 0, updated: 0, unchanged: 0, byStatus: { current: 0, former: 0, no_sub: 0 } }

  for (const u of users) {
    const subStatus = subByUserId.get(u.id) ?? null
    const classification = classifySubscription(subStatus)
    if (classification === "current") counters.byStatus.current++
    else if (classification === "former") counters.byStatus.former++
    else counters.byStatus.no_sub++

    const targetStatus = classification === "former" ? "former" : "current"

    const { data: existing } = await sb
      .from("contacts")
      .select("id, customer_status, stacks_os_user_id, source, newsletter_opted_in")
      .eq("email", u.email)
      .maybeSingle()

    if (existing) {
      // Only update if something would actually change. We don't downgrade
      // 'current' → 'former' silently — only flip if the subscription
      // explicitly says so. Don't touch newsletter consent or source.
      const updates: Record<string, unknown> = {}
      if (existing.stacks_os_user_id !== u.id) updates.stacks_os_user_id = u.id
      if (existing.customer_status !== targetStatus) updates.customer_status = targetStatus
      if (!existing.source) updates.source = "stacks_os_signup"

      if (Object.keys(updates).length === 0) {
        counters.unchanged++
        continue
      }
      updates.updated_at = new Date().toISOString()

      if (!COMMIT) {
        console.log(`[dry-run] update ${u.email}:`, updates)
      } else {
        const { error } = await sb.from("contacts").update(updates).eq("id", existing.id)
        if (error) { console.error(`[error] ${u.email}: ${error.message}`); continue }
      }
      counters.updated++
    } else {
      const row = {
        email: u.email,
        stacks_os_user_id: u.id,
        customer_status: targetStatus,
        source: "stacks_os_signup",
        // Don't opt them into newsletter — they never asked. Product
        // announcements default to true via the column default.
        newsletter_opted_in: false,
        first_seen_at: new Date().toISOString(),
      }
      if (!COMMIT) {
        console.log(`[dry-run] insert ${u.email} status=${targetStatus}`)
      } else {
        const { error } = await sb.from("contacts").insert(row)
        if (error) { console.error(`[error] ${u.email}: ${error.message}`); continue }
      }
      counters.created++
    }
  }

  console.log("")
  console.log("===== summary =====")
  console.log(`mode:                 ${COMMIT ? "COMMIT" : "DRY-RUN (pass --commit to apply)"}`)
  console.log(`auth.users:           ${users.length}`)
  console.log(`subscription rows:    ${subByUserId.size}`)
  console.log(`classified current:   ${counters.byStatus.current}`)
  console.log(`classified former:    ${counters.byStatus.former}`)
  console.log(`no subscription row:  ${counters.byStatus.no_sub} (treated as current)`)
  console.log(`---`)
  console.log(`created (new):        ${counters.created}`)
  console.log(`updated (existing):   ${counters.updated}`)
  console.log(`unchanged:            ${counters.unchanged}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
