import type { Metadata } from "next"
import { notFound } from "next/navigation"
import MonthlyBankBonuses from "../components/MonthlyBankBonuses"
import { getMonthlyPicks, type MonthlyBankPicks } from "../../../lib/data/monthlyBankPicks"
import { createClient } from "../../../lib/supabase/server"

const BASE = "https://fatstacksacademy.com"
const SLUG = "july-2026"

// Static fallback used for metadata (synchronous)
const staticPicks = getMonthlyPicks(SLUG)

export const metadata: Metadata = {
  title: "Best Bank Bonuses — July 2026 (Top Picks + $825 Wells Fargo Business) - Fat Stacks Academy",
  description:
    "My top bank account bonuses for July 2026 — including the Ally trick that doubles as your Bank of America direct deposit, FourLeaf's $550 multi-year payout, and the Wells Fargo Business bonus that expires July 7.",
  alternates: { canonical: `${BASE}/blog/best-bank-bonuses-${SLUG}` },
  keywords: [
    "best bank bonuses july 2026",
    "july 2026 bank bonus",
    "top bank account bonuses july 2026",
    "bank of america bonus direct deposit ally",
    "wells fargo business checking bonus",
    "monthly bank bonus picks",
    "fat stacks academy bank bonuses",
  ],
  openGraph: {
    type: "article",
    title: "Best Bank Bonuses — July 2026",
    description: "My top bank account bonuses for July 2026.",
    url: `${BASE}/blog/best-bank-bonuses-${SLUG}`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Bank Bonuses — July 2026" },
}

export default async function Page() {
  // Try DB first (admin saves the core fields there), fall back to static TS data.
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

  // strategyCallout + honorableMentions are authored in the static TS entry only —
  // the /admin/blog-posts editor doesn't manage them and its save writes only the
  // core columns. Always overlay them from static so an admin save (e.g. dropping
  // in the video ID after upload) can't silently drop these sections.
  if (picks && staticPicks) {
    picks = {
      ...picks,
      strategyCallout: staticPicks.strategyCallout,
      honorableMentions: staticPicks.honorableMentions,
    }
  }

  if (!picks) notFound()
  return <MonthlyBankBonuses data={picks} />
}
