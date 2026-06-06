/**
 * Server-side web push sender.
 *
 * Used by:
 *   - app/api/cron/deadline-reminders  → push when a deadline is T-1 or T-7
 *   - app/api/cron/weekly-digest       → optional push when the digest mails
 *
 * Env vars required:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY   exposed to the browser via
 *                                    lib/push/client.ts
 *   - VAPID_PRIVATE_KEY              server only
 *   - VAPID_SUBJECT                  "mailto:you@example.com" — Push providers
 *                                    use this to contact you if your sends
 *                                    misbehave. Defaults to a placeholder if
 *                                    missing so dev doesn't crash.
 *
 * Generate the keypair once with `npx tsx scripts/generate-vapid-keys.ts`
 * and paste the output into Vercel env vars + .env.local.
 */
import webpush from "web-push"
import type { SupabaseClient } from "@supabase/supabase-js"

let _configured = false
function configure() {
  if (_configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? "mailto:reminders@fatstacksacademy.com"
  if (!pub || !priv) {
    throw new Error(
      "VAPID keys are not set. Run `npx tsx scripts/generate-vapid-keys.ts` and add NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY to your env.",
    )
  }
  webpush.setVapidDetails(subject, pub, priv)
  _configured = true
}

export type PushPayload = {
  title: string
  body: string
  /** Optional path the user lands on when they tap the notification. Defaults to /stacksos. */
  url?: string
  /** Optional tag so a new notification of the same kind replaces the prior one. */
  tag?: string
}

type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

type DeliveryResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode?: number; expired?: boolean; error: string }

/**
 * Send a single push to one subscription. Handles the 404 / 410 case where
 * the browser has rotated or revoked the subscription — caller can act on
 * the `expired: true` flag to soft-delete the row.
 */
export async function sendOne(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<DeliveryResult> {
  configure()
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }
  try {
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 24 * 60 * 60 }, // keep undelivered notifications around for 24h
    )
    return { ok: true, statusCode: res.statusCode }
  } catch (err) {
    const e = err as { statusCode?: number; body?: string; message?: string }
    const expired = e.statusCode === 404 || e.statusCode === 410
    return {
      ok: false,
      statusCode: e.statusCode,
      expired,
      error: e.body ?? e.message ?? "unknown",
    }
  }
}

/**
 * Fan-out helper: load every active subscription for a user, send the
 * payload to each, and soft-delete subscriptions the push provider says
 * are dead.  Returns the count of successful deliveries.
 */
export async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<{ delivered: number; expired: number; failed: number }> {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .is("expired_at", null)
  if (error || !subs || subs.length === 0) {
    return { delivered: 0, expired: 0, failed: 0 }
  }

  let delivered = 0
  let expired = 0
  let failed = 0
  const expiredIds: string[] = []
  const deliveredIds: string[] = []

  for (const sub of subs as PushSubscriptionRow[]) {
    const r = await sendOne(sub, payload)
    if (r.ok) {
      delivered++
      deliveredIds.push(sub.id)
    } else if (r.expired) {
      expired++
      expiredIds.push(sub.id)
    } else {
      failed++
    }
  }

  // Bookkeeping: stamp last_used_at on successful deliveries, expired_at on
  // dead subscriptions. Best-effort — we don't surface DB failures to the
  // caller because the push itself already went through (or didn't).
  const now = new Date().toISOString()
  if (deliveredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: now })
      .in("id", deliveredIds)
  }
  if (expiredIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ expired_at: now })
      .in("id", expiredIds)
  }

  return { delivered, expired, failed }
}
