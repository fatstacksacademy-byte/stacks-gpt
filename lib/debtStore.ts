// Persistence for the Debt Payoff simulator.
//
// Server persistence (Supabase) is not yet wired for this module, so we expose
// a small storage *interface* and ship a localStorage adapter as the temporary
// implementation. Swapping in a server adapter later means implementing
// `DebtStorageAdapter` and changing `getStore()` — no UI changes required.

import type {
  DebtInstrument,
  BalanceTransferOffer,
  ConsolidationLoanOffer,
  CreditProfile,
  StrategyGoal,
} from "./debtSimulator"

export type DebtScenario = {
  version: 1
  debts: DebtInstrument[]
  balanceTransfers: BalanceTransferOffer[]
  consolidationLoans: ConsolidationLoanOffer[]
  creditProfile: CreditProfile
  monthlyBudget: number
  availableCash: number
  emergencyBuffer: number
  goal: StrategyGoal
  /** True only when the user explicitly loaded the fictional demo dataset. */
  isDemo: boolean
}

export interface DebtStorageAdapter {
  load(): DebtScenario | null
  save(s: DebtScenario): void
  clear(): void
}

const STORAGE_KEY_BASE = "stacks:debt:scenario:v1"

// Per-user namespace. Financial data must never leak between accounts sharing a
// browser, so the storage key is scoped to the signed-in user. Call
// `configureUserScope(user.id)` before load/save (the UI does this on mount).
let scopeId = "anon"

/** Scope all subsequent reads/writes to a specific user (or "anon" if null). */
export function configureUserScope(id: string | null | undefined): void {
  scopeId = id && id.trim() ? id.trim() : "anon"
}

function storageKey(): string {
  return `${STORAGE_KEY_BASE}:${scopeId}`
}

function parseScenario(raw: string | null): DebtScenario | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DebtScenario
    if (parsed && parsed.version === 1) return parsed
    return null
  } catch {
    return null
  }
}

class LocalStorageAdapter implements DebtStorageAdapter {
  load(): DebtScenario | null {
    if (typeof window === "undefined") return null
    // Read only the active user's namespace. We deliberately do NOT migrate any
    // pre-scoping global-key data: it could belong to a different account on a
    // shared browser, and auto-adopting it would leak one user's finances to
    // another. Pre-scoping testers simply re-seed (one-time, low cost).
    return parseScenario(window.localStorage.getItem(storageKey()))
  }
  save(s: DebtScenario): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(storageKey(), JSON.stringify(s))
  }
  clear(): void {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(storageKey())
  }
}

let adapter: DebtStorageAdapter = new LocalStorageAdapter()

/** Swap the persistence backend (e.g. to a Supabase adapter) in one place. */
export function setStorageAdapter(a: DebtStorageAdapter): void {
  adapter = a
}

export function loadScenario(): DebtScenario | null {
  return adapter.load()
}

export function saveScenario(s: DebtScenario): void {
  adapter.save(s)
}

export function clearScenario(): void {
  adapter.clear()
}

export function emptyScenario(): DebtScenario {
  return {
    version: 1,
    debts: [],
    balanceTransfers: [],
    consolidationLoans: [],
    creditProfile: {},
    monthlyBudget: 1500,
    availableCash: 0,
    emergencyBuffer: 1000,
    goal: "lowest_cost",
    isDemo: false,
  }
}

// ----------------------------------------------------------------------------
// Fictional demo dataset — clearly labeled, NOT anyone's real finances.
// "Sam Sample" is invented. Use it to explore the tool without entering data.
// ----------------------------------------------------------------------------

export function demoScenario(): DebtScenario {
  return {
    version: 1,
    isDemo: true,
    monthlyBudget: 1600,
    availableCash: 4000,
    emergencyBuffer: 2000,
    goal: "lowest_cost",
    creditProfile: {
      ficoBand: "good",
      annualIncome: 78000,
      monthlyHousing: 1750,
      totalMinDebtPayments: 520,
      revolvingUtilization: 0.62,
      hardInquiries6mo: 1,
      cardApps12mo: 2,
      majorDerogatory: false,
      willingToOpenCredit: true,
      preserveChurningEligibility: false,
    },
    debts: [
      { kind: "credit_card", id: "demo-visa", name: "Demo Visa", balance: 9200, apr: 0.2499, minPayment: 185, creditLimit: 12000 },
      { kind: "credit_card", id: "demo-store", name: "Demo Store Card", balance: 2400, apr: 0.2899, minPayment: 60, creditLimit: 3000 },
      { kind: "credit_card", id: "demo-rewards", name: "Demo Rewards Card", balance: 6100, apr: 0.2199, minPayment: 130, creditLimit: 9000 },
      { kind: "installment", id: "demo-auto", name: "Demo Auto Loan", balance: 8800, apr: 0.069, monthlyPayment: 295, termRemainingMonths: 33 },
    ],
    balanceTransfers: [
      {
        id: "demo-bt",
        name: "Demo 0% BT Card",
        enabled: true,
        creditLimit: 10000,
        approvedTransferAmount: 9000,
        promoApr: 0,
        promoMonths: 18,
        postPromoApr: 0.2699,
        transferFeePct: 0.03,
        minPayment: 50,
        availableOn: "2026-07-01",
        payFeeWithCash: false,
        approvalStatus: "prequalified",
      },
    ],
    consolidationLoans: [
      {
        id: "demo-loan",
        name: "Demo Personal Loan",
        enabled: true,
        requestedAmount: 17700,
        approvedAmount: 17700,
        apr: 0.1199,
        termMonths: 48,
        originationFeePct: 0.05,
        feeMode: "deducted",
        availableOn: "2026-06-01",
        status: "prequalified",
      },
    ],
  }
}
