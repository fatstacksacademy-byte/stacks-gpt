"use client"

import { usePathname } from "next/navigation"

const tabs = [
  { label: "Paycheck", href: "/roadmap" },
  { label: "Spending", href: "/roadmap/spending" },
  { label: "Savings", href: "/roadmap/savings" },
] as const

export default function CheckpointNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/roadmap") return pathname === "/roadmap"
    return pathname.startsWith(href)
  }

  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", gap: 0, padding: "0 32px" }} className="cpnav-inner">
        {tabs.map(tab => {
          const active = isActive(tab.href)
          return (
            <a
              key={tab.href}
              href={tab.href}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#0d7c5f" : "#999",
                textDecoration: "none",
                borderBottom: active ? "2px solid #0d7c5f" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </a>
          )
        })}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .cpnav-inner { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  )
}
