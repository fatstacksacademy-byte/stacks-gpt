import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const connecticutCards = buildStateCards({
  state: "CT",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    aefcu: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "American Eagle Financial Credit Union (AEFCU, HQ East Hartford, CT) is open to anyone who lives, works, worships, or attends school in the Connecticut counties of Hartford, Middlesex, New Haven, or Tolland, OR in Hampden County, Massachusetts; plus anyone who works regularly in the healthcare industry anywhere in Connecticut, plus immediate family/household of members. Cards are marketed to 'our CT and MA members.' A small savings deposit establishes membership. No nationwide association or donation backdoor.",
      eligibility_source:
        "https://www.americaneagle.org/Learn/About-AEFCU/Membership/Become-a-Member",
    },
    sikorsky: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Sikorsky Credit Union (HQ Stratford, CT) is a Connecticut state-chartered credit union open to those who live, work, volunteer, or worship in Fairfield, New Haven, or Hartford counties, Connecticut, plus eligible family. A savings deposit establishes membership. No nationwide association or donation backdoor.",
      eligibility_source: "https://www.sikorskycu.org/membership-benefits",
    },
    dutchpoint: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Dutch Point Credit Union (HQ Wethersfield, CT) is open to anyone who lives, works, worships, attends school, or conducts business in the Connecticut counties of Hartford, New Haven, New London, or Middlesex, plus family members of current members. A savings deposit establishes membership. No nationwide association or donation backdoor.",
      eligibility_source: "https://www.dutchpoint.org/about-us/membership/",
    },
  },
  seeds: [
    {
      id: "aefcu-signature-visa",
      card_name: "American Eagle Signature Visa Credit Card",
      issuer: "american-eagle-fcu",
      offer_link:
        "https://www.americaneagle.org/Borrow/Credit-Cards/Visa-Credit-Cards/Signature-Visa-Credit-Card",
      key_benefits: [
        "Earn points on every purchase, redeemable for statement credits, merchandise, and travel",
        "2.99% intro APR on purchases and 0% intro APR on balance transfers for the first 12 months; then 14.90%-18.00% variable",
        "No annual fee, no foreign transaction fee, plus travel and purchase protections",
      ],
      eligibility: "aefcu",
      state_restricted: ["CT", "MA"],
      cpp_value: 0.01,
      intro_apr: {
        purchase_apr_months: 12,
        bt_apr_months: 12,
        go_to_apr_low: 14.9,
        go_to_apr_high: 18.0,
      },
      travel: { no_foreign_tx_fee: true },
      protections: { extended_warranty: true },
    },
    {
      id: "aefcu-platinum-rewards-visa",
      card_name: "American Eagle Platinum Rewards Visa Credit Card",
      issuer: "american-eagle-fcu",
      offer_link:
        "https://www.americaneagle.org/Borrow/Credit-Cards/Visa-Credit-Cards/Platinum-Rewards-Visa-Credit-Card",
      key_benefits: [
        "Earn points on every purchase, redeemable for rewards and cash back",
        "2.99% intro APR on purchases and 0% intro APR on balance transfers for the first 12 months; then 15.90%-18.00% variable",
        "No annual fee",
      ],
      eligibility: "aefcu",
      state_restricted: ["CT", "MA"],
      cpp_value: 0.01,
      intro_apr: {
        purchase_apr_months: 12,
        bt_apr_months: 12,
        go_to_apr_low: 15.9,
        go_to_apr_high: 18.0,
      },
    },
    {
      id: "aefcu-secured-visa",
      card_name: "American Eagle Secured Visa Credit Card",
      issuer: "american-eagle-fcu",
      offer_link:
        "https://www.americaneagle.org/loans/credit-cards/secured-visa-credit-card",
      key_benefits: [
        "Build or rebuild credit with a credit line secured by your American Eagle savings",
        "$250 minimum credit line available; low variable interest rate",
        "No annual fee; cell phone protection when you pay your phone bill with the card",
      ],
      eligibility: "aefcu",
      state_restricted: ["CT", "MA"],
      credit_score_required: "poor",
      protections: { cell_phone_protection: true },
    },
    {
      id: "sikorsky-visa-advantage",
      card_name: "Sikorsky Credit Union Visa Advantage Credit Card",
      issuer: "sikorsky-cu",
      offer_link:
        "https://www.sikorskycu.org/loans-credit-cards/personal-credit-cards-old/visa-advantage",
      key_benefits: [
        "Earn 3 points per $1 on gas and auto, 2 points per $1 on travel and entertainment, and 1 point per $1 on everything else",
        "0% intro APR for 12 months on balance transfers made within 90 days (2% balance transfer fee)",
        "No annual fee; variable go-to APR as low as 15.50%",
      ],
      eligibility: "sikorsky",
      cpp_value: 0.01,
      rewards: [
        { categories: ["gas_stations"], multiplier: 3 },
        { categories: ["travel", "entertainment"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1 },
      ],
      intro_apr: {
        bt_apr_months: 12,
        bt_fee_pct: 2,
        bt_window_days: 90,
        go_to_apr_low: 15.5,
      },
    },
    {
      id: "sikorsky-visa-platinum",
      card_name: "Sikorsky Credit Union Visa Platinum Credit Card",
      issuer: "sikorsky-cu",
      offer_link:
        "https://www.sikorskycu.org/loans-credit-cards/personal-credit-cards-old/visa-platinum",
      key_benefits: [
        "Low-rate card: variable go-to APR as low as 12.50% on purchases and balance transfers",
        "2.99% intro APR on new purchases made within 180 days of account opening",
        "0% intro APR for 12 months on balance transfers made within 90 days (2% balance transfer fee); no annual fee",
      ],
      eligibility: "sikorsky",
      intro_apr: {
        bt_apr_months: 12,
        bt_fee_pct: 2,
        bt_window_days: 90,
        go_to_apr_low: 12.5,
      },
    },
    {
      id: "dutchpoint-signature-visa",
      card_name: "Dutch Point Visa Signature Credit Card",
      issuer: "dutch-point-cu",
      offer_link: "https://www.dutchpoint.org/spend/signature-credit-card",
      key_benefits: [
        "1.5% cash back on all purchases",
        "$150 bonus after spending $1,500 in the first 90 days",
        "No annual fee; 17.99% variable APR",
      ],
      eligibility: "dutchpoint",
      bonus_amount: 150,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 1500,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1.5, unit: "%" }],
      intro_apr: { go_to_apr_low: 17.99, go_to_apr_high: 17.99 },
    },
    {
      id: "dutchpoint-platinum-visa",
      card_name: "Dutch Point Visa Platinum Credit Card",
      issuer: "dutch-point-cu",
      offer_link: "https://www.dutchpoint.org/spend/platinum-credit-card",
      key_benefits: [
        "Earn 1 point per $1 spent, redeemable for travel, gift cards, and merchandise",
        "5,000 bonus points immediately after your first transaction",
        "No annual fee and no balance transfer fee; 13.50%-17.99% variable APR with 0% intro APR on balance transfers",
      ],
      eligibility: "dutchpoint",
      bonus_amount: 5000,
      bonus_currency: "points",
      cpp_value: 0.01,
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { bt_apr_months: 12, go_to_apr_low: 13.5, go_to_apr_high: 17.99 },
    },
    {
      id: "dutchpoint-essential-visa",
      card_name: "Dutch Point Visa Essential Credit Card",
      issuer: "dutch-point-cu",
      offer_link: "https://www.dutchpoint.org/spend/essential-credit-card",
      key_benefits: [
        "Low-rate card with a variable APR as low as 12.50%-17.99%",
        "0% introductory APR on balance transfers to consolidate higher-interest debt",
        "No annual fee",
      ],
      eligibility: "dutchpoint",
      intro_apr: { bt_apr_months: 12, go_to_apr_low: 12.5, go_to_apr_high: 17.99 },
    },
  ],
})
