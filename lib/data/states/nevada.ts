import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-13"

export const nevadaCards = buildStateCards({
  state: "NV",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    nevadaStateBank: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Nevada State Bank is a Nevada-chartered bank (subsidiary of Zions Bancorporation) with branches across Nevada. Its Reserve and Elite Visa credit cards are Zions own-brand in-house products — not Elan, FNBO, TCM, or any other white-label agent issuer. Accounts are opened through Nevada State Bank; no membership requirement beyond standard credit approval. Serves Nevada residents.",
      eligibility_source: "https://www.nsbank.com/personal/credit-cards/",
    },
    oneNevada: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "One Nevada CU has a community charter: membership is open to people who live, work, worship, or attend school in Clark, Nye, or Washoe counties, plus eligible family of members.",
      eligibility_source: "https://www.onenevada.org/open-a-new-account",
    },
    createCu: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Create Credit Union (formerly Clark County Credit Union) membership is open through Southern Nevada government/medical employer groups, 30+ select employer groups, Nevada Public Radio or Henderson Chamber membership, and family of members.",
      eligibility_source: "https://www.createcu.org/banking/who-can-join/",
    },
    silverState: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Silver State Schools CU membership is open to anyone who lives in Nevada (statewide field of membership), plus household and eligible family members; a $5 savings account opens membership.",
      eligibility_source:
        "https://www.silverstatecu.com/loans-and-credit-cards/credit-cards/cash-back-credit-card",
    },
    westStar: {
      eligibility_scope: "association",
      eligibility_notes:
        "WestStar CU membership requires Nevada residency plus an eligibility tie: employees of any Nevada-licensed gaming company, members of select employer groups, AAA Nevada or Friends of Nevada Wilderness members, and their household/family.",
      eligibility_source:
        "https://www.weststar.org/about/where-you-belong/become-a-member.html",
    },
  },
  seeds: [
    {
      id: "nevada-state-bank-reserve-visa-2026",
      card_name: "Nevada State Bank Reserve Visa",
      issuer: "nevada-state-bank",
      offer_link: "https://www.nsbank.com/personal/credit-cards/reserve-credit-card/",
      key_benefits: [
        "$500 cash back or 50,000 bonus points after $5,000 in purchases in the first 90 days",
        "Earn points or cash back on every purchase; premium Visa benefits",
        "Zions Bancorporation own-brand card — not a white-label product",
      ],
      eligibility: "nevadaStateBank",
      bonus_amount: 500,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 5000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "nevada-state-bank-elite-visa-2026",
      card_name: "Nevada State Bank Elite Visa",
      issuer: "nevada-state-bank",
      offer_link: "https://www.nsbank.com/personal/credit-cards/elite-credit-card/",
      key_benefits: [
        "$300 cash back or 30,000 bonus points after $5,000 in purchases in the first 90 days",
        "Earn points or cash back on every purchase",
        "Zions Bancorporation own-brand card — not a white-label product",
      ],
      eligibility: "nevadaStateBank",
      bonus_amount: 300,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 5000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "one-nevada-visa-signature-rewards",
      card_name: "One Nevada Credit Union Visa Signature Rewards",
      issuer: "one-nevada-cu",
      offer_link:
        "https://www.onenevada.org/personal-banking/credit-cards/visa-signature-rewards-credit-card",
      key_benefits: [
        "CURewards points on every purchase, redeemable for cash back, travel, or merchandise",
        "Variable APR as low as 11.75% (currently 13.50%-22.50%)",
        "Free auto rental damage waiver, travel accident insurance, and cell phone protection",
        "No annual fee",
      ],
      eligibility: "oneNevada",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      travel_insurance: { rental_cdw_secondary: true },
      protections: { cell_phone_protection: true, purchase_protection: true },
    },
    {
      id: "one-nevada-visa-platinum-rewards",
      card_name: "One Nevada Credit Union Visa Platinum Rewards",
      issuer: "one-nevada-cu",
      offer_link:
        "https://www.onenevada.org/personal-banking/credit-cards/visa-platinum-rewards-credit-card",
      key_benefits: [
        "CURewards points on every purchase, redeemable for cash back, travel, or merchandise",
        "Variable APR as low as 13.00%",
        "Credit limits up to $4,999 - built for steady monthly spenders",
        "Travel insurance included; no annual fee",
      ],
      eligibility: "oneNevada",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "one-nevada-visa-platinum-share-secured",
      card_name: "One Nevada Credit Union Visa Platinum Share Secured",
      issuer: "one-nevada-cu",
      offer_link:
        "https://www.onenevada.org/personal-banking/credit-cards/visa-platinum-share-secured-credit-card",
      key_benefits: [
        "Credit limit secured by your savings (a few hundred dollars up to $2,000)",
        "Fixed 17.00% APR",
        "Designed to build or rebuild credit",
        "No annual fee",
      ],
      eligibility: "oneNevada",
      credit_score_required: "poor",
    },
    {
      id: "create-cu-infinity-rewards-visa",
      card_name: "Create Credit Union Infinity Rewards Visa",
      issuer: "create-cu",
      offer_link: "https://www.createcu.org/Credit-Cards",
      key_benefits: [
        "1% cash back on all purchases with no earning cap",
        "No annual fee and no redemption fees",
        "High credit limit to help lower credit utilization",
        "Visa Auto Rental Collision Damage Waiver and Roadside Dispatch",
      ],
      eligibility: "createCu",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
    },
    {
      id: "create-cu-platinum-rewards-visa",
      card_name: "Create Credit Union Platinum Rewards Visa",
      issuer: "create-cu",
      offer_link: "https://www.createcu.org/Credit-Cards",
      key_benefits: [
        "0.50% cash back on all purchases",
        "No annual fee - a straightforward card to build credit",
        "No capped earning and no redemption fees",
        "Visa Auto Rental Collision Damage Waiver and Roadside Dispatch",
      ],
      eligibility: "createCu",
      rewards: [{ categories: ["everything_else"], multiplier: 0.5, unit: "%" }],
    },
    {
      id: "silver-state-schools-cash-back-visa",
      card_name: "Silver State Schools CU Cash Back Visa",
      issuer: "silver-state-schools-cu",
      offer_link:
        "https://www.silverstatecu.com/loans-and-credit-cards/credit-cards/cash-back-credit-card",
      key_benefits: [
        "2% cash back on every purchase",
        "Cash back paid out at the end of each calendar year",
        "Bonus benefits may include cell phone protection, trip cancellation protection, and buyer's protection",
        "No annual fee",
      ],
      eligibility: "silverState",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
    },
    {
      id: "silver-state-schools-low-rate-visa",
      card_name: "Silver State Schools CU Low Rate Visa",
      issuer: "silver-state-schools-cu",
      offer_link:
        "https://www.silverstatecu.com/loans-and-credit-cards/credit-cards/low-rate-credit-card/",
      key_benefits: [
        "The credit union's lowest interest rate, for members who carry a balance",
        "Variable APR tied to the Prime Rate",
        "No annual fee",
        "Available statewide to any Nevada resident",
      ],
      eligibility: "silverState",
    },
    {
      id: "weststar-flexrewards-platinum-mastercard",
      card_name: "WestStar CU FlexRewards Platinum Mastercard",
      issuer: "weststar-cu",
      offer_link:
        "https://www.weststar.org/_/kcms-doc/1230/49248/WCU_RatesFeesCost_FlexRewardsPlatinum.pdf",
      key_benefits: [
        "0% intro APR on purchases for the first 6 statement cycles, then 11.24%-18.00% variable",
        "FlexRewards points redeemable through the FLEXRewards portal",
        "No annual fee, no balance-transfer fee, and no cash-advance fee",
        "Low 1% foreign transaction fee",
      ],
      eligibility: "westStar",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { purchase_apr_months: 6, go_to_apr_low: 11.24, go_to_apr_high: 18 },
      foreign_tx_fee_pct: 1,
    },
  ],
})
