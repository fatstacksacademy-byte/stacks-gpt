import type { Metadata } from "next"
import Link from "next/link"
import NewsletterCTA from "../blog/components/NewsletterCTA"
import { blogPosts } from "../../lib/data/blogPosts"
import { blogContent } from "../../lib/data/blogContent"
import { getCategorizedBonuses, shortBankName } from "../../lib/data/bonusCategories"
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
  title: "Best Checking Account Bonuses (2026) — Every Live Offer | Fat Stacks Academy",
  description: "Every live personal checking account bonus worth doing in 2026 — ranked by payout, with direct deposit requirements, deposit windows, and fees. Continuously updated.",
  alternates: { canonical: `${BASE}/checking` },
  openGraph: {
    type: "article",
    title: "Best Checking Account Bonuses (2026) — Every Live Offer",
    description: "Every live personal checking account bonus, ranked by payout. DD requirements, windows, fees.",
    url: `${BASE}/checking`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Checking Account Bonuses (2026)" },
}

function slugForBonus(bonusId: string): string | null {
  const post = blogPosts.find(p => p.bonusId === bonusId)
  return post?.slug ?? null
}

export default function CheckingBrowsePage() {
  const { personalChecking, personalSavings, brokerage } = getCategorizedBonuses()
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const totalAcrossSite = personalChecking.length + personalSavings.length + brokerage.length

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Checking Bonuses · {monthLabel}</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Best checking account<br/>bonuses in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 640 }}>
            {personalChecking.length} live personal checking bonuses — the bread-and-butter of bank-bonus
            hunting. Open the account, route a direct deposit, hit the requirement, collect.
            Ranked by payout, with DD minimums and deposit windows. Last refreshed {updated}.
          </p>
        </div>

        <CategoryCrossNav current="checking" />

        <div style={{ marginBottom: 56 }}>
          <NewsletterCTA />
        </div>

        <Section
          title="Personal Checking Bonuses"
          subtitle={`${personalChecking.length} live offers · ranked by bonus amount`}
          deepLink={{ href: "/blog/best-checking-bonuses-2026", label: "See full checking rankings" }}
        >
          <TopPicksGrid sourcePage="/checking" items={personalChecking.slice(0, 6).map(b => ({
            bonusId: b.id,
            bonusType: "personal-checking",
            bank: shortBankName(b),
            value: money(b.bonus_amount),
            sub: b.requirements?.min_direct_deposit_total
              ? `${money(b.requirements.min_direct_deposit_total)} DD · ${b.requirements.deposit_window_days || "?"}d window`
              : "See offer for requirements",
            href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
            summary: blogContent[b.id]?.summary,
          }))} />
          <BonusTable
            sourcePage="/checking"
            rows={personalChecking.map((b, i) => ({
              i: i + 1,
              bank: shortBankName(b),
              bonus: money(b.bonus_amount),
              col3: b.requirements?.min_direct_deposit_total ? money(b.requirements.min_direct_deposit_total) : "—",
              col4: b.requirements?.deposit_window_days ? `${b.requirements.deposit_window_days}d` : "—",
              col5: b.fees?.monthly_fee === 0 ? "$0" : b.fees?.monthly_fee != null ? `$${b.fees.monthly_fee}` : "—",
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              bonusId: b.id,
              bonusType: "personal-checking",
            }))}
            headers={["#", "Bank", "Bonus", "DD Required", "Window", "Fee"]}
          />
        </Section>

        <Section
          title="How checking bonuses actually work"
          subtitle="The pattern is the same at almost every bank"
        >
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 28, fontSize: 15, color: "#444", lineHeight: 1.7 }}>
            <p style={{ marginTop: 0 }}>
              Almost every checking bonus follows the same template:
              <strong> open the account, set up a qualifying direct deposit, hit the deposit threshold within X days, and the bonus posts within 30–90 days.</strong>
              The variables are the bonus amount, the DD minimum (usually $500–$3,000), and the deposit window (usually 60–90 days).
            </p>
            <p>
              The tricky part is <strong>direct-deposit routing</strong>. Most W-2 employees only have
              one paycheck — you can&apos;t physically send it to four different banks at once. The
              real game is splitting your paycheck (via your employer&apos;s portal) across multiple
              banks running bonuses simultaneously, then redirecting once each one clears.
            </p>
            <p style={{ marginBottom: 0 }}>
              <Link href="/stacksos/paycheck" style={{ color: "#0d7c5f", fontWeight: 600 }}>Stacks OS</Link>{" "}
              sequences which bonuses run in which DD slot week by week, so you don&apos;t
              accidentally lose a $400 bonus by forgetting to swap your routing.
            </p>
          </div>
        </Section>

        <StacksOsCta totalBonuses={totalAcrossSite} />
      </main>

      <BrowseFooter />
    </>
  )
}
