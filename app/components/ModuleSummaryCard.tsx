"use client"

export type ModuleSummaryStat = {
  label: string
  value: string
}

export default function ModuleSummaryCard({
  title,
  tagline,
  href,
  stats,
  nextAction,
  ctaLabel = "Open strategy",
  badge,
}: {
  title: string
  tagline: string
  href: string
  stats: ModuleSummaryStat[]
  nextAction?: string
  ctaLabel?: string
  badge?: string
}) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        padding: "18px 20px",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#0d7c5f"
        e.currentTarget.style.transform = "translateY(-1px)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#e8e8e8"
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{title}</div>
        {badge && (
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "#fef3c7",
              color: "#92400e",
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>{tagline}</div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginTop: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {nextAction && (
        <div
          style={{
            background: "#f7f7f5",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#444",
            marginBottom: 10,
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontWeight: 600, color: "#0d7c5f" }}>Next: </span>
          {nextAction}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          color: "#0d7c5f",
          marginTop: 2,
        }}
      >
        {ctaLabel} →
      </div>
    </a>
  )
}
