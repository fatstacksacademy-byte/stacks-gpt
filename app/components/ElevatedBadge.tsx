import type { CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { isElevated, elevatedStandardLabel, elevatedEndsLabel } from "../../lib/elevatedOffers"

/**
 * "⚡ ELEVATED" badge for cards whose current bonus is above their usual SUB.
 * `compact` drops the "· usually X" tail (for tight tiles).
 */
export default function ElevatedBadge({ card, compact = false }: { card: CreditCardBonus; compact?: boolean }) {
  if (!isElevated(card)) return null
  const std = elevatedStandardLabel(card)
  const ends = elevatedEndsLabel(card)
  const title = `Elevated offer${std ? ` — usually ${std}` : ""}${ends ? `, through ${ends}` : " (limited time)"}`
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 800,
        color: "#fff",
        background: "linear-gradient(90deg, #d97706, #f59e0b)",
        padding: "2px 8px",
        borderRadius: 999,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
      }}
    >
      ⚡ ELEVATED
      {!compact && std ? <span style={{ fontWeight: 600, opacity: 0.95 }}> · usually {std}</span> : null}
    </span>
  )
}
