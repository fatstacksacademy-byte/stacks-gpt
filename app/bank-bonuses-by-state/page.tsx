import type { Metadata } from "next"
import Link from "next/link"
import StateBonusFinder from "../components/StateBonusFinder"
import { getLiveCatalog, isEligibleInState, US_STATES } from "../../lib/data/catalogTaxonomy"

/**
 * Directory of state pages.
 *
 * SEO posture:
 *  - Self-canonical to this index.
 *  - One link per state with an honest count of eligible offers (nationwide +
 *    local). Empty/low-count states still ship a link, but the count
 *    surfaces that local coverage may be thin so we don't pretend.
 *  - No filler paragraphs — the page is a directory, plus a short
 *    explanation of how to use it.
 */

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: "Bank Bonuses by State — Find Eligible Offers Near You | Fat Stacks Academy",
  description: "Browse bank account bonuses available in your state, including nationwide offers and local credit unions / regional banks. Verify eligibility before applying.",
  alternates: { canonical: `${BASE}/bank-bonuses-by-state` },
  openGraph: {
    type: "website",
    title: "Bank Bonuses by State",
    description: "Bank account bonuses by U.S. state — nationwide and local offers ranked by eligibility.",
    url: `${BASE}/bank-bonuses-by-state`,
    siteName: "Fat Stacks Academy",
  },
  twitter: { card: "summary", title: "Bank Bonuses by State" },
}
export default function StateDirectory() {
  const items = getLiveCatalog()
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })

  // Per-state count of items eligible AT ALL (nationwide + local). We use
  // the strict `isEligibleInState` so unknown/branch-only items don't
  // inflate the number — better to be honest about coverage.
  const counts = US_STATES.map(state => {
    const eligible = items.filter(it => isEligibleInState(it, state.code))
    const local = items.filter(it => it.availability === "state_restricted" && it.eligibleStates?.includes(state.code))
    return {
      ...state,
      total: eligible.length,
      local: local.length,
    }
  })

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
          <Link href="/" style={{ color: "#999", textDecoration: "none" }}>Home</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <Link href="/bonuses" style={{ color: "#999", textDecoration: "none" }}>All bonuses</Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "#111" }}>By state</span>
        </nav>

        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            By state · {monthLabel}
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: "#111", margin: "0 0 12px", letterSpacing: "-0.025em" }}>
            Bank bonuses by state
          </h1>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.6, margin: "0 0 8px", maxWidth: 720 }}>
            Choose your state, then browse bank and brokerage bonuses ten at a time. State-specific offers appear before nationwide ones.
          </p>
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.5, margin: 0, maxWidth: 720 }}>
            Eligibility data is updated continuously but should always be
            verified against the bank&apos;s current terms before you apply.
          </p>
        </header>

        <div style={{ marginBottom: 28 }}>
          <StateBonusFinder states={US_STATES} />
        </div>

        <details style={{ borderTop: "1px solid #eee", paddingTop: 18 }}>
          <summary style={{ cursor: "pointer", color: "#666", fontSize: 13, fontWeight: 700 }}>
            Browse all states and current catalog counts
          </summary>
          <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
            Counts include nationwide and explicitly state-eligible offers. Known expired offers are removed; offers without a structured expiration are labeled for verification on the results page.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
            {counts.map(s => (
              <Link key={s.code} href={`/bank-bonuses-by-state/${s.slug}`} style={{ display: "block", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "11px 13px", textDecoration: "none", color: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: "#999", fontWeight: 700 }}>{s.code}</span>
                </div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>{s.total} currently listed{s.local > 0 ? ` · ${s.local} local` : ""}</div>
              </Link>
            ))}
          </div>
        </details>
      </main>
      <Footer />
    </>
  )
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
          <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
          <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
        </div>
      </div>
    </footer>
  )
}
