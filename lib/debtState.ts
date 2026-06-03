import { DebtAccount, Lever } from "./debtSequencer"

const K_DEBTS = "stacks:debt:debts"
const K_LEVERS = "stacks:debt:levers"
const K_CAP_PERSONAL = "stacks:debt:capacity:personal"
const K_CAP_BUSINESS = "stacks:debt:capacity:business"
const K_INITIALIZED = "stacks:debt:initialized"

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export function getDebts(): DebtAccount[] { return read<DebtAccount[]>(K_DEBTS, []) }
export function setDebts(debts: DebtAccount[]): void { write(K_DEBTS, debts) }

export function getLevers(): Lever[] { return read<Lever[]>(K_LEVERS, []) }
export function setLevers(levers: Lever[]): void { write(K_LEVERS, levers) }

export function getCapacityPersonal(): number {
  const v = read<number>(K_CAP_PERSONAL, 2000)
  return typeof v === "number" ? v : 2000
}
export function setCapacityPersonal(v: number): void { write(K_CAP_PERSONAL, v) }

export function getCapacityBusiness(): number {
  const v = read<number>(K_CAP_BUSINESS, 1000)
  return typeof v === "number" ? v : 1000
}
export function setCapacityBusiness(v: number): void { write(K_CAP_BUSINESS, v) }

export function isInitialized(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(K_INITIALIZED) === "1"
}
export function markInitialized(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(K_INITIALIZED, "1")
}

export function seedFromYnabSnapshot(): { debts: DebtAccount[]; levers: Lever[] } {
  const today = new Date().toISOString().split("T")[0]

  const debts: DebtAccount[] = [
    { id: "amex-bbc-2", display_name: "Amex BBC 2", balance: 39729, use_for: "personal", apr: 0.2999, promo_apr: 0, promo_ends_on: "2026-07-31", min_payment: 100, issuer: "amex" },
    { id: "wf-autograph", display_name: "WF Autograph", balance: 11970, use_for: "personal", apr: 0.2499, promo_apr: 0, promo_ends_on: "2027-01-31", min_payment: 50, issuer: "wf" },
    { id: "boa-cc", display_name: "BOA CC", balance: 11793, use_for: "personal", apr: 0.2399, promo_apr: 0, promo_ends_on: "2027-01-31", min_payment: 50, issuer: "boa" },
    { id: "usb-platinum", display_name: "USB Platinum", balance: 24020, use_for: "personal", apr: 0.2599, promo_apr: 0, promo_ends_on: "2027-04-30", min_payment: 100, issuer: "usb" },
    { id: "chase-fu", display_name: "Chase FU", balance: 755, use_for: "personal", apr: 0.2499, promo_apr: null, promo_ends_on: null, min_payment: 25, issuer: "chase" },
    { id: "chase-amazon", display_name: "Chase Amazon", balance: 124, use_for: "personal", apr: 0.2499, promo_apr: null, promo_ends_on: null, min_payment: 25, issuer: "chase" },
    { id: "amex-bbp-1", display_name: "Amex BBP 1", balance: 33, use_for: "personal", apr: 0.2099, promo_apr: null, promo_ends_on: null, min_payment: 25, issuer: "amex" },
    { id: "chase-ink-cash", display_name: "Chase Ink Cash", balance: 15267, use_for: "business", apr: 0.2599, promo_apr: 0, promo_ends_on: "2026-09-30", min_payment: 50, issuer: "chase" },
    { id: "usb-triple-cash", display_name: "USB Triple Cash", balance: 13628, use_for: "business", apr: 0.2599, promo_apr: 0, promo_ends_on: "2027-02-28", min_payment: 50, issuer: "usb" },
    { id: "chase-ink-unl", display_name: "Chase Ink Unl", balance: 81, use_for: "business", apr: 0.2499, promo_apr: null, promo_ends_on: null, min_payment: 25, issuer: "chase" },
    { id: "amex-amazon-biz", display_name: "Amex Amazon Biz", balance: 351, use_for: "business", apr: 0.2599, promo_apr: null, promo_ends_on: null, min_payment: 25, issuer: "amex" },
  ]

  const levers: Lever[] = [
    { id: "cash-personal", kind: "cash", pool: "personal", label: "Personal cash on hand", amount_available: 3484, available_on: today, cost_apr: 0, eligible: true },
    { id: "cash-business", kind: "cash", pool: "business", label: "Business cash on hand", amount_available: 11819, available_on: today, cost_apr: 0, eligible: true },
    { id: "tsp-penalty-free", kind: "withdrawal", pool: "personal", label: "TSP penalty-free withdrawal", amount_available: 2600, available_on: today, cost_apr: 0, eligible: true, notes: "Already tagged in YNAB as penalty-free." },
    { id: "hsa-reimbursement", kind: "hsa_receipts", pool: "personal", label: "HSA receipt reimbursement", amount_available: 1232, available_on: today, cost_apr: 0, eligible: true, notes: "Unreimbursed medical receipts." },
    { id: "mr-cashout", kind: "points_cashout", pool: "business", label: "178k MR points @ 0.8cpp", amount_available: 1424, available_on: today, cost_apr: 0, eligible: true, notes: "Cash out to business checking." },
    { id: "nfcu-bt", kind: "bt_card", pool: "personal", label: "NFCU 2% Visa BT", amount_available: 18500, available_on: today, cost_apr: 0, intro_months: 12, bt_fee_pct: 0, eligible: true, notes: "Approved. No BT fee. 12 months at 0%." },
    { id: "solo-401k-loan", kind: "loan", pool: "personal", label: "Solo 401(k) loan", amount_available: 50000, available_on: addMonthsISO(today, 2), cost_apr: 0.09, repayment_monthly: 1040, repayment_months: 60, eligible: true, notes: "Available after IRA + SEP IRA roll into Solo 401(k). ~2 months out." },
    { id: "home-equity-considered", kind: "cash", pool: "personal", label: "Home equity", amount_available: 0, available_on: today, cost_apr: 0, eligible: false, ineligible_reason: "House at ~90% LTV ($627k / $700k). No HELOC capacity.", notes: "Considered; not viable now." },
    { id: "vehicle-equity-considered", kind: "cash", pool: "personal", label: "Vehicle equity", amount_available: 0, available_on: today, cost_apr: 0, eligible: false, ineligible_reason: "~$27k equity across 3 vehicles, but title loan rates negate the benefit.", notes: "Considered; ruled out." },
  ]

  return { debts, levers }
}

function addMonthsISO(fromISO: string, n: number): string {
  const d = new Date(fromISO)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().split("T")[0]
}

export function resetAll(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(K_DEBTS)
  localStorage.removeItem(K_LEVERS)
  localStorage.removeItem(K_CAP_PERSONAL)
  localStorage.removeItem(K_CAP_BUSINESS)
  localStorage.removeItem(K_INITIALIZED)
}
