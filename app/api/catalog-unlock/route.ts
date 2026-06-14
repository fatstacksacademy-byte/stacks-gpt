import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"

/**
 * Email-gate unlock for the regional card / state-bonus catalog.
 *
 * Saves the lead into the `contacts` table with newsletter consent — which is
 * already the audience for the in-house Resend broadcast system (see
 * lib/email/broadcast.ts and /admin/broadcasts). No external ESP: landing in
 * `contacts` IS the integration. One submit unlocks every state client-side.
 * This is a conversion gate, not DRM — the catalog data already ships to the
 * browser; the value is the captured, owned, consented email.
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

  return NextResponse.json({ ok: true })
}
