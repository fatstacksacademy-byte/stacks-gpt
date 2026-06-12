import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const montanaCards = buildStateCards({
  state: "MT",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    montanaCu: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Montana Credit Union (Great Falls; montanacu.com) serves a field of membership covering 44 Montana counties; most Montanans qualify if their county is on the list. A share deposit opens membership.",
      eligibility_source: "https://www.montanacu.com/open-account/",
    },
    rmcu: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Rocky Mountain Credit Union (Bozeman) membership is open to people who live, work, or worship in Broadwater, Cascade, Deer Lodge, Gallatin, Jefferson, Lewis and Clark, Madison, Park, Powell, Missoula, or Silver Bow counties in Montana, plus State of Montana employees, MSU alumni, select partner employees, and relatives of members. A $20 share deposit opens membership.",
      eligibility_source: "https://rmcu.net/membership",
    },
    valley: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Valley Credit Union (Billings) membership is open to people who live, work, worship, or attend school in a large list of south/eastern Montana counties (Beaverhead, Big Horn, Carbon, Cascade, Custer, Dawson, Fergus, Gallatin, Rosebud, Silver Bow, Stillwater, Yellowstone, and more) plus Park County, Wyoming, and relatives of members.",
      eligibility_source: "https://www.valleyfcu.com/about/about-valley-credit-union/join-us.html",
    },
    parkSide: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Park Side Credit Union (Whitefish) field of membership is limited to people living, working, or attending school in Flathead, Glacier, Toole, Liberty, Lincoln, Lake, Sanders, Mineral, Missoula, Ravalli, and Beaverhead counties in Montana, plus eligible family of current members.",
      eligibility_source: "https://www.parksidefcu.com/about-us/",
    },
    vocal: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Vocal Credit Union (Helena) membership is open to people who live, worship, work in, or attend school in, and businesses located in Beaverhead, Broadwater, Golden Valley, Jefferson, Judith Basin, Lewis and Clark, Madison, Meagher, Powell, or Wheatland county Montana, plus relatives of eligible members.",
      eligibility_source: "https://vocal.coop/faqs/",
    },
    altana: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Altana Federal Credit Union (Billings) membership is open to anyone who lives, works, worships, or attends school in its 40 Montana counties (Big Horn, Carbon, Cascade, Custer, Fergus, Gallatin, Park, Stillwater, Yellowstone, and more) or 9 Wyoming counties, or a relative of a member. A $25 savings deposit opens membership.",
      eligibility_source: "https://altanafcu.org/join-us/",
    },
    stockman: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Stockman Bank is Montana's largest family-owned community bank with branches only in Montana (statewide). Cards are self-issued by Stockman Bank; applicants must be existing customers age 18+ with online banking and a U.S. citizen or resident alien. Credit approval applies.",
      eligibility_source: "https://www.stockmanbank.com/personal/credit-cards",
    },
  },
  seeds: [
    {
      id: "montana-cu-pathway-mastercard",
      card_name: "Montana Credit Union Pathway Credit Card",
      issuer: "montana-credit-union",
      offer_link: "https://www.montanacu.com/credit-cards-loans/cards/",
      key_benefits: [
        "Fixed 11.9% APR",
        "No annual fee",
        "Fee-free balance transfers (transferred balances at 11.90% APR)",
      ],
      eligibility: "montanaCu",
      foreign_tx_fee_pct: 1.1,
    },
    {
      id: "montana-cu-basecamp-secured-mastercard",
      card_name: "Montana Credit Union Basecamp Credit Card",
      issuer: "montana-credit-union",
      offer_link: "https://www.montanacu.com/credit-cards-loans/cards/",
      key_benefits: [
        "Share-secured Mastercard for building or rebuilding credit",
        "Fixed 11.9% APR",
        "No annual fee; fee-free balance transfers",
      ],
      eligibility: "montanaCu",
      credit_score_required: "poor",
      foreign_tx_fee_pct: 1.0,
    },
    {
      id: "montana-cu-peak-rewards-mastercard",
      card_name: "Montana Credit Union Peak Rewards Credit Card",
      issuer: "montana-credit-union",
      offer_link: "https://www.montanacu.com/credit-cards-loans/cards/",
      key_benefits: [
        "1.5% cash back on eligible purchases each month, up to $100",
        "Fixed 14.99%-17.99% APR based on creditworthiness",
        "No annual fee and no foreign transaction fee",
      ],
      eligibility: "montanaCu",
      cpp_value: 1,
      rewards: [{ categories: ["everything_else"], multiplier: 1.5, unit: "%" }],
    },
    {
      id: "rmcu-visa-platinum-rewards",
      card_name: "Rocky Mountain Credit Union Visa Platinum Rewards",
      issuer: "rocky-mountain-credit-union",
      offer_link: "https://www.rmcu.net/personal/visa-credit-cards",
      key_benefits: [
        "Cash back on every dollar you spend",
        "Rates as low as 11.49% APR (variable)",
        "No annual fee; 2% (min $2.50) balance-transfer fee",
      ],
      eligibility: "rmcu",
      cpp_value: 1,
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
    },
    {
      id: "rmcu-visa-classic",
      card_name: "Rocky Mountain Credit Union Visa Classic",
      issuer: "rocky-mountain-credit-union",
      offer_link: "https://www.rmcu.net/personal/visa-credit-cards",
      key_benefits: [
        "Rates as low as 15.99% APR",
        "No annual fee",
        "No balance-transfer fee and no cash-advance fee",
      ],
      eligibility: "rmcu",
    },
    {
      id: "valley-cu-platinum-rewards-visa",
      card_name: "Valley Credit Union Platinum REWARDS Visa",
      issuer: "valley-credit-union-mt",
      state_restricted: ["MT", "WY"],
      offer_link: "https://www.valleyfcu.com/loans/visa-credit-cards.html",
      key_benefits: [
        "1 uChoose Rewards point per $1 on every purchase, no caps",
        "Balance transfers as low as 1.99% APR for 6 months, then rates as low as 13.49% APR",
        "No annual fee",
      ],
      eligibility: "valley",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { bt_apr_months: 6 },
    },
    {
      id: "valley-cu-platinum-visa",
      card_name: "Valley Credit Union Platinum Visa",
      issuer: "valley-credit-union-mt",
      state_restricted: ["MT", "WY"],
      offer_link: "https://www.valleyfcu.com/loans/visa-credit-cards.html",
      key_benefits: [
        "Low-rate, no-frills Visa with rates as low as 11.49% APR after intro",
        "Balance transfers as low as 1.99% APR for 6 months",
        "No annual fee",
      ],
      eligibility: "valley",
      intro_apr: { bt_apr_months: 6 },
    },
    {
      id: "valley-cu-platinum-share-secured-visa",
      card_name: "Valley Credit Union Platinum Share Secured Visa",
      issuer: "valley-credit-union-mt",
      state_restricted: ["MT", "WY"],
      offer_link: "https://www.valleyfcu.com/loans/visa-credit-cards.html",
      key_benefits: [
        "Secured Visa for building or rebuilding credit",
        "Works anywhere Visa credit cards are accepted",
        "No annual fee",
      ],
      eligibility: "valley",
      credit_score_required: "poor",
    },
    {
      id: "parkside-premium-rewards-visa",
      card_name: "Park Side Credit Union Premium Rewards Visa",
      issuer: "park-side-credit-union",
      offer_link: "https://www.parksidefcu.com/loans/",
      key_benefits: [
        "Earns CU Rewards points redeemable for cash back, merchandise, and travel",
        "Cash advances at the same interest rate as purchases",
        "Instant-issue at any branch with local 24/7 card assistance",
      ],
      eligibility: "parkSide",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "parkside-plus-visa",
      card_name: "Park Side Credit Union Plus Visa",
      issuer: "park-side-credit-union",
      offer_link: "https://www.parksidefcu.com/loans/",
      key_benefits: [
        "No annual fee and a low interest rate",
        "No balance-transfer fee",
        "Cash advances at the same interest rate as purchases",
      ],
      eligibility: "parkSide",
    },
    {
      id: "vocal-cu-visa",
      card_name: "Vocal Credit Union Visa Credit Card",
      issuer: "vocal-credit-union",
      offer_link: "https://vocal.coop/loans/credit-card/",
      key_benefits: [
        "3.79% introductory APR for the first six months, then fixed rates as low as 11.49% APR",
        "No penalty APR for late payments",
        "Portfolio held in-house with local branch payment support",
      ],
      eligibility: "vocal",
      intro_apr: { purchase_apr_months: 6, go_to_apr_low: 11.49 },
    },
    {
      id: "altana-fcu-visa",
      card_name: "Altana Federal Credit Union Visa Card",
      issuer: "altana-fcu",
      state_restricted: ["MT", "WY"],
      offer_link: "https://altanafcu.org/borrow/credit-cards/",
      key_benefits: [
        "Fixed 7.95%-17.90% APR based on credit score",
        "No annual fee, no minimum finance charge, and no cash-advance transaction fee",
        "25-day grace period; credit limits up to $20,000",
      ],
      eligibility: "altana",
      foreign_tx_fee_pct: 1.0,
    },
    {
      id: "stockman-treasure-mastercard",
      card_name: "Stockman Bank Mastercard Treasure Card",
      issuer: "stockman-bank",
      offer_link: "https://www.stockmanbank.com/personal/credit-cards",
      key_benefits: [
        "0% intro APR for 15 months on purchases and balance transfers",
        "One-time $10 statement credit after 6 months of on-time payments",
        "No annual fee",
      ],
      eligibility: "stockman",
      intro_apr: { purchase_apr_months: 15, bt_apr_months: 15 },
    },
    {
      id: "stockman-world-rewards-mastercard",
      card_name: "Stockman Bank Mastercard World Rewards Card",
      issuer: "stockman-bank",
      offer_link: "https://www.stockmanbank.com/personal/credit-cards",
      key_benefits: [
        "Unlimited 1.5 points per $1 spent, redeemable for cash back, travel, and gift cards",
        "0% intro APR for 12 months on balance transfers",
        "No annual fee and no foreign transaction fee; points poolable with Stockman business cards",
      ],
      eligibility: "stockman",
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
      intro_apr: { bt_apr_months: 12 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "stockman-business-world-elite-mastercard",
      card_name: "Stockman Bank Mastercard Business World Elite Card",
      issuer: "stockman-bank",
      card_type: "business",
      offer_link: "https://www.stockmanbank.com/stockman-bank-credit-cards",
      key_benefits: [
        "1.5 points per $1 on purchases",
        "No annual fee",
        "Points poolable across Stockman personal and business cards",
      ],
      eligibility: "stockman",
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
    },
    {
      id: "stockman-agriculture-business-world-elite-mastercard",
      card_name: "Stockman Bank Agriculture Mastercard Business World Elite Card",
      issuer: "stockman-bank",
      card_type: "business",
      offer_link: "https://www.stockmanbank.com/stockman-bank-credit-cards",
      key_benefits: [
        "2 points per $1 on farm and ranch supplies, 1.5 points per $1 on all other purchases",
        "No annual fee",
        "Built for Montana agricultural operations",
      ],
      eligibility: "stockman",
      rewards: [
        { categories: ["farm_ranch_supplies"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1.5 },
      ],
    },
  ],
})
