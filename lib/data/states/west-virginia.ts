import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const westVirginiaCards = buildStateCards({
  state: "WV",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    pioneer: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Pioneer Appalachia Federal Credit Union (Charleston, WV; formerly Pioneer WV FCU) is a community-chartered CU whose field of membership is built from approved census tracts across a defined multi-state Appalachian footprint (West Virginia, Virginia, Maryland, Kentucky, Ohio, and Pennsylvania). You qualify by living, working, worshiping, attending school, or volunteering in an eligible community, by being immediate family of a member, or as a volunteer member of the WV-based WVSSPA. Eligibility varies by exact address; no nationwide open-to-anyone association/donation backdoor.",
      eligibility_source: "https://www.pioneerafcu.org/connect/join-pioneer",
    },
    membersChoice: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Members Choice WV Federal Credit Union (Charleston) is a community-chartered CU open to people who live, work, worship, volunteer, or attend school in 20 West Virginia counties (Boone, Braxton, Cabell, Calhoun, Clay, Gilmer, Jackson, Kanawha, Lincoln, Logan, Mason, Mingo, Pleasants, Putnam, Ritchie, Roane, Wayne, Webster, Wirt, and Wood) plus their relatives. No nationwide association/donation backdoor.",
      eligibility_source: "https://www.memberschoicewv.com/your-mcwv",
    },
    element: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Element Federal Credit Union (Charleston, WV) is open to people who live, work, worship, or attend school in Kanawha County, WV, to employees of its select employer groups, and to immediate family of existing members. Branches are all in the Charleston, WV area. No nationwide association/donation backdoor.",
      eligibility_source: "https://www.elementfcu.org/faq/",
    },
    unitedBank: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "United Bank is the regional bank of United Bankshares (the largest bank headquartered in West Virginia; dual HQ Charleston, WV and Washington, D.C.), operating ~240 branches across eight states - VA, WV, MD, PA, OH, NC, SC, GA - plus Washington, D.C. Its in-house Visa Classic and Visa Platinum cards are offered to bank customers within that regional footprint (the annual fee is waived with a United Bank deposit account), tying eligibility to the bank's branch geography rather than nationwide availability.",
      eligibility_source: "https://www.unitedbank.com/borrow/personal/visa-credit-cards",
    },
  },
  seeds: [
    {
      id: "pioneer-afcu-perks-rewards-visa",
      card_name: "Pioneer Perks Rewards Visa",
      issuer: "pioneer-appalachia-fcu-wv",
      state_restricted: ["WV", "VA", "MD", "KY", "OH", "PA"],
      offer_link: "https://www.pioneerafcu.org/lending/credit-cards",
      key_benefits: [
        "2 points per $1 on everyday purchases; 1 point per $1 on balance transfers",
        "No annual fee; rates as low as 11.99% APR (varies by creditworthiness)",
        "Points never expire with no minimum redemption (uChoose Rewards)",
      ],
      eligibility: "pioneer",
      rewards: [{ categories: ["everything_else"], multiplier: 2 }],
      cpp_value: 0.01,
    },
    {
      id: "members-choice-wv-visa",
      card_name: "Members Choice WV Visa",
      issuer: "members-choice-wv-fcu",
      offer_link: "https://www.memberschoicewv.com/visa-credit-cards",
      key_benefits: [
        "1 uChoose Rewards point per $1 spent; redeemable for cash back as a statement credit",
        "Low 9.99% APR on purchases and cash advances",
        "No annual fee; 25-day grace period",
      ],
      eligibility: "membersChoice",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
    },
    {
      id: "element-fcu-cash-back-mastercard",
      card_name: "Element FCU Cash Back MasterCard",
      issuer: "element-fcu-wv",
      offer_link: "https://www.elementfcu.org/product/loan-credit-cards/",
      key_benefits: [
        "1% cash back on all purchases",
        "Low annual percentage rate; no annual fee",
        "Issued by a Kanawha County, WV community credit union",
      ],
      eligibility: "element",
      rewards: [{ categories: ["everything_else"], multiplier: 1, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
    },
    {
      id: "element-fcu-traditional-mastercard",
      card_name: "Element FCU Traditional MasterCard",
      issuer: "element-fcu-wv",
      offer_link: "https://www.elementfcu.org/product/loan-credit-cards/",
      key_benefits: [
        "1.99% introductory APR for 6 months",
        "No annual fee",
        "Issued by a Kanawha County, WV community credit union",
      ],
      eligibility: "element",
    },
    {
      id: "united-bank-visa-platinum",
      card_name: "United Bank Visa Platinum",
      issuer: "united-bank-wv",
      state_restricted: ["WV", "VA", "MD", "PA", "OH", "NC", "SC", "GA"],
      offer_link: "https://www.unitedbank.com/borrow/personal/visa-credit-cards",
      key_benefits: [
        "Earn points on every qualified purchase; redeem for cash back or ScoreCard Rewards",
        "11.75% APR for purchases, cash advances, and balance transfers",
        "$25 annual fee waived with a United Bank deposit account",
      ],
      eligibility: "unitedBank",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      annual_fee: 25,
    },
    {
      id: "united-bank-visa-classic",
      card_name: "United Bank Visa Classic",
      issuer: "united-bank-wv",
      state_restricted: ["WV", "VA", "MD", "PA", "OH", "NC", "SC", "GA"],
      offer_link: "https://www.unitedbank.com/borrow/personal/visa-credit-cards",
      key_benefits: [
        "13.75% APR for purchases, cash advances, and balance transfers",
        "$20 annual fee waived with a United Bank deposit account",
        "Contactless payments and SecurLOCK fraud monitoring",
      ],
      eligibility: "unitedBank",
      annual_fee: 20,
    },
  ],
})
