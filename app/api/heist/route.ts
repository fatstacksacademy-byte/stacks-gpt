import { NextResponse } from "next/server"
import { getHeistTotal, HEIST_GOAL } from "@/lib/stackhouse/heist"

/**
 * Public "Polite Heist Society" counter: the single collective total of every
 * dollar Stacks OS members have pulled back from the banks, toward the $1B
 * mission. Returns ONLY the aggregate — no per-user data — so it's safe to
 * serve unauthenticated. CDN-cached for 10 minutes (the number moves slowly),
 * with stale-while-revalidate so a cache miss never blocks the page.
 */
export const runtime = "nodejs"

export async function GET() {
  try {
    const total = await getHeistTotal()
    return NextResponse.json(total, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    })
  } catch (e) {
    // Never break a marketing page on a counter hiccup — fall back to a zeroed
    // total so the widget can render "the ledger just opened" gracefully.
    console.error("[heist] total failed:", e)
    return NextResponse.json(
      { taken: 0, goal: HEIST_GOAL, contributors: 0 },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } },
    )
  }
}
