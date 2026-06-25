import type { Metadata } from "next"
import Link from "next/link"
import BusinessBonusUnlock from "../components/BusinessBonusUnlock"
import { getBusinessBonuses, toBizBonusRows } from "../../lib/data/bonusCategories"
import {
  BrowseHeader,
  BrowseFooter,
  CategoryCrossNav,
  Section,
  StacksOsCta,
} from "../components/BonusBrowseSections"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: "Best Business Bank Account Bonuses (2026) — No LLC Needed | Fat Stacks Academy",
  description:
    "Every live business checking bonus worth opening — $300 to $1,500, and you do not need an LLC or EIN. Ranked by effective APY, updated continuously for 2026.",
  alternates: { canonical: `${BASE}/business-bank-bonuses` },
  openGraph: {
    type: "article",
    title: "Best Business Bank Account Bonuses (2026) — No LLC Needed",
    description:
      "Business checking bonuses pay $300–$1,500 and you do not need an LLC. Ranked by effective APY — sole proprietors qualify with an SSN.",
    url: `${BASE}/business-bank-bonuses`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Business Bank Bonuses (2026) — No LLC Needed" },
}

export default function BusinessBonusesBrowsePage() {
  const { nationwide, regional } = getBusinessBonuses()
  const freeRows = toBizBonusRows(nationwide)
  const gatedRows = toBizBonusRows(regional)
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const total = freeRows.length + gatedRows.length
  const topApy = freeRows.length ? freeRows[0].effApy : 0

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Business Bonuses · {monthLabel}
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Best business bank<br />bonuses in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 660 }}>
            Business checking accounts pay the biggest sign-up bonuses in banking — $300 to $1,500 — and you do
            <strong style={{ color: "#111" }}> not</strong> need an LLC or an EIN. Any side income makes you a sole
            proprietor, so you can open most of these with just your SSN. Ranked by <em>effective APY</em>
            {topApy > 0 ? ` — the top one runs about ${topApy}% annualized` : ""}. Last refreshed {updated}.
          </p>
        </div>

        <CategoryCrossNav current="business" />

        <Section
          title="Business bank bonuses, ranked by effective APY"
          subtitle={`${freeRows.length} nationwide offers, plus ${gatedRows.length} local & regional finds behind a free email unlock`}
          deepLink={{ href: "/blog/business-bank-bonuses-no-business-2026", label: "Read the full playbook" }}
        >
          <BusinessBonusUnlock freeRows={freeRows} gatedRows={gatedRows} source="business_browse" />
          <p style={{ fontSize: 13, color: "#aaa", margin: "12px 0 0" }}>
            Effective APY annualizes a one-time bonus over the days you hold the cash, so a $400-on-$2k-for-90-days
            beats a $400-on-$5k-for-90-days. Tiered offers are ranked by their <em>entry</em> tier — a bigger advertised
            bonus needs far more cash and pays a lower rate (Wells Fargo&apos;s $825-for-$25k tier yields roughly 17% vs.
            about 83% on its $400-for-$2.5k entry). Always confirm the offer is live, net out any monthly fee, and check
            state eligibility before you apply.
          </p>
        </Section>

        <Section
          title="Wait — how is a bank bonus 20%+ APY?"
          subtitle="The mental model that makes ranking these straightforward"
        >
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, fontSize: 15, color: "#444", lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              A bonus is a one-time payout, but you can measure it like a yield. Put $2,000 into a Chase business
              checking account, hold it about 90 days, collect a $400 bonus, and that is a 20% return in three
              months — roughly <strong style={{ color: "#111" }}>73% annualized</strong> on FDIC-insured cash. No
              single account pays that forever, but rotating the same money from one bonus to the next blends out
              north of 20% for the year — about 4 to 5 times a normal high-yield savings account.
            </p>
            <p style={{ marginBottom: 0 }}>
              The hard part is not finding the bonuses — it is the <strong style={{ color: "#111" }}>order</strong>.
              Your cash can only be in one place at a time, every bank has a different hold and cooldown, and a missed
              maintenance date forfeits the whole bonus.{" "}
              <Link href="/stacksos" style={{ color: "#0d7c5f", fontWeight: 600 }}>Stacks OS</Link> sequences them for
              your cash and state and tracks every deadline.
            </p>
          </div>
        </Section>

        <StacksOsCta totalBonuses={total} />
      </main>

      <BrowseFooter />
    </>
  )
}
