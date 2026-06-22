import Link from "next/link"
import TrackBonusButton from "./TrackBonusButton"
import PortalStacksToggle from "./PortalStacksToggle"

export type BonusTableRow = {
  i: number
  bank: string
  bonus: string
  col3: string
  col4: string
  col5: string
  href?: string
  bonusId?: string
  bonusType?: string
  /** Optional card-art thumbnail (credit cards only). */
  image?: string
}

export function money(n?: number): string {
  if (n == null) return "—"
  return `$${n.toLocaleString("en-US")}`
}

export function Section({ anchorId, emoji, title, subtitle, deepLink, children }: {
  anchorId?: string
  emoji?: string
  title: string
  subtitle: string
  deepLink?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section id={anchorId} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#111", margin: 0, letterSpacing: "-0.02em" }}>
          {emoji && <span style={{ marginRight: 10 }}>{emoji}</span>}
          {title}
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

export type TopPick = {
  bank: string
  value: string
  sub: string
  href?: string
  summary?: string
  bonusId: string
  bonusType: string
  /** Optional card-art thumbnail (credit cards only). */
  image?: string
}

/** Small card-art thumbnail used across the browse listings; nothing renders without a src. */
function CardThumb({ src, w, h }: { src?: string; w: number; h: number }) {
  if (!src) return null
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: w, height: h, borderRadius: 5, background: "#f7f7f7",
        border: "1px solid #ececec", overflow: "hidden", flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden loading="lazy" width={w} height={h}
        style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </span>
  )
}

export function TopPicksGrid({ items, sourcePage }: { items: TopPick[]; sourcePage: string }) {
  return (
    <div className="bbs-top-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
      {items.map((it, i) => (
        <div key={i} className="bbs-card" style={{
          background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14,
          padding: 20, height: "100%", display: "flex", flexDirection: "column", gap: 8,
          position: "relative", overflow: "hidden",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}>
          {i === 0 && (
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, color: "#fff", background: "#0d7c5f", padding: "3px 8px", borderRadius: 99, letterSpacing: "0.06em" }}>
              TOP PICK
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CardThumb src={it.image} w={56} h={36} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>{it.bank}</div>
          </div>
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
      <style>{`
        .bbs-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,124,95,0.08); }
        @media (max-width: 700px) {
          .bbs-top-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export function BonusTable({ rows, headers, sourcePage }: {
  rows: BonusTableRow[]
  headers: string[]
  sourcePage?: string
}) {
  const hasTrack = rows.some(r => r.bonusId)
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
              {hasTrack && (
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CardThumb src={r.image} w={44} h={28} />
                    {r.href ? <Link href={r.href} style={{ color: "#111", textDecoration: "none" }}>{r.bank}</Link> : r.bank}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#0d7c5f", fontWeight: 700 }}>{r.bonus}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{r.col3}</td>
                <td style={{ padding: "12px 16px", color: "#888" }}>{r.col4}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{r.col5}</td>
                {hasTrack && (
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

// BrowseHeader now delegates to the shared SiteHeader so the nav stays identical
// across the home page and every browse page. Kept as a re-export for the many
// pages that already import { BrowseHeader } from this module.
export { default as BrowseHeader } from "./SiteHeader"

export function BrowseFooter() {
  const YT = "https://www.youtube.com/@nathanielbooth"
  return (
    <footer style={{ borderTop: "1px solid #f0f0f0", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <span style={{ fontSize: 13, color: "#bbb" }}>© {new Date().getFullYear()} Fat Stacks Academy</span>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <a href={YT} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>YouTube</a>
          <Link href="/stacksos" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Stacks OS</Link>
          <Link href="/blog" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>Blog</Link>
          <Link href="/bonuses" style={{ fontSize: 13, color: "#bbb", textDecoration: "none" }}>All bonuses</Link>
        </div>
      </div>
    </footer>
  )
}

export function StacksOsCta({ totalBonuses }: { totalBonuses: number }) {
  return (
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
      <div style={{ fontSize: 12, color: "#999", marginTop: 12 }}>$10/month or $99/year · most first bonuses are $300–$400</div>
    </div>
  )
}

// Bank-bonus sub-switcher. Credit cards are their own top-level pillar now, so
// "Spending" is intentionally absent — these three are the bank categories.
export function CategoryCrossNav({ current }: { current: "checking" | "savings" | "brokerage" }) {
  const links = [
    { id: "checking", label: "Checking", emoji: "🏦", desc: "Direct-deposit bonuses" },
    { id: "savings", label: "Savings", emoji: "💰", desc: "Park-cash bonuses + HYSA" },
    { id: "brokerage", label: "Brokerage", emoji: "📈", desc: "Robinhood, Webull, Public, etc." },
  ] as const
  return (
    <div className="bbs-cross" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 48 }}>
      {links.map(l => {
        const active = l.id === current
        return (
          <Link key={l.id} href={`/${l.id}`} style={{
            padding: "16px 18px",
            background: active ? "#0d7c5f" : "#f8faf9",
            color: active ? "#fff" : "#111",
            border: `1px solid ${active ? "#0d7c5f" : "#e8e8e8"}`,
            borderRadius: 12,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>{l.emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{l.label}</div>
              <div style={{ fontSize: 12, opacity: active ? 0.85 : 0.6 }}>{l.desc}</div>
            </div>
          </Link>
        )
      })}
      <style>{`
        @media (max-width: 700px) {
          .bbs-cross { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
