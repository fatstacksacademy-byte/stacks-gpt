"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import StacksAccountMenu from "./StacksAccountMenu"

const tabs = [
  { label: "Dashboard", href: "/stacksos", exact: true },
  { label: "Paycheck", href: "/stacksos/paycheck" },
  { label: "Savings", href: "/stacksos/savings" },
  { label: "Spending", href: "/stacksos/spending", beta: true },
  { label: "Debt", href: "/stacksos/debt", beta: true },
  { label: "0% APR", href: "/stacksos/intro-apr", beta: true },
] as const

// In-progress surfaces — visible as "coming soon" but still reachable while building.
const comingSoon = [
  { label: "Cards", href: "/stacksos/cards" },
  { label: "Base", href: "/stacksos/base" },
] as const

export default function CheckpointNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const comingSoonActive = comingSoon.some(item => pathname.startsWith(item.href))

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "0 32px",
        }}
        className="cpnav-inner"
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
          className="cpnav-tabs"
        >
          {tabs.map(tab => {
            const active = isActive(tab.href, "exact" in tab ? tab.exact : undefined)
            return (
              <a
                key={tab.href}
                href={tab.href}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#0d7c5f" : "#999",
                  textDecoration: "none",
                  borderBottom: active ? "2px solid #0d7c5f" : "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tab.label}
                {"beta" in tab && tab.beta && (
                  <sup style={{ fontSize: 8, fontWeight: 700, color: "#0d7c5f", marginLeft: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Beta
                  </sup>
                )}
              </a>
            )
          })}

          <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="true"
              aria-expanded={open}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: comingSoonActive ? 700 : 500,
                color: comingSoonActive ? "#0d7c5f" : "#999",
                background: "none",
                border: "none",
                borderBottom: comingSoonActive ? "2px solid #0d7c5f" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              Coming Soon
              <span style={{ fontSize: 9, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
            </button>
            {open && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 8,
                  marginTop: 2,
                  background: "#fff",
                  border: "1px solid #e8e8e8",
                  borderRadius: 8,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
                  padding: 6,
                  minWidth: 170,
                  zIndex: 50,
                }}
              >
                {comingSoon.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="cpnav-soon-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#555",
                      textDecoration: "none",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#b07b00",
                        background: "#fff5e0",
                        padding: "2px 6px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Soon
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginLeft: 12, flexShrink: 0 }} className="cpnav-account">
          <StacksAccountMenu compact />
        </div>
      </div>
      <style>{`
        .cpnav-tabs::-webkit-scrollbar { display: none; }
        .cpnav-soon-item:hover { background: #f4f4f4; }
        @media (max-width: 768px) {
          .cpnav-inner { padding: 0 12px !important; }
          .cpnav-account { margin-left: 8px !important; }
        }
      `}</style>
    </div>
  )
}
