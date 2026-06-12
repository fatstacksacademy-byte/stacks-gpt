/**
 * Hawaii local bank & credit-union deposit-account bonuses.
 *
 * The verified inventory of CHECKING / new-member cash bonuses available to
 * Hawaii residents from Hawaii-LOCAL institutions (banks HQ'd in Hawaii and
 * Hawaii-chartered credit unions) — the offers a nationwide catalog can't
 * surface. Spread into `./bonuses.ts` and normalized by `./catalogTaxonomy.ts`
 * exactly like the nationwide checking rows, so they flow into the browse page,
 * the per-state directory (/bank-bonuses-by-state/hawaii), the filters, and
 * tracking with no special-casing.
 *
 * Methodology (mirrors ./states/RESEARCH.md and ../data/states/_builder.ts):
 *   1. Institution inventory first, from NCUA (active Hawaii credit unions) and
 *      FDIC BankFind (active Hawaii-HQ banks). See ./hawaiiBankBonuses.RESEARCH.md.
 *   2. Every ACTIVE bonus below was verified on the institution's OWN official
 *      offer page or disclosure on the `offer_verified_at` date. Aggregators
 *      (Doctor of Credit, bankbonus.com) were used for discovery only.
 *   3. Never infer that an old offer is still live; never invent a requirement
 *      the official page doesn't state ("not stated" is left null / noted).
 *   4. Offers that are discoverable but could NOT be verified on an official
 *      page, are TARGETED/by-invitation, are merchandise (non-cash), or are
 *      rate specials (not cash bonuses) are deliberately EXCLUDED from this
 *      live list and recorded in the RESEARCH report instead.
 *
 * Geography: every offer here is `state_restricted: ["HI"]` so it buckets as a
 * Hawaii-LOCAL offer (not nationwide). Island/county/employer/association limits
 * that are narrower than statewide are spelled out in `eligibility_notes` and
 * surfaced verbatim in the UI — the catalog's state granularity is per-state, so
 * sub-state scope lives in the note. `hawaii_scope` records it in a structured
 * field for the report and future filtering.
 */

const VERIFIED_AT = "2026-06-11"

/** Structured Hawaii-scope provenance carried alongside each row (read by the
 *  research report / future filters; ignored by catalogTaxonomy normalization). */
export type HawaiiScope =
  | "statewide"        // any Hawaii resident can reasonably qualify
  | "oahu"
  | "maui_county"
  | "kauai_county"
  | "hawaii_island"
  | "membership"       // gated by employer / association / school affiliation

type HawaiiBonusMeta = {
  /** ISO date the offer was verified against the institution's official page. */
  offer_verified_at: string
  /** Authority of the proof. Only "official_verified" rows belong in this list. */
  confidence: "official_verified"
  /** Structured sub-state scope (note carries the human-readable limit). */
  hawaii_scope: HawaiiScope
  /** True when a membership / field-of-membership gate applies (credit unions). */
  membership_required: boolean
  /** Whether the account can be opened online (vs. branch-only). */
  online_opening: boolean
  /** Recommended re-verification cadence in days (deadline offers recheck sooner). */
  recheck_days: number
  /** Institution type for the report. */
  institution_type: "bank" | "credit_union"
}

// Each row matches the loose checking-bonus shape consumed by catalogTaxonomy
// (`RawCheckingRow`), plus the Hawaii metadata above. `any` mirrors ./bonuses.ts.
type HawaiiCheckingRow = Record<string, unknown> & HawaiiBonusMeta

export const hawaiiCheckingBonuses: HawaiiCheckingRow[] = [
  // ── Bank of Hawaii — Convenience Checking $100 (online-only, statewide) ──
  {
    id: "bank-of-hawaii-convenience-checking-100-2026",
    bank_name: "Bank of Hawaii",
    product_type: "checking",
    bonus_amount: 100,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 2000,
      min_direct_deposit_per_deposit: null,
      dd_count_required: null,
      deposit_window_days: 60,
      holding_period_days: null,
      min_opening_deposit: 500,
      min_balance: null,
      debit_transactions_required: null,
      billpay_required: null,
      other_requirements_text:
        "Open a new Convenience Checking account online with a $500 initial deposit and receive $2,000 in Qualifying Direct Deposits within 60 days. Apply online.",
    },
    fees: {
      monthly_fee: 5,
      monthly_fee_waiver_text:
        "$5/month, waived with a $500 minimum average daily ledger balance OR $500+ in total monthly direct deposits.",
      early_closure_fee: 40,
    },
    screening: {
      chex_sensitive: "low",
      hard_pull: false,
      soft_pull: true,
      screening_notes: "Bank of Hawaii is low ChexSystems sensitivity.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: true,
      eligibility_notes:
        "Hawaii residents (offer also extends to Guam/Saipan/Palau). New checking customers only; limit one checking bonus per customer. Convenience Checking opens online only. Qualifying Direct Deposits = recurring electronic payroll/government/pension ACH; one-time transfers may not qualify. Accounts closed within 180 days incur a $40 early-closing fee.",
    },
    timeline: { bonus_posting_days_est: 120, must_remain_open_days: 180 },
    expiration_date: "2026-06-30",
    source_links: [
      "https://www.boh.com/personal/bank-accounts/pr/checking-offer",
      "https://www.boh.com/personal/bank/checking",
    ],
    raw_excerpt:
      "Convenience Checking: $100 with a $500 initial deposit and $2,000 in Qualifying Direct Deposits within 60 days. Bonus applied within 120 days of open. Offer available until June 30, 2026, HST.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "statewide",
    membership_required: false,
    online_opening: true,
    recheck_days: 14,
    institution_type: "bank",
  },

  // ── First Hawaiian Bank — Priority Banking Checking $350 (statewide) ──
  {
    id: "first-hawaiian-priority-banking-350-checking-2026",
    bank_name: "First Hawaiian Bank",
    product_type: "checking",
    bonus_amount: 350,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 500,
      min_direct_deposit_per_deposit: 500,
      dd_count_required: null,
      deposit_window_days: 60,
      holding_period_days: null,
      min_opening_deposit: 20,
      min_balance: null,
      debit_transactions_required: null,
      billpay_required: null,
      other_requirements_text:
        "Open a new Priority Banking Gold or Platinum Checking account (min $20 opening deposit) and make a new direct deposit of $500+ within 60 days. $350 statement credit for a NEW account; an existing-customer upgrade earns $100. Apply online.",
    },
    fees: {
      monthly_fee: 15,
      monthly_fee_waiver_text:
        "$15/month, waived with a $6,000 combined balance OR $2,000+ direct deposit per statement cycle OR Private Banking enrollment.",
      early_closure_fee: 75,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: false,
      eligibility_notes:
        "Hawaii, Guam, or CNMI (Saipan) residents. Qualifying direct deposit = recurring ACH such as payroll, pension, or Social Security; P2P, tax refunds, and wires do not qualify. Limit one per customer/account. Statement credit posts the month after criteria are met. $75 early-closing fee if closed/converted within 180 days.",
    },
    timeline: { bonus_posting_days_est: 45, must_remain_open_days: 180 },
    expiration_date: "2026-06-30",
    source_links: [
      "https://www.fhb.com/en/personal/checking",
      "https://www.fhb.com/en/personal/checking/priority-banking-gold",
    ],
    raw_excerpt:
      "Priority Banking Checking (new account): $350 statement credit; make a new direct deposit of $500 within 60 days. $20 min opening deposit. Offer January 1 – June 30, 2026.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "statewide",
    membership_required: false,
    online_opening: true,
    recheck_days: 14,
    institution_type: "bank",
  },

  // ── First Hawaiian Bank — Pure Checking $50 (no-fee entry tier) ──
  {
    id: "first-hawaiian-pure-checking-50-2026",
    bank_name: "First Hawaiian Bank",
    product_type: "checking",
    bonus_amount: 50,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 500,
      min_direct_deposit_per_deposit: 500,
      dd_count_required: null,
      deposit_window_days: 60,
      holding_period_days: null,
      min_opening_deposit: 20,
      min_balance: null,
      debit_transactions_required: null,
      billpay_required: null,
      other_requirements_text:
        "Open a new Pure Checking account (min $20 opening deposit) and make a new direct deposit of $500+ within 60 days for a $50 statement credit. Apply online.",
    },
    fees: {
      monthly_fee: 0,
      monthly_fee_waiver_text: "No monthly fee with eStatements.",
      early_closure_fee: 50,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: false,
      eligibility_notes:
        "Hawaii, Guam, or CNMI (Saipan) residents. Qualifying direct deposit = recurring ACH such as payroll, pension, or Social Security; P2P, tax refunds, and wires do not qualify. Limit one per customer/account. Statement credit posts the month after criteria are met. $50 early-closing fee if closed within 180 days.",
    },
    timeline: { bonus_posting_days_est: 45, must_remain_open_days: 180 },
    expiration_date: "2026-06-30",
    source_links: [
      "https://www.fhb.com/en/personal/checking",
      "https://www.fhb.com/en/personal/checking/pure-checking",
    ],
    raw_excerpt:
      "Pure Checking (new account): $50 statement credit; new direct deposit of $500 within 60 days. No monthly fee with eStatements. Offer January 1 – June 30, 2026.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "statewide",
    membership_required: false,
    online_opening: true,
    recheck_days: 14,
    institution_type: "bank",
  },

  // ── Hawaii State FCU — New Member "Get $50" (statewide, broad membership) ──
  {
    id: "hawaii-state-fcu-new-member-50-2026",
    bank_name: "Hawaii State Federal Credit Union",
    product_type: "checking",
    bonus_amount: 50,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 100,
      min_direct_deposit_per_deposit: null,
      dd_count_required: null,
      deposit_window_days: 60,
      holding_period_days: null,
      min_opening_deposit: null,
      min_balance: null,
      debit_transactions_required: 10,
      billpay_required: null,
      other_requirements_text:
        "New members only. Open any Savings account plus a new Checking account, then EITHER (a) receive a direct deposit of $100+ within 60 days, OR (b) make 10 net debit-card purchases within the first 30 days. Apply online.",
    },
    fees: {
      monthly_fee: 0,
      monthly_fee_waiver_text: "Free checking; a small membership share is held in savings.",
      early_closure_fee: 0,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: true,
      eligibility_notes:
        "Membership open to most Hawaii residents: employees/members of a Hawaii Select Business Partner, immediate family/household of a member, or by donating to Friends of the Library Hawaii / Friends of Iolani Palace. FIRST-TIME HSFCU members only; one $50 per new primary member; paid to the new Savings account (may take up to 90 days). Statewide Hawaii.",
    },
    timeline: { bonus_posting_days_est: 90, must_remain_open_days: null },
    expiration_date: "2026-12-31",
    source_links: [
      "https://hawaiistatefcu.com/offers-promotions/new-member-promo/",
      "https://hawaiistatefcu.com/wp-content/uploads/2026/05/Membership-Get-50-Official-Rules-2026.pdf",
    ],
    raw_excerpt:
      "New members who join Jan 1 – Dec 31, 2026 may receive $50: open Savings + new Checking with a $100+ direct deposit within 60 days OR 10 debit purchases within 30 days. Paid to savings; up to 90 days. Limit one per new primary member.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "statewide",
    membership_required: true,
    online_opening: true,
    recheck_days: 60,
    institution_type: "credit_union",
  },

  // ── Aloha Pacific FCU — Direct Deposit Bonus $100 (membership-gated) ──
  {
    id: "aloha-pacific-fcu-direct-deposit-100-2026",
    bank_name: "Aloha Pacific Federal Credit Union",
    product_type: "checking",
    bonus_amount: 100,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 500,
      min_direct_deposit_per_deposit: null,
      dd_count_required: null,
      deposit_window_days: null,
      holding_period_days: null,
      min_opening_deposit: 5,
      min_balance: null,
      debit_transactions_required: null,
      billpay_required: null,
      other_requirements_text:
        "Enroll a NEW recurring monthly direct deposit into an Aloha Pacific checking account; bonus credited once monthly direct deposits total $500+. Payroll or retirement/Social Security qualify; transfers from other institutions, tax refunds, and P2P (Venmo/Zelle/Cash App/PayPal/Apple Pay) are excluded. Open to NEW and current members.",
    },
    fees: {
      monthly_fee: null,
      monthly_fee_waiver_text: "Not stated.",
      early_closure_fee: 0,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: false,
      eligibility_notes:
        "Membership required: current/retired City & County of Honolulu employees and qualifying groups, plus immediate family/household of a member; requires $5 in personal savings. Bonus open to NEW and current members. $100 credited to savings once monthly direct deposits total $500+.",
    },
    timeline: { bonus_posting_days_est: null, must_remain_open_days: null },
    expiration_date: "2026-12-31",
    source_links: [
      "https://alohapacific.com/whats-new/promotions/it-s-safe-it-s-convenient-it-s-direct-deposit/",
      "https://alohapacific.com/open-an-account/",
    ],
    raw_excerpt:
      "New and current members earn a $100 bonus after enrolling in a new recurring monthly direct deposit totaling $500+ to checking. Valid through 12/31/26.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "membership",
    membership_required: true,
    online_opening: true,
    recheck_days: 60,
    institution_type: "credit_union",
  },

  // ── University of Hawaii FCU — Score100 $100 (no DD, debit + eStatements) ──
  {
    id: "uh-fcu-score100-checking-100-2026",
    bank_name: "University of Hawaii Federal Credit Union",
    product_type: "checking",
    bonus_amount: 100,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: false,
      min_direct_deposit_total: null,
      min_direct_deposit_per_deposit: null,
      dd_count_required: null,
      deposit_window_days: 60,
      holding_period_days: null,
      min_opening_deposit: null,
      min_balance: null,
      debit_transactions_required: 5,
      billpay_required: null,
      other_requirements_text:
        "New members only. Open a new UHFCU Checking account, make 5 debit-card purchases totaling $50+, and enroll in e-Statements within 60 days. Register with code SCORE100 at referlive.com/uhfcuoffers. NO direct deposit required. Paid as a $100 Visa Reward Card.",
    },
    fees: {
      monthly_fee: null,
      monthly_fee_waiver_text: "Not stated.",
      early_closure_fee: 0,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: true,
      eligibility_notes:
        "Membership required: University of Hawaii faculty, staff, students, and their families. NEW UHFCU members only; open checking within 90 days of joining; 18+. No direct deposit required — 5 debit purchases totaling $50 + e-Statements within 60 days. Paid as a $100 Visa Reward Card (allow 4–6 weeks).",
    },
    timeline: { bonus_posting_days_est: 35, must_remain_open_days: null },
    expiration_date: "2026-12-31",
    source_links: [
      "https://www.uhfcu.com/score/",
      "https://www.uhfcu.com/checking/",
    ],
    raw_excerpt:
      "Score100: $100 Visa Reward Card for opening a new checking account, 5 debit purchases totaling $50, and e-Statements within 60 days. Register code SCORE100. Offer 1/1/26 – 12/31/26.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "membership",
    membership_required: true,
    online_opening: true,
    recheck_days: 60,
    institution_type: "credit_union",
  },

  // ── Garden Island FCU — Member referral $25 (Kauai County only) ──
  {
    id: "garden-island-fcu-referral-25-2026",
    bank_name: "Garden Island Federal Credit Union",
    product_type: "checking",
    bonus_amount: 25,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: true,
      min_direct_deposit_total: 1000,
      min_direct_deposit_per_deposit: null,
      dd_count_required: null,
      deposit_window_days: null,
      holding_period_days: null,
      min_opening_deposit: 5,
      min_balance: null,
      debit_transactions_required: null,
      billpay_required: null,
      other_requirements_text:
        "Referred new member: open a Primary Share account plus Share Draft or Mala Checking ($5 min), register for online/mobile banking, enroll in e-Statements, and receive a qualifying direct deposit of $1,000+/month. $25 paid to both the new member and the referrer within 60 days. A referral is required (present a referral card or email it).",
    },
    fees: {
      monthly_fee: 0,
      monthly_fee_waiver_text: "No monthly checking fee.",
      early_closure_fee: 0,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: ["HI"],
      states_excluded: [],
      lifetime_language: false,
      eligibility_notes:
        "KAUAI COUNTY ONLY — membership restricted to Kauai residents/workers. New member must be referred by an existing member (publicly available via the member referral program). Requires a $1,000+/month direct deposit, online banking, and e-Statements. $25 to the new member, paid within 60 days. No stated deadline.",
    },
    timeline: { bonus_posting_days_est: 60, must_remain_open_days: null },
    source_links: ["https://www.gardenislandfcu.com/member-referral-program"],
    raw_excerpt:
      "$25 cash bonus to both referring and new referred member: open Primary Share + checking ($5), online banking, e-Statements, $1,000+/month direct deposit; paid within 60 days. Kauai County membership.",
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    hawaii_scope: "kauai_county",
    membership_required: true,
    online_opening: true,
    recheck_days: 90,
    institution_type: "credit_union",
  },
]
