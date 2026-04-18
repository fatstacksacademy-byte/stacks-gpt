import { ImageResponse } from "next/og"

export const runtime = "edge"

/**
 * Dynamic Open Graph image endpoint.
 *
 * Usage:
 *   /api/og?title=Chase%20%24900%20Bonus&amount=%24900&kind=checking
 *
 * Query params:
 *   title   — main headline (required)
 *   amount  — dollar amount badge in the corner (optional)
 *   kind    — "checking" | "savings" | "credit-card" | "guide" (optional, colors the accent)
 *   bank    — bank/issuer name shown above the title (optional)
 *
 * Rendered as a 1200×630 PNG at the edge. Twitter/LinkedIn/iMessage all pull
 * this when a page is shared, so every blog post gets a real social preview
 * instead of a blank card.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const title = url.searchParams.get("title") ?? "Fat Stacks Academy"
  const amount = url.searchParams.get("amount")
  const bank = url.searchParams.get("bank")
  const kind = url.searchParams.get("kind") ?? "guide"

  const accent =
    kind === "savings"
      ? "#0d7c5f"
      : kind === "credit-card"
        ? "#7c3aed"
        : kind === "checking"
          ? "#0d7c5f"
          : "#0d7c5f"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafafa",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: accent,
          }}
        />

        {/* Top: brand + amount */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              $
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: "-0.01em" }}>
              Fat Stacks Academy
            </div>
          </div>
          {amount && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: "12px 24px",
                background: accent,
                color: "#fff",
                borderRadius: 14,
                minWidth: 160,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.9,
                }}
              >
                Bonus
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{amount}</div>
            </div>
          )}
        </div>

        {/* Middle: bank + title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "95%" }}>
          {bank && (
            <div
              style={{
                fontSize: 22,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              {bank}
            </div>
          )}
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#111",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: footer strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e6e6e6",
            paddingTop: 20,
          }}
        >
          <div style={{ fontSize: 18, color: "#666" }}>
            Bank bonuses. Honest math. Zero fluff.
          </div>
          <div style={{ fontSize: 18, color: "#999", letterSpacing: "0.02em" }}>
            fatstacksacademy.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  )
}
