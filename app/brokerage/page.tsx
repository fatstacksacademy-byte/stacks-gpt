import type { Metadata } from "next"
import Link from "next/link"
import NewsletterCTA from "../blog/components/NewsletterCTA"
import { blogPosts } from "../../lib/data/blogPosts"
import { blogContent } from "../../lib/data/blogContent"
import { getCategorizedBonuses, shortBankName } from "../../lib/data/bonusCategories"
import { practicalHoldDays } from "../../lib/data/savingsBonuses"
import {
  BrowseHeader,
  BrowseFooter,
  CategoryCrossNav,
  Section,
  TopPicksGrid,
  BonusTable,
  StacksOsCta,
  money,
} from "../components/BonusBrowseSections"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: "Best Brokerage Account Bonuses (2026) — Cash + Stock | Fat Stacks Academy",
  description: "Every live brokerage account bonus worth doing in 2026 — Robinhood, Webull, Public, Tastytrade, Moomoo, and more. SIPC-insured cash bonuses ranked by effective APY.",
  alternates: { canonical: `${BASE}/brokerage` },
  openGraph: {
    type: "article",
    title: "Best Brokerage Account Bonuses (2026) — Cash + Stock",
    description: "Every live brokerage account bonus — Robinhood, Webull, Public, Tastytrade — ranked by effective APY.",
    url: `${BASE}/brokerage`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Brokerage Account Bonuses (2026)" },
}

function slugForBonus(bonusId: string): string | null {
  const post = blogPosts.find(p => p.bonusId === bonusId)
  return post?.slug ?? null
}

export default function BrokerageBrowsePage() {
  const { brokerage, personalSavings, personalChecking } = getCategorizedBonuses()
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const totalAcrossSite = brokerage.length + personalSavings.length + personalChecking.length

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Brokerage Bonuses · {monthLabel}</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Best brokerage account<br/>bonuses in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 640 }}>
            {brokerage.length} live brokerage offers — Robinhood, Webull, Public, Tastytrade, Moomoo,
            and more. SIPC-insured platforms paying cash or free stock for transferring assets.
            Ranked by effective APY. Last refreshed {updated}.
          </p>
        </div>

        <CategoryCrossNav current="brokerage" />

        <div style={{ marginBottom: 56 }}>
          <NewsletterCTA />
        </div>

        <Section
          title="Brokerage Bonuses"
          subtitle={`${brokerage.length} live offers · SIPC-insured platforms, cash + stock rewards`}
        >
          <TopPicksGrid sourcePage="/brokerage" items={brokerage.slice(0, 6).map(({ bonus: b, effApy }) => {
            const t = b.tiers[0]
            return {
              bonusId: b.id,
              bonusType: "brokerage",
              bank: shortBankName(b),
              value: money(t.bonus_amount),
              sub: `${money(t.min_deposit)} · ${practicalHoldDays(b)}d hold · ${effApy.toFixed(1)}% eff APY`,
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              summary: blogContent[b.id]?.summary,
            }
          })} />
          <BonusTable
            sourcePage="/brokerage"
            rows={brokerage.map(({ bonus: b, effApy }, i) => {
              const t = b.tiers[0]
              return {
                i: i + 1,
                bank: shortBankName(b),
                bonus: money(t.bonus_amount),
                col3: money(t.min_deposit),
                col4: `${practicalHoldDays(b)}d`,
                col5: `${effApy.toFixed(1)}%`,
                href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
                bonusId: b.id,
                bonusType: "brokerage",
              }
            })}
            headers={["#", "Platform", "Bonus", "Min Deposit", "Hold", "Eff. APY"]}
          />
        </Section>

        <Section
          title="Are brokerage bonuses safe?"
          subtitle="The short answer: yes, with caveats"
        >
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, fontSize: 15, color: "#444", lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              Every brokerage on this page is <strong>SIPC-insured up to $500,000</strong> (which includes
              $250k in cash) — the brokerage equivalent of FDIC. If the firm fails, the SIPC steps in.
              That covers the major scenarios; it doesn&apos;t cover market losses from your own trades.
            </p>
            <p>
              The main caveat is the <strong>hold requirement</strong>. To collect the bonus, most
              platforms need you to keep the transferred assets (cash, stock, or both) at the
              brokerage for 90 to 365 days. Pull the money early and they claw the bonus back.
            </p>
            <p style={{ marginBottom: 0 }}>
              Functionally, brokerage cash bonuses are <em>identical to savings bonuses</em> — park cash,
              hold for X days, collect. Inside <Link href="/stacksos/savings" style={{ color: "#0d7c5f", fontWeight: 600 }}>Stacks OS</Link>{" "}
              they live under the Savings module and get sequenced alongside HYSA bonuses.
            </p>
          </div>
        </Section>

        <StacksOsCta totalBonuses={totalAcrossSite} />
      </main>

      <BrowseFooter />
    </>
  )
}
