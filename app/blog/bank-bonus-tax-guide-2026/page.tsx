import type { Metadata } from "next"
import Link from "next/link"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const SLUG = "bank-bonus-tax-guide-2026"
const TITLE = "Bank Bonus Tax Guide 2026: How to Report 1099 Income From Bank Bonuses"
const DESC = "Are bank bonuses taxable? Yes. Learn how to report bank bonus income on your taxes, the difference between 1099-INT and 1099-MISC, state tax implications, and tax planning tips for bonus churners."

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "bank bonus tax",
    "are bank bonuses taxable",
    "1099 bank bonus",
    "how to report bank bonus on taxes",
    "1099-INT vs 1099-MISC",
    "bank bonus income tax",
    "bank sign up bonus tax",
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
    q: "Are bank bonuses taxable income?",
    a: "Yes. The IRS considers bank account bonuses to be taxable income. Whether you receive a 1099 form or not, you are legally required to report bank bonus income on your federal tax return. Most bank bonuses are reported as interest income (1099-INT) or miscellaneous income (1099-MISC) depending on the bank.",
  },
  {
    q: "What is the difference between 1099-INT and 1099-MISC for bank bonuses?",
    a: "A 1099-INT reports interest income and is the most common form for bank bonuses. The bonus is treated as if the bank paid you interest on your deposit. A 1099-MISC reports miscellaneous income and is used by some banks, particularly for checking account bonuses or referral bonuses. The tax rate is the same either way, but you report them in different places on your tax return.",
  },
  {
    q: "Do I have to report a bank bonus if I did not receive a 1099?",
    a: "Yes. Even if the bank does not send you a 1099 form, you are still legally required to report the income. Banks are only required to send 1099-INT forms for interest of $10 or more and 1099-MISC forms for payments of $600 or more. If your bonus falls below these thresholds, you still owe taxes on it.",
  },
  {
    q: "How do I report a bank bonus on my tax return?",
    a: "If you received a 1099-INT, report the bonus amount on Schedule B (Interest and Ordinary Dividends), which flows to Form 1040 Line 2b. If you received a 1099-MISC, report it as other income on Schedule 1 Line 8z, which flows to Form 1040 Line 8. If you did not receive a 1099, report it in the same manner based on how you expect it would have been classified.",
  },
  {
    q: "What tax rate applies to bank bonus income?",
    a: "Bank bonus income is taxed at your ordinary income tax rate, which depends on your total taxable income and filing status. For 2026, federal rates range from 10% to 37%. You will also owe state income tax if your state has one. There is no special capital gains rate for bank bonuses. For most people, expect to pay 22-32% in combined federal and state taxes on bonus income.",
  },
  {
    q: "Can I deduct any expenses related to earning bank bonuses?",
    a: "Generally, no. The IRS does not allow deductions for personal banking expenses. Fees paid to open or maintain accounts, costs of meeting minimum balance requirements, and similar expenses are not deductible. If you earn bank bonuses as part of a legitimate business activity, consult a tax professional about potential business expense deductions.",
  },
  {
    q: "When do banks send 1099 forms for bonuses?",
    a: "Banks are required to send 1099 forms by January 31 of the year following the tax year in which the bonus was paid. For example, a bonus that posted to your account in 2026 will generate a 1099 that the bank must send by January 31, 2027. You should receive the form by mid-February. Check your online banking portal, as many banks make 1099 forms available electronically.",
  },
  {
    q: "Do state taxes apply to bank bonus income?",
    a: "Yes, if your state has an income tax. Most states tax bank bonus income the same as other ordinary income. A few states (like Florida, Texas, Nevada, and others) have no state income tax, so residents there only owe federal tax on bonus income. Check your state tax rules for any specific exemptions or additional reporting requirements.",
  },
]

export default function BankBonusTaxGuide() {
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
          { "@type": "ListItem", position: 2, name: "Bank Bonus Tax Guide 2026", item: `${BASE}/blog/${SLUG}` },
        ],
      },
    ],
  }

  const sectionHeading: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 700,
    color: "#111",
    margin: "48px 0 16px",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  }
  const subHeading: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: "#111",
    margin: "32px 0 12px",
    lineHeight: 1.3,
  }
  const para: React.CSSProperties = {
    fontSize: 15,
    color: "#555",
    lineHeight: 1.8,
    margin: "0 0 16px",
    maxWidth: 680,
  }
  const listItem: React.CSSProperties = {
    fontSize: 15,
    color: "#555",
    lineHeight: 1.8,
    margin: "0 0 8px",
    paddingLeft: 8,
  }
  const tableRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    padding: "14px 20px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: 14,
    color: "#555",
    alignItems: "center",
  }
  const tableHeader: React.CSSProperties = {
    ...tableRow,
    fontSize: 12,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none" }}>Fat Stacks Academy</Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Checking</Link>
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
          <span>Bank Bonus Tax Guide 2026</span>
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          Bank Bonus Tax Guide 2026: How to Report 1099 Income
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 10, 2026
        </p>
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 650 }}>
          Bank bonuses are one of the best low-risk ways to earn extra income. But every dollar you earn from a bank bonus is taxable income in the eyes of the IRS. If you are churning multiple bonuses per year, the tax implications can add up quickly. This guide covers everything you need to know about reporting bank bonus income on your 2026 tax return.
        </p>
        <p style={para}>
          This is not tax advice. Consult a qualified tax professional for guidance specific to your situation. What follows is a general educational overview of how bank bonus income is typically treated for federal and state tax purposes.
        </p>

        {/* --- Section: Yes, Bank Bonuses Are Taxable --- */}
        <h2 style={sectionHeading}>Yes, Bank Bonuses Are Taxable Income</h2>
        <p style={para}>
          The IRS treats bank account bonuses as taxable income. This applies to checking account bonuses, savings account bonuses, referral bonuses, and any other cash incentive a bank pays you for opening or maintaining an account. There is no exemption, no minimum threshold below which bonuses are tax-free, and no special treatment that reduces the tax rate.
        </p>
        <p style={para}>
          Bank bonuses are taxed at your <strong style={{ color: "#111" }}>ordinary income tax rate</strong>, which is the same rate applied to your salary, wages, and interest income. For the 2026 tax year, federal ordinary income rates range from 10% to 37% depending on your taxable income and filing status.
        </p>
        <p style={para}>
          A common misconception is that bank bonuses are only taxable if you receive a 1099 form. This is incorrect. The IRS requires you to report all income, regardless of whether the payer issues a 1099. The 1099 is an information return that helps the IRS match income to taxpayers, but the absence of a 1099 does not eliminate your obligation to report the income.
        </p>

        {/* --- Section: 1099-INT vs 1099-MISC --- */}
        <h2 style={sectionHeading}>1099-INT vs 1099-MISC: Which Form and When</h2>
        <p style={para}>
          Banks report bonus payments using one of two forms, and which form they use depends on how they classify the bonus internally.
        </p>

        <h3 style={subHeading}>1099-INT (Interest Income)</h3>
        <p style={para}>
          Most banks classify account bonuses as interest income and report them on Form 1099-INT. This is the most common treatment for savings account bonuses and many checking account bonuses. The bonus amount appears in Box 1 of the 1099-INT, combined with any actual interest you earned on the account during the year.
        </p>
        <p style={para}>
          Banks are required to issue a 1099-INT when the total interest paid (including bonuses classified as interest) is <strong style={{ color: "#111" }}>$10 or more</strong> during the tax year. If you earned $8 in interest and received a $300 bonus, the 1099-INT will show $308.
        </p>

        <h3 style={subHeading}>1099-MISC (Miscellaneous Income)</h3>
        <p style={para}>
          Some banks classify bonuses as miscellaneous income instead of interest. This is more common with referral bonuses and certain checking account bonuses. The bonus amount appears in Box 3 (Other Income) of Form 1099-MISC.
        </p>
        <p style={para}>
          Banks are required to issue a 1099-MISC when the total miscellaneous payments are <strong style={{ color: "#111" }}>$600 or more</strong> during the tax year. This higher threshold means you are less likely to receive a 1099-MISC for smaller bonuses, but you are still required to report the income.
        </p>

        <h3 style={subHeading}>Reporting Threshold Summary</h3>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden", marginTop: 16, marginBottom: 24 }}>
          <div style={tableHeader}>
            <span>Form</span>
            <span>Threshold</span>
            <span>Common For</span>
          </div>
          <div style={tableRow}>
            <span style={{ color: "#111", fontWeight: 600 }}>1099-INT</span>
            <span>$10+</span>
            <span>Savings bonuses, most checking bonuses</span>
          </div>
          <div style={{ ...tableRow, borderBottom: "none" }}>
            <span style={{ color: "#111", fontWeight: 600 }}>1099-MISC</span>
            <span>$600+</span>
            <span>Referral bonuses, some checking bonuses</span>
          </div>
        </div>
        <p style={para}>
          Note that different banks handle this differently, and the same bank may use different forms for different types of bonuses. A checking bonus might be reported on 1099-INT while a referral bonus from the same bank goes on 1099-MISC. Always check every 1099 you receive carefully.
        </p>

        {/* --- Section: How to Report --- */}
        <h2 style={sectionHeading}>How to Report Bank Bonus Income on Your Tax Return</h2>
        <p style={para}>
          Where you report the income depends on which 1099 form the bank used (or would have used if they had issued one).
        </p>

        <h3 style={subHeading}>If Reported on 1099-INT</h3>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}>Enter the amount on <strong style={{ color: "#111" }}>Schedule B, Part I (Interest)</strong> of your Form 1040.</li>
          <li style={listItem}>List each bank separately with the interest amount (which includes the bonus if classified as interest).</li>
          <li style={listItem}>The total flows to <strong style={{ color: "#111" }}>Form 1040, Line 2b</strong> (Taxable Interest).</li>
          <li style={listItem}>You are required to file Schedule B if your total interest income exceeds $1,500 for the year. If you are churning multiple bonuses, you will almost certainly cross this threshold.</li>
        </ul>

        <h3 style={subHeading}>If Reported on 1099-MISC</h3>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}>Enter the amount on <strong style={{ color: "#111" }}>Schedule 1, Line 8z</strong> (Other Income) with a description like &quot;bank bonus&quot; or &quot;account bonus.&quot;</li>
          <li style={listItem}>The total from Schedule 1 flows to <strong style={{ color: "#111" }}>Form 1040, Line 8</strong> (Other Income).</li>
          <li style={listItem}>1099-MISC income reported in Box 3 is <strong style={{ color: "#111" }}>not subject to self-employment tax</strong>. This is an important distinction. You owe income tax but not the additional 15.3% SE tax.</li>
        </ul>

        <h3 style={subHeading}>If No 1099 Was Issued</h3>
        <p style={para}>
          If the bank did not send you a 1099 (because the amount was below the reporting threshold), you should still report the income. Report it in the same category the bank would have used. If you are unsure, reporting it as interest income on Schedule B is the safer choice, as most bonuses are classified as interest.
        </p>

        {/* --- Section: State Tax --- */}
        <h2 style={sectionHeading}>State Tax Implications</h2>
        <p style={para}>
          If your state has an income tax, bank bonus income is generally taxable at the state level as well. Most states follow federal treatment and tax interest and miscellaneous income at your state ordinary income rate.
        </p>
        <p style={para}>
          <strong style={{ color: "#111" }}>States with no income tax:</strong> Alaska, Florida, Nevada, New Hampshire (interest and dividends only through 2024, fully repealed starting 2025), South Dakota, Tennessee (no wage tax; interest/dividend tax repealed), Texas, Washington, and Wyoming. If you live in one of these states, you only owe federal tax on bank bonus income.
        </p>
        <p style={para}>
          A few states offer partial exemptions on interest income. For example, some states exempt a portion of interest earned from banks within that state. Check your state tax code for any applicable exemptions. In practice, most bank bonus income will be fully taxable at the state level.
        </p>
        <p style={para}>
          If you earned a bonus from a bank in a different state, you generally report it in your state of residence. Bank bonuses are not typically subject to source-state taxation the way employment income might be.
        </p>

        {/* --- Section: What If No 1099 --- */}
        <h2 style={sectionHeading}>What If the Bank Does Not Send a 1099?</h2>
        <p style={para}>
          This is more common than you might think, especially with smaller bonuses and credit union promotions. Here is what to do:
        </p>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}><strong style={{ color: "#111" }}>You must still report the income.</strong> The IRS expects you to report all income regardless of whether a 1099 was issued.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Keep your own records.</strong> Save screenshots of bonus postings, account statements showing the bonus credit, and any promotional emails confirming the bonus amount and date.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Wait until mid-February before filing.</strong> 1099 forms are due to taxpayers by January 31, but mail delivery can take 2-3 weeks. Check your online banking portals as well, since many banks make 1099s available electronically.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Contact the bank if a 1099 seems missing.</strong> If you received a bonus of $10+ (for 1099-INT) or $600+ (for 1099-MISC) and have not received a form by mid-February, call the bank to request a copy.</li>
        </ul>

        {/* --- Section: Tax Planning --- */}
        <h2 style={sectionHeading}>Tax Planning Tips for Bank Bonus Churners</h2>

        <h3 style={subHeading}>1. Estimate Your Effective Tax Rate on Bonuses</h3>
        <p style={para}>
          Your bank bonus income is taxed at your marginal rate, not your average rate. If your regular income puts you in the 22% federal bracket and you live in a state with a 5% income tax, you will owe roughly 27% on every bonus dollar. A $500 bonus nets you about $365 after taxes. Knowing this number helps you evaluate which bonuses are worth the effort.
        </p>

        <h3 style={subHeading}>2. Set Aside Money for Taxes as You Earn Bonuses</h3>
        <p style={para}>
          Do not spend your entire bonus when it posts. Set aside your estimated tax percentage immediately. If you are in a 25% combined federal and state bracket, transfer 25% of every bonus to a savings account earmarked for taxes. This prevents a surprise tax bill in April.
        </p>

        <h3 style={subHeading}>3. Consider Estimated Tax Payments</h3>
        <p style={para}>
          If you earn significant bonus income during the year (typically $1,000+ in total bonuses), you may need to make quarterly estimated tax payments to avoid an underpayment penalty. The IRS expects you to pay taxes throughout the year, not just at filing time. Use Form 1040-ES to calculate and submit quarterly payments. The deadlines are April 15, June 15, September 15, and January 15.
        </p>

        <h3 style={subHeading}>4. Increase Your W-4 Withholding</h3>
        <p style={para}>
          An alternative to quarterly estimated payments is to increase the withholding from your regular paycheck. Adjust your W-4 at work to withhold extra federal tax, which will cover the additional income from bank bonuses. This is simpler than making quarterly payments and achieves the same result.
        </p>

        <h3 style={subHeading}>5. Use Tax Software That Handles Multiple 1099s</h3>
        <p style={para}>
          If you are earning bonuses from 5, 10, or 20 banks per year, you will have a stack of 1099 forms at tax time. Use tax software that makes it easy to enter multiple 1099-INT and 1099-MISC forms. TurboTax, H&R Block, and FreeTaxUSA all handle this well. If you are importing forms electronically, verify that bonus amounts are correctly included.
        </p>

        {/* --- Section: Tracking --- */}
        <h2 style={sectionHeading}>How to Track Bonus Income Across Multiple Banks</h2>
        <p style={para}>
          Serious bank bonus churners may work on 10-20+ bonuses per year. Keeping track of which bonuses have posted, which 1099s you have received, and what you still need to report can become complex. Here is a system that works:
        </p>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}><strong style={{ color: "#111" }}>Log every bonus when it posts.</strong> Record the bank name, bonus amount, date posted, and account type (checking or savings).</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Note the expected 1099 type.</strong> Check the bank&apos;s terms to determine if the bonus will be reported as 1099-INT or 1099-MISC. This helps you cross-reference when forms arrive.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Track 1099 receipt during tax season.</strong> As each 1099 arrives in January and February, check it off your list and verify the amounts match your records.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Flag discrepancies immediately.</strong> If a 1099 shows a different amount than you expected, contact the bank before filing. Correcting a 1099 after filing is more complicated.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Keep records for at least 3 years.</strong> The IRS can audit returns up to 3 years after filing (6 years if income is substantially understated). Retain all 1099s, account statements, and bonus confirmation emails.</li>
        </ul>
        <p style={para}>
          <Link href="/" style={{ color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Stacks OS</Link> includes built-in tracking for bank bonuses with fields for bonus amount, post date, and tax status. Instead of managing a manual spreadsheet, you can track your entire bonus pipeline and export the data at tax time.
        </p>

        {/* --- Section: Example Scenarios --- */}
        <h2 style={sectionHeading}>Example: How Much Tax Do You Owe on Bank Bonuses?</h2>
        <p style={para}>
          Here are three scenarios showing how bank bonus taxes work in practice for the 2026 tax year.
        </p>

        <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>Scenario 1: Single Bonus</div>
            <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: 0 }}>
              You earn a $400 Chase checking bonus. You are in the 22% federal bracket and live in a state with 5% income tax.
              <br />Tax owed: $400 x 27% = <strong style={{ color: "#111" }}>$108</strong>. Net profit: <strong style={{ color: "#0d7c5f" }}>$292</strong>.
            </p>
          </div>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>Scenario 2: Multiple Bonuses</div>
            <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: 0 }}>
              You earn bonuses from Chase ($400), Citi ($325), BMO ($600), SoFi ($400), and Bank of America ($500) = $2,225 total.
              Same 27% rate.
              <br />Tax owed: $2,225 x 27% = <strong style={{ color: "#111" }}>$601</strong>. Net profit: <strong style={{ color: "#0d7c5f" }}>$1,624</strong>.
            </p>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>Scenario 3: High Earner, No State Tax</div>
            <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: 0 }}>
              You earn $3,000 in bank bonuses and live in Texas (no state income tax). You are in the 32% federal bracket.
              <br />Tax owed: $3,000 x 32% = <strong style={{ color: "#111" }}>$960</strong>. Net profit: <strong style={{ color: "#0d7c5f" }}>$2,040</strong>.
            </p>
          </div>
        </div>

        <p style={{ ...para, marginTop: 24 }}>
          Even after taxes, bank bonuses provide a strong return on your time. A $400 bonus that takes 30 minutes of account setup and a payroll change effectively pays $584/hour pre-tax (or $420/hour after tax at a 27% rate). The key is planning ahead so taxes do not catch you off guard.
        </p>

        {/* --- Section: Common Mistakes --- */}
        <h2 style={sectionHeading}>Common Tax Mistakes to Avoid</h2>
        <ul style={{ padding: "0 0 0 20px", margin: "0 0 16px" }}>
          <li style={listItem}><strong style={{ color: "#111" }}>Not reporting bonuses below the 1099 threshold.</strong> A $50 credit union bonus without a 1099 is still taxable income.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Double-counting or missing a 1099.</strong> When you have 10+ accounts, it is easy to enter a 1099 twice or miss one entirely. Cross-reference your tracking list carefully.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Confusing the tax year.</strong> The bonus is taxable in the year it posts to your account, not the year you opened the account or met the requirements. A bonus that posts on January 5, 2027, goes on your 2027 return even if you did all the work in 2026.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Not making estimated payments.</strong> If your bonus income pushes your total underwithholding above $1,000 for the year, you may owe an underpayment penalty.</li>
          <li style={listItem}><strong style={{ color: "#111" }}>Reporting 1099-MISC Box 3 income as self-employment income.</strong> Bank bonuses reported on 1099-MISC Box 3 are &quot;other income,&quot; not self-employment income. Do not report them on Schedule C. This would cause you to pay unnecessary self-employment tax.</li>
        </ul>

        {/* --- FAQ Section --- */}
        <h2 style={sectionHeading}>Frequently Asked Questions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
          {faqItems.map((item, i) => (
            <div key={i} style={{ padding: "20px 24px", borderBottom: i < faqItems.length - 1 ? "1px solid #f0f0f0" : "none" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 8px", lineHeight: 1.4 }}>{item.q}</h3>
              <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, margin: 0 }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* --- Stacks OS CTA --- */}
        <div style={{ marginTop: 48, padding: "32px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>Track Bonuses and Tax Status With Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 16px" }}>
            Stop guessing which bonuses posted and which 1099s you are waiting for. Stacks OS tracks your entire bank bonus pipeline -- bonus amounts, post dates, and tax reporting status -- so you are fully prepared when tax season arrives.
          </p>
          <Link href="/" style={{
            display: "inline-block", padding: "12px 24px", fontSize: 14, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Try Stacks OS Free
          </Link>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 24, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: How to Handle Bank Bonus Taxes</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel breaks down his personal approach to tracking and paying taxes on bank bonus income, including his quarterly estimated payment strategy.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#ff0000", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; All reviews</Link>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best checking bonuses &rarr;</Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best savings bonuses &rarr;</Link>
          <Link href="/blog/what-counts-as-direct-deposit" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Direct deposit guide &rarr;</Link>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>YouTube</a>
            <Link href="/" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
