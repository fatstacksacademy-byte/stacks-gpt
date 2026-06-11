"use client"

import { useRouter } from "next/navigation"
import { US_STATES } from "../../lib/data/catalogTaxonomy"

/**
 * Compact state selector for the per-state bonus pages. Drops users
 * straight onto another state without scrolling to the bottom of the
 * page or navigating back to the directory.
 *
 * Server-rendered as a labeled native <select> for accessibility + zero-
 * JS fallback (the form's GET action redirects to /bank-bonuses-by-state
 * even when JS is off, so this remains useful in any browser).
 */
export default function StateSwitcher({ currentSlug }: { currentSlug: string }) {
  const router = useRouter()
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "#666",
      }}
    >
      <span style={{ fontWeight: 600 }}>Switch state:</span>
      <select
        defaultValue={currentSlug}
        onChange={(e) => {
          const slug = e.target.value
          if (slug && slug !== currentSlug) {
            router.push(`/bank-bonuses-by-state/${slug}`)
          }
        }}
        style={{
          padding: "6px 10px",
          fontSize: 12,
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          background: "#fff",
          color: "#111",
          cursor: "pointer",
        }}
      >
        {US_STATES.map((s) => (
          <option key={s.code} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  )
}
