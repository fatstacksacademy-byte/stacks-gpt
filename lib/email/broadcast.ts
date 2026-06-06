import { createAdminClient } from "../stackhouse/supabaseAdmin"
import { sendEmail } from "./client"

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fatstacksacademy.com"

export type Segment = "all" | "current" | "lead" | "former"
export type Channel = "newsletter" | "product"

const SEGMENT_LABEL: Record<Segment, string> = {
  all: "All newsletter subscribers",
  current: "Current Stacks OS customers",
  lead: "Newsletter leads (no account yet)",
  former: "Former customers",
}

export function segmentLabel(s: string): string {
  return SEGMENT_LABEL[s as Segment] ?? s
}

// The consent column for each channel. Product announcements ride a separate
// opt-in so we can email paying customers about freemium/new-feature launches
// without dragging them into the marketing list.
const CONSENT_COLUMN: Record<Channel, string> = {
  newsletter: "newsletter_opted_in",
  product: "product_announcements_opted_in",
}

/**
 * Apply channel + segment filters. Product channel additionally restricts
 * to current/former (leads never see product email — they have nothing to
 * be updated about).
 */
function applyAudienceFilter<T>(
  q: T,
  channel: Channel,
  segment: Segment,
): T {
  // Supabase query builder is chainable; cast through unknown so we don't
  // have to pull its full type signature into this helper.
  let qq = q as unknown as { eq: (col: string, val: unknown) => typeof qq; in: (col: string, vals: unknown[]) => typeof qq }
  qq = qq.eq(CONSENT_COLUMN[channel], true)
  if (channel === "product") {
    qq = segment === "all"
      ? qq.in("customer_status", ["current", "former"])
      : qq.eq("customer_status", segment)
  } else if (segment !== "all") {
    qq = qq.eq("customer_status", segment)
  }
  return qq as unknown as T
}

async function fetchSegment(channel: Channel, segment: Segment) {
  const sb = createAdminClient()
  const q = applyAudienceFilter(
    sb.from("contacts").select("id, email, unsubscribe_token"),
    channel,
    segment,
  )
  const { data, error } = await q
  if (error) throw new Error(`segment fetch failed: ${error.message}`)
  return data ?? []
}

export async function countSegment(channel: Channel, segment: Segment): Promise<number> {
  const sb = createAdminClient()
  const q = applyAudienceFilter(
    sb.from("contacts").select("id", { count: "exact", head: true }),
    channel,
    segment,
  )
  const { count, error } = await q
  if (error) throw new Error(`segment count failed: ${error.message}`)
  return count ?? 0
}

/**
 * Wrap plain-text or simple-HTML body in a branded email shell with
 * an unsubscribe footer. Per-recipient because the unsubscribe URL
 * is token-specific.
 */
function renderEmail(html: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;line-height:1.55;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;padding:24px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border:1px solid #e8e8e8;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px;">${html}</td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;background:#fafafa;font-size:12px;color:#888;line-height:1.5;">
        You're receiving this because you signed up at <a href="${BASE}" style="color:#0d7c5f;text-decoration:none;">fatstacksacademy.com</a>.
        <br/>
        <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a> · Fat Stacks Academy · Nathaniel Booth
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function renderText(text: string, unsubscribeUrl: string): string {
  return `${text}\n\n---\nYou're receiving this because you signed up at fatstacksacademy.com.\nUnsubscribe: ${unsubscribeUrl}`
}

export type SendBroadcastResult = {
  total_recipients: number
  total_sent: number
  total_failed: number
}

/**
 * Send a draft broadcast. Idempotent at the (broadcast_id, contact_id)
 * level via the unique index — re-running a send for a partially sent
 * broadcast resumes from where it stopped (Resend returns the same
 * count for the second send, but we won't duplicate broadcast_sends
 * rows or charge for sends we already made).
 */
export async function sendBroadcast(broadcastId: string): Promise<SendBroadcastResult> {
  const sb = createAdminClient()

  const { data: broadcast, error: bErr } = await sb
    .from("broadcasts")
    .select("*")
    .eq("id", broadcastId)
    .single()
  if (bErr || !broadcast) throw new Error(`broadcast not found: ${bErr?.message ?? "no row"}`)
  if (broadcast.status === "sent") return {
    total_recipients: broadcast.total_recipients,
    total_sent: broadcast.total_sent,
    total_failed: broadcast.total_failed,
  }

  const segment = (broadcast.segment_filter?.segment ?? "all") as Segment
  const channel = (broadcast.channel ?? "newsletter") as Channel
  const recipients = await fetchSegment(channel, segment)

  await sb.from("broadcasts").update({
    status: "sending",
    total_recipients: recipients.length,
  }).eq("id", broadcastId)

  let sent = 0
  let failed = 0

  for (const r of recipients) {
    // Skip if we already have a send row for this recipient (resumes
    // a partial run; the unique index would reject anyway).
    const { data: existing } = await sb
      .from("broadcast_sends")
      .select("id, sent_at, error")
      .eq("broadcast_id", broadcastId)
      .eq("contact_id", r.id)
      .maybeSingle()
    if (existing?.sent_at) { sent++; continue }
    if (existing?.error) { failed++; continue }

    const unsubscribeUrl = `${BASE}/newsletter/unsubscribe?token=${r.unsubscribe_token}${channel === "product" ? "&channel=product" : ""}`
    const html = renderEmail(broadcast.html_body, unsubscribeUrl)
    const text = renderText(broadcast.text_body, unsubscribeUrl)

    const { id: msgId, error } = await sendEmail({
      to: r.email, subject: broadcast.subject, html, text, unsubscribeUrl,
    })

    if (existing) {
      await sb.from("broadcast_sends").update({
        resend_message_id: msgId, sent_at: error ? null : new Date().toISOString(), error,
      }).eq("id", existing.id)
    } else {
      await sb.from("broadcast_sends").insert({
        broadcast_id: broadcastId,
        contact_id: r.id,
        email: r.email,
        resend_message_id: msgId,
        sent_at: error ? null : new Date().toISOString(),
        error,
      })
    }

    if (error) failed++; else sent++
  }

  await sb.from("broadcasts").update({
    status: "sent",
    total_sent: sent,
    total_failed: failed,
    sent_at: new Date().toISOString(),
  }).eq("id", broadcastId)

  return { total_recipients: recipients.length, total_sent: sent, total_failed: failed }
}
