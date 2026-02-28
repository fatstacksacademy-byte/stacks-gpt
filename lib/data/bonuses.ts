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
      "https://paconsumercouncil.org/",
      "https://prps.org/join-now",
      "https://refer.psecu.com/Clayton4",
      "https://www.doctorofcredit.com/pa-only-psecu-100-250-checking-bonus/",
      "https://www.profitablecontent.com/psecu-300-checking-bonus/",
      "https://go.psecu.com/refer?extole_share_channel=%5C%22SHARE_LINK%5C%22&extole_shareable_code=Clayton4"
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
    "bonus_amount": 100,
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
    "bonus_amount": 400,
    "cooldown_months": 12,
    "requirements": {
      "direct_deposit_required": true,
      "min_direct_deposit_total": 4000,
      "min_direct_deposit_per_deposit": null,
      "dd_count_required": null,
      "deposit_window_days": 90,
      "holding_period_days": null,
      "min_opening_deposit": 25,
      "min_balance": null,
      "debit_transactions_required": null,
      "billpay_required": null,
      "other_requirements_text": "Open eligible checking account from 2026-01-29 to 2026-05-04, complete cumulative $4,000 qualifying direct deposits in 90 days, and keep account open/in good standing with balance > 0 when paid."
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
    "bonus_amount": 300,
    "cooldown_months": null,
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
      "other_requirements_text": "First qualifying direct deposit must post by 2026-12-31. Tiered bonus: $50 for $1,000-$4,999 total DD, $300 for $5,000+ total DD within the 25-day evaluation window."
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
      "https://www.usbank.com/bank-accounts/checking-accounts/bank-smartly-checking.html"
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
  }
]
