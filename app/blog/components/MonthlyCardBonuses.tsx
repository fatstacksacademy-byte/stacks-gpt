import Link from "next/link"
import { getCardById, getPostByBonusId } from "../../../lib/data/blogPosts"
import {
  getPreviousCardMonths,
  type CardSection,
  type MonthlyCardPick,
  type MonthlyCardPicks,
} from "../../../lib/data/monthlyCardPicks"
import AffiliateDisclosure from "./AffiliateDisclosure"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

function bonusLabel(amount: number, currency: string): string {
  if (currency === "cash") return money(amount)
  return `${amount.toLocaleString()} ${currency.toUpperCase()}`
}

type ResolvedCard = {
  rank: number
  cardName: string
  issuer: string
  cardType: "personal" | "business"
  bonusAmount: number
  bonusCurrency: string
  minSpend: number
  spendMonths: number
  annualFee: number
  statementCreditsYear1: number
  keyBenefits: string[]
  takeaway: string
  sections?: CardSection[]
  slug?: string
  offerLink?: string
}

function resolveCard(p: MonthlyCardPick, rank: number): ResolvedCard | null {
  const card = getCardById(p.cardId) as any
  if (!card) return null
  const slug = getPostByBonusId(p.cardId)?.slug
  return {
    rank,
    cardName: card.card_name,
    issuer: card.issuer,
    cardType: card.card_type,
    bonusAmount: card.bonus_amount,
    bonusCurrency: card.bonus_currency,
    minSpend: card.min_spend,
    spendMonths: card.spend_months,
    annualFee: card.annual_fee ?? 0,
    statementCreditsYear1: card.statement_credits_year1 ?? 0,
    keyBenefits: card.key_benefits ?? [],
    takeaway: p.takeaway,
    sections: p.sections,
    slug,
    offerLink: card.offer_link,
  }
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#aaa",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: good ? "#0d7c5f" : "#111" }}>{value}</div>
    </div>
  )
}

export default function MonthlyCardBonuses({ data }: { data: MonthlyCardPicks }) {
  const resolved = data.picks
    .map((p, i) => resolveCard(p, i + 1))
    .filter((x): x is ResolvedCard => x !== null)

  const previousMonths = getPreviousCardMonths(data.monthSlug).slice(0, 6)
  const url = `${BASE}/blog/best-credit-cards-${data.monthSlug}`
  const headline = `Best Credit Cards — ${data.monthLabel}`
  const publishedLabel = new Date(data.publishedDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline,
        description: data.intro,
        url,
        datePublished: data.publishedDate,
        dateModified: new Date().toISOString().split("T")[0],
        author: { "@type": "Person", name: "Nathaniel Booth", url: YT },
        publisher: { "@type": "Organization", name: "Fat Stacks Academy", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE}/blog` },
          { "@type": "ListItem", position: 2, name: headline, item: url },
        ],
      },
      {
        "@type": "ItemList",
        itemListElement: resolved.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${r.cardName} — ${bonusLabel(r.bonusAmount, r.bonusCurrency)} signup bonus`,
          url: r.slug ? `${BASE}/blog/${r.slug}` : url,
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none" }}
          >
            Fat Stacks Academy
          </Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/bonuses" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
              All Bonuses
            </Link>
            <Link
              href="/blog/best-checking-bonuses-2026"
              style={{ fontSize: 13, color: "#999", textDecoration: "none" }}
            >
              Checking
            </Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>
              Reviews
            </Link>
            <a
              href={YT}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}
            >
              YouTube
            </a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 60px" }}>
        <div style={{ fontSize: 13, color: "#bbb", marginBottom: 24 }}>
          <Link href="/blog" style={{ color: "#0d7c5f", textDecoration: "none" }}>
            Blog
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{headline}</span>
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: "#e6f5f0",
            color: "#0d7c5f",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 12,
          }}
        >
          Monthly Picks · {data.monthLabel}
        </div>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#111",
            letterSpacing: "-0.03em",
            margin: "0 0 12px",
            lineHeight: 1.05,
          }}
        >
          {headline}
        </h1>
        <p style={{ fontSize: 13, color: "#bbb", marginBottom: 8 }}>
          By{" "}
          <a
            href={YT}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0d7c5f", textDecoration: "none" }}
          >
            Nathaniel Booth
          </a>{" "}
          · Published {publishedLabel}
        </p>

        <p style={{ fontSize: 17, color: "#333", lineHeight: 1.7, margin: "20px 0 28px" }}>
          {data.intro}
        </p>

        {data.videoId && (
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              marginBottom: 36,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid #e8e8e8",
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${data.videoId}`}
              title={headline}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {resolved.map((r) => {
            const netFee = r.annualFee - r.statementCreditsYear1
            return (
              <article
                key={`${r.rank}-${r.cardName}`}
                style={{
                  background: "#fff",
                  border: "1px solid #e8e8e8",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    gap: 20,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: r.rank === 1 ? "#0d7c5f" : "#f5f5f5",
                      color: r.rank === 1 ? "#fff" : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    #{r.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      {r.cardType === "business" ? "Business card" : "Personal card"} ·{" "}
                      {r.issuer.charAt(0).toUpperCase() + r.issuer.slice(1)}
                    </div>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#111",
                        margin: "0 0 4px",
                        lineHeight: 1.2,
                      }}
                    >
                      {r.cardName}
                    </h2>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 800,
                        color: "#0d7c5f",
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {bonusLabel(r.bonusAmount, r.bonusCurrency)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        marginTop: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Signup bonus
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 28px 18px", display: "flex", gap: 28, flexWrap: "wrap" }}>
                  <Stat
                    label="Spend required"
                    value={`${money(r.minSpend)} in ${r.spendMonths}mo`}
                  />
                  <Stat
                    label="Annual fee"
                    value={r.annualFee === 0 ? "$0" : money(r.annualFee)}
                    good={r.annualFee === 0}
                  />
                  {r.statementCreditsYear1 > 0 && (
                    <Stat
                      label="Net fee (yr 1)"
                      value={netFee <= 0 ? `$0 (${money(r.statementCreditsYear1)} credits)` : money(netFee)}
                      good={netFee <= 0}
                    />
                  )}
                </div>

                {r.keyBenefits.length > 0 && (
                  <div style={{ padding: "0 28px 18px" }}>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                      {r.keyBenefits.slice(0, 3).map((b, i) => (
                        <li key={i} style={{ fontSize: 14, color: "#555", lineHeight: 1.5 }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.takeaway && (
                  <div
                    style={{
                      padding: "16px 28px",
                      borderTop: "1px solid #f0f0f0",
                      background: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#888",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      Why I picked it
                    </div>
                    <p style={{ fontSize: 15, color: "#333", lineHeight: 1.6, margin: 0 }}>
                      {r.takeaway}
                    </p>
                  </div>
                )}

                {r.sections && r.sections.length > 0 && (
                  <div style={{ padding: "8px 28px 4px" }}>
                    {r.sections.map((s, si) => (
                      <div key={si} style={{ marginTop: si === 0 ? 8 : 18 }}>
                        <h3
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#111",
                            margin: "0 0 8px",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {s.heading}
                        </h3>
                        {s.paras?.map((para, pi) => (
                          <p
                            key={pi}
                            style={{ fontSize: 15, color: "#444", lineHeight: 1.7, margin: "0 0 10px" }}
                          >
                            {para}
                          </p>
                        ))}
                        {s.bullets && s.bullets.length > 0 && (
                          <ul
                            style={{
                              margin: "0 0 6px",
                              paddingLeft: 20,
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                            }}
                          >
                            {s.bullets.map((b, bi) => (
                              <li key={bi} style={{ fontSize: 14.5, color: "#444", lineHeight: 1.55 }}>
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    padding: "16px 28px 22px",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {r.offerLink && (
                    <a
                      href={r.offerLink}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      style={{
                        display: "inline-block",
                        padding: "10px 20px",
                        fontSize: 14,
                        fontWeight: 700,
                        background: "#0d7c5f",
                        color: "#fff",
                        borderRadius: 10,
                        textDecoration: "none",
                      }}
                    >
                      Apply now &rarr;
                    </a>
                  )}
                  {r.slug && (
                    <Link
                      href={`/blog/${r.slug}`}
                      style={{
                        display: "inline-block",
                        padding: "10px 20px",
                        fontSize: 14,
                        fontWeight: 700,
                        background: "transparent",
                        color: "#0d7c5f",
                        borderRadius: 10,
                        textDecoration: "none",
                        border: "1.5px solid #0d7c5f",
                      }}
                    >
                      Full review &rarr;
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 12px" }}>
            How I picked these
          </h2>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0 }}>
            Every month I look at the full credit card catalog and shortlist the offers worth
            most people&rsquo;s attention. I weight three things: <strong>signup bonus value</strong>{" "}
            (adjusted for spend requirement), <strong>how the annual fee nets out in year one</strong>{" "}
            after statement credits, and <strong>how well it pairs with bank bonus sequencing</strong>.
            Cards with ridiculous spend requirements or tiny bonuses don&rsquo;t make the list.
          </p>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)",
            border: "1px solid #a7f3d0",
            borderRadius: 16,
            padding: "32px",
            marginBottom: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 8 }}>
            Track all of this in Stacks OS
          </div>
          <p
            style={{
              fontSize: 15,
              color: "#666",
              maxWidth: 500,
              margin: "0 auto 20px",
              lineHeight: 1.6,
            }}
          >
            Stacks OS sequences your bank bonuses and credit card applications — picking the
            right order, tracking every spend requirement, and flagging when your bonus posts.
          </p>
          <Link
            href="/stacksos"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              fontSize: 15,
              fontWeight: 700,
              background: "#0d7c5f",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            See your projected earnings &rarr;
          </Link>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 12 }}>$10/month or $99/year</div>
        </div>

        <div
          style={{
            padding: "24px",
            background: "rgba(255,0,0,0.03)",
            border: "1px solid rgba(255,0,0,0.1)",
            borderRadius: 12,
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>
            Watch the monthly video
          </div>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 12px" }}>
            I break down every pick in the monthly YouTube video — which card to apply for
            first, how to hit the spend without manufactured spending, and which cards pair
            best with bank bonus sequencing.
          </p>
          <a
            href={YT}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              background: "#ff0000",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Subscribe on YouTube &rarr;
          </a>
        </div>

        <AffiliateDisclosure variant="block" />

        {previousMonths.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: "0 0 12px" }}>
              Previous months
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {previousMonths.map((m) => (
                <Link
                  key={m.monthSlug}
                  href={`/blog/best-credit-cards-${m.monthSlug}`}
                  style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}
                >
                  Best Credit Cards — {m.monthLabel} &rarr;
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link
            href="/blog"
            style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
          >
            &larr; All reviews
          </Link>
          <Link
            href="/blog/best-bank-bonuses-june-2026"
            style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
          >
            Bank bonuses this month &rarr;
          </Link>
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #f0f0f0",
          padding: "32px 24px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "#bbb" }}>
            &copy; {new Date().getFullYear()} Fat Stacks Academy
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <a
              href={YT}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}
            >
              YouTube
            </a>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>
              Stacks OS
            </Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
