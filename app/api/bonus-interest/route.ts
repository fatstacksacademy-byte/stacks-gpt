import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"

export async function POST(req: NextRequest) {
  let body: { email?: unknown; bonusId?: unknown; bonusType?: unknown; sourcePage?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const bonusId = typeof body.bonusId === "string" ? body.bonusId.trim() : ""
  const bonusType = typeof body.bonusType === "string" ? body.bonusType : null
  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : null

  if (!email.includes("@") || email.length < 5) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  if (!bonusId) {
    return NextResponse.json({ error: "Missing bonusId" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error: contactErr } = await admin
    .from("contacts")
    .upsert(
      {
        email,
        source: sourcePage ?? "bonus_interest",
        newsletter_opted_in: true,
        newsletter_opt_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email", ignoreDuplicates: false },
    )
  if (contactErr) {
    console.error("[bonus-interest] contacts upsert failed:", contactErr.message)
    return NextResponse.json({ error: "Could not save contact" }, { status: 500 })
  }

  const { error: interestErr } = await admin
    .from("bonus_interests")
    .insert({ email, bonus_id: bonusId, bonus_type: bonusType, source_page: sourcePage })
  if (interestErr) {
    console.error("[bonus-interest] interest insert failed:", interestErr.message)
    return NextResponse.json({ error: "Could not save bonus interest" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
