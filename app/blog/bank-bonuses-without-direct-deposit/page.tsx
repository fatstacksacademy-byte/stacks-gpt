import type { Metadata } from "next"
import Link from "next/link"
import { bonuses } from "@/lib/data/bonuses"
import { savingsBonuses } from "@/lib/data/savingsBonuses"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const CANONICAL = `${BASE}/blog/bank-bonuses-without-direct-deposit`

export const metadata: Metadata = {
  title: "Bank Bonuses Without Direct Deposit (2026) - Live List",
  description: "Every active bank bonus that does not require direct deposit, updated live from our bonus catalog. Earn hundreds without a W-2 paycheck. Strategy, push-DD workarounds, and bank-by-bank notes for 2026.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    title: "Bank Bonuses Without Direct Deposit (2026) - Live List",
    description: "Every active bank bonus that does not require direct deposit. Self-employed, retired, or between jobs? This list is for you.",
    url: CANONICAL,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Bank Bonuses Without Direct Deposit (2026)" },
  keywords: [
    "bank bonuses without direct deposit", "no direct deposit bank bonus",
    "bank bonus no DD", "checking bonus without direct deposit",
    "savings bonus no direct deposit", "bank bonus for self-employed",
    "bank bonus without W-2", "bank bonus ACH push", "push direct deposit",
    "Fidelity direct deposit trick", "what counts as direct deposit",
    "easy bank bonuses 2026", "no-DD checking bonus list",
    "self-funded bank bonus", "bonus without payroll",
  ],
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

type Row = {
  key: string
  bank: string
  bonus: number
  mainRequirement: string
  cooldown: string
  slug: string
  stateNote: string | null
}

const faqs = [
  {
    q: "Why do some bank bonuses not require direct deposit?",
    a: "Banks use direct deposit as a signal that you are a 'real' primary customer — someone likely to stick around and use the account long-term. But many smaller banks, credit unions, and promotional offers instead require debit card transactions, a minimum opening deposit, or simply opening the account. These banks get their value from fees, debit interchange, and upsells instead of insisting on payroll routing.",
  },
  {
    q: "Does an opening deposit or minimum balance count as meeting the bonus?",
    a: "Only if the bonus explicitly says so. For offers where the main requirement is an opening deposit or maintained balance (several credit union and savings offers), funding the account and holding the balance is enough. For offers that separately list 'direct deposit required,' the opening deposit does not satisfy the DD requirement on its own.",
  },
  {
    q: "Is it legal to earn bank bonuses without a traditional job or direct deposit?",
    a: "Yes. Bank bonuses are legal promotional offers. Banks do not require proof of employment, and there is no rule that you must have a W-2 job. The only restriction is whatever is printed in the terms of the specific offer — such as residency, minimum age, or a cooldown from prior accounts at the same bank.",
  },
  {
    q: "Are no-DD bank bonuses worth the effort?",
    a: "For churners without traditional payroll, they are some of the highest-return offers available. A $300 bonus for opening an account, making a few debit purchases, and holding a small balance for 60-90 days can translate to an effective annualized return in the triple digits. The trade-off is that no-DD offers tend to be smaller on average ($100-$400) than the biggest bonuses at Chase or BMO, which require real direct deposit.",
  },
  {
    q: "Which bank should I start with if I have no W-2 paycheck?",
    a: "Start with a nationwide offer that requires only an opening deposit or a small number of debit transactions — that way you can evaluate the process without being locked out by state restrictions. Once you've completed one, look at state-specific credit union offers in your region, which often have the easiest requirements in the catalog.",
  },
  {
    q: "What is a 'push direct deposit' and does it count?",
    a: "A push DD is an ACH transfer you originate from a brokerage or external bank that some banks classify as a direct deposit. Fidelity Cash Management, Schwab brokerage, Ally, SoFi, and certain fintechs are known to push as DD at many receiving banks. It is not guaranteed — each bank's fraud models differ — but it is the standard workaround when a bonus technically requires DD and you don't have payroll to route.",
  },
  {
    q: "How long do these offers take to pay out?",
    a: "Most no-DD checking bonuses post within 30-60 days of meeting the requirement. Savings bonuses typically require holding the deposit for 60-120 days before the bonus is credited. Each listing in our catalog has a 'bonus posting days' estimate in the detailed review.",
  },
  {
    q: "Can I stack multiple no-DD bonuses at the same time?",
    a: "Yes, and this is the main strategy for bonus hunters without payroll. Because none of these offers require DD, you can open several in parallel — subject to each bank's own cooldown and eligibility rules. ChexSystems inquiries and state residency restrictions are the practical limits, not the offers themselves.",
  },
  {
    q: "Do savings bonuses require direct deposit?",
    a: "Almost never. Savings bonuses are structured around depositing net-new money and holding it through a maintenance period. There is no payroll routing involved — the required action is an external transfer, which you fund from any source. This makes savings bonuses ideal if you have cash to park but no recurring paycheck.",
  },
  {
    q: "What happens if I open a no-DD account and just never use it?",
    a: "You won't earn the bonus. Even bonuses that don't require DD usually require some activity — a minimum number of debit purchases, bill pay enrollments, or a sustained balance. Read the requirement carefully and complete it within the stated window. After the bonus posts and any minimum-open period passes, you can close the account fee-free at most of the banks on this list.",
  },
]

export default function BankBonusesWithoutDirectDeposit() {
  // Build-time filter: active checking bonuses that do NOT require direct deposit
  const checkingRows: Row[] = (bonuses as any[])
    .filter(b => !b.expired)
    .filter(b => b.requirements && b.requirements.direct_deposit_required === false)
    .sort((a, b) => (b.bonus_amount || 0) - (a.bonus_amount || 0))
    .map(b => {
      const bankShort = b.bank_name.split("(")[0].trim()
      const slug = slugify(`${bankShort}-${b.bonus_amount}-checking-bonus`)
      const req = b.requirements || {}
      const parts: string[] = []
      if (req.min_opening_deposit) parts.push(`${money(req.min_opening_deposit)} opening`)
      if (req.debit_transactions_required) parts.push(`${req.debit_transactions_required} debit txns`)
      if (req.billpay_required) parts.push(`${req.billpay_required} bill pay`)
      if (req.min_balance) parts.push(`${money(req.min_balance)} balance`)
      if (req.holding_period_days) parts.push(`hold ${req.holding_period_days}d`)
      const mainRequirement = parts.length
        ? parts.join(" + ")
        : (req.other_requirements_text ? req.other_requirements_text.slice(0, 60) + "…" : "Open account")
      const cooldown = b.cooldown_months ? `${b.cooldown_months} mo` : "None"
      const stateNote = b.eligibility?.state_restricted && Array.isArray(b.eligibility?.states_allowed) && b.eligibility.states_allowed.length
        ? b.eligibility.states_allowed.slice(0, 6).join(", ") + (b.eligibility.states_allowed.length > 6 ? "+" : "")
        : null
      return {
        key: b.id,
        bank: bankShort,
        bonus: b.bonus_amount,
        mainRequirement,
        cooldown,
        slug,
        stateNote,
      }
    })

  // Savings bonuses: none of them use a DD requirement — they all use deposit + hold.
  // Include active ones with a clear single-tier headline we can link to.
  const savingsRows: Row[] = savingsBonuses
    .filter(b => !b.expired)
    .map(b => {
      const bankShort = b.bank_name.split("(")[0].trim()
      const maxTier = b.tiers[b.tiers.length - 1]
      const minTier = b.tiers[0]
      const slug = slugify(`${bankShort}-${maxTier.bonus_amount}-savings-bonus`)
      const mainRequirement =
        `Deposit ${money(minTier.min_deposit)}+ · hold ${b.maintenance_days}d`
      const cooldown = b.cooldown_months ? `${b.cooldown_months} mo` : "None"
      return {
        key: b.id,
        bank: bankShort,
        bonus: maxTier.bonus_amount,
        mainRequirement,
        cooldown,
        slug,
        stateNote: null,
      }
    })
    .sort((a, b) => b.bonus - a.bonus)

  const totalRows = checkingRows.length + savingsRows.length

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Bank Bonuses Without Direct Deposit (2026)",
        description: "Live list of every active bank bonus that does not require direct deposit, with strategy, push-DD workarounds, and FAQs.",
        url: CANONICAL,
        datePublished: "2026-04-22",
        dateModified: "2026-04-22",
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: "Bank Bonuses Without Direct Deposit", item: CANONICAL },
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

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>Bank Bonuses Without Direct Deposit</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
          Bank Bonuses Without Direct Deposit (2026)
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 22, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 680 }}>
          If you are self-employed, retired, between jobs, or just refuse to reroute your paycheck every 60 days,
          most bank-bonus lists are useless — they are almost entirely offers that require direct deposit.
          This page is the opposite: a live, build-time-filtered list of every active checking and savings
          bonus in our catalog where the requirement is <strong>not</strong> payroll DD. Open an account,
          deposit some cash, make a few debit purchases, and collect the bonus.
        </p>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 680 }}>
          The table below is generated from the same data that powers every individual review on this site.
          When an offer expires or a new no-DD promotion launches, this page updates automatically on the
          next deploy — no stale lists, no affiliate-driven ordering.
        </p>

        {/* Table of Contents */}
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "20px 24px", marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>In This Guide</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "No-DD Checking Bonuses (Live Table)", id: "checking-table" },
              { label: "No-DD Savings Bonuses", id: "savings-table" },
              { label: "Strategy: How to Actually Use This List", id: "strategy" },
              { label: "Push-DD Workarounds for Bonuses That Still Require DD", id: "push-dd" },
              { label: "FAQ", id: "faq" },
            ].map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none" }}>{item.label}</a>
            ))}
          </div>
        </div>

        {/* Count callout */}
        <div style={{ marginBottom: 32, padding: "14px 18px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 10, fontSize: 14, color: "#0d5a45" }}>
          <strong style={{ color: "#0d7c5f" }}>{totalRows} active offers</strong> on this page right now —{" "}
          {checkingRows.length} checking and {savingsRows.length} savings. Rebuilt on every deploy from{" "}
          <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 12, color: "#0d7c5f" }}>lib/data/bonuses.ts</code>.
        </div>

        {/* Checking Table */}
        <section id="checking-table" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>No-DD Checking Bonuses</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 20px" }}>
            Every active checking bonus where{" "}
            <code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 4, fontSize: 12, color: "#0d7c5f" }}>requirements.direct_deposit_required === false</code>.
            Sorted by bonus amount, descending. Click any row for the full review with fees, ChexSystems notes, and step-by-step instructions.
          </p>

          {checkingRows.length === 0 ? (
            <div style={{ padding: "20px", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, fontSize: 14, color: "#777" }}>
              No active no-DD checking offers at the moment. Check the{" "}
              <Link href="/blog/best-checking-bonuses-2026" style={{ color: "#0d7c5f" }}>best checking bonuses</Link> page
              and the push-DD workarounds below.
            </div>
          ) : (
            <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr 2fr 0.7fr 0.8fr", padding: "12px 16px", background: "#fafafa", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f0f0f0" }}>
                <div>Bank</div>
                <div>Bonus</div>
                <div>Main requirement</div>
                <div>Cooldown</div>
                <div style={{ textAlign: "right" }}>Review</div>
              </div>
              {checkingRows.map((row, i) => (
                <Link key={row.key} href={`/blog/${row.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 0.7fr 2fr 0.7fr 0.8fr",
                    padding: "14px 16px",
                    borderBottom: i === checkingRows.length - 1 ? "none" : "1px solid #f5f5f5",
                    fontSize: 14,
                    alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111" }}>{row.bank}</div>
                      {row.stateNote && (
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{row.stateNote}</div>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: "#0d7c5f" }}>{money(row.bonus)}</div>
                    <div style={{ color: "#666", fontSize: 13 }}>{row.mainRequirement}</div>
                    <div style={{ color: "#888", fontSize: 13 }}>{row.cooldown}</div>
                    <div style={{ textAlign: "right", color: "#0d7c5f", fontSize: 13, fontWeight: 600 }}>Review &rarr;</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, color: "#999", marginTop: 12, lineHeight: 1.6 }}>
            <strong style={{ color: "#555" }}>⚠️ Note:</strong> &ldquo;No DD required&rdquo; is not the same as &ldquo;no requirements.&rdquo;
            Most of these offers still require debit purchases, a minimum opening deposit, or a sustained
            balance. Click into each review before applying — I flag the gotchas (state restrictions,
            in-branch-only applications, ChexSystems sensitivity) in every listing.
          </p>
        </section>

        {/* Savings Table */}
        <section id="savings-table" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>No-DD Savings Bonuses</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 20px" }}>
            Savings bonuses effectively never require direct deposit — the structure is always{" "}
            <em>deposit net-new money, hold it for X days, get paid</em>. If you have cash sitting in a
            low-yield account, these offers convert it to free money without any payroll shuffling.
          </p>

          {savingsRows.length === 0 ? (
            <div style={{ padding: "20px", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, fontSize: 14, color: "#777" }}>
              No active savings bonuses in the catalog right now.
            </div>
          ) : (
            <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr 2fr 0.7fr 0.8fr", padding: "12px 16px", background: "#fafafa", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f0f0f0" }}>
                <div>Bank</div>
                <div>Max Bonus</div>
                <div>Main requirement</div>
                <div>Cooldown</div>
                <div style={{ textAlign: "right" }}>Review</div>
              </div>
              {savingsRows.map((row, i) => (
                <Link key={row.key} href={`/blog/${row.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 0.7fr 2fr 0.7fr 0.8fr",
                    padding: "14px 16px",
                    borderBottom: i === savingsRows.length - 1 ? "none" : "1px solid #f5f5f5",
                    fontSize: 14,
                    alignItems: "center",
                  }}>
                    <div style={{ fontWeight: 700, color: "#111" }}>{row.bank}</div>
                    <div style={{ fontWeight: 800, color: "#0d7c5f" }}>{money(row.bonus)}</div>
                    <div style={{ color: "#666", fontSize: 13 }}>{row.mainRequirement}</div>
                    <div style={{ color: "#888", fontSize: 13 }}>{row.cooldown}</div>
                    <div style={{ textAlign: "right", color: "#0d7c5f", fontSize: 13, fontWeight: 600 }}>Review &rarr;</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <p style={{ fontSize: 13, color: "#999", marginTop: 12, lineHeight: 1.6 }}>
            For the full ranked savings list including effective APY calculations, see{" "}
            <Link href="/blog/best-savings-bonuses-2026" style={{ color: "#0d7c5f" }}>Best Savings Bonuses of 2026</Link>.
          </p>
        </section>

        {/* Strategy */}
        <section id="strategy" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>Strategy: How to Actually Use This List</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              If you have no W-2 and you want to stack bank bonuses, you need a different playbook than the
              churners who route their paycheck around every 90 days. Here is how I actually run it.
            </p>

            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>1. Self-fund with ACH transfers, not payroll.</strong> The offers in
              the checking table above only ask you to open the account, maybe make a few debit purchases,
              and sometimes hold a small balance. Fund the account by pushing an ACH transfer from an
              existing high-yield savings account. You never need a paycheck.
            </p>

            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>2. Run a round-robin of debit-transaction offers.</strong> For bonuses
              that require, for example, 10-20 debit purchases, use one primary debit card for small everyday
              spend (gas, coffee, gas station splits at the pump) until you hit the requirement, then rotate to
              the next bank. A single grocery run split into 5 self-checkout transactions can knock out most
              debit-count requirements in one afternoon.
            </p>

            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>3. Stack state-specific credit union offers.</strong> Several rows
              in the table above are region-locked (MO/IL, IA/IL/WI, etc). If you live in those states, those
              are your highest-value-per-hour bonuses — small institutions have almost no competition for them
              and the requirements are minimal.
            </p>

            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>4. Watch the cooldowns.</strong> Some banks (Capital One, TD, BMO,
              Citi) have 12-36 month lockouts after a prior bonus. The cooldown column tells you whether the bank
              is one-and-done for the year or a repeatable target. Build your sequence so you trigger the longest
              cooldowns first — you want the 36-month cooldown clocks started immediately.
            </p>

            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>5. Layer in savings bonuses for your idle cash.</strong> The
              savings offers in the second table are the single best use of an emergency fund or tax-reserve cash.
              You deposit money you were going to hold anyway, earn 3-4% APY <em>plus</em> a cash bonus on top, and
              withdraw after the maintenance window.
            </p>
          </div>
        </section>

        {/* Push DD */}
        <section id="push-dd" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>
            Push-DD Workarounds for Bonuses That Still Require DD
          </h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              The no-DD list above is solid but finite. If you want access to the bigger nationwide bonuses
              (Chase $400, Wells Fargo $400, BMO $600), you have to solve the direct-deposit problem without
              a paycheck. The answer is a <strong>push DD</strong> — an ACH transfer you originate yourself from
              a source the receiving bank classifies as a direct deposit.
            </p>
            <p style={{ margin: "0 0 16px" }}>
              For the full list of what is and isn&apos;t treated as DD, see{" "}
              <Link href="/blog/what-counts-as-direct-deposit" style={{ color: "#0d7c5f" }}>
                What Counts as Direct Deposit for Bank Bonuses
              </Link>. The short version is below.
            </p>

            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 10 }}>Sources that reliably push as DD</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong style={{ color: "#111" }}>Fidelity Cash Management (CMA).</strong> The gold standard.
                  A Fidelity CMA ACH transfer is coded as a direct deposit at almost every bank that accepts push
                  DDs. Works at Chase, Wells Fargo, US Bank, Citi, PNC, SoFi, Discover, Truist, and most regionals.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong style={{ color: "#111" }}>Charles Schwab brokerage ACH.</strong> Similar to Fidelity.
                  Transfer out of a Schwab One brokerage account and it typically codes as DD. Slightly less consistent
                  than Fidelity but still widely accepted.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong style={{ color: "#111" }}>Ally Bank ACH push.</strong> Ally pushes are commonly accepted
                  as DD at Chase, Citi, US Bank, BMO, and Huntington. Not accepted at Wells Fargo, Truist, or TD.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: "#111" }}>SoFi Money transfers.</strong> SoFi pushes are treated as DD
                  at Chase, PNC, Citi, and several others. Don&apos;t rely on SoFi alone — keep a Fidelity backup
                  ready in case the specific bank rejects it.
                </p>
              </div>
            </div>

            <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#9a3412", marginBottom: 6 }}>⚠️ Note: push DDs are not a guarantee</div>
              <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.7 }}>
                Banks change their DD-detection logic without notice. A push that worked last quarter might
                fail this quarter. When a bonus is on the line, push <em>early</em> in the window so you have
                time to try a second source if the first doesn&apos;t code correctly. Always check the posted
                transaction in online banking — a real DD typically shows up as &ldquo;ACH Credit — [Source] DIRECT DEP&rdquo;
                rather than just &ldquo;ACH Transfer.&rdquo;
              </div>
            </div>

            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Banks that almost always accept push DDs:</strong> Chase, Citi,
              PNC, US Bank, Huntington, BMO, SoFi, Discover. If a bonus requires DD at one of these, Fidelity or
              Schwab will almost certainly satisfy it.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Banks that are inconsistent:</strong> Wells Fargo, Capital One,
              Truist, TD, KeyBank. Community reports are mixed. Fidelity is the most likely to work, but confirm
              with a small-dollar test push before committing the full bonus amount.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Banks where push DD rarely works:</strong> Bank of America, most
              brokerage-heavy fintechs, and a handful of smaller credit unions with strict ACH classification.
              For these, there is no real workaround — either you have actual payroll or you skip the bonus.
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

        {/* Conclusion + CTAs */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>The Bottom Line</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px" }}>
              You do not need a traditional paycheck to earn bank bonuses. The live table above gives you
              every active offer that skips the DD requirement entirely, and the push-DD playbook opens up
              the rest of the catalog — Chase, Wells Fargo, BMO — even if you are self-employed or retired.
            </p>
            <p style={{ margin: 0 }}>
              Start with one no-DD offer from the table to validate your workflow, then layer in savings
              bonuses for your idle cash and push-DD offers for the big nationwide banks. Done seriously,
              this is four figures a year of nearly risk-free income.
            </p>
          </div>
        </section>

        {/* Stacks OS CTA */}
        <div style={{ marginTop: 32, padding: "24px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Track Every Bonus in One Place</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Stacks OS tracks which bonuses you are working on, when each deadline hits, and how much you
            have earned across every bank. Built specifically for people who run 5-10 bonuses in parallel.
          </p>
          <Link href="/stacksos" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Try Stacks OS &rarr;
          </Link>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 20, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: Bank Bonuses Without a W-2</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel walks through his actual no-DD bonus stack — which banks he hit first, how he pushes
            DDs from Fidelity, and how much he earned last year without a traditional paycheck.
          </p>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#ff0000", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>&larr; Best checking bonuses</Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>Best savings bonuses &rarr;</Link>
          <Link href="/blog/what-counts-as-direct-deposit" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>What counts as DD &rarr;</Link>
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
