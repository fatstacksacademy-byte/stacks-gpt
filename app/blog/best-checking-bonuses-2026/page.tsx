import type { Metadata } from "next"
import Link from "next/link"
import { blogPosts, getCheckingBonusById } from "../../../lib/data/blogPosts"
import { blogContent } from "../../../lib/data/blogContent"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

export const metadata: Metadata = {
  title: "Best Checking Account Bonuses of 2026 - Ranked by Value",
  description: "The best checking account bonuses available right now, ranked by bonus value and ease of requirements. Chase $400, Wells Fargo $400, BMO $600, and more. Updated April 2026.",
  alternates: { canonical: `${BASE}/blog/best-checking-bonuses-2026` },
  openGraph: {
    type: "article",
    title: "Best Checking Account Bonuses of 2026 - Ranked by Value",
    description: "The best checking account bonuses available right now, ranked by bonus value and ease of requirements. Updated April 2026.",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Best Checking Account Bonuses of 2026",
        description: "Comprehensive ranked list of the best checking account bonuses available in 2026.",
        url: `${BASE}/blog/best-checking-bonuses-2026`,
        datePublished: "2026-04-10",
        dateModified: "2026-04-10",
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
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none" }}>Fat Stacks Academy</Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best Checking</Link>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Savings</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>All Reviews</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          </nav>
        </div>
      </header>

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
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 10, 2026
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
