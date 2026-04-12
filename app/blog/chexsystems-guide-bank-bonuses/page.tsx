import type { Metadata } from "next"
import Link from "next/link"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const CANONICAL = `${BASE}/blog/chexsystems-guide-bank-bonuses`

export const metadata: Metadata = {
  title: "ChexSystems Explained: How It Affects Bank Bonuses (2026 Guide)",
  description: "What is ChexSystems and how does it affect bank bonus eligibility? Learn how to check your ChexSystems report, which banks are sensitive, and what to do if denied. Complete 2026 guide.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    title: "ChexSystems Explained: How It Affects Bank Bonuses (2026 Guide)",
    description: "Complete guide to ChexSystems for bank bonus hunters. Bank sensitivity list, how to get your free report, dispute errors, and strategies if denied.",
    url: CANONICAL,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "ChexSystems Explained: How It Affects Bank Bonuses" },
  keywords: [
    "ChexSystems bank bonus", "ChexSystems explained", "bank bonus denied ChexSystems",
    "how to check ChexSystems report", "ChexSystems sensitivity by bank",
    "ChexSystems freeze", "second chance bank account", "Early Warning Services",
    "ChexSystems dispute", "ChexSystems report free", "bank account denied",
    "ChexSystems vs credit bureau", "ChexSystems inquiry",
  ],
}

const faqs = [
  {
    q: "What is ChexSystems and why do banks use it?",
    a: "ChexSystems is a consumer reporting agency that tracks your banking history. Banks check your ChexSystems report when you open a new account to see if you have a history of unpaid overdrafts, closed accounts with negative balances, or suspected fraud. It helps banks assess the risk of giving you a new account.",
  },
  {
    q: "How long do negative items stay on a ChexSystems report?",
    a: "Most negative items remain on your ChexSystems report for five years from the date they were reported. After five years, items are automatically removed. You can also request early removal if you resolve the underlying issue with the reporting bank.",
  },
  {
    q: "Can I get a bank bonus if I have a ChexSystems record?",
    a: "Yes. Many banks have low ChexSystems sensitivity and will approve you even with negative marks. Capital One, Varo, Chime, SoFi, Citi, Wells Fargo, and 316 Financial are all known for approving applicants regardless of ChexSystems history. Start with these banks while you work on cleaning up your report.",
  },
  {
    q: "How do I get my free ChexSystems report?",
    a: "Under the Fair Credit Reporting Act (FCRA), you are entitled to one free ChexSystems report every 12 months. Visit chexsystems.com and request your Consumer Disclosure report. You can also call 800-428-9623 or mail a written request. The report arrives within five business days.",
  },
  {
    q: "What is the difference between ChexSystems and Early Warning Services?",
    a: "ChexSystems and Early Warning Services (EWS) are both consumer reporting agencies that track banking history, but they are separate databases. A bank may check one or both. Having a clean ChexSystems report does not guarantee approval if the bank also checks EWS and finds negative history there. Major banks like JPMorgan Chase, Bank of America, and Wells Fargo are co-owners of EWS.",
  },
  {
    q: "Can I freeze my ChexSystems report?",
    a: "Yes. You can place a security freeze on your ChexSystems report by contacting them directly. This prevents banks from pulling your report, which can block fraudulent account openings. However, you will need to temporarily lift the freeze before applying for any new bank account that checks ChexSystems.",
  },
  {
    q: "Will bank bonus churning show up on ChexSystems?",
    a: "Opening and closing bank accounts in good standing does not create negative ChexSystems records. However, each new account application may generate a ChexSystems inquiry, and some banks may view a high number of recent inquiries as a risk factor. Most banks do not weight inquiries heavily, but a few medium- and high-sensitivity banks may factor them into their decision.",
  },
]

export default function ChexSystemsGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "ChexSystems Explained: How It Affects Bank Bonuses",
        description: "Complete guide to ChexSystems for bank bonus hunters. Bank sensitivity list, how to get your free report, and strategies if denied.",
        url: CANONICAL,
        datePublished: "2026-04-10",
        dateModified: "2026-04-10",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "ChexSystems Guide", item: CANONICAL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(f => ({
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
          <span>ChexSystems Guide</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          ChexSystems Explained: How It Affects Your Bank Bonus Eligibility
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 10, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 650 }}>
          If you have ever been denied a new bank account, ChexSystems is likely the reason. This guide covers
          everything you need to know about ChexSystems as a bank bonus hunter — what it is, how to check your
          report for free, which banks care about it, and exactly what to do if you get denied.
        </p>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 650 }}>
          Understanding ChexSystems is essential if you are serious about earning bank bonuses. One negative mark
          can lock you out of certain banks entirely, while others will approve you regardless. Knowing which banks
          fall into which category saves you time and hard pulls on your banking record.
        </p>

        {/* Table of Contents */}
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>In This Guide</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "What Is ChexSystems?", id: "what-is-chexsystems" },
              { label: "ChexSystems vs. Credit Bureaus", id: "chexsystems-vs-credit-bureaus" },
              { label: "What Shows Up on Your Report", id: "what-shows-up" },
              { label: "How Long Items Stay on Your Report", id: "how-long-items-stay" },
              { label: "How to Get Your Free Report", id: "free-report" },
              { label: "ChexSystems Sensitivity by Bank", id: "sensitivity-by-bank" },
              { label: "What to Do If You Are Denied", id: "denied" },
              { label: "Freezing and Unfreezing Your Report", id: "freeze-unfreeze" },
              { label: "Early Warning Services (EWS)", id: "early-warning-services" },
              { label: "FAQ", id: "faq" },
            ].map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none" }}>{item.label}</a>
            ))}
          </div>
        </div>

        {/* What Is ChexSystems */}
        <section id="what-is-chexsystems" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>What Is ChexSystems?</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              ChexSystems is a consumer reporting agency owned by Fidelity National Information Services (FIS). It maintains
              a database of people who have had problems with bank accounts — specifically checking and savings accounts.
              When you apply to open a new bank account, the bank queries ChexSystems to check your history. If the report
              comes back with negative marks, the bank may deny your application.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              Over 80% of banks and credit unions in the United States use ChexSystems as part of their account opening
              process. The system was designed to help financial institutions screen out applicants who pose a risk of
              account abuse — people who have left unpaid negative balances, committed fraud, or had accounts involuntarily
              closed by a previous bank.
            </p>
            <p style={{ margin: 0 }}>
              For bank bonus hunters, ChexSystems matters because it can determine whether you are approved or denied
              when you apply for a new account. Even if you meet every other requirement for a bonus, a ChexSystems flag
              can stop you at the door. The good news is that not every bank weighs ChexSystems equally, and some do not
              check it at all.
            </p>
          </div>
        </section>

        {/* ChexSystems vs Credit Bureaus */}
        <section id="chexsystems-vs-credit-bureaus" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>ChexSystems vs. Credit Bureaus</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              ChexSystems is often confused with the three major credit bureaus — Equifax, Experian, and TransUnion — but
              they serve fundamentally different purposes. The credit bureaus track your credit history: credit cards, loans,
              mortgages, and payment history. Your credit score (FICO or VantageScore) is derived from this data. ChexSystems
              has nothing to do with credit. It exclusively tracks your banking history with deposit accounts.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              This means you can have a perfect 800 credit score and still be denied a bank account if you have a
              negative ChexSystems record. Conversely, you can have terrible credit but a clean ChexSystems report,
              and most banks will happily open an account for you. The two systems operate independently.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              Another key difference is scoring. Credit bureaus generate numerical scores on a scale (300-850 for FICO).
              ChexSystems uses a different model. It generates a Consumer Debit Report that lists specific incidents —
              closed accounts, unpaid balances, fraud alerts — rather than a single score. Some banks have internal
              scoring thresholds based on the number and severity of items on your ChexSystems report, but the exact
              criteria vary by institution.
            </p>
            <p style={{ margin: 0 }}>
              One similarity: both ChexSystems and the credit bureaus are regulated under the Fair Credit Reporting Act
              (FCRA). This means you have the same legal rights — you can request a free report annually, dispute errors,
              and place security freezes. If a bank denies you based on your ChexSystems report, they are legally required
              to tell you and provide instructions on how to obtain your report.
            </p>
          </div>
        </section>

        {/* What Shows Up */}
        <section id="what-shows-up" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>What Shows Up on a ChexSystems Report</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Your ChexSystems report can contain several categories of information. Understanding what each one means
              helps you assess whether your report might cause issues when applying for bank bonuses.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Closed accounts with negative balances.</strong> This is the most common
              negative item. If you had a bank account that was closed while you owed money — whether from overdrafts,
              fees, or a negative balance you never resolved — the bank reports it to ChexSystems. This is the item most
              likely to get you denied at a new bank.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Unpaid overdrafts.</strong> Even if your account was not formally closed,
              significant overdraft activity that went unpaid can appear on your report. Banks view chronic overdrafting
              as a sign of financial instability or potential abuse.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Fraud or suspected fraud.</strong> If a bank flagged your account for
              suspected fraudulent activity — whether you were the perpetrator or the victim — it can show up on your
              ChexSystems report. Fraud flags are taken very seriously and can result in denial even at banks with low
              ChexSystems sensitivity.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Account abuse.</strong> This is a broad category that can include things
              like excessive returned checks (bounced checks), kiting schemes, or other patterns that a bank considers
              abusive. The bank decides what qualifies as abuse, and the threshold varies by institution.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Inquiries.</strong> Every time a bank checks your ChexSystems report, an
              inquiry is recorded. Unlike the negative items above, inquiries are informational — most banks do not penalize
              you for having many inquiries. However, a very high number of recent inquiries (from opening many accounts in
              a short period) may raise flags at some medium-sensitivity banks. For most bonus hunters, inquiries are not a concern.
            </p>
          </div>
        </section>

        {/* How Long Items Stay */}
        <section id="how-long-items-stay" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How Long Items Stay on Your Report</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Negative items on your ChexSystems report remain for <strong style={{ color: "#111" }}>five years</strong> from
              the date the bank reported them. After five years, the item is automatically removed. There is no way to
              accelerate this timeline through ChexSystems directly.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              However, you can contact the bank that reported the negative item and ask them to remove it early. If you
              pay off the debt or resolve the issue, some banks will voluntarily request removal from ChexSystems. This
              is not guaranteed — the bank has no obligation to remove accurate information — but it is worth trying,
              especially if you can document that the issue was resolved.
            </p>
            <p style={{ margin: 0 }}>
              Inquiries have a shorter lifespan. ChexSystems inquiries typically remain on your report for <strong style={{ color: "#111" }}>three
              years</strong>, but as mentioned above, most banks do not weigh inquiries in their approval decisions. If you
              are actively churning bank bonuses, expect to accumulate inquiries — this is normal and rarely causes problems.
            </p>
          </div>
        </section>

        {/* How to Get Your Free Report */}
        <section id="free-report" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How to Get Your Free ChexSystems Report</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Under the Fair Credit Reporting Act (FCRA), you are entitled to one free ChexSystems Consumer Disclosure
              report every 12 months. This is the same law that entitles you to free credit reports from each of the
              three major credit bureaus. Requesting your report does not negatively affect your record.
            </p>
            <p style={{ margin: "0 0 16px" }}>
              There are three ways to request your free report:
            </p>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px" }}>
                <strong style={{ color: "#111" }}>Online:</strong> Visit{" "}
                <span style={{ color: "#0d7c5f" }}>chexsystems.com</span> and navigate to the Consumer Disclosure
                section. You will need to verify your identity with personal information including your Social Security number.
              </p>
              <p style={{ margin: "0 0 8px" }}>
                <strong style={{ color: "#111" }}>Phone:</strong> Call <span style={{ color: "#0d7c5f" }}>800-428-9623</span> and
                request a Consumer Disclosure report. The automated system will guide you through identity verification.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#111" }}>Mail:</strong> Send a written request with your full name, current address,
                previous addresses (last five years), Social Security number, and date of birth to: Chex Systems, Inc.,
                Attn: Consumer Relations, 7805 Hudson Road, Suite 100, Woodbury, MN 55125.
              </p>
            </div>
            <p style={{ margin: "0 0 12px" }}>
              The online method is the fastest. Your report is typically available immediately. Phone and mail requests
              can take up to five business days. If your report comes back empty, that is a good sign — it means no bank
              has reported negative information about you.
            </p>
            <p style={{ margin: 0 }}>
              I recommend pulling your ChexSystems report before you start any bank bonus strategy. It takes five minutes
              and gives you a clear picture of where you stand. If there are surprises, you want to know about them before
              you waste time applying to banks that will deny you.
            </p>
          </div>
        </section>

        {/* ChexSystems Sensitivity by Bank */}
        <section id="sensitivity-by-bank" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>ChexSystems Sensitivity by Bank</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 20px" }}>
              Not all banks treat ChexSystems the same way. Some banks are lenient and will approve you even with negative
              marks on your report. Others are strict and will deny you for any blemish. Based on data from our bonus
              reviews, here is how the banks we cover break down by ChexSystems sensitivity.
            </p>
          </div>

          {/* Low Sensitivity */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>Low Sensitivity</span>
              <span style={{ fontSize: 13, color: "#777" }}>Likely to approve with negative marks</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
              {[
                { name: "Capital One", note: "Does not use ChexSystems at all. Uses a proprietary internal system. One of the safest options if you have banking history issues." },
                { name: "Varo", note: "Online-only neobank. Known for approving applicants with ChexSystems records. No minimum balance or monthly fees." },
                { name: "Chime", note: "Second-chance friendly fintech. Explicitly markets to people who have been denied elsewhere." },
                { name: "SoFi", note: "Fintech bank with lenient screening. SoFi checks ChexSystems but has a very low threshold for denial." },
                { name: "Citi", note: "Major bank with surprisingly low ChexSystems sensitivity. Citi generally focuses more on credit history than banking history." },
                { name: "Wells Fargo", note: "Despite being a major bank, Wells Fargo is known for approving applicants with minor ChexSystems items. Serious fraud flags may still cause denial." },
                { name: "316 Financial", note: "Small institution with lenient screening. Good option for those building their banking history back up." },
              ].map(bank => (
                <div key={bank.name} style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{bank.name}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{bank.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Medium Sensitivity */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#000", background: "#f5c542", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>Medium Sensitivity</span>
              <span style={{ fontSize: 13, color: "#777" }}>May deny with negative marks; inquiries usually fine</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
              {[
                { name: "Chase", note: "Checks ChexSystems and may deny for significant negative items. Clean reports with only inquiries are typically fine. One of the highest-value bonuses at $400-$600." },
                { name: "PNC", note: "Moderate screening. Minor items from several years ago may pass, but recent negative marks will likely result in denial." },
                { name: "U.S. Bank", note: "Checks ChexSystems during the application process. Known to deny for active negative items but more lenient on older resolved issues." },
                { name: "PSECU", note: "Pennsylvania credit union. Performs a ChexSystems check but has moderate tolerance for minor items." },
                { name: "FIGFCU", note: "Credit union with standard ChexSystems screening. Recent negative items are a higher risk for denial." },
                { name: "E*TRADE", note: "Morgan Stanley subsidiary. Runs a ChexSystems check and may deny for negative banking history." },
                { name: "Teachers FCU", note: "Credit union that checks ChexSystems but focuses primarily on the severity of reported items rather than the count." },
              ].map(bank => (
                <div key={bank.name} style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{bank.name}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{bank.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* High Sensitivity */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#e04444", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>High Sensitivity</span>
              <span style={{ fontSize: 13, color: "#777" }}>Strict screening; even minor items may cause denial</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
              {[
                { name: "Affinity FCU", note: "Credit union with strict ChexSystems requirements. Even minor or old items can trigger denial. Recommend a clean report before applying." },
                { name: "KeyPoint CU", note: "Strict screening. If you have any negative items on your ChexSystems report, this credit union is very likely to deny your application." },
              ].map(bank => (
                <div key={bank.name} style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{bank.name}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{bank.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Unknown */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#999", padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.05em" }}>Unknown</span>
              <span style={{ fontSize: 13, color: "#777" }}>Not enough data to determine sensitivity</span>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ padding: "10px 0" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>BMO</div>
                <div style={{ fontSize: 13, color: "#888" }}>BMO (formerly BMO Harris) checks ChexSystems, but there is not enough community data to reliably categorize their sensitivity level. Their $600 bonus is one of the highest available, so it may be worth attempting even if you have minor items on your report.</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8, marginTop: 20 }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Strategy tip:</strong> If you have a negative ChexSystems record, start with the
              low-sensitivity banks to earn bonuses while you wait for items to age off your report. Capital One, SoFi, and Wells
              Fargo all offer competitive bonuses and are accessible to almost everyone.
            </p>
          </div>
        </section>

        {/* What to Do If Denied */}
        <section id="denied" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>What to Do If You Are Denied a Bank Account</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              Getting denied a bank account is frustrating, especially when a bonus is on the line. Here is a step-by-step
              plan for dealing with a denial based on your ChexSystems report.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Step 1: Get your adverse action notice.</strong> When a bank denies you based on
              ChexSystems, they are required by law to send you an adverse action notice. This letter tells you which consumer
              reporting agency was used and how to obtain a copy of your report. If you do not receive one, call the bank and
              request it explicitly.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Step 2: Pull your ChexSystems report.</strong> After a denial, you are entitled to
              an additional free report (beyond your annual entitlement) within 60 days. Use this to see exactly what the bank
              saw when they denied you.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Step 3: Dispute any errors.</strong> Review every item on your report carefully.
              If anything is inaccurate — wrong amounts, accounts that are not yours, items that should have been removed — file
              a dispute directly with ChexSystems. They are required to investigate within 30 days. You can dispute online at
              chexsystems.com, by phone, or by mail. Also contact the reporting bank directly, as they can request removal of
              incorrect information.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Step 4: Resolve outstanding debts.</strong> If the negative items are accurate,
              contact the bank that reported them and pay off any outstanding balances. Get written confirmation of payment.
              Some banks will then request removal from ChexSystems, which can improve your chances at other institutions.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Step 5: Try second-chance banks.</strong> Several banks explicitly offer
              second-chance checking accounts designed for people with ChexSystems records. These accounts may have higher fees
              or fewer features, but they allow you to rebuild your banking history. After 12 months of good standing, you can
              often upgrade to a standard account.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Step 6: Try applying in-branch.</strong> Some people report better success when
              applying for bank accounts in person rather than online. Branch employees sometimes have more discretion to override
              ChexSystems denials, especially for minor or old items. This is not guaranteed, but it is worth trying if the online
              application was denied.
            </p>
          </div>
        </section>

        {/* Freeze / Unfreeze */}
        <section id="freeze-unfreeze" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How to Freeze and Unfreeze Your ChexSystems Report</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              A security freeze on your ChexSystems report prevents banks from accessing it. This is useful if you want
              to protect yourself from identity theft — someone cannot open a fraudulent bank account in your name if the
              bank cannot pull your ChexSystems report.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              To place a freeze, contact ChexSystems directly at <span style={{ color: "#0d7c5f" }}>800-428-9623</span> or
              submit a request through their website. You will receive a PIN that you will need to temporarily lift or
              permanently remove the freeze later. Keep this PIN somewhere safe.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Important for bank bonus hunters:</strong> If your ChexSystems report is
              frozen, most banks will be unable to process your application and will deny you by default. You must temporarily
              lift the freeze before applying for any new bank account. You can lift the freeze for a specific bank or for
              a specific time period (for example, one week while you submit applications). Once you are done applying,
              re-freeze your report.
            </p>
            <p style={{ margin: 0 }}>
              Placing and lifting a ChexSystems freeze is free under federal law. There is no cost and no limit on how
              many times you can freeze and unfreeze. The freeze typically takes effect within one business day, and lifting
              it is usually processed within the same timeframe.
            </p>
          </div>
        </section>

        {/* Early Warning Services */}
        <section id="early-warning-services" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>Early Warning Services (EWS): The Other Screening System</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              ChexSystems is not the only banking verification system. Early Warning Services (EWS) is a separate consumer
              reporting agency that performs a similar function. EWS is co-owned by seven major banks: Bank of America,
              BB&T (now Truist), Capital One, JPMorgan Chase, PNC, U.S. Bank, and Wells Fargo.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              Like ChexSystems, EWS tracks negative banking activity — closed accounts, fraud, unpaid balances. A bank may
              check ChexSystems, EWS, or both when you apply for a new account. Having a clean ChexSystems report does not
              guarantee you will pass an EWS check, and vice versa.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              You have the same FCRA rights with EWS as you do with ChexSystems. You can request a free annual report from
              Early Warning Services at <span style={{ color: "#0d7c5f" }}>earlywarning.com</span> or by calling{" "}
              <span style={{ color: "#0d7c5f" }}>800-325-7775</span>. If you were denied a bank account and the adverse
              action notice mentions Early Warning Services, pull your EWS report in addition to your ChexSystems report.
            </p>
            <p style={{ margin: 0 }}>
              EWS is less widely discussed in the bonus hunting community because fewer institutions rely on it exclusively.
              However, given that its owner-banks include Chase, Wells Fargo, and Capital One — three of the most popular
              bonus targets — it is worth checking your EWS report at least once to make sure there are no surprises.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 20px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>{faq.q}</h3>
                <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stacks OS CTA */}
        <div style={{ marginTop: 40, padding: "24px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Track Your Bank Bonuses With Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Keep track of which bonuses you are working on, what is next in your pipeline, and your total earnings across
            all banks. Stacks OS helps you stay organized as you work through checking and savings bonuses.
          </p>
          <Link href="/" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Try Stacks OS &rarr;
          </Link>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 20, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: ChexSystems Explained for Bank Bonus Hunters</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel walks through ChexSystems, bank sensitivity levels, and strategies for getting approved even with negative marks on his YouTube channel.
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
            <Link href="/" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
