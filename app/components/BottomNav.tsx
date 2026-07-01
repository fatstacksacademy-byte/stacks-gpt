"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { DK, MODULE } from "../../lib/stacksTheme"

/**
 * Mobile bottom tab bar for Stacks OS. The top CheckpointNav is a
 * horizontal-scroll bar with 7+ tabs — unusable on a phone. On <768px we hide
 * it (see globals.css / CheckpointNav) and show this instead: five thumb-sized
 * primary destinations + a "More" sheet for the long tail of tools.
 *
 * Desktop is untouched — this whole bar is display:none above 768px.
 */

const PRIMARY = [
  { label: "Home", href: "/stacksos", exact: true, icon: "🏠", accent: MODULE.savings.fg },
  { label: "Paycheck", href: "/stacksos/paycheck", icon: "💵", accent: MODULE.paycheck.fg },
  { label: "Savings", href: "/stacksos/savings", icon: "🏦", accent: MODULE.savings.fg },
  { label: "Spending", href: "/stacksos/spending", icon: "💳", accent: MODULE.spending.fg },
] as const

const MORE = [
  { label: "Debt", href: "/stacksos/debt", icon: "📉", desc: "Cheapest, fastest payoff plan" },
  { label: "0% APR", href: "/stacksos/intro-apr", icon: "🧊", desc: "Float cash on a 0%-APR card" },
  { label: "Card Value", href: "/stacksos/card-calculator", icon: "🧮", desc: "What a card is really worth" },
  { label: "Sequencer", href: "/stacksos/sequencer", icon: "🎯", desc: "Optimize the order of your bonuses" },
  { label: "History", href: "/stacksos/history", icon: "🏆", desc: "Your completed wins" },
  { label: "Import", href: "/stacksos/import", icon: "📊", desc: "Bring in a tracking spreadsheet" },
  { label: "Taxes", href: "/stacksos/taxes", icon: "🧾", desc: "Bonus income summary" },
  { label: "Profile", href: "/stacksos/profile", icon: "⚙️", desc: "Your account & pay details" },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the sheet whenever the route changes (a tap navigated away).
  useEffect(() => { setMoreOpen(false) }, [pathname])

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)
  const moreActive = MORE.some((m) => pathname.startsWith(m.href))

  return (
    <>
      {/* keeps the last bit of page content from hiding behind the fixed bar */}
      <div className="bottom-nav-spacer" aria-hidden />

      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          className="bottom-nav-only"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, backdropFilter: "blur(2px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61,
              background: DK.panel, borderTop: `1px solid ${DK.border2}`,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: "10px 14px calc(20px + env(safe-area-inset-bottom))",
              maxHeight: "70vh", overflowY: "auto",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, background: DK.border2, margin: "4px auto 12px" }} />
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: DK.textFaint, padding: "0 6px 8px" }}>
              More tools
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {MORE.map((m) => {
                const active = pathname.startsWith(m.href)
                return (
                  <a
                    key={m.href}
                    href={m.href}
                    style={{
                      display: "flex", flexDirection: "column", gap: 3,
                      padding: "13px 14px", borderRadius: 12, textDecoration: "none",
                      background: active ? MODULE.paycheck.soft : DK.panel2,
                      border: `1px solid ${active ? MODULE.paycheck.fg + "66" : DK.border}`,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: DK.text }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: DK.textMute, lineHeight: 1.35 }}>{m.desc}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="bottom-nav-only"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 55,
          display: "flex", alignItems: "stretch",
          background: DK.panel, borderTop: `1px solid ${DK.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.35)",
        }}
      >
        {PRIMARY.map((t) => {
          const active = isActive(t.href, (t as { exact?: boolean }).exact)
          return (
            <a
              key={t.href}
              href={t.href}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                padding: "9px 2px 8px", textDecoration: "none", minHeight: 56,
                color: active ? t.accent : DK.textMute,
                borderTop: `2px solid ${active ? t.accent : "transparent"}`,
                marginTop: -1,
              }}
            >
              <span style={{ fontSize: 19, lineHeight: 1, filter: active ? "none" : "grayscale(0.3)", opacity: active ? 1 : 0.85 }}>{t.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{t.label}</span>
            </a>
          )
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            padding: "9px 2px 8px", background: "none", border: "none", cursor: "pointer", minHeight: 56,
            color: moreOpen || moreActive ? DK.text : DK.textMute,
            borderTop: `2px solid ${moreOpen || moreActive ? DK.textDim : "transparent"}`,
            marginTop: -1,
          }}
        >
          <span style={{ fontSize: 19, lineHeight: 1 }}>☰</span>
          <span style={{ fontSize: 10.5, fontWeight: moreOpen || moreActive ? 800 : 600 }}>More</span>
        </button>
      </nav>

      <style>{`
        .bottom-nav-only { display: none; }
        .bottom-nav-spacer { display: none; }
        @media (max-width: 767px) {
          .bottom-nav-only { display: flex; }
          .bottom-nav-spacer { display: block; height: calc(58px + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </>
  )
}
