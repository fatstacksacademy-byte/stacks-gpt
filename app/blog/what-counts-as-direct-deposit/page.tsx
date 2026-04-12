import type { Metadata } from "next"
import Link from "next/link"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const SLUG = "what-counts-as-direct-deposit"
const TITLE = "What Counts as a Direct Deposit for Bank Bonuses? (2026 Guide)"
const DESC = "Complete guide to what counts as a direct deposit for bank bonuses. Per-bank breakdown for Chase, Citi, SoFi, Wells Fargo, and more. Learn which ACH transfers trigger bonus credit and common workarounds."

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "what counts as direct deposit",
    "direct deposit for bank bonus",
    "fake direct deposit",
    "ACH vs direct deposit",
    "direct deposit workaround",
    "what triggers direct deposit for bank bonus",
    "bank bonus direct deposit requirements",
  ],
  alternates: { canonical: `${BASE}/blog/${SLUG}` },
  openGraph: {
    type: "article",
    title: TITLE,
    description: DESC,
    url: `${BASE}/blog/${SLUG}`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: TITLE },
}

const faqItems = [
  {
    q: "Does Zelle count as a direct deposit?",
    a: "At most banks, Zelle does NOT count as a direct deposit. The major exception is Citi, which explicitly includes Zelle incoming transfers as part of their Enhanced Direct Deposit (EDD) requirement. At Chase, Wells Fargo, U.S. Bank, and most others, Zelle transfers will not trigger the direct deposit requirement.",
  },
  {
    q: "Can I use a transfer from another bank as a direct deposit?",
    a: "It depends on the bank. Some banks like SoFi and Chime accept most incoming ACH transfers as direct deposits, even if they are not payroll. Other banks like Chase specifically require payroll, pension, or government benefit deposits. Pushing an ACH transfer from a brokerage like Fidelity or Schwab works at many banks but not all.",
  },
  {
    q: "What is the difference between ACH and direct deposit?",
    a: "Direct deposit is a specific type of ACH transaction. All direct deposits are ACH transfers, but not all ACH transfers are direct deposits. A direct deposit is typically classified as an ACH credit with a specific SEC code like PPD (Prearranged Payment and Deposit) for payroll. Some banks only accept PPD-coded ACH, while others accept any incoming ACH credit.",
  },
  {
    q: "Does PayPal or Venmo count as a direct deposit?",
    a: "At Citi, yes. Citi explicitly includes P2P ACH transfers from Venmo and PayPal as qualifying Enhanced Direct Deposits. At most other banks, PayPal and Venmo transfers do not count. Some fintech banks like SoFi and Chime may accept them since they tend to count any incoming ACH, but results are inconsistent.",
  },
  {
    q: "How long does a direct deposit take to post for a bank bonus?",
    a: "Most ACH direct deposits take 1-2 business days to post. Some banks offer same-day ACH processing. Once the qualifying deposit posts, the bonus evaluation period begins. For example, Chase credits the bonus within about 15 business days after the direct deposit requirement is met.",
  },
  {
    q: "Can I split my direct deposit to work on multiple bank bonuses at once?",
    a: "Yes. Most employers allow you to split your paycheck across multiple bank accounts. This is one of the most effective strategies for bank bonus churning. You can send a portion of your paycheck to each bank where you are working on a bonus, as long as each portion meets that bank's minimum direct deposit requirement.",
  },
  {
    q: "What happens if my direct deposit does not trigger the bonus?",
    a: "If your deposit is not recognized as a qualifying direct deposit, contact the bank. Some banks will manually review and credit the bonus if you can provide proof of a payroll deposit. Keep records of all deposits including transaction confirmations and pay stubs. If the bank will not budge, you may need to set up a true payroll direct deposit and try again within the bonus window.",
  },
  {
    q: "Does a wire transfer count as a direct deposit?",
    a: "No. Wire transfers are processed through a different system (Fedwire) than ACH direct deposits. No major bank counts wire transfers as qualifying direct deposits for bonus purposes. You must use ACH or, in some cases, RTP or FedNow to satisfy direct deposit requirements.",
  },
]

export default function WhatCountsAsDirectDeposit() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: TITLE,
        description: DESC,
        url: `${BASE}/blog/${SLUG}`,
        datePublished: "2026-04-10",
        dateModified: "2026-04-10",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
        mainEntityOfPage: `${BASE}/blog/${SLUG}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "What Counts as Direct Deposit", item: `${BASE}/blog/${SLUG}` },
        ],
      },
    ],
  }

  const sectionHeading: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    margin: "48px 0 16px",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  }
  const subHeading: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    margin: "32px 0 12px",
    lineHeight: 1.3,
  }
  const para: React.CSSProperties = {
    fontSize: 15,
    color: "#ccc",
    lineHeight: 1.8,
    margin: "0 0 16px",
    maxWidth: 680,
  }
  const listItem: React.CSSProperties = {
    fontSize: 15,
    color: "#ccc",
    lineHeight: 1.8,
    margin: "0 0 8px",
    paddingLeft: 8,
  }
  const bankCard: React.CSSProperties = {
    padding: "20px 24px",
    borderBottom: "1px solid #1a1a1a",
  }
  const bankName: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 6,
  }
  const bankDetail: React.CSSProperties = {
    fontSize: 14,
    color: "#999",
    lineHeight: 1.7,
    margin: 0,
  }
  const highlight: React.CSSProperties = {
    color: "#88e06d",
    fontWeight: 600,
  }
  const warning: React.CSSProperties = {
    color: "#ff6b6b",
    fontWeight: 600,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#fff", textDecoration: "none" }}>Fat Stacks Academy</Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Checking</Link>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Savings</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>All Reviews</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#88e06d", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>What Counts as Direct Deposit</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          What Counts as a Direct Deposit for Bank Bonuses?
        </h1>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#88e06d", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 10, 2026
        </p>
        <p style={{ fontSize: 16, color: "#ccc", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 650 }}>
          The single most common reason people fail to earn a bank bonus is that their deposit did not qualify as a &quot;direct deposit.&quot; Every bank defines this term differently, and the fine print is often vague. This guide breaks down exactly what counts at each major bank so you can get your bonus with confidence.
        </p>
        <p style={para}>
          Whether you are working on your first Chase bonus or optimizing a multi-bank strategy, understanding direct deposit rules is essential. Below you will find a technical explanation of how direct deposits work, a per-bank breakdown of what triggers credit, proven workarounds, and what definitely does not count.
        </p>

        {/* --- Section: What Is a Direct Deposit --- */}
        <h2 style={sectionHeading}>What Is a Direct Deposit, Technically?</h2>
        <p style={para}>
          A direct deposit is an electronic transfer of funds into a bank account via the Automated Clearing House (ACH) network. When your employer pays you, they initiate an ACH credit transaction that moves money from their bank account directly into yours. This transaction carries a Standard Entry Class (SEC) code that identifies its type.
        </p>
        <p style={para}>
          The most common SEC code for payroll is <strong style={{ color: "#fff" }}>PPD (Prearranged Payment and Deposit)</strong>. This is what your employer sends when you set up direct deposit through your HR or payroll system. Government benefits like Social Security and tax refunds also use PPD codes. Some banks look specifically for PPD-coded transactions when evaluating direct deposit requirements.
        </p>
        <p style={para}>
          However, when you push money from one bank to another (like transferring from Fidelity to Chase), that transfer typically uses a <strong style={{ color: "#fff" }}>CCD (Cash Concentration or Disbursement)</strong> or <strong style={{ color: "#fff" }}>WEB (Internet-Initiated Entry)</strong> SEC code. Whether a bank counts these non-payroll ACH credits as &quot;direct deposits&quot; varies significantly.
        </p>
        <p style={para}>
          In addition to traditional ACH, some banks now accept deposits via <strong style={{ color: "#fff" }}>RTP (Real-Time Payments)</strong> and <strong style={{ color: "#fff" }}>FedNow</strong>, which are newer instant payment rails. Chase, for example, explicitly states that payroll received via ACH, RTP, or FedNow qualifies.
        </p>

        {/* --- Section: Why Banks Require DD --- */}
        <h2 style={sectionHeading}>Why Do Banks Require Direct Deposit for Bonuses?</h2>
        <p style={para}>
          Banks offer bonuses to acquire new customers, but they want customers who will actually use the account. A direct deposit requirement ensures you are routing meaningful income through the account, making it more likely you will use the bank for everyday transactions, maintain a balance, and generate revenue for the bank through interchange fees and deposit funding.
        </p>
        <p style={para}>
          From the bank&apos;s perspective, a customer who sets up payroll direct deposit is far more valuable than someone who opens an account, collects the bonus, and closes it. That is why most bonuses require direct deposit specifically rather than just any deposit. Some banks have gotten stricter over time, while others (particularly fintechs) keep their definitions broad to maximize account openings.
        </p>

        {/* --- Section: Per-Bank Breakdown --- */}
        <h2 style={sectionHeading}>Per-Bank Breakdown: What Triggers Direct Deposit Credit</h2>
        <p style={para}>
          Below is a detailed breakdown of what each major bank accepts as a qualifying direct deposit for their current bonus offers. This information is based on official terms, data points from the bank bonus community, and our own testing.
        </p>

        <div style={{ border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
          {/* Chase */}
          <div style={bankCard}>
            <div style={bankName}>Chase ($400 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Payroll, pension, or government benefits deposited via ACH, RTP, or FedNow. Visa and Mastercard debit network deposits also qualify.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Zelle transfers, cash deposits, mobile check deposits, wire transfers, interest payments, and micro-deposits. Person-to-person transfers and bank-to-bank ACH pushes generally do not work unless they carry a payroll SEC code.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> $1,000 total direct deposits within 90 days of coupon enrollment. Chase is one of the stricter banks. Stick with actual payroll for the most reliable results.
            </p>
          </div>

          {/* Citi */}
          <div style={bankCard}>
            <div style={bankName}>Citi ($325 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Citi uses &quot;Enhanced Direct Deposit&quot; (EDD), which is one of the broadest definitions available. Payroll ACH, government benefits, <strong style={{ color: "#fff" }}>Zelle incoming transfers</strong>, and <strong style={{ color: "#fff" }}>P2P ACH from Venmo and PayPal</strong> all qualify.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Instant transfers from Venmo/PayPal (must be standard ACH speed), wire transfers, cash deposits, check deposits, and Citi-to-Citi internal transfers.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> 2 EDD deposits totaling $3,000+ within 90 days. Citi is the easiest major bank to satisfy because Zelle and Venmo/PayPal ACH transfers count.
            </p>
          </div>

          {/* SoFi */}
          <div style={bankCard}>
            <div style={bankName}>SoFi ($400 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> SoFi accepts most incoming ACH transfers as direct deposits. Payroll, employer deposits, government benefits, and ACH pushes from other banks and brokerages have all been reported as triggering the bonus. SoFi is widely considered one of the most lenient banks for direct deposit definitions.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Wire transfers and internal SoFi-to-SoFi transfers do not count. Some P2P transfers may not trigger the requirement depending on how they are coded.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> $5,000 total direct deposits within a 25-day evaluation window. Despite the lenient definition, the short window and high dollar amount make this one time-sensitive.
            </p>
          </div>

          {/* Wells Fargo */}
          <div style={bankCard}>
            <div style={bankName}>Wells Fargo ($400 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Wells Fargo uses the term &quot;qualifying electronic deposits&quot; rather than strict direct deposit. Payroll, pension, government benefits, and some employer-initiated ACH deposits qualify. Data points suggest that ACH pushes from some brokerages and banks may also trigger the requirement.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Zelle transfers, wire transfers, ATM deposits, and internal Wells Fargo transfers do not qualify. The terms are somewhat vague, so payroll is the safest option.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> $1,000+ in qualifying electronic deposits within 90 days of account opening.
            </p>
          </div>

          {/* U.S. Bank */}
          <div style={bankCard}>
            <div style={bankName}>U.S. Bank ($450 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> ACH payroll and government benefit deposits qualify. U.S. Bank is one of the <strong style={{ color: "#fff" }}>stricter banks</strong> and explicitly states that P2P payments and other electronic deposits do not qualify.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> P2P payments (Zelle, Venmo, PayPal), bank-to-bank ACH transfers, wire transfers, cash deposits, and check deposits. ACH pushes from brokerages have mixed results.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> 2+ direct deposits totaling $8,000+ within 90 days for the top $450 tier. Use actual payroll here.
            </p>
          </div>

          {/* Bank of America */}
          <div style={bankCard}>
            <div style={bankName}>Bank of America (Up to $500 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Payroll, pension, and government benefit ACH deposits qualify. Some data points indicate ACH pushes from Fidelity and Schwab have triggered the requirement, but results are inconsistent.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Zelle, P2P transfers, wire transfers, and internal Bank of America transfers.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> Tiered bonus based on total DD: $100 at $2,000, $300 at $5,000, $500 at $10,000+ within 90 days.
            </p>
          </div>

          {/* BMO */}
          <div style={bankCard}>
            <div style={bankName}>BMO (Up to $600 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Qualifying direct deposits including payroll and employer ACH. BMO does not explicitly detail their full list, but payroll ACH is confirmed. Some data points suggest ACH pushes from other banks may work.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Transfers between BMO accounts, wire transfers, and non-ACH deposits.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> Tiered bonus: $200 at $2,000 DD, $400 at $4,000 DD, $600 at $8,000+ DD within 90 days.
            </p>
          </div>

          {/* Chime */}
          <div style={bankCard}>
            <div style={bankName}>Chime ($100 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Chime is very lenient. Most incoming ACH credits are recognized as direct deposits. Payroll, government benefits, and ACH pushes from other banks and brokerages have all been reported as working. Even some tax refund deposits trigger the requirement.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Internal transfers and non-ACH deposits (cash loads at retailers, etc.).
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> $200+ qualifying direct deposit plus debit card activation within 14 days. One of the easiest bonuses to trigger.
            </p>
          </div>

          {/* Capital One */}
          <div style={bankCard}>
            <div style={bankName}>Capital One ($300 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Payroll and employer direct deposits. Capital One generally looks for standard payroll-coded ACH. Some data points indicate ACH pushes from certain banks and brokerages may work, but results vary.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Zelle, P2P transfers, wire transfers, and internal Capital One transfers.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> Two deposits of $500+ each within 75 days using promo code OFFER300.
            </p>
          </div>

          {/* PNC */}
          <div style={bankCard}>
            <div style={bankName}>PNC Bank ($400 Checking Bonus)</div>
            <p style={bankDetail}>
              <span style={highlight}>What counts:</span> Qualifying direct deposits including payroll and government benefits. PNC has moderate strictness. Some ACH pushes have worked, but payroll is the safest route.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={warning}>What does NOT count:</span> Zelle, wire transfers, mobile deposits, and internal PNC transfers.
            </p>
            <p style={{ ...bankDetail, marginTop: 6 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>Requirement:</span> $5,000+ in qualifying direct deposits within 60 days for the $400 Performance Select tier.
            </p>
          </div>
        </div>

        {/* --- Section: Common Workarounds --- */}
        <h2 style={sectionHeading}>Common Direct Deposit Workarounds</h2>
        <p style={para}>
          If you cannot or do not want to switch your payroll direct deposit, there are several workarounds that many bank bonus hunters use. These work by sending ACH credits that some banks interpret as direct deposits.
        </p>

        <h3 style={subHeading}>ACH Push From a Brokerage Account</h3>
        <p style={para}>
          This is the most widely used workaround. Transferring money from a brokerage account at Fidelity, Charles Schwab, or similar institutions initiates an ACH push that many banks count as a direct deposit. Fidelity in particular is known for coding their outgoing ACH transfers in a way that triggers direct deposit credit at a large number of banks.
        </p>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}><strong style={{ color: "#fff" }}>Fidelity:</strong> Widely reported as the most reliable workaround. Works at SoFi, Chime, Wells Fargo (mixed), and many credit unions. Does not reliably work at Chase or U.S. Bank.</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Charles Schwab:</strong> Similar success rate to Fidelity. ACH pushes from Schwab brokerage or checking accounts have triggered DD at multiple banks.</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>E*TRADE:</strong> Some success reported but less consistent than Fidelity or Schwab.</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Robinhood:</strong> ACH pushes from Robinhood have worked at some fintech banks but generally not at traditional banks.</li>
        </ul>

        <h3 style={subHeading}>Employer Payroll Splitting</h3>
        <p style={para}>
          The most reliable method is simply splitting your actual payroll. Most employers allow you to deposit your paycheck into multiple accounts. You can send the minimum required amount to the bank where you are pursuing a bonus and keep the rest going to your primary account. This is a true payroll direct deposit and will work at every bank.
        </p>

        <h3 style={subHeading}>Gusto, ADP, and Other Payroll Platforms</h3>
        <p style={para}>
          If you are self-employed or run a small business, you can use payroll platforms like Gusto to pay yourself via direct deposit. These are legitimate payroll transactions coded as PPD, so they count at even the strictest banks like Chase and U.S. Bank. The cost of running payroll (usually $40-80/month) is often worth it when you are working on multiple high-value bonuses simultaneously.
        </p>

        <h3 style={subHeading}>Citi-Specific: Zelle and Venmo/PayPal</h3>
        <p style={para}>
          Citi&apos;s Enhanced Direct Deposit definition is uniquely broad. You can satisfy the requirement by having someone send you money via Zelle or by receiving a Venmo or PayPal transfer (standard speed, not instant). This makes the Citi bonus one of the easiest to earn if you regularly use peer-to-peer payment apps.
        </p>

        {/* --- Section: What Does NOT Count --- */}
        <h2 style={sectionHeading}>What Definitely Does NOT Count as a Direct Deposit</h2>
        <p style={para}>
          Regardless of which bank you are working with, the following deposit types almost never count as a direct deposit for bonus purposes:
        </p>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}><strong style={{ color: "#fff" }}>Zelle transfers</strong> (exception: Citi)</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Cash deposits</strong> at ATMs or branches</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Mobile check deposits</strong></li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Wire transfers</strong> (Fedwire, not ACH)</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Internal transfers</strong> between accounts at the same bank</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Interest payments</strong> from the bank itself</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Micro-deposits</strong> from account verification</li>
          <li style={listItem}><strong style={{ color: "#fff" }}>Instant transfers</strong> from payment apps (must be standard ACH speed)</li>
        </ul>
        <p style={para}>
          When in doubt, use actual payroll. It is the only method that works at 100% of banks, 100% of the time.
        </p>

        {/* --- Section: Strategy Tips --- */}
        <h2 style={sectionHeading}>Strategy Tips for Meeting Direct Deposit Requirements</h2>

        <h3 style={subHeading}>1. Read the Fine Print Before You Open</h3>
        <p style={para}>
          Before opening any account, check the specific terms for what qualifies as a direct deposit. Our individual bonus reviews at Fat Stacks Academy include this information for every offer. The language can change at any time, so always verify the current terms on the bank&apos;s website.
        </p>

        <h3 style={subHeading}>2. Start Your Direct Deposit Early</h3>
        <p style={para}>
          Do not wait until the last week of your bonus window to set up direct deposit. Payroll changes can take 1-2 pay cycles to go into effect. ACH transfers take 1-3 business days to settle. Give yourself plenty of buffer time by initiating your deposit within the first week of opening the account.
        </p>

        <h3 style={subHeading}>3. Track Your Progress</h3>
        <p style={para}>
          Keep a spreadsheet or use <Link href="/" style={{ color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>Stacks OS</Link> to track which deposits have posted, how much you have deposited toward the minimum, and when your bonus window closes. Missing a deadline by even one day means losing the entire bonus.
        </p>

        <h3 style={subHeading}>4. Have a Backup Plan</h3>
        <p style={para}>
          If you are using a workaround like an ACH push from a brokerage, have your payroll ready as a backup. If the ACH push does not trigger DD credit within the first two weeks, switch to payroll immediately so you do not run out of time.
        </p>

        <h3 style={subHeading}>5. Document Everything</h3>
        <p style={para}>
          Screenshot your deposits and save transaction confirmations. If a bank does not credit your bonus, you will need documentation to dispute it. Having clear records of qualifying deposits with dates and amounts makes the resolution process much smoother.
        </p>

        {/* --- Section: Bank Strictness Ranking --- */}
        <h2 style={sectionHeading}>Bank Strictness Ranking: Direct Deposit Definitions</h2>
        <p style={para}>
          Here is how major banks rank from strictest to most lenient in their direct deposit definitions:
        </p>

        <div style={{ border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden", marginTop: 16, marginBottom: 32 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ff6b6b" }}>STRICT</span>
            <span style={{ fontSize: 14, color: "#ccc", marginLeft: 12 }}>Chase, U.S. Bank, Teachers FCU -- Payroll/government only; ACH pushes rarely work</span>
          </div>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f0c040" }}>MODERATE</span>
            <span style={{ fontSize: 14, color: "#ccc", marginLeft: 12 }}>Wells Fargo, Bank of America, PNC, Capital One, BMO -- Payroll preferred; some ACH pushes work</span>
          </div>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#88e06d" }}>LENIENT</span>
            <span style={{ fontSize: 14, color: "#ccc", marginLeft: 12 }}>SoFi, Chime, Varo -- Most incoming ACH credits count</span>
          </div>
          <div style={{ padding: "16px 24px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#88e06d" }}>BROADEST</span>
            <span style={{ fontSize: 14, color: "#ccc", marginLeft: 12 }}>Citi (EDD) -- Zelle, Venmo, PayPal ACH, and payroll all count</span>
          </div>
        </div>

        {/* --- FAQ Section --- */}
        <h2 style={sectionHeading}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #1a1a1a", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
          {faqItems.map((item, i) => (
            <div key={i} style={{ padding: "20px 24px", borderBottom: i < faqItems.length - 1 ? "1px solid #1a1a1a" : "none" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.4 }}>{item.q}</h3>
              <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: 0 }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* --- Stacks OS CTA --- */}
        <div style={{ marginTop: 48, padding: "32px", background: "rgba(136,224,109,0.04)", border: "1px solid rgba(136,224,109,0.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Track Your Bank Bonuses With Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 16px" }}>
            Keep track of direct deposit requirements, bonus windows, and payouts across all your active bank bonuses. Stacks OS gives you a clear dashboard to manage your bonus pipeline so you never miss a deadline.
          </p>
          <Link href="/" style={{
            display: "inline-block", padding: "12px 24px", fontSize: 14, fontWeight: 700,
            background: "#88e06d", color: "#000", borderRadius: 8, textDecoration: "none",
          }}>
            Try Stacks OS Free
          </Link>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 24, padding: "24px", background: "rgba(255,0,0,0.05)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Watch: Direct Deposit Strategies for Bank Bonuses</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel walks through his direct deposit strategy, including which workarounds he uses and how he splits payroll across multiple banks.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#ff0000", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>&larr; All reviews</Link>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>Best checking bonuses &rarr;</Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>Best savings bonuses &rarr;</Link>
          <Link href="/blog/bank-bonus-tax-guide-2026" style={{ fontSize: 14, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>Bank bonus tax guide &rarr;</Link>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#555" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>YouTube</a>
            <Link href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
