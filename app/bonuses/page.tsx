import type { Metadata } from "next"
import Link from "next/link"
import NewsletterCTA from "../blog/components/NewsletterCTA"
import TrackBonusButton from "../components/TrackBonusButton"
import PortalStacksToggle from "../components/PortalStacksToggle"
import FilterableCatalog from "../components/FilterableCatalog"
import SiteHeader from "../components/SiteHeader"
import { blogPosts } from "../../lib/data/blogPosts"
import { blogContent } from "../../lib/data/blogContent"
import { getCategorizedBonuses, shortBankName } from "../../lib/data/bonusCategories"
import { getLiveCatalogForClient } from "../../lib/data/catalogTaxonomy"

const BASE = "https://fatstacksacademy.com"
const YT = "https://www.youtube.com/@nathanielbooth"

export const metadata: Metadata = {
  title: "The Master Bank Bonus List — Every Live Offer (2026) | Fat Stacks Academy",
  description: "Every live bank account bonus worth doing in 2026 — personal checking, savings, business, and brokerage. Filter by state, requirement, and category. Track any offer in one click.",
  alternates: { canonical: `${BASE}/bonuses` },
  openGraph: {
    type: "article",
    title: "The Master Bank Bonus List — Every Live Offer (2026)",
    description: "Every live bank account bonus worth doing in 2026 — personal, savings, business, brokerage. Continuously updated.",
    url: `${BASE}/bonuses`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary_large_image", title: "The Master Bank Bonus List — Every Live Offer (2026)" },
}

function money(n?: number): string {
  if (n == null) return "—"
  return `$${n.toLocaleString("en-US")}`
}

function slugForBonus(bonusId: string): string | null {
  const post = blogPosts.find(p => p.bonusId === bonusId)
  return post?.slug ?? null
}

function buildReviewHrefMap(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of blogPosts) {
    if (p.bonusId) out[p.bonusId] = `/blog/${p.slug}`
  }
  return out
}

export default function MasterBonusList() {
  const { personalChecking, personalSavings, businessChecking, businessSavings, brokerage } = getCategorizedBonuses()
  const totalBonuses = personalChecking.length + personalSavings.length + businessChecking.length + businessSavings.length + brokerage.length
  const updated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })

  // Normalized catalog for the client-side filter — single source of
  // truth for category, eligibility, tracking kind, etc. We pass the
  // LEAN shape (no `raw` blob) since FilterableCatalog never reads the
  // raw row and a server→client serialization of every raw bonus JSON
  // would blow the response payload.
  const normalized = getLiveCatalogForClient()
  const reviewHrefs = buildReviewHrefMap()

  return (
    <>
      <style>{`
        .master-section { scroll-margin-top: 80px; }
        .bonus-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .bonus-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,124,95,0.08); }
        .stat-num { font-variant-numeric: tabular-nums; }
        .cat-pill { transition: background 0.2s ease, color 0.2s ease; }
        .cat-pill:hover { background: #0d7c5f; color: #fff; }
        @media (max-width: 700px) {
          .hero-grid { grid-template-columns: 1fr 1fr !important; }
          .cat-nav { grid-template-columns: 1fr 1fr !important; }
          .top-pick-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteHeader />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>

        {/* HERO */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>The Master List · {monthLabel}</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111", letterSpacing: "-0.035em", margin: "0 0 16px", lineHeight: 1.05 }}>
            Every live bank bonus<br/>worth doing in 2026
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 640 }}>
            {totalBonuses} active offers across personal checking, savings, business, and brokerage — ranked, reviewed,
            and continuously updated. Last refreshed {updated}.
          </p>
        </div>

        {/* STATS BANNER */}
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 40 }}>
          {[
            { label: "Total live bonuses", value: String(totalBonuses), color: "#0d7c5f" },
            { label: "Personal checking", value: String(personalChecking.length), color: "#0d7c5f" },
            { label: "Savings", value: String(personalSavings.length), color: "#0d7c5f" },
            { label: "Business", value: String(businessChecking.length + businessSavings.length), color: "#0d7c5f" },
            { label: "Brokerage", value: String(brokerage.length), color: "#0d7c5f" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 12px", textAlign: "center" }}>
              <div className="stat-num" style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CATEGORY NAV */}
        <div className="cat-nav" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { id: "personal-checking", emoji: "🏦", label: "Personal Checking", count: personalChecking.length },
            { id: "savings", emoji: "💰", label: "Savings", count: personalSavings.length },
            { id: "business", emoji: "💼", label: "Business", count: businessChecking.length + businessSavings.length },
            { id: "brokerage", emoji: "📈", label: "Brokerage", count: brokerage.length },
          ].map(c => (
            <a key={c.id} href={`#${c.id}`} className="cat-pill" style={{
              padding: "16px 18px", background: "#f8faf9", border: "1px solid #e8e8e8",
              borderRadius: 12, textDecoration: "none", color: "#111",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{c.count} offers</div>
              </div>
            </a>
          ))}
        </div>

        {/* BY-STATE CTA */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/bank-bonuses-by-state" style={{
            padding: "16px 20px",
            background: "#fafafa",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            textDecoration: "none",
            color: "#111",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Looking for offers in your state?</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Browse bank bonuses available by state — nationwide + local picks.</div>
            </div>
            <span style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 700 }}>By state →</span>
          </Link>
        </div>

        {/* NEWSLETTER */}
        <div style={{ marginBottom: 56 }}>
          <NewsletterCTA />
        </div>

        {/* ── FILTERABLE BROWSE ── */}
        <section id="browse" className="master-section" style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Browse every offer</h2>
          <p style={{ fontSize: 14, color: "#888", margin: "0 0 18px" }}>Search by bank, filter by state, category, or requirement. {totalBonuses} live offers ready to track.</p>
          <FilterableCatalog initialItems={normalized} reviewHrefs={reviewHrefs} />
        </section>

        {/* ── PERSONAL CHECKING (TOP 6 — SEO + CONTEXT) ── */}
        <Section
          anchorId="personal-checking"
          emoji="🏦"
          title="Personal Checking Bonuses"
          subtitle={`${personalChecking.length} live offers · ranked by bonus amount`}
          deepLink={{ href: "/blog/best-checking-bonuses-2026", label: "See full checking rankings" }}
        >
          <TopPicksGrid sourcePage="/bonuses#personal-checking" items={personalChecking.slice(0, 6).map(b => ({
            bonusId: b.id,
            bonusType: "personal-checking",
            bank: shortBankName(b),
            value: money(b.bonus_amount),
            sub: b.requirements?.min_direct_deposit_total
              ? `${money(b.requirements.min_direct_deposit_total)} DD · ${b.requirements.deposit_window_days || "?"}d window`
              : "See offer for requirements",
            href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
            summary: blogContent[b.id]?.summary,
          }))} />
          <BonusTable
            sourcePage="/bonuses#personal-checking"
            rows={personalChecking.map((b, i) => ({
              i: i + 1,
              bank: shortBankName(b),
              bonus: money(b.bonus_amount),
              col3: b.requirements?.min_direct_deposit_total ? money(b.requirements.min_direct_deposit_total) : "See terms",
              col4: b.requirements?.deposit_window_days ? `${b.requirements.deposit_window_days}d` : "—",
              col5: b.fees?.monthly_fee === 0 ? "$0" : b.fees?.monthly_fee != null ? `$${b.fees.monthly_fee}` : "See terms",
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              bonusId: b.id,
              bonusType: "personal-checking",
            }))}
            headers={["#", "Bank", "Bonus", "DD Required", "Window", "Fee"]}
          />
        </Section>

        {/* ── SAVINGS ── */}
        <Section
          anchorId="savings"
          emoji="💰"
          title="Personal Savings Bonuses"
          subtitle={`${personalSavings.length} live offers · ranked by effective APY`}
          deepLink={{ href: "/blog/best-savings-bonuses-2026", label: "See full savings rankings" }}
        >
          <TopPicksGrid sourcePage="/bonuses#savings" items={personalSavings.slice(0, 6).map(({ bonus: b, effApy }) => {
            const t = b.tiers[0]
            return {
              bonusId: b.id,
              bonusType: "personal-savings",
              bank: shortBankName(b),
              value: money(t.bonus_amount),
              sub: `${money(t.min_deposit)} hold · ${b.total_hold_days}d · ${effApy.toFixed(1)}% eff APY`,
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              summary: blogContent[b.id]?.summary,
            }
          })} />
          <BonusTable
            sourcePage="/bonuses#savings"
            rows={personalSavings.map(({ bonus: b, effApy }, i) => {
              const t = b.tiers[0]
              return {
                i: i + 1,
                bank: shortBankName(b),
                bonus: money(t.bonus_amount),
                col3: money(t.min_deposit),
                col4: `${b.total_hold_days}d`,
                col5: `${effApy.toFixed(1)}%`,
                href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
                bonusId: b.id,
                bonusType: "personal-savings",
              }
            })}
            headers={["#", "Bank", "Bonus", "Min Deposit", "Hold", "Eff. APY"]}
          />
        </Section>

        {/* ── BUSINESS ── */}
        <Section
          anchorId="business"
          emoji="💼"
          title="Business Bonuses"
          subtitle={`${businessChecking.length} checking + ${businessSavings.length} savings · the largest payouts in the game`}
        >
          <TopPicksGrid sourcePage="/bonuses#business" items={businessChecking.slice(0, 6).map(b => ({
            bonusId: b.id,
            bonusType: "business-checking",
            bank: shortBankName(b),
            value: money(b.bonus_amount),
            sub: b.raw_excerpt ? String(b.raw_excerpt).slice(0, 100) : "Business checking · see offer",
            href: undefined,
            summary: undefined,
          }))} />
          <BonusTable
            sourcePage="/bonuses#business"
            rows={businessChecking.map((b, i) => ({
              i: i + 1,
              bank: shortBankName(b),
              bonus: money(b.bonus_amount),
              col3: "Business",
              col4: b.expiration_date ? `Exp ${b.expiration_date}` : "See terms",
              col5: b.fees?.monthly_fee === 0 ? "$0" : b.fees?.monthly_fee != null ? `$${b.fees.monthly_fee}` : "See terms",
              href: undefined,
              bonusId: b.id,
              bonusType: "business-checking",
            }))}
            headers={["#", "Bank", "Bonus", "Type", "Expires", "Fee"]}
          />
        </Section>

        {/* ── BROKERAGE ── */}
        <Section
          anchorId="brokerage"
          emoji="📈"
          title="Brokerage Bonuses"
          subtitle={`${brokerage.length} live offers · SIPC-insured platforms, cash + stock rewards`}
        >
          <TopPicksGrid sourcePage="/bonuses#brokerage" items={brokerage.slice(0, 6).map(({ bonus: b, effApy }) => {
            const t = b.tiers[0]
            return {
              bonusId: b.id,
              bonusType: "brokerage",
              bank: shortBankName(b),
              value: money(t.bonus_amount),
              sub: `${money(t.min_deposit)} · ${b.total_hold_days}d hold · ${effApy.toFixed(1)}% eff APY`,
              href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
              summary: blogContent[b.id]?.summary,
            }
          })} />
          <BonusTable
            sourcePage="/bonuses#brokerage"
            rows={brokerage.map(({ bonus: b, effApy }, i) => {
              const t = b.tiers[0]
              return {
                i: i + 1,
                bank: shortBankName(b),
                bonus: money(t.bonus_amount),
                col3: money(t.min_deposit),
                col4: `${b.total_hold_days}d`,
                col5: `${effApy.toFixed(1)}%`,
                href: slugForBonus(b.id) ? `/blog/${slugForBonus(b.id)}` : undefined,
                bonusId: b.id,
                bonusType: "brokerage",
              }
            })}
            headers={["#", "Platform", "Bonus", "Min Deposit", "Hold", "Eff. APY"]}
          />
        </Section>

        {/* STACKS OS CTA */}
        <div style={{ background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)", border: "1px solid #a7f3d0", borderRadius: 16, padding: "40px 32px", marginBottom: 48, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 8, letterSpacing: "-0.02em" }}>Stop tracking bonuses in a spreadsheet</div>
          <p style={{ fontSize: 15, color: "#666", margin: "0 auto 20px", maxWidth: 540, lineHeight: 1.6 }}>
            Stacks OS builds a personalized sequence based on your paycheck, tracks every bonus you&apos;ve done,
            and tells you exactly what to do next. {totalBonuses} bonuses, one dashboard.
          </p>
          <Link href="/stacksos" style={{
            display: "inline-block", padding: "14px 32px", fontSize: 15, fontWeight: 700,
            background: "#0d7c5f", color: "#fff", borderRadius: 10, textDecoration: "none",
          }}>
            See your projected earnings →
          </Link>
          <div style={{ fontSize: 12, color: "#999", marginTop: 12 }}>$5/month or $50/year · most first bonuses are $300–$400</div>
        </div>

      </main>

      <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#bbb" }}>© {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>YouTube</a>
            <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
            <Link href="/bank-bonuses-by-state" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>By state</Link>
          </div>
        </div>
      </footer>
    </>
  )
}

function Section({ anchorId, emoji, title, subtitle, deepLink, children }: {
  anchorId: string; emoji: string; title: string; subtitle: string;
  deepLink?: { href: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section id={anchorId} className="master-section" style={{ marginBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111", margin: 0, letterSpacing: "-0.02em" }}>
          <span style={{ marginRight: 10 }}>{emoji}</span>{title}
        </h2>
        {deepLink && (
          <Link href={deepLink.href} style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
            {deepLink.label} →
          </Link>
        )}
      </div>
      <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px" }}>{subtitle}</p>
      {children}
    </section>
  )
}

type TopPick = {
  bank: string; value: string; sub: string; href?: string; summary?: string;
  bonusId: string; bonusType: string;
}

function TopPicksGrid({ items, sourcePage }: { items: TopPick[]; sourcePage: string }) {
  return (
    <div className="top-pick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
      {items.map((it, i) => (
        <div key={i} className="bonus-card" style={{
          background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14,
          padding: 20, height: "100%", display: "flex", flexDirection: "column", gap: 8,
          position: "relative", overflow: "hidden",
        }}>
          {i === 0 && (
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "3px 8px", borderRadius: 99, letterSpacing: "0.06em" }}>
              TOP PICK
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>{it.bank}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#0d7c5f", lineHeight: 1, letterSpacing: "-0.02em" }}>{it.value}</div>
          <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{it.sub}</div>
          {it.summary && (
            <div style={{ fontSize: 13, color: "#444", lineHeight: 1.55, marginTop: 4 }}>{it.summary.slice(0, 130)}{it.summary.length > 130 ? "…" : ""}</div>
          )}
          <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <TrackBonusButton bonusId={it.bonusId} bonusType={it.bonusType} bankName={it.bank} sourcePage={sourcePage} compact />
            {it.href && (
              <Link href={it.href} style={{ fontSize: 12, fontWeight: 600, color: "#0d7c5f", textDecoration: "none" }}>
                Read full review →
              </Link>
            )}
            <PortalStacksToggle bonusId={it.bonusId} />
          </div>
        </div>
      ))}
    </div>
  )
}

function BonusTable({ rows, headers, sourcePage }: {
  rows: Array<{ i: number; bank: string; bonus: string; col3: string; col4: string; col5: string; href?: string; bonusId?: string; bonusType?: string }>
  headers: string[]
  sourcePage?: string
}) {
  const anyTrackable = rows.some(r => r.bonusId)
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {headers.map((h, j) => (
                <th key={j} style={{
                  textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700,
                  color: "#888", textTransform: "uppercase", letterSpacing: "0.06em",
                  borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
              {anyTrackable && (
                <th style={{
                  textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700,
                  color: "#888", textTransform: "uppercase", letterSpacing: "0.06em",
                  borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap",
                }}>Track</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.i} style={{ borderBottom: "1px solid #f4f4f4" }}>
                <td style={{ padding: "12px 16px", color: r.i <= 3 ? "#0d7c5f" : "#bbb", fontWeight: 700, width: 40 }}>{r.i}</td>
                <td style={{ padding: "12px 16px", color: "#111", fontWeight: 600 }}>
                  {r.href ? <Link href={r.href} style={{ color: "#111", textDecoration: "none" }}>{r.bank}</Link> : r.bank}
                </td>
                <td style={{ padding: "12px 16px", color: "#0d7c5f", fontWeight: 700 }}>{r.bonus}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{r.col3}</td>
                <td style={{ padding: "12px 16px", color: "#888" }}>{r.col4}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{r.col5}</td>
                {anyTrackable && (
                  <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {r.bonusId ? (
                      <TrackBonusButton
                        bonusId={r.bonusId}
                        bonusType={r.bonusType}
                        bankName={r.bank}
                        sourcePage={sourcePage}
                        compact
                      />
                    ) : null}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
