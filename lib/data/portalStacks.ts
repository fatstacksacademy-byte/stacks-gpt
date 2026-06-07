// ============================================================
// Stacks OS: portal stacks registry (manual / temporary)
//
// Maps bonus_id → portals where this bank has *historically* offered
// cashback on signup. Portal rates flip constantly, so each entry links
// to the portal's search/store landing rather than promising a rate.
//
// This is the manual placeholder until Rakuten Advertising / TopCashback
// influencer API access lands — at that point the registry switches to
// live feeds and the UI stays the same.
//
// To add coverage: drop a new entry below. Only include banks you've
// actually seen on the portal in the last ~6 months — otherwise users
// click through and find nothing.
// ============================================================

export type Portal = "Rakuten" | "TopCashback" | "BeFrugal" | "Active Junky"

export type PortalOption = {
  portal: Portal
  url: string
  note?: string
}

const RAKUTEN_REFER = "https://www.rakuten.com/" // swap in personal referral once approved
const TOPCASHBACK_REFER = "https://www.topcashback.com/" // swap in personal referral once approved
const BEFRUGAL_REFER = "https://www.befrugal.com/" // swap in personal referral once approved

// Helper to keep entries terse and consistent
const stack = (portal: Portal, search: string, note?: string): PortalOption => {
  const base =
    portal === "Rakuten" ? RAKUTEN_REFER :
    portal === "TopCashback" ? TOPCASHBACK_REFER :
    portal === "BeFrugal" ? BEFRUGAL_REFER :
    "https://www.activejunky.com/"
  const sep = base.endsWith("/") ? "" : "/"
  const url =
    portal === "Rakuten" ? `${base}${sep}search?keyword=${encodeURIComponent(search)}` :
    portal === "TopCashback" ? `${base}${sep}search/?searchterm=${encodeURIComponent(search)}` :
    portal === "BeFrugal" ? `${base}${sep}stores/?q=${encodeURIComponent(search)}` :
    base
  return { portal, url, note }
}

export const portalStacks: Record<string, PortalOption[]> = {
  // ── Neobanks / fintech: the most reliable portal stackers ──
  "sofi-checking-savings-300-dd-2026": [
    stack("Rakuten", "SoFi", "Historically appears 2–4×/yr at $30–$75"),
    stack("TopCashback", "SoFi Money"),
  ],
  "sofi-invest-150-2026": [
    stack("Rakuten", "SoFi Invest"),
    stack("TopCashback", "SoFi Invest"),
  ],
  "chime-100-referral-checking": [
    stack("Rakuten", "Chime", "Sporadic — usually $10–$25"),
    stack("TopCashback", "Chime"),
  ],
  "varo-money-100-referral-dd": [
    stack("TopCashback", "Varo"),
    stack("BeFrugal", "Varo"),
  ],
  "capital-one-360-checking-300-offer300": [
    stack("Rakuten", "Capital One 360", "Frequently $25–$100 stack"),
    stack("TopCashback", "Capital One 360"),
  ],

  // ── Big bank checking: occasional portal stacks ──
  "chase-total-checking-400-2026": [
    stack("Rakuten", "Chase", "Periodic — check at the moment you apply"),
  ],
  "wells-fargo-400-everyday-checking-2026": [
    stack("Rakuten", "Wells Fargo"),
  ],
  "citi-regular-checking-325-edd-2026": [
    stack("Rakuten", "Citi"),
    stack("TopCashback", "Citi"),
  ],

  // ── Savings ──
  "marcus-savings-bonus-2026": [
    stack("Rakuten", "Marcus by Goldman Sachs"),
    stack("TopCashback", "Marcus"),
  ],
  "ally-savings-referral-2026": [
    stack("Rakuten", "Ally Bank"),
    stack("TopCashback", "Ally Bank"),
  ],
  "etrade-premium-savings-2026": [
    stack("Rakuten", "E*TRADE", "Brokerage advertisers run heavy promos"),
    stack("TopCashback", "E*TRADE"),
  ],
  "barclays-tiered-savings-2026": [
    stack("Rakuten", "Barclays"),
  ],
  "cit-bank-savings-300-2026": [
    stack("Rakuten", "CIT Bank"),
    stack("TopCashback", "CIT Bank"),
  ],

  // ── Brokerage: portals love these advertisers ──
  "etrade-brokerage-2026": [
    stack("Rakuten", "E*TRADE", "Often $50–$200 on top of the SUB"),
    stack("TopCashback", "E*TRADE"),
    stack("BeFrugal", "E*TRADE"),
  ],
  "schwab-brokerage-2026": [
    stack("Rakuten", "Charles Schwab"),
    stack("TopCashback", "Schwab"),
  ],
  "tastytrade-brokerage-2026": [
    stack("Rakuten", "tastytrade"),
    stack("TopCashback", "tastytrade"),
  ],
  "moomoo-cash-sweep-2026": [
    stack("Rakuten", "moomoo"),
    stack("TopCashback", "moomoo"),
  ],
  "merrill-edge-brokerage-2026": [
    stack("Rakuten", "Merrill Edge"),
  ],
}

export function getPortalStacks(bonusId: string): PortalOption[] {
  return portalStacks[bonusId] ?? []
}

export function hasPortalStacks(bonusId: string): boolean {
  return bonusId in portalStacks
}
