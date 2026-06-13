import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"
import { subscribeToBeehiiv } from "@/lib/beehiiv"

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

  // Best-effort newsletter subscribe — never blocks the unlock. The result is
  // recorded on the contact below so we can tell from Supabase whether the
  // lead actually reached Beehiiv (subscribed → sub id; error/skipped → reason).
  const beehiiv = await subscribeToBeehiiv(email, { utmSource: source })

  const { error: contactErr } = await admin.from("contacts").upsert(
    {
      email,
      source: state ? `${source}:${state}` : source,
      newsletter_opted_in: true,
      newsletter_opt_in_at: now,
      updated_at: now,
      beehiiv_status: beehiiv.status,
      beehiiv_subscription_id: beehiiv.subscriptionId,
      beehiiv_synced_at: now,
      beehiiv_error: beehiiv.error,
    },
    { onConflict: "email", ignoreDuplicates: false },
  )
  if (contactErr) {
    console.error("[catalog-unlock] contacts upsert failed:", contactErr.message)
    return NextResponse.json({ error: "Could not save contact" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
