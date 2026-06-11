"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import TrackBonusButton from "./TrackBonusButton"
import type { ClientCatalogItem } from "../../lib/data/catalogTaxonomy"

const PAGE_SIZE = 10

type View = "bank" | "brokerage"

export default function StateOfferBrowser({
  items,
  stateCode,
  stateName,
  reviewHrefs,
}: {
  items: ClientCatalogItem[]
  stateCode: string
  stateName: string
  reviewHrefs: Record<string, string>
}) {
  const [view, setView] = useState<View>("bank")
  const [page, setPage] = useState(1)

  const visible = useMemo(() => {
    const filtered = items.filter(item => view === "brokerage" ? item.category === "brokerage" : item.category !== "brokerage")
    return filtered.sort((left, right) => {
      const leftLocal = left.availability === "state_restricted" && left.eligibleStates?.includes(stateCode)
      const rightLocal = right.availability === "state_restricted" && right.eligibleStates?.includes(stateCode)
      if (leftLocal !== rightLocal) return leftLocal ? -1 : 1
      return right.bonusAmount - left.bonusAmount
    })
  }, [items, stateCode, view])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = visible.slice(start, start + PAGE_SIZE)

  function selectView(next: View) {
    setView(next)
    setPage(1)
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Bonuses available in {stateName}
          </h2>
          <div style={{ fontSize: 13, color: "#777" }}>State-specific offers appear first. Browse ten at a time.</div>
        </div>
        <div style={{ display: "inline-flex", padding: 3, background: "#f2f4f3", borderRadius: 10 }}>
          <ViewButton active={view === "bank"} onClick={() => selectView("bank")}>Bank bonuses</ViewButton>
          <ViewButton active={view === "brokerage"} onClick={() => selectView("brokerage")}>Brokerage</ViewButton>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>
        {visible.length === 0
          ? `No ${view === "bank" ? "bank" : "brokerage"} offers are currently listed for ${stateName}.`
          : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}`}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {pageItems.map(item => {
          const local = item.availability === "state_restricted" && item.eligibleStates?.includes(stateCode)
          const href = reviewHrefs[item.id]
          return (
            <article key={item.id} className="state-offer-card" style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: 16,
              alignItems: "center",
              padding: "16px 18px",
              background: "#fff",
              border: local ? "1px solid #83cfb4" : "1px solid #e5e8e6",
              borderRadius: 12,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 15, color: "#111" }}>{item.shortBankName}</strong>
                  <Badge>{categoryLabel(item.category)}</Badge>
                  {local ? <Badge accent>{stateCode} offer</Badge> : <Badge>Nationwide</Badge>}
                  {item.expirationStatus === "unknown" && <Badge muted>Expiry unverified</Badge>}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: "#0d7c5f" }}>${item.bonusAmount.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: "#555" }}>{requirementSummary(item)}</span>
                  <span style={{ fontSize: 13, color: "#777" }}>{feeSummary(item.monthlyFee)}</span>
                </div>
                {item.eligibilityNotes && (
                  <p style={{ fontSize: 12, color: "#777", lineHeight: 1.5, margin: "6px 0 0" }}>
                    {item.eligibilityNotes}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                <TrackBonusButton
                  bonusId={item.id}
                  bonusType={item.trackingKind}
                  bankName={item.shortBankName}
                  sourcePage={`/bank-bonuses-by-state/${stateName.toLowerCase().replaceAll(" ", "-")}`}
                  compact
                />
                {href && <Link href={href} style={{ fontSize: 11, color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>Read review →</Link>}
              </div>
            </article>
          )
        })}
      </div>

      {visible.length > PAGE_SIZE && (
        <nav aria-label={`${view} offer pages`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={safePage === 1} style={pagerButton(safePage === 1)}>
            ← Previous 10
          </button>
          <span style={{ fontSize: 12, color: "#777" }}>Page {safePage} of {totalPages}</span>
          <button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} style={pagerButton(safePage === totalPages)}>
            Next 10 →
          </button>
        </nav>
      )}

      <style>{`
        @media (max-width: 680px) {
          .state-offer-card { grid-template-columns: 1fr !important; }
          .state-offer-card > div:last-child { align-items: stretch !important; }
        }
      `}</style>
    </section>
  )
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      border: 0,
      borderRadius: 8,
      padding: "8px 12px",
      background: active ? "#fff" : "transparent",
      color: active ? "#0d7c5f" : "#777",
      fontSize: 12,
      fontWeight: 800,
      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      cursor: "pointer",
    }}>{children}</button>
  )
}

function Badge({ children, accent = false, muted = false }: { children: React.ReactNode; accent?: boolean; muted?: boolean }) {
  return <span style={{
    padding: "3px 7px",
    borderRadius: 99,
    background: accent ? "#e6f5f0" : muted ? "#f3f4f4" : "#f7f8f7",
    color: accent ? "#0d7c5f" : muted ? "#777" : "#555",
    fontSize: 10,
    fontWeight: 800,
  }}>{children}</span>
}

function categoryLabel(category: ClientCatalogItem["category"]): string {
  switch (category) {
    case "personal_checking": return "Checking"
    case "personal_savings": return "Savings"
    case "business_checking": return "Business checking"
    case "business_savings": return "Business savings"
    case "brokerage": return "Brokerage"
  }
}

function requirementSummary(item: ClientCatalogItem): string {
  if (item.minimumDirectDeposit) return `$${item.minimumDirectDeposit.toLocaleString()} direct deposit`
  if (item.minimumCashDeposit) return `$${item.minimumCashDeposit.toLocaleString()} deposit/hold`
  if (item.fundingMethod === "debit_transactions") return "Debit-card activity"
  if (item.fundingMethod === "mixed") return "Direct deposit + activity"
  return "See terms for requirements"
}

function feeSummary(monthlyFee: number | null): string {
  if (monthlyFee === 0) return "No monthly fee"
  if (monthlyFee == null) return "Fee: see terms"
  return `$${monthlyFee}/month`
}

function pagerButton(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid #dfe4e1",
    borderRadius: 9,
    padding: "9px 13px",
    background: disabled ? "#f5f5f5" : "#fff",
    color: disabled ? "#aaa" : "#0d7c5f",
    fontSize: 12,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
  }
}
