"use client"

import React, { useEffect, useState, useCallback } from "react"
import { createClient } from "../../../lib/supabase/client"
import { bonuses as allBonuses } from "../../../lib/data/bonuses"

const money = (n: number) => `$${Math.round(n).toLocaleString()}`

// `completed_bonuses` row shape. Note: the DB column is `opened_date`, not
// `started_date` — the previous typing used the wrong name, which meant the
// taxes page showed $0 for every closed checking bonus because getYear()
// received undefined and the amount fallback never fired.
type BonusRecord = {
  id: string
  bonus_id: string
  actual_amount: number | null
  opened_date: string
  closed_date: string | null
  bonus_received: boolean
}

type SavingsRecord = {
  id: string
  institution_name: string
  bonus_amount: number | null
  actual_value: number | null
  status: string
  opened_date: string | null
}

type OwnedCardRow = {
  id: string
  card_name: string
  signup_bonus_value: number | null
  actual_value: number | null
  status: string
  opened_date: string | null
}

export default function TaxesClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [bonuses, setBonuses] = useState<BonusRecord[]>([])
  const [savings, setSavings] = useState<SavingsRecord[]>([])
  const [spending, setSpending] = useState<OwnedCardRow[]>([])
  const [taxRate, setTaxRate] = useState(20)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: s }, { data: sp }] = await Promise.all([
      supabase.from("completed_bonuses").select("*").eq("user_id", userId).order("opened_date", { ascending: false }),
      supabase.from("savings_entries").select("*").eq("user_id", userId).order("opened_date", { ascending: false }),
      supabase.from("owned_cards").select("*").eq("user_id", userId).order("opened_date", { ascending: false }),
    ])
    setBonuses((b ?? []) as BonusRecord[])
    setSavings((s ?? []) as SavingsRecord[])
    setSpending((sp ?? []) as OwnedCardRow[])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  // Group by tax year
  const currentYear = new Date().getFullYear()
  function getYear(dateStr: string | null): number {
    if (!dateStr) return currentYear
    return new Date(dateStr).getFullYear()
  }

  // Aggregate earnings by year
  const yearData: Record<number, { checking: number; savings: number; creditCards: number; items: { name: string; type: string; amount: number; date: string }[] }> = {}

  function ensureYear(y: number) {
    if (!yearData[y]) yearData[y] = { checking: 0, savings: 0, creditCards: 0, items: [] }
  }

  // Checking bonuses
  for (const b of bonuses) {
    if (!b.bonus_received) continue
    // actual_amount comes from the close modal when the user enters what
    // they actually received. If that's null, fall back to the catalog's
    // listed bonus_amount (lib/data/bonuses.ts) for the referenced bonus_id.
    const catalogEntry = allBonuses.find((x: { id: string; bonus_amount?: number; bank_name?: string }) => x.id === b.bonus_id)
    const amt = b.actual_amount ?? catalogEntry?.bonus_amount ?? 0
    if (amt <= 0) continue
    const dateStr = b.closed_date ?? b.opened_date
    const year = getYear(dateStr)
    ensureYear(year)
    yearData[year].checking += amt
    // Display the bank name from the catalog when available; fall back to a
    // humanized version of the bonus_id.
    const displayName = catalogEntry?.bank_name
      ?? b.bonus_id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    yearData[year].items.push({ name: displayName, type: "Checking Bonus", amount: amt, date: dateStr })
  }

  // Savings bonuses
  for (const s of savings) {
    if (s.status !== "completed") continue
    const amt = s.actual_value ?? s.bonus_amount ?? 0
    if (amt <= 0) continue
    const year = getYear(s.opened_date)
    ensureYear(year)
    yearData[year].savings += amt
    yearData[year].items.push({ name: s.institution_name, type: "Savings Bonus", amount: amt, date: s.opened_date ?? "" })
  }

  // Credit card bonuses
  for (const c of spending) {
    if (c.status !== "completed") continue
    const amt = c.actual_value ?? c.signup_bonus_value ?? 0
    if (amt <= 0) continue
    const year = getYear(c.opened_date)
    ensureYear(year)
    yearData[year].creditCards += amt
    yearData[year].items.push({ name: c.card_name, type: "Credit Card Bonus", amount: amt, date: c.opened_date ?? "" })
  }

  const years = Object.keys(yearData).map(Number).sort((a, b) => b - a)
  const grandTotal = years.reduce((s, y) => s + yearData[y].checking + yearData[y].savings + yearData[y].creditCards, 0)
  const grandTax = Math.round(grandTotal * taxRate / 100)

  function csvEscape(v: string | number): string {
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  function downloadCsv(year: number) {
    const d = yearData[year]
    if (!d) return
    const lines: string[] = []
    lines.push(`Stacks OS bonus income — ${year}`)
    lines.push(`Estimate only — file with the bank's 1099-INT, not these figures.`)
    lines.push("")
    lines.push(["Date", "Source", "Type", "Amount (USD)", "Taxable as interest?"].map(csvEscape).join(","))
    const sorted = d.items
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    for (const it of sorted) {
      const taxable = it.type === "Credit Card Bonus" ? "No (rebate)" : "Yes (1099-INT)"
      lines.push([it.date ?? "", it.name, it.type, it.amount.toFixed(2), taxable].map(csvEscape).join(","))
    }
    lines.push("")
    lines.push(["", "Checking bonus subtotal", "", d.checking.toFixed(2), "Yes"].map(csvEscape).join(","))
    lines.push(["", "Savings bonus subtotal", "", d.savings.toFixed(2), "Yes"].map(csvEscape).join(","))
    lines.push(["", "Credit card bonus subtotal", "", d.creditCards.toFixed(2), "No"].map(csvEscape).join(","))
    const taxable = d.checking + d.savings
    lines.push(["", "Estimated tax at " + taxRate + "%", "", Math.round(taxable * taxRate / 100).toFixed(2), ""].map(csvEscape).join(","))

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stacks-os-bonuses-${year}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#999", fontSize: 14 }}>Loading...</div></div>
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top Bar */}
      <div style={{ borderBottom: "1px solid #e8e8e8", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1100, margin: "0 auto", background: "#fff" }}>
        <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#111", textDecoration: "none" }}>Stacks OS</a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#bbb" }}>{userEmail}</span>
          <a href="/stacksos" style={{ fontSize: 12, color: "#999", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", textDecoration: "none" }}>&larr; Dashboard</a>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 32px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Tax Summary</h1>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 16px" }}>
          Bank bonuses are taxed as interest income (1099-INT). Credit card bonuses are generally not taxable. This page tracks what you should consider setting aside.
        </p>

        {/* Accuracy caveat */}
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 12,
            color: "#9a3412",
            lineHeight: 1.5,
          }}
        >
          <strong>Estimate only — not tax advice.</strong> These numbers reflect what you've logged
          in Stacks OS. They may differ from your actual 1099-INT because banks report using their
          own calculations (sometimes including accrued interest, refunds, fee reversals, or
          different posting dates). <strong>Always file with the figures on the 1099-INT the
          bank mails you.</strong> Use this export as a cross-check, not as your return.
        </div>

        {/* Tax rate control */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Tax rate:</span>
          <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)}
            style={{ width: 60, padding: "6px 10px", fontSize: 14, fontWeight: 700, border: "1px solid #e0e0e0", borderRadius: 6, textAlign: "center" }} min={0} max={50} />
          <span style={{ fontSize: 13, color: "#999" }}>%</span>
          <span style={{ fontSize: 11, color: "#bbb" }}>(federal + state combined estimate)</span>
        </div>

        {years.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#bbb", fontSize: 14 }}>
            No completed bonuses yet. Earnings will appear here as you complete bonuses.
          </div>
        ) : (
          <>
            {years.map(year => {
              const d = yearData[year]
              const yearTotal = d.checking + d.savings + d.creditCards
              const taxableAmount = d.checking + d.savings // CC bonuses generally not taxable
              const taxOwed = Math.round(taxableAmount * taxRate / 100)

              return (
                <div key={year} style={{ marginBottom: 24, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
                  {/* Year header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{year}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {d.items.length} bonus{d.items.length !== 1 ? "es" : ""} earned
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#0d7c5f" }}>{money(yearTotal)}</div>
                      <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>
                        Set aside: {money(taxOwed)}
                      </div>
                      <button
                        onClick={() => downloadCsv(year)}
                        style={{
                          fontSize: 11,
                          marginTop: 6,
                          padding: "4px 10px",
                          border: "1px solid #0d7c5f",
                          color: "#0d7c5f",
                          background: "#fff",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        ⤓ Download CSV
                      </button>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div style={{ padding: "12px 20px", display: "flex", gap: 20, borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>
                    {d.checking > 0 && (
                      <div>
                        <span style={{ color: "#888" }}>Checking: </span>
                        <span style={{ color: "#111", fontWeight: 600 }}>{money(d.checking)}</span>
                        <span style={{ color: "#d97706", marginLeft: 4 }}>({money(Math.round(d.checking * taxRate / 100))} tax)</span>
                      </div>
                    )}
                    {d.savings > 0 && (
                      <div>
                        <span style={{ color: "#888" }}>Savings: </span>
                        <span style={{ color: "#111", fontWeight: 600 }}>{money(d.savings)}</span>
                        <span style={{ color: "#d97706", marginLeft: 4 }}>({money(Math.round(d.savings * taxRate / 100))} tax)</span>
                      </div>
                    )}
                    {d.creditCards > 0 && (
                      <div>
                        <span style={{ color: "#888" }}>Credit Cards: </span>
                        <span style={{ color: "#111", fontWeight: 600 }}>{money(d.creditCards)}</span>
                        <span style={{ color: "#0d7c5f", marginLeft: 4 }}>(not taxable)</span>
                      </div>
                    )}
                  </div>

                  {/* Item list */}
                  <div style={{ padding: "0 20px" }}>
                    {d.items.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < d.items.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                        <div>
                          <span style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: 11, color: "#999", marginLeft: 8 }}>{item.type}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, color: "#bbb" }}>{item.date ? new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0d7c5f" }}>{money(item.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Grand total */}
            <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>All-Time Earnings</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{years.length} year{years.length !== 1 ? "s" : ""} tracked</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f" }}>{money(grandTotal)}</div>
                <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>Total tax reserve: {money(grandTax)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
