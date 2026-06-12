import type { Metadata } from "next"
import Link from "next/link"
import NewsletterCTA from "../blog/components/NewsletterCTA"
import { blogPosts } from "../../lib/data/blogPosts"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import { getCategorizedBonuses } from "../../lib/data/bonusCategories"
import CardFinder from "../components/CardFinder"
import {
  BrowseHeader,
  BrowseFooter,
  Section,
  TopPicksGrid,
  BonusTable,
  StacksOsCta,
  money,
} from "../components/BonusBrowseSections"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: "Best Credit Card Sign-Up Bonuses (2026) — Ranked by Year-One Value | Fat Stacks Academy",
  description: "Every live credit card sign-up bonus worth chasing in 2026. Personal + business cards ranked by year-one value (points × cpp + credits − annual fee). Updated continuously.",
  alternates: { canonical: `${BASE}/spending` },
  openGraph: {
    type: "article",
    title: "Best Credit Card Sign-Up Bonuses (2026) — Ranked by Year-One Value",
    description: "Every live credit card sign-up bonus, ranked by year-one value. Personal + business.",
    url: `${BASE}/spending`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Credit Card Sign-Up Bonuses (2026)" },
}

function slugForBonus(bonusId: string): string | null {
  const post = blogPosts.find(p => p.bonusId === bonusId)
  return post?.slug ?? null
}

function yearOneValue(c: typeof creditCardBonuses[number]): number {
  const points = c.bonus_amount * c.cpp_value
  const fee = c.annual_fee_waived_first_year ? 0 : c.annual_fee
  return Math.round(points + c.statement_credits_year1 - fee)
}

function bonusLabel(c: typeof creditCardBonuses[number]): string {
  if (c.bonus_currency === "cash") return `$${c.bonus_amount.toLocaleString()}`
  return `${c.bonus_amount.toLocaleString()} ${c.bonus_currency}`
}

export default function SpendingBrowsePage() {
  const live = creditCardBonuses.filter(c => !c.expired)
  const nationwide = live.filter(c => !c.state_restricted?.length)
  const regionalCount = live.length - nationwide.length
  const personal = nationwide
    .filter(c => c.card_type === "personal")
    .map(c => ({ card: c, value: yearOneValue(c) }))
    .sort((a, b) => b.value - a.value)
  const business = nationwide
    .filter(c => c.card_type === "business")
    .map(c => ({ card: c, value: yearOneValue(c) }))
    .sort((a, b) => b.value - a.value)

  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })

  const { personalChecking, personalSavings, brokerage } = getCategorizedBonuses()
  const totalAcrossSite = live.length + personalChecking.length + personalSavings.length + brokerage.length

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Credit Card Bonuses · {monthLabel}</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Best credit card<br/>sign-up bonuses in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 640 }}>
            {nationwide.length} nationwide cards plus {regionalCount} verified regional cards — ranked by
            <strong> year-one value</strong> (signup points × cpp + statement credits − annual fee). The
            real ranking, not the marketing headline. Last refreshed {updated}.
          </p>
        </div>

        {/* ── Choose-your-own-adventure finder ── */}
        <CardFinder cards={live} />

        <div style={{ marginBottom: 56 }}>
          <NewsletterCTA />
        </div>

        <Section
          anchorId="personal"
          title="Personal Credit Cards"
          subtitle={`${personal.length} live cards · ranked by year-one value`}
        >
          <TopPicksGrid sourcePage="/spending" items={personal.slice(0, 6).map(({ card, value }) => ({
            bonusId: card.id,
            bonusType: "credit-card",
            bank: card.card_name,
            value: `$${value.toLocaleString()}`,
            sub: `${bonusLabel(card)} after $${card.min_spend.toLocaleString()} in ${card.spend_months}mo${card.annual_fee > 0 ? ` · $${card.annual_fee} AF${card.annual_fee_waived_first_year ? " (waived Y1)" : ""}` : " · No AF"}`,
            href: slugForBonus(card.id) ? `/blog/${slugForBonus(card.id)}` : undefined,
            summary: card.key_benefits?.[0],
          }))} />
          <BonusTable
            sourcePage="/spending"
            rows={personal.map(({ card, value }, i) => {
              void value
              return {
                i: i + 1,
                bank: card.card_name,
                bonus: bonusLabel(card),
                col3: money(card.min_spend),
                col4: `${card.spend_months}mo`,
                col5: card.annual_fee > 0
                  ? `$${card.annual_fee}${card.annual_fee_waived_first_year ? "*" : ""}`
                  : "$0",
                href: slugForBonus(card.id) ? `/blog/${slugForBonus(card.id)}` : undefined,
                bonusId: card.id,
                bonusType: "credit-card",
              }
            })}
            headers={["#", "Card", "Bonus", "Min Spend", "Window", "Annual Fee"]}
          />
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>* Annual fee waived in year one</div>
        </Section>

        <Section
          anchorId="business"
          title="Business Credit Cards"
          subtitle={`${business.length} live cards · biggest payouts in the game (don't report to 5/24)`}
        >
          <TopPicksGrid sourcePage="/spending" items={business.slice(0, 6).map(({ card, value }) => ({
            bonusId: card.id,
            bonusType: "credit-card",
            bank: card.card_name,
            value: `$${value.toLocaleString()}`,
            sub: `${bonusLabel(card)} after $${card.min_spend.toLocaleString()} in ${card.spend_months}mo${card.annual_fee > 0 ? ` · $${card.annual_fee} AF${card.annual_fee_waived_first_year ? " (waived Y1)" : ""}` : " · No AF"}`,
            href: slugForBonus(card.id) ? `/blog/${slugForBonus(card.id)}` : undefined,
            summary: card.key_benefits?.[0],
          }))} />
          <BonusTable
            sourcePage="/spending"
            rows={business.map(({ card, value }, i) => {
              void value
              return {
                i: i + 1,
                bank: card.card_name,
                bonus: bonusLabel(card),
                col3: money(card.min_spend),
                col4: `${card.spend_months}mo`,
                col5: card.annual_fee > 0
                  ? `$${card.annual_fee}${card.annual_fee_waived_first_year ? "*" : ""}`
                  : "$0",
                href: slugForBonus(card.id) ? `/blog/${slugForBonus(card.id)}` : undefined,
                bonusId: card.id,
                bonusType: "credit-card",
              }
            })}
            headers={["#", "Card", "Bonus", "Min Spend", "Window", "Annual Fee"]}
          />
        </Section>

        <Section
          title="How to pick a credit card sign-up bonus"
          subtitle="The honest framework, not the affiliate-bait one"
        >
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, fontSize: 15, color: "#444", lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              The real ranking factor is <strong>year-one value</strong>: the cash-equivalent value of
              the signup points (points × cents-per-point) plus easily-claimable first-year statement
              credits, minus the annual fee. This list above is sorted by that math, not by gross
              point count or marketing copy.
            </p>
            <p>
              The second filter is <strong>min-spend feasibility</strong>. A $1,500 bonus that needs
              $20,000 in 3 months is useless if you only spend $1,500/mo. Open one card at a time,
              hit the spend organically, then move on. Stacks OS sequences this for you based on your
              actual monthly spend.
            </p>
            <p style={{ marginBottom: 0 }}>
              For Chase cards specifically: business Ink cards <strong>don&apos;t count toward 5/24</strong>{" "}
              because they don&apos;t report to personal credit. That&apos;s why they appear in their own
              section — they&apos;re the cheat code for staying under Chase&apos;s velocity limit. See
              <Link href="/stacksos/spending" style={{ color: "#0d7c5f", fontWeight: 600 }}> Stacks OS spending</Link> for
              the full sequence.
            </p>
          </div>
        </Section>

        <StacksOsCta totalBonuses={totalAcrossSite} />
      </main>

      <BrowseFooter />
    </>
  )
}
