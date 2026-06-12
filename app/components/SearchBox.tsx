"use client"

import Link from "next/link"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import type { SearchEntry } from "../../lib/searchIndex"

/**
 * Global search dropdown — matches across bank bonuses, savings, and
 * credit cards. Filters in-memory client-side from a pre-projected
 * index (see lib/searchIndex.ts) so there's no API round-trip.
 *
 * Matching is a case-insensitive substring against bank/issuer name,
 * product type, bonus amount, and the entry slug. Up to 8 results
 * render in the dropdown; clicking a row navigates to the catalog
 * page for the entry. A small "Apply →" link on each row goes
 * straight through /go/{id} for high-intent users.
 */
export default function SearchBox({ entries }: { entries: SearchEntry[] }) {
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    const matches: SearchEntry[] = []
    for (const e of entries) {
      if (e.searchText.includes(term)) {
        matches.push(e)
        if (matches.length >= 8) break
      }
    }
    return matches
  }, [q, entries])

  useEffect(() => {
    setActiveIdx(0)
  }, [q])

  const close = useCallback(() => {
    setOpen(false)
    setQ("")
  }, [])

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[activeIdx]) {
      window.location.href = results[activeIdx].href
    } else if (e.key === "Escape") {
      close()
    }
  }

  const kindBadge = (kind: SearchEntry["kind"]) => {
    const palette: Record<SearchEntry["kind"], { bg: string; fg: string; label: string }> = {
      checking: { bg: "#e8f3fb", fg: "#1463a8", label: "Bank" },
      savings: { bg: "#eaf6ec", fg: "#1e7a3a", label: "Savings" },
      card: { bg: "#fdf1e0", fg: "#9a5400", label: "Card" },
    }
    const c = palette[kind]
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          background: c.bg,
          color: c.fg,
          padding: "2px 6px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        {c.label}
      </span>
    )
  }

  return (
    <div
      ref={wrapRef}
      className="site-search"
      style={{ position: "relative", flex: "0 1 280px", minWidth: 180 }}
    >
      <input
        type="search"
        placeholder="Search cards, banks, bonuses…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        aria-label="Search bonuses, cards, and banks"
        style={{
          width: "100%",
          padding: "8px 12px",
          fontSize: 13,
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          background: "#fafafa",
          outline: "none",
        }}
      />
      {open && q.trim().length >= 2 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e6e6e6",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 40,
            overflow: "hidden",
            maxHeight: 420,
            overflowY: "auto",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "14px 12px", fontSize: 13, color: "#888" }}>
              No matches for &ldquo;{q.trim()}&rdquo;
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.id}
                role="option"
                aria-selected={i === activeIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: i === activeIdx ? "#f4f7fa" : "transparent",
                  borderBottom: "1px solid #f3f3f3",
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <Link
                  href={r.href}
                  onClick={close}
                  style={{
                    flex: 1,
                    textDecoration: "none",
                    color: "#111",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {kindBadge(r.kind)}
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#777" }}>{r.subtitle}</div>
                </Link>
                <Link
                  href={r.applyHref}
                  onClick={close}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0d7c5f",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Apply →
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
