import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const arkansasCards = buildStateCards({
  state: "AR",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    afcu: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Arkansas Federal Credit Union membership is open to anyone who lives or works in Arkansas, or who has a family member who is already a member (no military, state, or government affiliation required). People outside Arkansas may also qualify through one of 700+ partner employers/organizations. A $5 savings account establishes lifetime membership.",
      eligibility_source: "https://www.afcu.org/membership/",
    },
    telcoe: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Telcoe Federal Credit Union membership is open to anyone who lives, works, attends school, or worships in the state of Arkansas; employees of Select Employee Groups; immediate family/household of members; people in designated underserved census tracts in Pulaski or Pope counties; and via a small donation to a named local Arkansas charity. Branches in Little Rock, Sherwood, and Russellville, AR.",
      eligibility_source: "https://www.telcoe.com/about-us/become-a-member.html",
    },
    fabandt: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "First Arkansas Bank & Trust is a community bank headquartered in Jacksonville, AR, operating ~21 branches across roughly a dozen central Arkansas communities (Jacksonville, Cabot, Conway, Austin, Clinton, Damascus, Greenbrier, Little Rock AFB, and others). Accounts are opened with the bank; there is no membership requirement, but the bank's footprint is central Arkansas.",
      eligibility_source: "https://www.fabandt.bank/about/locations",
    },
  },
  seeds: [
    {
      id: "arkansas-federal-cu-cash-back-world-mastercard",
      card_name: "Arkansas Federal CU Cash Back World Mastercard",
      issuer: "arkansas-federal-cu",
      offer_link: "https://www.afcu.org/spend-and-save/credit-cards/cash-back-credit-card/",
      key_benefits: [
        "2% cash back on every purchase (2 uChoose Rewards points per $1) with no categories or caps",
        "0% intro APR for 18 billing cycles on eligible balance transfers (3% balance transfer fee)",
        "No annual fee and no foreign transaction fee",
      ],
      eligibility: "afcu",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      intro_apr: { bt_apr_months: 18, bt_fee_pct: 3, go_to_apr_low: 14.49, go_to_apr_high: 18.0 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "arkansas-federal-cu-low-rate-classic-mastercard",
      card_name: "Arkansas Federal CU Low-Rate Classic Mastercard",
      issuer: "arkansas-federal-cu",
      offer_link: "https://www.afcu.org/spend-and-save/credit-cards/credit-card-with-low-rates/",
      key_benefits: [
        "Low ongoing rate of 9.50%-18.00% APR",
        "0% intro APR for 18 billing cycles on eligible balance transfers (3% balance transfer fee)",
        "No annual fee",
      ],
      eligibility: "afcu",
      intro_apr: { bt_apr_months: 18, bt_fee_pct: 3, go_to_apr_low: 9.5, go_to_apr_high: 18.0 },
    },
    {
      id: "telcoe-fcu-mastercard-prime",
      card_name: "Telcoe FCU Mastercard Prime",
      issuer: "telcoe-fcu",
      offer_link: "https://www.telcoe.com/loans/credit-cards.html",
      key_benefits: [
        "Low rate as low as 10.99% APR with no rewards-program complexity",
        "No annual fee",
        "Mastercard SecureCode and real-time purchase alerts via text",
      ],
      eligibility: "telcoe",
    },
    {
      id: "telcoe-fcu-mastercard-secured",
      card_name: "Telcoe FCU Mastercard Secured",
      issuer: "telcoe-fcu",
      offer_link: "https://www.telcoe.com/loans/credit-cards.html",
      key_benefits: [
        "Secured card to build or rebuild credit (must secure 120% of the requested limit in a Telcoe Prime Savings account)",
        "17.99% APR",
        "No annual fee",
      ],
      eligibility: "telcoe",
      credit_score_required: "poor",
    },
    {
      id: "first-arkansas-bank-trust-platinum-payback-mastercard",
      card_name: "First Arkansas Bank & Trust Platinum Payback Mastercard",
      issuer: "first-arkansas-bank-trust",
      offer_link: "https://www.fabandt.bank/personal/credit-cards",
      key_benefits: [
        "Unlimited 1% cash back for every dollar spent",
        "0% intro APR for the first 12 billing cycles on purchases, balance transfers, and cash advances",
        "No annual fee",
      ],
      eligibility: "fabandt",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, bt_fee_pct: 4, go_to_apr_low: 14.49, go_to_apr_high: 23.49 },
    },
    {
      id: "first-arkansas-bank-trust-platinum-preferred-mastercard",
      card_name: "First Arkansas Bank & Trust Platinum Preferred Mastercard",
      issuer: "first-arkansas-bank-trust",
      offer_link: "https://www.fabandt.bank/personal/credit-cards",
      key_benefits: [
        "Earn unlimited 1 point for every dollar spent",
        "0% intro APR for the first 12 billing cycles on purchases, balance transfers, and cash advances",
        "No annual fee",
      ],
      eligibility: "fabandt",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, bt_fee_pct: 4, go_to_apr_low: 14.49, go_to_apr_high: 23.49 },
    },
    {
      id: "first-arkansas-bank-trust-world-mastercard",
      card_name: "First Arkansas Bank & Trust World Mastercard",
      issuer: "first-arkansas-bank-trust",
      offer_link: "https://www.fabandt.bank/personal/credit-cards",
      key_benefits: [
        "Earn points or cash back on purchases",
        "0% intro APR for the first 12 billing cycles on purchases, balance transfers, and cash advances",
        "No foreign transaction fees",
        "$35 annual fee ($29 for each additional card)",
      ],
      eligibility: "fabandt",
      annual_fee: 35,
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, bt_fee_pct: 4, go_to_apr_low: 14.49, go_to_apr_high: 23.49 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "first-arkansas-bank-trust-world-elite-mastercard",
      card_name: "First Arkansas Bank & Trust World Elite Mastercard",
      issuer: "first-arkansas-bank-trust",
      offer_link: "https://www.fabandt.bank/personal/credit-cards",
      key_benefits: [
        "Earn points or cash back on purchases",
        "0% intro APR for the first 12 billing cycles on purchases, balance transfers, and cash advances",
        "No foreign transaction fees",
        "$299 annual fee ($49 for each additional card)",
      ],
      eligibility: "fabandt",
      annual_fee: 299,
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, bt_fee_pct: 4, go_to_apr_low: 14.49, go_to_apr_high: 23.49 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "first-arkansas-bank-trust-world-elite-plus-business-mastercard",
      card_name: "First Arkansas Bank & Trust World Elite Plus Business Mastercard",
      issuer: "first-arkansas-bank-trust",
      card_type: "business",
      offer_link: "https://www.fabandt.bank/business/credit-cards",
      key_benefits: [
        "Earn points or cash back on business purchases",
        "$200 annual airline fee credit",
        "0% intro APR for the first 6 billing cycles on purchases, balance transfers, and cash advances",
        "No foreign transaction fee; $249 annual fee ($49 for each additional card)",
      ],
      eligibility: "fabandt",
      annual_fee: 249,
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 6, bt_fee_pct: 4 },
      travel: { no_foreign_tx_fee: true, travel_credit: 200 },
    },
  ],
})
