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
      eligibility_notes: "New Chase savings customers only. Not available if you closed a Chase savings account in the last 90 days or with a negative balance in the last 3 years. One savings bonus every 2 years. Combo bonus ($400) requires also completing checking direct deposit requirement."
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
      eligibility_notes: "Cash account (brokerage cash sweep). SIPC protected, not FDIC insured. New customers."
    },
    source_links: ["https://www.moomoo.com/",
      "https://www.doctorofcredit.com/moomoo-8-1-apy-savings-account-rate-for-first-3-months/"
    ],
    raw_excerpt: "Moomoo $200-$1,000 cash account bonus. 4.1% APY. 60-day hold. SIPC protected.",
    notes: "Bonus paid in NVDA stock (can be sold immediately). SIPC protected, not FDIC insured. Hold: 60d for lower tiers, 120d for k, 180d for k."
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
    bank_name: "E*TRADE (Brokerage)",
    product_type: "savings",
    base_apy: 0.035,
    funding_window_days: 60,
    maintenance_days: 365,
    total_hold_days: 365,
    tiers: [
      { min_deposit: 1000, bonus_amount: 50 },
      { min_deposit: 10000, bonus_amount: 150 },
      { min_deposit: 50000, bonus_amount: 500 },
      { min_deposit: 100000, bonus_amount: 1000 },
      { min_deposit: 250000, bonus_amount: 2500 },
      { min_deposit: 500000, bonus_amount: 5000 },
      { min_deposit: 1000000, bonus_amount: 6500 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "Brokerage or IRA. 12-month hold. Funds must be net new to E*TRADE."
    },
    source_links: ["https://us.etrade.com/promo/brokerage",
      "https://www.doctorofcredit.com/etrade-up-to-3500-brokerage-referral-bonus-25000-1000000-required/"
    ],
    raw_excerpt: "E*TRADE up to $6,500 brokerage bonus. 12-month hold. Tiered from $1k-$1M deposits.",
    notes: "Brokerage account. 12-month hold is long but tiers start at just $1,000."
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
    notes: "Brokerage account. No cash APY — funds must be invested or held as cash in brokerage."
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
      { min_deposit: 1000, bonus_amount: 150 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: true,
      eligibility_notes: "New SoFi Invest customers. $1,000 deposit. Available via Finder portal."
    },
    source_links: ["https://www.sofi.com/invest/",
      "https://www.doctorofcredit.com/sofi-invest-150-bonus-via-finder/"
    ],
    raw_excerpt: "SoFi Invest $150 bonus for $1,000 deposit. 30-day hold. Quick and easy.",
    notes: "Brokerage account. Very low barrier — $1,000 for $150 is 15% return in 30 days."
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
    eligibility: { state_restricted: false, states_allowed: ["Nationwide (U.S.)"], lifetime_language: false, eligibility_notes: "Business Complete Checking. Deposit + 5 transactions in 90 days." },
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
    source_links: ["https://accountoffers.wellsfargo.com/businesscheckingb",
      "https://www.doctorofcredit.com/wells-fargo-400-825-business-checking-bonus/"
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
      eligibility_notes: "New Chase Total Checking account via coupon EK42726. Not eligible if existing Chase checking customer, closed a Chase checking account within 90 days, or closed with negative balance within 3 years. One opening-related bonus per 24 months. Plus one qualifying direct deposit required within 90 days (payroll/pension/government benefits via ACH, RTP, FedNow, or debit network — Zelle/checks/wires/P2P do not count). Monthly fee waivable with $500+ DD, $1,500+ daily balance, or $5,000+ avg daily balance.",
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
]
