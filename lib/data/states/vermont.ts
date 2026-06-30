import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const vermontCards = buildStateCards({
  state: "VT",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    vermontFederal: {
      eligibility_scope: "statewide",
      eligibility_notes:
        "Vermont Federal Credit Union (HQ South Burlington, VT) is open to anyone who lives, works, worships, or attends school anywhere in the State of Vermont - the field of membership was expanded in November 2021 to cover the entire state (adding Essex, Rutland, Windsor, Bennington, and Windham counties) - plus immediate family/household of members. A $5 share deposit establishes membership. Membership is confined to Vermont geography with no nationwide association/foundation backdoor.",
      eligibility_source: "https://www.vermontfederal.org/news/field-of-membership-and-logo",
    },
    heritageFamily: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Heritage Family Credit Union (HQ Rutland, VT) serves a defined VT/NH/NY/MA footprint: anyone who lives, works, worships, attends school, volunteers, or regularly conducts business in five Vermont counties (Addison, Bennington, Rutland, Windham, Windsor), several New Hampshire counties (Cheshire, Hillsborough, Merrimack, Rockingham, Sullivan), New York's Washington and Rensselaer counties, and Massachusetts' Berkshire and Franklin counties - plus immediate family/household of members and the surviving spouse of a member. Membership is geography-bound with no nationwide association/foundation backdoor.",
      eligibility_source: "https://www.hfcuvt.com/become-a-member/apply/membership-eligibility",
    },
    northCountry: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "NorthCountry Federal Credit Union (HQ South Burlington, VT) serves anyone who lives, works, worships, or attends an educational institution in 11 Vermont counties (Addison, Caledonia, Chittenden, Essex, Franklin, Grand Isle, Lamoille, Orange, Orleans, Rutland, Washington), two New Hampshire counties (Coos, Grafton), and New York's Clinton County - plus immediate family of members. A $5 share balance establishes membership. The field of membership is confined to that VT/NH/NY geography with no nationwide association/foundation backdoor.",
      eligibility_source: "https://www.northcountry.org/about/explore/membership",
    },
  },
  seeds: [
    {
      id: "vermontfederal-visa-signature-rewards",
      card_name: "Visa Signature Rewards Credit Card",
      issuer: "vermont-federal-cu",
      offer_link: "https://www.vermontfederal.org/visa-credit-card",
      key_benefits: [
        "1.25 points per $1 spent, redeemable for account credit, travel, charity donations, event tickets, or merchandise",
        "14.20%-18.00% variable APR (Prime-based) with no annual fee",
        "Visa Signature protections incl. cellular telephone protection, purchase security, extended warranty, price protection, return protection, and trip cancellation/interruption",
        "Low 1.00% foreign transaction fee",
      ],
      eligibility: "vermontFederal",
      rewards: [{ categories: ["everything_else"], multiplier: 1.25 }],
      cpp_value: 0.01,
      intro_apr: { go_to_apr_low: 14.2, go_to_apr_high: 18.0 },
      foreign_tx_fee_pct: 1,
      protections: {
        cell_phone_protection: true,
        purchase_protection: true,
        extended_warranty: true,
        return_protection: true,
        price_protection: true,
      },
    },
    {
      id: "vermontfederal-visa-platinum",
      card_name: "Visa Platinum Credit Card",
      issuer: "vermont-federal-cu",
      offer_link: "https://www.vermontfederal.org/visa-credit-card",
      key_benefits: [
        "Low-rate, no-rewards card for emergencies, debt consolidation, or everyday spending",
        "2.00% introductory APR on balance transfers for six billing cycles, then 11.20%-18.00% variable",
        "No annual fee and no balance transfer fee",
        "Low 1.00% foreign transaction fee",
      ],
      eligibility: "vermontFederal",
      foreign_tx_fee_pct: 1,
    },
    {
      id: "vermontfederal-share-secured-visa",
      card_name: "Share Secured Visa Credit Card",
      issuer: "vermont-federal-cu",
      offer_link: "https://www.vermontfederal.org/credit-cards",
      key_benefits: [
        "Secured Visa backed by a share-account deposit to establish or rebuild a positive credit history",
        "No credit check required to qualify",
        "No annual fee",
      ],
      eligibility: "vermontFederal",
      credit_score_required: "poor",
    },
    {
      id: "heritagefamily-emerald-visa",
      card_name: "Emerald Visa Card",
      issuer: "heritage-family-cu",
      offer_link: "https://www.hfcuvt.com/spend-and-save/personal-accounts/emerald-visa-card.html",
      state_restricted: ["VT", "NH", "NY", "MA"],
      key_benefits: [
        "1 CURewards point per $1 spent, redeemable for merchandise, travel, events, gift cards, and statement credits",
        "Non-variable APR of 9.99% on the Gold rate tier or 12.90% on the Classic rate tier",
        "No annual fee and a no-fee balance transfer",
      ],
      eligibility: "heritageFamily",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      intro_apr: { go_to_apr_low: 9.99, go_to_apr_high: 12.9 },
    },
    {
      id: "northcountry-visa-credit-card",
      card_name: "Visa Credit Card",
      issuer: "northcountry-fcu",
      offer_link: "https://www.northcountry.org/spend/cards/credit-cards",
      state_restricted: ["VT", "NH", "NY"],
      key_benefits: [
        "Earn points on qualified purchases, redeemable for cash and more",
        "Variable APR as low as 7.45% with no annual fee",
        "No balance transfer or cash advance fee, plus access to Roadside Dispatch",
      ],
      eligibility: "northCountry",
      intro_apr: { go_to_apr_low: 7.45, go_to_apr_high: 7.45 },
    },
  ],
})
