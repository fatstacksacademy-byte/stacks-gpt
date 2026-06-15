import Link from "next/link"
import {
  getCheckingBonusById,
  getSavingsBonusById,
  getPostByBonusId,
} from "../../../lib/data/blogPosts"
import {
  getPreviousMonths,
  type MonthlyBankPick,
  type MonthlyBankPicks,
} from "../../../lib/data/monthlyBankPicks"
import { practicalHoldDays } from "../../../lib/data/savingsBonuses"
import AffiliateDisclosure from "./AffiliateDisclosure"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

type ResolvedPick =
  | {
      kind: "checking" | "business-checking"
      rank: number
      bankShort: string
      bonusAmount: number
      ddRequired: number | null
      windowDays: number | null
      monthlyFee: number | null
      takeaway: string
      slug?: string
    }
  | {
      kind: "savings"
      rank: number
      bankShort: string
      bonusAmount: number
      minDeposit: number
      holdDays: number
      effApy: string
      takeaway: string
      slug?: string
    }

function resolvePick(p: MonthlyBankPick, rank: number): ResolvedPick | null {
  const slug = getPostByBonusId(p.bonusId)?.slug

  const checking = getCheckingBonusById(p.bonusId) as
    | {
        bank_name: string
        product_name?: string
        business?: boolean
        bonus_amount: number
        requirements?: { min_direct_deposit_total?: number; deposit_window_days?: number }
        fees?: { monthly_fee?: number }
      }
    | undefined
  if (checking) {
    const baseName = checking.product_name ?? checking.bank_name.split("(")[0].trim()
    const isBusiness = !!checking.business
    const displayName =
      isBusiness && !baseName.toLowerCase().includes("business")
        ? `${baseName} Business`
        : baseName
    return {
      kind: isBusiness ? "business-checking" : "checking",
      rank,
      bankShort: displayName,
      bonusAmount: checking.bonus_amount,
      ddRequired: checking.requirements?.min_direct_deposit_total ?? null,
      windowDays: checking.requirements?.deposit_window_days ?? null,
      monthlyFee: checking.fees?.monthly_fee ?? null,
      takeaway: p.takeaway,
      slug,
    }
  }

  const savings = getSavingsBonusById(p.bonusId)
  if (savings) {
    const t = savings.tiers[0]
    const holdDays = practicalHoldDays(savings)
    const interest = t.min_deposit * savings.base_apy * (holdDays / 365)
    const effApy = (
      ((t.bonus_amount + interest) / t.min_deposit) *
      (365 / holdDays) *
      100
    ).toFixed(1)
    return {
      kind: "savings",
      rank,
      bankShort: (savings as any).product_name ?? savings.bank_name.split("(")[0].trim(),
      bonusAmount: t.bonus_amount,
      minDeposit: t.min_deposit,
      holdDays,
      effApy,
      takeaway: p.takeaway,
      slug,
    }
  }

  return null
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

export default function MonthlyBankBonuses({ data }: { data: MonthlyBankPicks }) {
  const resolved = data.picks
    .map((p, i) => resolvePick(p, i + 1))
    .filter((x): x is ResolvedPick => x !== null)

  const previousMonths = getPreviousMonths(data.monthSlug).slice(0, 6)
  const url = `${BASE}/blog/best-bank-bonuses-${data.monthSlug}`
  const headline = `Best Bank Bonuses — ${data.monthLabel}`
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
          name: `${r.bankShort} ${money(r.bonusAmount)} ${r.kind} bonus`,
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
            <Link
              href="/bonuses"
              style={{ fontSize: 13, color: "#999", textDecoration: "none" }}
            >
              All Bonuses
            </Link>
            <Link
              href="/blog/best-checking-bonuses-2026"
              style={{ fontSize: 13, color: "#999", textDecoration: "none" }}
            >
              Checking
            </Link>
            <Link
              href="/blog/best-savings-bonuses-2026"
              style={{ fontSize: 13, color: "#999", textDecoration: "none" }}
            >
              Savings
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

        {/* Per-pick cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {resolved.map((r) => (
            <article
              key={`${r.rank}-${r.bankShort}`}
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
                    {r.kind === "business-checking" ? "Business checking bonus" : r.kind === "checking" ? "Checking bonus" : "Savings bonus"}
                  </div>
                  <h2
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#111",
                      margin: "0 0 4px",
                      lineHeight: 1.2,
                    }}
                  >
                    {r.bankShort}
                  </h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      color: "#0d7c5f",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {money(r.bonusAmount)}
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
                    Bonus
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 28px 18px", display: "flex", gap: 28, flexWrap: "wrap" }}>
                {r.kind !== "savings" ? (
                  <>
                    <Stat
                      label="Direct deposit"
                      value={r.ddRequired != null ? money(r.ddRequired) : "Required"}
                    />
                    <Stat
                      label="Window"
                      value={r.windowDays != null ? `${r.windowDays} days` : "—"}
                    />
                    <Stat
                      label="Monthly fee"
                      value={
                        r.monthlyFee === 0
                          ? "$0"
                          : r.monthlyFee != null
                            ? money(r.monthlyFee)
                            : "—"
                      }
                      good={r.monthlyFee === 0}
                    />
                  </>
                ) : (
                  <>
                    <Stat label="Min deposit" value={money(r.minDeposit)} />
                    <Stat label="Hold" value={`${r.holdDays} days`} />
                    <Stat label="Effective APY" value={`${r.effApy}%`} good />
                  </>
                )}
              </div>

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

              <div
                style={{
                  padding: "16px 28px 22px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {r.slug ? (
                  <Link
                    href={`/blog/${r.slug}`}
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
                    Read full review &rarr;
                  </Link>
                ) : (
                  <span style={{ fontSize: 13, color: "#bbb" }}>Full review coming soon</span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 12px" }}>
            How I picked these
          </h2>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: 0 }}>
            Every month I look at every active checking and savings bonus in the catalog and
            shortlist the offers worth most people&rsquo;s time. I weight three things:{" "}
            <strong>bonus value</strong>, <strong>how simple the direct-deposit requirement is</strong>,
            and <strong>how confident I am the offer is still around when you actually go to open
            the account</strong>. Picks that need a giant deposit, weird state restrictions, or look
            like they&rsquo;re about to die get cut.
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
            Want a personalized sequence?
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
            Stacks OS picks the right bonuses for <em>your</em> paycheck, sequences them in the
            right order, and tracks every requirement until the bonus posts.
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
            I cover these picks in detail every month on YouTube — strategy, eligibility traps,
            and which bonus to start with based on your paycheck size.
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
                  href={`/blog/best-bank-bonuses-${m.monthSlug}`}
                  style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none" }}
                >
                  Best Bank Bonuses — {m.monthLabel} &rarr;
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
            href="/blog/best-bank-account-bonuses-2026"
            style={{ fontSize: 14, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}
          >
            Full 2026 ranking
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
