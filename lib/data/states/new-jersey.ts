import { buildStateCards } from "./_builder"

const VERIFIED_AT = "2026-06-11"

export const newJerseyCards = buildStateCards({
  state: "NJ",
  verifiedAt: VERIFIED_AT,
  eligibility: {
    gardensavings: {
      eligibility_scope: "mixed",
      eligibility_notes:
        "Garden Savings FCU membership is open to those who live, work, worship, or regularly conduct business in Newark, Jersey City, or Elizabeth NJ; to immediate family of members; and to members of associations within its field of membership. A backdoor exists only for residents of New Jersey, New York, or Pennsylvania via the American Consumer Council, and Garden Savings reserves the right to approve/deny such memberships - so the footprint is a defined NJ/NY/PA region, not open nationwide.",
      eligibility_source: "https://www.gardensavingsfcu.org/about-us/become-a-member.html",
    },
    membersone: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Members 1st of NJ FCU (federally chartered, serving Cumberland and Salem County NJ) is open to employees of its Member Organization select employer groups, retirees of those groups, and immediate family of group employees. No nationwide association or charitable-donation backdoor is disclosed.",
      eligibility_source: "https://www.membersonenj.org/about-us/join-members-1st/",
    },
    jerseyshore: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "Jersey Shore FCU membership is open to anyone who lives, works, worships, volunteers, or attends school in Atlantic or Cape May counties NJ, to immediate family of members, and to employees/volunteers of organizations in its Community Network Program. No nationwide association or charitable-donation backdoor is disclosed.",
      eligibility_source: "https://www.jerseyshorefcu.org/membership/who-can-join/",
    },
    atlantic: {
      eligibility_scope: "selected_areas",
      eligibility_notes:
        "The Atlantic FCU membership is open to anyone who lives, works, worships, attends school, or regularly does business in Union or Essex counties NJ, to businesses/legal entities in those counties, and to immediate family or household members of members. No nationwide association or charitable-donation backdoor is disclosed.",
      eligibility_source: "https://www.theatlanticfcu.com/learn/about-the-atlantic/how-to-join",
    },
  },
  seeds: [
    {
      id: "garden-savings-cashback-plus-mastercard",
      card_name: "Garden Savings CashBack Plus Mastercard",
      issuer: "garden-savings-fcu",
      offer_link: "https://www.gardensavingsfcu.org/test/credit-cards.html",
      state_restricted: ["NJ", "NY", "PA"],
      key_benefits: [
        "Earn 1 ScoreCard Rewards point per $1 spent, redeemable for gifts, travel, gift cards, and cash back",
        "No annual fee and no balance transfer fee",
        "Cellular Wireless Telephone Protection and Mastercard AirportConcierge",
        "Travel Accident Insurance, baggage delay, and MasterRental collision damage waiver",
      ],
      eligibility: "gardensavings",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      protections: { cell_phone_protection: true },
      travel_insurance: { baggage_delay: true, rental_cdw_secondary: true },
    },
    {
      id: "garden-savings-premier-rate-mastercard",
      card_name: "Garden Savings Premier Rate Mastercard",
      issuer: "garden-savings-fcu",
      offer_link: "https://www.gardensavingsfcu.org/test/credit-cards.html",
      state_restricted: ["NJ", "NY", "PA"],
      key_benefits: [
        "Fixed APR as low as 8.00% (8.00%-18.00% based on creditworthiness)",
        "No annual fee and no balance transfer fee",
        "25-day grace period to avoid finance charges when paid in full",
        "Cellular Wireless Telephone Protection and Mastercard AirportConcierge",
      ],
      eligibility: "gardensavings",
      intro_apr: { go_to_apr_low: 8.0, go_to_apr_high: 18.0 },
      protections: { cell_phone_protection: true },
    },
    {
      id: "members-1st-nj-visa-platinum",
      card_name: "Members 1st of NJ Visa Platinum Credit Card",
      issuer: "members-1st-of-nj-fcu",
      offer_link: "https://www.membersonenj.org/loans/visa-credit-cards/",
      key_benefits: [
        "APR as low as 10.50% (10.50%-18.00% based on creditworthiness)",
        "No annual fee and no balance transfer fee",
        "25-day interest-free grace period on purchases",
        "ScoreCard Rewards points, with 2X-4X+ bonus points via ScoreMore retailers",
      ],
      eligibility: "membersone",
      rewards: [{ categories: ["everything_else"], multiplier: 1 }],
      cpp_value: 0.01,
      intro_apr: { go_to_apr_low: 10.5, go_to_apr_high: 18.0 },
    },
    {
      id: "jersey-shore-fcu-platinum-mastercard",
      card_name: "Jersey Shore FCU Platinum Mastercard",
      issuer: "jersey-shore-fcu",
      offer_link: "https://www.jerseyshorefcu.org/loans/credit-cards/",
      key_benefits: [
        "1.99% intro APR for 12 months on purchases and balance transfers",
        "No annual fee and no balance transfer fee",
        "Go-to APR 11.49%-18.00% based on creditworthiness",
        "Trip cancellation, auto rental CDW, extended warranty, and price protection",
      ],
      eligibility: "jerseyshore",
      protections: { extended_warranty: true, price_protection: true, purchase_protection: true },
      travel_insurance: { trip_cancellation: true, rental_cdw_secondary: true },
    },
    {
      id: "atlantic-fcu-visa-signature",
      card_name: "The Atlantic FCU Visa Signature Card",
      issuer: "atlantic-fcu",
      offer_link: "https://www.theatlanticfcu.com/personal/borrow/credit-cards",
      key_benefits: [
        "Unlimited 2% cash back on all purchases",
        "0% intro APR for 15 months on balance transfers made within 120 days of opening",
        "No annual fee",
        "Go-to APR 16.49%-17.99% variable based on creditworthiness",
      ],
      eligibility: "atlantic",
      rewards: [{ categories: ["everything_else"], multiplier: 2, unit: "%" }],
      bonus_currency: "cash",
      cpp_value: 1,
      intro_apr: { bt_apr_months: 15, bt_fee_pct: 3, bt_window_days: 120, go_to_apr_low: 16.49, go_to_apr_high: 17.99 },
    },
    {
      id: "atlantic-fcu-low-rate-visa",
      card_name: "The Atlantic FCU Low-Rate Card",
      issuer: "atlantic-fcu",
      offer_link: "https://www.theatlanticfcu.com/personal/borrow/credit-cards",
      key_benefits: [
        "APR as low as 12.49% (12.49%-17.99% variable based on creditworthiness)",
        "No annual fee",
        "Low ongoing rate for carrying a balance",
        "Digital wallet support and online account management",
      ],
      eligibility: "atlantic",
      intro_apr: { go_to_apr_low: 12.49, go_to_apr_high: 17.99 },
    },
  ],
})
