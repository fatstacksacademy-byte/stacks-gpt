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
      eligibility_notes: "New 360 Performance Savings customers only. External funds required. Ineligible if you held eligible Capital One savings accounts on or after Jan 1, 2022. Use promo code BONUS1500."
    },
    source_links: [
      "https://www.capitalone.com/bank/bonus1500/"
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
    ],
    raw_excerpt: "Open Ally Online Savings via referral link, set up automated recurring transfer ($20/mo minimum), complete 3 consecutive months. Bonus posts after requirements met.",
    notes: "Extremely easy $100. No large deposit required. Set $20/mo recurring and forget it."
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
    notes: "Weak standalone — long 182-day lockup with low blended APY. Only worth doing if stacked with the Blue Foundry checking bonus."
  },
  {
    id: "citi-savings-2026",
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
      eligibility_notes: "Open savings within 45 days of checking. Fund within 10 business days. Maintain for 90 days."
    },
    source_links: ["https://banking.citi.com/cbol/OM/checking/choice/featured-offers/default.htm"],
    raw_excerpt: "Citi savings bonus $750 for $30k or $1,500 for $200k. 4.35% APY. Fund within 10 business days, maintain 90 days.",
  },
  {
    id: "wells-fargo-platinum-savings-2026",
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
    source_links: ["https://www.td.com/us/en/personal-banking/savings-accounts/"],
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
    source_links: ["https://www.wintrust.com/solutions-and-services/community-banking/total-access-checking.html"],
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
      { min_deposit: 10000, bonus_amount: 350 },
      { min_deposit: 25000, bonus_amount: 700 },
      { min_deposit: 100000, bonus_amount: 1500 },
      { min_deposit: 250000, bonus_amount: 3500 },
      { min_deposit: 500000, bonus_amount: 7000 },
    ],
    cooldown_months: null,
    fees: { monthly_fee: 0, early_closure_fee: 0 },
    eligibility: {
      state_restricted: false,
      states_allowed: ["Nationwide (U.S.)"],
      lifetime_language: false,
      eligibility_notes: "HSBC Premier Savings. May require HSBC Premier relationship ($75k+ in deposits/investments or mortgage)."
    },
    source_links: ["https://www.us.hsbc.com/savings-accounts/"],
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
      { min_deposit: 20000, bonus_amount: 200 },
      { min_deposit: 50000, bonus_amount: 500 },
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
    source_links: ["https://www.moomoo.com/"],
    raw_excerpt: "Moomoo $200-$1,000 cash account bonus. 4.1% APY. 60-day hold. SIPC protected.",
    notes: "This is a brokerage cash sweep, not a traditional savings account. SIPC protected, not FDIC insured."
  },
  {
    id: "cit-bank-savings-300-2026",
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
      { min_deposit: 10000, bonus_amount: 100 },
      { min_deposit: 50000, bonus_amount: 500 },
      { min_deposit: 100000, bonus_amount: 1000 },
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
    source_links: ["https://www.raisin.com/"],
    raw_excerpt: "Raisin up to $1,500 savings bonus. 4.3% APY. Tiered: $100/$500/$1,000/$1,500. Stackable with TopCashback.",
    notes: "Stackable with TopCashback for additional cashback on deposit."
  },
]
