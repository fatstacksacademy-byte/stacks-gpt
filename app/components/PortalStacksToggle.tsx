"use client"

import { useState } from "react"
import { getPortalStacks } from "../../lib/data/portalStacks"

export default function PortalStacksToggle({ bonusId }: { bonusId: string }) {
  const [open, setOpen] = useState(false)
  const options = getPortalStacks(bonusId)
  if (options.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 11,
          color: "#0d7c5f",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        {open ? "− Hide portal stacks" : `+ Portal stacks (${options.length})`}
      </button>

      {open && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          {options.map((o, i) => (
            <a
              key={i}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              style={{
                fontSize: 11,
                color: "#444",
                textDecoration: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                padding: "4px 8px",
                background: "#f8faf9",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
              }}
            >
              <span style={{ fontWeight: 600, color: "#0d7c5f" }}>{o.portal} →</span>
              {o.note && <span style={{ color: "#888", fontSize: 10, textAlign: "right" }}>{o.note}</span>}
            </a>
          ))}
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, lineHeight: 1.4 }}>
            Portal rates change daily — confirm live before applying.
          </div>
        </div>
      )}
    </div>
  )
}
