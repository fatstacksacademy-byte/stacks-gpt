import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"
import { sendBroadcast, countSegment, type Segment, type Channel } from "@/lib/email/broadcast"

const ADMIN_EMAIL = "booth.nathaniel@gmail.com"

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const action = req.nextUrl.searchParams.get("action") ?? "list"
  const sb = createAdminClient()

  if (action === "list") {
    const { data: broadcasts, error } = await sb
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const ids = (broadcasts ?? []).map(b => b.id)

    // One query for all aggregate stats across the listed broadcasts.
    // Counts are JS-side because Supabase's PostgREST doesn't expose
    // FILTER (WHERE …) on aggregates — for ≤50 broadcasts and a few
    // hundred sends each this is well under a millisecond.
    const stats = new Map<string, { delivered: number; opens: number; clicks: number; bounces: number }>()
    if (ids.length > 0) {
      const { data: sends } = await sb
        .from("broadcast_sends")
        .select("broadcast_id, sent_at, opened_at, clicked_at, error")
        .in("broadcast_id", ids)
      for (const s of sends ?? []) {
        const cur = stats.get(s.broadcast_id) ?? { delivered: 0, opens: 0, clicks: 0, bounces: 0 }
        if (s.sent_at && !s.error) cur.delivered++
        if (s.opened_at) cur.opens++
        if (s.clicked_at) cur.clicks++
        if (s.error) cur.bounces++
        stats.set(s.broadcast_id, cur)
      }
    }

    const enriched = (broadcasts ?? []).map(b => {
      const s = stats.get(b.id) ?? { delivered: 0, opens: 0, clicks: 0, bounces: 0 }
      return { ...b, ...s }
    })
    return NextResponse.json({ broadcasts: enriched })
  }

  if (action === "detail") {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { data: broadcast, error: bErr } = await sb.from("broadcasts").select("*").eq("id", id).maybeSingle()
    if (bErr || !broadcast) return NextResponse.json({ error: bErr?.message ?? "Not found" }, { status: 404 })

    const { data: sends } = await sb
      .from("broadcast_sends")
      .select("email, sent_at, opened_at, clicked_at, error")
      .eq("broadcast_id", id)
      .order("sent_at", { ascending: true, nullsFirst: false })
      .limit(500)

    const rows = sends ?? []
    const delivered = rows.filter(r => r.sent_at && !r.error).length
    const opens = rows.filter(r => r.opened_at).length
    const clicks = rows.filter(r => r.clicked_at).length
    const bounces = rows.filter(r => r.error).length

    return NextResponse.json({
      broadcast,
      recipients: rows,
      stats: { total: rows.length, delivered, opens, clicks, bounces },
    })
  }

  if (action === "segment-count") {
    const segment = (req.nextUrl.searchParams.get("segment") ?? "all") as Segment
    const channel = (req.nextUrl.searchParams.get("channel") ?? "newsletter") as Channel
    try {
      const count = await countSegment(channel, segment)
      return NextResponse.json({ segment, channel, count })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const action = req.nextUrl.searchParams.get("action")
  const sb = createAdminClient()

  if (action === "create") {
    const body = await req.json().catch(() => ({}))
    const subject = typeof body.subject === "string" ? body.subject.trim() : ""
    const htmlBody = typeof body.htmlBody === "string" ? body.htmlBody : ""
    const textBody = typeof body.textBody === "string" ? body.textBody : ""
    const segment = (typeof body.segment === "string" ? body.segment : "all") as Segment
    const channel = (typeof body.channel === "string" && (body.channel === "newsletter" || body.channel === "product")
      ? body.channel
      : "newsletter") as Channel

    if (!subject || !htmlBody || !textBody) {
      return NextResponse.json({ error: "subject, htmlBody, and textBody are required" }, { status: 400 })
    }

    const { data, error } = await sb.from("broadcasts").insert({
      subject, html_body: htmlBody, text_body: textBody,
      segment_filter: { segment },
      channel,
      created_by: admin.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ broadcast: data })
  }

  if (action === "send") {
    const body = await req.json().catch(() => ({}))
    const broadcastId = typeof body.broadcastId === "string" ? body.broadcastId : ""
    if (!broadcastId) return NextResponse.json({ error: "broadcastId required" }, { status: 400 })

    try {
      const result = await sendBroadcast(broadcastId)
      return NextResponse.json({ result })
    } catch (e) {
      console.error("[broadcasts] send failed:", e)
      await sb.from("broadcasts").update({ status: "failed" }).eq("id", broadcastId)
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  if (action === "send-test") {
    // Send a one-off preview to the admin's own email without going
    // through the segment system. Useful for sanity-checking layout.
    const body = await req.json().catch(() => ({}))
    const subject = typeof body.subject === "string" ? body.subject : ""
    const htmlBody = typeof body.htmlBody === "string" ? body.htmlBody : ""
    const textBody = typeof body.textBody === "string" ? body.textBody : ""
    if (!subject || !htmlBody) return NextResponse.json({ error: "subject + htmlBody required" }, { status: 400 })

    const { sendEmail } = await import("@/lib/email/client")
    const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://fatstacksacademy.com"
    const previewUnsubscribe = `${BASE}/newsletter/unsubscribe?token=preview`
    const result = await sendEmail({
      to: admin.email!,
      subject: `[PREVIEW] ${subject}`,
      html: htmlBody, text: textBody,
      unsubscribeUrl: previewUnsubscribe,
    })
    return NextResponse.json({ result })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
