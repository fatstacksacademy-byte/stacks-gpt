import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const delawareCards = buildStateCards({
  state: "DE",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    delOne: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Del-One Federal Credit Union (Delaware's largest credit union, HQ Dover) membership is open to State of Delaware employees, employees/retirees of 200+ Select Employer Groups, those who live/work/worship/attend school in Georgetown, Milford, Newark, Wilmington or the West Dover area, and immediate family/household of members. Anyone else in Delaware or an adjacent bordering county can join via the Del-One Foundation (a $12 nonprofit benefiting Delaware residents) - a defined DE + adjacent MD/PA border-county footprint (Chester & Delaware Cos. PA; Cecil, Kent, Queen Anne's, Caroline, Dorchester, Wicomico, Worcester Cos. MD), not a nationwide backdoor.",
      eligibility_source: "https://www.del-one.org/become-a-member/",
    },
    dexsta: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "DEXSTA Federal Credit Union membership is open to you, your family, and household members who live, work, worship, volunteer, or attend school in New Castle County or Kent County, Delaware, or Cecil County, Maryland. No nationwide association path.",
      eligibility_source: "https://www.dexsta.com/about-dexsta-federal-credit-union/",
    },
    communityPowered: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Community Powered Federal Credit Union (HQ Bear, DE) membership is open to persons who live, work, worship, attend school, participate in poverty-alleviation programs or associations headquartered in, and businesses/entities located in Kent or New Castle Counties, Delaware, or Cecil County, Maryland; relatives of members may also join. A $5 Share Savings Account establishes membership. No nationwide path.",
      eligibility_source: "https://cpwrfcu.org/join-the-community/",
    },
  },
  seeds: [
    {
      id: "del-one-fcu-rewards-visa",
      card_name: "Del-One Rewards VISA",
      issuer: "del-one-fcu",
      offer_link: "https://www.del-one.org/rewards-credit-card/",
      state_restricted: ["DE", "MD", "PA"],
      key_benefits: [
        "1 point per $1 spent, redeemable for cash back, travel, or merchandise",
        "0% introductory APR on balance transfers for the first 6 months",
        "Variable purchase APR of 12.75%-18.00% based on creditworthiness",
        "No annual fee and a low 1.00% foreign transaction fee",
      ],
      eligibility: "delOne",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { bt_apr_months: 6, go_to_apr_low: 12.75, go_to_apr_high: 18.0 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "del-one-fcu-student-rewards-visa",
      card_name: "Del-One Student Rewards VISA",
      issuer: "del-one-fcu",
      offer_link: "https://www.del-one.org/rewards-credit-card/",
      state_restricted: ["DE", "MD", "PA"],
      key_benefits: [
        "1 point per $1 spent, redeemable for cash back rewards",
        "No minimum credit score to qualify - designed to establish credit",
        "Variable purchase APR of 12.75%-18.00% based on creditworthiness",
        "No annual fee and a low 1.00% foreign transaction fee",
      ],
      eligibility: "delOne",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      intro_apr: { go_to_apr_low: 12.75, go_to_apr_high: 18.0 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "del-one-fcu-shared-secured-visa",
      card_name: "Del-One Shared Secured VISA",
      issuer: "del-one-fcu",
      offer_link: "https://www.del-one.org/rewards-credit-card/",
      state_restricted: ["DE", "MD", "PA"],
      key_benefits: [
        "Secured by funds on deposit to build or rebuild credit",
        "No minimum credit score to qualify",
        "15.90% APR and no annual fee",
        "Low 1.00% foreign transaction fee",
      ],
      eligibility: "delOne",
      credit_score_required: "poor",
      intro_apr: { go_to_apr_low: 15.9, go_to_apr_high: 15.9 },
      foreign_tx_fee_pct: 1,
    },
    {
      id: "dexsta-fcu-visa-platinum-rewards",
      card_name: "DEXSTA VISA Platinum Rewards",
      issuer: "dexsta-fcu",
      offer_link: "https://www.dexsta.com/credit-cards/",
      state_restricted: ["DE", "MD"],
      key_benefits: [
        "1 point per $1 spent, redeemable for cash, travel, or merchandise; points never expire",
        "2.99% introductory APR for the first 12 months",
        "No annual fee, no balance transfer fee, no over-limit fee, and no cash advance fee",
      ],
      eligibility: "dexsta",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
    },
    {
      id: "dexsta-fcu-visa-platinum",
      card_name: "DEXSTA VISA Platinum",
      issuer: "dexsta-fcu",
      offer_link: "https://www.dexsta.com/credit-cards/",
      state_restricted: ["DE", "MD"],
      key_benefits: [
        "Everyday low-rate card with a 2.99% introductory APR for the first 12 months",
        "No annual fee, no balance transfer fee, no over-limit fee, and no cash advance fee",
      ],
      eligibility: "dexsta",
    },
    {
      id: "community-powered-fcu-visa",
      card_name: "Community Powered VISA",
      issuer: "community-powered-fcu",
      offer_link: "https://cpwrfcu.org/visa/",
      state_restricted: ["DE", "MD"],
      key_benefits: [
        "Low fixed-rate APR based on creditworthiness",
        "25-day grace period on purchases and no annual fee",
        "Apple Pay and Google Pay support with 24/7 online account access",
      ],
      eligibility: "communityPowered",
    },
  ],
})
