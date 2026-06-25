"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import TrackBonusButton from "./TrackBonusButton"
import CatalogUnlockGate from "./CatalogUnlockGate"
import { useCatalogUnlock } from "./useCatalogUnlock"
import type { ClientCatalogItem } from "../../lib/data/catalogTaxonomy"

const PAGE_SIZE = 10

type View = "bank" | "brokerage"
type TypeFilter = "all" | "checking" | "savings" | "business"
type ReqFilter = "all" | "dd" | "no_dd"
type ScopeFilter = "all" | "local"

// ── Offer trait derivations (pure, reused by filters + badges) ──────────

function isLocal(item: ClientCatalogItem, stateCode: string): boolean {
  return item.availability === "state_restricted" && (item.eligibleStates?.includes(stateCode) ?? false)
}

function requiresDirectDeposit(item: ClientCatalogItem): boolean {
  return item.fundingMethod === "direct_deposit" || item.fundingMethod === "mixed" || item.minimumDirectDeposit != null
}

function isDepositOnly(item: ClientCatalogItem): boolean {
  return !requiresDirectDeposit(item) && item.fundingMethod !== "debit_transactions"
}

function requiresMembership(item: ClientCatalogItem): boolean {
  return /\bmembership\b/i.test(item.eligibilityNotes ?? "")
}

function matchesType(item: ClientCatalogItem, type: TypeFilter): boolean {
  switch (type) {
    case "all": return true
    case "checking": return item.category === "personal_checking"
    case "savings": return item.category === "personal_savings" || item.category === "business_savings"
    case "business": return item.category === "business_checking" || item.category === "business_savings"
  }
}

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
  const { unlocked, hydrated, unlocking, error: unlockError, unlock } = useCatalogUnlock()
  const [view, setView] = useState<View>("bank")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [reqFilter, setReqFilter] = useState<ReqFilter>("all")
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
  const [page, setPage] = useState(1)

  // Until the unlock state has hydrated (from localStorage / the Supabase
  // session), assume unlocked. Otherwise the first paint renders the LOCKED
  // view — email gate shown, local rows filtered out — and then visibly
  // reshuffles a beat later for every signed-in / returning visitor. Honoring
  // `hydrated` keeps the first paint matching the resolved state, so there's no
  // flash when you land on the page after picking a state.
  const effectiveUnlocked = unlocked || !hydrated

  const localCount = items.filter(it => isLocal(it, stateCode) && (view === "brokerage" ? it.category === "brokerage" : it.category !== "brokerage")).length
  const availableItems = useMemo(
    () => effectiveUnlocked ? items : items.filter(item => !isLocal(item, stateCode)),
    [items, stateCode, effectiveUnlocked],
  )

  const visible = useMemo(() => {
    const filtered = availableItems.filter(item => {
      if (view === "brokerage" ? item.category !== "brokerage" : item.category === "brokerage") return false
      if (!matchesType(item, typeFilter)) return false
      if (reqFilter === "dd" && !requiresDirectDeposit(item)) return false
      if (reqFilter === "no_dd" && requiresDirectDeposit(item)) return false
      if (scopeFilter === "local" && !isLocal(item, stateCode)) return false
      return true
    })
    return filtered.sort((left, right) => {
      const leftLocal = isLocal(left, stateCode)
      const rightLocal = isLocal(right, stateCode)
      if (leftLocal !== rightLocal) return leftLocal ? -1 : 1
      return right.bonusAmount - left.bonusAmount
    })
  }, [availableItems, stateCode, view, typeFilter, reqFilter, scopeFilter])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageItems = visible.slice(start, start + PAGE_SIZE)

  function selectView(next: View) {
    setView(next)
    setPage(1)
  }

  function setType(next: TypeFilter) { setTypeFilter(next); setPage(1) }
  function setReq(next: ReqFilter) { setReqFilter(next); setPage(1) }
  function setScope(next: ScopeFilter) { setScopeFilter(next); setPage(1) }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
            Bonuses available in {stateName}
          </h2>
          <div style={{ fontSize: 13, color: "#777" }}>
            {effectiveUnlocked ? "State-specific offers appear first. Browse ten at a time." : "Nationwide offers stay open; state-specific offers unlock by email."}
          </div>
        </div>
        <div style={{ display: "inline-flex", padding: 3, background: "#f2f4f3", borderRadius: 10 }}>
          <ViewButton active={view === "bank"} onClick={() => selectView("bank")}>Bank bonuses</ViewButton>
          <ViewButton active={view === "brokerage"} onClick={() => selectView("brokerage")}>Brokerage</ViewButton>
        </div>
      </div>

      {hydrated && !unlocked && localCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <CatalogUnlockGate
            count={localCount}
            stateName={stateName}
            stateCode={stateCode}
            source="bank_bonuses_by_state"
            unlock={unlock}
            unlocking={unlocking}
            error={unlockError}
            noun="local bonuses"
            buttonLabel={`Unlock ${stateName} bonuses`}
          />
        </div>
      )}

      {view === "bank" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <FilterGroup label="Type">
            <Chip active={typeFilter === "all"} onClick={() => setType("all")}>All</Chip>
            <Chip active={typeFilter === "checking"} onClick={() => setType("checking")}>Checking</Chip>
            <Chip active={typeFilter === "savings"} onClick={() => setType("savings")}>Savings</Chip>
            <Chip active={typeFilter === "business"} onClick={() => setType("business")}>Business</Chip>
          </FilterGroup>
          <FilterGroup label="Requirement">
            <Chip active={reqFilter === "all"} onClick={() => setReq("all")}>All</Chip>
            <Chip active={reqFilter === "dd"} onClick={() => setReq("dd")}>Direct deposit</Chip>
            <Chip active={reqFilter === "no_dd"} onClick={() => setReq("no_dd")}>No direct deposit</Chip>
          </FilterGroup>
          {effectiveUnlocked && localCount > 0 && (
            <FilterGroup label="Scope">
              <Chip active={scopeFilter === "all"} onClick={() => setScope("all")}>All</Chip>
              <Chip active={scopeFilter === "local"} onClick={() => setScope("local")}>{stateName} only ({localCount})</Chip>
            </FilterGroup>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>
        {visible.length === 0
          ? `No ${view === "bank" ? "bank" : "brokerage"} offers match these filters for ${stateName}.`
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
                  {local ? <Badge accent>{stateName} local</Badge> : <Badge>Nationwide</Badge>}
                  {requiresDirectDeposit(item)
                    ? <Badge>Direct deposit</Badge>
                    : isDepositOnly(item) ? <Badge>Deposit only</Badge> : null}
                  {requiresMembership(item) && <Badge>Membership</Badge>}
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

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      border: active ? "1px solid #0d7c5f" : "1px solid #dfe4e1",
      borderRadius: 99,
      padding: "4px 10px",
      background: active ? "#e6f5f0" : "#fff",
      color: active ? "#0d7c5f" : "#666",
      fontSize: 11,
      fontWeight: 700,
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
