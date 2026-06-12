import Link from "next/link"
import SearchBox from "./SearchBox"
import { searchableEntries } from "../../lib/searchIndex"

/**
 * The single source of truth for the site's primary navigation.
 *
 * Both the marketing home page and every bonus browse page render this, so the
 * nav can never drift between them again. Links: Bank Bonuses, Credit Cards,
 * Blog, and the green Stacks OS button.
 */
export default function SiteHeader() {
  return (
    <header
      className="site-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <nav
        className="site-nav"
        style={{
          padding: "16px 40px",
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", textDecoration: "none" }}
        >
          Fat Stacks Academy
        </Link>
        <div className="site-nav-links" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <SearchBox entries={searchableEntries} />
          <Link href="/bank-bonuses-by-state" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>
            Bank Bonuses
          </Link>
          <Link href="/spending" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>
            Credit Cards
          </Link>
          <Link href="/blog" style={{ fontSize: 14, color: "#666", textDecoration: "none" }}>
            Blog
          </Link>
          <Link
            href="/stacksos"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "#0d7c5f",
              padding: "8px 16px",
              borderRadius: 8,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Stacks OS
          </Link>
        </div>
      </nav>
      <style>{`
        @media (max-width: 900px) {
          .site-search { flex: 0 1 200px !important; min-width: 140px !important; }
        }
        @media (max-width: 700px) {
          .site-nav { padding: 14px 20px !important; }
          .site-nav-links { gap: 10px !important; flex-wrap: wrap; }
          .site-nav-links a { font-size: 13px !important; }
          .site-search { flex: 1 1 100% !important; order: 99; }
        }
      `}</style>
    </header>
  )
}
