import type { Metadata } from "next"
import Link from "next/link"
import { blogPosts, getSavingsBonusById } from "../../../lib/data/blogPosts"
import { blogContent } from "../../../lib/data/blogContent"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

export const metadata: Metadata = {
  title: "Best Savings Account Bonuses of 2026 - Ranked by Effective APY",
  description: "The best savings account bonuses available right now, ranked by effective APY. Chase $600 (16.2% APY), Capital One $1,500, Ally $100 (easiest), and more. Updated April 2026.",
  alternates: { canonical: `${BASE}/blog/best-savings-bonuses-2026` },
  openGraph: {
    type: "article",
    title: "Best Savings Account Bonuses of 2026 - Ranked by Effective APY",
    description: "The best savings account bonuses ranked by effective APY. Includes strategy tips for maximizing returns on your savings.",
    url: `${BASE}/blog/best-savings-bonuses-2026`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Savings Account Bonuses of 2026" },
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

export default function BestSavingsBonuses() {
  const savingsPosts = blogPosts.filter(p => p.bonusType === "savings")
  const sorted = savingsPosts
    .map(p => ({ post: p, bonus: getSavingsBonusById(p.bonusId) }))
    .filter(x => x.bonus)
    .sort((a, b) => {
      // Sort by effective APY at minimum tier
      const aBonus = a.bonus!
      const bBonus = b.bonus!
      const aTier = aBonus.tiers[0]
      const bTier = bBonus.tiers[0]
      const aInterest = aTier.min_deposit * aBonus.base_apy * (aBonus.total_hold_days / 365)
      const bInterest = bTier.min_deposit * bBonus.base_apy * (bBonus.total_hold_days / 365)
      const aEff = ((aTier.bonus_amount + aInterest) / aTier.min_deposit) * (365 / aBonus.total_hold_days)
      const bEff = ((bTier.bonus_amount + bInterest) / bTier.min_deposit) * (365 / bBonus.total_hold_days)
      return bEff - aEff
    })

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Best Savings Account Bonuses of 2026",
        description: "Comprehensive ranked list of the best savings account bonuses available in 2026, ranked by effective APY.",
        url: `${BASE}/blog/best-savings-bonuses-2026`,
        datePublished: "2026-04-10",
        dateModified: "2026-04-10",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "Best Savings Bonuses 2026", item: `${BASE}/blog/best-savings-bonuses-2026` },
        ],
      },
      {
        "@type": "ItemList",
        name: "Best Savings Account Bonuses 2026",
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
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Checking</Link>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best Savings</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>All Reviews</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>Best Savings Bonuses 2026</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          Best Savings Account Bonuses of 2026
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 10, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 650 }}>
          These are the best savings account bonuses available right now, ranked by effective APY — the real return you earn
          when you combine the cash bonus with the base interest rate over the holding period.
        </p>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 650 }}>
          Unlike checking bonuses which use your direct deposit, savings bonuses require parking a lump sum for a set period.
          The key metric is effective APY: higher is better. A shorter hold with a good bonus beats a long hold with a mediocre one
          because your capital is freed up sooner for the next bonus.
        </p>

        {/* Ranked list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sorted.map(({ post, bonus }, i) => {
            const b = bonus!
            const minTier = b.tiers[0]
            const interest = Math.round(minTier.min_deposit * b.base_apy * (b.total_hold_days / 365))
            const total = minTier.bonus_amount + interest
            const effApy = ((total / minTier.min_deposit) * (365 / b.total_hold_days) * 100).toFixed(1)
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{b.bank_name.split("(")[0].trim()}</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#0d7c5f" }}>{money(minTier.bonus_amount)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", padding: "2px 8px", borderRadius: 99 }}>
                        {effApy}% eff. APY
                      </span>
                      {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "2px 8px", borderRadius: 99 }}>TOP PICK</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#777" }}>
                      {money(minTier.min_deposit)} deposit | {b.total_hold_days}-day hold | {(b.base_apy * 100).toFixed(2)}% base APY
                      {b.tiers.length > 1 ? ` | ${b.tiers.length} tiers` : ""}
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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How Savings Bonuses Work</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Savings bonuses require depositing a lump sum into a new savings account and keeping it there for a set period — usually 90-180 days. After the holding period, the bank pays the bonus and you can move your money to the next opportunity.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Effective APY is the key metric.</strong> It combines the cash bonus with the base interest rate, annualized over the holding period. A $600 bonus on $15,000 for 90 days (Chase) beats a $300 bonus on $15,000 for 182 days (Blue Foundry) because your money is tied up for half the time.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Rotate your capital.</strong> After one bonus completes, move the same money to the next savings bonus. This is called capital rotation — you{"'"}re using the same pool of savings to earn multiple bonuses per year.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Don{"'"}t forget about the Ally referral.</strong> At just $60 in total deposits for a $100 bonus, the Ally savings referral is the easiest bonus on this list. Set it up in the background while you work on larger bonuses.
            </p>
          </div>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 40, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: Best Savings Bonuses of 2026</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel breaks down the best savings bonuses, effective APY calculations, and his personal capital rotation strategy on YouTube.
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
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best checking bonuses &rarr;</Link>
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
