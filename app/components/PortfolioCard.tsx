"use client"

type Breakdown = {
  label: string
  amount: number
  href: string
}

/**
 * Dashboard portfolio card — the "big total" hero.
 *
 * Layout:
 *   PROJECTED 12 MONTH STACK
 *   $12,500  (Paycheck $5,000 · Spending $4,000 · Savings $3,500)
 *
 *   LIFETIME EARNED                    IN PROGRESS
 *   $3,200                             $1,450
 *
 * The parenthetical breakdown each deep-links into its module. Lifetime
 * earned reflects all completed bonuses across paycheck / custom /
 * spending / savings tables; in-progress sums started-but-not-yet-closed
 * bonus amounts.
 */
export default function PortfolioCard({
  total,
  breakdown,
  lifetimeEarned,
  inProgress,
}: {
  total: number
  breakdown: Breakdown[]
  lifetimeEarned: number
  inProgress: number
}) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0d7c5f 0%, #0a5c47 100%)",
        borderRadius: 14,
        padding: "24px 28px",
        color: "#fff",
        marginBottom: 24,
        boxShadow: "0 4px 18px rgba(13, 124, 95, 0.18)",
      }}
      className="portfolio-card"
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.75 }}>
        Projected 12 Month Stack
      </div>
      <div
        className="portfolio-total-row"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginTop: 4,
          flexWrap: "wrap",
        }}
      >
        <div
          className="portfolio-total"
          style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        {breakdown.length > 0 && (
          <div
            className="portfolio-breakdown"
            style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}
          >
            (
            {breakdown.map((b, i) => (
              <span key={b.label}>
                <a
                  href={b.href}
                  style={{ color: "#fff", textDecoration: "none", borderBottom: "1px dotted rgba(255,255,255,0.4)" }}
                >
                  {b.label} ${b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </a>
                {i < breakdown.length - 1 && <span style={{ opacity: 0.6 }}> · </span>}
              </span>
            ))}
            )
          </div>
        )}
      </div>

      <div
        className="portfolio-stats"
        style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7 }}>
            Lifetime earned
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 3 }}>
            ${lifetimeEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7 }}>
            In progress
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 3 }}>
            ${inProgress.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .portfolio-card { padding: 20px 20px !important; border-radius: 12px !important; }
          .portfolio-total { font-size: 32px !important; }
          .portfolio-breakdown { font-size: 12px !important; width: 100%; }
        }
      `}</style>
    </div>
  )
}
