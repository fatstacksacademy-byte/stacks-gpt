import type { Metadata } from "next"
import { notFound } from "next/navigation"
import MonthlyBankBonuses from "../components/MonthlyBankBonuses"
import { getMonthlyPicks, type MonthlyBankPicks } from "../../../lib/data/monthlyBankPicks"
import { createClient } from "../../../lib/supabase/server"

const BASE = "https://fatstacksacademy.com"
const SLUG = "june-2026"

// Static fallback used for metadata (synchronous)
const staticPicks = getMonthlyPicks(SLUG)

export const metadata: Metadata = {
  title: "Best Bank Bonuses — June 2026 (Top 4 Picks) - Fat Stacks Academy",
  description:
    "My top 4 bank account bonuses for June 2026 — ranked by bonus value, simplicity of the direct deposit, and how confident I am the offer sticks around.",
  alternates: { canonical: `${BASE}/blog/best-bank-bonuses-${SLUG}` },
  keywords: [
    "best bank bonuses june 2026",
    "june 2026 bank bonus",
    "top bank account bonuses june 2026",
    "best checking bonus june",
    "monthly bank bonus picks",
    "fat stacks academy bank bonuses",
  ],
  openGraph: {
    type: "article",
    title: "Best Bank Bonuses — June 2026",
    description: "My top 4 bank account bonuses for June 2026.",
    url: `${BASE}/blog/best-bank-bonuses-${SLUG}`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Bank Bonuses — June 2026" },
}

export default async function Page() {
  // Try DB first (admin saves here), fall back to static TS data
  let picks: MonthlyBankPicks | undefined = staticPicks
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("monthly_bank_picks")
      .select("*")
      .eq("month_slug", SLUG)
      .single()
    if (data) {
      picks = {
        monthSlug: data.month_slug,
        monthLabel: data.month_label,
        publishedDate: data.published_date,
        videoId: data.video_id ?? undefined,
        intro: data.intro,
        picks: data.picks,
      }
    }
  } catch {}

  if (!picks) notFound()
  return <MonthlyBankBonuses data={picks} />
}
