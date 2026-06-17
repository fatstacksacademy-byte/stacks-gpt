import type { Metadata } from "next"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import CardValueCalculator from "../components/CardValueCalculator"
import { BrowseHeader, BrowseFooter, StacksOsCta } from "../components/BonusBrowseSections"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: "Credit Card Value Calculator — Year 1 & Year 2 Worth | Fat Stacks Academy",
  description:
    "See what any credit card is actually worth to you. Enter your monthly spend by category and get the real Year 1 and Year 2 value — sign-up bonus, rewards, credits, and annual fee — plus the 0% intro-APR float on cards that offer it.",
  alternates: { canonical: `${BASE}/credit-card-calculator` },
  openGraph: {
    type: "website",
    title: "Credit Card Value Calculator — Year 1 & Year 2 Worth",
    description:
      "Enter your spend, pick a card, see its real Year 1 and Year 2 value: bonus + rewards + credits − fee, plus the 0% APR float.",
    url: `${BASE}/credit-card-calculator`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Credit Card Value Calculator" },
}

export default async function CardValueCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string | string[] }>
}) {
  const params = await searchParams
  const initialCardId = typeof params.card === "string" ? params.card : undefined
  const liveCount = creditCardBonuses.filter((c) => !c.expired).length

  return (
    <>
      <BrowseHeader />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 48px" }} className="rm-content">
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>
          Credit Card Value Calculator
        </h1>
        <p style={{ fontSize: 15, color: "#666", margin: "0 0 28px", maxWidth: 680, lineHeight: 1.6 }}>
          Pick a card and enter your monthly spend. See its real <strong>Year 1</strong> value (sign-up
          bonus + first-year credits + rewards − fee) and steady-state <strong>Year 2</strong> value — and
          toggle the <strong>0% intro-APR float</strong> on cards that offer it to see how much the bank
          floating your balance is worth.
        </p>

        <CardValueCalculator cards={creditCardBonuses} initialCardId={initialCardId} />

        <p style={{ fontSize: 12, color: "#aaa", marginTop: 20, maxWidth: 680, lineHeight: 1.6 }}>
          Estimates only. Reward value uses each card&apos;s best earning tier per category and a standard
          point valuation; your real value depends on how you redeem. The 0% APR float assumes you can pay
          the balance in full before the promo ends and park the cash in a high-yield savings account.
        </p>

        <div style={{ marginTop: 28 }}>
          <StacksOsCta totalBonuses={liveCount} />
        </div>
      </main>
      <BrowseFooter />
    </>
  )
}
