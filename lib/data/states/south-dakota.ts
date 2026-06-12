import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const southDakotaCards = buildStateCards({
  state: "SD",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    dakotaland: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Dakotaland FCU membership is open to people (and businesses) who live, work, worship, or attend school in any of 51 South Dakota counties (incl. Minnehaha, Pennington, Brown, Codington, Brookings, Hughes, Lincoln, Davison, Lawrence, Meade, Yankton), plus family of members.",
      eligibility_source: "https://www.dakotalandfcu.com/about-us/field-of-membership",
    },
    highmark: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Highmark FCU membership is open to those who live, work, worship, or attend school in Butte, Custer, Fall River, Harding, Lawrence, Meade, or Pennington County SD, or Campbell, Crook, Niobrara, or Weston County WY, plus immediate family of members.",
      eligibility_source: "https://www.highmarkfcu.com/join-us/why-join",
    },
    voyage: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Voyage FCU membership is open to people (and businesses) who live, work or regularly conduct business in, worship, or attend school in its rural-district charter area: 14 SD counties (incl. Minnehaha, Lincoln, Yankton, Davison, Brookings); Cedar or Dixon County NE; Dickinson, Lyon, Osceola, Plymouth, or Sioux County IA; and Lincoln, Nobles, Pipestone, or Rock County MN, plus family of members.",
      eligibility_source: "https://www.voyagefcu.org/charter",
    },
    levo: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Levo Credit Union (formerly Sioux Falls FCU) membership is open to those who (or whose immediate family) work, live, worship, attend school, or volunteer in any of its 29 qualifying counties along the I-29 corridor: 21 in SD (incl. Minnehaha, Lincoln, Brookings, Brown, Codington, Yankton), plus Plymouth/Sioux/Woodbury County IA, Clay County MN, and Cass/Ransom/Richland/Sargent County ND. A $5 share deposit opens membership.",
      eligibility_source: "https://www.levo.org/become-a-member",
    },
  },
  seeds: [
    {
      id: "dakotaland-fcu-cash-back-visa",
      card_name: "Dakotaland FCU Cash Back VISA Card",
      issuer: "dakotaland-fcu",
      offer_link: "https://www.dakotalandfcu.com/personal-lending/visa",
      key_benefits: [
        "1% cash back on all purchases, plus ScoreCard Rewards redemption for travel and merchandise",
        "Rate as low as 9.90% APR",
        "No annual fee",
        "25-day interest-free grace period on new purchases and no-cost travel accident insurance",
      ],
      eligibility: "dakotaland",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
    },
    {
      id: "highmark-fcu-ruby-cash-back-visa",
      card_name: "Highmark FCU Ruby Card",
      issuer: "highmark-fcu",
      offer_link: "https://www.highmarkfcu.com/personal/borrow/credit-cards",
      state_restricted: ["SD", "WY"],
      key_benefits: [
        "Tiered cash back up to 3% on annual purchases (1% on the first $1,000, 2% to $2,000, 2.5% to $3,000, 3% above $3,000)",
        "Rate as low as 14.90% APR",
        "No annual, over-limit, cash-advance, or transaction fees and no penalty APR",
        "1% foreign transaction fee",
      ],
      eligibility: "highmark",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      foreign_tx_fee_pct: 1,
    },
    {
      id: "highmark-fcu-platinum-rewards-visa",
      card_name: "Highmark FCU Platinum Card",
      issuer: "highmark-fcu",
      offer_link: "https://www.highmarkfcu.com/personal/borrow/credit-cards",
      state_restricted: ["SD", "WY"],
      key_benefits: [
        "Earn reward points on every purchase, redeemable for airline miles, hotels, car rentals, and more",
        "Rate as low as 9.90% APR",
        "No annual, over-limit, cash-advance, or transaction fees and no penalty APR",
        "1% foreign transaction fee",
      ],
      eligibility: "highmark",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      foreign_tx_fee_pct: 1,
    },
    {
      id: "voyage-fcu-passport-visa-platinum",
      card_name: "Voyage FCU Voyage Passport Card",
      issuer: "voyage-fcu",
      offer_link: "https://www.voyagefcu.org/services/cards/credit-cards",
      state_restricted: ["SD", "NE", "IA", "MN"],
      key_benefits: [
        "uChoose Rewards points on qualifying purchases, redeemable for travel, electronics, event tickets, and merchandise",
        "Rate ranges from 8.88% to 17.88% APR based on creditworthiness",
        "No annual fee, no balance-transfer fee, and no cash-advance fee",
        "Low foreign transaction fee (1.0% multi-currency / 0.8% single-currency)",
      ],
      eligibility: "voyage",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      foreign_tx_fee_pct: 1,
    },
    {
      id: "levo-cu-better-rewards-visa",
      card_name: "Levo Credit Union Better Rewards Visa",
      issuer: "levo-cu",
      offer_link: "https://www.levo.org/credit-card/visa-rewards",
      state_restricted: ["SD", "IA", "MN", "ND"],
      key_benefits: [
        "2% cash back on gas, groceries, and wholesale-club purchases and 1% on everything else, all year",
        "Up to 3% cash back during Black Friday week",
        "No annual fee, no balance-transfer fee, no over-limit fee, and no penalty rate",
        "Rewards redeemable for cash, gift cards, or travel",
      ],
      eligibility: "levo",
      rewards: [
        { categories: ["gas_stations", "groceries", "wholesale_clubs"], multiplier: 2, unit: "%" },
        { categories: ["everything_else"], multiplier: 1, unit: "%" },
      ],
    },
  ],
})
