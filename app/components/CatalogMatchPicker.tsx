"use client"

import { useMemo, useState } from "react"
import { type CatalogMatch } from "../../lib/catalogMatching"

/**
 * Small inline picker that lets the user confirm a catalog match for a
 * custom bonus or an owned card. Shows the top suggestions from a fuzzy
 * search plus a free-text box for when the auto-match misses.
 *
 * The parent owns the match list (via matchCustomBonusCandidates /
 * matchOwnedCardCandidates) and the full-text search callback.
 */
export default function CatalogMatchPicker({
  sourceName,
  topCandidates,
  allCandidates,
  onMatch,
  onCancel,
  actionLabel = "Match & promote",
}: {
  sourceName: string
  topCandidates: CatalogMatch[]
  /** Full candidate list for free-text search — expensive to compute so the parent owns it */
  allCandidates: { id: string; name: string }[]
  onMatch: (id: string, name: string) => void | Promise<void>
  onCancel: () => void
  actionLabel?: string
}) {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(topCandidates[0]?.id ?? null)

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as { id: string; name: string }[]
    return allCandidates
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query, allCandidates])

  const displayList = query.trim() ? searchResults : topCandidates

  return (
    <div style={{
      background: "#fff", border: "1px solid #d0e8dd", borderRadius: 12,
      padding: "14px 16px", marginTop: 10,
    }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
        Match &ldquo;<strong>{sourceName}</strong>&rdquo; to a catalog entry:
      </div>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search catalog…"
        style={{
          width: "100%", padding: "8px 12px", fontSize: 13,
          border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff",
          color: "#111", outline: "none", boxSizing: "border-box", marginBottom: 10,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
        {displayList.length === 0 ? (
          <div style={{ fontSize: 12, color: "#bbb", padding: "8px 0" }}>No matches. Try a different search.</div>
        ) : (
          displayList.map(c => {
            const isSelected = selectedId === c.id
            const suggestedScore = "score" in c ? (c as CatalogMatch).score : null
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, padding: "7px 10px",
                  background: isSelected ? "#e6f5f0" : "transparent",
                  border: `1px solid ${isSelected ? "#0d7c5f" : "transparent"}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "left", fontSize: 13,
                }}
              >
                <span style={{ color: "#111", fontWeight: isSelected ? 600 : 400 }}>{c.name}</span>
                {suggestedScore != null && (
                  <span style={{ fontSize: 10, color: "#0d7c5f", fontWeight: 700 }}>
                    {Math.round(suggestedScore * 100)}% match
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => {
            if (!selectedId) return
            const choice = displayList.find(c => c.id === selectedId)
            if (!choice) return
            void onMatch(choice.id, choice.name)
          }}
          disabled={!selectedId}
          style={{
            padding: "7px 14px", fontSize: 12, fontWeight: 700,
            background: selectedId ? "#0d7c5f" : "#ccc", color: "#fff",
            border: "none", borderRadius: 6, cursor: selectedId ? "pointer" : "not-allowed",
          }}
        >
          {actionLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 14px", fontSize: 12, color: "#999",
            background: "none", border: "1px solid #e0e0e0", borderRadius: 6, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
