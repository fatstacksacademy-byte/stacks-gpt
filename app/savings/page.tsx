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
  title: "Best Savings Account Bonuses (2026) — Effective APY Ranked | Fat Stacks Academy",
  description: "Every live savings account bonus worth parking cash in. Ranked by effective APY, with deposit minimums, lockup periods, and base APYs. Updated continuously for 2026.",
  alternates: { canonical: `${BASE}/savings` },
  openGraph: {
    type: "article",
    title: "Best Savings Account Bonuses (2026) — Effective APY Ranked",
    description: "Every live savings account bonus worth parking cash in — ranked by effective APY.",
    url: `${BASE}/savings`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Savings Account Bonuses (2026)" },
}

function slugForBonus(bonusId: string): string | null {
  const post = blogPosts.find(p => p.bonusId === bonusId)
  return post?.slug ?? null
}

export default function SavingsBrowsePage() {
  const { personalSavings, brokerage } = getCategorizedBonuses()
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const totalAcrossSite = personalSavings.length + brokerage.length

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Savings Bonuses · {monthLabel}</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Best savings account<br/>bonuses in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 640 }}>
            {personalSavings.length} live offers — park cash, hit the deposit minimum, hold for the
            lockup window, walk away with the bonus. Ranked by <em>effective APY</em> so you can
            compare a $300-bonus-on-$25k against a $50-bonus-on-$5k apples-to-apples. Last refreshed {updated}.
          </p>
        </div>

        <CategoryCrossNav current="savings" />

        <div style={{ marginBottom: 56 }}>
          <NewsletterCTA />
        </div>

        <Section
          title="Personal Savings Bonuses"
          subtitle={`${personalSavings.length} live offers · ranked by effective APY`}
          deepLink={{ href: "/blog/best-savings-bonuses-2026", label: "See full savings rankings" }}
        >
          <TopPicksGrid sourcePage="/savings" items={personalSavings.slice(0, 6).map(({ bonus: b, effApy }) => {
            const t = b.tiers[0]
            return {
              bonusId: b.id,
              bonusType: "personal-savings",
              bank: shortBankName(b),
              value: money(t.bonus_amount),
              sub: `${money(t.min_deposit)} hold · ${practicalHoldDays(b)}d · ${effApy.toFixed(1)}% eff APY`,
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              summary: blogContent[b.id]?.summary,
            }
          })} />
          <BonusTable
            sourcePage="/savings"
            rows={personalSavings.map(({ bonus: b, effApy }, i) => {
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
                bonusType: "personal-savings",
              }
            })}
            headers={["#", "Bank", "Bonus", "Min Deposit", "Hold", "Eff. APY"]}
          />
        </Section>

        <Section
          title="What's a savings bonus, really?"
          subtitle="The mental model that makes ranking these straightforward"
        >
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, fontSize: 15, color: "#444", lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              A savings bonus is just a bank renting your cash. You park a minimum balance for a
              fixed lockup window — usually 60 to 180 days — and they pay you a flat bonus on top of
              whatever base APY the account earns. <strong>Effective APY</strong> annualizes the whole
              return so a $400-bonus-on-$25k for 90 days (around 6.4% eff. APY) is comparable to a
              $200-bonus-on-$10k for 60 days (around 12.2% eff. APY).
            </p>
            <p>
              These are usually less work than checking bonuses — no direct deposit, no debit
              transactions, often no fees. The catch is they need real cash. If you have an emergency
              fund or down-payment savings sitting in a HYSA earning 4%, rotating it through these
              every quarter can easily 2–3× your yield.
            </p>
            <p style={{ marginBottom: 0 }}>
              Most savings bonuses are <em>one-and-done per lifetime</em> at each bank, so the
              sequence matters — take the biggest absolute payouts first, then move to high-APY
              churnable banks. <Link href="/stacksos/savings" style={{ color: "#0d7c5f", fontWeight: 600 }}>Stacks OS</Link>{" "}
              does this sequencing automatically.
            </p>
          </div>
        </Section>

        <Section
          title="Looking for brokerage bonuses?"
          subtitle="Brokerage cash bonuses (Robinhood, Webull, Public, Tastytrade) use the same playbook"
        >
          <div style={{ background: "#f8faf9", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ minWidth: 240, flex: "1 1 320px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 6 }}>
                {brokerage.length} live brokerage offers
              </div>
              <div style={{ fontSize: 14, color: "#666", lineHeight: 1.55 }}>
                Same mechanic — deposit cash, hold for X days, collect the bonus. SIPC-insured, no
                stock-purchase requirement on most.
              </div>
            </div>
            <Link href="/brokerage" style={{
              padding: "12px 24px", fontSize: 14, fontWeight: 700, background: "#0d7c5f",
              color: "#fff", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap",
            }}>
              See brokerage bonuses →
            </Link>
          </div>
        </Section>

        <StacksOsCta totalBonuses={totalAcrossSite} />
      </main>

      <BrowseFooter />
    </>
  )
}
