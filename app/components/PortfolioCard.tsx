"use client"

type Breakdown = {
  label: string
  amount: number
  href: string
  color?: string
}

/**
 * 12-month portfolio projection — aggregates across paycheck, spending, savings.
 * Breakdown items link to each module's deep view.
 */
export default function PortfolioCard({
  total,
  breakdown,
  subtitle,
}: {
  total: number
  breakdown: Breakdown[]
  subtitle?: string
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
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.75 }}>
        12-month total portfolio
      </div>
      <div style={{ fontSize: 44, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em" }}>
        ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{subtitle}</div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${breakdown.length}, 1fr)`,
          gap: 12,
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {breakdown.map((b) => (
          <a
            key={b.label}
            href={b.href}
            style={{
              display: "block",
              textDecoration: "none",
              color: "#fff",
              padding: "4px 0",
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {b.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
              ${b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
