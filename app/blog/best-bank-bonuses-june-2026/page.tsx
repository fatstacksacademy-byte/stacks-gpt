import type { Metadata } from "next"
import { notFound } from "next/navigation"
import MonthlyBankBonuses from "../components/MonthlyBankBonuses"
import { getMonthlyPicks } from "../../../lib/data/monthlyBankPicks"

const BASE = "https://fatstacksacademy.com"
const SLUG = "june-2026"

const picks = getMonthlyPicks(SLUG)

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

export default function Page() {
  if (!picks) notFound()
  return <MonthlyBankBonuses data={picks} />
}
