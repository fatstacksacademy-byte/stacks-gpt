import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const kentuckyCards = buildStateCards({
  state: "KY",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    lnfcu: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "L&N Federal Credit Union (Louisville) is a multi-group chartered CU open to people who live, work, worship, attend school, or belong to a legal entity in a defined footprint across the Louisville/Bullitt/Oldham/Shelby/Spencer/Trimble/Henry KY area, several southeastern KY counties (Knox, Laurel, Pulaski, Rockcastle, Whitley), Clark and Floyd counties in IN, and Hamilton County, OH; plus family of members and select employer/association groups. No nationwide donation/association backdoor. Serves KY, IN, and a sliver of OH.",
      eligibility_source: "https://www.lnfcu.com/about-lnfcu",
    },
    classact: {
      eligibility_scope: "association",
      eligibility_notes:
        "Class Act Federal Credit Union (Louisville) is an education-community CU. Eligibility is tied to employment/retirement/volunteering at 30+ named KY school systems and colleges (incl. Jefferson County Public Schools, University of Louisville), being a JCPS or U of L student/alum, family/household of members, or (for KY/IN residents) joining via Kentucky PTA. Service area is Jefferson, Bullitt, Oldham, Shelby, Nelson, and Spencer Counties. No nationwide open-to-anyone donation backdoor.",
      eligibility_source: "https://www.classact.org/who-we-are/about-us",
    },
    abound: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Abound Credit Union (Radcliff, KY; formerly Fort Knox FCU) membership is open to people who live, work, worship, attend school, or regularly conduct business in designated KY areas (branch counties include Hardin, Grayson, Meade, Nelson, Boyle, LaRue, Taylor, Bullitt, Warren, and Jefferson), to active-duty/Reserve/Guard military and civil-service employees, to Fort Knox contractors, and to Select Employer Groups. A $15 initial deposit/fee establishes membership. Military/employer affiliations only; no nationwide open-to-anyone donation backdoor.",
      eligibility_source: "https://www.aboundcu.com/about/new-membership/become-a-member",
    },
    membersHeritage: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Members Heritage Credit Union (Lexington) membership is open to people who live, work, worship, attend school, or have family within the 22 central/eastern KY counties of the Bluegrass and Gateway districts (incl. Fayette, Franklin, Madison, Scott, Jessamine, Clark, Bourbon, Woodford). A $5 savings deposit establishes membership. No nationwide association/donation backdoor.",
      eligibility_source: "https://www.membersheritage.org/join-mhcu",
    },
    serviceOne: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Service One Credit Union (Bowling Green) membership is open to people (and their relatives) who live, work, worship, or attend school in its south-central/western KY service area (Warren, Barren, Allen, Butler, Christian, Hopkins, Logan, Simpson, Todd, Trigg and adjacent counties). A $5 savings deposit establishes membership. No nationwide association/donation backdoor.",
      eligibility_source: "https://www.socu.com/start-your-membership",
    },
    transcend: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Transcend Credit Union (Louisville; formerly Kentucky Telco FCU) membership is open to anyone who works, lives, worships, or attends school in 25 named KY counties spanning the Louisville, Lexington, and Owensboro areas (incl. Jefferson, Fayette, Daviess, Oldham, Shelby, Scott, Bullitt). A $5 savings balance maintains membership. No nationwide association/donation backdoor.",
      eligibility_source: "https://www.transcendcu.com/connect/our-history",
    },
    republicBank: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Republic Bank & Trust Company is a Louisville, KY-headquartered regional bank operating banking centers in five states (KY, TN, OH, IN, FL). Its in-house Mastercard business credit cards are available to RBT business clients with an existing Republic Bank deposit account, tying eligibility to the bank's regional footprint rather than nationwide. Serves KY, TN, OH, IN, FL.",
      eligibility_source: "https://www.republicbank.com/business/credit-cards/",
    },
  },
  seeds: [
    {
      id: "lnfcu-platinum-cash-back-rewards-visa",
      card_name: "L&N FCU Platinum Cash Back Rewards Visa",
      issuer: "ln-federal-cu-ky",
      state_restricted: ["KY", "IN", "OH"],
      offer_link: "https://www.lnfcu.com/credit-cards",
      key_benefits: [
        "$50 cash back after $1,000 in purchases in the first 90 days",
        "2% cash back on gas purchases, 1% on all other purchases",
        "0% intro APR for 6 months on purchases and balance transfers; no annual fee",
      ],
      eligibility: "lnfcu",
      bonus_amount: 50,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 1000,
      spend_months: 3,
      rewards: [
        { categories: ["gas_stations"], multiplier: 2, unit: "%" },
        { categories: ["everything_else"], multiplier: 1, unit: "%" },
      ],
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 6 },
    },
    {
      id: "lnfcu-platinum-business-visa",
      card_name: "L&N FCU Platinum Business Visa",
      issuer: "ln-federal-cu-ky",
      card_type: "business",
      state_restricted: ["KY", "IN", "OH"],
      offer_link: "https://www.lnfcu.com/credit-cards",
      key_benefits: [
        "2% cash back on gas purchases, 1% on all other purchases",
        "0% introductory APR on purchases and balance transfers",
        "$35 annual fee",
      ],
      eligibility: "lnfcu",
      rewards: [
        { categories: ["gas_stations"], multiplier: 2, unit: "%" },
        { categories: ["everything_else"], multiplier: 1, unit: "%" },
      ],
      bonus_currency: "cash",
      cpp_value: 1,
      annual_fee: 35,
    },
    {
      id: "classact-visa-platinum",
      card_name: "Class Act Visa Platinum",
      issuer: "class-act-federal-cu-ky",
      offer_link: "https://www.classact.org/loans/visa-platinum-credit-card",
      key_benefits: [
        "1% cash back on purchases, deposited to your Class Act savings",
        "0% introductory rate for 6 months on purchases",
        "No annual fee; rates as low as 12.75% APR",
      ],
      eligibility: "classact",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { purchase_apr_months: 6 },
    },
    {
      id: "abound-visa-platinum",
      card_name: "Abound Visa Platinum",
      issuer: "abound-cu-ky",
      offer_link: "https://www.aboundcu.com/cards/credit-cards/visa-credit-cards/platinum-credit-card",
      key_benefits: [
        "5% cash back on gas at the pump, 1% cash back on all other purchases",
        "No annual fee and no balance transfer fee",
        "Rates as low as 13.75% APR; includes Visa travel insurance",
      ],
      eligibility: "abound",
      rewards: [
        { categories: ["gas_stations"], multiplier: 5, unit: "%" },
        { categories: ["everything_else"], multiplier: 1, unit: "%" },
      ],
      bonus_currency: "cash",
      cpp_value: 1,
    },
    {
      id: "members-heritage-visa-rewards",
      card_name: "Members Heritage Visa",
      issuer: "members-heritage-cu-ky",
      offer_link: "https://www.membersheritage.org/credit-cards",
      key_benefits: [
        "1 point per $1 on qualifying purchases via Members Heritage Rewards",
        "Redeem points for cash back to savings/checking, gift cards, merchandise, or travel",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "membersHeritage",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
    {
      id: "service-one-visa-signature-everyday-rewards",
      card_name: "Service One Visa Signature Everyday Rewards",
      issuer: "service-one-cu-ky",
      offer_link: "https://www.socu.com/credit-cards",
      key_benefits: [
        "3 points per $1 on restaurants and fast food",
        "2 points per $1 on groceries and travel; 1.5 points per $1 on everything else",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "serviceOne",
      rewards: [
        { categories: ["dining"], multiplier: 3 },
        { categories: ["groceries", "travel"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1.5 },
      ],
      cpp_value: 0.01,
      foreign_tx_fee_pct: 1,
    },
    {
      id: "service-one-visa-platinum",
      card_name: "Service One Visa Platinum",
      issuer: "service-one-cu-ky",
      offer_link: "https://www.socu.com/credit-cards",
      key_benefits: [
        "1 point per $1 on purchases",
        "3.99% intro APR for 12 months on purchases and balance transfers (completed within the first 90 days)",
        "No annual fee and no balance transfer fee",
      ],
      eligibility: "serviceOne",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, go_to_apr_low: 11.75, go_to_apr_high: 19.75 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "transcend-prestige-visa",
      card_name: "Transcend Prestige Visa",
      issuer: "transcend-cu-ky",
      offer_link: "https://www.transcendcu.com/loans/unsecured-loans/credit-cards",
      key_benefits: [
        "0% intro APR for 6 months on purchases and balance transfers",
        "Fixed rates as low as 8.90% APR; no annual fee",
        "No balance transfer fee and no cash advance fee",
      ],
      eligibility: "transcend",
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 6, go_to_apr_low: 8.9, go_to_apr_high: 17.9 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "republic-bank-business-cash-mastercard",
      card_name: "Republic Bank Mastercard Business Cash",
      issuer: "republic-bank-trust-ky",
      card_type: "business",
      state_restricted: ["KY", "TN", "OH", "IN", "FL"],
      offer_link: "https://www.republicbank.com/business/credit-cards/",
      key_benefits: [
        "1.25% cash back on all net purchases",
        "Available to Republic Bank business clients with an existing deposit account",
        "$35 annual fee",
      ],
      eligibility: "republicBank",
      rewards: [{ categories: ["everything_else"], multiplier: 1.25, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      annual_fee: 35,
    },
    {
      id: "republic-bank-business-manager-mastercard",
      card_name: "Republic Bank Mastercard Business Manager",
      issuer: "republic-bank-trust-ky",
      card_type: "business",
      state_restricted: ["KY", "TN", "OH", "IN", "FL"],
      offer_link: "https://www.republicbank.com/business/credit-cards/",
      key_benefits: [
        "Earn travel benefits or merchandise through Republic Bank's uChoose Rewards",
        "$0 introductory annual fee for the first year, then $95",
        "Available to Republic Bank business clients with an existing deposit account",
      ],
      eligibility: "republicBank",
      annual_fee: 95,
      annual_fee_waived_first_year: true,
    },
  ],
})
