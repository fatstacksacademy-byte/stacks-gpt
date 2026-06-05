export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createAdminClient } from "../../../../lib/stackhouse/supabaseAdmin"

/**
 * Resend webhook → broadcast_sends.
 *
 * Resend signs payloads using the Svix scheme:
 *   signed = `${svix-id}.${svix-timestamp}.${raw-body}`
 *   sig    = base64( HMAC-SHA256(signed, base64decode(secret.slice('whsec_'.length))) )
 * The svix-signature header is a space-separated list of `v1,<sig>` pairs;
 * we accept the request if any one of them matches.
 *
 * Only broadcast_sends rows are updated. Transactional sends don't store
 * the Resend message id, so their events are received and ignored — fine
 * for now since reminders don't need open/click tracking.
 */

type ResendEvent =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"

type ResendPayload = {
  type: ResendEvent
  created_at: string
  data: {
    email_id: string
    bounce?: { message?: string }
  }
}

function verifySignature(req: NextRequest, body: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return false
  const id = req.headers.get("svix-id")
  const ts = req.headers.get("svix-timestamp")
  const sigHeader = req.headers.get("svix-signature")
  if (!id || !ts || !sigHeader) return false

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
  const signed = `${id}.${ts}.${body}`
  const expected = createHmac("sha256", secretBytes).update(signed).digest("base64")

  const presented = sigHeader.split(" ").map(p => p.split(",")[1]).filter(Boolean)
  return presented.some(sig => {
    if (sig.length !== expected.length) return false
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      return false
    }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  if (!verifySignature(req, body)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let payload: ResendPayload
  try {
    payload = JSON.parse(body) as ResendPayload
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const sb = createAdminClient()
  const messageId = payload.data.email_id
  const eventAt = payload.created_at ?? new Date().toISOString()

  switch (payload.type) {
    case "email.opened": {
      // is-null filter keeps "first opened" semantics across replays/reopens.
      await sb.from("broadcast_sends")
        .update({ opened_at: eventAt })
        .eq("resend_message_id", messageId)
        .is("opened_at", null)
      break
    }
    case "email.clicked": {
      await sb.from("broadcast_sends")
        .update({ clicked_at: eventAt })
        .eq("resend_message_id", messageId)
        .is("clicked_at", null)
      break
    }
    case "email.bounced": {
      await sb.from("broadcast_sends")
        .update({ error: payload.data.bounce?.message ?? "bounced" })
        .eq("resend_message_id", messageId)
      break
    }
    case "email.complained": {
      // Gmail "report spam" → kill all future newsletter sends to this contact.
      const { data: send } = await sb.from("broadcast_sends")
        .select("contact_id")
        .eq("resend_message_id", messageId)
        .maybeSingle()
      await sb.from("broadcast_sends")
        .update({ error: "complained" })
        .eq("resend_message_id", messageId)
      if (send?.contact_id) {
        await sb.from("contacts")
          .update({ newsletter_opted_in: false })
          .eq("id", send.contact_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
