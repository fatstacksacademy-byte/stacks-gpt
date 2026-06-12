import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const districtOfColumbiaCards = buildStateCards({
  state: "DC",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    lafayette: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Lafayette Federal CU serves the DC metro: open to anyone who lives/works/worships/attends school in Washington, DC; lives or works in Potomac, MD; ~200 select employer groups; or joins via the American Consumer Council, which the CU restricts to residents of DC, Maryland, and Virginia (not nationwide). Immediate family of members also qualify.",
      eligibility_source: "https://www.lfcu.org/open-an-account/",
    },
    signal: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Signal Financial FCU's field of membership covers people who live/work/worship/attend school in Washington, DC and parts of Prince George's County, MD, residents of Leisure World of Maryland, family of members, and ~200 select employer groups (Verizon, AT&T, etc.). A $5 donation to the Signal Financial Charitable Foundation opens membership to residents of MD, DC, VA, WV, DE, PA, and NJ only - a regional, not nationwide, backdoor.",
      eligibility_source: "https://www.signalfinancialfcu.org/credit-union-member",
    },
    idb: {
      eligibility_scope: "association",
      eligibility_notes:
        "IDB Global FCU membership is limited to the Inter-American Development Bank community: employees, consultants, retirees, interns, and Executive/Alternate Directors of the IDB, IDB Invest, or IDB Lab; contractors in the IDB HQ building in Washington, DC; and their immediate family. No community or nationwide-association backdoor.",
      eligibility_source: "https://www.idbglobalfcu.org/membership/index.htm",
    },
    dccu: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "DC Credit Union (formerly District Government Employees FCU) is open to all persons who live, worship, work, or attend school in - and businesses located in - Washington, DC and Prince George's County, MD, plus immediate family/household of eligible persons. No Virginia coverage and no association/foundation backdoor.",
      eligibility_source: "https://www.dccreditunion.coop/join/",
    },
    agfed: {
      eligibility_scope: "association",
      eligibility_notes:
        "Agriculture FCU (AgFed), headquartered in Washington, DC, limits membership to employees/retirees of its select employer groups (centered on USDA and related agriculture-sector employers) and their family members. No geographic community charter or nationwide-association backdoor.",
      eligibility_source: "https://www.agfed.org/membership/",
    },
  },
  seeds: [
    {
      id: "lafayette-fcu-mastercard-rewards",
      card_name: "Lafayette FCU Platinum Mastercard Rewards",
      issuer: "lafayette-fcu",
      offer_link: "https://www.lfcu.org/personal/credit-cards/",
      state_restricted: ["DC", "MD", "VA"],
      key_benefits: [
        "50,000 bonus points (~$500 value) after $5,000 in purchases in 90 days",
        "1 point per $1 on all purchases",
        "No annual fee and no foreign transaction fee",
      ],
      eligibility: "lafayette",
      bonus_amount: 50000,
      bonus_currency: "points",
      cpp_value: 0.01,
      min_spend: 5000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "signal-financial-signature-visa",
      card_name: "Signal Financial Signature Visa",
      issuer: "signal-financial-fcu",
      offer_link: "https://www.signalfinancialfcu.org/credit-cards",
      state_restricted: ["DC", "MD", "VA", "WV", "DE", "PA", "NJ"],
      key_benefits: [
        "$100 cash back after $1,000 in purchases in 90 days",
        "3% travel, 2% gas/groceries/restaurants, 1% everything else",
        "0% intro APR for 12 months on purchases and balance transfers",
        "No annual fee and no foreign transaction fee",
      ],
      eligibility: "signal",
      bonus_amount: 100,
      bonus_currency: "cash",
      cpp_value: 1,
      min_spend: 1000,
      spend_months: 3,
      rewards: [
        { categories: ["travel"], multiplier: 3, unit: "%" },
        { categories: ["gas_stations", "groceries", "dining"], multiplier: 2, unit: "%" },
        { categories: ["everything_else"], multiplier: 1, unit: "%" },
      ],
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, go_to_apr_low: 14.25, go_to_apr_high: 18.0 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "signal-financial-platinum-visa",
      card_name: "Signal Financial Platinum Visa",
      issuer: "signal-financial-fcu",
      offer_link: "https://www.signalfinancialfcu.org/credit-cards",
      state_restricted: ["DC", "MD", "VA", "WV", "DE", "PA", "NJ"],
      key_benefits: [
        "10,000 bonus points after $1,000 in purchases in 90 days",
        "3x travel, 2x gas/groceries/restaurants, 1x everything else",
        "0% intro APR for 12 months on purchases and balance transfers",
        "No annual fee",
      ],
      eligibility: "signal",
      bonus_amount: 10000,
      bonus_currency: "points",
      cpp_value: 0.01,
      min_spend: 1000,
      spend_months: 3,
      rewards: [
        { categories: ["travel"], multiplier: 3 },
        { categories: ["gas_stations", "groceries", "dining"], multiplier: 2 },
        { categories: ["everything_else"], multiplier: 1 },
      ],
      intro_apr: { purchase_apr_months: 12, bt_apr_months: 12, go_to_apr_low: 13.25, go_to_apr_high: 18.0 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "idb-global-platinum-rewards-visa",
      card_name: "IDB Global Visa Platinum Rewards",
      issuer: "idb-global-fcu",
      offer_link: "https://www.idbglobalfcu.org/credit-cards/visa-platinum-rewards.html",
      key_benefits: [
        "30,000 bonus points (~$300 value) after $3,000 in purchases in 3 months",
        "1.5 points per $1 on every purchase",
        "0% intro APR 6 months on purchases, 12 billing cycles on balance transfers",
        "No annual fee, no foreign transaction fee, no balance transfer fee",
      ],
      eligibility: "idb",
      bonus_amount: 30000,
      bonus_currency: "points",
      cpp_value: 0.01,
      min_spend: 3000,
      spend_months: 3,
      rewards: [{ categories: ["everything_else"], multiplier: 1.5 }],
      intro_apr: { purchase_apr_months: 6, bt_apr_months: 12, go_to_apr_low: 9.5, go_to_apr_high: 18.0 },
      travel: { no_foreign_tx_fee: true },
    },
    {
      id: "dc-credit-union-platinum-visa",
      card_name: "DC Credit Union Platinum Visa",
      issuer: "dc-credit-union",
      offer_link: "https://www.dccreditunion.coop/personal/credit-cards/",
      state_restricted: ["DC", "MD"],
      key_benefits: [
        "ScoreCard Rewards points on every purchase",
        "No annual fee",
        "No balance transfer fee",
      ],
      eligibility: "dccu",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
    {
      id: "agfed-platinum-rebates-visa",
      card_name: "AgFed Visa Platinum with Rebates",
      issuer: "agfed",
      offer_link: "https://www.agfed.org/loans-credit-cards/visa/visa-platinum/",
      key_benefits: [
        "1.25% cash back on gas",
        "0.50% on first $1,500 net monthly purchases, 1.00% above $1,500",
        "No annual fee, no foreign transaction fee",
      ],
      eligibility: "agfed",
      bonus_currency: "cash",
      cpp_value: 1,
      rewards: [
        { categories: ["gas_stations"], multiplier: 1.25, unit: "%" },
        { categories: ["everything_else"], multiplier: 0.5, unit: "%" },
      ],
      travel: { no_foreign_tx_fee: true },
    },
  ],
})
