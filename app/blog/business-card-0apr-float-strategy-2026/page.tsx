import type { Metadata } from "next"
import Link from "next/link"
import SiteHeader from "../../components/SiteHeader"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const CANONICAL = `${BASE}/blog/business-card-0apr-float-strategy-2026`

export const metadata: Metadata = {
  title: "The 0% APR Float Strategy: One Business Card, 7% Back on Everything (2026)",
  description: "A handful of business cards earn strong rewards AND give 0% APR for 12 months. Float your spending, keep your cash earning, and net ~7% back on everything. The 2026 catch-all playbook.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    title: "The 0% APR Float Strategy: One Business Card, 7% Back on Everything (2026)",
    description: "Float your business spending at 0% while your cash earns 4.5% — net ~7% back on everything. The catch-all card playbook.",
    url: CANONICAL,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "The 0% APR Float Strategy (7% Back on Everything)" },
  keywords: [
    "0% APR business card strategy",
    "business card float strategy",
    "catch all credit card 2026",
    "Amex Blue Business Plus strategy",
    "best 0% APR business credit cards",
    "credit card float arbitrage",
    "business card no annual fee 0 percent",
    "Chase Ink 0% APR",
    "US Bank Triple Cash business",
    "7% back credit card strategy",
  ],
}

type Card = { card: string; earn: string; intro: string; bonus: string }

const cards: Card[] = [
  { card: "Amex Blue Business Plus", earn: "2x MR everywhere (≤$50k/yr)", intro: "12 mo", bonus: "15k–75k MR" },
  { card: "Amex Blue Business Cash", earn: "2% cash everywhere (≤$50k/yr)", intro: "12 mo", bonus: "up to $500" },
  { card: "Chase Ink Business Cash", earn: "5% office/internet/phone", intro: "12 mo", bonus: "100k" },
  { card: "Chase Ink Business Unlimited", earn: "1.5% flat", intro: "12 mo", bonus: "100k" },
  { card: "U.S. Bank Triple Cash", earn: "3% gas/dining/cell/office", intro: "12 mo", bonus: "$750" },
  { card: "Wells Fargo Signify", earn: "2% flat", intro: "12 mo", bonus: "$500" },
]

const faqs = [
  { q: "Do I need a business to get these cards?", a: "You qualify as a sole proprietor if you earn any side income — apply with your SSN. See our business bank account guide for the full explanation." },
  { q: "Does carrying a balance during the 0% period hurt my credit?", a: "With Amex, Chase, and U.S. Bank business cards, the balance does not report to personal credit, so it does not affect your score. Capital One business cards DO report to personal credit — avoid those for this strategy." },
  { q: "Is 7% back really sustainable?", a: "The float-interest portion shrinks as you approach the payoff date, which is why you reset with a fresh card roughly every 6 months. Across a full cycle it averages about 7%." },
  { q: "What do I do when the 0% period ends?", a: "Pay the balance in full from the cash you parked in savings, then move your spend to the next card whose 0% window is open." },
  { q: "Are the rewards and float interest taxable?", a: "Sign-up bonuses on spend generally are not; the savings-account interest is (1099-INT). Set aside about 15%." },
]

export default function BusinessCardFloatStrategy() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "The 0% APR Float Strategy: How One Business Card Earns Me 7% Back on Everything",
        description: "A handful of business cards earn strong rewards and give 0% APR for 12 months. Float your spending, keep your cash earning, and net about 7% back on everything.",
        url: CANONICAL,
        datePublished: "2026-06-21",
        dateModified: "2026-06-21",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "The 0% APR Float Strategy", item: CANONICAL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>The 0% APR Float Strategy</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.12 }}>
          The 0% APR Float Strategy: How One Business Card Earns Me 7% Back on Everything
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated June 21, 2026
        </p>

        <p style={{ fontSize: 17, color: "#444", lineHeight: 1.7, margin: "0 0 16px" }}>
          A handful of business credit cards earn strong flat rewards <strong style={{ color: "#111" }}>and</strong> give
          you 0% APR on purchases for the first 12 months. Put your spending on one, leave your actual cash in a
          high-yield account earning about 4.5%, and pay the card off right before the 0% ends. You earn the rewards, you
          earn the interest, and the bank floats your spending for free. Done right — welcome bonus + flat rewards +
          float interest — it works out to <strong style={{ color: "#111" }}>about 7% back on everything</strong>, and you
          can rotate a stable of these cards to keep it running almost indefinitely.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>Why a flat 2% card becomes &quot;7% back&quot;</h2>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
          Take the Amex Blue Business Plus: 2x Membership Rewards on every purchase (up to $50k/year), no annual fee, and
          0% APR for 12 months. The 7% is three things stacked: the <strong style={{ color: "#111" }}>welcome bonus</strong>{" "}
          spread across your spend, <strong style={{ color: "#111" }}>2x points on everything</strong> (worth ~2% as cash,
          more via transfer partners), and the <strong style={{ color: "#111" }}>float</strong> — instead of paying the
          card monthly, you keep that cash in a 4.5% account for up to a year and pocket the interest.
        </p>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0 }}>
          Real example: on <strong style={{ color: "#111" }}>$12,282 of spend</strong>, that is about 50,000 points
          (including the bonus) plus ~$430 of float interest = <strong style={{ color: "#111" }}>$926, or 7.54%</strong> —
          roughly 7.0% after the tax on the interest. Even at $3,000 of spend with the standard 15,000-point bonus, it
          still lands near 7%.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>How the 0% float actually works</h2>
        <ol style={{ fontSize: 15, color: "#555", lineHeight: 1.8, paddingLeft: 22, margin: "0 0 12px" }}>
          <li><strong style={{ color: "#111" }}>Spend normally</strong> on the card.</li>
          <li><strong style={{ color: "#111" }}>Set autopay to the minimum</strong> (usually ~1% of the balance or $40).</li>
          <li><strong style={{ color: "#111" }}>Keep your real cash in a high-yield savings account</strong> earning ~4.5% — the bank is floating your purchases interest-free.</li>
          <li><strong style={{ color: "#111" }}>Mark your calendar</strong> for the 0% end date (it is on the bottom of every statement).</li>
          <li><strong style={{ color: "#111" }}>Pay the balance in full a few days before</strong> that date.</li>
        </ol>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>Why business cards (and why it does not hurt your credit)</h2>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
          This works best with <strong style={{ color: "#111" }}>business</strong> cards for two reasons. First, Amex
          soft-pulls you for a new business card once you have a relationship — so every ~6 months you can re-apply for
          the Blue Business Plus or Blue Business Cash, <strong style={{ color: "#111" }}>reset the 0% clock, and grab a
          fresh welcome bonus</strong> without a hard inquiry. Second, most business cards do not report to your personal
          credit, so carrying a large balance during the float does not dent your score.
        </p>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0, padding: "12px 16px", background: "rgba(224,68,68,0.04)", border: "1px solid rgba(224,68,68,0.2)", borderRadius: 6 }}>
          <strong style={{ color: "#111" }}>Two exceptions to know:</strong> Capital One business cards report to
          personal credit (and no longer offer a 0% intro) — do not use them for this. And many small regional or
          credit-union business cards do not disclose their reporting — verify before you lean on one.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>The float stable (verified 0% on purchases, 2026)</h2>
        <div style={{ overflowX: "auto", border: "1px solid #f0f0f0", borderRadius: 10, background: "#fff", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                {["Card", "Earn", "0% Intro", "Bonus"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => (
                <tr key={c.card} style={{ background: i % 2 ? "#fafafa" : "#fff", borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111" }}>{c.card}</td>
                  <td style={{ padding: "11px 14px", color: "#555" }}>{c.earn}</td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0d7c5f", whiteSpace: "nowrap" }}>{c.intro}</td>
                  <td style={{ padding: "11px 14px", color: "#555" }}>{c.bonus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: "0 0 12px" }}>
          Want permanent category multipliers instead of rotating quarterly cards? Chase Ink Cash (5% office/internet/phone)
          and U.S. Bank Triple Cash (3%) are also on 0% float — they replace your Freedom/Discover quarters with categories
          that never rotate. Beyond these, a long tail of regional and credit-union business cards carry 0% windows you can
          stack on the end of the rotation — those earn little, but they keep the float going.
        </p>
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
          Always confirm the current 0% term and whether the card reports to personal credit before applying.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>Do not do this if…</h2>
        <ul style={{ fontSize: 15, color: "#555", lineHeight: 1.8, paddingLeft: 22, margin: 0 }}>
          <li>You cannot pay the balance in full before the 0% ends — the interest will erase everything.</li>
          <li>You do not have a high-yield savings account to hold the float.</li>
          <li>You carry credit-card debt or struggle to budget — this gives the bank money, not you.</li>
        </ul>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 20px" }}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "18px 0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>{f.q}</h3>
              <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, padding: "24px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Never miss a 0% deadline — Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Once you have four or five cards going, each with a different 0% end-date, you cannot track it in your head —
            and missing one means 25% interest in a single month. The free Stacks OS tracker watches every card&apos;s 0%
            window so you never miss one. Pro tells you which card to open next and the exact order to keep the float running.
          </p>
          <Link href="/stacksos" style={{ display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700, background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
            Try Stacks OS &rarr;
          </Link>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; All articles</Link>
          <Link href="/blog/business-bank-bonuses-no-business-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Business bank bonuses (20% APY) &rarr;</Link>
          <Link href="/blog/best-credit-cards-june-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best credit cards this month &rarr;</Link>
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
