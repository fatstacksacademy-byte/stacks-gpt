import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const nebraskaCards = buildStateCards({
  state: "NE",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    cobalt: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Cobalt Credit Union (Papillion, NE) membership is open to anyone who lives, works, worships, attends school, or regularly conducts business in Cass, Douglas, Sarpy, Saunders, or Washington county in Nebraska, or in nine Iowa counties served from the Omaha-Council Bluffs metro, plus immediate family of members. A $5 share-savings deposit opens membership. No nationwide donation/association backdoor. Serves NE and IA.",
      eligibility_source: "https://cobaltcu.com/personal/how-become-member",
    },
    centris: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Centris Federal Credit Union (Omaha) membership is open to people who live, work, worship, or attend school in Cass, Dodge, Douglas, Sarpy, Saunders, Lincoln, McPherson, or Washington county in Nebraska, or Harrison, Mills, or Pottawattamie county in Iowa. No nationwide donation/association backdoor. Serves NE and IA.",
      eligibility_source: "https://www.centrisfcu.org/about-us/membership/",
    },
    metro: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Metro Credit Union (Omaha) membership is open to anyone who lives, works, worships, attends school, or regularly conducts business in Douglas, Sarpy, Saunders, Cass, or Washington county in Nebraska, or Pottawattamie, Harrison, or Mills county in Iowa; to employees of the credit union's Select Employer Groups; and to immediate family of members. A $5 share-savings deposit opens membership. No nationwide donation/association backdoor. Serves NE and IA.",
      eligibility_source: "https://www.metrofcu.org/about-us/who-we-are",
    },
    lincone: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "LincOne Federal Credit Union (Lincoln) holds a community charter: membership is open to persons who live, work, worship, or attend school in, and businesses/legal entities located within, Lancaster County, Nebraska; to legacy members of LincOne and its merged credit unions; and to a current member's immediate family or household. A $25 savings balance opens membership. No nationwide donation/association backdoor.",
      eligibility_source: "https://www.linconefcu.org/build/who-we-serve",
    },
    libertyFirst: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Liberty First Credit Union (Lincoln) membership is open to people who live, work, worship, or attend school in Lancaster or Seward county, Nebraska; to employees/retirees of BNSF Railway and of named Select Employee Groups and Partner Groups; and to family of members. A $5 share deposit opens membership. No nationwide donation/association backdoor.",
      eligibility_source: "https://www.libertyfirstcu.com/become-member/",
    },
    ubt: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Union Bank & Trust is a Lincoln, Nebraska-chartered bank (est. 1917) whose branches are in Nebraska and the Kansas City, Kansas area only - a genuinely regional footprint, not a nationwide issuer. Its Visa credit cards are UBT's own bank-issued cards (ScoreCard Rewards), not agent-issued nationwide cards. Serves NE and KS.",
      eligibility_source: "https://www.ubt.com/about",
    },
  },
  seeds: [
    {
      id: "cobalt-cu-visa-classic",
      card_name: "Cobalt Credit Union Visa Classic",
      issuer: "cobalt-cu",
      offer_link: "https://cobaltcu.com/personal/credit-cards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "Lower-rate everyday Visa with no rewards program",
        "No annual fee and no balance-transfer fee",
        "Variable purchase APR of 9.75%-17.99% based on creditworthiness",
      ],
      eligibility: "cobalt",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "cobalt-cu-visa-signature",
      card_name: "Cobalt Credit Union Visa Signature",
      issuer: "cobalt-cu",
      offer_link: "https://cobaltcu.com/personal/credit-cards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "Visa Signature card with no annual fee and no balance-transfer fee",
        "Variable purchase APR of 10.75%-17.99% based on creditworthiness",
        "Visa Signature travel and purchase benefits",
      ],
      eligibility: "cobalt",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "cobalt-cu-visa-business",
      card_name: "Cobalt Credit Union Visa Business",
      issuer: "cobalt-cu",
      card_type: "business",
      offer_link: "https://cobaltcu.com/bank/business/credit-cards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "Business Visa with no annual fee and no balance-transfer fee",
        "Variable purchase APR of 8.25%-17.99% based on creditworthiness",
      ],
      eligibility: "cobalt",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "centris-fcu-visa",
      card_name: "Centris Visa",
      issuer: "centris-fcu",
      offer_link: "https://www.centrisfcu.org/credit-cards/",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "1.99% intro APR for the first six billing cycles on purchases and balance transfers",
        "No annual fee, no balance-transfer fee, and no cash-advance fee",
        "Go-to variable purchase APR of 9.90%-17.90%",
      ],
      eligibility: "centris",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "centris-fcu-rewards-visa",
      card_name: "Centris Rewards Visa",
      issuer: "centris-fcu",
      offer_link: "https://www.centrisfcu.org/credit-cards/",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "1.99% intro APR for the first six billing cycles on purchases and balance transfers",
        "Earns rewards points on purchases; no annual fee",
        "No balance-transfer fee and no cash-advance fee; go-to variable purchase APR of 12.90%-17.90%",
      ],
      eligibility: "centris",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "metro-cu-preferred-visa",
      card_name: "Metro Credit Union Preferred Visa",
      issuer: "metro-cu-ne",
      offer_link: "https://www.metrofcu.org/credit-cards/visa-rewards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "1.5% cash back on all new purchases",
        "0% intro APR for the first 6 months",
        "No annual fee; go-to variable APR of 15.75%",
      ],
      eligibility: "metro",
      rewards: [{ categories: ["everything_else"], multiplier: 1.5, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { purchase_apr_months: 6, go_to_apr_low: 15.75, go_to_apr_high: 15.75 },
    },
    {
      id: "metro-cu-platinum-visa",
      card_name: "Metro Credit Union Platinum Visa",
      issuer: "metro-cu-ne",
      offer_link: "https://www.metrofcu.org/credit-cards/visa-rewards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "1 point per $1 spent, redeemable through Metro Visa Card Rewards",
        "No annual fee",
        "Variable APR of 12.40%",
      ],
      eligibility: "metro",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
    {
      id: "metro-cu-classic-visa",
      card_name: "Metro Credit Union Classic Visa",
      issuer: "metro-cu-ne",
      offer_link: "https://www.metrofcu.org/credit-cards/visa-rewards",
      state_restricted: ["NE", "IA"],
      key_benefits: [
        "Entry-level Visa with no rewards program",
        "$25 annual fee on credit lines under $2,500",
        "Variable APR of 17.99%",
      ],
      eligibility: "metro",
      annual_fee: 25,
    },
    {
      id: "lincone-fcu-visa",
      card_name: "LincOne Visa Credit Card",
      issuer: "lincone-fcu",
      offer_link: "https://www.linconefcu.org/spend/visa-credit-card",
      key_benefits: [
        "Earns uChoose Rewards points on purchases",
        "No annual fee and no balance-transfer fee",
        "Variable APR from 10.00% to 18.00% based on creditworthiness",
      ],
      eligibility: "lincone",
      cpp_value: 0.01,
    },
    {
      id: "liberty-first-cu-mastercard-rewards",
      card_name: "Liberty First Mastercard with Rewards",
      issuer: "liberty-first-cu",
      offer_link: "https://www.libertyfirstcu.com/mastercard-credit-card/",
      key_benefits: [
        "Earns MyLFCU Rewards points on purchases, redeemable for travel, gift cards, or cash",
        "No annual fee",
        "No balance-transfer or cash-advance fee; 25-day grace period",
      ],
      eligibility: "libertyFirst",
      cpp_value: 0.01,
    },
    {
      id: "ubt-rewards-visa",
      card_name: "Union Bank & Trust Rewards Visa",
      issuer: "union-bank-trust-ne",
      offer_link: "https://www.ubt.com/personal/credit-cards",
      state_restricted: ["NE", "KS"],
      key_benefits: [
        "1 ScoreCard Rewards point per $1 on signature-based purchases (100 points = $1 cash)",
        "Points redeemable for cash back, travel, merchandise, or gift cards",
        "No annual fee",
      ],
      eligibility: "ubt",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
    {
      id: "ubt-signature-rewards-visa",
      card_name: "Union Bank & Trust Signature Rewards Visa",
      issuer: "union-bank-trust-ne",
      offer_link: "https://www.ubt.com/personal/credit-cards",
      state_restricted: ["NE", "KS"],
      key_benefits: [
        "1 ScoreCard Rewards point per $1 on signature-based purchases (100 points = $1 cash)",
        "Visa Signature benefits including 24/7 multilingual concierge and travel services",
        "No annual fee",
      ],
      eligibility: "ubt",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
  ],
})
