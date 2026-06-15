export type SavingsBonusTier = {
  min_deposit: number
  bonus_amount: number
}

export type SavingsBonus = {
  id: string
  bank_name: string
  product_type: "savings"
  base_apy: number // decimal, e.g. 0.035 = 3.5%
  funding_window_days: number // days allowed to deposit
  maintenance_days: number // days to hold after funding
  total_hold_days: number // practical total hold (fund midpoint + maintenance + payout buffer)
  tiers: SavingsBonusTier[]
  cooldown_months: number | null
  fees: {
    monthly_fee: number
    early_closure_fee: number
  }
  eligibility: {
    state_restricted: boolean
    states_allowed: string[]
    /** 2-letter codes to carve out of an otherwise-nationwide offer (read by
     *  catalogTaxonomy → excludedStates), e.g. Chase's coupon excludes HI. */
    states_excluded?: string[]
    lifetime_language: boolean
    eligibility_notes: string
  }
  source_links: string[]
  raw_excerpt: string
  expired?: boolean
  notes?: string
  business?: boolean
  brokerage?: boolean
  /**
   * Optional override for the "deposited" step label on the active-bonus card.
   * Use when the real qualifying action isn't a one-time deposit — e.g.,
   * Ally's referral requires 3 monthly recurring transfers, not a single
   * $60 deposit. If unset, the UI shows the default "$X deposited".
   */
  deposit_action_label?: string
}

/**
 * Extra days a deposit is realistically committed beyond the modeled
 * `total_hold_days`. The stored hold assumes you fund at the last legal
 * moment and the bonus posts the instant maintenance ends. In practice the
 * capital is tied up longer: ACH settlement (3–5 business days), funding
 * earlier than the deadline rather than cutting it close, and bonus payout
 * posting lag (often a statement cycle after you qualify).
 *
 * This slack is roughly fixed-duration regardless of hold length, so it's an
 * ADDITIVE buffer — it (correctly) penalizes short holds more than long ones,
 * which is where the optimistic-APY error concentrates. Always read the hold
 * through `practicalHoldDays()` rather than `total_hold_days` directly so the
 * effective-APY, interest, and rotation math stay conservative and consistent.
 */
export const HOLD_BUFFER_DAYS = 10

/** Practical capital-committed window: modeled hold + fixed settlement/payout buffer. */
export const practicalHoldDays = (b: Pick<SavingsBonus, "total_hold_days">) =>
  b.total_hold_days + HOLD_BUFFER_DAYS

export const savingsBonuses: SavingsBonus[] = [
  {
    id: "etrade-premium-savings-2026",
    bank_name: "E*TRADE",
    product_type: "savings",
    base_apy: 0.035,
    funding_window_days: 30,
    maintenance_days: 45,
    total_hold_days: 60, // fund ~day 15, then 45-day maintain
    tiers: [
      { min_deposit: 20000, bonus_amount: 300 },
      { min_deposit: 50000, bonus_amount: 750 },
      { min_deposit: 75000, bonus_amount: 1000 },
      { min_deposit: 100000, bonus_amount: 1500 },
      { min_deposit: 200000, bonus_amount: 2000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Maximum of 2 Premium Savings bonuses per customer. FDIC-insured savings account."
    },
    source_links: [
      "https://us.etrade.com/promo/savings",
      "https://www.doctorofcredit.com/e-trade-savings-account-bonus/"
    ],
    raw_excerpt: "Deposit net-new funds within 30 days, maintain for 45 additional days. Bonus paid ~30 days after maintenance. Fund early (~day 15) to reduce total hold to ~60 days and boost effective APY.",
    expired: true,
    notes: "Cash bonus offer expired. Current offer is 4.00% promo APY for 6 months (no cash bonus)."
  },
  {
    id: "capital-one-360-savings-2026",
    bank_name: "Capital One",
    product_type: "savings",
    base_apy: 0.034,
    funding_window_days: 15,
    maintenance_days: 90,
    total_hold_days: 105,
    tiers: [
      { min_deposit: 20000, bonus_amount: 300 },
      { min_deposit: 50000, bonus_amount: 750 },
      { min_deposit: 100000, bonus_amount: 1500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "New 360 Performance Savings customers only. External funds required. Ineligible if you held eligible Capital One savings accounts on or after Jan 1, 2024. Use promo code BONUS1500."
    },
    source_links: [
      "https://www.capitalone.com/bank/bonus1500/"
    ,
      "https://www.doctorofcredit.com/capital-one-300-1500-savings-bonus-requires-20000-100000-deposit/"
    ],
    raw_excerpt: "Open 360 Performance Savings with code BONUS1500, deposit external funds within 15 days, maintain for 90 days. Bonus paid within ~60 days after meeting requirements."
  },
  {
    id: "barclays-tiered-savings-2026",
    bank_name: "Barclays",
    product_type: "savings",
    base_apy: 0.0385,
    funding_window_days: 30,
    maintenance_days: 120,
    total_hold_days: 150, // 30-day fund + 120-day maintain
    tiers: [
      { min_deposit: 30000, bonus_amount: 200 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "New Barclays savings customers only. Prior Barclays savings or CD customers may be excluded."
    },
    source_links: [
      "https://banking.us.barclays/tiered-savings.html?refid=BBDOUOUTO01"
    ],
    raw_excerpt: "Deposit $30,000+ in net-new money within 30 days, maintain for 120 consecutive days. Bonus paid within ~60 days after maintenance period.",
    expired: true,
    notes: "$200 bonus offer expired. Barclays Tiered Savings still offers competitive APY (up to 3.85%) but no cash bonus."
  },
  {
    id: "marcus-savings-bonus-2026",
    bank_name: "Marcus (Goldman Sachs)",
    product_type: "savings",
    base_apy: 0.0365,
    funding_window_days: 10,
    maintenance_days: 90,
    total_hold_days: 100, // 10-day fund + 90-day maintain
    tiers: [
      { min_deposit: 10000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 750 },
      { min_deposit: 100000, bonus_amount: 1500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New or existing Marcus savings customers can enroll. Must enroll in the offer before funding. 10-day funding window starts after enrollment."
    },
    source_links: [
      "https://www.marcus.com/us/en/savings/osa-savingsbonus"
    ],
    raw_excerpt: "Enroll by deadline, deposit new funds within 10 days of enrollment, maintain for 90 days. Bonus deposited ~14 days after qualifying. Must enroll FIRST before funding.",
    expired: true,
    notes: "Marcus savings bonus offer expired. No active cash bonus found as of April 2026."
  },
  {
    id: "chase-savings-combo-2026",
    bank_name: "Chase",
    product_type: "savings",
    base_apy: 0.0002, // ~0.02% APY
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 15000, bonus_amount: 600 }, // $200 savings + $400 combo bonus
    ],
    cooldown_months: 24,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Available to Hawaii residents (Chase personal checking/savings bonuses are obtainable in HI). New Chase savings customers only. Not available if you closed a Chase savings account in the last 90 days or with a negative balance in the last 3 years. One savings bonus every 2 years. Combo bonus ($400) requires also completing checking direct deposit requirement."
    },
    source_links: [
      "https://account.chase.com/consumer/banking/checkingandsavingsoffer"
    ],
    raw_excerpt: "Open Chase Savings via combo link, deposit $15,000 new money, maintain 90 days. $600 in savings-related bonuses ($200 savings + $400 combo). Checking bonus ($300) requires direct deposit and is separate.",
    notes: "The $600 bonus assumes you also complete the checking direct deposit. If only doing savings, the bonus is $200. Best used as a combo play with checking."
  },
  {
    id: "seacoast-200-savings-2026",
    bank_name: "Seacoast Bank",
    product_type: "savings",
    base_apy: 0.0001, // ~0.01% APY on Statement Savings
    funding_window_days: 90,
    maintenance_days: 90,
    total_hold_days: 180,
    tiers: [
      { min_deposit: 25000, bonus_amount: 200 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: true,
      states_allowed: ["FL"],
      lifetime_language: true,
      eligibility_notes: "Florida residents only. New savings customers only. In-branch only. Promo code SWITCH600. Pairs with $400 Premium Checking bonus for $600 total."
    },
    source_links: [
      "https://www.seacoastbank.com/switch600",
      "https://www.doctorofcredit.com/fl-in-branch-only-seacoast-bank-350-checking-150-savings-bonus/"
    ],
    raw_excerpt: "$200 savings bonus with $25,000 net-new deposit, maintained 90 days. Florida only. In-branch only. Promo code SWITCH600. Combo with $400 checking = $600 total switch bonus.",
    notes: "Standalone savings half of the Seacoast Switch & Save offer. The $400 checking half is a separate entry (seacoast-400-checking-2026). Open both in-branch with the same promo for $600 total."
  },
  {
    id: "ameriprise-savings-2026",
    bank_name: "Ameriprise",
    product_type: "savings",
    base_apy: 0.0305,
    funding_window_days: 83, // must fund by June 30, 2026 (offer period Apr 8 - Jun 30)
    maintenance_days: 92, // must maintain through September 30, 2026
    total_hold_days: 120, // ~120 days if funded mid-May
    tiers: [
      { min_deposit: 25000, bonus_amount: 300 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "Must be an existing Ameriprise Financial client before April 7, 2026. One bonus per customer. External funds only."
    },
    source_links: [
      "https://www.ameriprise.com/products/ameriprise-bank/savings"
    ,
      "https://www.doctorofcredit.com/existing-customers-ameriprise-up-to-900-checking-savings-bonus/"
    ],
    raw_excerpt: "Deposit $25,000+ during offer period (Apr 8 - Jun 30, 2026), maintain through September 30, 2026. Bonus credited by March 31, 2027. Fund as late as possible to minimize hold time.",
    notes: "Requires existing Ameriprise client relationship. Calendar-based hold (through Sep 30) rather than days-from-deposit. Fund late in the offer period to minimize lockup."
  },
  {
    id: "ally-savings-referral-2026",
    bank_name: "Ally",
    product_type: "savings",
    base_apy: 0.033,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 90, // 3 months of recurring transfers
    tiers: [
      { min_deposit: 60, bonus_amount: 100 }, // $20/mo x 3 months = $60 total
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "New Ally Bank customers only. Cannot have had any Ally account since 1/24/24. One referral bonus per new customer. Requires 3 consecutive monthly automated recurring transfers."
    },
    source_links: [
      "https://www.ally.com/referral?code=6J7N9D8R8T&CP=MobileAppReferFriend"
    ,
      "https://www.doctorofcredit.com/ally-launches-pilot-referral-program-100-50/"
    ],
    raw_excerpt: "Open Ally Online Savings via referral link, set up automated recurring transfer ($20/mo minimum), complete 3 consecutive months. Bonus posts after requirements met.",
    notes: "Extremely easy $100. No large deposit required. Set $20/mo recurring and forget it.",
    deposit_action_label: "Set up $20+/mo recurring transfer for 3 months",
  },
  {
    id: "blue-foundry-savings-2026",
    bank_name: "Blue Foundry Bank",
    product_type: "savings",
    base_apy: 0.013, // blended effective rate on $15k (most at 1.30%)
    funding_window_days: 30,
    maintenance_days: 182,
    total_hold_days: 182,
    tiers: [
      { min_deposit: 15000, bonus_amount: 300 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "One bonus per tax ID per product. New money required. Promotion may be discontinued at any time."
    },
    source_links: [
      "https://bluefoundrybank.com/blue-axis-edge-checking",
      "https://www.doctorofcredit.com/nj-blue-foundry-bank-300-checking-300-savings-bonus/"
    ],
    raw_excerpt: "Deposit $15,000+ in new money, maintain for 6 months (182 days). Bonus credited within 60 days after qualification. Blended APY: 3.73% on first $5k, 1.30% on $5k-$250k.",
    notes: "Weak standalone — long 182-day lockup with low blended APY. Only worth doing if stacked with the Blue Foundry checking bonus.",
    expired: true,
  },
  {
    id: "citi-savings-2026",
    expired: true,
    bank_name: "Citi",
    product_type: "savings",
    base_apy: 0.01,
    funding_window_days: 45,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 30000, bonus_amount: 750 },
      { min_deposit: 200000, bonus_amount: 1500 },
    ],
    cooldown_months: 12,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "This entry is not a separate savings product — it points to the same Citi checking tiered offer. Disabled to avoid double-counting with citi-regular-checking-325-edd-2026."
    },
    source_links: ["https://banking.citi.com/cbol/OM/checking/choice/featured-offers/default.htm"],
    raw_excerpt: "MARKED EXPIRED: this was miscategorized as a savings product. The source URL is a /checking/ path and the tiered bonus is tied to the Citi checking relationship, not a distinct savings account. APY (1% stored, 4.35% in old excerpt) was also unverified and likely stale.",
  },
  {
    id: "wells-fargo-platinum-savings-2026",
    expired: true,
    bank_name: "Wells Fargo",
    product_type: "savings",
    base_apy: 0.0401,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 25000, bonus_amount: 500 },
      { min_deposit: 100000, bonus_amount: 1000 },
      { min_deposit: 250000, bonus_amount: 2500 },
    ],
    cooldown_months: 12,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "In-branch for highest tiers. 4.00% promo APY for 6 months. New money required."
    },
    source_links: ["https://www.wellsfargo.com/savings-cds/platinum-savings/"],
    raw_excerpt: "Wells Fargo Platinum Savings up to $2,500 bonus. 4.00% promo APY for 6 months. In-branch for $250k+ tier.",
  },
  {
    id: "raisin-savings-2026",
    expired: true,
    bank_name: "Raisin (SaveBetter)",
    product_type: "savings",
    base_apy: 0.043,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [
      { min_deposit: 5000, bonus_amount: 200 },
      { min_deposit: 25000, bonus_amount: 400 },
      { min_deposit: 50000, bonus_amount: 500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New Raisin customers. Stackable with TopCashback bonus ($100 extra). Multiple partner banks available."
    },
    source_links: ["https://www.raisin.com/"],
    raw_excerpt: "Raisin/SaveBetter $200-$500 savings bonus. Stackable with TopCashback $100. 4.3% APY via partner banks.",
    notes: "Can stack additional $100 from TopCashback portal. Effectively $300-$600 total."
  },
  {
    id: "td-bank-savings-2026",
    bank_name: "TD Bank",
    product_type: "savings",
    base_apy: 0.02,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 10000, bonus_amount: 200 },
    ],
    cooldown_months: 12,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: true,
      states_allowed: ["CT","DC","DE","FL","MA","MD","ME","NC","NH","NJ","NY","PA","RI","SC","VT","VA"],
      lifetime_language: false,
      eligibility_notes: "New TD savings customers only. East Coast states. Expires April 30, 2026."
    },
    source_links: ["https://www.td.com/us/en/personal-banking/savings-accounts/",
      "https://www.doctorofcredit.com/targeted-td-bank-300-checking-200-savings-bonus/"
    ],
    raw_excerpt: "TD Bank $200 savings bonus for $10k deposit. East Coast 16 states. Expires April 30, 2026.",
  },
  {
    id: "wintrust-savings-2026",
    bank_name: "Wintrust Bank",
    product_type: "savings",
    base_apy: 0.01,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 15000, bonus_amount: 200 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: true,
      states_allowed: ["IL", "FL", "WI", "IN", "MI"],
      lifetime_language: true,
      eligibility_notes: "Must open savings during same visit as checking. $15,000 deposit in opening month, maintain 3 months."
    },
    source_links: ["https://www.wintrust.com/solutions-and-services/community-banking/total-access-checking.html",
      "https://www.doctorofcredit.com/il-only-wintrust-bank-300-checking-bonus/"
    ],
    raw_excerpt: "Wintrust $200 savings bonus for $15k deposit maintained 3 months. Stackable with $500 checking bonus.",
    notes: "Best stacked with the $500 checking bonus. The $200 savings is gravy on top."
  },
  {
    id: "hsbc-premier-savings-2026",
    bank_name: "HSBC",
    product_type: "savings",
    base_apy: 0.041,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 100000, bonus_amount: 1500 },
      { min_deposit: 250000, bonus_amount: 2500 },
      { min_deposit: 500000, bonus_amount: 5000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "HSBC Premier Savings. May require HSBC Premier relationship ($75k+ in deposits/investments or mortgage)."
    },
    source_links: ["https://www.us.hsbc.com/savings-accounts/",
      "https://www.doctorofcredit.com/hsbc-1500-7000-checking-bonus/"
    ],
    raw_excerpt: "HSBC up to $7,000 savings bonus. Tiered from $10k-$500k. 4.1% APY. Premier relationship may be required.",
  },
  {
    id: "moomoo-cash-sweep-2026",
    bank_name: "Moomoo",
    product_type: "savings",
    base_apy: 0.041,
    funding_window_days: 30,
    maintenance_days: 60,
    total_hold_days: 90,
    tiers: [
      { min_deposit: 500, bonus_amount: 30 },
      { min_deposit: 2000, bonus_amount: 100 },
      { min_deposit: 10000, bonus_amount: 200 },
      { min_deposit: 50000, bonus_amount: 400 },
      { min_deposit: 100000, bonus_amount: 1000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New customers only (no prior moomoo deposit before 1/1/2026). Reward paid in fractional NVDA stock. SIPC protected, not FDIC insured. Window 1/1–8/31/2026. A separate 3% ACAT transfer-in coupon (max $600) can stack."
    },
    source_links: ["https://www.moomoo.com/us/support/topic4_410",
      "https://www.doctorofcredit.com/moomoo-brokerage-triple-stack-signup-transfer-bonus-offer/"
    ],
    raw_excerpt: "Moomoo welcome deposit: up to $1,000 in NVDA stock. $500→$30, $2k→$100, $10k→$200, $50k→$400, $100k→$1,000. Stackable 3% ACAT transfer coupon (max $600).",
    notes: "Bonus paid in NVDA stock (sellable immediately, price risk until then). SIPC protected, not FDIC insured. Hold tiered: 60d ($500–$10k), 120d ($50k), 180d ($100k). Deposit bonus + 3% ACAT transfer coupon stack for new customers."
  },
  {
    id: "cit-bank-savings-300-2026",
    expired: true,
    bank_name: "CIT Bank",
    product_type: "savings",
    base_apy: 0.042,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 25000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 300 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New CIT Bank savings customers. Deposit within 30 days, maintain 90 days."
    },
    source_links: ["https://www.cit.com/cit-bank/"],
    raw_excerpt: "CIT Bank up to $300 savings bonus. 4.2% APY. $25k for $100, $50k for $300. 30-day funding, 90-day maintenance.",
  },
  {
    id: "raisin-savings-1500-2026",
    bank_name: "Raisin",
    product_type: "savings",
    base_apy: 0.043,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 10000, bonus_amount: 70 },
      { min_deposit: 25000, bonus_amount: 175 },
      { min_deposit: 50000, bonus_amount: 350 },
      { min_deposit: 100000, bonus_amount: 750 },
      { min_deposit: 200000, bonus_amount: 1500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New Raisin customers. Deposit within 30 days, maintain 90 days. Stackable with TopCashback."
    },
    source_links: ["https://www.raisin.com/",
      "https://www.doctorofcredit.com/raisin-up-to-200-savings-bonus-referral-savebetter/"
    ],
    raw_excerpt: "Raisin up to $1,500 savings bonus. 4.3% APY. Tiered: $100/$500/$1,000/$1,500. Stackable with TopCashback.",
    notes: "Stackable with TopCashback for additional cashback on deposit."
  },
  // ─── BROKERAGE BONUSES ────────────────────────────────────────
  {
    id: "etrade-brokerage-2026",
    brokerage: true,
    bank_name: "E*TRADE (Brokerage / IRA)",
    product_type: "savings",
    base_apy: 0.035,
    funding_window_days: 60,
    maintenance_days: 365,
    total_hold_days: 365,
    tiers: [
      { min_deposit: 1000, bonus_amount: 50 },
      { min_deposit: 5000, bonus_amount: 150 },
      { min_deposit: 20000, bonus_amount: 300 },
      { min_deposit: 100000, bonus_amount: 600 },
      { min_deposit: 200000, bonus_amount: 1000 },
      { min_deposit: 500000, bonus_amount: 1500 },
      { min_deposit: 1000000, bonus_amount: 3000 },
      { min_deposit: 1500000, bonus_amount: 5000 },
      { min_deposit: 2000000, bonus_amount: 6000 },
      { min_deposit: 5000000, bonus_amount: 10000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Covers both brokerage (OFFER26) and retirement IRA accounts (RETIRE26). 12-month hold required. Funds must be net new to E*TRADE. One bonus per customer. Account must be opened by June 30, 2026 and funded within 60 days."
    },
    source_links: [
      "https://us.etrade.com/promo/retirement",
      "https://us.etrade.com/promo/brokerage",
      "https://www.doctorofcredit.com/etrade-up-to-3500-brokerage-referral-bonus-25000-1000000-required/"
    ],
    raw_excerpt: "E*TRADE up to $10,000 brokerage/IRA bonus. 12-month hold. Tiered from $1k–$5M+ deposits. Expires June 30, 2026.",
    notes: "Covers both brokerage (OFFER26) and retirement IRA (RETIRE26) promos — same tiers and terms. 12-month hold is long but tiers start at just $1,000."
  },
  {
    id: "schwab-brokerage-2026",
    brokerage: true,
    bank_name: "Charles Schwab (Brokerage)",
    product_type: "savings",
    base_apy: 0.035,
    funding_window_days: 45,
    maintenance_days: 365,
    total_hold_days: 365,
    tiers: [
      { min_deposit: 25000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 300 },
      { min_deposit: 100000, bonus_amount: 500 },
      { min_deposit: 500000, bonus_amount: 1000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Brokerage or IRA. 12-month hold. Requires referral from existing Schwab member."
    },
    source_links: ["https://www.schwab.com/client-referral?refrid=REFERE7P2ZQBK",
      "https://www.doctorofcredit.com/schwab-brokerage-bonus-up-to-2500-valid-for-existing-customers-public-offer/"
    ],
    raw_excerpt: "Schwab up to $1,000 brokerage bonus via referral. 12-month hold.",
    notes: "Brokerage account. Requires referral link from existing Schwab customer."
  },
  {
    id: "merrill-edge-brokerage-2026",
    brokerage: true,
    bank_name: "Merrill Edge (Brokerage)",
    product_type: "savings",
    base_apy: 0.035,
    funding_window_days: 45,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [
      { min_deposit: 20000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 150 },
      { min_deposit: 100000, bonus_amount: 250 },
      { min_deposit: 250000, bonus_amount: 1000 },
      { min_deposit: 500000, bonus_amount: 1500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Brokerage or IRA. 90-day hold. Linked to Bank of America Preferred Rewards."
    },
    source_links: ["https://www.merrilledge.com/offers"],
    raw_excerpt: "Merrill Edge up to $1,500 brokerage bonus. 90-day hold. Stacks with BofA Preferred Rewards.",
    notes: "Brokerage account. Short 90-day hold. Stacks with BofA relationship bonuses."
  },
  {
    id: "tastytrade-brokerage-2026",
    brokerage: true,
    bank_name: "Tastytrade (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 60,
    maintenance_days: 365,
    total_hold_days: 365,
    tiers: [
      { min_deposit: 5000, bonus_amount: 100 },
      { min_deposit: 10000, bonus_amount: 200 },
      { min_deposit: 25000, bonus_amount: 500 },
      { min_deposit: 50000, bonus_amount: 1000 },
      { min_deposit: 100000, bonus_amount: 2000 },
      { min_deposit: 250000, bonus_amount: 5000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Brokerage only. 12-month hold. Must be net new funds."
    },
    source_links: ["https://www.doctorofcredit.com/tastyworks-brokerage-bonus-fund-with-2000-earn-200-bonus/"],
    raw_excerpt: "Tastytrade 4% deposit bonus (up to $10,000 on $250k deposit). 12-month hold. Promo code MYNEWBONUS, or BIGDEAL if signing up via referral link.",
    expired: true,
    notes: "EXPIRED — the 4% deposit-match (code BIGDEAL) was pulled Jan 23, 2026. Only a $100/$100 referral remains (Jun 1–Aug 31, 2026). Re-add if the deposit match returns."
  },
  {
    id: "sofi-invest-150-2026",
    brokerage: true,
    bank_name: "SoFi Invest (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 30,
    maintenance_days: 30,
    total_hold_days: 30,
    tiers: [
      { min_deposit: 100, bonus_amount: 150 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "New SoFi Active Investing customers, via Rakuten/Swagbucks shopping portal. Deposit $100, trade $50, hold 30 days. (SoFi's own native offer is now 'up to $1,000 in stock' — a probabilistic grant that typically pays $3–$20 in practice, not a flat bonus.)"
    },
    source_links: ["https://www.sofi.com/invest/",
      "https://www.doctorofcredit.com/swagbucks-signup-for-sofi-invest-get-75-bonus-100-deposit-required/"
    ],
    raw_excerpt: "SoFi Invest $150 (15,000 MR / Rakuten cash) for $100 deposit + $50 trade, 30-day hold. Portal amount fluctuates $50–$200.",
    notes: "Brokerage account. $150 via Rakuten/Swagbucks portal ($100 deposit + $50 trade) — far better than SoFi's native 'up to $1,000 in stock' offer, which typically pays $3–$20 in practice."
  },
  {
    id: "jpmorgan-self-directed-brokerage-2026",
    brokerage: true,
    bank_name: "J.P. Morgan Self-Directed (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 45,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [
      { min_deposit: 5000, bonus_amount: 50 },
      { min_deposit: 25000, bonus_amount: 150 },
      { min_deposit: 100000, bonus_amount: 325 },
      { min_deposit: 250000, bonus_amount: 1000 },
    ],
    cooldown_months: 12,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New Chase brokerage or IRA. Net-new money from a non-Chase/non-J.P. Morgan source. Coupon enrollment required. 90-day hold (trading losses excluded). One investing new-money bonus per 12 months."
    },
    source_links: ["https://www.chase.com/personal/investments/online-investing",
      "https://www.doctorofcredit.com/chase-you-invest-bonus-200-625-bonus-with-25000-250000-investment-account/"
    ],
    raw_excerpt: "J.P. Morgan Self-Directed Investing up to $1,000. $5k→$50, $25k→$150, $100k→$325, $250k→$1,000. 45-day fund, 90-day hold. Extended to 07/21/2026.",
    notes: "Brokerage account. Short 90-day hold and tiers start at $5k — one of the cleanest brokerage cash bonuses live. Pairs with Chase checking/Sapphire new-money offers (1 investing bonus per 12 mo)."
  },
  {
    id: "tradestation-brokerage-2026",
    brokerage: true,
    bank_name: "TradeStation (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 45,
    maintenance_days: 270,
    total_hold_days: 270,
    tiers: [
      { min_deposit: 500, bonus_amount: 50 },
      { min_deposit: 25000, bonus_amount: 250 },
      { min_deposit: 100000, bonus_amount: 400 },
      { min_deposit: 200000, bonus_amount: 800 },
      { min_deposit: 1000000, bonus_amount: 3000 },
      { min_deposit: 2000000, bonus_amount: 5000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New clients only (no prior promo-cash recipients). Net-new equities/futures funds from outside TradeStation. IRAs/tax-qualified excluded. Promo code INCTAGGV. 270-day hold."
    },
    source_links: ["https://www.tradestation.com/promo/investmentcurrent/",
      "https://bankbonus.com/promotions/tradestation/"
    ],
    raw_excerpt: "TradeStation up to $5,000. $500→$50 up to $2M→$5,000. 45-day fund, 270-day (9-mo) hold. Code INCTAGGV.",
    notes: "Brokerage account. Low $500 entry tier but a long 9-month hold. Use the official promo code INCTAGGV (aggregator codes are stale)."
  },
  {
    id: "betterment-invest-brokerage-2026",
    brokerage: true,
    bank_name: "Betterment (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 45,
    maintenance_days: 1095,
    total_hold_days: 1095,
    tiers: [
      { min_deposit: 2500, bonus_amount: 100 },
      { min_deposit: 10000, bonus_amount: 125 },
      { min_deposit: 25000, bonus_amount: 250 },
      { min_deposit: 50000, bonus_amount: 750 },
      { min_deposit: 100000, bonus_amount: 1250 },
      { min_deposit: 200000, bonus_amount: 2000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Net-new qualified deposits to a Betterment Investing account. 45-day fund window, 3-YEAR hold (early withdrawal triggers a fee). New and existing customers."
    },
    source_links: ["https://www.betterment.com/",
      "https://www.doctorofcredit.com/betterment-up-to-1000-investment-bonus-3-year-hold-period/"
    ],
    raw_excerpt: "Betterment up to $2,000. $2,500→$100 up to $200k→$2,000. 45-day fund, 3-year hold.",
    notes: "Brokerage account (robo). High headline tiers but a punishing 3-year hold tanks the effective APY — only worth it if you'd park the money there long-term anyway."
  },
  {
    id: "ally-invest-brokerage-2026",
    brokerage: true,
    bank_name: "Ally Invest (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [
      { min_deposit: 1000, bonus_amount: 200 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "Existing Ally Bank customers who have never had Ally Invest. $200 for $1,000 in net-new external funds ($100 if transferred from an existing Ally account). Self-Directed Trading account. Open by 12/31/2026, 90-day hold."
    },
    source_links: ["https://www.ally.com/invest/",
      "https://www.doctorofcredit.com/best-brokerage-bonuses-earn-up-to-3500/"
    ],
    raw_excerpt: "Ally Invest $200 for $1,000 external deposit (existing Ally Bank customers, new to Invest). 30-day fund, 90-day hold. Open by 12/31/2026.",
    notes: "Brokerage account. Excellent rate ($200 on $1k = 20%) but gated to existing Ally Bank customers who've never held Ally Invest."
  },
  {
    id: "interactive-brokers-brokerage-2026",
    brokerage: true,
    bank_name: "Interactive Brokers (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 30,
    maintenance_days: 365,
    total_hold_days: 365,
    tiers: [
      { min_deposit: 10000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 500 },
      { min_deposit: 100000, bonus_amount: 1000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "Only clients who have NEVER held an IBKR account. $1 in IBKR stock per $100 deposited/transferred (max $1,000), linear. Min $10k funded within 30 days to qualify; net deposits count over 1 year. Bonus shares held 1 year before withdrawable."
    },
    source_links: ["https://www.interactivebrokers.com/en/index.php?f=stockBenefitsLandingPage",
      "https://www.brokerage-review.com/online-brokers/promotionoffer/interactivebrokers-promotions.aspx"
    ],
    raw_excerpt: "Interactive Brokers $1 in IBKR stock per $100 deposited, up to $1,000. Min $10k/30 days. 1-year hold on bonus shares.",
    notes: "Brokerage account. Reward is IBKR stock (price risk). Standing program — only for first-time IBKR clients."
  },
  {
    id: "tradier-brokerage-2026",
    brokerage: true,
    bank_name: "Tradier (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 60,
    maintenance_days: 180,
    total_hold_days: 180,
    tiers: [
      { min_deposit: 5000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 1000 },
      { min_deposit: 150000, bonus_amount: 3000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "New Tradier clients via the promo page. 2% cash back on ACAT-transferred assets (min $5,000), capped at $3,000. 180-day hold; withdrawals forfeit remaining bonus. Up to $100 ACAT fee reimbursement. Verify 2026 campaign dates."
    },
    source_links: ["https://blog.tradier.com/blog/acat-transfer-promo",
      "https://www.doctorofcredit.com/tradier-2-match-brokerage-bonus/"
    ],
    raw_excerpt: "Tradier 2% cash back on ACAT transfers (min $5k, cap $3,000). 6-month hold. Includes 2 months free Tradier Pro.",
    notes: "Brokerage account. 2% of transferred assets. DoC marked the 2025 run expired but Tradier re-launched for 2026 — confirm current campaign dates before promoting."
  },
  {
    id: "public-brokerage-2026",
    brokerage: true,
    bank_name: "Public.com (Brokerage)",
    product_type: "savings",
    base_apy: 0.0,
    funding_window_days: 30,
    maintenance_days: 1825,
    total_hold_days: 1825,
    tiers: [
      { min_deposit: 5000, bonus_amount: 50 },
      { min_deposit: 50000, bonus_amount: 500 },
      { min_deposit: 250000, bonus_amount: 2500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "1% uncapped match on ACAT transfers (brokerage or IRA). Up to $100 ACAT fee reimbursement if account > $5,000. Transfers on/after 5/1/2025 carry a 5-YEAR hold. Re-verify current window (last published end date 5/31/2026)."
    },
    source_links: ["https://help.public.com/en/articles/6499808-transfer-account-bonus",
      "https://www.doctorofcredit.com/public-brokerage-up-to-10000-bonus/"
    ],
    raw_excerpt: "Public.com 1% uncapped ACAT transfer match. 5-year hold on transfers since 5/1/2025. Fee reimbursement up to $100.",
    notes: "Brokerage account. Only 1% and a brutal 5-year lock — ranks low on effective APY by design. Included for completeness; re-confirm the offer window is still live."
  },
  // ─── BUSINESS CHECKING (capital deployment) ───────────────────
  {
    id: "chase-biz-savings-500",
    bank_name: "Chase Business Checking",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 60,
    total_hold_days: 90,
    tiers: [{ min_deposit: 2000, bonus_amount: 300 }, { min_deposit: 10000, bonus_amount: 500 }, { min_deposit: 20000, bonus_amount: 750 }],
    cooldown_months: 24,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], states_excluded: ["HI"], lifetime_language: false, eligibility_notes: "Business Complete Checking. Chase business deposit accounts are not available to Hawaii businesses (no HI Chase branches). Deposit + 5 transactions in 90 days." },
    source_links: ["https://www.chase.com/business/checking",
      "https://www.doctorofcredit.com/chase-business-total-checking-750-bonus-no-direct-deposit-required/"
    ],
    raw_excerpt: "Chase Business $300/$500 checking bonus. Deposit in 30 days, maintain 60 days.",
  },
  {
    id: "bofa-biz-savings-750",
    bank_name: "BofA Business Advantage",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 60,
    total_hold_days: 90,
    tiers: [{ min_deposit: 5000, bonus_amount: 400 }, { min_deposit: 15000, bonus_amount: 750 }],
    cooldown_months: 12,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "Business Advantage Banking. Deposit in 30 days, maintain 60 days." },
    source_links: ["https://www.doctorofcredit.com/bank-of-america-400-750-business-checking-bonus/"],
    raw_excerpt: "BofA Business Advantage $400/$750 checking bonus. $5k for $400 or $15k for $750. Deposit in 30 days, maintain 60 days. Expires Dec 31, 2026.",
  },
  {
    id: "usbank-biz-savings-1200",
    bank_name: "U.S. Bank Business Platinum",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 60,
    total_hold_days: 90,
    tiers: [{ min_deposit: 5000, bonus_amount: 400 }, { min_deposit: 25000, bonus_amount: 1200 }],
    cooldown_months: 12,
    fees: { monthly_fee: 30, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "Platinum Business Checking. Promo Q2DIG26. Deposit in 30 days, maintain 60 days, 6 transactions." },
    source_links: ["https://www.usbank.com/splash/business-checking/business-checking-promo-var-4.html",
      "https://www.doctorofcredit.com/u-s-bank-400-900-business-checking-bonus/"
    ],
    raw_excerpt: "U.S. Bank Business $400/$1,200. $25k for top tier. Promo Q2AFL26.",
  },
  {
    id: "wells-fargo-biz-savings-825",
    bank_name: "Wells Fargo Business",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 60,
    total_hold_days: 60,
    tiers: [{ min_deposit: 2500, bonus_amount: 400 }, { min_deposit: 25000, bonus_amount: 825 }],
    cooldown_months: 12,
    fees: { monthly_fee: 15, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "Business checking. $2,500 ending balance on days 30 and 60." },
    source_links: [
      "https://accountoffers.wellsfargo.com/businesscheckinga",
      "https://accountoffers.wellsfargo.com/businesscheckingb",
      "https://www.doctorofcredit.com/wells-fargo-400-825-business-checking-bonus/",
    ],
    raw_excerpt: "Wells Fargo Business $400/$825. $2,500 ending balance days 30 and 60.",
  },
  {
    id: "bmo-biz-savings-1000",
    expired: true,
    bank_name: "BMO Business",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [{ min_deposit: 4000, bonus_amount: 400 }, { min_deposit: 25000, bonus_amount: 750 }, { min_deposit: 50000, bonus_amount: 1000 }],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "Business Checking. Deposit in 30 days, maintain 90 days." },
    source_links: ["https://www.bmo.com/en-us/main/business/checking-accounts/"],
    raw_excerpt: "BMO Business $400/$750/$1,000. Tiered by deposit. 90-day hold.",
  },
  {
    id: "citi-biz-savings-2000",
    bank_name: "Citi Business",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 45,
    maintenance_days: 60,
    total_hold_days: 90,
    tiers: [{ min_deposit: 5000, bonus_amount: 300 }, { min_deposit: 20000, bonus_amount: 500 }, { min_deposit: 50000, bonus_amount: 1000 }, { min_deposit: 100000, bonus_amount: 1500 }, { min_deposit: 200000, bonus_amount: 2000 }],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: true, states_allowed: ["CA","FL","IL","MD","NV","NY","DC"], lifetime_language: false, eligibility_notes: "Citi Business Checking. Deposit in 45 days, maintain 45 days. 7 states." },
    source_links: ["https://banking.citi.com/cbol/small-business/checking-offer/",
      "https://www.doctorofcredit.com/ymmv-in-branch-citibank-business-up-to-2000-checking-bonus/"
    ],
    raw_excerpt: "Citi Business $300-$2,000. 5 tiers up to $200k. 7 states only.",
  },
  {
    id: "huntington-biz-savings-1000",
    bank_name: "Huntington Business",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 60,
    maintenance_days: 60,
    total_hold_days: 120,
    tiers: [{ min_deposit: 2000, bonus_amount: 200 }, { min_deposit: 10000, bonus_amount: 400 }, { min_deposit: 20000, bonus_amount: 1000 }],
    cooldown_months: 24,
    fees: { monthly_fee: 40, early_closure_fee: 0 },
    eligibility: { state_restricted: true, states_allowed: ["OH","MI","IN","PA","KY","WV","IL","CO","MN","SC","WI","NC","TX"], lifetime_language: false, eligibility_notes: "Unlimited Plus Business Checking. $20k deposit in 60 days." },
    source_links: ["https://www.huntington.com/business-banking-promotions-offers",
      "https://www.doctorofcredit.com/oh-mi-pa-ky-wv-il-wi-huntington-bank-500-750-business-checking-bonuses/"
    ],
    raw_excerpt: "Huntington Business $400 ($5k deposit, Unlimited Business Checking) or $1,000 ($20k deposit, Unlimited Plus Business Checking). Apply by June 16, 2026. 13 states.",
  },
  {
    id: "mt-bank-biz-savings-1500",
    bank_name: "M&T Bank Business",
    product_type: "savings",
    business: true,
    base_apy: 0,
    funding_window_days: 90,
    maintenance_days: 30,
    total_hold_days: 90,
    tiers: [{ min_deposit: 5000, bonus_amount: 300 }, { min_deposit: 15000, bonus_amount: 500 }, { min_deposit: 30000, bonus_amount: 750 }, { min_deposit: 100000, bonus_amount: 1500 }],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: true, states_allowed: ["CT","DC","DE","MA","MD","NJ","NY","PA","VA","WV"], lifetime_language: false, eligibility_notes: "Tailored Business Checking. Balance-based tiers in 3rd month." },
    source_links: ["https://campaigns.mtb.com/bizbonus",
      "https://www.doctorofcredit.com/ct-de-d-c-md-nj-ny-pa-va-wv-in-branch-mt-bank-400-business-checking-bonus/"
    ],
    raw_excerpt: "M&T Business $300-$1,500. 4 tiers. Balance in 3rd month. 9 states.",
  },
  {
    id: "bluevine-biz-savings-500",
    expired: true,
    bank_name: "BlueVine Business",
    product_type: "savings",
    business: true,
    base_apy: 0.02,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 90,
    tiers: [{ min_deposit: 5000, bonus_amount: 500 }],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "BlueVine Business Checking. $5k deposit. 2% APY on balances." },
    source_links: ["https://www.bluevine.com/checking/"],
    raw_excerpt: "BlueVine Business $500. $5k deposit. 2% APY. Nationwide.",
  },
  {
    id: "chase-total-checking-900-tiered-2026",
    bank_name: "Chase",
    product_type: "savings",
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 90,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 5000, bonus_amount: 450 },
      { min_deposit: 10000, bonus_amount: 600 },
      { min_deposit: 15000, bonus_amount: 900 },
    ],
    cooldown_months: 24,
    fees: { monthly_fee: 15, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Available to Hawaii residents (Chase personal checking/savings bonuses are obtainable in HI). New Chase Total Checking account via coupon EK42726. Not eligible if existing Chase checking customer, closed a Chase checking account within 90 days, or closed with negative balance within 3 years. One opening-related bonus per 24 months. Plus one qualifying direct deposit required within 90 days (payroll/pension/government benefits via ACH, RTP, FedNow, or debit network — Zelle/checks/wires/P2P do not count). Monthly fee waivable with $500+ DD, $1,500+ daily balance, or $5,000+ avg daily balance.",
    },
    source_links: [
      "https://account.chase.com/consumer/banking/EK42726?jp_cmp=rb/xlob/int/dmlp900tiered/na",
      "https://www.doctorofcredit.com/chase-900-checking-bonus/",
    ],
    raw_excerpt: "Tiered Chase Total Checking bonus: $450 ($5k–$10k new money), $600 ($10k–$15k), $900 ($15k+). 30-day deposit window, 90-day balance hold, plus one qualifying direct deposit. Offer expires 07/15/2026.",
    notes: "Functionally a savings-style bonus on a checking account — the $15K new-money hold dominates the work; the DD requirement is incidental.",
  },
  {
    id: "adelfi-cu-100-savings-2026",
    bank_name: "AdelFi Credit Union",
    product_type: "savings",
    base_apy: 0,
    funding_window_days: 30,
    maintenance_days: 30,
    total_hold_days: 60,
    tiers: [{ min_deposit: 5000, bonus_amount: 100 }],
    cooldown_months: 24,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (via Christian membership)"],
      lifetime_language: false,
      eligibility_notes: "AdelFi is a faith-based credit union — membership restricted to Christians of various denominations. Harvest Savings $100 bonus requires maintaining $5,000+ balance for 30 days from opening. New members only (no AdelFi history in last 24 months). Bonus posts ~30 days after eligibility confirmed. Pair with the Harvest Checking $100 bonus for $200 combined. Expires 07/31/2026.",
    },
    source_links: [
      "https://www.adelfibanking.com/",
      "https://www.hustlermoneyblog.com/adelfi-credit-union-promotions/",
    ],
    raw_excerpt: "AdelFi Harvest Savings $100 — maintain $5,000+ for 30 days. Faith-based membership required. Expires 07/31/2026.",
  },
  {
    id: "rho-1000-business-checking-2026",
    bank_name: "Rho",
    product_type: "savings",
    base_apy: 0,
    funding_window_days: 90,
    maintenance_days: 30,
    total_hold_days: 120,
    tiers: [
      { min_deposit: 10000, bonus_amount: 250 },
      { min_deposit: 20000, bonus_amount: 500 },
      { min_deposit: 100000, bonus_amount: 1000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    business: true,
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Rho business checking. Real business required — sole proprietorships explicitly excluded; LLC is the minimum entity type. Tiered: $10k held 90d → $250, $20k held 30 consecutive days within the 90-day window → $500, $100k held 30 consecutive days → $1,000. Articles of incorporation upload required during onboarding. New customers only. Bonus posts 30 days after qualification.",
    },
    source_links: [
      "https://www.rho.co/",
      "https://www.profitablecontent.com/rho-1000-business-checking-bonus/",
    ],
    raw_excerpt: "Rho business checking tiered bonus: $250 ($10k), $500 ($20k), $1,000 ($100k). 90-day window, 30-day hold. LLC+ only (no sole prop). Nationwide.",
    notes: "Sole-prop excluded — this restricts most solo bank-bonus chasers from claiming.",
  },

  {
    "id": "centier-bank-high-yield-savings-2026",
    "bank_name": "Centier Bank",
    "product_type": "savings",
    "base_apy": 0.039,
    "funding_window_days": 14,
    "maintenance_days": 90,
    "total_hold_days": 104,
    "tiers": [
      {
        "min_deposit": 10000,
        "bonus_amount": 60
      },
      {
        "min_deposit": 25000,
        "bonus_amount": 150
      },
      {
        "min_deposit": 50000,
        "bonus_amount": 300
      },
      {
        "min_deposit": 100000,
        "bonus_amount": 600
      },
      {
        "min_deposit": 200000,
        "bonus_amount": 1200
      }
    ],
    "cooldown_months": null,
    "fees": {
      "monthly_fee": 0,
      "early_closure_fee": 0
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": [],
      "lifetime_language": true,
      "eligibility_notes": "New customers only. Offer valid for deposits made between June 1-30, 2026 using promo code SUMMER26. Powered by Raisin platform."
    },
    "source_links": [
      "https://www.hustlermoneyblog.com/centier-bank-high-yield-savings-review/"
    ],
    "raw_excerpt": "Centier Bank offers up to $1200 bonus (includes optional $200 recurring deposit boost) on tiered deposits from $10k-$200k+, maintained for 90 days, with 3.90% APY. Promo code SUMMER26 required by 6/30/26.",
    "notes": "Bonus structure includes base bonus plus optional recurring deposit bonus. For max tier ($200k+): $1000 base + $200 recurring bonus = $1200 total. Recurring deposits must be set up within 14 days and execute at least 2 times within 90 days. Bonus posts within 30 days after 90-day hold period. Operated through Raisin platform."
  }
,
  {
    "id": "etrade-premium-savings-400-2026",
    "bank_name": "E*TRADE",
    "product_type": "savings",
    "base_apy": 0.04,
    "funding_window_days": 30,
    "maintenance_days": 45,
    "total_hold_days": 75,
    "tiers": [
      {
        "min_deposit": 20000,
        "bonus_amount": 400
      }
    ],
    "cooldown_months": null,
    "fees": {
      "monthly_fee": 0,
      "early_closure_fee": 0
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": [],
      "lifetime_language": true,
      "eligibility_notes": "Customer limited to lifetime maximum of two new Premium Savings Account cash bonus offers. May only be enrolled in one PSA cash bonus offer at a time. Promo code SAVING26 required."
    },
    "source_links": [
      "https://us.etrade.com/promo/savings",
      "https://www.doctorofcredit.com/etrade-250-savings-bonus-requires-20k-deposit-4-intro-rate/",
      "https://www.profitablecontent.com/etrade-250-savings-bonus/"
    ],
    "raw_excerpt": "E*TRADE Premium Savings Account offers $400 bonus for depositing $20k within 30 days and maintaining balance for 45 additional days. Account also earns 4% APY for 6 months.",
    "brokerage": true,
    "notes": "Requires promo code SAVING26. Valid through 9/30/26. Bonus posts within 30 days of completion."
  }
]
