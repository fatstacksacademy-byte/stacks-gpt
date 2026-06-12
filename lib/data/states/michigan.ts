import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const michiganCards = buildStateCards({
  state: "MI",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    dfcu: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "DFCU Financial membership is open to anyone who lives, works, worships, or attends school anywhere in Michigan's Lower Peninsula, or in the eight-county region from Tampa Bay to Naples, Florida; immediate family of members also qualify. No nationwide charitable-donation backdoor.",
      eligibility_source: "https://www.dfcufinancial.com/faqs",
    },
    laketrust: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Lake Trust Credit Union membership is open to anyone who lives, works, worships, or attends school in Michigan; a $5 Membership Savings deposit establishes membership. No nationwide charitable-donation backdoor disclosed.",
      eligibility_source: "https://laketrust.org/personal/banking/become-a-member",
    },
    frankenmuth: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Frankenmuth Credit Union membership is open to anyone who lives, works, worships, or was educated in the state of Michigan, or who is a relative of a present FCU member. No nationwide charitable-donation backdoor.",
      eligibility_source: "https://frankenmuthcu.org/about/",
    },
    dort: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Dort Financial Credit Union membership is open to any person who lives, worships, works, or goes to school in the State of Michigan (plus immediate family of members). No nationwide charitable-donation backdoor disclosed.",
      eligibility_source:
        "https://dort-financial-credit-union.helpscoutdocs.com/article/10-how-do-i-become-a-dort-financial-member",
    },
  },
  seeds: [
    {
      id: "dfcu-financial-platinum-mastercard",
      card_name: "DFCU Financial Platinum Mastercard",
      issuer: "dfcu-financial",
      offer_link: "https://www.dfcufinancial.com/personal/Cards/Credit-Cards/mastercard-credit-card",
      state_restricted: ["MI", "FL"],
      key_benefits: [
        "5.99% intro APR for 6 months on purchases made within the first 90 days",
        "No annual fee and no balance transfer fee",
        "Mastercard ID Theft Protection, Purchase Assurance, and Airport Concierge",
        "MasterTrip Travel Assistance and Master RoadAssist roadside service",
      ],
      eligibility: "dfcu",
      intro_apr: { purchase_apr_months: 6, go_to_apr_low: 12.9, go_to_apr_high: 18.0 },
      protections: { purchase_protection: true },
    },
    {
      id: "laketrust-platinum-elite-rewards-visa",
      card_name: "Lake Trust Platinum Elite Rewards Visa",
      issuer: "lake-trust-cu",
      offer_link: "https://laketrust.org/personal/banking/credit-cards",
      key_benefits: [
        "1 DreamPoints point per $1 spent, plus bonus points at participating retailers",
        "Redeem points for merchandise, travel, experiences, cash back, or gift cards",
        "No annual fee and no balance transfer fee",
        "Extended warranty, auto rental CDW, baggage delay reimbursement, and porch-piracy protection",
      ],
      eligibility: "laketrust",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      protections: { extended_warranty: true, purchase_protection: true },
      travel_insurance: { baggage_delay: true, rental_cdw_secondary: true },
    },
    {
      id: "laketrust-platinum-elite-visa",
      card_name: "Lake Trust Platinum Elite Visa",
      issuer: "lake-trust-cu",
      offer_link: "https://laketrust.org/personal/banking/credit-cards",
      key_benefits: [
        "Low-rate everyday Visa with no annual fee and no balance transfer fee",
        "$1,000,000 travel accident & baggage delay insurance",
        "Auto rental collision damage waiver and travel & emergency assistance",
        "Visa Zero Liability and Visa Secure online payment protection",
      ],
      eligibility: "laketrust",
      protections: { extended_warranty: true },
      travel_insurance: { baggage_delay: true, rental_cdw_secondary: true },
    },
    {
      id: "frankenmuth-diamond-mastercard",
      card_name: "Frankenmuth Credit Union Diamond Mastercard",
      issuer: "frankenmuth-cu",
      offer_link: "https://frankenmuthcu.org/credit-cards/",
      key_benefits: [
        "2.0% cash back on all purchases",
        "12.9% intro APR on new purchases for 12 months",
        "6.9% APR for the life of the transferred balance (qualifying credit)",
        "No annual fee",
      ],
      eligibility: "frankenmuth",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { purchase_apr_months: 12, go_to_apr_low: 10.0, go_to_apr_high: 17.0 },
      foreign_tx_fee_pct: 2,
    },
    {
      id: "dort-financial-visa-signature",
      card_name: "Dort Financial Visa Signature Credit Card",
      issuer: "dort-financial-cu",
      offer_link: "https://dortonline.org/signature-visa/",
      key_benefits: [
        "2% cash back or Total Rewards points on every purchase",
        "Rate as low as 10.5% APR, same rate on purchases and cash advances",
        "2.9% intro APR on balance transfers for 9 months, with no balance transfer fee",
        "No annual fee and free fraud monitoring",
      ],
      eligibility: "dort",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { bt_apr_months: 9, go_to_apr_low: 10.5, go_to_apr_high: 10.5 },
    },
    {
      id: "dort-financial-platinum-visa",
      card_name: "Dort Financial Platinum Visa Credit Card",
      issuer: "dort-financial-cu",
      offer_link: "https://dortonline.org/platinum-visa/",
      key_benefits: [
        "1% cash back or Total Rewards points on every purchase",
        "Rate as low as 11.5% APR with rewards (9.5% APR without rewards)",
        "2.9% intro APR on balance transfers for 9 months, with no balance transfer fee",
        "No annual fee and free fraud monitoring",
      ],
      eligibility: "dort",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { bt_apr_months: 9, go_to_apr_low: 11.5, go_to_apr_high: 11.5 },
    },
  ],
})
