import type { Metadata } from "next"
import { notFound } from "next/navigation"
import MonthlyCardBonuses from "../components/MonthlyCardBonuses"
import { getMonthlyCardPicks } from "../../../lib/data/monthlyCardPicks"

const BASE = "https://fatstacksacademy.com"
const SLUG = "june-2026"

const picks = getMonthlyCardPicks(SLUG)

export const metadata: Metadata = {
  title: "Best Credit Cards — June 2026 (Top Picks) - Fat Stacks Academy",
  description:
    "My top credit card picks for June 2026 — chosen for signup bonus value, reasonable spend requirements, and how well they pair with bank bonus sequencing.",
  alternates: { canonical: `${BASE}/blog/best-credit-cards-${SLUG}` },
  keywords: [
    "best credit cards june 2026",
    "june 2026 credit card bonus",
    "top credit card signup bonuses june 2026",
    "best credit card sign up bonus",
    "monthly credit card picks",
    "fat stacks academy credit cards",
  ],
  openGraph: {
    type: "article",
    title: "Best Credit Cards — June 2026",
    description: "My top credit card picks for June 2026.",
    url: `${BASE}/blog/best-credit-cards-${SLUG}`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Credit Cards — June 2026" },
}

export default function Page() {
  if (!picks) notFound()
  return <MonthlyCardBonuses data={picks} />
}
