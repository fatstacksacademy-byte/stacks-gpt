import { NextRequest, NextResponse } from "next/server"
import { subscribeToBeehiiv } from "@/lib/beehiiv"

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const result = await subscribeToBeehiiv(email)

  if (result.outcome === "skipped") {
    return NextResponse.json({ error: "Newsletter not configured" }, { status: 500 })
  }
  if (result.outcome === "error") {
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
