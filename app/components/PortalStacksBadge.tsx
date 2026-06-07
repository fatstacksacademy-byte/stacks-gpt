"use client"

import { useState, useRef, useEffect } from "react"
import { getPortalStacks, hasPortalStacks } from "../../lib/data/portalStacks"

/**
 * Clickable "Portal Stack" pill. Renders nothing if the bonus has no
 * known portal coverage. Opens a small popover with portal links —
 * safe to nest inside a parent <a> because all clicks are buttons
 * (no nested anchors) and we stopPropagation/preventDefault on the
 * pill so the parent card link doesn't fire.
 */
export default function PortalStacksBadge({ bonusId }: { bonusId?: string | null }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  if (!bonusId || !hasPortalStacks(bonusId)) return null
  const options = getPortalStacks(bonusId)

  const stop = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={(e) => { stop(e); setOpen(!open) }}
        title="Cashback portals that have historically run a stack on this bonus"
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#0d7c5f",
          background: "#e6f5f0",
          border: "1px solid #a7f3d0",
          padding: "2px 8px",
          borderRadius: 99,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          lineHeight: 1.2,
        }}
      >
        Portal Stack
      </button>

      {open && (
        <div
          onClick={stop}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: 10,
            minWidth: 240,
            maxWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            Check these portals
          </div>
          {options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                stop(e)
                window.open(o.url, "_blank", "noopener,noreferrer")
              }}
              style={{
                fontSize: 12,
                color: "#444",
                background: "#f8faf9",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                padding: "6px 10px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: "#0d7c5f", flexShrink: 0 }}>{o.portal} →</span>
              {o.note && (
                <span style={{ color: "#888", fontSize: 10, textAlign: "right", lineHeight: 1.35 }}>
                  {o.note}
                </span>
              )}
            </button>
          ))}
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, lineHeight: 1.4 }}>
            Portal rates change daily — confirm live before applying.
          </div>
        </div>
      )}
    </span>
  )
}
