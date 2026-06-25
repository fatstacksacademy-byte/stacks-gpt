import type { Metadata } from "next"
import Link from "next/link"
import SiteHeader from "../../components/SiteHeader"
import BusinessBonusUnlock from "../../components/BusinessBonusUnlock"
import { getBusinessBonuses, toBizBonusRows } from "../../../lib/data/bonusCategories"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const CANONICAL = `${BASE}/blog/business-bank-bonuses-no-business-2026`

export const metadata: Metadata = {
  title: "Business Bank Account Bonuses Without a Business: 20%+ APY (FDIC Insured)",
  description: "Business checking bonuses pay $300–$1,500 — and you do not need an LLC. As a sole proprietor you can earn the equivalent of 20%+ APY on FDIC-insured cash. Here is the 2026 playbook.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    title: "Business Bank Account Bonuses Without a Business: 20%+ APY (FDIC Insured)",
    description: "Business checking bonuses pay $300–$1,500, and you do not need an LLC. Earn the equivalent of 20%+ APY on FDIC-insured cash.",
    url: CANONICAL,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Business Bank Bonuses Without a Business (20%+ APY)" },
  keywords: [
    "business bank account bonus",
    "business bank bonus no business",
    "business checking bonus without LLC",
    "sole proprietor bank account bonus",
    "Chase business checking bonus",
    "Wells Fargo business checking bonus",
    "Bank of America business checking bonus",
    "best business bank bonuses 2026",
    "20% APY FDIC insured",
    "business bank bonus sole proprietor SSN",
  ],
}

const faqs = [
  { q: "Do I need an LLC to open a business bank account?", a: "No. Most banks let sole proprietors open business checking with just a Social Security number. An LLC or EIN is optional, not required." },
  { q: "Is this legal?", a: "Yes. Opening a business account as a legitimate sole proprietor and earning sign-up bonuses is standard practice. Fabricating a business or faking revenue on the application is not — and you do not need to, because legitimate side income already qualifies you." },
  { q: "How is a one-time bonus the same as 20% APY?", a: "A $400 bonus on a $2,000 deposit held about 90 days is roughly a 73% annualized return on that cash. No single account pays 20% forever, but rotating the same cash from one bonus to the next blends out to north of 20% — about 4 to 5 times a normal high-yield savings account." },
  { q: "Are these bonuses taxed?", a: "Bank bonuses are generally reported as interest income on a 1099-INT or 1099-MISC. Set aside a portion for taxes." },
  { q: "How often can I do this?", a: "Each bank has a cooldown, often 12 to 24 months, so you rotate across banks rather than repeating one. See our bank bonus cooldown guide for the full matrix." },
]

export default function BusinessBankBonusesNoBusiness() {
  const { nationwide, regional } = getBusinessBonuses()
  const freeRows = toBizBonusRows(nationwide)
  const gatedRows = toBizBonusRows(regional)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Business Bank Account Bonuses Without a Business: How to Earn 20%+ APY (FDIC Insured)",
        description: "Business checking bonuses pay $300–$1,500, you do not need an LLC, and as a sole proprietor you can earn the equivalent of 20%+ APY on FDIC-insured cash.",
        url: CANONICAL,
        datePublished: "2026-06-21",
        dateModified: "2026-06-23",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "Business Bank Bonuses Without a Business", item: CANONICAL },
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
          <span>Business Bank Bonuses Without a Business</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.12 }}>
          Business Bank Account Bonuses Without a Business: How to Earn 20%+ APY (FDIC Insured)
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated June 23, 2026
        </p>

        <p style={{ fontSize: 17, color: "#444", lineHeight: 1.7, margin: "0 0 16px" }}>
          Business checking accounts pay the biggest sign-up bonuses in banking — $300 to $1,500 — and you do
          <strong style={{ color: "#111" }}> not</strong> need an LLC, an EIN, or a registered company to claim them.
          If you have ever earned money on the side, the IRS already considers you a sole proprietor, and you can open
          most of these accounts with nothing but your Social Security number. Annualize those bonuses against the cash
          you park and the effective return clears <strong style={{ color: "#111" }}>20% APY — on FDIC-insured deposits.</strong>
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>Wait — how is a bank bonus &quot;20% APY&quot;?</h2>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
          A bonus is a one-time payout, but you can measure it like a yield. Put $2,000 into a Chase business checking
          account, hold it about 90 days, collect a $400 bonus, and that is a 20% return in three months — roughly
          <strong style={{ color: "#111" }}> 73% annualized</strong> on that cash. The deposit never leaves an FDIC-insured
          account, so there is no market risk to the principal.
        </p>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
          No single account pays 20% forever. But by moving the same pool of cash from one bonus to the next — Chase,
          then Bank of America, then Wells Fargo — your blended annual return lands north of 20%, about 4 to 5 times a
          normal high-yield savings account. The math is simply: bonus divided by deposit, times 365 divided by days held.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>&quot;But I don&apos;t have a business&quot;</h2>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 12px" }}>
          You almost certainly qualify already. <strong style={{ color: "#111" }}>You are a sole proprietor the moment
          you make money on the side</strong> — reselling on eBay or Facebook Marketplace, freelancing, driving for a
          gig app, tutoring, running a channel. That is a business of one, and you apply with your
          <strong style={{ color: "#111" }}> own SSN — no LLC, no EIN, no state paperwork</strong> at most banks.
        </p>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0, padding: "12px 16px", background: "#fff8ec", border: "1px solid #f5d899", borderRadius: 6 }}>
          <strong style={{ color: "#111" }}>One hard rule:</strong> never invent a business or fake revenue on an
          application. That is fraud. You do not need to — legitimate side income already makes you eligible.
          &quot;You qualify&quot; is true; &quot;make one up&quot; is illegal.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>The best business bank bonuses right now (June 2026)</h2>
        <BusinessBonusUnlock freeRows={freeRows} gatedRows={gatedRows} source="blog_business_bonuses" />
        <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 8px" }}>
          Always confirm the offer is live, net out any monthly fee, and check state eligibility before you apply.
        </p>

        <div style={{ marginTop: 16, padding: "16px 20px", background: "#fff8ec", border: "1px solid #f5d899", borderRadius: 8 }}>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "#111" }}>A bigger bonus is not a better rate.</strong> Many of these offers are
            tiered: Wells Fargo pays $400 for a $2,500 balance or $825 for $25,000, and Chase pays $450, $600, or $900 as
            you deposit more. The trap is that the <em>effective APY falls as the headline bonus climbs</em>, because the
            cash you have to park grows faster than the payout does. Wells Fargo&apos;s $400 entry tier annualizes north of
            80%, but its $825 tier is closer to 17% — and Chase&apos;s $450-on-$5k beats its $900-on-$15k on a pure return
            basis. That is why the table above ranks every offer by its entry tier. Reach for a higher tier only when you
            have idle cash that would otherwise sit in a sub-5% account: you pocket more total dollars, just at a lower
            rate per dollar.
          </p>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "32px 0 12px" }}>How to actually run it (without losing a bonus)</h2>
        <ol style={{ fontSize: 15, color: "#555", lineHeight: 1.8, paddingLeft: 22, margin: "0 0 12px" }}>
          <li>Confirm you qualify — any side income makes you a sole proprietor; apply with your SSN.</li>
          <li>Pick the offer with the best return for your cash and your state — not just the biggest dollar amount.</li>
          <li>Fund within the funding window and hold through the maintenance period (usually 60 to 90 days).</li>
          <li><strong style={{ color: "#111" }}>Track every deadline.</strong> Miss a maintenance date and you forfeit the whole bonus.</li>
          <li>When it pays, move the cash to the next one — that is how the blended 20%+ adds up.</li>
        </ol>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0 }}>
          The hard part is not finding the bonuses — it is the <strong style={{ color: "#111" }}>order</strong>. Your
          cash can only be in one place at a time, every bank has a different hold and cooldown, and a missed date costs
          you the entire payout.
        </p>

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
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Let the math run itself with Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            The free tracker pulls every current bonus and watches your funding windows and maintenance deadlines so
            you never forfeit one. Want the most profitable order for your specific cash and state? That is Stacks OS Pro.
          </p>
          <Link href="/stacksos" style={{ display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700, background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
            Try Stacks OS &rarr;
          </Link>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; All articles</Link>
          <Link href="/blog/business-card-0apr-float-strategy-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>The 0% APR float strategy &rarr;</Link>
          <Link href="/blog/bank-account-churning-waiting-periods" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Bonus cooldown matrix &rarr;</Link>
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
