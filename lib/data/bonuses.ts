export const bonuses: any[] = [
  {
    "id": "psecu-300-checking-2026",
    "bank_name": "PSECU (Pennsylvania State Employees Credit Union)",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 2,
      "deposit_window_days": 100,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open a new checking account with debit card, use promo code 2026REFER or 2026PROMO, and enroll/login to digital banking."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "Free Checking has no monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems inquiry required; cannot apply with Chex frozen. Soft pull on Experian is reported, and Experian must be unfrozen."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (via PA Consumer Council or PRPS membership)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Must be 18+, U.S. citizen or permanent resident in the U.S., and one bonus per tax ID. New language dated 2026-01-02 says prior PSECU new-member incentive recipients are ineligible."
    },
    "timeline": {
      "bonus_posting_days_est": 145,
      "must_remain_open_days": null
    },
   "source_links": [
  "https://go.psecu.com/refer?extole_share_channel=%5C%22SHARE_LINK%5C%22&extole_shareable_code=Clayton4",
  "https://paconsumercouncil.org/",
  "https://prps.org/join-now",
  "https://refer.psecu.com/Clayton4",
  "https://www.doctorofcredit.com/pa-only-psecu-100-250-checking-bonus/",
  "https://www.profitablecontent.com/psecu-300-checking-bonus/"
],
    "raw_excerpt": "Two payroll direct deposits of $500+ each within 100 days; bonus within 145 days.",
    "missing_fields": [
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "capital-one-360-checking-300-offer300",
    "bank_name": "Capital One",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": 36,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 2,
      "deposit_window_days": 75,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open a new 360 Checking account with promo code OFFER300 and complete requirements within 75 days."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee and no minimum balance requirement.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Capital One primarily uses Early Warning Services (EWS); generally less ChexSystems-sensitive."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Ineligible if you have or had an open Capital One 360 Checking/Simply Checking/Total Control Checking/Money Teen Checking on or after 2023-01-01."
    },
    "timeline": {
      "bonus_posting_days_est": 135,
      "must_remain_open_days": 135
    },
    "source_links": [
      "https://i.capitalone.com/GRErGO2HT",
      "https://www.capitalone.com/bank/offer300/",
      "https://www.doctorofcredit.com/capital-one-300-checking-bonus/",
      "https://www.profitablecontent.com/capital-one-350-checking-bonus/"
    ],
    "raw_excerpt": "Open with OFFER300, get two $500+ direct deposits in 75 days, bonus within 60 days after second deposit.",
    "missing_fields": [
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required"
    ]
  },
  {
    "id": "varo-money-100-referral-dd",
    "bank_name": "Varo Bank",
    "product_type": "checking",
    "bonus_amount": 150,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": null,
      "deposit_window_days": 45,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Must open via referral link (no public signup) and keep account in good standing when bonus posts."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "No known Chex pull; soft pull only."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Must never have been a Varo customer, including legacy Varo Money, Inc."
    },
    "timeline": {
      "bonus_posting_days_est": null,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.varomoney.com/r1/?r=Nathaniel2908",
      "https://www.doctorofcredit.com/varo-money-online-bank-account-75-sign-up-bonus-ios-android-sharing-referrals-still-a-nono/",
      "https://www.varomoney.com/"
    ],
    "raw_excerpt": "Use referral link, open new Varo account, and receive $500+ qualifying direct deposit within 45 days.",
    "missing_fields": [
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.bonus_posting_days_est",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "bank-of-america-500-tiered-checking-2026",
    "bank_name": "Bank of America",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 100, "min_dd_total": 2000 },
      { "bonus": 300, "min_dd_total": 5000 },
      { "bonus": 500, "min_dd_total": 10000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 10000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered offer: $100 at $2,000 DD, $300 at $5,000 DD, $500 at $10,000+ DD in 90 days; open eligible checking online with promo code by 2026-05-31."
    },
    "fees": {
      "monthly_fee": 4.95,
      "monthly_fee_waiver_text": "Advantage SafeBalance is $4.95/month and can be waived (under 25, $500 daily balance, or Preferred Rewards). Other eligible account types may have $12 or $25 monthly fees.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": null,
      "soft_pull": true,
      "screening_notes": "Soft pull reported when overdraft protection is declined; Chex pull reports are mixed."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Must not have had a BofA personal checking account in the past 12 months; one bonus per customer every 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 150,
      "must_remain_open_days": 150
    },
    "source_links": [
      "https://promotions.bankofamerica.com/en/offers/chooseyourchecking500tiered",
      "https://www.doctorofcredit.com/bank-of-america-100-500-checking-bonus/",
      "https://www.doctorofcredit.com/knowledge-base/list-methods-banks-count-direct-deposits/"
    ],
    "raw_excerpt": "Up to $500 with qualifying direct deposits within 90 days; bonus within 60 days after qualification period.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "fees.early_closure_fee",
      "screening.hard_pull"
    ]
  },
  {
    "id": "316-financial-100-checking-relevant2026",
    "bank_name": "316 Financial (Primis Bank division)",
    "product_type": "checking",
    "bonus_amount": 100,
    "expired": true,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": 1,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open by 2026-03-31 with promo code RELEVANT2026 and complete $1,000+ direct deposits by 2026-04-15."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems inquiry reported as soft pull; approvals reported with high Chex inquiry counts."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "One bonus per customer; closing and reopening an account does not qualify for another bonus."
    },
    "timeline": {
      "bonus_posting_days_est": 30,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://bank316.com/relevant2026",
      "https://www.doctorofcredit.com/316-financial-100-checking-bonus/"
    ],
    "raw_excerpt": "Open by March 31, 2026, complete $1,000+ DD by April 15, and bonus posts 30 days after completion.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.deposit_window_days",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "pnc-400-virtual-wallet-performance-select-2026",
    "bank_name": "PNC Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": 24,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 5000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 100,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "For $400 tier, open Virtual Wallet with Performance Select; account must remain open to receive reward."
    },
    "fees": {
      "monthly_fee": 25,
      "monthly_fee_waiver_text": "Performance Select is $25/month, waivable with $5,000 combined average balances or $5,000+ monthly direct deposits. Standard Virtual Wallet tier is $7/month.",
      "early_closure_fee": 25
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull reported; inquiry sensitivity not clearly defined."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": null,
      "states_excluded": null,
      "lifetime_language": false,
      "eligibility_notes": "Limited to PNC footprint states; must not have PNC consumer checking, must not have received PNC promotional premium in past 24 months, and must not have closed PNC account recently (90 days noted; some sources cite 12 months)."
    },
    "timeline": {
      "bonus_posting_days_est": 150,
      "must_remain_open_days": 150
    },
    "source_links": [
      "https://www.pnc.com/en/personal-banking/banking/checking/campaigns/checking-offer-for-PNC-customers.html",
      "https://www.doctorofcredit.com/pnc-up-to-250-400-checking-bonus/"
    ],
    "raw_excerpt": "For $400 tier: $5,000+ qualifying direct deposits in first 60 days; bonus 60–90 days after qualification.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "eligibility.states_allowed",
      "eligibility.states_excluded"
    ]
  },
  {
    "id": "chase-total-checking-400-2026",
    "bank_name": "Chase",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": 24,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open a new Chase Total Checking account and make direct deposits totaling $1,000+ within 90 days of coupon enrollment. Offer expires 04/15/2026."
    },
    "fees": {
      "monthly_fee": 15,
      "monthly_fee_waiver_text": "$500+ qualifying electronic deposits, OR $1,500+ daily balance, OR $5,000+ average daily balance, OR linked qualifying checking account.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull/EWS reported. Not available to existing Chase checking customers, those closed within 90 days, or closed with negative balance within 3 years. One bonus per account every two years from last coupon enrollment."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Payroll, pension, or government benefits via ACH, RTP, FedNow, or Visa/Mastercard debit network qualify. Zelle, cash, checks, wire transfers, and interest do not. Micro-deposits do not qualify."
    },
    "timeline": {
      "bonus_posting_days_est": 15,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://accounts.chase.com/consumer/raf/online/rafoffers?key=2492624790&src=N"
    ],
    "raw_excerpt": "Open Chase Total Checking, make $1,000+ direct deposits within 90 days, bonus posts within 15 days. Offer expires 04/15/2026.",
    "missing_fields": []
  },
  {
    "id": "wells-fargo-400-everyday-checking-2026",
    "bank_name": "Wells Fargo",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open new Everyday Checking with offer code by 2026-02-24 and receive $1,000+ qualifying electronic deposits within 90 days."
    },
    "fees": {
      "monthly_fee": 15,
      "monthly_fee_waiver_text": "Waive with $1,500 daily balance, $5,000 combined balances, $500+ qualifying electronic deposits, age-based waiver, or qualifying military direct deposit.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull (or no pull) datapoints reported; Chex sensitivity appears low/mixed."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Primary owner only; must be new Wells Fargo checking customer and must not have received Wells Fargo consumer checking bonus in the past 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": 120
    },
    "source_links": [
      "https://accountoffers.wellsfargo.com/welcomebonus/",
      "https://www.doctorofcredit.com/wells-fargo-325-checking-bonus-available-online/"
    ],
    "raw_excerpt": "Receive $1,000+ qualifying deposits in 90 days; bonus posts within 30 days after the 90-day period.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required"
    ]
  },
  {
    "id": "bmo-400-checking-2026",
    "bank_name": "BMO",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 200, "min_dd_total": 2000 },
      { "bonus": 400, "min_dd_total": 4000 },
      { "bonus": 600, "min_dd_total": 8000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 8000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 25,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $200 for $2,000+ DD, $400 for $4,000+ DD, $600 for $8,000+ DD within 90 days of account opening. Open by 2026-05-04, keep account in good standing with balance > 0 when paid."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "Smart Advantage Checking has $0 monthly fee. Smart Money is $5/month (under 25 waived) and Relationship is $25/month.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": null,
      "hard_pull": null,
      "soft_pull": null,
      "screening_notes": "Chex/EWS pull type and sensitivity are not clearly stated in the provided text."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Cannot have existing BMO personal checking or have closed one in the past 12 months; one bonus per customer/account."
    },
    "timeline": {
      "bonus_posting_days_est": 100,
      "must_remain_open_days": 100
    },
    "source_links": [
      "https://www.bmo.com/en-us/main/personal/checking-accounts/digital-offer/",
      "https://www.doctorofcredit.com/il-wi-mn-in-az-fl-ks-mo-bmo-harris-350-checking-300-savings-bonus/"
    ],
    "raw_excerpt": "Cumulative $4,000 qualifying direct deposits within 90 days; bonus posts about 100 days after account opening.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "screening.chex_sensitive",
      "screening.hard_pull",
      "screening.soft_pull"
    ]
  },
  {
    "id": "affinity-fcu-100-checking-referral",
    "bank_name": "Affinity Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 100,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 5,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open eligible checking via referral and as a new member open a $5 Membership Eligibility Account; qualifying recurring direct deposits totaling $500+ in a calendar month within 60 days."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "$0 with eStatements; otherwise $2/month paper statement fee (with listed waivers).",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "high",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Reported sensitive online; in-branch may be less sensitive. Denials reported for Chex/LexisNexis authentication issues."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (via membership eligibility or one-time donation path)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Must be 18+, new member, and cannot have closed Affinity membership within the last 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 30,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://share.affinityfcu.org/booth.nathaniel!d1cb207631!a",
      "https://www.doctorofcredit.com/affinity-federal-credit-union-100-referral-bonus/"
    ],
    "raw_excerpt": "Recurring direct deposits totaling $500+ in a calendar month within 60 days; bonus by end of following month.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "figfcu-250-high-yield-checking-ghycheck",
    "bank_name": "Farmers Insurance Federal Credit Union (FIGFCU)",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 15000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 3,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 20,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Use promo code GHYCHECK; open High Yield Checking within 10 days of joining CU. $100 tier is 3+ ACH direct deposits totaling $3,000-$14,999."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "$0 with eStatements; $2/month paper statement fee if not enrolled; $5/month inactivity fee may apply.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems pull reported as soft; both approvals and denials are reported."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (via American Consumer Council or other qualifying membership paths)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Not available to current or past members of the credit union; must be 18+."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://figfcu.org/high-yield-checking-google-search?utm_source=google&utm_medium=cpc&utm_campaign=high_yield_checking&utm_id=ddep&utm_content=high_yield_checking_july_2024&utm_keyword=bank%20deposit%20bonus&gad_source=1&gclid=Cj0KCQjwrKu2BhDkARIsAD7GBov2LxYZ_mBgdiNkPyMWuxX3TyXlp0Zaqd8KbpMlIfzaGrKDYDI8stQaAgtBEALw_wcB",
      "https://www.doctorofcredit.com/farmers-insurance-federal-credit-union-figfcu-250-checking-bonus/"
    ],
    "raw_excerpt": "For $250 tier: 3+ separate ACH direct deposits totaling $15,000+ in first 90 days.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "keypoint-cu-300-money4me-nm26",
    "bank_name": "KeyPoint Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": 24,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": 1000,
      "dd_count_required": 6,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 10,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Money4Me (public code NM26) and complete recurring qualified direct deposits for 6 consecutive qualifying months; payout is $50 per qualifying month."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee; $2 paper statement fee.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "high",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull reported but heavy Chex sensitivity and potential manual inquiry explanations."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (via Financial Fitness Association membership)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Cannot have had a KeyPoint account in past 24 months; must be 18+; cannot stack promos."
    },
    "timeline": {
      "bonus_posting_days_est": null,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://kpcu.com/Checking/Money4Me",
      "https://kpcu.com/About/Events/Refer-a-Friend",
      "https://www.doctorofcredit.com/ca-only-keypoint-credit-union-200-checking-bonus/",
      "https://www.profitablecontent.com/key-point-cu-300-checking-bonus-2/"
    ],
    "raw_excerpt": "Recurring $1,000 qualified direct deposit, first DD within 60 days, and 6 consecutive qualifying months for $50 x 6.",
    "missing_fields": [
      "requirements.min_direct_deposit_total",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "fees.early_closure_fee",
      "timeline.bonus_posting_days_est",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "etrade-max-rate-checking-300-checking25",
    "bank_name": "E*TRADE (Morgan Stanley Private Bank)",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 3000,
      "min_direct_deposit_per_deposit": 1500,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 0,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Use promo code CHECKING25, fund within 30 days, and receive at least two qualifying direct deposits of $1,500+ each within 90 days."
    },
    "fees": {
      "monthly_fee": 15,
      "monthly_fee_waiver_text": "$15 monthly fee waived with $5,000 average monthly balance.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": null,
      "soft_pull": null,
      "screening_notes": "Historically Chex inquiry is reported; pull type (hard/soft) not explicitly stated."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S. residents)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Cannot have had E*TRADE Checking or Max-Rate Checking in past 12 months; one checking promo at a time."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": 120
    },
    "source_links": [
      "https://us.etrade.com/bank/max-rate-checking",
      "https://www.doctorofcredit.com/etrade-300-checking-bonus/"
    ],
    "raw_excerpt": "Two $1,500+ qualifying direct deposits within 90 days; bonus expected around day 120 from opening.",
    "missing_fields": [
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "fees.early_closure_fee",
      "screening.hard_pull",
      "screening.soft_pull"
    ]
  },
  {
    "id": "teachers-fcu-300-checking-smart26",
    "bank_name": "Teachers Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": 1000,
      "dd_count_required": 6,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": 1,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open eligible checking with SMART26, enroll in online banking/eStatements, and meet $1,000+ qualifying direct deposit each monthly statement cycle for 6 consecutive evaluation periods (must begin before second period)."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee stated.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull is widely reported; institution is strict on direct-deposit coding and may request payroll proof."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (reported)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New members only; must not have had prior Teachers membership; one per primary member."
    },
    "timeline": {
      "bonus_posting_days_est": 30,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.teachersfcu.org/new-member-offer",
      "https://www.doctorofcredit.com/teachers-federal-credit-union-300-checking-bonus/"
    ],
    "raw_excerpt": "$50 per qualifying month for up to 6 months; paid within 30 days after each qualifying evaluation period.",
    "missing_fields": [
      "requirements.min_direct_deposit_total",
      "requirements.deposit_window_days",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "fees.early_closure_fee",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "chime-100-referral-checking",
    "bank_name": "Chime",
    "product_type": "checking",
    "bonus_amount": 100,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 200,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Referral flow requires opening via referral link, receiving $200+ qualifying direct deposit, and activating physical debit card within 14 days of DD. Portal stack offers are variable."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee and no minimum balance requirement.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "No known Chex pull; fintech-style soft screening."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New users only for referee bonus; referee referral bonus is one-time."
    },
    "timeline": {
      "bonus_posting_days_est": 0,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.chime.com/r/nathanielbooth10/",
      "https://www.swagbucks.com/",
      "https://www.topcashback.com/",
      "https://www.inboxdollars.com/",
      "https://www.mypoints.com/",
      "https://www.rakuten.com/"
    ],
    "raw_excerpt": "Referral bonus posts instantly after qualifying DD and card activation; portal payouts are separate and variable.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.deposit_window_days",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "sofi-checking-savings-300-dd-2026",
    "bank_name": "SoFi",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 50, "min_dd_total": 1000 },
      { "bonus": 400, "min_dd_total": 5000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 5000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 25,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "First qualifying direct deposit must post by 2026-12-31. Tiered bonus: $50 for $1,000-$4,999 total DD, $400 for $5,000+ total DD within the 25-day evaluation window."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull only; no ChexSystems inquiry reported."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "One direct-deposit bonus per SSN lifetime; new SoFi Checking & Savings users (and some existing users without prior DD setup) may qualify."
    },
    "timeline": {
      "bonus_posting_days_est": 7,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.sofi.com/banking/",
      "https://www.doctorofcredit.com/sofi-checking-5000-direct-deposit-required/",
      "https://www.swagbucks.com/",
      "https://www.topcashback.com/",
      "https://www.inboxdollars.com/",
      "https://www.mypoints.com/",
      "https://www.rakuten.com/"
    ],
    "raw_excerpt": "Max tier is $300 for $5,000+ qualifying DD total in a 25-day window; bonus posts within 7 business days after evaluation.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "citi-regular-checking-325-edd-2026",
    "bank_name": "Citi",
    "product_type": "checking",
    "bonus_amount": 325,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 3000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Complete at least 2 Enhanced Direct Deposits (EDD) totaling $3,000-$5,999 within 90 days of account opening. Zelle incoming and P2P ACH transfers via Venmo or PayPal explicitly qualify as EDD."
    },
    "fees": {
      "monthly_fee": null,
      "monthly_fee_waiver_text": null,
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Zelle incoming and P2P ACH (Venmo, PayPal) explicitly qualify as EDD — more flexible than most banks. Instant transfers do not qualify. Wire transfers, cash, checks, and Citi-to-Citi transfers do not count."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "New Citi checking customers only. Must be US citizen or resident alien, 18+, with US physical address."
    },
    "timeline": {
      "bonus_posting_days_est": 105,
      "must_remain_open_days": 120
    },
    "source_links": [
      "https://banking.citi.com/cbol/OM/checking/choice/featured-offers/default.htm?BT_TX=1&ProspectID=CF66AD0E62054EAA9D2E755859D1CC20"
    ],
    "raw_excerpt": "Complete 2 Enhanced Direct Deposits totaling $3,000-$5,999 within 90 days. Bonus posts between day 90 and 120 after account opening.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required"
    ]
  },
  {
    "id": "us-bank-smartly-checking-450-2026",
    "bank_name": "U.S. Bank",
    "product_type": "checking",
    "bonus_amount": 450,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 250, "min_dd_total": 2000 },
      { "bonus": 350, "min_dd_total": 5000 },
      { "bonus": 450, "min_dd_total": 8000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 8000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 25,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $250 for $2,000-$4,999 DD, $350 for $5,000-$7,999 DD, $450 for $8,000+ DD. Must complete 2+ direct deposits within 90 days, enroll in mobile/online banking within 90 days, and fund account with $25 within 30 days. Apply by 04/06/2026."
    },
    "fees": {
      "monthly_fee": 12,
      "monthly_fee_waiver_text": "Waived first 2 statement periods. Then waive with $1,500+ combined monthly direct deposits, $1,500+ average balance, U.S. Bank Smartly Visa Signature Card, eligible small business checking account, or Smart Rewards Gold tier+. Also waived for military, ages 13-24, and 65+.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ACH payroll and government benefits qualify as direct deposit. P2P payments and other electronic deposits explicitly do not qualify — stricter than most banks."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Must not have existing US Bank consumer checking, had one in the last 12 months, or received a US Bank checking bonus in the past 12 months. Not available with Trust Accounts or Alliance partnerships."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": 120
    },
   "source_links": [
  "https://www.usbank.com/splash/checking/2026-all-market-checking-offer.html"
],
    "raw_excerpt": "Open by 04/06/2026, fund with $25 within 30 days, complete 2+ direct deposits totaling $8,000+ within 90 days for $450 bonus. Posts within 30 days of completing requirements.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.holding_period_days",
      "requirements.min_balance",
      "requirements.debit_transactions_required",
      "requirements.billpay_required",
      "screening.hard_pull"
    ]
  },
  {
    "id": "bcu-500-powerplus-checking-2026",
    "bank_name": "BCU (Baxter Credit Union)",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 3000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 30,
      "billpay_required": null,
      "other_requirements_text": "Open PowerPlus Checking with promo code BOOST by 5/15/2026. Complete $3,000+ in direct deposits AND 30 qualifying transactions within 60 days. Qualifying transactions include debit/credit card purchases, bill pay, ACH, Zelle, and check payments. Must be a new BCU member."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": null,
      "hard_pull": null,
      "soft_pull": null,
      "screening_notes": "Credit union membership required; screening details not confirmed."
    },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Must be a new BCU member. Membership requires meeting at least one criterion: employment-based, community-based, family-based, or Life. Money. You. subscriber. One bonus per membership."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.bcu.org/resources/bd-event/boost",
      "https://www.doctorofcredit.com/bcu-500-checking-bonus/"
    ],
    "raw_excerpt": "Open PowerPlus Checking with code BOOST by 5/15/2026, complete $3,000 DD and 30 transactions in 60 days. Bonus posts by 7/31/2026.",
    "missing_fields": [
      "requirements.min_direct_deposit_per_deposit",
      "requirements.dd_count_required",
      "requirements.holding_period_days",
      "requirements.min_opening_deposit",
      "requirements.min_balance",
      "screening.chex_sensitive",
      "screening.hard_pull",
      "screening.soft_pull",
      "timeline.must_remain_open_days"
    ]
  },
  {
    "id": "wintrust-500-checking-2026",
    "bank_name": "Wintrust Bank",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 1000 },
      { "bonus": 500, "min_dd_total": 4000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 4000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Total Access Checking and complete $2,000+ monthly direct deposits for 2 consecutive months after first calendar month. Enroll in online banking and eStatements."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Low ChexSystems sensitivity reported."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "FL", "WI", "IN", "MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Not available to existing or closed checking account customers of Wintrust Financial Corporation."
    },
    "timeline": {
      "bonus_posting_days_est": 30,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.wintrust.com/solutions-and-services/community-banking/total-access-checking.html",
      "https://www.doctorofcredit.com/il-only-wintrust-bank-300-checking-bonus/"
    ],
    "raw_excerpt": "Open Total Access Checking with $2,000+ monthly DD for 2 consecutive months for $500 bonus. Also $200 savings bonus with $15k deposit."
  },
  {
    "id": "huntington-400-perks-checking-2026",
    "bank_name": "Huntington Bank",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": 24,
    "tiers": [
      { "bonus": 400, "min_dd_total": 500 },
      { "bonus": 600, "min_dd_total": 25000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$400 for Perks Checking with $500+ DD in 90 days. $600 for Platinum Perks with $25,000 total deposits in 60 days. Keep open 90 days."
    },
    "fees": {
      "monthly_fee": 10,
      "monthly_fee_waiver_text": "Waivable with $1,000 minimum balance or $2,500 combined balance.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems inquiry reported. Soft pull."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH", "MI", "IN", "PA", "KY", "WV", "IL", "CO", "MN", "SC", "WI", "NC", "TX"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "24-month rolling limit on bonuses. Must not have had Huntington checking bonus in past 24 months."
    },
    "timeline": {
      "bonus_posting_days_est": 14,
      "must_remain_open_days": 90
    },
    "source_links": [
      "https://www.huntington.com/checking-account-promotions-bonuses-offers",
      "https://www.doctorofcredit.com/oh-mi-pa-ky-wv-huntington-bank-200-checking-promotion-no-direct-deposit-requirement/"
    ],
    "raw_excerpt": "Perks Checking $400 with $500 DD in 90 days. Platinum Perks $600 with $25k deposits in 60 days. Bonus posts within 14 days."
  },
  {
    "id": "fifth-third-400-checking-2026",
    "bank_name": "Fifth Third Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": 13,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open new Essential Checking and complete $500+ direct deposit within 90 days. Offer expires June 30, 2026."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee on Essential Checking.",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems inquiry. Soft pull reported."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AL", "FL", "GA", "IL", "IN", "KY", "MI", "NC", "OH", "TN", "WV", "SC"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Must not have had Fifth Third checking in past 13 months. May require proximity to branch."
    },
    "timeline": {
      "bonus_posting_days_est": 10,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.53.com/content/fifth-third/en/mkg/checking-offer.html",
      "https://www.doctorofcredit.com/fifth-third-200-checking-bonus-fl-ga-il-ky-mi-nc-oh-tn-wv/"
    ],
    "raw_excerpt": "Open Essential Checking with $500+ DD in 90 days for $400 bonus. Posts within 10 business days. Expires June 30, 2026."
  },
  {
    "id": "associated-bank-600-checking-2026",
    "bank_name": "Associated Bank",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": 24,
    "tiers": [
      { "bonus": 300, "min_dd_total": 500 },
      { "bonus": 400, "min_dd_total": 500 },
      { "bonus": 600, "min_dd_total": 500 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 25,
      "min_balance": 10000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open by May 31, 2026. $500+ DD in 90 days required. Bonus tier based on average daily balance days 31-90: $1k-$5k=$300, $5k-$10k=$400, $10k+=$600. Account must stay open 12 months or bonus clawback."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly fee on Access Checking ($25 min opening deposit).",
      "early_closure_fee": 0
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Low ChexSystems sensitivity reported."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IA", "IL", "IN", "KS", "MI", "MN", "MO", "OH", "WI"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Not available to those who received Associated Bank checking bonus in past 24 months or had checking account in past 12 months. Must remain open 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 120,
      "must_remain_open_days": 365
    },
    "source_links": [
      "https://www.associatedbank.com/checking-account-bonus-offer-promotion",
      "https://www.doctorofcredit.com/il-in-mn-wi-only-associated-bank-500-checking-bonus/"
    ],
    "raw_excerpt": "Open checking by 5/31/2026 with $500+ DD in 90 days. Bonus based on avg daily balance: $300/$400/$600. Must keep open 12 months."
  },
  {
    "id": "regions-400-checking-2026",
    "bank_name": "Regions Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open LifeGreen Checking in-branch, make $1,000 in deposits within 60 days, enroll in online banking within 30 days. In-branch only."
    },
    "fees": {
      "monthly_fee": 8,
      "monthly_fee_waiver_text": "Waivable with $500+ single ACH DD, $1,000+ total deposits, or $1,500 avg monthly balance.",
      "early_closure_fee": 25
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Low ChexSystems sensitivity. Soft pull."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AL", "AR", "FL", "GA", "IL", "IN", "IA", "KY", "LA", "MS", "MO", "NC", "SC", "TN", "TX"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "YMMV — availability varies. In-branch only. Must not have had Regions checking in past 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 60,
      "must_remain_open_days": 180
    },
    "source_links": [
      "https://www.regions.com/promo/checking",
      "https://www.doctorofcredit.com/regions-bank-400-checking-bonus/"
    ],
    "raw_excerpt": "Open LifeGreen Checking in-branch, $1,000 deposits in 60 days. $400 bonus. $25 early closure fee if closed within 180 days."
  },
  {
    "id": "busey-bank-500-checking-2026",
    "bank_name": "Busey Bank",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 200, "min_dd_total": 2000 },
      { "bonus": 500, "min_dd_total": 5000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 5000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 3,
      "billpay_required": null,
      "other_requirements_text": "Open new checking, complete $2,000-$5,000+ in DD within 90 days, and make 3 debit card purchases. Expires May 1, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "IN", "MO", "FL"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.busey.com/personal/bank/checking/my-way-checking",
      "https://www.doctorofcredit.com/busey-bank-500-checking-bonus-il-in-mo-fl/"
    ],
    "raw_excerpt": "Open checking with $2k-$5k DD + 3 debit purchases in 90 days for up to $500."
  },
  {
    "id": "first-bank-500-checking-2026",
    "bank_name": "First Bank",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 100, "min_dd_total": 300 },
      { "bonus": 300, "min_dd_total": 500 },
      { "bonus": 500, "min_dd_total": 5000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 5000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Tiered: $100 for $300 DD, $300 for $500 DD, $500 for $5,000 DD — all within 60 days plus 10 debit purchases. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "CA", "MO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only. Expires June 30, 2026."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.firstbanks.com/checking"],
    "raw_excerpt": "Tiered checking bonus: $100/$300/$500 based on DD amount + 10 debit purchases in 60 days."
  },
  {
    "id": "old-national-bank-600-checking-2026",
    "bank_name": "Old National Bank",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 3500 },
      { "bonus": 600, "min_dd_total": 12000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 12000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 120,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open new checking with $3,500-$12,000 in DD within 4 months. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IA", "IL", "IN", "KY", "MN", "WI", "TN", "ND", "MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.oldnational.com/personal/our-best-offers/#QUALIFYING",
      "https://www.doctorofcredit.com/old-national-bank-600-checking-bonus/"
    ],
    "raw_excerpt": "Open checking with $3.5k-$12k DD in 4 months for $300-$600 bonus."
  },
  {
    "id": "central-bank-300-checking-2026",
    "bank_name": "Central Bank of the Midwest",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open new checking with 2+ DD totaling $500+ in 90 days. Expires December 31, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OK", "IL", "KS", "MO", "CO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.centralbank.net/personal/bank/checking-accounts/",
      "https://www.doctorofcredit.com/central-bank-300-checking-bonus/"
    ],
    "raw_excerpt": "$300 checking bonus with $500+ DD in 90 days. No fees."
  },
  {
    "id": "vantage-cu-250-checking-2026",
    "expired": true,
    "bank_name": "Vantage Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open new checking account — no direct deposit required. Expires December 31, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MO", "IL"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New members only. MO and IL."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.vcu.com/promotions"],
    "raw_excerpt": "$250 checking bonus — no DD required. MO & IL only."
  },
  {
    "id": "quad-city-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Quad City Bank & Trust",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 3,
      "billpay_required": null,
      "other_requirements_text": "Open new checking, make 3 debit card purchases, enroll in online banking and eStatements within 90 days. No DD required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "IA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only. IL & IA."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.qcbt.com/promotions"],
    "raw_excerpt": "$300 checking bonus with 3 debit purchases + online banking in 90 days. No DD required."
  },
  {
    "id": "cibc-200-checking-2026",
    "bank_name": "CIBC US",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 500,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open with $500 deposit, set up DD/ACH, enroll in eStatements within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee with eStatements.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "MI", "MO", "FL", "CA", "WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://us.cibc.com/en/personal-banking/checking/smart-account.html",
      "https://www.doctorofcredit.com/cibc-bank-usa-200-checking-bonus/"
    ],
    "raw_excerpt": "$200 checking bonus with $500 opening deposit + DD/ACH in 90 days."
  },
  {
    "id": "dupaco-cu-300-checking-2026",
    "bank_name": "Dupaco Credit Union",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Open new checking with DD or 5-10 qualifying transactions within 90 days. DD not strictly required if you meet transaction count."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IA", "IL", "WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New members only. IA, IL, WI."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.dupaco.com/promotions"],
    "raw_excerpt": "$300 checking bonus with DD or 5-10 transactions in 90 days. No strict DD requirement."
  },
  {
    "id": "keybank-500-checking-2026",
    "bank_name": "KeyBank",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 2000 },
      { "bonus": 500, "min_dd_total": 5000 }
    ],
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 5000, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 90, "holding_period_days": null, "min_opening_deposit": 50, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Key Smart Checking $300 for $2k DD. Key Select Checking $500 for $5k DD. Expires May 22, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "Key Smart Checking has no monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["AK","CO","CT","ID","IN","MA","ME","MI","NY","OH","OR","PA","UT","VT","WA"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New checking customers only. Expires May 22, 2026." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.key.com/personal/checking/checking-offer.html",
      "https://www.doctorofcredit.com/keybank-500-checking-bonus/"
    ],
    "raw_excerpt": "Key Smart $300 for $2k DD or Key Select $500 for $5k DD in 90 days. 15 states."
  },
  {
    "id": "truist-400-checking-2026",
    "bank_name": "Truist",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 2000, "min_direct_deposit_per_deposit": null, "dd_count_required": 2, "deposit_window_days": 120, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": 20, "billpay_required": null, "other_requirements_text": "Truist One Checking. 2 DD totaling $2,000+ AND 20+ debit purchases within 120 days. Promo code DC400TR1Q226. Expires July 9, 2026." },
    "fees": { "monthly_fee": 12, "monthly_fee_waiver_text": "Waivable with $500+ DD or $500 min balance.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["AL","AR","GA","FL","IN","KY","MD","MS","NC","NJ","OH","PA","SC","TN","TX","VA","WV","DC"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New Truist checking customers only. Expires July 9, 2026." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.truist.com/checking/open-checking",
      "https://www.doctorofcredit.com/truist-bank-400-checking-bonus/"
    ],
    "raw_excerpt": "$400 for $2k DD + 20 debit purchases in 120 days. 18 states + DC."
  },
  {
    "id": "td-bank-300-checking-2026",
    "bank_name": "TD Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 200, "min_dd_total": 500 },
      { "bonus": 300, "min_dd_total": 2500 }
    ],
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 2500, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 60, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Complete Checking $200 for $500 DD. Beyond Checking $300 for $2,500 DD. 60-day window. Expires April 30, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee with $100 min balance.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["CT","DC","DE","FL","MA","MD","ME","NC","NH","NJ","NY","PA","RI","SC","VT","VA"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New TD checking customers only." },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.td.com/us/en/personal-banking/checking-bonus/pso",
      "https://www.doctorofcredit.com/td-bank-300-checking-bonus/"
    ],
    "raw_excerpt": "Complete Checking $200 for $500 DD or Beyond Checking $300 for $2.5k DD in 60 days. 16 states."
  },
  {
    "id": "flagstar-500-checking-2026",
    "bank_name": "Flagstar Bank",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 500 },
      { "bonus": 500, "min_dd_total": 500 }
    ],
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 500, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 90, "holding_period_days": null, "min_opening_deposit": null, "min_balance": 500, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Ready Checking $300 or Elite Checking $500. $500 DD + $500 avg daily balance for 90 days. Expires May 31, 2026." },
    "fees": { "monthly_fee": 15, "monthly_fee_waiver_text": "Ready Checking $0/mo. Elite Checking $15/mo waived with $25k balance.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["AZ","CA","FL","IN","MI","NJ","NY","OH"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New checking customers only. Expires May 31, 2026." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.flagstar.com/personal/checking/checking-offer.html",
      "https://www.doctorofcredit.com/flagstar-bank-500-checking-bonus/"
    ],
    "raw_excerpt": "Ready Checking $300 or Elite Checking $500. $500 DD + $500 balance for 90 days. 8 states."
  },
  {
    "id": "hancock-whitney-600-checking-2026",
    "bank_name": "Hancock Whitney",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": null,
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 3000, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 90, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Freestyle Checking. $3,000 DD in 90 days. Enter email for promo code. Must keep open 6 months. Expires June 30, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["AL","FL","LA","MO","TX"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New checking customers only. Must keep open 6 months." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.hancockwhitney.com/personal/bank/checking",
      "https://www.doctorofcredit.com/la-ms-fl-al-tx-hancock-whitney-bank-600-checking-savings-bonus/"
    ],
    "raw_excerpt": "$600 Freestyle Checking with $3k DD in 90 days. Keep open 6 months. 5 Southern states."
  },
  {
    "id": "mt-bank-350-checking-2026",
    "bank_name": "M&T Bank",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 200, "min_dd_total": 500 },
      { "bonus": 350, "min_dd_total": 1000 }
    ],
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 1000, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 90, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Personal Checking $200 for $500 DD. MyChoice Premium $350 for $1k DD. 90-day window." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on MyWay Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["CT","DC","DE","MD","NJ","NY","PA","VA","WV"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New M&T checking customers only." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.mtb.com/personal/checking"],
    "raw_excerpt": "Personal $200 for $500 DD or MyChoice Premium $350 for $1k DD. 9 Mid-Atlantic states."
  },
  {
    "id": "santander-400-checking-2026",
    "bank_name": "Santander Bank",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 5000, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 90, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "$5,000 DD in 90 days. Must keep open 90 days. Expires Sept 30, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["CT","DE","FL","MA","NH","NJ","NY","PA","RI"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New Santander checking customers only." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": 90 },
    "source_links": ["https://www.santander.com/checking"],
    "raw_excerpt": "$400 for $5k DD in 90 days. 9 Northeast states. Expires Sept 30, 2026."
  },
  {
    "id": "fulton-bank-300-checking-2026",
    "bank_name": "Fulton Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 500, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 60, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "$500 recurring DD within 60 days. No monthly fees. Expires May 22, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["DE","DC","MD","NJ","PA","VA"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New checking customers only." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://offer.fultonbank.com/CheckingPromo",
      "https://www.doctorofcredit.com/fulton-bank-300-checking-bonus/"
    ],
    "raw_excerpt": "$300 for $500 DD in 60 days. No fees. 6 Mid-Atlantic states."
  },
  {
    "id": "trustone-500-checking-2026",
    "bank_name": "TruStone Financial",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 100, "min_dd_total": 1000 },
      { "bonus": 300, "min_dd_total": 2500 },
      { "bonus": 500, "min_dd_total": 4500 }
    ],
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 4500, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 60, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": null, "billpay_required": null, "other_requirements_text": "Tiered: $100 for $1k DD, $300 for $2.5k DD, $500 for $4.5k DD in 60 days. +$50 for eStatements. Expires Dec 31, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["MN","WI"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New members only. MN and WI." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://trustonefinancial.org/checking-and-savings/checking-accounts/",
      "https://www.doctorofcredit.com/trustone-500-checking-bonus/"
    ],
    "raw_excerpt": "Tiered: $100/$300/$500 for $1k/$2.5k/$4.5k DD in 60 days. MN & WI only."
  },
  {
    "id": "southstate-300-checking-2026",
    "bank_name": "SouthState Bank",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": { "direct_deposit_required": true, "min_direct_deposit_total": 250, "min_direct_deposit_per_deposit": null, "dd_count_required": null, "deposit_window_days": 60, "holding_period_days": null, "min_opening_deposit": null, "min_balance": null, "debit_transactions_required": 15, "billpay_required": null, "other_requirements_text": "$250 DD or 1 auto draft of $25+ within 60 days. 15 debit purchases in 60 days. Promo code 300BONUS. Expires June 30, 2026." },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": { "state_restricted": true, "states_allowed": ["AL","CO","FL","GA","NC","SC","TX","VA"], "states_excluded": [], "lifetime_language": false, "eligibility_notes": "New checking customers only." },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": [
      "https://www.southstatebank.com/personal/checking",
      "https://www.doctorofcredit.com/southstate-bank-200-checking-bonus/"
    ],
    "raw_excerpt": "$300 for $250 DD + 15 debit purchases in 60 days. 8 Southern states."
  },
  {
    "id": "citizens-bank-400-checking-2026",
    "bank_name": "Citizens Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Citizens One Deposit Account or Citizens Quest Checking. Make at least one qualifying direct deposit of $500+ within 60 days of account opening."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "One Deposit Account has no monthly fee. Quest Checking $25/month waived with $25,000 combined balance.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Soft pull only. Citizens is generally lenient with ChexSystems."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CT", "DC", "DE", "MA", "MI", "NH", "NJ", "NY", "OH", "PA", "RI", "VT"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Available in 11 states plus DC. Must not have had a Citizens checking account in the past 12 months."
    },
    "timeline": {
      "bonus_posting_days_est": 60,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.citizensbank.com/promo/checking/drc-2026-q2.aspx",
      "https://www.doctorofcredit.com/citizens-bank-400-checking-bonus/"
    ],
    "raw_excerpt": "Citizens Bank $400 checking bonus with one qualifying DD of $500+ within 60 days. Available in 11 East Coast states + DC."
  },
  {
    "id": "secu-350-checking-2026",
    "bank_name": "SECU (State Employees Credit Union)",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 250,
      "dd_count_required": 2,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 25,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Open SECU Share Draft (checking) account with $25 minimum deposit. Two direct deposits of $250+ within 60 days, plus 10 debit card transactions. Enroll in e-statements."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly service fee on Share Draft accounts.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "ChexSystems inquiry required. Soft pull on credit."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MD", "NC", "SC", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Must be eligible for SECU membership (NC state employees, or family of existing members). Available primarily in NC with some branches in adjacent states."
    },
    "timeline": {
      "bonus_posting_days_est": 90,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.secumd.org/promo/welcome_to_your_last_checking_account/",
      "https://www.doctorofcredit.com/secu-350-checking-bonus/"
    ],
    "raw_excerpt": "SECU $350 checking bonus with two $250+ DDs in 60 days plus 10 debit transactions. NC state employee membership required."
  },
  {
    "id": "dedham-savings-750-checking-2026",
    "bank_name": "Dedham Savings",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 750,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 250, "min_dd_total": 2500 },
      { "bonus": 500, "min_dd_total": 10000 },
      { "bonus": 750, "min_dd_total": 20000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 20000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Open Free and Easy Checking. Tiered bonus: $250 at $2,500 DD, $500 at $10,000 DD, $750 at $20,000+ DD in 90 days. Must also make 5 bill payments OR 5 debit card purchases of $5+."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "Free and Easy Checking has no monthly maintenance fee.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Standard ChexSystems inquiry."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Massachusetts only. Community bank with branches in the Dedham area."
    },
    "timeline": {
      "bonus_posting_days_est": 90,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.dedhamsavings.com/",
      "https://bankbonus.com/promotions-by-state/massachusetts/"
    ],
    "raw_excerpt": "Dedham Savings Free and Easy Checking up to $750 tiered bonus. $2,500 DD = $250, $10,000 DD = $500, $20,000+ DD = $750. Plus 5 bill payments or debit purchases. Expires December 31, 2026."
  },
  {
    "id": "banner-bank-500-checking-2026",
    "bank_name": "Banner Bank",
    "expired": true,
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 250, "min_dd_total": 2500 },
      { "bonus": 500, "min_dd_total": 5000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 5000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": 90,
      "min_opening_deposit": null,
      "min_balance": 5000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Banner Bank checking with promo code 2026DP. Tiered: $250 bonus with $2,500 deposits + $2,500 min daily balance for 90 days. $500 bonus with $5,000 deposits + $5,000 min daily balance for 90 days. Deposits must be made within 30 days."
    },
    "fees": {
      "monthly_fee": null,
      "monthly_fee_waiver_text": "Monthly fee varies by account type.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "medium",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Standard ChexSystems inquiry."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA", "ID", "OR", "WA"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Available in 4 Western states. Use promo code 2026DP."
    },
    "timeline": {
      "bonus_posting_days_est": 90,
      "must_remain_open_days": 90
    },
    "source_links": [
      "https://www.bannerbank.com/",
      "https://bankbonus.com/promotions-by-state/washington/"
    ],
    "raw_excerpt": "Banner Bank up to $500 checking bonus. $2,500 deposits + $2,500 balance = $250. $5,000 deposits + $5,000 balance = $500. Promo code 2026DP. Expires June 30, 2026."
  },
  {
    "id": "becu-500-checking-2026",
    "bank_name": "BECU (Boeing Employees Credit Union)",
    "product_type": "checking",
    "bonus_amount": 150,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Open BECU checking account with promo code WPNEW2026. Complete 10+ qualifying transactions (debit card, checks, deposits/withdrawals) within 30 days. No direct deposit required."
    },
    "fees": {
      "monthly_fee": 0,
      "monthly_fee_waiver_text": "No monthly maintenance fee.",
      "early_closure_fee": null
    },
    "screening": {
      "chex_sensitive": "low",
      "hard_pull": false,
      "soft_pull": true,
      "screening_notes": "Low ChexSystems sensitivity. Credit union membership required."
    },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["ID", "OR", "SC", "WA"],
      "states_excluded": [],
      "lifetime_language": false,
      "eligibility_notes": "Available in 4 states. BECU membership required. Use promo code WPNEW2026."
    },
    "timeline": {
      "bonus_posting_days_est": 30,
      "must_remain_open_days": null
    },
    "source_links": [
      "https://www.becu.org/landing/membership/consumer-member-checking-400-500",
      "https://www.doctorofcredit.com/becu-500-checking-bonus/"
    ],
    "raw_excerpt": "BECU $150 checking bonus with 10+ qualifying transactions in 30 days. Promo code WPNEW2026. No DD required. Expires December 31, 2026."
  },
  {
    "id": "first-federal-kc-300-checking-2026",
    "expired": true,
    "bank_name": "First Federal Bank of Kansas City",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open a First Free Checking account and make a $500+ direct deposit within 60 days. No monthly fee."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on First Free Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AR", "IA", "KS", "MO", "NE", "OK"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in AR, IA, KS, MO, NE, OK. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.firstfederalkc.com/"],
    "raw_excerpt": "$300 checking bonus with $500 DD in 60 days. First Free Checking. No monthly fee."
  },
  {
    "id": "altra-fcu-300-checking-2026",
    "expired": true,
    "bank_name": "Altra Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 1,
      "deposit_window_days": 30,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open an A+ Checking account and make a $500+ direct deposit within 30 days. No monthly fee."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on A+ Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MN", "TN", "TX", "WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in MN, TN, TX, WI. New members only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.altra.org/"],
    "raw_excerpt": "$300 checking bonus with $500 DD in 30 days. A+ Checking. No fee."
  },
  {
    "id": "first-commonwealth-400-checking-2026",
    "expired": true,
    "bank_name": "First Commonwealth Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Open new checking and make 10 debit purchases within 60 days. No direct deposit required. Expires July 31, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IN", "KY", "NJ", "OH", "PA", "WV"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in IN, KY, NJ, OH, PA, WV. New checking customers only. Expires July 31, 2026."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.fcbanking.com/"],
    "raw_excerpt": "$400 checking bonus with 10 debit purchases in 60 days. No DD required. Expires July 31, 2026."
  },
  {
    "id": "peoples-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Peoples Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 180,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Open Premier Checking with monthly DD + 5 debit purchases per cycle for up to 6 months. Earn $50 per qualifying cycle, up to $300 total."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Premier Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["DC", "KY", "MD", "OH", "VA", "WV"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in DC, KY, MD, OH, VA, WV. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": null },
    "source_links": ["https://www.peoplesbancorp.com/"],
    "raw_excerpt": "$300 checking bonus ($50/cycle for up to 6 months) with monthly DD + 5 debit purchases per cycle. Premier Checking."
  },
  {
    "id": "dollar-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Dollar Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 2500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Everything Checking with $2500+ in direct deposits within 90 days. Must maintain account for 1 year."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Everything Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH", "PA", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in OH, PA, VA. Must maintain account for 1 year."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": 365 },
    "source_links": ["https://www.dollar.bank/"],
    "raw_excerpt": "$300 checking bonus with $2500 DD in 90 days. Everything Checking. Must keep account open 1 year."
  },
  {
    "id": "arizona-financial-300-checking-2026",
    "expired": true,
    "bank_name": "Arizona Financial Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 500,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Free Checking with $1000 monthly recurring DD and maintain $500 balance on day 60. Available nationwide."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Free Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available nationwide. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.arizonafinancial.org/"],
    "raw_excerpt": "$300 checking bonus with $1000 monthly recurring DD + $500 balance on day 60. Free Checking. Nationwide."
  },
  {
    "id": "credit-human-300-checking-2026",
    "bank_name": "Credit Human",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 250,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Open checking with promo code CheckingPromo2026. Make 2x $250 DD + 10 debit purchases of $10+ within 90 days. Available nationwide."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available nationwide. Use promo code CheckingPromo2026. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://www.credithuman.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$300 checking bonus with 2x $250 DD + 10 debit purchases of $10+ in 90 days. Promo code CheckingPromo2026. Nationwide."
  },
  {
    "id": "bank-of-hawaii-400-checking-2026",
    "bank_name": "Bank of Hawaii",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 100, "min_dd_total": 2000 },
      { "bonus": 200, "min_dd_total": 2500 },
      { "bonus": 400, "min_dd_total": 3500 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 3500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 500,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $2000 DD = $100, $2500 DD = $200, $3500 DD = $400 within 60 days. $500 opening deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["HI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Hawaii residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.boh.com/personal/bank/checking",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Tiered $100-$400 checking bonus with DD in 60 days. $500 opening deposit. Hawaii only."
  },
  {
    "id": "seacoast-400-checking-2026",
    "bank_name": "Seacoast Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Premium Checking with promo code CON600. Make $1000+ in direct deposits within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Premium Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["FL"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Florida residents only. Promo code CON600. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://www.seacoastbank.com/personal/bank/checking",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$400 checking bonus with $1000 DD in 90 days. Promo code CON600. Premium Checking. Florida only."
  },
  {
    "id": "midflorida-400-checking-2026",
    "bank_name": "MidFlorida Credit Union",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 200, "min_dd_total": 2000 },
      { "bonus": 400, "min_dd_total": 4000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 4000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 75,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 40,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $2000 DD + 20 debit = $200, $4000 DD + 40 debit = $400 within 75 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["FL"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Florida residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 75, "must_remain_open_days": null },
    "source_links": [
      "https://www.midflorida.com/current-offers/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Tiered $200-$400 checking bonus with DD + debit purchases in 75 days. Florida only."
  },
  {
    "id": "addition-financial-400-checking-2026",
    "bank_name": "Addition Financial",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 2000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 1000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Benefits Checking with $2000 monthly DD within 90 days. Maintain $1000 minimum daily balance."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Benefits Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["FL", "GA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in FL and GA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://www.additionfi.com/bank/checking",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$400 checking bonus with $2000 monthly DD in 90 days. $1000 min daily balance. Benefits Checking. FL and GA."
  },
  {
    "id": "clearview-fcu-500-checking-2026",
    "bank_name": "Clearview FCU",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open checking with promo code SWITCH. Up to $500: $300 base + $100 savings bonus + $100 anniversary bonus. $500 DD within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Pennsylvania residents only. Promo code SWITCH. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": 365 },
    "source_links": [
      "https://www.clearviewfcu.org/New-Checking-Account-Offer",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Up to $500 checking bonus ($300 base + $100 savings + $100 anniversary). $500 DD in 60 days. Promo code SWITCH. PA only."
  },
  {
    "id": "penn-community-400-checking-2026",
    "expired": true,
    "bank_name": "Penn Community Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open checking with promo code 400BONUS. Make $1500 DD OR 20 debit purchases within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Pennsylvania residents only. Promo code 400BONUS. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.penncommunitybank.com/"],
    "raw_excerpt": "$400 checking bonus with $1500 DD or 20 debit purchases in 60 days. Promo code 400BONUS. PA only."
  },
  {
    "id": "pse-cu-400-checking-2026",
    "bank_name": "PSE Credit Union",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Open Deluxe Checking with DD + 10 debit transactions within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Deluxe Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Ohio residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://go.psecu.com/promo",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$400 checking bonus with DD + 10 debit transactions in 60 days. Deluxe Checking. Ohio only."
  },
  {
    "id": "broadview-fcu-350-checking-2026",
    "bank_name": "Broadview Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Free Checking with $1000 DD within 60 days. Expires May 26, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Free Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NY"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New York residents only. New members only. Expires May 26, 2026."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.broadviewfcu.com/promo/checking-bonus",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$350 checking bonus with $1000 DD in 60 days. Free Checking. Expires May 26, 2026. NY only."
  },
  {
    "id": "municipal-cu-350-checking-2026",
    "expired": true,
    "bank_name": "Municipal Credit Union",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 150, "min_dd_total": 3000 },
      { "bonus": 250, "min_dd_total": 6000 },
      { "bonus": 350, "min_dd_total": 9000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 9000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $1k-2k/mo DD = $150, $2k-3k/mo = $250, $3k+/mo = $350 for 3 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NY"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New York residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.nymcu.org/"],
    "raw_excerpt": "Tiered $150-$350 checking bonus with monthly DD for 3 months. NY only."
  },
  {
    "id": "independent-bank-350-checking-2026",
    "expired": true,
    "bank_name": "Independent Bank",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 1,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open ONE Account with $500 DD within 90 days. Expires March 31, 2027."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on ONE Account.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Michigan residents only. New checking customers only. Expires March 31, 2027."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.independentbank.com/"],
    "raw_excerpt": "$350 checking bonus with $500 DD in 90 days. ONE Account. Expires March 31, 2027. Michigan only."
  },
  {
    "id": "oneaz-cu-350-checking-2026",
    "expired": true,
    "bank_name": "OneAZ Credit Union",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 25,
      "billpay_required": null,
      "other_requirements_text": "Open checking and make 25 debit purchases of $5+ within 60 days. No direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AZ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Arizona residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.oneazcu.com/"],
    "raw_excerpt": "$350 checking bonus with 25 debit purchases of $5+ in 60 days. No DD required. Arizona only."
  },
  {
    "id": "bar-harbor-400-checking-2026",
    "expired": true,
    "bank_name": "Bar Harbor Bank and Trust",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 200, "min_dd_total": 250 },
      { "bonus": 400, "min_dd_total": 500 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $250 DD = $200, $500 DD = $400. Relationship Rewards Checking."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Relationship Rewards Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["ME", "NH", "VT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in ME, NH, VT. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.bfrb.com/"],
    "raw_excerpt": "Tiered $200-$400 checking bonus with DD. Relationship Rewards Checking. ME, NH, VT."
  },
  {
    "id": "provident-cu-475-checking-2026",
    "expired": true,
    "bank_name": "Provident Credit Union",
    "product_type": "checking",
    "bonus_amount": 475,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open checking with promo code JOIN475. Make $1000 DD + $800 in debit spending within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "California residents only. Promo code JOIN475. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.providentcu.org/"],
    "raw_excerpt": "$475 checking bonus with $1000 DD + $800 debit in 60 days. Promo code JOIN475. California only."
  },
  {
    "id": "numerica-cu-300-checking-2026",
    "bank_name": "Numerica Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 12,
      "billpay_required": null,
      "other_requirements_text": "Open checking. Either make 12 transactions of $5+ for 2 months + enroll in eStatements, OR set up $500/month DD for 2 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["ID", "WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in ID and WA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.numericacu.com/personal/checking",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$300 checking bonus with 12 txns of $5+ for 2 months + eStatements OR $500/mo DD for 2 months. ID and WA."
  },
  {
    "id": "oregon-state-cu-300-checking-2026",
    "expired": true,
    "bank_name": "Oregon State Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 2,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open checking with $500/month DD for 2 months (within 60 days)."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OR", "WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in OR and WA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.oregonstatecu.com/"],
    "raw_excerpt": "$300 checking bonus with $500/mo DD for 2 months. OR and WA."
  },
  {
    "id": "florida-cu-300-checking-2026",
    "bank_name": "Florida Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open checking with promo code 25SUMMERBONUS. Make $500 DD within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["FL"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Florida residents only. Promo code 25SUMMERBONUS. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://flcu.org/600-bonus/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$300 checking bonus with $500 DD in 60 days. Promo code 25SUMMERBONUS. Florida only."
  },
  {
    "id": "town-bank-500-checking-2026",
    "expired": true,
    "bank_name": "Town Bank",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 1000 },
      { "bonus": 500, "min_dd_total": 4000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 4000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $500/mo DD for 2 months = $300, $2000/mo DD for 2 months = $500."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Wisconsin residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.townbank.us/"],
    "raw_excerpt": "Tiered $300-$500 checking bonus with monthly DD for 2 months. Wisconsin only."
  },
  {
    "id": "utah-first-fcu-500-checking-2026",
    "expired": true,
    "bank_name": "Utah First FCU",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 25,
      "billpay_required": null,
      "other_requirements_text": "Tiered: $50 at opening + $150 for 25 debit purchases + $100 for DD + $200 at 6-month anniversary. Complete debit and DD within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["UT", "WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in UT and WA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": 180 },
    "source_links": ["https://www.utahfirst.com/"],
    "raw_excerpt": "Up to $500 checking bonus: $50 opening + $150 debit + $100 DD + $200 anniversary. UT and WA."
  },
  {
    "id": "cyprus-cu-300-checking-2026",
    "expired": true,
    "bank_name": "Cyprus Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 3,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Dream Rewards Checking with $500/month DD for 3 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Dream Rewards Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["UT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Utah residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.cypruscu.com/"],
    "raw_excerpt": "$300 checking bonus with $500/mo DD for 3 months. Dream Rewards Checking. Utah only."
  },
  {
    "id": "carolina-trust-300-checking-2026",
    "expired": true,
    "bank_name": "Carolina Trust FCU",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open Rewards+ Checking with $1000 monthly DD within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Rewards+ Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["SC"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "South Carolina residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.carolinatrust.org/"],
    "raw_excerpt": "$300 checking bonus with $1000 monthly DD in 90 days. Rewards+ Checking. South Carolina only."
  },
  {
    "id": "bankerstrust-400-checking-2026",
    "expired": true,
    "bank_name": "BankersTrust",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 400,
      "min_direct_deposit_per_deposit": 200,
      "dd_count_required": 2,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 25,
      "billpay_required": null,
      "other_requirements_text": "Open checking in-branch with 2x $200 DD + 25 debit transactions within 60 days. In-branch account opening required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AZ", "IA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in AZ and IA. Must open account in-branch. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.bankerstrust.com/"],
    "raw_excerpt": "$400 checking bonus with 2x $200 DD + 25 debit in 60 days. In-branch required. AZ and IA."
  },
  {
    "id": "community-state-400-checking-2026",
    "expired": true,
    "bank_name": "Community State Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 100,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "Open Edge Checking with $100 initial deposit. Make 2 DD + 15 debit transactions within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee on Edge Checking.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Iowa residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.communitystate.bank/"],
    "raw_excerpt": "$400 checking bonus with 2 DD + 15 debit in 90 days. Edge Checking. $100 initial deposit. Iowa only."
  },
  {
    "id": "star-financial-300-checking-2026",
    "expired": true,
    "bank_name": "STAR Financial Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Open checking with $500 recurring DD + 5 debit purchases per cycle within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Indiana residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.starfinancial.com/"],
    "raw_excerpt": "$300 checking bonus with $500 recurring DD + 5 debit per cycle in 60 days. Indiana only."
  },
  {
    "id": "trunorth-300-checking-2026",
    "bank_name": "TruNorth Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 25,
      "billpay_required": null,
      "other_requirements_text": "Get More Checking. Up to $300. Requires eStatements + either $1,000+ recurring DD OR 25+ debit purchases of $10+."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CT", "MA", "NH", "RI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in CT, MA, NH, RI. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://trunorthbank.com/landing/specials/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "$300 checking bonus. Get More Checking. eStatements + $1000 DD or 25 debit purchases. CT, MA, NH, RI."
  },
  {
    "id": "easthampton-savings-300-checking-2026",
    "expired": true,
    "bank_name": "Easthampton Savings Bank",
    "product_type": "checking",
    "bonus_amount": 325,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Get Real Checking. Up to $300 tiered: $200 for DD or online banking + 5 debit purchases, $50 for 5 bill payments or eStatements, $50 more for additional activity."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Connecticut residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.easthamptonbank.com/"],
    "raw_excerpt": "$300 tiered checking bonus. Get Real Checking. DD or online banking + debit + bill pay. CT only."
  },
  {
    "id": "state-bank-trust-300-checking-2026",
    "expired": true,
    "bank_name": "The State Bank and Trust Company",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 1,
      "deposit_window_days": 60,
      "holding_period_days": 180,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Cash Rewards Checking. One DD within 60 days. Account must stay open 180 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IN", "MI", "OH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in IN, MI, OH. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": 180 },
    "source_links": ["https://www.statebanktrust.com/"],
    "raw_excerpt": "$300 checking bonus with 1 DD within 60 days. Cash Rewards Checking. Must keep open 180 days. IN, MI, OH."
  },
  {
    "id": "greenfield-banking-300-checking-2026",
    "expired": true,
    "bank_name": "Greenfield Banking Company",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 300,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$300+ DD within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Indiana residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.greenfieldbankingcompany.com/"],
    "raw_excerpt": "$300 checking bonus with $300 DD within 90 days. Indiana only."
  },
  {
    "id": "cedar-rapids-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Cedar Rapids Bank & Trust",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "MAXX Checking. ACH/direct deposit required + 15 debit transactions within 90 days + maintain positive balance."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Iowa residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.crbt.com/"],
    "raw_excerpt": "$300 checking bonus. MAXX Checking. DD + 15 debit in 90 days. Iowa only."
  },
  {
    "id": "our-credit-union-300-checking-2026",
    "expired": true,
    "bank_name": "OUR Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 300,
      "min_balance": null,
      "debit_transactions_required": 1,
      "billpay_required": null,
      "other_requirements_text": "Premium Checking. Bonus matches initial deposit up to $300 (deposit $300 to get $300). Requires 1+ debit card transaction per month."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Michigan residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.ourcu.com/"],
    "raw_excerpt": "$300 checking bonus matching initial deposit up to $300. Premium Checking. Michigan only."
  },
  {
    "id": "financial-plus-300-checking-2026",
    "expired": true,
    "bank_name": "Financial Plus Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 150, "min_dd_total": 500 },
      { "bonus": 300, "min_dd_total": 1000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered: $150 for $500 DD or $300 for $1,000 DD over 2 consecutive months. Promo code: WINTER26."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Michigan residents only. Promo code WINTER26. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.myfpcu.com/"],
    "raw_excerpt": "Tiered $150-$300 checking bonus. $500 or $1000 DD over 2 months. Promo code WINTER26. Michigan only."
  },
  {
    "id": "cornerstone-community-300-checking-2026",
    "bank_name": "Cornerstone Community Financial CU",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 18,
      "billpay_required": null,
      "other_requirements_text": "Requires monthly: $500+ DD, 18 debit card purchases, eStatements enrollment, and 1 online/mobile banking login for 3 consecutive months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI", "OH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in MI and OH. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.ccfinancial.com/", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$300 checking bonus. $500 monthly DD + 18 debit + eStatements for 3 months. MI and OH."
  },
  {
    "id": "arsenal-credit-union-300-checking-2026",
    "expired": true,
    "bank_name": "Arsenal Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 45,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Up to $300. Requires DD of any amount plus 10+ debit card purchases within 45 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "MO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in IL and MO. New members only. Expires December 31, 2026."
    },
    "timeline": { "bonus_posting_days_est": 45, "must_remain_open_days": null },
    "source_links": ["https://www.arsenalcu.com/"],
    "raw_excerpt": "$300 checking bonus. DD + 10 debit in 45 days. IL and MO. Expires Dec 2026."
  },
  {
    "id": "blue-foundry-300-checking-2026",
    "expired": true,
    "bank_name": "Blue Foundry Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 180,
      "holding_period_days": 180,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Checking-only portion is $300 (up to $600 combined with savings). Requires $500+ DD maintained for 6 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NJ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "New Jersey residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": 180 },
    "source_links": ["https://www.bluefoundrybank.com/"],
    "raw_excerpt": "$300 checking bonus with $500 DD maintained 6 months. Up to $600 with savings. New Jersey only."
  },
  {
    "id": "carter-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Carter Bank & Trust",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 500,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Lifetime Free account. $1,000 DD within 90 days. $500 average daily balance required. $15 early termination fee if closed within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee — Lifetime Free.", "early_closure_fee": 15 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NC", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NC and VA. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": 90 },
    "source_links": ["https://www.carterbankandtrust.com/"],
    "raw_excerpt": "$300 checking bonus with $1000 DD in 90 days. Lifetime Free account. NC and VA."
  },
  {
    "id": "bmi-fcu-300-checking-2026",
    "expired": true,
    "bank_name": "BMI FCU",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 30,
      "billpay_required": null,
      "other_requirements_text": "Promo code BDCHECK26. Must be preferred partner employee. 30 Visa debit transactions of $5+ within 90 days. eStatements required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Ohio residents only. Must be preferred partner employee. Promo code BDCHECK26."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.bmifcu.org/"],
    "raw_excerpt": "$300 checking bonus. 30 Visa debit of $5+ in 90 days. Preferred partner employees. Promo BDCHECK26. OH."
  },
  {
    "id": "cornerstone-financial-300-checking-2026",
    "expired": true,
    "bank_name": "Cornerstone Financial Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Simple Streaming Checking. 12-month reimbursement for streaming services (up to $25/month, $300 total). Must use debit card for streaming."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Tennessee residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 365, "must_remain_open_days": null },
    "source_links": ["https://www.cstonefcu.com/"],
    "raw_excerpt": "$300 streaming reimbursement over 12 months ($25/mo). Simple Streaming Checking. Tennessee only."
  },
  {
    "id": "broadway-national-300-checking-2026",
    "bank_name": "Broadway National Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 6000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "Free Checking. Promo code CKPR. $2,000 monthly DD within 90 days ($6,000 total). 15 debit card purchases within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Texas residents only. Promo code CKPR. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://broadway.bank/landing-pages/400-offer", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$300 checking bonus. $2000/mo DD for 3 months + 15 debit. Promo CKPR. Texas only."
  },
  {
    "id": "schertz-bank-300-checking-2026",
    "expired": true,
    "bank_name": "Schertz Bank & Trust",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 500,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "DirectPLUS Checking. $500+ monthly DD within 90 days. Maintain $500 minimum daily balance for 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Texas residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.schertzbank.com/"],
    "raw_excerpt": "$300 checking bonus. $500 monthly DD + $500 balance for 90 days. DirectPLUS Checking. Texas only."
  },
  {
    "id": "firstmark-300-checking-2026",
    "expired": true,
    "bank_name": "Firstmark Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 50, "min_dd_total": 10 },
      { "bonus": 300, "min_dd_total": 2000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 2000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered: $50 for $10+ DD/ACH within 30 days, then $250 for 2+ ACH deposits totaling $2,000 within days 31-90. Select TX counties."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select Texas counties only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.firstmarkcu.org/"],
    "raw_excerpt": "Tiered $50-$300 checking bonus. $10 DD in 30 days + $2000 ACH in 90 days. Select TX counties."
  },
  {
    "id": "neighborhood-cu-300-checking-2026",
    "bank_name": "Neighborhood Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 3000,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 30,
      "billpay_required": null,
      "other_requirements_text": "Promo code NEIGHBOR. DD of $500+ totaling $3,000+ within 90 days. 30+ debit card transactions of $5+ within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Texas residents only. Promo code NEIGHBOR. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.myncu.com/", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$300 checking bonus. $500+ DD totaling $3000 + 30 debit in 90 days. Promo NEIGHBOR. Texas only."
  },
  {
    "id": "bank-five-nine-300-checking-2026",
    "expired": true,
    "bank_name": "Bank Five Nine",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 120,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 25,
      "billpay_required": null,
      "other_requirements_text": "Personal Checking. Complete 2 of 3: (a) $250 payroll deposits for 3 months, (b) 25 debit purchases $5+, or (c) 6 bill payments within 120 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Wisconsin residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": null },
    "source_links": ["https://www.bankfivenine.com/"],
    "raw_excerpt": "$300 checking bonus. Complete 2 of 3 activities in 120 days. Wisconsin only."
  },
  {
    "id": "bankhometown-300-checking-2026",
    "expired": true,
    "bank_name": "bankHometown",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 25,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Get Real Checking. Tiered: $25+ DD or online banking + 5 debit purchases = $200, 5 bill payments or eStatements = $50, 10 additional debit = $50."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Massachusetts residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.bankhometown.com/"],
    "raw_excerpt": "$300 tiered checking bonus. Get Real Checking. DD + debit + bill pay activities. Massachusetts only."
  },
  {
    "id": "unity-bank-300-checking-2026",
    "bank_name": "Unity Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 6000,
      "min_direct_deposit_per_deposit": 1500,
      "dd_count_required": 4,
      "deposit_window_days": 180,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Everyday Checking. Promo code 1144. 4+ direct deposits of $1,500+ within 180 days. Also offers $400 tier with Rewards Checking (promo 1145, $2500+ DD)."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NJ", "PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NJ and PA. Promo code 1144. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": null },
    "source_links": ["https://www.unitybank.com/contests-and-promotions/cd-specials", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$300 checking bonus. Everyday Checking. 4x $1500 DD in 180 days. Promo 1144. NJ and PA."
  },
  {
    "id": "tbk-bank-275-checking-2026",
    "expired": true,
    "bank_name": "TBK Bank",
    "product_type": "checking",
    "bonus_amount": 275,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 100, "min_dd_total": 36000 },
      { "bonus": 150, "min_dd_total": 36000 },
      { "bonus": 275, "min_dd_total": 36000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 36000,
      "min_direct_deposit_per_deposit": 12000,
      "dd_count_required": 3,
      "deposit_window_days": 120,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "AIM Checking. Up to $275 tiered: $100 for three $12,000+ DDs, $50 for three auto transfers, $25 for nine Bill Pay payments, $100 for 45 debit purchases."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CO", "IA", "IL", "KS", "TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in CO, IA, IL, KS, TX. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": null },
    "source_links": ["https://www.tbkbank.com/"],
    "raw_excerpt": "$275 tiered checking bonus. AIM Checking. 3x $12000 DD + auto transfers + Bill Pay + debit. CO, IA, IL, KS, TX."
  },
  {
    "id": "point-breeze-275-checking-2026",
    "expired": true,
    "bank_name": "Point Breeze Credit Union",
    "product_type": "checking",
    "bonus_amount": 275,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 400,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 45,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 12,
      "billpay_required": null,
      "other_requirements_text": "$400+ DD within 45 days + 12 debit card swipes within 45 days + eStatement enrollment."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MD"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Maryland residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 45, "must_remain_open_days": null },
    "source_links": ["https://www.pointbreezecu.com/"],
    "raw_excerpt": "$275 checking bonus. $400 DD + 12 debit + eStatements in 45 days. Maryland only."
  },
  {
    "id": "america-first-250-checking-2026",
    "expired": true,
    "bank_name": "America First Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Personal Checking. $500+ in direct deposits within 60 days. Stackable with youth savings bonus."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AZ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Arizona residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.americafirst.com/"],
    "raw_excerpt": "$250 checking bonus with $500 DD in 60 days. Arizona only. Stackable with youth savings bonus."
  },
  {
    "id": "unify-financial-250-checking-2026",
    "bank_name": "UNIFY Financial Credit Union",
    "product_type": "checking",
    "bonus_amount": 150,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Tiered bonus: $150 base for opening with debit card, +$50 for recurring ACH DD of $500+/month within 60 days, +up to $50 more for additional activity."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AR"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Arkansas residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.unifyfcu.com/Get3055", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$150 checking bonus per DoC. Arkansas only."
  },
  {
    "id": "compass-community-250-checking-2026",
    "expired": true,
    "bank_name": "Compass Community Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 750,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Free Directional Checking. $750 DD + $400 debit purchases within 90 days. Select CA counties only."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select California counties only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.compassccu.org/"],
    "raw_excerpt": "$250 checking bonus. $750 DD + $400 debit in 90 days. Select CA counties only."
  },
  {
    "id": "valley-strong-250-checking-2026",
    "expired": true,
    "bank_name": "Valley Strong Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 12,
      "billpay_required": null,
      "other_requirements_text": "Personal Checking. Monthly DD OR 12+ debit/credit card transactions per month within 90 days. Select CA counties only."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select California counties only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.valleystrong.com/"],
    "raw_excerpt": "$250 checking bonus. Monthly DD or 12 debit transactions in 90 days. Select CA counties."
  },
  {
    "id": "california-credit-union-250-checking-2026",
    "bank_name": "California Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 400,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 120,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "eChecking Account. $400 DD within 120 days + maintain 3 months recurring DD."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "California residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": null },
    "source_links": ["https://www.ccu.com/", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$250 checking bonus. eChecking. $400 DD in 120 days + 3 months recurring DD. California only."
  },
  {
    "id": "advia-credit-union-250-checking-2026",
    "expired": true,
    "bank_name": "Advia Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 400,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 20,
      "billpay_required": null,
      "other_requirements_text": "Requires $400+ monthly e-deposits, 20+ debit/credit purchases per month, and Advantage Plus status. Ongoing monthly qualification."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IL", "MI", "WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in IL, MI, WI. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.adviacu.org/"],
    "raw_excerpt": "$250 checking bonus. $400 monthly e-deposits + 20 debit purchases + Advantage Plus status. IL, MI, WI."
  },
  {
    "id": "honor-credit-union-250-checking-2026",
    "bank_name": "Honor Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 8,
      "billpay_required": null,
      "other_requirements_text": "Requires $500 DD + 8 debit card purchases within 60 days. Hard credit pull required. Free checking account."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": true, "soft_pull": false, "screening_notes": "Hard credit pull required." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Michigan residents only. New members only. Hard pull required."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.honorcu.com/", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$250 checking bonus. $500 DD + 8 debit in 60 days. Hard pull required. Michigan only."
  },
  {
    "id": "associated-healthcare-250-checking-2026",
    "expired": true,
    "bank_name": "Associated Healthcare Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 20,
      "billpay_required": null,
      "other_requirements_text": "Requires $500 DD + 20 debit card purchases ($5+ each) within 60 days. eStatements and online banking enrollment required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Minnesota residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.associatedhealthcarecu.com/"],
    "raw_excerpt": "$250 checking bonus. $500 DD + 20 debit ($5+) in 60 days. eStatements required. Minnesota only."
  },
  {
    "id": "rev-federal-250-checking-2026",
    "expired": true,
    "bank_name": "REV Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Requires $500+ direct deposits AND $500+ debit card spending within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NC", "SC"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NC and SC. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.revfcu.com/"],
    "raw_excerpt": "$250 checking bonus. $500 DD + $500 debit spending in 60 days. NC and SC."
  },
  {
    "id": "valleystar-250-checking-2026",
    "expired": true,
    "bank_name": "ValleyStar Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$1,000+ DD maintained for 3 consecutive months within 150-day window. Offers 1.00% APY on balances $500-$10,000."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NC", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NC and VA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 150, "must_remain_open_days": null },
    "source_links": ["https://www.valleystar.org/"],
    "raw_excerpt": "$250 checking bonus. $1000 DD for 3 consecutive months. 1.00% APY on $500-$10k. NC and VA."
  },
  {
    "id": "propell-credit-union-250-checking-2026",
    "expired": true,
    "bank_name": "Propell Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 250,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "iSave Checking. Direct deposit matched up to $250 within 30 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Pennsylvania residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.propellcu.org/"],
    "raw_excerpt": "$250 checking bonus. DD matched up to $250 in 30 days. iSave Checking. Pennsylvania only."
  },
  {
    "id": "shell-fcu-250-checking-2026",
    "expired": true,
    "bank_name": "Shell Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 2000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "New member. $2,000 ACH direct deposits within 90 days. eStatements enrollment. Online Digital Banking access. Harris County, TX area."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Harris County, Texas area. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.shellfcu.org/"],
    "raw_excerpt": "$250 checking bonus. $2000 ACH DD in 90 days + eStatements. Harris County, TX area."
  },
  {
    "id": "credit-union-of-texas-250-checking-2026",
    "expired": true,
    "bank_name": "Credit Union of Texas",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 600,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 250,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Promo code 250. $250 opening deposit required. $600 recurring DD within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Texas residents only. Promo code 250. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.cutx.org/"],
    "raw_excerpt": "$250 checking bonus. Promo 250. $250 opening deposit + $600 DD in 60 days. Texas only."
  },
  {
    "id": "georgias-own-240-checking-2026",
    "expired": true,
    "bank_name": "Georgia's Own Credit Union",
    "product_type": "checking",
    "bonus_amount": 240,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "All Access Checking. Up to $240. $1,500 monthly minimum DD + 15 debit card transactions monthly. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["GA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Georgia residents only. Expires June 30, 2026. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.georgiasown.org/"],
    "raw_excerpt": "$240 checking bonus. $1500 monthly DD + 15 debit monthly. All Access Checking. Georgia only."
  },
  {
    "id": "cefcu-225-checking-2026",
    "expired": true,
    "bank_name": "CEFCU",
    "product_type": "checking",
    "bonus_amount": 225,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Up to $225. $200 base bonus for meeting one of: 5 debit purchases OR $500 DD OR $5,000/$10,000 balance. Additional $25 for eStatements."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "California residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 30, "must_remain_open_days": null },
    "source_links": ["https://www.cefcu.com/"],
    "raw_excerpt": "$225 checking bonus. 5 debit or $500 DD or balance req + $25 for eStatements. California only."
  },
  {
    "id": "desert-financial-200-checking-2026",
    "expired": true,
    "bank_name": "Desert Financial Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Free Checking. $500 minimum DD + eStatements enrollment + 10 debit card transactions within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AZ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Arizona residents only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.desertfinancial.com/"],
    "raw_excerpt": "$200 checking bonus. $500 DD + 10 debit + eStatements in 60 days. Arizona only."
  },
  {
    "id": "safe-1-credit-union-200-checking-2026",
    "bank_name": "Safe 1 Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Free Checking. $500 monthly DD OR 10 debit card transactions within 60 days. Kern, Kings, Tulare, Fresno counties only."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Kern, Kings, Tulare, Fresno counties in California only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.safe1.org/", "https://www.doctorofcredit.com/best-bank-account-bonuses/"],
    "raw_excerpt": "$200 checking bonus. $500 DD or 10 debit in 60 days. Select CA counties only."
  },
  {
    "id": "valley-first-200-checking-2026",
    "expired": true,
    "bank_name": "Valley First Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 750,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 100,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Purple Checking. $750 monthly DD over 100 days. Select CA counties only."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select California counties only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 100, "must_remain_open_days": null },
    "source_links": ["https://www.valleyfirstcu.org/"],
    "raw_excerpt": "$200 checking bonus. $750 monthly DD over 100 days. Purple Checking. Select CA counties."
  },
  {
    "id": "commonwealth-central-200-checking-2026",
    "expired": true,
    "bank_name": "CommonWealth Central Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": 180,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Rewards Checking. No spending required — just open account. Must maintain 6 months. Promo code SUMMER. Select CA counties."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select California counties only. Promo code SUMMER. New members only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": 180 },
    "source_links": ["https://www.ccfcu.org/"],
    "raw_excerpt": "$200 checking bonus. No spending required. Keep open 6 months. Promo SUMMER. Select CA counties."
  },
  {
    "id": "washington-trust-200-checking-2026",
    "expired": true,
    "bank_name": "Washington Trust Company",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 2,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Personal Checking. Two direct deposits (payroll/social security/pension) within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CT", "MA", "RI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in CT, MA, RI. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.washtrust.com/"],
    "raw_excerpt": "$200 checking bonus. 2 direct deposits in 90 days. CT, MA, RI."
  },
  {
    "id": "delta-community-200-checking-2026",
    "bank_name": "Delta Community Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 10,
      "billpay_required": null,
      "other_requirements_text": "Personal Checking. $1,000 DD within 90 days + 10+ debit card purchases within 90 days. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["GA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Georgia residents only. Expires June 30, 2026. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://www.deltacommunitycu.com/bank/checking-accounts",
      "https://www.doctorofcredit.com/delta-community-credit-union-250-checking-bonus-ga/"
    ],
    "raw_excerpt": "$200 checking bonus. $1000 DD + 10 debit in 90 days. Expires June 2026. Georgia only."
  },
  {
    "id": "horizon-credit-union-200-checking-2026",
    "bank_name": "Horizon Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": 250,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "$250 minimum funding within 5 business days. 15 debit card transactions within 60 days. eStatements enrollment required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["ID", "MT", "OR", "WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in ID, MT, OR, WA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.horizoncu.com/personal/checking-accounts/",
      "https://www.doctorofcredit.com/horizon-credit-union-200-checking-bonus-id-mt-or-wa/"
    ],
    "raw_excerpt": "$200 checking bonus. $250 opening + 15 debit in 60 days + eStatements. ID, MT, OR, WA."
  },
  {
    "id": "communityamerica-200-checking-2026",
    "expired": true,
    "bank_name": "CommunityAmerica Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 250,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "AtWork Checking. Monthly $250 DD within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["KS", "MO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in KS and MO. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.communityamerica.com/"],
    "raw_excerpt": "$200 checking bonus. AtWork Checking. $250 monthly DD in 60 days. KS and MO."
  },
  {
    "id": "credit-union-of-america-200-checking-2026",
    "expired": true,
    "bank_name": "Credit Union of America",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 500,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Free Core Checking. Must be educator or healthcare SEG member. $500 DD within 90 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["KS"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Kansas residents only. Must be educator or healthcare SEG member. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.cuofamerica.com/"],
    "raw_excerpt": "$200 checking bonus. $500 DD in 90 days. Educator/healthcare members. Kansas only."
  },
  {
    "id": "holyoke-credit-union-200-checking-2026",
    "expired": true,
    "bank_name": "Holyoke Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 6,
      "billpay_required": null,
      "other_requirements_text": "Simply FREE or NOW Checking. In-branch opening. 6 debit purchases within 60 days + recurring DD maintained for 3 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Massachusetts residents only. In-branch opening required. New members only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": ["https://www.holyokecu.com/"],
    "raw_excerpt": "$200 checking bonus. In-branch. 6 debit + recurring DD for 3 months. Massachusetts only."
  },
  {
    "id": "blaze-credit-union-200-checking-2026",
    "bank_name": "Blaze Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 6,
      "billpay_required": null,
      "other_requirements_text": "Requires direct deposit or automatic payment (any amount) plus 6 debit card purchases within 60 days. Free account."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MN", "WI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in MN and WI. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.blazecu.com/personal/checking/",
      "https://www.doctorofcredit.com/blaze-credit-union-225-checking-bonus-mn/"
    ],
    "raw_excerpt": "$200 checking bonus. DD or auto-pay + 6 debit in 60 days. MN and WI."
  },
  {
    "id": "people-first-fcu-200-checking-2026",
    "expired": true,
    "bank_name": "People First Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 700,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 45,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "Requires $700+ DD within 45 days plus 15 debit card transactions within 60 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NJ", "PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NJ and PA. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": ["https://www.peoplefirstfcu.org/"],
    "raw_excerpt": "$200 checking bonus. $700 DD in 45 days + 15 debit in 60 days. NJ and PA."
  },
  {
    "id": "1st-advantage-200-checking-2026",
    "expired": true,
    "bank_name": "1st Advantage Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Promo code CHECKING200. Monthly recurring direct deposit required plus $200+ debit card purchases within 60 days. Account must remain open for 180 days."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NC", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Available in NC and VA. Promo code CHECKING200. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": 180 },
    "source_links": ["https://www.1stadvantage.org/"],
    "raw_excerpt": "$200 checking bonus. Promo CHECKING200. DD + $200 debit in 60 days. NC and VA."
  },
  {
    "id": "north-state-bank-200-checking-2026",
    "expired": true,
    "bank_name": "North State Bank",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": 1,
      "deposit_window_days": 180,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 20,
      "billpay_required": null,
      "other_requirements_text": "Performance Checking 2.0. 20 debit card purchases and 1 direct deposit in a single statement cycle, between days 90-180. Monthly fee waived with $2,500+ balance."
    },
    "fees": { "monthly_fee": 10, "monthly_fee_waiver_text": "Waived with $2,500 balance.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NC"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "North Carolina residents only. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 180, "must_remain_open_days": null },
    "source_links": ["https://www.northstatebank.com/"],
    "raw_excerpt": "$200 checking bonus. 20 debit + 1 DD in statement cycle between days 90-180. NC only."
  },
  {
    "id": "myusa-credit-union-200-checking-2026",
    "bank_name": "MyUSA Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": 210,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Must maintain account for at least 210 days. Limited to Butler, Clark, Greene, Miami, Montgomery, and Warren Counties in Ohio."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select Ohio counties only (Butler, Clark, Greene, Miami, Montgomery, Warren). New members only."
    },
    "timeline": { "bonus_posting_days_est": 210, "must_remain_open_days": 210 },
    "source_links": [
      "https://www.myusacu.com/checking",
      "https://www.doctorofcredit.com/myusa-credit-union-200-checking-bonus-oh/"
    ],
    "raw_excerpt": "$200 checking bonus. Keep open 210 days. Select Ohio counties only."
  },
  {
    "id": "pinnacle-bank-200-checking-2026",
    "bank_name": "Pinnacle Bank",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 300,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": 100,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Grizzlies Checking. $100 minimum initial deposit. Enroll in eStatements. Expires May 30, 2026."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Tennessee residents only. Expires May 30, 2026. New checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": null },
    "source_links": [
      "https://www.pnfp.com/personal/bank/checking/",
      "https://www.doctorofcredit.com/pinnacle-financial-partners-200-mastercard-tn/"
    ],
    "raw_excerpt": "$200 checking bonus. Grizzlies Checking. $100 opening + eStatements. Expires May 2026. Tennessee only."
  },
  {
    "id": "public-employees-cu-200-checking-2026",
    "expired": true,
    "bank_name": "Public Employees Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Online banking registration. 5 signature-based debit card transactions of $10+ within 60 days. Select TX counties."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": "No monthly fee.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Low ChexSystems sensitivity." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Select Texas counties only. New members only."
    },
    "timeline": { "bonus_posting_days_est": 60, "must_remain_open_days": null },
    "source_links": [
      "https://www.pecuonline.org/personal/checking/",
      "https://www.doctorofcredit.com/public-employees-credit-union-200-checking-bonus-tx/"
    ],
    "raw_excerpt": "$200 checking bonus. 5 debit of $10+ in 60 days + online banking. Select TX counties."
  },
  {
    "id": "chase-business-checking-500-2026",
    "bank_name": "Chase",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 500,
    "cooldown_months": 24,
    "tiers": [
      { "bonus": 300, "min_dd_total": 2000 },
      { "bonus": 500, "min_dd_total": 10000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": 60,
      "min_opening_deposit": null,
      "min_balance": 10000,
      "debit_transactions_required": 5,
      "billpay_required": null,
      "other_requirements_text": "Deposit $10,000 in 30 days, maintain 60 days, 5 qualifying transactions in 90 days. Expires May 14, 2026."
    },
    "fees": { "monthly_fee": 15, "monthly_fee_waiver_text": "Waived with $2,000 minimum daily balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. Expires May 14, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.chase.com/business/banking/checking-offer",
      "https://www.doctorofcredit.com/chase-500-business-checking-bonus/"
    ],
    "raw_excerpt": "Chase $500 business checking bonus. $10k deposit in 30 days, maintain 60 days, 5 transactions in 90 days. Tiered: $300/$500. Expires May 14, 2026."
  },
  {
    "id": "bofa-business-advantage-750-2026",
    "bank_name": "Bank of America",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 750,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 400, "min_dd_total": 5000 },
      { "bonus": 750, "min_dd_total": 15000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": 60,
      "min_opening_deposit": null,
      "min_balance": 15000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Deposit $15,000 in 30 days, maintain 60 days. Expires Dec 31, 2026."
    },
    "fees": { "monthly_fee": 16, "monthly_fee_waiver_text": "Waived with $5,000 minimum daily balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business Advantage checking. Expires Dec 31, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://promotions.bankofamerica.com/smallbusiness/biz2toffer",
      "https://www.doctorofcredit.com/bank-of-america-750-business-checking-bonus/"
    ],
    "raw_excerpt": "Bank of America $750 business checking bonus. $15k deposit in 30 days, maintain 60 days. Tiered: $400/$750. Expires Dec 31, 2026."
  },
  {
    "id": "usbank-business-checking-1200-2026",
    "bank_name": "U.S. Bank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 1200,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 400, "min_dd_total": 5000 },
      { "bonus": 1200, "min_dd_total": 25000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": 60,
      "min_opening_deposit": null,
      "min_balance": 25000,
      "debit_transactions_required": 6,
      "billpay_required": null,
      "other_requirements_text": "Platinum Business Checking. $25,000 deposit in 30 days, maintain 60 days, 6 qualifying transactions. Promo Q2AFL26. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 30, "monthly_fee_waiver_text": "Waived with $15,000 minimum daily balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. Promo code Q2AFL26. Expires June 30, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.usbank.com/affiliate/business-checking/online-banking-bonus-a.html",
      "https://www.doctorofcredit.com/u-s-bank-1500-business-checking-bonus/"
    ],
    "raw_excerpt": "U.S. Bank $1,200 Platinum business checking bonus. $25k deposit in 30 days, maintain 60 days, 6 transactions. Promo Q2AFL26. Tiered: $400/$1,200. Expires June 30, 2026."
  },
  {
    "id": "wells-fargo-business-checking-825-2026",
    "bank_name": "Wells Fargo",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 825,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 400, "min_dd_total": 2500 },
      { "bonus": 825, "min_dd_total": 2500 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 2500,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$2,500 ending daily balance on days 30 and 60. Expires May 5, 2026."
    },
    "fees": { "monthly_fee": 10, "monthly_fee_waiver_text": "Waived with $500 minimum daily balance or $1,000 average ledger balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. Expires May 5, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.wellsfargo.com/biz/checking/",
      "https://www.doctorofcredit.com/wells-fargo-400-825-business-checking-bonus/"
    ],
    "raw_excerpt": "Wells Fargo $825 business checking bonus. $2,500 ending daily balance on days 30 and 60. Tiered: $400/$825. Expires May 5, 2026."
  },
  {
    "id": "bmo-business-checking-1000-2026",
    "bank_name": "BMO",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 1000,
    "cooldown_months": 12,
    "tiers": [
      { "bonus": 400, "min_dd_total": 4000 },
      { "bonus": 750, "min_dd_total": 25000 },
      { "bonus": 1000, "min_dd_total": 50000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 30,
      "holding_period_days": 90,
      "min_opening_deposit": null,
      "min_balance": 50000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Deposit in 30 days, maintain 90 days. Expires Apr 30, 2026."
    },
    "fees": { "monthly_fee": 15, "monthly_fee_waiver_text": "Waived with $5,000 minimum daily balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. Expires Apr 30, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.bmoharris.com/main/business-banking/bank-accounts/bb-checking-offer/",
      "https://www.doctorofcredit.com/bmo-1000-business-checking-bonus/"
    ],
    "raw_excerpt": "BMO $1,000 business checking bonus. Tiered: $400/$750/$1,000. Deposit in 30 days, maintain 90 days. Expires Apr 30, 2026."
  },
  {
    "id": "citi-business-checking-2000-2026",
    "bank_name": "Citi",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 2000,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 5000 },
      { "bonus": 500, "min_dd_total": 20000 },
      { "bonus": 1000, "min_dd_total": 50000 },
      { "bonus": 1500, "min_dd_total": 100000 },
      { "bonus": 2000, "min_dd_total": 200000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 45,
      "holding_period_days": 45,
      "min_opening_deposit": null,
      "min_balance": 200000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Deposit in 45 days, maintain 45 days. Expires July 7, 2026."
    },
    "fees": { "monthly_fee": 25, "monthly_fee_waiver_text": "Waived with $10,000 minimum combined balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA", "FL", "IL", "MD", "NV", "NY", "DC"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted: CA, FL, IL, MD, NV, NY, DC. Expires July 7, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.citi.com/business/checking",
      "https://www.doctorofcredit.com/citi-2000-business-checking-bonus/"
    ],
    "raw_excerpt": "Citi $2,000 business checking bonus. In-branch only. Tiered: $300/$500/$1,000/$1,500/$2,000. Deposit in 45 days, maintain 45 days. State restricted. Expires July 7, 2026."
  },
  {
    "id": "huntington-business-checking-1000-2026",
    "bank_name": "Huntington Bank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 1000,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 400, "min_dd_total": 5000 },
      { "bonus": 1000, "min_dd_total": 20000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": 60,
      "min_opening_deposit": null,
      "min_balance": 20000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$20,000 deposit in 60 days, maintain 60 days. Expires June 16, 2026."
    },
    "fees": { "monthly_fee": 20, "monthly_fee_waiver_text": "Waived with $5,000 minimum daily balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OH", "MI", "IN", "PA", "KY", "WV", "IL", "CO", "MN", "SC", "WI", "NC", "TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted. Expires June 16, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.huntington.com/business-banking-promotions-offers",
      "https://www.doctorofcredit.com/huntington-1000-business-checking-bonus/"
    ],
    "raw_excerpt": "Huntington Bank $1,000 business checking bonus. $20k deposit in 60 days, maintain 60 days. Tiered: $400/$1,000. State restricted. Expires June 16, 2026."
  },
  {
    "id": "mt-bank-business-checking-1500-2026",
    "bank_name": "M&T Bank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 1500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 300, "min_dd_total": 5000 },
      { "bonus": 500, "min_dd_total": 15000 },
      { "bonus": 750, "min_dd_total": 30000 },
      { "bonus": 1500, "min_dd_total": 100000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 100000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Balance-based tiers in 3rd month. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 25, "monthly_fee_waiver_text": "Waived with qualifying balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CT", "DC", "DE", "MD", "NJ", "NY", "PA", "VA", "WV"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted: CT, DC, DE, MD, NJ, NY, PA, VA, WV. Expires June 30, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://campaigns.mtb.com/bizbonus",
      "https://www.doctorofcredit.com/mt-bank-1500-business-checking-bonus/"
    ],
    "raw_excerpt": "M&T Bank $1,500 business checking bonus. Balance-based tiers in 3rd month. Tiered: $300/$500/$750/$1,500. State restricted. Expires June 30, 2026."
  },
  {
    "id": "pnc-business-checking-1000-2026",
    "bank_name": "PNC Bank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 1000,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 400, "min_dd_total": 2000 },
      { "bonus": 500, "min_dd_total": 30000 },
      { "bonus": 1000, "min_dd_total": 100000 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 100000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Enterprise tier: $100k balance for 3 billing cycles. Expires June 30, 2026."
    },
    "fees": { "monthly_fee": 25, "monthly_fee_waiver_text": "Waived with qualifying balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. Expires June 30, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.pnc.com/en/small-business/banking/business-checking-overview/business-checking-offer.html",
      "https://www.doctorofcredit.com/pnc-1000-business-checking-bonus/"
    ],
    "raw_excerpt": "PNC Bank $1,000 business checking bonus. Enterprise: $100k balance for 3 cycles. Tiered: $400/$500/$1,000. Expires June 30, 2026."
  },
  {
    "id": "fulton-bank-business-500-2026",
    "bank_name": "Fulton Bank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 60,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 5000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$5,000 deposit in 60 days. Expires July 15, 2026."
    },
    "fees": { "monthly_fee": 10, "monthly_fee_waiver_text": "Waived with qualifying balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["DE", "DC", "MD", "NJ", "PA", "VA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted: DE, DC, MD, NJ, PA, VA. Expires July 15, 2026. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.fultonbank.com/offers/small-business-checking",
      "https://www.doctorofcredit.com/fulton-bank-500-business-checking-bonus/"
    ],
    "raw_excerpt": "Fulton Bank $500 business checking bonus. $5,000 deposit in 60 days. State restricted. Expires July 15, 2026."
  },
  {
    "id": "keybank-business-500-2026",
    "bank_name": "KeyBank",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Business checking bonus. See KeyBank for full details."
    },
    "fees": { "monthly_fee": 15, "monthly_fee_waiver_text": "Waived with qualifying balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AK", "CO", "CT", "ID", "IN", "MA", "ME", "MI", "NY", "OH", "OR", "PA", "UT", "VT", "WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 90, "must_remain_open_days": 180 },
    "source_links": [
      "https://www.key.com/small-business/small-business-checking/small-business-checking.jsp",
      "https://www.doctorofcredit.com/keybank-500-business-checking-bonus/"
    ],
    "raw_excerpt": "KeyBank $500 business checking bonus. In-branch only. State restricted: AK, CO, CT, ID, IN, MA, ME, MI, NY, OH, OR, PA, UT, VT, WA."
  },
  {
    "id": "central-bank-business-500-2026",
    "expired": true,
    "bank_name": "Central Bank of the Midwest",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 3000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$3,000 balance at day 90. Promo code 500BB18."
    },
    "fees": { "monthly_fee": 10, "monthly_fee_waiver_text": "Waived with qualifying balance.", "early_closure_fee": null },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OK", "IL", "KS", "MO", "CO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. State restricted: OK, IL, KS, MO, CO. Promo code 500BB18. New business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": 120, "must_remain_open_days": 180 },
    "source_links": ["https://www.centralbank.com/"],
    "raw_excerpt": "Central Bank of the Midwest $500 business checking bonus. $3,000 balance at day 90. Promo 500BB18. State restricted."
  },
  {
    "id": "hsbc-premier-checking-2026",
    "bank_name": "HSBC",
    "product_type": "checking",
    "bonus_amount": 1500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 600, "min_dd_total": 75000 },
      { "bonus": 1500, "min_dd_total": 150000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 150000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "High-balance offer. $600 at $75,000 in deposits, $1,500 at $150,000+ in deposits."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "High-balance offer. New HSBC Premier checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.us.hsbc.com/checking-accounts/products/premier/",
      "https://www.doctorofcredit.com/hsbc-premier-checking-bonus/"
    ],
    "raw_excerpt": "HSBC Premier checking bonus up to $1,500. Tiered: $600 at $75k deposits, $1,500 at $150k+ deposits."
  },
  {
    "id": "usaa-300-checking-2026",
    "bank_name": "USAA",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Military eligible only. Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Military members and families only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.usaa.com/campaign/banking/checking-bonus",
      "https://www.doctorofcredit.com/usaa-300-checking-bonus/"
    ],
    "raw_excerpt": "USAA $300 checking bonus. Military eligible only. Direct deposit required."
  },
  {
    "id": "penfed-300-checking-2026",
    "bank_name": "PenFed",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "YMMV/targeted. Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "YMMV/targeted offer. New PenFed checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.penfed.org/checking/access-america-checking",
      "https://www.doctorofcredit.com/penfed-credit-union-300-checking-bonus/"
    ],
    "raw_excerpt": "PenFed $300 checking bonus. YMMV/targeted. Direct deposit required."
  },
  {
    "id": "nasa-fcu-300-checking-2026",
    "bank_name": "NASA Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 1500,
      "min_direct_deposit_per_deposit": 500,
      "dd_count_required": 3,
      "deposit_window_days": 120,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 45,
      "billpay_required": null,
      "other_requirements_text": "Open a new NASA Federal Checking account (Everyday Checking recommended — it's the only tier whose fee is waived by DD). Establish $500+ monthly recurring DD for 3 consecutive months AND 15 debit card purchases (PIN or signature) per month for 3 consecutive months, all within 120 days of account opening. Must be a member; membership available via NASA FCU partnerships."
    },
    "fees": { "monthly_fee": 8, "monthly_fee_waiver_text": "Everyday Checking: $8/mo, waived with $500+ monthly direct deposit OR $200 average daily balance (the bonus DD requirement automatically meets the waiver). Elite ($10/mo) and Premium ($7/mo) tiers have NO fee waiver — avoid these if you're chasing the bonus.", "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Soft pull reported. Tier selection matters: Everyday Checking is the only tier whose $8/mo fee is waived by the bonus DD. Elite ($10/mo) and Premium ($7/mo) tiers will eat $21–30 of your bonus over the 3-month qualification window. Verified 2026-04 from nasafcu.com." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Membership required (join via NASA FCU membership path). One bonus per member per year; may require existing membership per recent DoC update."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.nasafcu.com/personal/checking-savings/checking/checking-300---member",
      "https://www.doctorofcredit.com/nasa-federal-credit-union-300-checking-bonus/"
    ],
    "raw_excerpt": "NASA FCU $300 Premier eChecking bonus: $500+ monthly DD and 15 debit purchases/month for 3 consecutive months within 120 days. $8 monthly fee waived with $500 DD or $200 ADB."
  },
  {
    "id": "schwab-referral-500-checking-2026",
    "bank_name": "Charles Schwab",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 100, "min_dd_total": 25000 },
      { "bonus": 300, "min_dd_total": 50000 },
      { "bonus": 500, "min_dd_total": 100000 }
    ],
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 100000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": 365,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Referral required. Tiered: $100 at $25k, $300 at $50k, $500 at $100k. 12-month hold."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Referral required. New Schwab checking customers only. 12-month hold period."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": 365 },
    "source_links": [
      "https://www.schwab.com/client-referral?refrid=REFERE7P2ZQBK",
      "https://www.schwab.com/public/schwab/nn/refer-prospect.html"
    ],
    "raw_excerpt": "Charles Schwab $500 checking bonus via referral. Tiered: $100 at $25k, $300 at $50k, $500 at $100k. 12-month hold."
  },
  {
    "id": "upgrade-200-checking-2026",
    "bank_name": "Upgrade",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Referral bonus. Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Referral bonus. New Upgrade checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.upgrade.com/funnel/borrower-documents/PROMOTION_AGREEMENT",
      "https://www.upgrade.com/"
    ],
    "raw_excerpt": "Upgrade $200 checking bonus. Referral bonus. Direct deposit required."
  },
  {
    "id": "bluevine-business-500-2026",
    "bank_name": "BlueVine",
    "product_type": "checking",
    "business": true,
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": 5000,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Business checking bonus. $5,000 deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": "Standard business verification." },
    "eligibility": {
      "state_restricted": false,
      "states_allowed": ["Nationwide (U.S.)"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "Business checking. New BlueVine business checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.bluevine.com/partner/nw300-checking",
      "https://www.bluevine.com/"
    ],
    "raw_excerpt": "BlueVine $500 business checking bonus. $5,000 deposit required."
  },
  {
    "id": "stanford-fcu-620-checking-2026",
    "bank_name": "Stanford Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 620,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required. Also has $250 and $500 tiers."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: CA. New Stanford FCU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.sfcu.org/bonus/",
      "https://www.sfcu.org/"
    ],
    "raw_excerpt": "Stanford Federal Credit Union $620 checking bonus. CA only. Direct deposit required. Also $250/$500 tiers."
  },
  {
    "id": "redstone-fcu-600-checking-2026",
    "expired": true,
    "bank_name": "Redstone Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 600,
    "cooldown_months": null,
    "tiers": [
      { "bonus": 500, "min_dd_total": 0 },
      { "bonus": 600, "min_dd_total": 0 }
    ],
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "No direct deposit required. Tiered: $500 and $600."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["AL", "TN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: AL, TN. New Redstone FCU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": ["https://www.redfcu.org/"],
    "raw_excerpt": "Redstone Federal Credit Union $600 checking bonus. AL, TN only. No DD required. Tiered: $500/$600."
  },
  {
    "id": "citadel-cu-500-checking-2026",
    "expired": true,
    "bank_name": "Citadel Credit Union",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required. $300 checking + $200 savings."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["PA", "DE", "OH", "NY", "NJ", "MD", "WV"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: PA, DE, OH, NY, NJ, MD, WV. New Citadel CU customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": ["https://www.citadelbanking.com/"],
    "raw_excerpt": "Citadel Credit Union $500 checking bonus. $300 checking + $200 savings. DD required. PA, DE, OH, NY, NJ, MD, WV."
  },
  {
    "id": "visions-fcu-500-checking-2026",
    "bank_name": "Visions Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NY", "PA", "NJ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: NY, PA, NJ. New Visions FCU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.visionsfcu.org/",
      "https://www.doctorofcredit.com/ny-pa-nj-visions-federal-credit-union-200-checking-bonus/"
    ],
    "raw_excerpt": "Visions Federal Credit Union $500 checking bonus. NY, PA, NJ only. Direct deposit required."
  },
  {
    "id": "metro-cu-500-checking-2026",
    "bank_name": "Metro Credit Union",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA", "NH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MA, NH. New Metro CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.metrocu.org/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Metro Credit Union $500 checking bonus. MA, NH only. Direct deposit required."
  },
  {
    "id": "fidelity-bank-pa-500-checking-2026",
    "bank_name": "Fidelity Bank (PA)",
    "product_type": "checking",
    "bonus_amount": 500,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Northeastern PA only. See Fidelity Bank for full details."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["PA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: PA (Northeastern PA only). New Fidelity Bank checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.bankatfidelity.com/summer-checking-bonus/",
      "https://www.fidelitydeposit.com/"
    ],
    "raw_excerpt": "Fidelity Bank (PA) $500 checking bonus. Northeastern PA only."
  },
  {
    "id": "travis-cu-475-checking-2026",
    "bank_name": "Travis Credit Union",
    "product_type": "checking",
    "bonus_amount": 475,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: CA. New Travis CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.traviscu.org/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Travis Credit Union $475 checking bonus. CA only. Direct deposit required."
  },
  {
    "id": "4front-cu-400-checking-2026",
    "bank_name": "4Front Credit Union",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": 15,
      "billpay_required": null,
      "other_requirements_text": "No direct deposit required. 15 debit card uses per month for 3 months."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MI"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MI. New 4Front CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.4frontcu.com/4front-400",
      "https://www.4frontcu.com/"
    ],
    "raw_excerpt": "4Front Credit Union $400 checking bonus. MI only. No DD required. 15 debit uses for 3 months."
  },
  {
    "id": "wecu-400-checking-2026",
    "bank_name": "WECU",
    "product_type": "checking",
    "bonus_amount": 250,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["WA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: WA. New WECU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.wecu.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "WECU $250 checking bonus. WA only. Direct deposit required."
  },
  {
    "id": "country-bank-400-checking-2026",
    "bank_name": "Country Bank",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "No direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA", "NH", "ME", "RI", "CT", "VT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MA, NH, ME, RI, CT, VT. New Country Bank checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.countrybank.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Country Bank $400 checking bonus. MA, NH, ME, RI, CT, VT. No direct deposit required."
  },
  {
    "id": "purdue-fcu-400-checking-2026",
    "bank_name": "Purdue Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 400,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Lake & Porter County, IN only."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["IN"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: IN (Lake & Porter County). New Purdue FCU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.purduefed.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Purdue Federal Credit Union $400 checking bonus. IN only (Lake & Porter County)."
  },
  {
    "id": "flushing-bank-350-checking-2026",
    "bank_name": "Flushing Bank",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NY", "NJ"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: NY, NJ. New Flushing Bank checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.flushingbank.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Flushing Bank $350 checking bonus. NY, NJ only. Direct deposit required."
  },
  {
    "id": "frontwave-cu-350-checking-2026",
    "bank_name": "Frontwave Credit Union",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: CA. New Frontwave CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.frontwavecu.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Frontwave Credit Union $350 checking bonus. CA only. Direct deposit required."
  },
  {
    "id": "peoplesbank-350-checking-2026",
    "bank_name": "PeoplesBank (Bankatpeoples)",
    "product_type": "checking",
    "bonus_amount": 350,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "No direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA", "CT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MA, CT. New PeoplesBank checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.bankatpeoples.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "PeoplesBank $350 checking bonus. MA, CT only. No direct deposit required."
  },
  {
    "id": "grow-financial-300-checking-2026",
    "bank_name": "Grow Financial FCU",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Military also eligible."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["FL", "SC"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: FL, SC. Military also eligible. New Grow Financial checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.growfinancial.org/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Grow Financial FCU $300 checking bonus. FL, SC. Military also eligible."
  },
  {
    "id": "berkshire-bank-300-checking-2026",
    "bank_name": "Berkshire Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "$300 checking bonus plus $360 streaming credit."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MA", "NY", "CT", "RI", "VT"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MA, NY, CT, RI, VT. New Berkshire Bank checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.berkshirebank.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Berkshire Bank $300 checking bonus plus $360 streaming credit. MA, NY, CT, RI, VT."
  },
  {
    "id": "camden-national-300-checking-2026",
    "bank_name": "Camden National Bank",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["ME", "NH"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: ME, NH. New Camden National checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.camdennational.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Camden National Bank $300 checking bonus. ME, NH only. Direct deposit required."
  },
  {
    "id": "gecu-fcu-300-checking-2026",
    "bank_name": "GECU Federal Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["NM", "TX"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: NM, TX. New GECU FCU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.gecu.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "GECU Federal Credit Union $300 checking bonus. NM, TX only. Direct deposit required."
  },
  {
    "id": "safe-cu-300-checking-2026",
    "bank_name": "SAFE Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": false,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "No direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: CA. New SAFE CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.safecu.org/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "SAFE Credit Union $300 checking bonus. CA only. No direct deposit required."
  },
  {
    "id": "sacramento-cu-300-checking-2026",
    "bank_name": "Sacramento Credit Union",
    "product_type": "checking",
    "bonus_amount": 200,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["CA"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: CA. New Sacramento CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.sactocu.org/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Sacramento Credit Union $200 checking bonus. CA only. Direct deposit required."
  },
  {
    "id": "unitus-cu-300-checking-2026",
    "bank_name": "Unitus Community Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["OR"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: OR. New Unitus CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://www.unitusccu.com/",
      "https://www.doctorofcredit.com/best-bank-account-bonuses/"
    ],
    "raw_excerpt": "Unitus Community Credit Union $300 checking bonus. OR only. Direct deposit required."
  },
  {
    "id": "alltru-cu-300-checking-2026",
    "bank_name": "AllTru Credit Union",
    "product_type": "checking",
    "bonus_amount": 300,
    "cooldown_months": null,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": null,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": null,
      "holding_period_days": null,
      "min_opening_deposit": null,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Direct deposit required."
    },
    "fees": { "monthly_fee": 0, "monthly_fee_waiver_text": null, "early_closure_fee": 0 },
    "screening": { "chex_sensitive": "low", "hard_pull": false, "soft_pull": true, "screening_notes": null },
    "eligibility": {
      "state_restricted": true,
      "states_allowed": ["MO"],
      "states_excluded": [],
      "lifetime_language": true,
      "eligibility_notes": "State restricted: MO. New AllTru CU checking customers only."
    },
    "timeline": { "bonus_posting_days_est": null, "must_remain_open_days": null },
    "source_links": [
      "https://alltrucu.org/checking/personal-checking/",
      "https://www.alltrucu.com/"
    ],
    "raw_excerpt": "AllTru Credit Union $300 checking bonus. MO only. Direct deposit required."
  }
]
