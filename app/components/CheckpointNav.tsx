"use client"

import { usePathname } from "next/navigation"

const tabs = [
  { label: "Dashboard", href: "/stacksos", exact: true },
  { label: "Paycheck", href: "/stacksos/paycheck" },
  { label: "Spending", href: "/stacksos/spending" },
  { label: "Savings", href: "/stacksos/savings" },
] as const

export default function CheckpointNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          display: "flex",
          gap: 0,
          padding: "0 32px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
        className="cpnav-inner"
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
            </a>
          )
        })}
      </div>
      <style>{`
        .cpnav-inner::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .cpnav-inner { padding: 0 12px !important; }
        }
      `}</style>
    </div>
  )
}
