import Link from "next/link"
import { notFound } from "next/navigation"
import { blogPosts, getPostBySlug, getCheckingBonusById, getSavingsBonusById } from "../../../lib/data/blogPosts"

const BASE = "https://fatstacksacademy.com"

export function generateStaticParams() {
  return blogPosts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: "Not Found" }

  const title = post.title
  const description = post.excerpt.length > 155 ? post.excerpt.slice(0, 155) + "…" : post.excerpt
  const url = `${BASE}/blog/${post.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article" as const,
      title,
      description,
      url,
      siteName: "Fat Stacks Academy",
      locale: "en_US",
      publishedTime: post.date,
      modifiedTime: post.date,
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary" as const,
      title,
      description,
    },
  }
}

function buildJsonLd(post: NonNullable<ReturnType<typeof getPostBySlug>>) {
  const url = `${BASE}/blog/${post.slug}`
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt.slice(0, 160),
        url,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        articleSection: post.category,
        keywords: post.tags.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: post.category, item: `${BASE}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  }
}

function money(n: number | null | undefined): string {
  if (n == null) return "N/A"
  return `$${n.toLocaleString("en-US")}`
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
      <span style={{ fontSize: 13, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: accent ? "#88e06d" : "#fff" }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.01em" }}>{title}</h2>
      {children}
    </div>
  )
}

function CheckingArticle({ bonus }: { bonus: any }) {
  const req = bonus.requirements || {}
  const fees = bonus.fees || {}
  const screen = bonus.screening || {}
  const elig = bonus.eligibility || {}
  const timeline = bonus.timeline || {}
  const links = bonus.source_links || []

  return (
    <>
      {/* Offer summary box */}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "24px", marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#88e06d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
          Offer Details
        </div>
        <InfoRow label="Bonus Amount" value={money(bonus.bonus_amount)} accent />
        <InfoRow label="Account Type" value="Checking" />
        {req.direct_deposit_required && (
          <InfoRow label="Direct Deposit Required" value={req.min_direct_deposit_total ? money(req.min_direct_deposit_total) + " total" : "Yes"} />
        )}
        {req.min_direct_deposit_per_deposit && (
          <InfoRow label="Min Per Deposit" value={money(req.min_direct_deposit_per_deposit)} />
        )}
        {req.dd_count_required && (
          <InfoRow label="Number of Deposits" value={String(req.dd_count_required)} />
        )}
        {req.deposit_window_days && (
          <InfoRow label="Deposit Window" value={`${req.deposit_window_days} days`} />
        )}
        {req.debit_transactions_required && (
          <InfoRow label="Transactions Required" value={`${req.debit_transactions_required} qualifying transactions`} />
        )}
        {timeline.bonus_posting_days_est != null && (
          <InfoRow label="Bonus Posts In" value={timeline.bonus_posting_days_est === 0 ? "Instantly" : `~${timeline.bonus_posting_days_est} days`} />
        )}
        {timeline.must_remain_open_days && (
          <InfoRow label="Keep Account Open" value={`${timeline.must_remain_open_days} days`} />
        )}
        {bonus.cooldown_months && (
          <InfoRow label="Cooldown" value={`${bonus.cooldown_months} months`} />
        )}
      </div>

      {/* Requirements */}
      <Section title="Requirements">
        <p style={{ fontSize: 14, color: "#bbb", lineHeight: 1.7, margin: 0 }}>
          {req.other_requirements_text || "See bank website for full requirements."}
        </p>
      </Section>

      {/* Fees */}
      <Section title="Fees">
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
          <InfoRow label="Monthly Fee" value={fees.monthly_fee != null ? (fees.monthly_fee === 0 ? "$0" : money(fees.monthly_fee) + "/mo") : "Not stated"} />
          {fees.monthly_fee_waiver_text && (
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, margin: "12px 0 0" }}>
              {fees.monthly_fee_waiver_text}
            </p>
          )}
          {fees.early_closure_fee != null && fees.early_closure_fee > 0 && (
            <InfoRow label="Early Closure Fee" value={money(fees.early_closure_fee)} />
          )}
        </div>
      </Section>

      {/* Screening */}
      <Section title="ChexSystems & Credit Pull">
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
          {screen.chex_sensitive && (
            <InfoRow label="Chex Sensitivity" value={screen.chex_sensitive.charAt(0).toUpperCase() + screen.chex_sensitive.slice(1)} />
          )}
          <InfoRow label="Hard Pull" value={screen.hard_pull === true ? "Yes" : screen.hard_pull === false ? "No" : "Unknown"} />
          <InfoRow label="Soft Pull" value={screen.soft_pull === true ? "Yes" : screen.soft_pull === false ? "No" : "Unknown"} />
          {screen.screening_notes && (
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, margin: "12px 0 0" }}>
              {screen.screening_notes}
            </p>
          )}
        </div>
      </Section>

      {/* Eligibility */}
      <Section title="Eligibility">
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
          <InfoRow label="Availability" value={elig.states_allowed?.[0] || "See terms"} />
          <InfoRow label="Lifetime Limit" value={elig.lifetime_language ? "Yes" : "No"} />
          {elig.eligibility_notes && (
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, margin: "12px 0 0" }}>
              {elig.eligibility_notes}
            </p>
          )}
        </div>
      </Section>

      {/* Apply Link */}
      {links.length > 0 && (
        <Section title="Apply">
          <a
            href={links[0]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", padding: "14px 28px", fontSize: 14, fontWeight: 700,
              background: "#88e06d", color: "#000", borderRadius: 8, textDecoration: "none",
            }}
          >
            Open Account →
          </a>
          {links.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Additional sources:</div>
              {links.slice(1).map((link: string, i: number) => (
                <div key={i}>
                  <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#88e06d", textDecoration: "none", wordBreak: "break-all" }}>
                    {link.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  )
}

function SavingsArticle({ bonus }: { bonus: any }) {
  const links = bonus.source_links || []
  const elig = bonus.eligibility || {}

  return (
    <>
      {/* Offer summary box */}
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "24px", marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#88e06d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
          Offer Details
        </div>
        <InfoRow label="Account Type" value="Savings" />
        <InfoRow label="Base APY" value={`${(bonus.base_apy * 100).toFixed(2)}%`} />
        <InfoRow label="Funding Window" value={`${bonus.funding_window_days} days`} />
        <InfoRow label="Maintenance Period" value={`${bonus.maintenance_days} days`} />
        <InfoRow label="Total Hold" value={`~${bonus.total_hold_days} days`} />
      </div>

      {/* Bonus Tiers */}
      <Section title="Bonus Tiers & Effective APY">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bonus.tiers.map((tier: any, i: number) => {
            const interest = Math.round(tier.min_deposit * bonus.base_apy * (bonus.total_hold_days / 365))
            const total = tier.bonus_amount + interest
            const effectiveApy = ((total / tier.min_deposit) * (365 / bonus.total_hold_days) * 100).toFixed(1)
            return (
              <div key={i} style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{money(tier.min_deposit)} deposit</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#88e06d" }}>{effectiveApy}% effective APY</span>
                </div>
                <InfoRow label="Cash Bonus" value={money(tier.bonus_amount)} accent />
                <InfoRow label="Est. Interest" value={`~${money(interest)}`} />
                <InfoRow label="Total Earnings" value={`~${money(total)}`} accent />
              </div>
            )
          })}
        </div>
      </Section>

      {/* Eligibility */}
      <Section title="Eligibility">
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
          <InfoRow label="Availability" value={elig.states_allowed?.[0] || "See terms"} />
          <InfoRow label="Lifetime Limit" value={elig.lifetime_language ? "Yes" : "No"} />
          {elig.eligibility_notes && (
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.6, margin: "12px 0 0" }}>
              {elig.eligibility_notes}
            </p>
          )}
        </div>
      </Section>

      {/* Fees */}
      <Section title="Fees">
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: "20px" }}>
          <InfoRow label="Monthly Fee" value={bonus.fees.monthly_fee === 0 ? "$0" : money(bonus.fees.monthly_fee)} />
        </div>
      </Section>

      {/* Strategy Notes */}
      {bonus.notes && (
        <Section title="Strategy">
          <div style={{ background: "rgba(136,224,109,0.05)", border: "1px solid rgba(136,224,109,0.15)", borderRadius: 12, padding: "20px" }}>
            <p style={{ fontSize: 14, color: "#bbb", lineHeight: 1.7, margin: 0 }}>{bonus.notes}</p>
          </div>
        </Section>
      )}

      {/* Apply Link */}
      {links.length > 0 && (
        <Section title="Apply">
          <a
            href={links[0]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", padding: "14px 28px", fontSize: 14, fontWeight: 700,
              background: "#88e06d", color: "#000", borderRadius: 8, textDecoration: "none",
            }}
          >
            Open Account →
          </a>
          {links.length > 1 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>Additional sources:</div>
              {links.slice(1).map((link: string, i: number) => (
                <div key={i}>
                  <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#88e06d", textDecoration: "none", wordBreak: "break-all" }}>
                    {link.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                  </a>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  )
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const checkingBonus = post.bonusType === "checking" ? getCheckingBonusById(post.bonusId) : null
  const savingsBonus = post.bonusType === "savings" ? getSavingsBonusById(post.bonusId) : null

  if (!checkingBonus && !savingsBonus) notFound()

  const jsonLd = buildJsonLd(post)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#fff", textDecoration: "none", letterSpacing: "-0.02em" }}>
            Fat Stacks Academy
          </Link>
          <nav style={{ display: "flex", gap: 24 }}>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>All Posts</Link>
            <Link href="/" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Stacks OS</Link>
          </nav>
        </div>
      </header>

      {/* Article */}
      <article style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 60px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#88e06d", textDecoration: "none" }}>Blog</Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{post.category}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.15 }}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#88e06d", fontWeight: 600 }}>{post.category}</span>
          <span style={{ fontSize: 13, color: "#555" }}>{post.date}</span>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, color: "#666", background: "#1a1a1a", padding: "3px 10px", borderRadius: 99 }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Content */}
        {checkingBonus && <CheckingArticle bonus={checkingBonus} />}
        {savingsBonus && <SavingsArticle bonus={savingsBonus} />}

        {/* Disclaimer */}
        <div style={{ marginTop: 48, padding: "20px", background: "#111", border: "1px solid #222", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#555", lineHeight: 1.7, margin: 0 }}>
            Bonus offers, requirements, and fees are determined by each financial institution and may change at any time.
            Always verify the current terms directly with the bank before applying. This content is for informational
            purposes only and does not constitute financial advice.
          </p>
        </div>

        {/* Back */}
        <div style={{ marginTop: 32 }}>
          <Link href="/blog" style={{ fontSize: 14, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>
            ← Back to all reviews
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#555" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
