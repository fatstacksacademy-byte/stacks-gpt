import Link from "next/link"
import { blogPosts } from "../../lib/data/blogPosts"

const YT = "https://www.youtube.com/@nathanielbooth"

export default function BlogIndex() {
  const checking = blogPosts.filter(p => p.bonusType === "checking")
  const savings = blogPosts.filter(p => p.bonusType === "savings")

  return (
    <>
      <style>{`
        .blog-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .blog-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) { .blog-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .blog-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1a1a1a", padding: "16px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/blog" style={{ fontSize: 20, fontWeight: 800, color: "#fff", textDecoration: "none", letterSpacing: "-0.02em" }}>
            Fat Stacks Academy
          </Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/blog/best-checking-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Checking</Link>
            <Link href="/blog/best-savings-bonuses-2026" style={{ fontSize: 13, color: "#999", textDecoration: "none" }}>Best Savings</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#88e06d", textDecoration: "none", fontWeight: 600 }}>All Reviews</Link>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#ff0000", textDecoration: "none", fontWeight: 600 }}>YouTube</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 20px" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.1 }}>
          Bank Bonus Reviews
        </h1>
        <p style={{ fontSize: 16, color: "#888", margin: "0 0 8px", maxWidth: 600, lineHeight: 1.6 }}>
          Expert reviews of the best bank account bonuses available right now. Requirements, eligibility, strategy, and effective returns — all in one place.
        </p>
        <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
          By <a href={YT} target="_blank" rel="noopener noreferrer" style={{ color: "#88e06d", textDecoration: "none" }}>Nathaniel Booth</a> | Updated April 2026
        </p>
      </section>

      {/* Hub pages */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Link href="/blog/best-checking-bonuses-2026" style={{ textDecoration: "none" }}>
            <div className="blog-card" style={{
              background: "linear-gradient(135deg, #111 0%, #0a1a0f 100%)", border: "1px solid #222", borderRadius: 12, padding: "28px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#88e06d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Guide
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Best Checking Bonuses of 2026
              </div>
              <div style={{ fontSize: 13, color: "#777" }}>
                {checking.length} bonuses ranked by value. Start with Chase $400.
              </div>
            </div>
          </Link>
          <Link href="/blog/best-savings-bonuses-2026" style={{ textDecoration: "none" }}>
            <div className="blog-card" style={{
              background: "linear-gradient(135deg, #111 0%, #0a100a 100%)", border: "1px solid #222", borderRadius: 12, padding: "28px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#88e06d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Guide
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                Best Savings Bonuses of 2026
              </div>
              <div style={{ fontSize: 13, color: "#777" }}>
                {savings.length} bonuses ranked by effective APY. Chase $600 at 16.2%.
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Checking Bonuses */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Checking Bonuses</h2>
          <span style={{ fontSize: 12, color: "#88e06d", background: "rgba(136,224,109,0.1)", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
            {checking.length} offers
          </span>
        </div>
        <div className="blog-grid">
          {checking.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
              <article className="blog-card" style={{
                background: "#111", border: "1px solid #222", borderRadius: 12, padding: "24px",
                cursor: "pointer", height: "100%", display: "flex", flexDirection: "column",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#88e06d", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Bank Bonus
                  </span>
                  <span style={{ fontSize: 11, color: "#555" }}>&middot;</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{post.date}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.3 }}>
                  {post.title}
                </h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {post.excerpt.length > 140 ? post.excerpt.slice(0, 140) + "..." : post.excerpt}
                </p>
                <div style={{ marginTop: 16, fontSize: 12, color: "#88e06d", fontWeight: 600 }}>
                  Read review &rarr;
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Savings Bonuses */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Savings Bonuses</h2>
          <span style={{ fontSize: 12, color: "#88e06d", background: "rgba(136,224,109,0.1)", padding: "4px 10px", borderRadius: 99, fontWeight: 600 }}>
            {savings.length} offers
          </span>
        </div>
        <div className="blog-grid">
          {savings.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
              <article className="blog-card" style={{
                background: "#111", border: "1px solid #222", borderRadius: 12, padding: "24px",
                cursor: "pointer", height: "100%", display: "flex", flexDirection: "column",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#88e06d", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Savings Bonus
                  </span>
                  <span style={{ fontSize: 11, color: "#555" }}>&middot;</span>
                  <span style={{ fontSize: 11, color: "#555" }}>{post.date}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.3 }}>
                  {post.title}
                </h3>
                <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5, margin: 0, flex: 1 }}>
                  {post.excerpt.length > 140 ? post.excerpt.slice(0, 140) + "..." : post.excerpt}
                </p>
                <div style={{ marginTop: 16, fontSize: 12, color: "#88e06d", fontWeight: 600 }}>
                  Read review &rarr;
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1a1a1a", padding: "32px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#555" }}>&copy; {new Date().getFullYear()} Fat Stacks Academy</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>YouTube</a>
            <Link href="/" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Stacks OS</Link>
            <Link href="/blog" style={{ fontSize: 13, color: "#555", textDecoration: "none" }}>Blog</Link>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#444", marginTop: 16, lineHeight: 1.6 }}>
          Bonus offers, requirements, and fees are determined by each financial institution and may change at any time. Always verify the current terms directly with the bank before applying.
        </p>
      </footer>
    </>
  )
}
