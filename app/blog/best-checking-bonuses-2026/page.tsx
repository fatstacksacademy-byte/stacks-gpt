import type { Metadata } from "next"
import Link from "next/link"
import SiteHeader from "../../components/SiteHeader"
import { blogPosts, getCheckingBonusById } from "../../../lib/data/blogPosts"
import { blogContent } from "../../../lib/data/blogContent"
import AffiliateDisclosure from "../components/AffiliateDisclosure"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

export const metadata: Metadata = {
  title: "Best Checking Account Bonuses of 2026 - Ranked by Value",
  description: "The best checking account bonuses available right now, ranked by bonus value and ease of requirements. Chase $400, Wells Fargo $400, BMO $400, and more — with credit-pull, ChexSystems, cooldown, and tax notes. Updated June 2026.",
  alternates: { canonical: `${BASE}/blog/best-checking-bonuses-2026` },
  openGraph: {
    type: "article",
    title: "Best Checking Account Bonuses of 2026 - Ranked by Value",
    description: "The best checking account bonuses available right now, ranked by bonus value and ease of requirements. Updated June 2026.",
    url: `${BASE}/blog/best-checking-bonuses-2026`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Checking Account Bonuses of 2026" },
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

export default function BestCheckingBonuses() {
  const checkingPosts = blogPosts.filter(p => p.bonusType === "checking")
  // Sort by bonus amount descending
  const sorted = checkingPosts
    .map(p => ({ post: p, bonus: getCheckingBonusById(p.bonusId) }))
    .filter(x => x.bonus)
    .sort((a, b) => (b.bonus!.bonus_amount || 0) - (a.bonus!.bonus_amount || 0))

  const faqs = [
    {
      q: "Are checking account bonuses taxable?",
      a: "Yes. Banks report account bonuses as interest income on a 1099-INT (issued once you cross $10), and the IRS treats them as ordinary income — taxable even if the bank never sends you a form. A good rule of thumb is to set aside 20–30% of each bonus for taxes.",
    },
    {
      q: "Do checking bonuses require a hard credit pull?",
      a: "Usually not. Most checking bonuses use a soft pull or no credit pull at all and instead check ChexSystems, a banking-history report. Chase, Wells Fargo, and Capital One are typically soft-pull; a handful of banks (Citi and US Bank among them) can do a hard pull, so check each offer before applying.",
    },
    {
      q: "What is ChexSystems and will it stop me from getting approved?",
      a: "ChexSystems is a report of your past banking behavior — closed accounts, overdrafts, and recent new-account inquiries. Most banks check it, and some are sensitive to a high volume of recent inquiries. If you've opened several accounts in a short window, space new ones out or start with banks that don't use ChexSystems, like Chime and SoFi.",
    },
    {
      q: "How many checking bonuses can I work on at once?",
      a: "As many as you can satisfy the direct-deposit requirements for. Most employers let you split your direct deposit across multiple accounts, so you can run several bonuses in parallel — just track each deadline so a qualifying deposit doesn't slip.",
    },
    {
      q: "How long does it take for a checking bonus to post?",
      a: "It ranges from about 15 days (Chase) to a few months at slower banks. Most bonuses post within one to two statement cycles after you've met the direct-deposit and any debit-transaction requirements.",
    },
    {
      q: "Can I earn the same bank's bonus more than once?",
      a: "Often yes, but only after a cooldown — commonly 12 to 24 months since your last bonus or account closure at that bank. Always check the specific offer's fine print, since repeat eligibility is where most people accidentally disqualify themselves.",
    },
  ]

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Best Checking Account Bonuses of 2026",
        description: "Comprehensive ranked list of the best checking account bonuses available in 2026.",
        url: `${BASE}/blog/best-checking-bonuses-2026`,
        datePublished: "2026-04-10",
        dateModified: "2026-06-15",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "Best Checking Bonuses 2026", item: `${BASE}/blog/best-checking-bonuses-2026` },
        ],
      },
      {
        "@type": "ItemList",
        name: "Best Checking Account Bonuses 2026",
        itemListElement: sorted.map((x, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: x.post.title,
          url: `${BASE}/blog/${x.post.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHeader />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>Best Checking Bonuses 2026</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          Best Checking Account Bonuses of 2026
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated June 15, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 650 }}>
          These are the best checking account bonuses available right now, ranked by bonus value. Every offer on this list has been
          personally reviewed for requirements, eligibility, fees, and ChexSystems sensitivity.
        </p>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 650 }}>
          Most checking bonuses require switching your direct deposit temporarily. The highest-value bonuses come from major banks
          like Chase, Wells Fargo, and BMO. Credit union bonuses tend to be lower but often have easier requirements. Click any
          bonus for the full review with strategy tips.
        </p>

        {/* Ranked list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sorted.map(({ post, bonus }, i) => {
            const b = bonus!
            const req = b.requirements || {}
            const content = blogContent[post.bonusId]
            return (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "20px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  background: i === 0 ? "rgba(13,124,95,0.04)" : "transparent",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: i < 3 ? "#0d7c5f" : "#ccc", width: 32, textAlign: "center", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{b.bank_name?.split("(")[0].trim()}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#0d7c5f" }}>{money(b.bonus_amount)}</span>
                      {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "2px 8px", borderRadius: 99 }}>TOP PICK</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#777" }}>
                      {req.min_direct_deposit_total ? `${money(req.min_direct_deposit_total)} DD` : "DD required"}
                      {req.deposit_window_days ? ` in ${req.deposit_window_days} days` : ""}
                      {req.debit_transactions_required ? ` + ${req.debit_transactions_required} transactions` : ""}
                      {b.cooldown_months ? ` | ${b.cooldown_months}mo cooldown` : ""}
                    </div>
                    {content && (
                      <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5, margin: "6px 0 0" }}>
                        {content.summary.slice(0, 120)}...
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: "#0d7c5f", fontWeight: 600, flexShrink: 0 }}>Review &rarr;</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Bottom editorial */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How to Get Started With Checking Bonuses</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Bank bonuses are one of the easiest ways to earn extra income. Most checking bonuses require you to open an account and route your paycheck via direct deposit for 1-3 months. After the bonus posts, you can move to the next bank.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Start with Chase ($400).</strong> It has the simplest requirements ($1,000 DD in 90 days) and the fastest payout (~15 days). After Chase, move to Wells Fargo ($400) and then work through the list.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Split your direct deposit</strong> to work on multiple bonuses at once. Most employers allow you to send portions of your paycheck to different accounts.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Track your bonuses.</strong> Use <Link href="/stacksos" style={{ color: "#0d7c5f", textDecoration: "none" }}>Stacks OS</Link> to keep track of which bonuses you{"'"}re working on, what{"'"}s next, and your total earnings.
            </p>
          </div>
        </div>

        {/* What to know before you start */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>What to Know Before You Start</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Credit pull.</strong> Most checking bonuses are soft-pull or no-pull — they won{"'"}t ding your credit score. The gatekeeper is usually <Link href="/blog/chexsystems-guide-bank-bonuses" style={{ color: "#0d7c5f", textDecoration: "none" }}>ChexSystems</Link>, a banking-history report, not your FICO. A few banks (notably Citi and US Bank) can hard-pull, so confirm before you apply if you{"'"}re rate-shopping for a loan.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>ChexSystems sensitivity.</strong> If you{"'"}ve opened a lot of accounts recently, some banks will decline you for inquiry volume alone. Space out applications, or start with banks that skip ChexSystems entirely (Chime, SoFi) to build momentum.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Cooldowns.</strong> Most banks let you re-earn a bonus only after a waiting period since your last bonus or account closure — commonly 12 to 24 months. The cooldown for each offer is shown in the ranked list above and on every full review.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Direct deposit.</strong> Each bank defines a {`"`}qualifying{`"`} direct deposit differently — some accept ACH pushes from brokerages like Fidelity, others require true payroll. Check our <Link href="/blog/what-counts-as-direct-deposit" style={{ color: "#0d7c5f", textDecoration: "none" }}>what counts as direct deposit</Link> guide before you route a deposit you{"'"}re counting on.
            </p>
          </div>
        </div>

        {/* Taxes */}
        <div style={{ marginTop: 40, padding: "20px 24px", background: "#fafaf8", border: "1px solid #eee", borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 10px" }}>Are these bonuses taxable?</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0 }}>
            Yes. Banks report account bonuses as interest on a 1099-INT (issued once you cross $10), and they{"'"}re taxed as ordinary income — owed even if no form arrives. Set aside roughly 20–30% per bonus, and see the full <Link href="/blog/bank-bonus-tax-guide-2026" style={{ color: "#0d7c5f", textDecoration: "none" }}>bank bonus tax guide</Link> for how to report them.
          </p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>{f.q}</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 40, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: The Best Checking Bonuses of 2026</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel walks through his top picks and strategies for maximizing checking account bonuses on his YouTube channel.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#ff0000", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <AffiliateDisclosure variant="block" />

        <div style={{ marginTop: 32, display: "flex", gap: 20 }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; All reviews</Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best savings bonuses &rarr;</Link>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>YouTube</a>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
