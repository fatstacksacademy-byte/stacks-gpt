import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-12"

export const indianaCards = buildStateCards({
  state: "IN",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    imcu: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Indiana Members Credit Union (IMCU) membership is open to anyone who lives or works in Central or Southern Indiana - a field of membership spanning 50+ Indiana counties (incl. Marion, Hamilton, Hendricks, Johnson, Monroe, Vanderburgh, Tippecanoe) plus several Kentucky counties - and to family members of current members. A minimum required share establishes membership.",
      eligibility_source: "https://www.imcu.com/connect/about-us",
    },
    everwise: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Everwise Credit Union (formerly Teachers CU) membership is open to anyone who lives or works in any Indiana county (Marion County qualifies by township), plus Berrien and Cass Counties and select Oakland/Macomb townships in Michigan, and immediate family of members. A $5 Primary Savings deposit establishes membership. Serves IN and MI.",
      eligibility_source:
        "https://www.everwisecu.com/personal/help-articles/membership-eligibility-requirements",
    },
    centra: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Centra Credit Union (Columbus, IN) membership is open to people who live or work in 60 named Indiana counties (plus select Marion County townships) and 7 Kentucky counties (Bullitt, Henry, Jefferson, Oldham, Shelby, Spencer, Trimble), or who have an immediate family member who is a member. No nationwide association backdoor. Serves IN and KY.",
      eligibility_source: "https://www.centra.org/become-a-member/",
    },
    forum: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "FORUM Credit Union (Indianapolis) membership is open to residents of 88 of Indiana's 92 counties plus portions of Allen, Lake, Marion, and St. Joseph counties (97%+ of the state), employees of 3,000+ Select Employee Groups, and relatives of members. Branch network is concentrated in the Indianapolis metro.",
      eligibility_source: "https://www.forumcu.com/resources/new-to-forum",
    },
    purdueFed: {
      eligibility_scope: "association",
      eligibility_notes:
        "Purdue Federal Credit Union (West Lafayette) membership is open to Purdue University students, employees, alumni, and retirees (and their immediate family), people who live/work/study/worship in La Porte County, IN, and employees/members of its Select Employee Groups. Eligibility is tied to a Purdue affiliation or the regional/SEG footprint, not a nationwide backdoor.",
      eligibility_source: "https://www.purduefed.com/About/Membership/Become-a-Member",
    },
    interra: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Interra Credit Union (Goshen, IN) membership is open to people who live or work in 24 named northern Indiana counties (incl. Elkhart, St. Joseph, Allen, Kosciusko, Marshall, LaPorte, Porter, Lake), immediate family of members, or employees of businesses that offer Interra membership as a benefit.",
      eligibility_source: "https://www.interracu.com/personal/credit-cards",
    },
    profed: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "ProFed Credit Union (Fort Wayne) membership is open to people who live, work, worship, attend school, volunteer, or regularly conduct business in Adams, Allen, DeKalb, Huntington, LaGrange, Noble, Steuben, Wells, or Whitley counties in northeast Indiana. A $5 deposit establishes membership.",
      eligibility_source: "https://profedcu.org/resources/our-credit-union/locations/main-branch",
    },
    beacon: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Beacon Credit Union (Wabash, IN) membership is open to people who live or work in 56 named Indiana counties across North Central/Northeastern Indiana (incl. Allen, Tippecanoe, St. Joseph, Marshall, Kosciusko, Howard, Madison, Johnson, Hancock) plus 5 western Kentucky counties, and relatives of eligible members.",
      eligibility_source: "https://www.beaconcu.org/become-a-member/",
    },
  },
  seeds: [
    {
      id: "imcu-visa-signature",
      card_name: "IMCU Visa Signature",
      issuer: "indiana-members-cu",
      offer_link: "https://www.imcu.com/personal/credit-cards",
      key_benefits: [
        "1.5 points per $1 on purchases; redeem for travel, merchandise, gift cards, or cash back",
        "3.9% intro APR for 12 months",
        "No annual fee",
      ],
      eligibility: "imcu",
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
      cpp_value: 0.01,
      foreign_tx_fee_pct: 2,
    },
    {
      id: "imcu-visa-platinum-rewards",
      card_name: "IMCU Visa Platinum Rewards",
      issuer: "indiana-members-cu",
      offer_link: "https://www.imcu.com/personal/credit-cards",
      key_benefits: [
        "1 point per $1 on purchases; redeem for travel, merchandise, gift cards, or cash back",
        "3.9% intro APR for 12 months",
        "No annual fee",
      ],
      eligibility: "imcu",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      foreign_tx_fee_pct: 2,
    },
    {
      id: "imcu-business-rewards-visa",
      card_name: "IMCU Business Rewards Visa",
      issuer: "indiana-members-cu",
      card_type: "business",
      offer_link: "https://www.imcu.com/personal/credit-cards",
      key_benefits: [
        "Rewards points on business purchases",
        "No annual fee",
        "Travel & Emergency Assistance, Purchase Security, Extended Warranty Protection, and up to $200,000 Travel Accident Insurance",
      ],
      eligibility: "imcu",
      protections: { purchase_protection: true, extended_warranty: true },
    },
    {
      id: "everwise-visa-signature-rewards",
      card_name: "Everwise Visa Signature Rewards",
      issuer: "everwise-cu",
      state_restricted: ["IN", "MI"],
      offer_link: "https://www.everwisecu.com/personal/credit-cards",
      key_benefits: [
        "1.5 points per $1 on purchases; redeem any time for cash back, merchandise, travel, or gift cards",
        "0% intro APR for 6 months on purchases and balance transfers",
        "No annual fee and no foreign transaction fee; rental car insurance and extended warranty protection",
      ],
      eligibility: "everwise",
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
      cpp_value: 0.01,
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 6, go_to_apr_low: 14.75, go_to_apr_high: 18.75 },
      travel: { no_foreign_tx_fee: true },
      protections: { extended_warranty: true },
    },
    {
      id: "centra-the-you-visa-signature",
      card_name: "Centra The You Visa Signature",
      issuer: "centra-cu",
      state_restricted: ["IN", "KY"],
      offer_link: "https://www.centra.org/borrow/low-rate-credit-cards/",
      key_benefits: [
        "1 point per $1 on purchases; redeem for cash back, merchandise, or travel",
        "0% intro APR for 6 months on purchases, balance transfers, and cash advances",
        "No annual fee; cellular telephone protection, trip cancellation, and rental collision damage waiver",
      ],
      eligibility: "centra",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 6, go_to_apr_low: 11.75, go_to_apr_high: 18.0 },
      foreign_tx_fee_pct: 1,
      protections: { cell_phone_protection: true },
    },
    {
      id: "forum-cu-mastercard-cash-back",
      card_name: "FORUM Mastercard",
      issuer: "forum-cu",
      offer_link: "https://www.forumcu.com/loans/credit-card",
      key_benefits: [
        "Unlimited 1% cash back on every purchase, paid automatically each month",
        "2.99% intro APR for 12 months on purchases and balance transfers",
        "No annual fee, no balance transfer fee, no foreign transaction fee",
      ],
      eligibility: "forum",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "purdue-federal-visa-signature-cash-back",
      card_name: "Purdue Federal Visa Signature",
      issuer: "purdue-federal-cu",
      offer_link: "https://www.purduefed.com/Personal/Loans/Credit-Cards/Visa-Signature-Credit-Cards",
      key_benefits: [
        "Up to 2% cash back on every purchase, no category restrictions or limits",
        "0% intro APR for 12 months on purchases, balance transfers, and cash advances",
        "No annual fee, no foreign transaction fee, no balance transfer or cash advance fee",
      ],
      eligibility: "purdueFed",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, go_to_apr_low: 15.5, go_to_apr_high: 17.5 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "interra-mastercard-elite",
      card_name: "Interra Mastercard Elite",
      issuer: "interra-cu",
      offer_link: "https://www.interracu.com/personal/credit-cards",
      key_benefits: [
        "10,000 bonus points after $2,000 in purchases within 90 days of account opening",
        "1.5 points per $1 on every purchase; redeem for cash back, travel, gift cards, or merchandise",
        "0% intro APR for 12 months on purchases and balance transfers; no annual fee",
      ],
      eligibility: "interra",
      bonus_amount: 10000,
      bonus_currency: "points",
      cpp_value: 0.01,
      min_spend: 2000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, go_to_apr_low: 13.75, go_to_apr_high: 23.75 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "profed-visa-rewards",
      card_name: "ProFed Visa Rewards",
      issuer: "profed-cu",
      offer_link: "https://profedcu.org/personal/credit-cards/visa-rewards-card",
      key_benefits: [
        "1% cash back on all eligible purchases (2% during select times), paid to savings in $25 increments",
        "No cap on cash back earned",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "profed",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
    },
    {
      id: "beacon-cu-2-percent-cash-back-rewards-visa",
      card_name: "Beacon 2% Cash Back Rewards Visa",
      issuer: "beacon-cu",
      offer_link: "https://www.mybcu.org/new-2-cash-back-rewards-visa-card",
      key_benefits: [
        "2% cash back on all purchases, credited automatically each month",
        "No annual fee and no balance transfer fee",
        "Automatic enrollment in the rewards program at account opening",
      ],
      eligibility: "beacon",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
    },
  ],
})
