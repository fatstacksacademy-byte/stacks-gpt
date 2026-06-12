import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"

/**
 * Email-gate unlock for the regional card / state-bonus catalog.
 *
 * Captures the lead (contacts, newsletter opt-in) and best-effort subscribes
 * them to the Beehiiv list. One submit unlocks every state client-side. This
 * is a conversion gate, not DRM — the catalog data is already shipped to the
 * browser; the value is the captured email + newsletter subscriber.
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; source?: unknown; state?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const source = typeof body.source === "string" ? body.source : "catalog_unlock"
  const state = typeof body.state === "string" ? body.state.trim().toUpperCase().slice(0, 2) : null

  if (!email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error: contactErr } = await admin.from("contacts").upsert(
    {
      email,
      source: state ? `${source}:${state}` : source,
      newsletter_opted_in: true,
      newsletter_opt_in_at: now,
      updated_at: now,
    },
    { onConflict: "email", ignoreDuplicates: false },
  )
  if (contactErr) {
    console.error("[catalog-unlock] contacts upsert failed:", contactErr.message)
    return NextResponse.json({ error: "Could not save contact" }, { status: 500 })
  }

  // Best-effort newsletter subscribe — never block the unlock on Beehiiv.
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID
  if (apiKey && pubId) {
    try {
      const res = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: source,
        }),
      })
      if (!res.ok) {
        console.error("[catalog-unlock] beehiiv subscribe non-ok:", res.status, await res.text())
      }
    } catch (e) {
      console.error("[catalog-unlock] beehiiv subscribe threw:", (e as Error).message)
    }
  }

  return NextResponse.json({ ok: true })
}
