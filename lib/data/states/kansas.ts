import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const kansasCards = buildStateCards({
  state: "KS",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    mainstreet: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Mainstreet Credit Union membership is open to anyone who lives or works in Douglas, Franklin, Johnson, Leavenworth, Linn, Miami, or Wyandotte County, KS, or Bates, Caldwell, Cass, Clay, Clinton, Jackson, Lafayette, Platte, or Ray County, MO (greater Kansas City), plus immediate family. A $5 share savings deposit establishes membership. No nationwide association pathway. Serves KS and MO.",
      eligibility_source: "https://www.mainstreetcu.org/become-a-member",
    },
    azura: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Azura Credit Union membership is open to anyone who lives, works, or worships in any of 52 named Kansas counties (incl. Shawnee, Sedgwick, Riley, Saline, Douglas, Johnson, Wyandotte, Leavenworth, Reno, Harvey); all Kansas educational-institution employees and students; employees/retirees of select employers (AT&T, Goodyear, government); members of named associations; and family of members. A $5 deposit establishes membership.",
      eligibility_source: "https://www.azuracu.com/about/join-us",
    },
    envista: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Envista Credit Union membership is open to people who live, work, conduct business in, worship, or attend school in any of 27 named Kansas counties (incl. Shawnee/Topeka, Douglas, Riley, Sedgwick, Harvey, Reno, McPherson, Leavenworth, Wyandotte) or Platte County, MO; employees/retirees of Envista, the BNSF Railroad and subcontractors, and the Topeka VA Medical Center; members of qualifying associations; and immediate family/household members. Serves KS and a small part of MO.",
      eligibility_source: "https://www.envistacu.com/about/join-us.html",
    },
    goldenPlains: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Golden Plains Credit Union membership is open to anyone who lives, works, or worships in Kansas (except Johnson County), members of their family, employees of the credit union, members of the Friends of Lee Richardson Zoo and the Leave a Legacy Foundation, and organizations of such persons. A $10 minimum savings balance establishes membership. Branch network across Western, Central, and Southeast Kansas. No nationwide pathway.",
      eligibility_source: "https://www.gpcu.org/About-Us/Membership/Become-a-Member",
    },
    quantum: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Quantum Credit Union (formerly TECU/Telephone Employees CU, Wichita) membership is open to anyone who lives or works in Allen, Anderson, Butler, Coffey, Cowley, Franklin, Greenwood, Harvey, Kingman, Lyon, Osage, Reno, Sedgwick, Sumner, or Woodson County, KS; anyone employed in the communications industry; employees of Western Resources Inc. and subsidiaries/affiliates and of Wolf Creek Nuclear Operating Corporation; and immediate family of eligible members. A $5 savings deposit establishes membership.",
      eligibility_source: "https://www.theq.org/membership",
    },
    meritrustKs: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Meritrust Credit Union (Wichita, KS) membership is open to people who live, work, worship, or attend school in the Wichita or Lawrence, KS areas; employees/members of qualifying employers and affiliations (Boeing, Wichita State University, Spirit AeroSystems, and others); immediate family/household members; or, for those who don't otherwise qualify, via complimentary membership in a partner association. This is the Kansas (Wichita-headquartered) franchise; the separate Colorado division (former Premier Members CU) is cataloged under CO.",
      eligibility_source: "https://www.meritrust.org/membership/ways-to-join/",
    },
  },
  seeds: [
    {
      id: "mainstreet-cu-select-rewards-mastercard",
      card_name: "Mainstreet CU Select Rewards Mastercard",
      issuer: "mainstreet-cu",
      offer_link: "https://www.mainstreetcu.org/personal/credit-cards",
      state_restricted: ["KS", "MO"],
      key_benefits: [
        "1 point per dollar on purchases, with bonus points at select retailers",
        "Points redeemable for merchandise, travel, or cash back",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "mainstreet",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "mainstreet-cu-platinum-mastercard",
      card_name: "Mainstreet CU Platinum Mastercard",
      issuer: "mainstreet-cu",
      offer_link: "https://www.mainstreetcu.org/personal/credit-cards",
      state_restricted: ["KS", "MO"],
      key_benefits: [
        "Low ongoing rate, with APRs as low as 9.99%",
        "Same rate for purchases, cash advances, and balance transfers",
        "No annual fee and free $1,000,000 travel accident insurance",
      ],
      eligibility: "mainstreet",
    },
    {
      id: "azura-cu-rewards-visa",
      card_name: "Azura CU Rewards Visa",
      issuer: "azura-cu",
      offer_link: "https://www.azuracu.com/personal/loans/visa-credit-cards/rewards-credit-card",
      key_benefits: [
        "$200 bonus cash after $3,000 in purchases in the first 90 days",
        "1 point per $1, double points on gas and groceries, triple points in rotating quarterly categories",
        "No annual fee, balance transfer fee, or cash advance fee",
        "Rate as low as 12.25% APR",
      ],
      eligibility: "azura",
      bonus_amount: 200,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 3000,
      spend_months: 3,
      rewards: [
        { categories: ["gas_stations", "groceries"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1 },
      ],
    },
    {
      id: "azura-cu-visa-credit-card",
      card_name: "Azura CU Visa Credit Card",
      issuer: "azura-cu",
      offer_link: "https://www.azuracu.com/personal/visa-credit-cards/visa-credit-card/",
      key_benefits: [
        "Low rate as low as 10.25% APR",
        "Same low rate for purchases, balance transfers, and cash advances",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "azura",
    },
    {
      id: "envista-cu-envistablack-credit-card",
      card_name: "Envista CU ENVISTABLACK Credit Card",
      issuer: "envista-cu",
      offer_link: "https://www.envistacu.com/loans/personal-loans/envistablack-credit-card.html",
      state_restricted: ["KS", "MO"],
      key_benefits: [
        "2X points on gas, groceries, phone & internet, streaming services, and insurance",
        "Rotating limited-time 3X bonus category each quarter",
        "No annual fee and no cash advance fee",
      ],
      eligibility: "envista",
      rewards: [
        { categories: ["gas_stations", "groceries", "phone", "streaming", "insurance"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1 },
      ],
    },
    {
      id: "golden-plains-cu-visa-golden-rewards",
      card_name: "Golden Plains CU Visa Golden Rewards",
      issuer: "golden-plains-cu",
      offer_link: "https://www.gpcu.org/Borrow/Credit-Cards/VISA-Golden-Rewards-Disclosure",
      key_benefits: [
        "9.90% intro APR for the first six billing cycles on purchases, balance transfers, and cash advances",
        "Low 11.90% go-to APR with no annual fee",
        "Low 1% foreign transaction fee",
      ],
      eligibility: "goldenPlains",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "golden-plains-cu-visa-classic-plus",
      card_name: "Golden Plains CU Visa Classic Plus",
      issuer: "golden-plains-cu",
      offer_link: "https://www.gpcu.org/Borrow/Credit-Cards/VISA-Classic-Plus-Disclosure",
      key_benefits: [
        "9.90% intro APR for the first six billing cycles on purchases, balance transfers, and cash advances",
        "13.90% go-to APR with no annual fee",
        "Low 1% foreign transaction fee",
      ],
      eligibility: "goldenPlains",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "quantum-cu-visa-rewards-credit-card",
      card_name: "Quantum CU Visa Rewards Credit Card",
      issuer: "quantum-cu",
      offer_link: "https://www.theq.org/credit-card",
      key_benefits: [
        "Earn rewards on all qualifying purchases",
        "9.90%-18.90% APR with no annual fee and no balance transfer fee",
        "Low 1% foreign transaction fee",
      ],
      eligibility: "quantum",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      foreign_tx_fee_pct: 1,
    },
    {
      id: "meritrust-ks-rewards-credit-card",
      card_name: "Meritrust CU Rewards Credit Card",
      issuer: "meritrust-cu",
      offer_link: "https://www.meritrust.org/personal/credit-cards/rewards-credit-card/",
      key_benefits: [
        "20,000 bonus points ($200 cash value) after $1,000 in purchases in the first 90 days",
        "Rewards on everyday purchases with worldwide Visa acceptance",
        "No annual fee, no balance transfer fee, and no foreign transaction fees",
      ],
      eligibility: "meritrustKs",
      bonus_amount: 20000,
      bonus_currency: "points",
      cpp_value: 0.01,
      min_spend: 1000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "meritrust-ks-member-select-credit-card",
      card_name: "Meritrust CU Member Select Credit Card",
      issuer: "meritrust-cu",
      offer_link: "https://www.meritrust.org/personal/credit-cards/",
      key_benefits: [
        "Low-rate non-rewards Visa with no gimmicks",
        "No annual fee and no charge to transfer a balance",
        "No foreign transaction fees",
      ],
      eligibility: "meritrustKs",
      travel: { no_foreign_tx_fee: true },
    },
  ],
})
