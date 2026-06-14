import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"

/**
 * Newsletter signup (the on-site NewsletterCTA box).
 *
 * Writes to the owned `contacts` table — the same list the email gate feeds and
 * the in-house Resend broadcast system (/admin/broadcasts) sends from. This is
 * the single source of truth; we no longer split signups off into Beehiiv.
 */
export async function POST(req: NextRequest) {
  let email = ""
  try {
    const body = await req.json()
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await admin.from("contacts").upsert(
    {
      email,
      source: "newsletter_cta",
      newsletter_opted_in: true,
      newsletter_opt_in_at: now,
      updated_at: now,
    },
    { onConflict: "email", ignoreDuplicates: false },
  )
  if (error) {
    console.error("[newsletter] contacts upsert failed:", error.message)
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
