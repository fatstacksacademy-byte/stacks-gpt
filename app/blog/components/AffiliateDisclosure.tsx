// Shared affiliate disclosure for blog pages. Two variants:
//
//   <AffiliateDisclosure variant="inline" />  — short, one-line note
//   intended to sit right next to an Apply CTA so the disclosure is
//   "close to the recommendation" per FTC guidance.
//
//   <AffiliateDisclosure variant="block" />   — full disclosure block
//   for the end of a page. Replaces the prior generic disclaimer.

type Variant = "inline" | "block"

export default function AffiliateDisclosure({ variant = "block" }: { variant?: Variant }) {
  if (variant === "inline") {
    return (
      <p style={{ fontSize: 11, color: "#888", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
        <strong style={{ color: "#666" }}>Affiliate disclosure:</strong>{" "}
        Fat Stacks Academy may earn a commission if you open an account through this link, at no additional cost to you.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 32, padding: "20px", background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Affiliate Disclosure
      </div>
      <p style={{ fontSize: 12, color: "#777", lineHeight: 1.7, margin: 0 }}>
        Fat Stacks Academy may earn a commission when you open an account through links on this page,
        at no additional cost to you. Commissions do not influence our reviews — we verify offer terms
        directly with each bank before publishing and do not accept paid placement in our rankings.
        Bonus offers, requirements, and fees are determined by each financial institution and may change
        at any time. Always verify the current terms directly with the bank before applying. This content
        is for informational purposes only and does not constitute financial advice.
      </p>
    </div>
  )
}
