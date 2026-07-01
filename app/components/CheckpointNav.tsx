"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import StacksAccountMenu from "./StacksAccountMenu"

const tabs = [
  { label: "Dashboard", href: "/stacksos", exact: true, desc: "Your bonuses in progress and what to do next" },
  { label: "Paycheck", href: "/stacksos/paycheck", desc: "Checking-account bonuses you earn with direct deposit" },
  { label: "Savings", href: "/stacksos/savings", desc: "Savings & cash bonuses for money you park" },
  { label: "Spending", href: "/stacksos/spending", beta: true, desc: "Credit-card welcome bonuses you earn by spending" },
  { label: "Debt", href: "/stacksos/debt", beta: true, desc: "Plan the cheapest, fastest way to pay off debt" },
  { label: "0% APR", href: "/stacksos/intro-apr", beta: true, desc: "Earn interest by floating cash on a 0%-APR card" },
  { label: "Card Value", href: "/stacksos/card-calculator", beta: true, desc: "Estimate what a credit card is really worth for your spending" },
] as const

// In-progress surfaces — visible as "coming soon" but still reachable while building.
const comingSoon = [
  { label: "Cards", href: "/stacksos/cards" },
  { label: "Base", href: "/stacksos/base" },
] as const

// Routes that have been reskinned to the dark "mission board" theme. The nav
// renders dark on these so it flows into the tab below instead of floating a
// white bar over a near-black board; every other route stays light.
const DARK_ROUTES = ["/stacksos/paycheck", "/stacksos/spending", "/stacksos/savings"]

// Dark palette — mirrors the DK constant in RoadmapClient so the shared nav
// matches the reskinned tabs exactly.
const DK = {
  panel: "#161922",
  panel2: "#0f1219",
  border: "#23262e",
  border2: "#2a2e38",
  textMute: "#9aa1ad",
  green: "#0d9668",
  greenFg: "#34d399",
  gold: "#f7d774",
  goldBg: "#1c160a",
}

export default function CheckpointNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Dashboard ("/stacksos" exactly) is now the dark mission board too — match it
  // precisely so the still-light tool routes (/stacksos/debt, /profile, …) keep
  // their light nav until they're ported.
  const dark = pathname === "/stacksos" || DARK_ROUTES.some(r => pathname.startsWith(r))

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
    <div className={dark ? "cpnav-root cpnav-dark" : "cpnav-root"} style={{ display: "flex", gap: 0, borderBottom: `1px solid ${dark ? DK.border : "#e8e8e8"}`, background: dark ? DK.panel : "#fff" }}>
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
                title={tab.desc}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? (dark ? DK.greenFg : "#0d7c5f") : (dark ? DK.textMute : "#999"),
                  textDecoration: "none",
                  borderBottom: active ? `2px solid ${dark ? DK.greenFg : "#0d7c5f"}` : "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tab.label}
                {"beta" in tab && tab.beta && (
                  <sup style={{ fontSize: 8, fontWeight: 700, color: dark ? DK.greenFg : "#0d7c5f", marginLeft: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
                color: comingSoonActive ? (dark ? DK.greenFg : "#0d7c5f") : (dark ? DK.textMute : "#999"),
                background: "none",
                border: "none",
                borderBottom: comingSoonActive ? `2px solid ${dark ? DK.greenFg : "#0d7c5f"}` : "2px solid transparent",
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
                  background: dark ? DK.panel : "#fff",
                  border: `1px solid ${dark ? DK.border2 : "#e8e8e8"}`,
                  borderRadius: 8,
                  boxShadow: dark ? "0 6px 20px rgba(0,0,0,0.5)" : "0 6px 20px rgba(0,0,0,0.10)",
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
                      color: dark ? DK.textMute : "#555",
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
                        color: dark ? DK.gold : "#b07b00",
                        background: dark ? DK.goldBg : "#fff5e0",
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
          <StacksAccountMenu compact dark={dark} />
        </div>
      </div>
      <style>{`
        .cpnav-tabs::-webkit-scrollbar { display: none; }
        .cpnav-soon-item:hover { background: #f4f4f4; }
        .cpnav-dark .cpnav-soon-item:hover { background: #1c2029; }
        @media (max-width: 767px) {
          .cpnav-inner { padding: 0 12px !important; justify-content: flex-end; min-height: 46px; }
          .cpnav-account { margin-left: 8px !important; }
          /* On phones the BottomNav owns section switching — hide the
             horizontal-scroll tab strip and keep just the account menu. */
          .cpnav-tabs { display: none !important; }
        }
      `}</style>
    </div>
  )
}
