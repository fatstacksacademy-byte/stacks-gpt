/**
 * Card benefits registry.
 *
 * Catalog rows already store annual rewards-rate data and statement_credits_year1
 * as a single number. This file layers a structured per-card benefits list on
 * top so the spending optimizer can value benefits *conditionally* — i.e. only
 * if the user has said they'd actually use that credit / lounge / etc.
 *
 * The data isn't on CreditCardBonus directly because:
 *   - It's hand-curated and only meaningful for ~30 cards (high-AF mostly).
 *     Putting it in creditCardBonuses.ts (7k lines) would make merge conflicts
 *     much worse during catalog refreshes from the verify pipeline.
 *   - The user profile gating is dynamic and doesn't belong in static catalog.
 *
 * Each benefit has:
 *   - kind: stable enum for grouping + applying user usage prefs
 *   - annualValue: dollar value assuming the user uses it
 *   - label: human-readable string for the breakdown UI
 *   - requiresFlag: which key on UserBenefitProfile gates inclusion. If null,
 *       the benefit is always counted (e.g. simple anniversary points).
 */

export type BenefitKind =
  | "travel_credit"        // Flexible travel credit (CSR $300, Venture X $300)
  | "hotel_credit"         // Specific hotel credit (Citi Strata $100, FHR via Plat)
  | "airline_credit"       // Airline incidentals (Amex Plat $200)
  | "uber_credit"          // Uber Cash (Amex Plat, Amex Gold)
  | "dining_credit"        // Resy/dining (Amex Gold, Marriott Brilliant)
  | "entertainment_credit" // Digital ent (Amex Plat)
  | "lounge_access"        // Priority Pass / Centurion / Capital One Lounges
  | "global_entry"         // GE/TSA Pre reimbursement (every 4-5 years)
  | "clear_credit"         // CLEAR membership (~$189)
  | "free_night_cert"      // Hotel anniversary night certificate
  | "anniversary_points"   // Flat point bonus each renewal
  | "trip_insurance"       // Trip cancellation / delay (qualitative — counted at $50/yr if flier)
  | "rental_coverage"      // Primary rental car coverage ($50/yr if driver)
  | "no_ftf"               // No foreign transaction fee (~$30/yr if travels)
  | "saks_credit"          // Saks Fifth Avenue credit ($100/yr Amex Plat)
  | "walmart_plus"         // Walmart+ membership ($98/yr Amex Plat)
  | "doordash_credit"      // DashPass / DoorDash credit (Chase, Amex Gold prev)
  | "other"

export type CardBenefit = {
  kind: BenefitKind
  annualValue: number
  label: string
  /** Which UserBenefitProfile flag gates this benefit. null = always counted. */
  requiresFlag: keyof UserBenefitProfile | null
}

/**
 * User-supplied profile of which benefits they'd actually use. Collected
 * via a small set of lifestyle questions in the Spending tab. Stored on
 * user_profiles.benefit_usage (jsonb).
 */
export type UserBenefitProfile = {
  uses_travel_credit: boolean      // $300 flexible travel credit (CSR-style)
  uses_hotel_credit: boolean       // Citi/Plat hotel credits
  uses_airline_credit: boolean     // Amex Plat airline incidentals
  uses_uber_credit: boolean        // Uber Cash
  uses_dining_credit: boolean      // Resy/dining credits
  uses_entertainment_credit: boolean // Digital ent
  uses_lounge_access: boolean      // PP/Centurion — only valuable if flies
  needs_global_entry: boolean      // Only valuable if not already enrolled
  uses_clear: boolean
  uses_free_night: boolean         // Anniversary hotel nights — valuable to non-elite travelers
  uses_doordash_credit: boolean
  uses_saks_credit: boolean
  uses_walmart_plus: boolean
  flies_enough_for_insurance: boolean  // Trip insurance + rental coverage
}

export const DEFAULT_BENEFIT_PROFILE: UserBenefitProfile = {
  // Travel credits default ON — most users actually use flexible $300 credits.
  uses_travel_credit: true,
  uses_hotel_credit: true,
  // Airline credit is incidental-only at most issuers (gift cards no longer count).
  // Default OFF — power users can flip on, but a typical user won't get value.
  uses_airline_credit: false,
  uses_uber_credit: true,
  uses_dining_credit: true,
  // Entertainment credit (Disney+, Hulu, ESPN+, Peacock, NYT) — coverage varies.
  // Default OFF — half the users don't subscribe to enough of these.
  uses_entertainment_credit: false,
  uses_lounge_access: false,       // Requires actually flying often
  needs_global_entry: false,       // Most active churners already have GE
  uses_clear: false,
  uses_free_night: true,           // Free night cert is hard-cash equivalent
  uses_doordash_credit: false,
  uses_saks_credit: false,
  uses_walmart_plus: false,
  flies_enough_for_insurance: false,
}

/**
 * Benefits registry keyed by card_name (case-insensitive lookup via lower()).
 * Only ~30 cards where benefits meaningfully change the math. For everything
 * else, the existing statement_credits_year1 field on the catalog row covers
 * simple credits.
 *
 * Source of valuations (June 2026, US market):
 *   - Flexible travel credits: face value (CSR $300, VX $300, Plat $200 hotel)
 *   - Lounge access: $250 if uses_lounge_access=true (one round trip per year)
 *   - Global Entry: $100 every 5yr = $20/yr but capped to one card at most
 *   - Free night certs: Hyatt $150, Marriott 35k-50k pt cert ~$200, Hilton ~$200
 *   - Anniversary points: bonus × cpp
 */
const REGISTRY: Record<string, CardBenefit[]> = {
  // ─── Chase ────────────────────────────────────────────────────────
  "chase sapphire reserve": [
    { kind: "travel_credit", annualValue: 300, label: "$300 annual travel credit", requiresFlag: "uses_travel_credit" },
    { kind: "lounge_access", annualValue: 250, label: "Priority Pass + Chase Sapphire Lounges", requiresFlag: "uses_lounge_access" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit (every 5yr)", requiresFlag: "needs_global_entry" },
    { kind: "doordash_credit", annualValue: 60, label: "DashPass + monthly DoorDash credits", requiresFlag: "uses_doordash_credit" },
    { kind: "trip_insurance", annualValue: 50, label: "Trip cancellation + delay insurance", requiresFlag: "flies_enough_for_insurance" },
    { kind: "rental_coverage", annualValue: 50, label: "Primary rental car coverage", requiresFlag: "flies_enough_for_insurance" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
  ],
  "chase sapphire preferred": [
    { kind: "hotel_credit", annualValue: 50, label: "$50 annual hotel credit (Chase Travel)", requiresFlag: "uses_hotel_credit" },
    { kind: "anniversary_points", annualValue: 50, label: "10% anniversary point bonus on spending", requiresFlag: null },
    { kind: "trip_insurance", annualValue: 40, label: "Trip cancellation + delay insurance", requiresFlag: "flies_enough_for_insurance" },
    { kind: "rental_coverage", annualValue: 40, label: "Primary rental car coverage", requiresFlag: "flies_enough_for_insurance" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
  ],
  "chase ink business preferred": [
    { kind: "trip_insurance", annualValue: 40, label: "Trip cancellation + delay insurance", requiresFlag: "flies_enough_for_insurance" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
  ],

  // ─── American Express ────────────────────────────────────────────
  "american express platinum": [
    { kind: "hotel_credit", annualValue: 200, label: "$200 FHR/THC hotel credit", requiresFlag: "uses_hotel_credit" },
    { kind: "airline_credit", annualValue: 100, label: "$200 airline incidental (valued at $100 — gift cards no longer count)", requiresFlag: "uses_airline_credit" },
    { kind: "uber_credit", annualValue: 200, label: "$200 Uber Cash", requiresFlag: "uses_uber_credit" },
    { kind: "entertainment_credit", annualValue: 240, label: "$240 digital entertainment credit (Disney+, NYT, etc.)", requiresFlag: "uses_entertainment_credit" },
    { kind: "saks_credit", annualValue: 100, label: "$100 Saks Fifth Avenue credit", requiresFlag: "uses_saks_credit" },
    { kind: "walmart_plus", annualValue: 98, label: "Walmart+ membership ($98)", requiresFlag: "uses_walmart_plus" },
    { kind: "clear_credit", annualValue: 189, label: "$189 CLEAR Plus credit", requiresFlag: "uses_clear" },
    { kind: "lounge_access", annualValue: 400, label: "Centurion Lounges + Priority Pass + Delta SkyClub (limited)", requiresFlag: "uses_lounge_access" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
  ],
  "amex business platinum": [
    { kind: "hotel_credit", annualValue: 200, label: "$200 FHR/THC hotel credit", requiresFlag: "uses_hotel_credit" },
    { kind: "airline_credit", annualValue: 100, label: "$200 airline incidental (valued at $100)", requiresFlag: "uses_airline_credit" },
    { kind: "lounge_access", annualValue: 400, label: "Centurion Lounges + Priority Pass", requiresFlag: "uses_lounge_access" },
    { kind: "clear_credit", annualValue: 189, label: "$189 CLEAR Plus credit", requiresFlag: "uses_clear" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
    { kind: "other", annualValue: 360, label: "Dell + Indeed + Adobe credits (varies by business)", requiresFlag: "uses_entertainment_credit" },
  ],
  "amex gold": [
    { kind: "dining_credit", annualValue: 120, label: "$120 dining credit (Grubhub, Resy, Goldbelly)", requiresFlag: "uses_dining_credit" },
    { kind: "uber_credit", annualValue: 120, label: "$120 Uber Cash", requiresFlag: "uses_uber_credit" },
    { kind: "other", annualValue: 84, label: "$84 Dunkin' credit (where available)", requiresFlag: "uses_dining_credit" },
    { kind: "other", annualValue: 50, label: "$50 Resy credit", requiresFlag: "uses_dining_credit" },
  ],
  "amex green": [
    { kind: "lounge_access", annualValue: 189, label: "$189 CLEAR Plus credit", requiresFlag: "uses_clear" },
  ],
  "amex hilton aspire": [
    { kind: "hotel_credit", annualValue: 400, label: "$400 Hilton resort credit", requiresFlag: "uses_hotel_credit" },
    { kind: "airline_credit", annualValue: 100, label: "$200 airline credit (valued at $100)", requiresFlag: "uses_airline_credit" },
    { kind: "free_night_cert", annualValue: 750, label: "Free night certificate (any Hilton, including aspirational)", requiresFlag: "uses_free_night" },
    { kind: "lounge_access", annualValue: 189, label: "$189 CLEAR Plus credit", requiresFlag: "uses_clear" },
    { kind: "other", annualValue: 150, label: "Hilton Diamond status", requiresFlag: "uses_lounge_access" },
  ],
  "amex hilton surpass": [
    { kind: "hotel_credit", annualValue: 200, label: "$200 Hilton brand credit", requiresFlag: "uses_hotel_credit" },
    { kind: "free_night_cert", annualValue: 300, label: "Free night certificate (after $15k spend)", requiresFlag: "uses_free_night" },
  ],
  "amex marriott bonvoy brilliant": [
    { kind: "dining_credit", annualValue: 300, label: "$300 dining credit (US restaurants)", requiresFlag: "uses_dining_credit" },
    { kind: "free_night_cert", annualValue: 400, label: "85k point free night cert", requiresFlag: "uses_free_night" },
    { kind: "lounge_access", annualValue: 100, label: "Priority Pass", requiresFlag: "uses_lounge_access" },
  ],
  "amex marriott bonvoy bevy": [
    { kind: "free_night_cert", annualValue: 250, label: "50k point free night cert (after $15k spend)", requiresFlag: "uses_free_night" },
  ],
  "amex delta reserve": [
    { kind: "hotel_credit", annualValue: 200, label: "$200 Resy credit", requiresFlag: "uses_dining_credit" },
    { kind: "free_night_cert", annualValue: 100, label: "Companion certificate (domestic main cabin)", requiresFlag: "uses_free_night" },
    { kind: "lounge_access", annualValue: 600, label: "Delta SkyClub access when flying Delta", requiresFlag: "uses_lounge_access" },
  ],
  "amex delta platinum": [
    { kind: "free_night_cert", annualValue: 100, label: "Companion certificate (domestic main cabin)", requiresFlag: "uses_free_night" },
  ],

  // ─── Capital One ────────────────────────────────────────────────
  "capital one venture x": [
    { kind: "travel_credit", annualValue: 300, label: "$300 annual travel credit (Capital One Travel)", requiresFlag: "uses_travel_credit" },
    { kind: "anniversary_points", annualValue: 150, label: "10,000 anniversary miles", requiresFlag: null },
    { kind: "lounge_access", annualValue: 250, label: "Capital One Lounges + Priority Pass", requiresFlag: "uses_lounge_access" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
    { kind: "trip_insurance", annualValue: 40, label: "Trip cancellation + delay insurance", requiresFlag: "flies_enough_for_insurance" },
  ],
  "capital one venture": [
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
    { kind: "no_ftf", annualValue: 30, label: "No foreign transaction fee", requiresFlag: "flies_enough_for_insurance" },
  ],

  // ─── Citi ───────────────────────────────────────────────────────
  "citi strata elite": [
    { kind: "hotel_credit", annualValue: 200, label: "$200 hotel credit (Citi Travel)", requiresFlag: "uses_hotel_credit" },
    { kind: "lounge_access", annualValue: 200, label: "Priority Pass + Admirals Club passes", requiresFlag: "uses_lounge_access" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
  ],
  "citi strata premier": [
    { kind: "hotel_credit", annualValue: 100, label: "$100 annual hotel credit (Citi Travel)", requiresFlag: "uses_hotel_credit" },
  ],

  // ─── Bank of America ────────────────────────────────────────────
  "bofa premium rewards": [
    { kind: "airline_credit", annualValue: 100, label: "$100 airline incidental credit", requiresFlag: "uses_airline_credit" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
  ],
  "bofa atmos rewards summit": [
    { kind: "lounge_access", annualValue: 250, label: "Priority Pass", requiresFlag: "uses_lounge_access" },
    { kind: "global_entry", annualValue: 20, label: "Global Entry/TSA PreCheck credit", requiresFlag: "needs_global_entry" },
  ],

  // ─── Wells Fargo ────────────────────────────────────────────────
  "wells fargo autograph journey": [
    { kind: "airline_credit", annualValue: 50, label: "$50 airline credit (with $50 flight purchase)", requiresFlag: "uses_airline_credit" },
  ],

  // ─── Hyatt ──────────────────────────────────────────────────────
  "world of hyatt": [
    { kind: "free_night_cert", annualValue: 150, label: "Free night certificate (Category 1-4)", requiresFlag: "uses_free_night" },
  ],

  // ─── IHG ────────────────────────────────────────────────────────
  "chase ihg rewards premier": [
    { kind: "free_night_cert", annualValue: 250, label: "Free night certificate (up to 40k points)", requiresFlag: "uses_free_night" },
  ],

  // ─── Marriott (non-Amex) ────────────────────────────────────────
  "chase marriott bonvoy boundless": [
    { kind: "free_night_cert", annualValue: 200, label: "35k point free night cert", requiresFlag: "uses_free_night" },
  ],

  // ─── Airline cards ──────────────────────────────────────────────
  "chase united explorer": [
    { kind: "free_night_cert", annualValue: 100, label: "Companion fare / 5K mile boost", requiresFlag: "uses_free_night" },
  ],
  "american airlines aadvantage executive": [
    { kind: "lounge_access", annualValue: 650, label: "Admirals Club membership", requiresFlag: "uses_lounge_access" },
  ],
  "barclays jetblue plus": [
    { kind: "free_night_cert", annualValue: 100, label: "5k anniversary points + Mosaic-qualifying spend", requiresFlag: null },
  ],
  "amex hilton honors (no fee)": [],
  "amex hilton business": [
    { kind: "free_night_cert", annualValue: 200, label: "Free night certificate (after $15k spend)", requiresFlag: "uses_free_night" },
  ],
  "amex marriott business": [
    { kind: "free_night_cert", annualValue: 200, label: "35k point free night cert", requiresFlag: "uses_free_night" },
  ],
}

export function getCardBenefits(cardName: string): CardBenefit[] {
  return REGISTRY[cardName.toLowerCase()] ?? []
}

/**
 * Sum the dollar value of a card's benefits given a user's usage profile.
 * Benefits with requiresFlag=null are always counted; others only if the
 * flag is true on the profile.
 */
export function valueOfBenefits(
  cardName: string,
  profile: UserBenefitProfile,
): { total: number; included: CardBenefit[]; excluded: CardBenefit[] } {
  const benefits = getCardBenefits(cardName)
  const included: CardBenefit[] = []
  const excluded: CardBenefit[] = []
  let total = 0
  for (const b of benefits) {
    if (b.requiresFlag === null || profile[b.requiresFlag]) {
      total += b.annualValue
      included.push(b)
    } else {
      excluded.push(b)
    }
  }
  return { total, included, excluded }
}
