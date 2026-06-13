"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "../../lib/supabase/client"
import TrackBonusButton from "./TrackBonusButton"
import type {
  ClientCatalogItem,
  CatalogCategory,
} from "../../lib/data/catalogTaxonomy"
import { US_STATES, isEligibleInState } from "../../lib/data/catalogTaxonomy"
import { useCatalogUnlock } from "./useCatalogUnlock"
import CatalogUnlockGate, { AccountLinkBanner } from "./CatalogUnlockGate"

/**
 * Client-side catalog browsing experience.
 *
 *  - Server passes the live, normalized catalog as `initialItems`.
 *  - Search/state/category/requirement filters are kept in React state
 *    (NOT URL query params) so search engines don't crawl thousands of
 *    filter combinations.
 *  - For a logged-in user with a state on their profile, the default
 *    filter is "Available to me" against that state.
 *  - Active filter chips + a clear "Reset filters" affordance.
 *
 * The component renders nothing fancy server-side beyond a skeleton
 * so the initial HTML is still meaningful for SEO; once mounted it
 * takes over.
 */

type Sort =
  | "best_fit"
  | "highest_payout"
  | "lowest_requirement"
  | "best_effective_return"
  | "expiring_soon"

type RequirementFilter = "any" | "direct_deposit" | "no_dd" | "cash_hold" | "debit"

type Props = {
  initialItems: ClientCatalogItem[]
  /** Map of bonusId → blog review URL. Pre-computed server-side so we
   *  don't need to serialize a function across the boundary. */
  reviewHrefs?: Record<string, string>
}

export default function FilterableCatalog({ initialItems, reviewHrefs }: Props) {
  const { unlocked, unlocking, error: unlockError, unlock, accountLinkSent, pendingEmail } = useCatalogUnlock()
  const [search, setSearch] = useState("")
  const [stateCode, setStateCode] = useState<string>("")
  const [category, setCategory] = useState<CatalogCategory | "">("")
  const [requirement, setRequirement] = useState<RequirementFilter>("any")
  const [nationwideOnly, setNationwideOnly] = useState(false)
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [maxRequirement, setMaxRequirement] = useState<number | "">("")
  const [sort, setSort] = useState<Sort>("best_fit")
  const [availableToMe, setAvailableToMe] = useState(false)
  // Profile state — when populated, defaults `availableToMe` on and seeds
  // the state selector.
  const [profileState, setProfileState] = useState<string | null>(null)

  // Load profile state (best-effort — if not signed in, skip).
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("state")
        .eq("user_id", data.user.id)
        .maybeSingle()
      const s = (profile as { state?: string | null } | null)?.state
      if (s) {
        setProfileState(s)
        setStateCode(s)
        setAvailableToMe(true)
      }
    })
  }, [])

  // ── Apply filters ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialItems.filter(item => {
      if (q && !item.shortBankName.toLowerCase().includes(q) && !item.bankName.toLowerCase().includes(q)) {
        return false
      }
      if (category && item.category !== category) return false

      if (availableToMe && stateCode) {
        if (!isEligibleInState(item, stateCode)) return false
      } else if (stateCode) {
        // State picked but "available to me" toggled off: keep nationwide
        // + state-matched + unverified (let the user see everything for
        // the state context they chose).
        if (item.availability === "branch_only") return false
        if (
          item.availability === "state_restricted" &&
          !(item.eligibleStates?.includes(stateCode))
        ) return false
        if (item.excludedStates.includes(stateCode)) return false
      }

      if (nationwideOnly && item.availability !== "nationwide") return false
      if (onlineOnly && item.onlineOpening !== true) return false

      switch (requirement) {
        case "direct_deposit":
          if (item.fundingMethod !== "direct_deposit" && item.fundingMethod !== "mixed") return false
          break
        case "no_dd":
          if (item.fundingMethod === "direct_deposit" || item.fundingMethod === "mixed") return false
          break
        case "cash_hold":
          if (item.fundingMethod !== "cash_deposit" && item.category !== "personal_savings" && item.category !== "business_savings" && item.category !== "brokerage") return false
          break
        case "debit":
          if (item.fundingMethod !== "debit_transactions") return false
          break
      }

      if (maxRequirement !== "" && typeof maxRequirement === "number") {
        const req = (item.minimumDirectDeposit ?? item.minimumCashDeposit ?? 0)
        if (req > maxRequirement) return false
      }

      return true
    })
  }, [initialItems, search, stateCode, category, availableToMe, nationwideOnly, onlineOnly, requirement, maxRequirement])

  // ── Apply sort ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sort) {
      case "highest_payout":
        list.sort((a, b) => b.bonusAmount - a.bonusAmount)
        break
      case "lowest_requirement":
        list.sort((a, b) => (
          (a.minimumDirectDeposit ?? a.minimumCashDeposit ?? Infinity) -
          (b.minimumDirectDeposit ?? b.minimumCashDeposit ?? Infinity)
        ))
        break
      case "best_effective_return":
        list.sort((a, b) => {
          const ra = (a.minimumDirectDeposit ?? a.minimumCashDeposit ?? 0)
          const rb = (b.minimumDirectDeposit ?? b.minimumCashDeposit ?? 0)
          // Avoid divide-by-zero. Items with no requirement get a high
          // "return" because the bonus is free relative to the work.
          const ea = ra === 0 ? Infinity : a.bonusAmount / ra
          const eb = rb === 0 ? Infinity : b.bonusAmount / rb
          return eb - ea
        })
        break
      case "expiring_soon":
        list.sort((a, b) => {
          const da = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity
          const db = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity
          return da - db
        })
        break
      case "best_fit":
      default:
        // Best fit = strongest verified eligibility wins, then payout.
        list.sort((a, b) => {
          const confRank: Record<string, number> = { verified: 0, incomplete: 1, unknown: 2 }
          const ca = confRank[a.eligibilityConfidence] ?? 3
          const cb = confRank[b.eligibilityConfidence] ?? 3
          if (ca !== cb) return ca - cb
          return b.bonusAmount - a.bonusAmount
        })
    }
    return list
  }, [filtered, sort])

  // Gate the state-specific view behind one email — that's the high-intent
  // "what can I get in my state" moment. The default "Any state" browse (great
  // for SEO) and signed-in users with a saved state (profileState) bypass it.
  const stateName = stateCode ? US_STATES.find(s => s.code === stateCode)?.name ?? stateCode : ""
  const stateGated = !!stateCode && !unlocked && !profileState && sorted.length > 0

  // ── Active filter chips ─────────────────────────────────────────
  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (search.trim()) activeChips.push({ key: "q", label: `Search: "${search.trim()}"`, clear: () => setSearch("") })
  if (stateCode) activeChips.push({ key: "state", label: `State: ${stateCode}${availableToMe ? " (available to me)" : ""}`, clear: () => { setStateCode(""); setAvailableToMe(false) } })
  if (category) activeChips.push({ key: "cat", label: `Category: ${CATEGORY_LABELS[category]}`, clear: () => setCategory("") })
  if (requirement !== "any") activeChips.push({ key: "req", label: `Requirement: ${REQUIREMENT_LABELS[requirement]}`, clear: () => setRequirement("any") })
  if (nationwideOnly) activeChips.push({ key: "nw", label: "Nationwide only", clear: () => setNationwideOnly(false) })
  if (onlineOnly) activeChips.push({ key: "ol", label: "Online opening only", clear: () => setOnlineOnly(false) })
  if (maxRequirement !== "") activeChips.push({ key: "mx", label: `Max requirement: $${maxRequirement.toLocaleString()}`, clear: () => setMaxRequirement("") })

  function resetAll() {
    setSearch("")
    setStateCode(profileState ?? "")
    setCategory("")
    setRequirement("any")
    setNationwideOnly(false)
    setOnlineOnly(false)
    setMaxRequirement("")
    setSort("best_fit")
    setAvailableToMe(!!profileState)
  }

  return (
    <div>
      {/* ── FILTER BAR ─────────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }} className="fc-grid">
          <input
            type="search"
            placeholder="Search bank or offer name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={stateCode} onChange={e => setStateCode(e.target.value)} style={inputStyle}>
            <option value="">Any state</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
            ))}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value as CatalogCategory | "")} style={inputStyle}>
            <option value="">All categories</option>
            <option value="personal_checking">Personal checking</option>
            <option value="personal_savings">Personal savings</option>
            <option value="business_checking">Business checking</option>
            <option value="business_savings">Business savings</option>
            <option value="brokerage">Brokerage</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }} className="fc-grid">
          <select value={requirement} onChange={e => setRequirement(e.target.value as RequirementFilter)} style={inputStyle}>
            <option value="any">Any requirement</option>
            <option value="direct_deposit">Direct deposit required</option>
            <option value="no_dd">No direct deposit</option>
            <option value="cash_hold">Savings / cash hold</option>
            <option value="debit">Debit activity</option>
          </select>
          <input
            type="number"
            placeholder="Max DD/cash ($)"
            value={maxRequirement}
            onChange={e => setMaxRequirement(e.target.value ? Number(e.target.value) : "")}
            min={0}
            style={inputStyle}
          />
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={inputStyle}>
            <option value="best_fit">Sort: best fit</option>
            <option value="highest_payout">Sort: highest payout</option>
            <option value="lowest_requirement">Sort: lowest requirement</option>
            <option value="best_effective_return">Sort: best effective return</option>
            <option value="expiring_soon">Sort: expiring soon</option>
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={toggleStyle}>
              <input type="checkbox" checked={nationwideOnly} onChange={e => setNationwideOnly(e.target.checked)} /> Nationwide only
            </label>
            <label style={toggleStyle}>
              <input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)} /> Online only
            </label>
            {stateCode && (
              <label style={toggleStyle}>
                <input type="checkbox" checked={availableToMe} onChange={e => setAvailableToMe(e.target.checked)} /> Available to me
              </label>
            )}
          </div>
        </div>

        {/* ── ACTIVE FILTER CHIPS ─────────────────────────────────── */}
        {(activeChips.length > 0 || sort !== "best_fit") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
            {activeChips.map(chip => (
              <button
                key={chip.key}
                onClick={chip.clear}
                style={chipStyle}
                aria-label={`Clear ${chip.label}`}
              >
                {chip.label} ✕
              </button>
            ))}
            <button onClick={resetAll} style={{ ...chipStyle, background: "#fff", color: "#0d7c5f", borderColor: "#0d7c5f", fontWeight: 700 }}>
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* ── RESULT SUMMARY ─────────────────────────────────────────── */}
      <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
        Showing <strong style={{ color: "#111" }}>{sorted.length}</strong> of {initialItems.length} live offers
        {profileState && availableToMe && stateCode === profileState && (
          <> · available to you in <strong>{profileState}</strong></>
        )}
      </div>

      {/* ── RESULTS ────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed #e8e8e8", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#111", fontWeight: 700, marginBottom: 4 }}>No offers match these filters</div>
          <div style={{ fontSize: 13, color: "#666" }}>Try clearing a filter, or <button onClick={resetAll} style={{ background: "none", border: "none", color: "#0d7c5f", fontWeight: 700, cursor: "pointer" }}>reset all</button>.</div>
        </div>
      ) : stateGated ? (
        /* Picking a specific state is the high-intent moment — gate it behind
           one email. The default "Any state" browse and signed-in users with a
           saved state stay open (and SEO-crawlable). */
        <div>
          <div
            aria-hidden
            style={{ display: "grid", gap: 10, filter: "blur(5px)", pointerEvents: "none", userSelect: "none", maxHeight: 220, overflow: "hidden", opacity: 0.75, marginBottom: 12, position: "relative" }}
          >
            {sorted.slice(0, 3).map(item => (
              <ResultCard key={item.id} item={item} reviewHref={reviewHrefs?.[item.id] ?? null} sourcePage="/bonuses" />
            ))}
          </div>
          <CatalogUnlockGate
            count={sorted.length}
            stateName={stateName}
            stateCode={stateCode}
            source="bonuses_state"
            unlock={unlock}
            unlocking={unlocking}
            error={unlockError}
            noun="bonuses available"
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          {accountLinkSent && <AccountLinkBanner email={pendingEmail} />}
          {sorted.map(item => (
            <ResultCard key={item.id} item={item} reviewHref={reviewHrefs?.[item.id] ?? null} sourcePage="/bonuses" />
          ))}
        </div>
      )}
      <style>{`
        @media (max-width: 700px) {
          .fc-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ── Result card ──────────────────────────────────────────────────────

function ResultCard({ item, reviewHref, sourcePage }: { item: ClientCatalogItem; reviewHref: string | null; sourcePage: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
      padding: "16px 18px",
      display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center",
    }} className="fc-result">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{item.shortBankName}</span>
          {renderBadges(item)}
        </div>
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.55, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <span>
            <strong style={{ color: "#0d7c5f" }}>{money(item.bonusAmount)}</strong> bonus
          </span>
          <span>
            {requirementLabel(item)}
          </span>
          <span>
            {monthlyFeeLabel(item.monthlyFee)}
          </span>
          {item.expirationDate
            ? <span>Expires {fmtDate(item.expirationDate)}</span>
            : <span style={{ color: "#bbb" }}>Expiration: See terms</span>}
          <span>{availabilityLabel(item)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
        <TrackBonusButton
          bonusId={item.id}
          bonusType={item.trackingKind}
          bankName={item.shortBankName}
          sourcePage={sourcePage}
          compact
        />
        {reviewHref && (
          <Link href={reviewHref} style={{ fontSize: 11, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>
            Read review →
          </Link>
        )}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .fc-result { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────────

function renderBadges(item: ClientCatalogItem) {
  const badges: { label: string; bg: string; fg: string }[] = []

  switch (item.category) {
    case "personal_checking": badges.push({ label: "Checking", bg: "#eff6ff", fg: "#2563eb" }); break
    case "personal_savings": badges.push({ label: "Savings", bg: "#e6f5f0", fg: "#0d7c5f" }); break
    case "business_checking": badges.push({ label: "Business", bg: "#fef3c7", fg: "#92400e" }); break
    case "business_savings": badges.push({ label: "Business savings", bg: "#fef3c7", fg: "#92400e" }); break
    case "brokerage": badges.push({ label: "Brokerage", bg: "#ede9fe", fg: "#7c3aed" }); break
  }

  switch (item.fundingMethod) {
    case "direct_deposit": badges.push({ label: "DD required", bg: "#f3f4f6", fg: "#525252" }); break
    case "cash_deposit": badges.push({ label: "Cash hold", bg: "#f3f4f6", fg: "#525252" }); break
    case "debit_transactions": badges.push({ label: "Debit activity", bg: "#f3f4f6", fg: "#525252" }); break
    case "mixed": badges.push({ label: "DD + debit", bg: "#f3f4f6", fg: "#525252" }); break
    case "unknown":
      if (item.category === "personal_checking" || item.category === "business_checking") {
        badges.push({ label: "Funding: see terms", bg: "#fff7ed", fg: "#9a3412" })
      }
      break
  }

  switch (item.availability) {
    case "nationwide": badges.push({ label: "Nationwide", bg: "#f0faf5", fg: "#0d7c5f" }); break
    case "state_restricted":
      if (item.eligibleStates && item.eligibleStates.length <= 3) {
        badges.push({ label: `Available in ${item.eligibleStates.join(", ")}`, bg: "#fff7ed", fg: "#9a3412" })
      } else {
        badges.push({ label: `${item.eligibleStates?.length ?? 0} states`, bg: "#fff7ed", fg: "#9a3412" })
      }
      break
    case "branch_only": badges.push({ label: "Branch required", bg: "#fef2f2", fg: "#b91c1c" }); break
    case "unknown": badges.push({ label: "Eligibility unverified", bg: "#fef2f2", fg: "#b91c1c" }); break
  }

  if (item.militaryOnly) badges.push({ label: "Military only", bg: "#ede9fe", fg: "#7c3aed" })

  return badges.map((b, i) => (
    <span
      key={i}
      style={{
        fontSize: 10,
        fontWeight: 700,
        background: b.bg,
        color: b.fg,
        padding: "2px 8px",
        borderRadius: 99,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {b.label}
    </span>
  ))
}

// ── Display helpers ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  personal_checking: "Personal checking",
  personal_savings: "Personal savings",
  business_checking: "Business checking",
  business_savings: "Business savings",
  brokerage: "Brokerage",
}

const REQUIREMENT_LABELS: Record<RequirementFilter, string> = {
  any: "Any",
  direct_deposit: "DD required",
  no_dd: "No DD",
  cash_hold: "Cash hold",
  debit: "Debit activity",
}

function money(n: number | null | undefined): string {
  if (n == null) return "—"
  return `$${n.toLocaleString("en-US")}`
}

function requirementLabel(item: ClientCatalogItem): string {
  if (item.minimumDirectDeposit != null) return `${money(item.minimumDirectDeposit)} DD`
  if (item.minimumCashDeposit != null) return `${money(item.minimumCashDeposit)} cash hold`
  if (item.category === "personal_savings" || item.category === "business_savings" || item.category === "brokerage") {
    return "Cash hold — see terms"
  }
  if (item.fundingMethod === "unknown") return "Requirements: See terms"
  return "No requirement listed"
}

function monthlyFeeLabel(fee: number | null): string {
  if (fee === 0) return "$0 monthly fee"
  if (fee != null) return `$${fee} monthly fee`
  return "Monthly fee: see terms"
}

function availabilityLabel(item: ClientCatalogItem): string {
  switch (item.availability) {
    case "nationwide": return "Nationwide"
    case "state_restricted":
      if (!item.eligibleStates) return "State-restricted"
      if (item.eligibleStates.length === 1) return `Available in ${item.eligibleStates[0]}`
      return `${item.eligibleStates.length} eligible states`
    case "branch_only": return "Branch required"
    case "unknown": return "Eligibility: not verified"
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Inline styles (shared) ───────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  background: "#fff",
  color: "#111",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
}

const toggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "#444",
  cursor: "pointer",
}

const chipStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  background: "#f3f4f6",
  color: "#444",
  border: "1px solid #e0e0e0",
  borderRadius: 99,
  cursor: "pointer",
}
