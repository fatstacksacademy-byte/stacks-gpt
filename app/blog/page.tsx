import Link from "next/link"
import NewsletterCTA from "./components/NewsletterCTA"

const YT = "https://www.youtube.com/@nathanielbooth"

type Article = {
  href: string
  title: string
  description: string
  category: string
  date: string
  featured?: boolean
}

const articles: Article[] = [
  {
    href: "/blog/best-bank-bonuses-july-2026",
    title: "The Best Bank Bonuses for July 2026",
    description: "My top offers this month — including the Ally trick that doubles as your Bank of America direct deposit, FourLeaf's $550 multi-year payout, and the Wells Fargo Business bonus that expires July 7.",
    category: "Monthly Picks",
    date: "July 1, 2026",
  },
  {
    href: "/blog/best-bank-bonuses-june-2026",
    title: "The Best Bank Bonuses for June 2026",
    description: "My four favorite offers this month, ranked by value, difficulty, and how likely they are to stay available.",
    category: "Monthly Picks",
    date: "June 9, 2026",
  },
  {
    href: "/blog/best-credit-cards-june-2026",
    title: "Best Credit Cards for June 2026",
    description: "My top card picks this month, ranked by signup bonus value, spend requirements, and how well they pair with bank bonus sequencing.",
    category: "Monthly Picks",
    date: "June 16, 2026",
  },
  {
    href: "/blog/business-bank-bonuses-no-business-2026",
    title: "Business Bank Bonuses Without a Business (20%+ APY)",
    description: "Business checking pays the biggest bonuses in banking — and you don't need an LLC. As a sole proprietor you can earn the equivalent of 20%+ APY on FDIC-insured cash.",
    category: "Business Strategy",
    date: "June 21, 2026",
  },
  {
    href: "/blog/business-card-0apr-float-strategy-2026",
    title: "The 0% APR Float Strategy (7% Back on Everything)",
    description: "A handful of business cards earn strong rewards AND give 0% APR for 12 months. Float your spending, keep your cash earning, and net about 7% back on everything.",
    category: "Business Strategy",
    date: "June 21, 2026",
  },
  {
    href: "/blog/what-is-early-direct-deposit",
    title: "What Is Early Direct Deposit?",
    description: "How banks release paychecks early, which accounts support it, and how it fits into a bonus strategy.",
    category: "Paycheck Strategy",
    date: "May 11, 2026",
  },
  {
    href: "/blog/bank-account-churning-waiting-periods",
    title: "Bank Bonus Cooldown Periods",
    description: "A practical guide to when you can reopen accounts and qualify for the same bonus again.",
    category: "Churning Strategy",
    date: "May 11, 2026",
  },
  {
    href: "/blog/bank-bonuses-without-direct-deposit",
    title: "Bank Bonuses Without Direct Deposit",
    description: "The best paths for self-employed, retired, or between-job bonus seekers who cannot route payroll.",
    category: "Bonus Strategy",
    date: "May 11, 2026",
  },
  {
    href: "/blog/what-counts-as-direct-deposit",
    title: "What Counts as Direct Deposit?",
    description: "Employer payroll, ACH pushes, government benefits, and the methods banks actually recognize.",
    category: "Direct Deposit",
    date: "April 16, 2026",
  },
  {
    href: "/blog/chexsystems-guide-bank-bonuses",
    title: "ChexSystems Explained",
    description: "What banks see when you apply, which institutions are sensitive, and what to do after a denial.",
    category: "Eligibility",
    date: "April 16, 2026",
  },
  {
    href: "/blog/bank-bonus-tax-guide-2026",
    title: "The 2026 Bank Bonus Tax Guide",
    description: "How bank bonuses are reported, what 1099 forms mean, and how to prepare before tax season.",
    category: "Taxes",
    date: "April 16, 2026",
  },
]

// Sort newest-first so the blog always features the most recently published
// article — not a pinned monthly post. An explicit `featured: true` still
// wins if we ever want to hand-pin one; otherwise the newest article leads.
const byDateDesc = [...articles].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
)
const featured = byDateDesc.find(article => article.featured) ?? byDateDesc[0]
const guides = byDateDesc.filter(article => article !== featured)

export default function BlogIndex() {
  return (
    <>
      <style>{`
        .blog-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .blog-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.07); border-color: #cce8df !important; }
        .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .blog-feature { display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 32px; }
        .blog-find-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 850px) {
          .blog-grid { grid-template-columns: repeat(2, 1fr); }
          .blog-feature { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .blog-grid, .blog-find-grid { grid-template-columns: 1fr; }
          .blog-nav-secondary { display: none; }
          .blog-hero-title { font-size: 38px !important; }
        }
      `}</style>

      <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
            Fat Stacks Academy
          </Link>
          <nav style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <Link href="/bank-bonuses-by-state" className="blog-nav-secondary" style={{ fontSize: 13, color: "#777", textDecoration: "none" }}>Find Bonuses</Link>
            <Link href="/bonuses" className="blog-nav-secondary" style={{ fontSize: 13, color: "#777", textDecoration: "none" }}>All Offers</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 700 }}>Blog</Link>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#fff", background: "#0d7c5f", padding: "8px 12px", borderRadius: 7, textDecoration: "none", fontWeight: 700 }}>Stacks OS</Link>
          </nav>
        </div>
      </header>

      <main>
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "76px 24px 42px" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 16 }}>Fat Stacks Academy Blog</div>
            <h1 className="blog-hero-title" style={{ fontSize: 50, fontWeight: 850, color: "#111", letterSpacing: "-0.04em", margin: "0 0 18px", lineHeight: 1.06 }}>
              Practical strategy for earning more from the money you already move.
            </h1>
            <p style={{ fontSize: 17, color: "#666", margin: 0, maxWidth: 680, lineHeight: 1.7 }}>
              Original guides on bank bonuses, direct deposit, eligibility, taxes, and building a sustainable churning system—without spending hours researching it yourself.
            </p>
          </div>
        </section>

        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 58px" }}>
          <Link href={featured.href} style={{ textDecoration: "none" }}>
            <article className="blog-card blog-feature" style={{ background: "linear-gradient(135deg, #eaf8f3 0%, #fff 70%)", border: "1px solid #cce8df", borderRadius: 18, padding: "38px", alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Featured · {featured.category}</div>
                <h2 style={{ fontSize: 34, fontWeight: 850, color: "#111", letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 0 14px" }}>{featured.title}</h2>
                <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, margin: 0, maxWidth: 650 }}>{featured.description}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: 12, color: "#888" }}>{featured.date}</span>
                <span style={{ fontSize: 14, color: "#fff", background: "#0d7c5f", borderRadius: 8, padding: "11px 17px", fontWeight: 750 }}>{featured.category === "Monthly Picks" ? "Read the latest picks →" : "Read the article →"}</span>
              </div>
            </article>
          </Link>
        </section>

        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 64px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
            <h2 style={{ fontSize: 25, fontWeight: 800, color: "#111", margin: 0, letterSpacing: "-0.02em" }}>Latest guides</h2>
            <span style={{ fontSize: 13, color: "#999" }}>Written by Nathaniel Booth</span>
          </div>
          <div className="blog-grid">
            {guides.map(article => (
              <Link key={article.href} href={article.href} style={{ textDecoration: "none" }}>
                <article className="blog-card" style={{ height: "100%", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 11, fontWeight: 750, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{article.category}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", lineHeight: 1.25, letterSpacing: "-0.02em", margin: "0 0 10px" }}>{article.title}</h3>
                  <p style={{ fontSize: 13, color: "#777", lineHeight: 1.65, margin: "0 0 22px", flex: 1 }}>{article.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{article.date}</span>
                    <span style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 700 }}>Read guide →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ background: "#f7f8f7", borderTop: "1px solid #edf0ee", borderBottom: "1px solid #edf0ee" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "54px 24px" }}>
            <div style={{ maxWidth: 620, marginBottom: 24 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Looking for an offer?</h2>
              <p style={{ fontSize: 14, color: "#777", lineHeight: 1.65, margin: 0 }}>The blog explains the strategy. The bonus finder helps you choose what to do next.</p>
            </div>
            <div className="blog-find-grid">
              <Link href="/bank-bonuses-by-state" className="blog-card" style={{ background: "#fff", border: "1px solid #e4e7e5", borderRadius: 14, padding: "24px", textDecoration: "none" }}>
                <div style={{ fontSize: 18, color: "#111", fontWeight: 800, marginBottom: 7 }}>Find bonuses in your state</div>
                <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6 }}>See ten relevant bank and brokerage offers at a time, including regional opportunities. <span style={{ color: "#0d7c5f", fontWeight: 700 }}>Start here →</span></div>
              </Link>
              <Link href="/bonuses" className="blog-card" style={{ background: "#fff", border: "1px solid #e4e7e5", borderRadius: 14, padding: "24px", textDecoration: "none" }}>
                <div style={{ fontSize: 18, color: "#111", fontWeight: 800, marginBottom: 7 }}>Search the full bonus catalog</div>
                <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6 }}>Filter every tracked checking, savings, brokerage, business, and credit card offer. <span style={{ color: "#0d7c5f", fontWeight: 700 }}>Browse offers →</span></div>
              </Link>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 620, margin: "0 auto", padding: "56px 24px" }}>
          <NewsletterCTA />
        </section>
      </main>

      <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Home</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>YouTube</a>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
