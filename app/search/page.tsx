import type { Metadata } from "next"
import Link from "next/link"
import { BrowseHeader, BrowseFooter, StacksOsCta } from "../components/BonusBrowseSections"
import { searchableEntries, type SearchEntry } from "../../lib/searchIndex"

const BASE = "https://fatstacksacademy.com"

type SP = Promise<Record<string, string | string[] | undefined>>

function queryFrom(params: Record<string, string | string[] | undefined>): string {
  const raw = params.q
  return (Array.isArray(raw) ? raw[0] : raw ?? "").trim()
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const q = queryFrom(await searchParams)
  const title = q ? `Search: “${q}” | Fat Stacks Academy` : "Search bonuses & cards | Fat Stacks Academy"
  return {
    title,
    description: "Search every live bank bonus, savings offer, and credit card we track.",
    alternates: { canonical: `${BASE}/search` },
    // Internal search-result pages are utility surfaces, not content — keep
    // them out of the index (but let crawlers follow the links through).
    robots: { index: false, follow: true },
  }
}

/** Same case-insensitive substring match the header dropdown uses. */
function search(term: string): SearchEntry[] {
  const t = term.toLowerCase()
  return searchableEntries.filter((e) => e.searchText.includes(t))
}

const KIND_ORDER: { kind: SearchEntry["kind"]; heading: string }[] = [
  { kind: "card", heading: "Credit Cards" },
  { kind: "checking", heading: "Bank Bonuses" },
  { kind: "savings", heading: "Savings" },
]

const BADGE: Record<SearchEntry["kind"], { bg: string; fg: string; label: string }> = {
  checking: { bg: "#e8f3fb", fg: "#1463a8", label: "Bank" },
  savings: { bg: "#eaf6ec", fg: "#1e7a3a", label: "Savings" },
  card: { bg: "#fdf1e0", fg: "#9a5400", label: "Card" },
}

function KindBadge({ kind }: { kind: SearchEntry["kind"] }) {
  const c = BADGE[kind]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
      background: c.bg, color: c.fg, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap",
    }}>{c.label}</span>
  )
}

function ResultRow({ r }: { r: SearchEntry }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
      border: "1px solid #eee", borderRadius: 12, background: "#fff",
    }}>
      <Link href={r.href} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "#111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, marginBottom: 3 }}>
          <KindBadge kind={r.kind} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
        </div>
        <div style={{ fontSize: 12, color: "#777" }}>{r.subtitle}</div>
      </Link>
      <Link href={r.applyHref} style={{
        fontSize: 13, fontWeight: 700, color: "#0d7c5f", textDecoration: "none", whiteSpace: "nowrap",
      }}>Apply →</Link>
    </div>
  )
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const q = queryFrom(await searchParams)
  const all = q.length >= 1 ? search(q) : []
  const grouped = KIND_ORDER
    .map((g) => ({ ...g, items: all.filter((e) => e.kind === g.kind) }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <BrowseHeader />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 60px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111", letterSpacing: "-0.025em", margin: "0 0 6px" }}>
          {q ? <>Results for “{q}”</> : "Search"}
        </h1>
        <p style={{ fontSize: 14, color: "#777", margin: "0 0 20px" }}>
          {q
            ? `${all.length} match${all.length === 1 ? "" : "es"} across cards, bank bonuses, and savings.`
            : "Search every live credit card, bank bonus, and savings offer we track."}
        </p>

        {/* Plain GET form → no JS needed; refines the same /search page. */}
        <form action="/search" method="get" style={{ display: "flex", gap: 8, marginBottom: 36 }}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search cards, banks, bonuses…"
            aria-label="Search bonuses, cards, and banks"
            style={{
              flex: 1, padding: "12px 14px", fontSize: 15, border: "1px solid #e0e0e0",
              borderRadius: 10, background: "#fafafa", outline: "none", color: "#111",
            }}
          />
          <button type="submit" style={{
            padding: "12px 22px", fontSize: 14, fontWeight: 700, background: "#0d7c5f",
            color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap",
          }}>Search</button>
        </form>

        {q && all.length === 0 && (
          <div style={{
            padding: "32px 24px", border: "1px solid #eee", borderRadius: 14, background: "#fafafa", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>
              No matches for “{q}”
            </div>
            <p style={{ fontSize: 14, color: "#777", margin: "0 auto 18px", maxWidth: 440, lineHeight: 1.6 }}>
              Try a bank name, card name, or a feature like “lounge”, “0% APR”, or “Hyatt”.
              Or browse the full catalogs:
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/spending" style={browsePill}>Credit Cards</Link>
              <Link href="/bank-bonuses-by-state" style={browsePill}>Bank Bonuses</Link>
              <Link href="/savings" style={browsePill}>Savings</Link>
            </div>
          </div>
        )}

        {grouped.map((g) => (
          <section key={g.kind} style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase",
              letterSpacing: "0.06em", margin: "0 0 12px",
            }}>
              {g.heading} <span style={{ color: "#bbb" }}>({g.items.length})</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {g.items.map((r) => <ResultRow key={`${r.kind}-${r.id}`} r={r} />)}
            </div>
          </section>
        ))}

        {q && all.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <StacksOsCta totalBonuses={searchableEntries.length} />
          </div>
        )}
      </main>

      <BrowseFooter />
    </>
  )
}

const browsePill: React.CSSProperties = {
  padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#0d7c5f",
  background: "#fff", border: "1px solid #0d7c5f", borderRadius: 10, textDecoration: "none",
}
