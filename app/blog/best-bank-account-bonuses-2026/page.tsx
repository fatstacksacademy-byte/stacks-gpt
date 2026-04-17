import type { Metadata } from "next"
import Link from "next/link"
import { blogPosts, getCheckingBonusById, getSavingsBonusById } from "../../../lib/data/blogPosts"
import { blogContent } from "../../../lib/data/blogContent"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

export const metadata: Metadata = {
  title: "Best Bank Account Bonuses of 2026 (Complete List) - Fat Stacks Academy",
  description: "The complete list of the best bank account bonuses available in April 2026. Checking bonuses up to $600, savings bonuses with 16%+ effective APY. Requirements, eligibility, and strategy for every offer.",
  alternates: { canonical: `${BASE}/blog/best-bank-account-bonuses-2026` },
  keywords: [
    "best bank account bonuses", "best bank bonuses 2026", "bank account bonus",
    "checking account bonus", "savings account bonus", "bank bonus list",
    "bank promotions 2026", "best checking bonus", "best savings bonus",
    "bank sign up bonus", "new bank account bonus", "bank bonus offers",
  ],
  openGraph: {
    type: "article",
    title: "Best Bank Account Bonuses of 2026 (Complete List)",
    description: "The complete list of the best bank account bonuses for April 2026. Every offer reviewed with requirements, eligibility, and strategy.",
    url: `${BASE}/blog/best-bank-account-bonuses-2026`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Best Bank Account Bonuses of 2026 (Complete List)" },
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

export default function BestBankBonuses() {
  const checkingPosts = blogPosts.filter(p => p.bonusType === "checking")
  const savingsPosts = blogPosts.filter(p => p.bonusType === "savings")

  const checkingSorted = checkingPosts
    .map(p => ({ post: p, bonus: getCheckingBonusById(p.bonusId) }))
    .filter(x => x.bonus)
    .sort((a, b) => (b.bonus!.bonus_amount || 0) - (a.bonus!.bonus_amount || 0))

  const savingsSorted = savingsPosts
    .map(p => ({ post: p, bonus: getSavingsBonusById(p.bonusId) }))
    .filter(x => x.bonus)
    .sort((a, b) => {
      const aB = a.bonus!, bB = b.bonus!
      const aT = aB.tiers[0], bT = bB.tiers[0]
      const aI = aT.min_deposit * aB.base_apy * (aB.total_hold_days / 365)
      const bI = bT.min_deposit * bB.base_apy * (bB.total_hold_days / 365)
      const aE = ((aT.bonus_amount + aI) / aT.min_deposit) * (365 / aB.total_hold_days)
      const bE = ((bT.bonus_amount + bI) / bT.min_deposit) * (365 / bB.total_hold_days)
      return bE - aE
    })

  const totalChecking = checkingSorted.reduce((s, x) => s + (x.bonus!.bonus_amount || 0), 0)
  const totalCount = checkingSorted.length + savingsSorted.length

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Best Bank Account Bonuses of 2026 (Complete List)",
        description: `Complete ranked list of ${totalCount} bank account bonuses available in 2026, including checking and savings offers.`,
        url: `${BASE}/blog/best-bank-account-bonuses-2026`,
        datePublished: "2026-04-10",
        dateModified: new Date().toISOString().split("T")[0],
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "Best Bank Account Bonuses 2026", item: `${BASE}/blog/best-bank-account-bonuses-2026` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "How much can you make from bank bonuses in 2026?", acceptedAnswer: { "@type": "Answer", text: "An active bonus churner can realistically earn $3,000-$5,000+ per year from checking and savings account bonuses. The amount depends on your paycheck size, available savings capital, and how many bonuses you pursue simultaneously." } },
          { "@type": "Question", name: "Do bank bonuses affect your credit score?", acceptedAnswer: { "@type": "Answer", text: "Most checking and savings account bonuses do NOT affect your credit score. Banks typically perform a soft pull or ChexSystems inquiry, neither of which impacts your FICO score. A few banks may do a hard pull — these are flagged in our reviews." } },
          { "@type": "Question", name: "Are bank bonuses taxable?", acceptedAnswer: { "@type": "Answer", text: "Yes. Bank bonuses are considered taxable income and are typically reported on a 1099-INT or 1099-MISC form. The bank will send you the form if your bonus exceeds $10 in a calendar year. You should report this income on your tax return." } },
          { "@type": "Question", name: "What is the best bank bonus right now?", acceptedAnswer: { "@type": "Answer", text: "As of April 2026, the best checking bonus is BMO at $600 (for $8,000 in direct deposits) and the best savings bonus is Chase at $600 on a $15,000 deposit (16.2% effective APY). For beginners, Chase Total Checking ($400 with just $1,000 DD) is the best starting point." } },
          { "@type": "Question", name: "How many bank bonuses can you do at once?", acceptedAnswer: { "@type": "Answer", text: "There is no legal limit. Most people work on 2-4 bonuses simultaneously by splitting their direct deposit across multiple banks. The main constraint is your paycheck size and the direct deposit requirements of each bonus." } },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .hub-table { width: 100%; border-collapse: collapse; }
        .hub-table th { text-align: left; padding: 10px 12px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #e8e8e8; }
        .hub-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .hub-table tr:hover { background: rgba(13,124,95,0.03); }
        .hub-row-link { color: inherit; text-decoration: none; }
        @media (max-width: 700px) {
          .hub-table th:nth-child(3), .hub-table td:nth-child(3),
          .hub-table th:nth-child(4), .hub-table td:nth-child(4),
          .hub-table th:nth-child(5), .hub-table td:nth-child(5) { display: none; }
        }
      `}</style>

      <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none" }}>Fat Stacks Academy</Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/blog/best-bank-account-bonuses-2026" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>All Bonuses</Link>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Checking</Link>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Savings</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Reviews</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>Best Bank Account Bonuses 2026</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          Best Bank Account Bonuses of 2026
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Last updated April 10, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "16px 0", maxWidth: 700 }}>
          This is the complete list of every bank account bonus worth doing right now — {totalCount} offers across checking and savings accounts.
          Every bonus has been reviewed for requirements, eligibility, fees, and ChexSystems sensitivity.
          The list is ranked by bonus value for checking and effective APY for savings.
        </p>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "24px 0 40px" }}>
          {[
            { label: "Total Bonuses", value: String(totalCount) },
            { label: "Checking Offers", value: String(checkingSorted.length) },
            { label: "Savings Offers", value: String(savingsSorted.length) },
            { label: "Highest Bonus", value: "$600" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "16px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0d7c5f" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table of Contents */}
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>Table of Contents</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="#checking-bonuses" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}>1. Best Checking Account Bonuses ({checkingSorted.length} offers)</a>
            <a href="#savings-bonuses" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}>2. Best Savings Account Bonuses ({savingsSorted.length} offers)</a>
            <a href="#how-it-works" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}>3. How Bank Bonuses Work</a>
            <a href="#getting-started" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}>4. How to Get Started</a>
            <a href="#faq" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}>5. Frequently Asked Questions</a>
          </div>
        </div>

        {/* ── CHECKING TABLE ── */}
        <div id="checking-bonuses" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>Best Checking Account Bonuses</h2>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 20px" }}>
            {checkingSorted.length} checking bonuses ranked by bonus amount. All require a direct deposit.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="hub-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Bank</th>
                  <th>Bonus</th>
                  <th>DD Required</th>
                  <th>Window</th>
                  <th>Monthly Fee</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {checkingSorted.map(({ post, bonus }, i) => {
                  const b = bonus!
                  const req = b.requirements || {}
                  const fees = b.fees || {}
                  return (
                    <tr key={post.slug}>
                      <td style={{ color: i < 3 ? "#0d7c5f" : "#bbb", fontWeight: 700 }}>{i + 1}</td>
                      <td>
                        <Link href={`/blog/${post.slug}`} style={{ color: "#111", textDecoration: "none", fontWeight: 600 }}>
                          {b.bank_name?.split("(")[0].trim()}
                        </Link>
                      </td>
                      <td style={{ color: "#0d7c5f", fontWeight: 700 }}>{money(b.bonus_amount)}</td>
                      <td style={{ color: "#666" }}>{req.min_direct_deposit_total ? money(req.min_direct_deposit_total) : "Yes"}</td>
                      <td style={{ color: "#999" }}>{req.deposit_window_days ? `${req.deposit_window_days}d` : "—"}</td>
                      <td style={{ color: fees.monthly_fee === 0 ? "#0d7c5f" : "#ff6b6b" }}>{fees.monthly_fee === 0 ? "$0" : fees.monthly_fee != null ? `$${fees.monthly_fee}` : "—"}</td>
                      <td><Link href={`/blog/${post.slug}`} style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none" }}>Review</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
              See full checking bonus rankings with strategy tips &rarr;
            </Link>
          </div>
        </div>

        {/* ── SAVINGS TABLE ── */}
        <div id="savings-bonuses" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>Best Savings Account Bonuses</h2>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 20px" }}>
            {savingsSorted.length} savings bonuses ranked by effective APY (bonus + interest over the holding period).
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="hub-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Bank</th>
                  <th>Bonus</th>
                  <th>Min Deposit</th>
                  <th>Hold</th>
                  <th>Base APY</th>
                  <th>Eff. APY</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {savingsSorted.map(({ post, bonus }, i) => {
                  const b = bonus!
                  const t = b.tiers[0]
                  const interest = t.min_deposit * b.base_apy * (b.total_hold_days / 365)
                  const effApy = (((t.bonus_amount + interest) / t.min_deposit) * (365 / b.total_hold_days) * 100).toFixed(1)
                  return (
                    <tr key={post.slug}>
                      <td style={{ color: i < 3 ? "#0d7c5f" : "#bbb", fontWeight: 700 }}>{i + 1}</td>
                      <td>
                        <Link href={`/blog/${post.slug}`} style={{ color: "#111", textDecoration: "none", fontWeight: 600 }}>
                          {b.bank_name.split("(")[0].trim()}
                        </Link>
                      </td>
                      <td style={{ color: "#0d7c5f", fontWeight: 700 }}>{money(t.bonus_amount)}</td>
                      <td style={{ color: "#666" }}>{money(t.min_deposit)}</td>
                      <td style={{ color: "#999" }}>{b.total_hold_days}d</td>
                      <td style={{ color: "#999" }}>{(b.base_apy * 100).toFixed(2)}%</td>
                      <td style={{ color: "#0d7c5f", fontWeight: 700 }}>{effApy}%</td>
                      <td><Link href={`/blog/${post.slug}`} style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none" }}>Review</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
              See full savings bonus rankings with effective APY analysis &rarr;
            </Link>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div id="how-it-works" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 16px" }}>How Bank Bonuses Work</h2>
          <div style={{ fontSize: 15, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 16px" }}>
              Banks pay cash bonuses to attract new customers. The typical checking bonus requires you to open a new account and set up direct deposit from your employer. After your paycheck hits the account a few times, the bank deposits the bonus — usually $300-$600 in cash.
            </p>
            <p style={{ margin: "0 0 16px" }}>
              <strong style={{ color: "#111" }}>Checking bonuses</strong> use your direct deposit (paycheck). You temporarily route your paycheck to a new bank, meet the deposit requirement in 60-90 days, collect the bonus, and move to the next bank. Your paycheck does the work — no extra money needed.
            </p>
            <p style={{ margin: "0 0 16px" }}>
              <strong style={{ color: "#111" }}>Savings bonuses</strong> require parking a lump sum (typically $15,000-$100,000) for 90-180 days. The bank pays a cash bonus on top of the base interest rate. The key metric is <strong style={{ color: "#0d7c5f" }}>effective APY</strong> — the total return (bonus + interest) annualized over the holding period.
            </p>
            <p style={{ margin: "0 0 16px" }}>
              <strong style={{ color: "#111" }}>Most bonuses don{"'"}t affect your credit score.</strong> Banks typically perform a soft pull or ChexSystems inquiry when you open a checking/savings account. Neither impacts your FICO score. We flag the rare exceptions in each review.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Bank bonuses are taxable income.</strong> Banks report bonuses over $10 on a 1099-INT or 1099-MISC form. You{"'"}ll owe income tax on the bonus amount at your marginal rate. A $400 bonus might net you $280-$340 after taxes, depending on your bracket.
            </p>
          </div>
        </div>

        {/* ── GETTING STARTED ── */}
        <div id="getting-started" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 16px" }}>How to Get Started</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { step: "1", title: "Start with Chase ($400)", desc: "The Chase Total Checking bonus has the simplest requirements ($1,000 direct deposit in 90 days) and the fastest payout (~15 days). It's the best first bonus for most people." },
              { step: "2", title: "Split your direct deposit", desc: "Most employers let you send portions of your paycheck to different accounts. Route the minimum required to each bonus bank and keep the rest at your primary bank." },
              { step: "3", title: "Track your progress", desc: "Use Stacks OS to track which bonuses you're working on, what's due next, and your total earnings. It builds a personalized sequence based on your paycheck." },
              { step: "4", title: "Rotate to the next bonus", desc: "Once a bonus posts, move your direct deposit to the next bank on your list. Most people can complete 6-12 bonuses per year, earning $3,000-$5,000+." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 16, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e6f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0d7c5f" }}>{item.step}</span>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: "#999", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STACKS OS CTA ── */}
        <div style={{ background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)", border: "1px solid #a7f3d0", borderRadius: 16, padding: "32px", marginBottom: 48, textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 8 }}>Stop tracking bonuses in a spreadsheet</div>
          <p style={{ fontSize: 15, color: "#999", marginBottom: 20, maxWidth: 500, margin: "0 auto 20px" }}>
            Stacks OS builds a personalized bonus sequence based on your paycheck, tracks your progress, and tells you exactly what to do next.
          </p>
          <Link href="/stacksos" style={{
            display: "inline-block", padding: "14px 32px", fontSize: 15, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 10, textDecoration: "none",
          }}>
            See your projected earnings &rarr;
          </Link>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 12 }}>$5/month or $50/year. Most first bonuses are $300-$400.</div>
        </div>

        {/* ── FAQ ── */}
        <div id="faq" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111", margin: "0 0 20px" }}>Frequently Asked Questions</h2>
          {[
            { q: "How much can you make from bank bonuses in 2026?", a: "An active bonus churner can realistically earn $3,000-$5,000+ per year from checking and savings account bonuses. The amount depends on your paycheck size, available savings capital, and how many bonuses you pursue simultaneously. Some power users report $10,000-$15,000+ annually." },
            { q: "Do bank bonuses affect your credit score?", a: "Most checking and savings account bonuses do NOT affect your credit score. Banks typically perform a soft pull or ChexSystems inquiry, neither of which impacts your FICO score. A few banks may do a hard pull — these are flagged in our individual reviews." },
            { q: "Are bank bonuses taxable?", a: "Yes. Bank bonuses are considered taxable income and are typically reported on a 1099-INT or 1099-MISC form. The bank will send you the form if your bonus exceeds $10 in a calendar year. You should report this income on your federal and state tax return." },
            { q: "What is the best bank bonus right now?", a: "As of April 2026, the best checking bonus by amount is BMO at $600 (for $8,000 in direct deposits). For beginners, Chase Total Checking ($400 with just $1,000 DD) is the best starting point due to simple requirements and fast payout. For savings, Chase offers $600 on a $15,000 deposit with a 16.2% effective APY." },
            { q: "How many bank bonuses can you do at once?", a: "There is no legal limit. Most people work on 2-4 checking bonuses simultaneously by splitting their direct deposit across multiple banks. For savings bonuses, you can run as many as your available capital allows — each requires a separate deposit." },
            { q: "Will opening multiple bank accounts hurt my credit?", a: "Generally no. Most banks do a soft pull or ChexSystems check for checking/savings accounts, which doesn't affect your credit score. However, opening many accounts in a short period may flag your ChexSystems report, which some banks check. Spacing out applications (2-3 per month) is a safe approach." },
            { q: "What is ChexSystems?", a: "ChexSystems is a consumer reporting agency that tracks your banking history — similar to how credit bureaus track your credit history. Banks check your ChexSystems report when you apply for a new account. Having negative items (unpaid overdrafts, closed accounts with balances owed) can lead to denials. Normal bonus churning activity does not create negative ChexSystems records." },
            { q: "Do I need a big paycheck to do bank bonuses?", a: "No. Many bonuses have low direct deposit requirements. Chase requires just $1,000 total, Chime requires $200, and Varo requires $500. If you earn at least $1,500/month (before taxes), you can qualify for most checking bonuses by routing your full paycheck or splitting it." },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>{faq.q}</h3>
              <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
            </div>
          ))}
        </div>

        {/* YouTube CTA */}
        <div style={{ padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12, marginBottom: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: Bank Bonus Strategies on YouTube</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel covers the best bank bonuses, direct deposit strategies, and savings optimization weekly on his YouTube channel.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#ff0000", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; All reviews</Link>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best checking bonuses</Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best savings bonuses</Link>
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
        <p style={{ fontSize: 11, color: "#ccc", marginTop: 16, lineHeight: 1.6 }}>
          Bonus offers, requirements, and fees are determined by each financial institution and may change at any time. Always verify the current terms directly with the bank before applying. This content is for informational purposes only and does not constitute financial advice.
        </p>
      </footer>
    </>
  )
}
