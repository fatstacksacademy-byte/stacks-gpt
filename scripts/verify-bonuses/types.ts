export type BonusRecord = {
  id: string
  bank_name: string
  product_type: string
  bonus_amount?: number
  expired?: boolean
  requirements?: {
    direct_deposit_required?: boolean | null
    min_direct_deposit_total?: number | null
    deposit_window_days?: number | null
    debit_transactions_required?: number | null
    other_requirements_text?: string | null
  }
  fees?: {
    monthly_fee?: number | null
    monthly_fee_waiver_text?: string | null
    early_closure_fee?: number | null
  }
  eligibility?: {
    state_restricted?: boolean
    states_allowed?: string[]
    states_excluded?: string[]
  }
  source_links?: string[]
}

export type FetchResult = {
  url: string
  ok: boolean
  status: number
  finalUrl: string
  redirected: boolean
  textContent: string
  htmlHash: string
  fetchedAt: string
  error?: string
}

export type Extracted = {
  bonusAmount?: number | null
  minDirectDepositTotal?: number | null
  depositWindowDays?: number | null
  monthlyFee?: number | null
  expiredText?: boolean
  expiresDate?: string | null
  rawSnippets: Record<string, string | null>
}

export type FieldResult =
  | { field: string; status: "match"; stored: unknown; extracted: unknown }
  | { field: string; status: "mismatch"; stored: unknown; extracted: unknown; confidence: "high" | "low"; snippet?: string }
  | { field: string; status: "ambiguous"; stored: unknown; extracted: unknown; snippet?: string }
  | { field: string; status: "missing"; stored: unknown; extracted: null }

export type VerificationResult = {
  id: string
  bank_name: string
  url: string
  fetch: Pick<FetchResult, "ok" | "status" | "finalUrl" | "redirected" | "error">
  fields: FieldResult[]
  pageSignal:
    | "ok"
    | "offer_dead"
    | "promo_removed"
    | "expired_text_on_page"
    | "fetch_error"
  escalations: {
    field: string
    verdict: "same_meaning" | "different" | "unclear"
    rationale: string
  }[]
  verifiedAt: string
}

export type ProposedEdit = {
  id: string
  path: string // e.g., "fees.monthly_fee"
  from: unknown
  to: unknown
  reason: string
}
