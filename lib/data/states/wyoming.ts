import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const wyomingCards = buildStateCards({
  state: "WY",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    meridianTrust: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Meridian Trust FCU membership is open to those who live, work, worship, or attend school in Carbon, Fremont, Sweetwater, or Uinta County WY (plus select Cheyenne census tracts and Goshen County); Box Butte or Scotts Bluff County NE and Wellington CO areas; State of Wyoming / University of Wyoming / WYDOT / Wyoming public school employees and retirees; active or retired military; and immediate family of members.",
      eligibility_source: "https://mymeridiantrust.com/joinmeridian/",
    },
    wyhy: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "WyHy FCU membership is open to anyone who lives, works, or worships in Wyoming (statewide field of membership), plus family of members.",
      eligibility_source: "https://www.wyhy.org/open-account",
    },
    westernVista: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Western Vista FCU membership is open to people who live, work, or worship in the communities it serves (Cheyenne and Casper / Natrona County WY), plus immediate family of members; others outside the area can qualify via a small charitable-foundation contribution.",
      eligibility_source: "https://www.wvista.com/membership/",
    },
    jonahBank: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Jonah Bank of Wyoming is a community bank serving the Casper and Cheyenne, Wyoming markets; its credit cards are issued under the bank's own program.",
      eligibility_source: "https://www.jonah.bank/personal/loans/credit-cards",
    },
  },
  seeds: [
    {
      id: "meridian-trust-cash-back-visa",
      card_name: "Meridian Trust FCU Cash Back Credit Card",
      issuer: "meridian-trust-fcu",
      offer_link: "https://mymeridiantrust.com/for-you/borrow/credit-cards/",
      key_benefits: [
        "Cash back on every purchase with no category restrictions, redeemed directly to your account",
        "11.75% variable APR (effective January 1, 2026), adjusted with the Prime Rate",
        "No annual fee and no balance-transfer fee",
        "Low 1% foreign transaction fee",
      ],
      eligibility: "meridianTrust",
      state_restricted: ["WY", "NE", "CO"],
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      foreign_tx_fee_pct: 1,
    },
    {
      id: "wyhy-visa-platinum-cash-plus",
      card_name: "WyHy Visa Platinum Cash+",
      issuer: "wyhy-fcu",
      offer_link: "https://www.wyhy.org/wyhy-visa-credit-cards",
      key_benefits: [
        "4x points on gas, 3x on dining, 2x on groceries, and 1x on everything else via CURewards",
        "0% intro APR on balance transfers for 12 months, then a 3% balance-transfer fee",
        "No annual fee and contactless tap-to-pay",
        "Points redeemable for merchandise, travel, or cash back",
      ],
      eligibility: "wyhy",
      rewards: [
        { categories: ["gas_stations"], multiplier: 4 },
        { categories: ["dining"], multiplier: 3 },
        { categories: ["groceries"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1 },
      ],
      intro_apr: { bt_apr_months: 12, bt_fee_pct: 3 },
    },
    {
      id: "wyhy-visa-platinum",
      card_name: "WyHy Visa Platinum",
      issuer: "wyhy-fcu",
      offer_link: "https://www.wyhy.org/wyhy-visa-credit-cards",
      key_benefits: [
        "Built for the lowest possible interest rate for members who carry a balance",
        "0% intro APR on balance transfers for 12 months, then a 3% balance-transfer fee",
        "No annual fee, no over-limit fee, and contactless tap-to-pay",
        "Available statewide to any Wyoming resident",
      ],
      eligibility: "wyhy",
      intro_apr: { bt_apr_months: 12, bt_fee_pct: 3 },
    },
    {
      id: "wyhy-visa-secured",
      card_name: "WyHy Visa Secured",
      issuer: "wyhy-fcu",
      offer_link: "https://www.wyhy.org/wyhy-visa-credit-cards",
      key_benefits: [
        "Credit limit secured by your savings to build or rebuild credit",
        "No annual fee",
        "Contactless tap-to-pay",
        "Reports to the credit bureaus to help establish credit history",
      ],
      eligibility: "wyhy",
      credit_score_required: "poor",
    },
    {
      id: "western-vista-visa-rewards",
      card_name: "Western Vista FCU Visa Rewards",
      issuer: "western-vista-fcu",
      offer_link: "https://www.wvista.com/banking/credit-cards/",
      key_benefits: [
        "1 point for every dollar spent, redeemable for merchandise, gift cards, travel, or cash",
        "Rate as low as 11.25% APR",
        "$1,000 identity-theft reimbursement, extended warranty, and 90-day product protection",
        "No annual fee",
      ],
      eligibility: "westernVista",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      protections: { purchase_protection: true, extended_warranty: true },
    },
    {
      id: "western-vista-visa-platinum",
      card_name: "Western Vista FCU Visa Platinum",
      issuer: "western-vista-fcu",
      offer_link: "https://www.wvista.com/banking/credit-cards/",
      key_benefits: [
        "Low rate as low as 10.25% APR for members who carry a balance",
        "$1,000 identity-theft reimbursement, extended warranty, and 90-day product protection",
        "No annual fee",
        "Personal shopper service included",
      ],
      eligibility: "westernVista",
      protections: { purchase_protection: true, extended_warranty: true },
    },
    {
      id: "jonah-bank-platinum-rewards-visa",
      card_name: "Jonah Bank Platinum Rewards Card",
      issuer: "jonah-bank",
      offer_link: "https://www.jonah.bank/personal/loans/credit-cards",
      key_benefits: [
        "Rewards redeemable for cash back, travel, or gifts",
        "Low introductory rate",
        "CardValet controls and chip-card security",
        "Serves the Casper and Cheyenne, Wyoming markets",
      ],
      eligibility: "jonahBank",
    },
    {
      id: "jonah-bank-platinum-visa",
      card_name: "Jonah Bank Platinum Card",
      issuer: "jonah-bank",
      offer_link: "https://www.jonah.bank/personal/loans/credit-cards",
      key_benefits: [
        "No annual fee",
        "Low introductory rate",
        "CardValet controls and chip-card security",
        "Serves the Casper and Cheyenne, Wyoming markets",
      ],
      eligibility: "jonahBank",
    },
  ],
})
