import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import TrackBonusButton from "../../components/TrackBonusButton"
import StateBonusFinder from "../../components/StateBonusFinder"
import StateOfferBrowser from "../../components/StateOfferBrowser"
import {
  US_STATES,
  findStateBySlug,
  getLiveCatalog,
  bucketByState,
  toClientItem,
  type CatalogItem,
} from "../../../lib/data/catalogTaxonomy"
import { blogPosts } from "../../../lib/data/blogPosts"

/**
 * Per-state bonus page.
 *
 * SEO posture:
 *  - Distinct, self-canonical URL per state slug (/bank-bonuses-by-state/hawaii).
 *  - Unique title + description per state from real catalog counts.
 *  - generateStaticParams covers all 50 states + DC so pages prebuild.
 *  - When local coverage is empty AND the state has no unique value to
 *    offer (only the same nationwide list as every other state), we
 *    explicitly set robots noindex — we'd rather skip thin doorway
 *    pages than ship 50 near-duplicates.
 *  - We display "verified-as-of" by reading the package mtime-ish
 *    `process.env.NEXT_PUBLIC_CATALOG_REFRESH_DATE` when present, else
 *    fall back to the build date the file embeds at deploy. We do NOT
 *    use `new Date()` for the verified date — that would update on
 *    every render and lie about freshness.
 */

const BASE = "https://fatstacksacademy.com"

// Build a stable "catalog last refreshed" label. We prefer an env var
// (Vercel can inject a build timestamp), then fall back to a hand-set
// constant. Never call new Date() at render time for this — it would
// suggest the catalog was verified just now when it wasn't.
const CATALOG_REFRESH = process.env.NEXT_PUBLIC_CATALOG_REFRESH_DATE
  || "2026-06-09" // bump when the bonus catalog data is refreshed

function refreshLabel(): string {
  const d = new Date(CATALOG_REFRESH + "T00:00:00")
  if (Number.isNaN(d.getTime())) return CATALOG_REFRESH
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}
export async function generateStaticParams() {
  return US_STATES.map(s => ({ state: s.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ state: string }> },
): Promise<Metadata> {
  const { state: slug } = await params
  const state = findStateBySlug(slug)
  if (!state) return { title: "State not found" }

  const all = getLiveCatalog()
  const { nationwide, local } = bucketByState(all, state.code)
  const total = nationwide.length + local.length
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })

  const title = `Best Bank Bonuses in ${state.name} — ${monthLabel}`
  const description = local.length > 0
    ? `${total} bank account bonuses available in ${state.name} — ${nationwide.length} nationwide and ${local.length} local credit unions / regional banks. Verify eligibility before applying.`
    : `${nationwide.length} nationwide bank account bonuses available to ${state.name} residents. Local-bank data for ${state.name} is incomplete — confirm with your bank before applying.`

  const url = `${BASE}/bank-bonuses-by-state/${state.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "Fat Stacks Academy",
    },
    twitter: { card: "summary", title, description },
    // If the only thing we can show is the universal nationwide list,
    // noindex to avoid 50 doorway pages.
    robots: local.length === 0 && nationwide.length < 5
      ? { index: false, follow: true }
      : undefined,
  }
}

export default async function StateBonusPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params
  const state = findStateBySlug(slug)
  if (!state) notFound()

  const all = getLiveCatalog()
  const { nationwide, local, unverified } = bucketByState(all, state.code)
  const eligible = [...local, ...nationwide]
  const reviewHrefs = Object.fromEntries(
    eligible.flatMap(item => {
      const href = reviewHref(item.id)
      return href ? [[item.id, href]] : []
    }),
  )

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const verified = refreshLabel()
  const total = nationwide.length + local.length
  const ddCount = [...nationwide, ...local].filter(it => it.fundingMethod === "direct_deposit" || it.fundingMethod === "mixed").length
  const noDdCount = total - ddCount

  // Notable local concern hook — only show when we know something
  // genuine. We don't fabricate "state expertise" if the catalog has
  // nothing local to say.
  const localConcern = local.length === 0
    ? `Local-bank coverage for ${state.name} is incomplete. We surface nationwide offers below; verify against ${state.name}-specific banks separately.`
    : null

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
          <Link href="/" style={{ color: "#999", textDecoration: "none" }}>Home</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <Link href="/bonuses" style={{ color: "#999", textDecoration: "none" }}>All bonuses</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <Link href="/bank-bonuses-by-state" style={{ color: "#999", textDecoration: "none" }}>By state</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#111" }}>{state.name}</span>
        </nav>

        <header style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            {state.name} · {monthLabel}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.025em" }}>
            Best bank bonuses in {state.name}
          </h1>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.6, margin: "0 0 8px", maxWidth: 720 }}>
            {total > 0
              ? `${total} currently listed offers — ${nationwide.length} nationwide and ${local.length} ${state.name}-specific. Known expired offers are removed; always confirm terms before applying.`
              : `No currently listed offers matched ${state.name}. Local-bank coverage is still being expanded.`}
          </p>
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>
            Catalog verified {verified}. Always confirm current terms with the bank before opening an account.
          </p>
        </header>

        <div style={{ marginBottom: 24 }}>
          <StateBonusFinder states={US_STATES} currentSlug={state.slug} compact />
        </div>

        {/* Stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }} className="state-stats">
          <Stat label="Eligible offers" value={total} />
          <Stat label="Nationwide" value={nationwide.length} />
          <Stat label="Local / regional" value={local.length} />
          <Stat label="No DD required" value={noDdCount} />
        </div>

        {localConcern && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: "#92400e" }}>{localConcern}</div>
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <StateOfferBrowser
            items={eligible.map(toClientItem)}
            stateCode={state.code}
            stateName={state.name}
            reviewHrefs={reviewHrefs}
          />
        </div>

        {/* Unverified — visible but boxed off so readers know they're not confirmed */}
        {unverified.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <details style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 18px" }}>
              <summary style={{ fontSize: 14, fontWeight: 700, color: "#111", cursor: "pointer" }}>
                {unverified.length} offers with unverified eligibility
              </summary>
              <p style={{ fontSize: 12, color: "#666", margin: "10px 0 12px" }}>
                These offers carry incomplete or contradictory state-eligibility data. They might be available in {state.name} — confirm with the bank before applying.
              </p>
              <BonusList items={unverified} sourcePage={`/bank-bonuses-by-state/${state.slug}#unverified`} />
            </details>
          </section>
        )}

        {/* Other-state nav */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Other states</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {US_STATES.filter(s => s.code !== state.code).map(s => (
              <Link key={s.code} href={`/bank-bonuses-by-state/${s.slug}`} style={{
                fontSize: 12,
                padding: "4px 10px",
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 99,
                color: "#666",
                textDecoration: "none",
              }}>
                {s.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <style>{`
        @media (max-width: 700px) {
          .state-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  )
}

// ── Components ──────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function reviewHref(id: string): string | null {
  const post = blogPosts.find(p => p.bonusId === id)
  return post ? `/blog/${post.slug}` : null
}

function BonusList({ items, sourcePage }: { items: CatalogItem[]; sourcePage: string }) {
  if (items.length === 0) {
    return <div style={{ fontSize: 13, color: "#999", padding: "16px 0" }}>No offers in this bucket.</div>
  }
  // Sort by bonus amount descending — most relevant first on a state page.
  const sorted = [...items].sort((a, b) => b.bonusAmount - a.bonusAmount)
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
      {sorted.map(it => {
        const href = reviewHref(it.id)
        return (
          <div key={it.id} style={{
            background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
            padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
          }} className="state-result">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 4 }}>{it.shortBankName}</div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <span><strong style={{ color: "#0d7c5f" }}>${it.bonusAmount.toLocaleString()}</strong> bonus</span>
                <span>{requirementSummary(it)}</span>
                <span>{eligibilityHint(it)}</span>
              </div>
              {it.eligibilityNotes && (
                <div style={{ fontSize: 11, color: "#999", marginTop: 4, lineHeight: 1.5 }}>{it.eligibilityNotes}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
              <TrackBonusButton
                bonusId={it.id}
                bonusType={it.trackingKind}
                bankName={it.shortBankName}
                sourcePage={sourcePage}
                compact
              />
              {href && (
                <Link href={href} style={{ fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
                  Read review →
                </Link>
              )}
            </div>
            <style>{`
              @media (max-width: 640px) {
                .state-result { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
        )
      })}
    </div>
  )
}

function requirementSummary(it: CatalogItem): string {
  if (it.minimumDirectDeposit) return `$${it.minimumDirectDeposit.toLocaleString()} DD`
  if (it.minimumCashDeposit) return `$${it.minimumCashDeposit.toLocaleString()} hold`
  if (it.fundingMethod === "debit_transactions") return "Debit activity"
  if (it.fundingMethod === "unknown") return "Requirements: see terms"
  return "No requirement listed"
}

function eligibilityHint(it: CatalogItem): string {
  switch (it.availability) {
    case "nationwide": return "Nationwide"
    case "state_restricted":
      if (it.eligibleStates && it.eligibleStates.length === 1) return `Only in ${it.eligibleStates[0]}`
      return `${it.eligibleStates?.length ?? 0} states`
    case "branch_only": return "Branch required"
    case "unknown": return "Eligibility not verified"
  }
}

function Header() {
  return (
    <header style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0", position: "sticky", top: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", zIndex: 10 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: "#111", textDecoration: "none" }}>Fat Stacks Academy</Link>
        <nav style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/bonuses" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>All bonuses</Link>
          <Link href="/bank-bonuses-by-state" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 700 }}>By state</Link>
          <Link href="/blog" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Reviews</Link>
          <Link href="/stacksos" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Stacks OS</Link>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#bbb" }}>© {new Date().getFullYear()} Fat Stacks Academy</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/bonuses" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>All bonuses</Link>
          <Link href="/bank-bonuses-by-state" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>By state</Link>
          <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
        </div>
      </div>
    </footer>
  )
}
