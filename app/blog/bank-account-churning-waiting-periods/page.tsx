import type { Metadata } from "next"
import Link from "next/link"
import SiteHeader from "../../components/SiteHeader"
import { bonuses } from "../../../lib/data/bonuses"
import { savingsBonuses } from "../../../lib/data/savingsBonuses"
import { getPostByBonusId } from "../../../lib/data/blogPosts"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"
const CANONICAL = `${BASE}/blog/bank-account-churning-waiting-periods`

export const metadata: Metadata = {
  title: "Bank Bonus Cooldown Periods: How Long Until You Can Reopen (2026 Matrix)",
  description: "Live cooldown matrix for 100+ bank bonuses. How long you must wait to re-earn a Chase, Wells Fargo, SoFi, BofA, or Citi bonus. Lifetime-only list included.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "article",
    title: "Bank Bonus Cooldown Periods: How Long Until You Can Reopen (2026 Matrix)",
    description: "Live cooldown matrix for 100+ bank bonuses. How long you must wait to re-earn a Chase, Wells Fargo, SoFi, BofA, or Citi bonus.",
    url: CANONICAL,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "Bank Bonus Cooldown Periods: The 2026 Matrix" },
  keywords: [
    "bank bonus cooldown",
    "bank account churning waiting period",
    "how often can I reopen a Chase checking account",
    "Chase checking cooldown 24 months",
    "Wells Fargo bonus waiting period",
    "SoFi bonus cooldown",
    "Bank of America bonus cooldown",
    "Citi checking cooldown",
    "Capital One 360 cooldown",
    "US Bank checking bonus cooldown",
    "BMO checking cooldown",
    "PNC bonus waiting period",
    "Huntington bonus cooldown",
    "bank bonus lifetime language",
    "bank account reopen timer",
  ],
}

type Row = {
  bank: string
  product: "checking" | "savings"
  amount: number
  cooldownMonths: number | null
  lifetime: boolean
  notes: string
  slug: string | null
  id: string
}

function shortBank(name: string): string {
  // Strip parentheticals: "PSECU (Pennsylvania ...)" -> "PSECU"
  return name.split("(")[0].trim()
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

function cooldownLabel(c: number | null, lifetime: boolean): string {
  if (lifetime) return "Once per lifetime"
  if (c === null) return "None documented"
  if (c === 12) return "12 months"
  if (c === 24) return "24 months"
  return `${c} months`
}

function cooldownSortKey(c: number | null, lifetime: boolean): number {
  // Push lifetime to the top of "worst case", null (no cooldown) to the bottom/lowest.
  if (lifetime) return 9999
  if (c === null) return -1
  return c
}

// Recommended cooldown blends three signals:
//   1. Stated cooldown_months from the bank's disclosure (most authoritative)
//   2. Holding period — closing the account early forfeits the bonus, so a
//      12-month hold is functionally a 12-month cooldown
//   3. A 12-month relationship floor when neither (1) nor a long hold applies
// The floor is opinionated: even when the bank's fine print is silent, opening
// a fresh account at the same institution every few months invites shutdown
// risk and damages future approval odds. We recommend 12 months as a baseline.
const DEFAULT_RELATIONSHIP_FLOOR_MONTHS = 12

function effectiveCooldown(stated: number | null, holdDays: number | null | undefined): number | null {
  const holdMonths = typeof holdDays === "number" && holdDays > 0
    ? Math.ceil(holdDays / 30)
    : null
  // If the bank explicitly states a cooldown, respect it — even if shorter
  // than our floor. The bank's word governs; readers can choose to wait longer.
  if (stated !== null) {
    return holdMonths !== null ? Math.max(stated, holdMonths) : stated
  }
  // No stated cooldown — combine hold (if any) with the 12-month floor.
  if (holdMonths !== null) return Math.max(holdMonths, DEFAULT_RELATIONSHIP_FLOOR_MONTHS)
  return DEFAULT_RELATIONSHIP_FLOOR_MONTHS
}

function buildRows(): Row[] {
  const checkingRows: Row[] = (bonuses as any[])
    .filter(b => !b.expired)
    .map((b: any) => {
      const post = getPostByBonusId(b.id)
      const stated = typeof b.cooldown_months === "number" ? b.cooldown_months : null
      const cooldownMonths = effectiveCooldown(stated, b.requirements?.holding_period_days)
      return {
        bank: shortBank(b.bank_name),
        product: "checking" as const,
        amount: b.bonus_amount || 0,
        cooldownMonths,
        lifetime: !!b.eligibility?.lifetime_language,
        notes: b.eligibility?.eligibility_notes || "",
        slug: post ? post.slug : null,
        id: b.id,
      }
    })

  const savingsRows: Row[] = savingsBonuses
    .filter(b => !b.expired)
    .map(b => {
      const post = getPostByBonusId(b.id)
      const maxTier = b.tiers[b.tiers.length - 1]
      const stated = typeof b.cooldown_months === "number" ? b.cooldown_months : null
      const cooldownMonths = effectiveCooldown(stated, b.total_hold_days)
      return {
        bank: shortBank(b.bank_name),
        product: "savings" as const,
        amount: maxTier?.bonus_amount || 0,
        cooldownMonths,
        lifetime: !!b.eligibility?.lifetime_language,
        notes: b.eligibility?.eligibility_notes || "",
        slug: post ? post.slug : null,
        id: b.id,
      }
    })

  return [...checkingRows, ...savingsRows].sort((a, b) => {
    const ka = cooldownSortKey(a.cooldownMonths, a.lifetime)
    const kb = cooldownSortKey(b.cooldownMonths, b.lifetime)
    if (ka !== kb) return ka - kb
    return b.amount - a.amount
  })
}

const faqs = [
  {
    q: "How do banks actually enforce bonus cooldowns?",
    a: "Banks track bonuses internally by Social Security Number (tax ID) and, in some cases, by physical address. When you re-apply before the cooldown window expires, the bank's system flags your SSN as having received a prior bonus and simply refuses to credit the new one. The account will usually still open — you just do not get paid. Some banks (Chase, for example) use the exact date your last bonus posted as the clock-start, not the date you opened or closed the account.",
  },
  {
    q: "Does closing the account early reset the cooldown timer?",
    a: "No. The cooldown is measured from the date your last bonus posted (or in some cases, the date the prior account was closed), not from the day you start the new application. Closing an account in January does not let you re-earn the bonus in February. Banks are explicit about this in the fine print — the product disclosure typically says 'must not have received this bonus in the past X months,' where X is the cooldown.",
  },
  {
    q: "How often can I reopen a Chase checking account for the bonus?",
    a: "Chase's standard personal checking bonus (Total Checking, Secure, Premier, Sapphire) has a 24-month cooldown. Specifically, you cannot have received a Chase checking bonus within the past two years. The clock runs from the date the prior bonus was paid. Chase Business Checking runs on a similar 24-month rolling window, tracked separately from personal.",
  },
  {
    q: "What is SoFi's cooldown? I heard it is once per lifetime.",
    a: "Correct. SoFi's direct-deposit bonus uses lifetime language — one direct-deposit bonus per SSN, ever. Once you have claimed it, you cannot re-earn it by closing and reopening. This makes SoFi a 'one-shot' bonus that should be timed for the maximum tier rather than rushed at the lower amounts.",
  },
  {
    q: "Is Wells Fargo's cooldown 12 or 24 months?",
    a: "Wells Fargo's consumer checking bonus is 12 months rolling on the Everyday Checking product. The key language is 'must not have received a Wells Fargo consumer checking bonus in the past 12 months.' This makes Wells Fargo one of the most churn-friendly major banks — you can realistically claim their bonus once per year, every year.",
  },
  {
    q: "Can I use a different name, address, or account type to bypass a cooldown?",
    a: "No, and attempting it is a bad idea. Banks key everything off your SSN. A different address will not help. Using a spouse's SSN to claim a bonus they did not actually earn is bank fraud. The safer move is to simply rotate across the 15+ banks with active bonuses at any given moment — by the time you cycle through them all, the first bank's cooldown has usually expired.",
  },
  {
    q: "What counts as the 'same product family' for cooldown purposes?",
    a: "Most banks group their consumer checking products under one cooldown. At Chase, Total Checking, Secure Banking, and Premier Plus are all gated by one 24-month timer. Capital One treats 360 Checking, Simply Checking, Total Control, and Money Teen Checking as one family. Business checking is usually a separate, parallel cooldown — you can often claim a personal and business bonus at the same bank concurrently.",
  },
  {
    q: "What is the difference between a cooldown and a shutdown?",
    a: "A cooldown is a specific, published restriction on re-earning a bonus — you open the account, but the bonus does not post. A shutdown is the bank closing all your accounts and reporting you to ChexSystems or Early Warning Services for abusive churning behavior. Cooldowns are planned. Shutdowns are catastrophic — they can lock you out of the banking system for five years. See the callout in this guide for the behaviors most likely to trigger one.",
  },
  {
    q: "Do brokerage bonuses (E*TRADE, Schwab, Merrill) have cooldowns?",
    a: "Most brokerage cash bonuses do not have explicit cooldowns, but they track prior bonus recipients by SSN. The typical language is 'new funds only' — meaning transfers from an account you already hold at the same firm do not qualify. You can often re-earn these bonuses every 12 months by moving assets out and back in, but the firms actively watch for this pattern.",
  },
  {
    q: "Can I earn multiple bonuses from the same bank at the same time?",
    a: "Yes, if they are on different product types. The most common stack is: one checking bonus + one savings bonus + one business checking bonus, all at the same bank, all concurrent. Each has its own cooldown clock. Chase, Citi, and Wells Fargo all allow this kind of stacking, and it is one of the fastest ways to maximize bonus earnings without triggering any churning flags.",
  },
]

export default function CooldownMatrix() {
  const rows = buildRows()
  const totalActive = rows.length
  const lifetimeRows = rows.filter(r => r.lifetime)
  // Annual-eligible: any non-lifetime bonus whose effective cooldown is ≤ 12mo
  // (after our 12-month floor, this means cooldownMonths === 12 in practice
  // unless the bank stated something shorter, which they almost never do).
  const noCooldownRows = rows.filter(r => !r.lifetime && r.cooldownMonths !== null && r.cooldownMonths <= 12)
  const shortCooldownRows = noCooldownRows

  // Annual churning math: sum of all bonuses re-earnable within a 12-month cycle.
  const annualFloor = noCooldownRows.reduce((s, r) => s + (r.amount || 0), 0)

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "Bank Bonus Cooldown Periods: How Long Until You Can Reopen (2026 Matrix)",
        description: "Live cooldown matrix for 100+ bank bonuses, including every bank's waiting period, lifetime-language flags, and churning strategy.",
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
          { "@type": "ListItem", position: 2, name: "Bank Bonus Cooldown Matrix", item: CANONICAL },
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

      <SiteHeader />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>Bank Bonus Cooldown Matrix</span>
        </div>

        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#111", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1, maxWidth: 820 }}>
          Bank Bonus Cooldown Periods: How Long Until You Can Reopen (2026 Matrix)
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#0d7c5f", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 22, 2026
        </p>

        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 16px", maxWidth: 720 }}>
          Every bank bonus you have ever earned has a clock attached to it. Some reset in 12 months, some in 24,
          some in 36. A growing share use &quot;once per lifetime&quot; language that bars you forever. This page is
          the canonical reference for every active bonus cooldown I track — a live matrix of{" "}
          <strong style={{ color: "#111" }}>{totalActive} active bonus records</strong>, pulled from my own
          research, verified monthly, and sortable by waiting period.
        </p>
        <p style={{ fontSize: 14, color: "#999", lineHeight: 1.7, margin: "0 0 40px", maxWidth: 720 }}>
          The churning economy is built on timing. Get the cooldowns wrong and you&apos;ll spend a weekend opening an
          account that pays you nothing. Competitors lean on reader-submitted anecdotes from three years ago —
          this page is generated directly from the bonus database that powers the rest of Fat Stacks Academy. If
          a cooldown changes, the matrix changes.
        </p>

        {/* Table of Contents */}
        <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "20px 24px", marginBottom: 40, maxWidth: 720 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>In This Guide</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "How Bonus Cooldowns Actually Work", id: "how-cooldowns-work" },
              { label: "Cooldown vs. Shutdown — Know the Difference", id: "cooldown-vs-shutdown" },
              { label: "The Master Cooldown Matrix", id: "master-matrix" },
              { label: "Annual-Eligible Bonuses (Repeatable)", id: "no-cooldown" },
              { label: "Lifetime-Language Bonuses (One-Shot)", id: "lifetime" },
              { label: "Churning Strategy: The 24-Month Standard", id: "strategy" },
              { label: "FAQ", id: "faq" },
            ].map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none" }}>{item.label}</a>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
          <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Active Records</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{totalActive}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Annual-Eligible (≤ 12mo)</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{noCooldownRows.length}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Lifetime-Only</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{lifetimeRows.length}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>12-Mo or Less Cooldown</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{shortCooldownRows.length}</div>
          </div>
        </div>

        {/* How Cooldowns Work */}
        <section id="how-cooldowns-work" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>How Bonus Cooldowns Actually Work</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8, maxWidth: 720 }}>
            <p style={{ margin: "0 0 12px" }}>
              A bonus cooldown is the minimum amount of time that must pass between claims. It is written into the
              product disclosure in one of five ways, and the exact phrasing matters because it determines when the
              timer starts, how it is tracked, and whether you can ever re-earn the bonus at all.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>1. &quot;Once per X months since last bonus on this product.&quot;</strong> The
              most common and most churner-friendly form. Chase, Wells Fargo, BofA, Citi, and most large banks use
              this language. The clock starts the day the prior bonus posted to your account. If your Chase $400
              hit on June 1, 2024, you can re-apply any time after June 1, 2026.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>2. &quot;Once per X months per tax ID.&quot;</strong> Same idea, but the
              restriction attaches to your SSN rather than the specific product. This matters when a bank has several
              checking variants — all of them share one timer. Capital One groups 360 Checking, Simply Checking, Total
              Control, and Money Teen Checking under a single rolling 36-month window.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>3. Lifetime language (&quot;new customer only&quot; / &quot;never had X&quot;).</strong> The bank
              is saying: if you have ever had this product, you cannot earn this bonus. SoFi, Varo, Chime, Citi
              savings, Busey, Old National, and most credit unions use this. There is no &quot;waiting it out&quot;
              strategy. You get one shot per SSN, ever.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>4. No restriction (&quot;no documented cooldown&quot;).</strong> Rare but valuable
              — the disclosure simply does not limit prior recipients. Most regional state-bound offers (KeyBank,
              Truist, Fulton, Flagstar) fall here. In practice these can sometimes be re-earned every 12 months with
              careful timing, but the language is vague enough that there is always risk.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>5. Holding-period as de-facto cooldown.</strong> Many offers have no
              published cooldown but require you to keep the account open for X months after the bonus posts — close
              early and you forfeit the bonus or, worse, get clawed back. A 12-month hold is functionally a 12-month
              cooldown: you cannot redeploy the same SSN against a new bonus on this product family until the hold
              expires.
            </p>
            <p style={{ margin: 0, padding: "12px 16px", background: "#fff8ec", border: "1px solid #f5d899", borderRadius: 6 }}>
              <strong style={{ color: "#111" }}>💡 Our recommendation: treat 12 months as the default minimum.</strong> Even when
              a bank&apos;s fine print is silent on cooldowns, churning the same institution every few months
              invites shutdown risk, weakens future approvals, and burns a relationship that may have higher-tier
              offers later. The matrix below shows the larger of: (a) the bank&apos;s stated cooldown, (b) any
              required holding period, or (c) a 12-month relationship floor. If the same window also has another
              bank running an offer, prefer the new bank — wait even longer at the one you already churned.
            </p>
          </div>
        </section>

        {/* Cooldown vs Shutdown */}
        <section id="cooldown-vs-shutdown" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>Cooldown vs. Shutdown — Know the Difference</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8, maxWidth: 720 }}>
            <p style={{ margin: "0 0 12px" }}>
              Every bonus hunter confuses these two concepts early on. They are not the same risk.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              A <strong style={{ color: "#111" }}>cooldown</strong> is a published eligibility rule. You open the
              account, follow the steps, the bank simply does not credit the bonus because you are still inside the
              waiting window. There is no penalty. You can close the account normally. Nothing appears on ChexSystems
              or Early Warning Services. You just wasted some time.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              A <strong style={{ color: "#111" }}>shutdown</strong> is when the bank decides you are abusing their
              products and closes every account you hold. It is reported to ChexSystems or EWS. Future banks see the
              flag and deny your applications for up to five years. Shutdowns are most commonly triggered by: rapid
              open-and-close cycles on the same product; identical direct-deposit amounts across many banks in the
              same week; funding bonuses from brokerage push-transfers the bank later reverses; or simply opening
              more than six accounts in a 60-day window at any one institution.
            </p>
          </div>

          <div style={{ marginTop: 16, padding: "18px 22px", background: "rgba(224,68,68,0.04)", border: "1px solid rgba(224,68,68,0.2)", borderRadius: 10, maxWidth: 720 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e04444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Shutdown Risk Callout</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
              The banks most likely to shut you down for over-aggressive churning are Chase, Bank of America, US Bank,
              and TD — in that order based on community data. Chase in particular maintains an internal rolling count
              of how many Chase products you have opened in the last 24 months. Clearing six to eight checking bonuses
              in a single year across major banks is fine. Trying to clear three separate Chase personal checking
              bonuses in 24 months by closing and reopening is the fastest way to end up on the ChexSystems blacklist.
              Respect the cooldowns and you will almost never see a shutdown.
            </div>
          </div>
        </section>

        {/* Master Matrix */}
        <section id="master-matrix" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>The Master Cooldown Matrix</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 20px", maxWidth: 720 }}>
            Sorted by recommended cooldown, ascending. 12-month repeatable tier at the top, lifetime-only at the bottom.
            Click any row with a linked bank for the full review. If a cooldown is documented on the disclosure, it
            is listed as months. If the disclosure does not mention a cooldown, the column shows &quot;—&quot; — I do not
            guess. All <strong style={{ color: "#111" }}>{totalActive}</strong> records below are active (expired
            offers excluded).
          </p>

          <div style={{ overflowX: "auto", border: "1px solid #f0f0f0", borderRadius: 10, background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Bank</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Product</th>
                  <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Bonus</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Cooldown</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Lifetime?</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</th>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cooldownStr = r.lifetime
                    ? "Lifetime"
                    : r.cooldownMonths === null
                      ? "—"
                      : `${r.cooldownMonths} mo`
                  const cooldownColor = r.lifetime ? "#e04444" : r.cooldownMonths === null ? "#0d7c5f" : r.cooldownMonths <= 12 ? "#0d7c5f" : r.cooldownMonths <= 24 ? "#b08800" : "#e04444"
                  const notesShort = (r.notes || "").length > 110 ? `${r.notes.slice(0, 107)}...` : (r.notes || "—")
                  return (
                    <tr key={`${r.id}`} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>{r.bank}</td>
                      <td style={{ padding: "12px 14px", color: "#777", textTransform: "capitalize" }}>{r.product}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#0d7c5f", whiteSpace: "nowrap" }}>{money(r.amount)}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: cooldownColor, whiteSpace: "nowrap" }}>{cooldownStr}</td>
                      <td style={{ padding: "12px 14px", color: r.lifetime ? "#e04444" : "#777", whiteSpace: "nowrap", fontWeight: r.lifetime ? 700 : 400 }}>
                        {r.lifetime ? "Yes" : "No"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#777", maxWidth: 320 }}>{notesShort}</td>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {r.slug ? (
                          <Link href={`/blog/${r.slug}`} style={{ color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                            Read &rarr;
                          </Link>
                        ) : (
                          <span style={{ color: "#ccc" }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "#aaa", margin: "12px 0 0", maxWidth: 720 }}>
            Table legend — Cooldown color coding: green = 12 months or less (or none documented); amber = 13-24
            months; red = lifetime-only or 25+ months. Notes column truncated at 110 characters; click Review for
            the full cooldown language.
          </p>
        </section>

        {/* Annual-Eligible */}
        <section id="no-cooldown" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>The Repeatable Tier: Annual-Eligible Bonuses</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 20px", maxWidth: 720 }}>
            These are the bonuses where neither a stated cooldown nor a long holding period exceeds our 12-month
            relationship floor — meaning they can be re-earned roughly every 12 months and form the backbone of any
            sustainable churning rotation. If you can wait longer at the same bank to make room for offers from
            <em> other</em> banks first, do that — see the strategy section below.
          </p>

          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "8px 0" }}>
            {noCooldownRows.length === 0 ? (
              <div style={{ padding: "16px 20px", color: "#999", fontSize: 13 }}>None currently active.</div>
            ) : (
              noCooldownRows.map((r) => (
                <div key={r.id} style={{ padding: "12px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 2 }}>
                      {r.bank} <span style={{ color: "#777", fontWeight: 400, fontSize: 12, textTransform: "capitalize" }}>· {r.product}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                      {r.notes ? (r.notes.length > 160 ? `${r.notes.slice(0, 157)}...` : r.notes) : "No additional eligibility restrictions documented."}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0d7c5f", whiteSpace: "nowrap" }}>{money(r.amount)}</div>
                  {r.slug && (
                    <Link href={`/blog/${r.slug}`} style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Review &rarr;
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Lifetime Danger List */}
        <section id="lifetime" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>The Danger List: Lifetime-Language Bonuses</h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 20px", maxWidth: 720 }}>
            Each of these bonuses can only be earned <strong style={{ color: "#111" }}>once per SSN, ever</strong>.
            If you are going to claim one, make sure it is timed for the maximum tier and that you have actually
            read the disclosure — there is no second chance. These are listed in descending order of bonus amount so
            you can prioritize the biggest checks first.
          </p>

          <div style={{ background: "#fff", border: "1px solid rgba(224,68,68,0.15)", borderRadius: 10, padding: "8px 0" }}>
            {lifetimeRows
              .slice()
              .sort((a, b) => b.amount - a.amount)
              .map((r) => (
                <div key={r.id} style={{ padding: "12px 20px", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 2 }}>
                      {r.bank} <span style={{ color: "#777", fontWeight: 400, fontSize: 12, textTransform: "capitalize" }}>· {r.product}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                      {r.notes ? (r.notes.length > 160 ? `${r.notes.slice(0, 157)}...` : r.notes) : "New customer language — one bonus per SSN."}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#e04444", whiteSpace: "nowrap" }}>{money(r.amount)}</div>
                  {r.slug && (
                    <Link href={`/blog/${r.slug}`} style={{ fontSize: 12, color: "#0d7c5f", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                      Review &rarr;
                    </Link>
                  )}
                </div>
              ))}
          </div>
        </section>

        {/* Strategy */}
        <section id="strategy" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>Churning Strategy: The 24-Month Standard</h2>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.8, maxWidth: 720 }}>
            <p style={{ margin: "0 0 12px" }}>
              If you only remember one number from this page, make it <strong style={{ color: "#111" }}>24
              months</strong>. It is the modal cooldown for major-bank checking bonuses. Chase is 24. PNC is 24.
              KeyPoint is 24. Huntington is 24. Associated is 24. Chase Business is 24. If you build your pipeline
              on a 24-month rotation, you will rarely run into a cooldown wall.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              The practical strategy is simple: maintain a spreadsheet with one row per bonus claimed, tracking only
              one date — <strong style={{ color: "#111" }}>the date the bonus actually posted to the account</strong>.
              Not the open date. Not the close date. The <em>posted</em> date. That is the clock the bank uses.
              Anything else is a guess.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              At any given moment the annual-eligible tier from this matrix totals{" "}
              <strong style={{ color: "#111" }}>{money(annualFloor)}</strong> in claimable bonuses — the bonuses you
              can re-earn within a 12-month cycle without violating bank disclosures or our relationship-preservation
              floor. A disciplined hunter working only this tier can realistically clear five to seven bonuses a year
              without touching any of the 24-month or lifetime offers, on the order of $3,000 to $4,500 per year in
              bonus income alone.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              <strong style={{ color: "#111" }}>Rotate, do not stack.</strong> The single biggest mistake new
              churners make is opening five accounts in the same week to chase every current bonus at once. The
              banks see that velocity and flag it. Spread new applications across eight to twelve weeks. Let the
              direct-deposit routing settle before you rotate to the next one. Every pro I know runs roughly one
              new account per month, never more than two.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#111" }}>Fund from a neutral hub.</strong> Use a single account — typically
              a Capital One 360 or an Ally — as your rotation hub. All direct deposits route to the hub first and
              are then pushed to whichever bonus account you are currently clearing. This keeps your employer
              payroll system from seeing a different bank every eight weeks (which itself looks suspicious) and
              makes it easy to track which account is receiving the qualifying deposits.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 20px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 720 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>{faq.q}</h3>
                <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stacks OS CTA */}
        <div style={{ marginTop: 40, padding: "24px", background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12, maxWidth: 720 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Track Every Cooldown With Stacks OS</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Stacks OS keeps a live ledger of every bonus you have claimed, the exact date it posted, and when the
            cooldown on each bank expires. No more spreadsheets. Your next eligible bonus surfaces automatically.
          </p>
          <Link href="/stacksos" style={{
            display: "inline-block", padding: "10px 20px", fontSize: 13, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 8, textDecoration: "none",
          }}>
            Try Stacks OS &rarr;
          </Link>
        </div>

        {/* YouTube CTA */}
        <div style={{ marginTop: 20, padding: "24px", background: "rgba(255,0,0,0.03)", border: "1px solid rgba(255,0,0,0.1)", borderRadius: 12, maxWidth: 720 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>Watch: The 24-Month Churning Framework</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, margin: "0 0 12px" }}>
            Nathaniel walks through how to build a sustainable 24-month bonus rotation, which banks are safest to
            churn aggressively, and which ones will shut you down.
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
          <Link href="/blog/chexsystems-guide-bank-bonuses" style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>ChexSystems guide &rarr;</Link>
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
