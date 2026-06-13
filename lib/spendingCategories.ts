export type SpendingCategoryGroup =
  | "Core"
  | "Shopping & household"
  | "Transportation"
  | "Travel booked direct"
  | "Issuer travel portal"
  | "Business & specialty"

export type SpendingCategoryDefinition = {
  key: string
  label: string
  hint: string
  group: SpendingCategoryGroup
  catalogTokens: readonly string[]
  core?: boolean
  portalOnly?: boolean
}

const RAW_SPENDING_CATEGORY_DEFINITIONS = [
  { key: "dining", label: "Dining", hint: "restaurants, takeout, delivery", group: "Core", catalogTokens: ["dining"], core: true },
  { key: "groceries", label: "Groceries", hint: "supermarkets and online grocery", group: "Core", catalogTokens: ["groceries", "groceries_online", "online_grocery", "supermarkets", "us_supermarkets", "whole_foods"], core: true },
  { key: "gas", label: "Gas", hint: "gas stations", group: "Core", catalogTokens: ["gas_stations", "gas"], core: true },
  { key: "travel", label: "General travel", hint: "broad travel purchases booked directly", group: "Core", catalogTokens: ["travel"], core: true },
  { key: "utilities", label: "Utilities", hint: "electric, water, and household utilities", group: "Core", catalogTokens: ["utilities"], core: true },
  { key: "online_shopping", label: "Online shopping", hint: "general online retail", group: "Core", catalogTokens: ["online_retail", "online_shopping"], core: true },
  { key: "other", label: "Everything else", hint: "purchases without a category bonus", group: "Core", catalogTokens: ["everything_else", "all_other"], core: true },

  { key: "streaming_services", label: "Streaming services", hint: "video and music streaming", group: "Shopping & household", catalogTokens: ["streaming_services", "streaming"] },
  { key: "cell_phone_internet", label: "Cell phone & internet", hint: "wireless, cable, and internet bills", group: "Shopping & household", catalogTokens: ["cell_phone_carriers", "cell_phone", "phone", "internet_and_cable", "internet", "cable_satellite"] },
  { key: "drug_stores", label: "Drugstores & pharmacies", hint: "pharmacy and drugstore purchases", group: "Shopping & household", catalogTokens: ["drug_stores", "drugstores", "pharmacy"] },
  { key: "wholesale_clubs", label: "Wholesale clubs", hint: "Costco, Sam's Club, and similar clubs", group: "Shopping & household", catalogTokens: ["wholesale_clubs", "costco_wholesale", "sam's_club"] },
  { key: "amazon", label: "Amazon", hint: "Amazon purchases", group: "Shopping & household", catalogTokens: ["amazon"] },
  { key: "walmart_target", label: "Walmart & Target", hint: "big-box purchases", group: "Shopping & household", catalogTokens: ["walmart", "target"] },
  { key: "department_stores", label: "Department stores", hint: "department-store purchases", group: "Shopping & household", catalogTokens: ["department_stores"] },
  { key: "home_improvement", label: "Home improvement", hint: "hardware and home-improvement stores", group: "Shopping & household", catalogTokens: ["home_improvement_stores", "home_improvement"] },
  { key: "digital_wallets", label: "Digital wallets", hint: "Apple Pay and other wallet payments", group: "Shopping & household", catalogTokens: ["digital_wallet_payments", "apple"] },
  { key: "paypal", label: "PayPal", hint: "purchases paid through PayPal", group: "Shopping & household", catalogTokens: ["paypal"] },
  { key: "entertainment", label: "Entertainment", hint: "events and recreation", group: "Shopping & household", catalogTokens: ["entertainment", "sports_&_recreation", "recreation", "theme_parks"] },
  { key: "live_entertainment", label: "Live entertainment", hint: "concerts and ticketed events", group: "Shopping & household", catalogTokens: ["select_live_entertainment"] },
  { key: "movie_theaters", label: "Movie theaters", hint: "cinema tickets and concessions", group: "Shopping & household", catalogTokens: ["movie_theaters"] },
  { key: "fitness", label: "Fitness memberships", hint: "gyms and fitness subscriptions", group: "Shopping & household", catalogTokens: ["fitness_memberships"] },
  { key: "insurance", label: "Insurance", hint: "eligible insurance payments", group: "Shopping & household", catalogTokens: ["insurance"] },
  { key: "rent", label: "Rent & mortgage", hint: "housing payments where card use is supported", group: "Shopping & household", catalogTokens: ["rent", "rent/mortgage"] },
  { key: "pet_care", label: "Pet care", hint: "pet stores and services", group: "Shopping & household", catalogTokens: ["pet_care"] },
  { key: "subscriptions", label: "Other subscriptions", hint: "non-streaming recurring subscriptions", group: "Shopping & household", catalogTokens: ["subscriptions"] },

  { key: "ridesharing", label: "Ridesharing", hint: "Uber, Lyft, and similar services", group: "Transportation", catalogTokens: ["ridesharing", "uber", "lyft"] },
  { key: "transit", label: "Transit", hint: "trains, buses, ferries, and local transit", group: "Transportation", catalogTokens: ["transit"] },
  { key: "parking_tolls", label: "Parking & tolls", hint: "parking garages and toll roads", group: "Transportation", catalogTokens: ["parking", "toll_fees"] },
  { key: "ev_charging", label: "EV charging", hint: "electric-vehicle charging stations", group: "Transportation", catalogTokens: ["ev_charging"] },
  { key: "auto_services", label: "Auto parts & service", hint: "repairs, maintenance, and parts", group: "Transportation", catalogTokens: ["auto_parts_&_service"] },

  { key: "flights_direct", label: "Flights booked direct", hint: "booked with the airline", group: "Travel booked direct", catalogTokens: ["airfare", "air_travel", "flights"] },
  { key: "hotels_direct", label: "Hotels booked direct", hint: "booked with the hotel", group: "Travel booked direct", catalogTokens: ["hotels", "lodging", "ihg_hotels"] },
  { key: "rental_cars_direct", label: "Rental cars booked direct", hint: "booked with the rental company", group: "Travel booked direct", catalogTokens: ["car_rentals", "rental_cars", "car_rental"] },
  { key: "cruises_direct", label: "Cruises booked direct", hint: "booked with the cruise line", group: "Travel booked direct", catalogTokens: ["cruises"] },

  { key: "travel_portal", label: "Issuer portal: general travel", hint: "must be booked through the card issuer's portal", group: "Issuer travel portal", catalogTokens: ["travel_(portal)", "issuer_travel_portal", "chase_travel_portal", "citi_travel"], portalOnly: true },
  { key: "flights_portal", label: "Issuer portal: flights", hint: "flights booked through the card issuer's portal", group: "Issuer travel portal", catalogTokens: ["airfare_(portal)", "capital_one_travel_flights"], portalOnly: true },
  { key: "hotels_portal", label: "Issuer portal: hotels", hint: "hotels booked through the card issuer's portal", group: "Issuer travel portal", catalogTokens: ["hotels_(portal)", "capital_one_travel_hotels", "aa_com_hotels"], portalOnly: true },
  { key: "rental_cars_portal", label: "Issuer portal: rental cars", hint: "rental cars booked through the card issuer's portal", group: "Issuer travel portal", catalogTokens: ["car_rentals_(portal)", "capital_one_travel_rental_cars", "aa_com_rental_cars"], portalOnly: true },
  { key: "cruises_portal", label: "Issuer portal: cruises", hint: "cruises booked through the card issuer's portal", group: "Issuer travel portal", catalogTokens: ["cruises_(portal)"], portalOnly: true },
  { key: "vacation_rentals_portal", label: "Issuer portal: vacation rentals", hint: "vacation rentals booked through the issuer portal", group: "Issuer travel portal", catalogTokens: ["vacation_rentals_(portal)"], portalOnly: true },

  { key: "office_supplies", label: "Office supplies", hint: "office-supply stores", group: "Business & specialty", catalogTokens: ["office_supplies"] },
  { key: "shipping", label: "Shipping", hint: "eligible shipping services", group: "Business & specialty", catalogTokens: ["shipping"] },
  { key: "advertising", label: "Advertising", hint: "marketing and advertising purchases", group: "Business & specialty", catalogTokens: ["marketing_/_advertising"] },
  { key: "education", label: "Education", hint: "eligible education purchases", group: "Business & specialty", catalogTokens: ["education"] },
  { key: "health_wellness", label: "Health & wellness", hint: "eligible health and wellness purchases", group: "Business & specialty", catalogTokens: ["health_wellness"] },
  { key: "charity", label: "Charitable giving", hint: "eligible charitable donations", group: "Business & specialty", catalogTokens: ["charity"] },
  { key: "large_purchases", label: "Large purchases", hint: "cards with a broad large-purchase tier", group: "Business & specialty", catalogTokens: ["large_purchases"] },
] as const satisfies readonly SpendingCategoryDefinition[]

export type SpendingCategory = (typeof RAW_SPENDING_CATEGORY_DEFINITIONS)[number]["key"]
export type ResolvedSpendingCategoryDefinition = SpendingCategoryDefinition & { key: SpendingCategory }

export const SPENDING_CATEGORY_DEFINITIONS: readonly ResolvedSpendingCategoryDefinition[] = RAW_SPENDING_CATEGORY_DEFINITIONS

export const SPENDING_CATEGORIES = SPENDING_CATEGORY_DEFINITIONS.map(category => category.key) as SpendingCategory[]
export const SPENDING_CATEGORIES_PRIMARY = SPENDING_CATEGORY_DEFINITIONS.filter(category => category.core).map(category => category.key) as SpendingCategory[]
export const SPENDING_CATEGORIES_EXTRA = SPENDING_CATEGORY_DEFINITIONS.filter(category => !category.core).map(category => category.key) as SpendingCategory[]

export const SPENDING_CATEGORY_BY_KEY = Object.fromEntries(
  SPENDING_CATEGORY_DEFINITIONS.map(category => [category.key, category]),
) as Record<SpendingCategory, ResolvedSpendingCategoryDefinition>

export const CATEGORY_LABELS = Object.fromEntries(
  SPENDING_CATEGORY_DEFINITIONS.map(category => [category.key, category.label]),
) as Record<SpendingCategory, string>

export const SPENDING_TO_CATALOG_TOKENS = Object.fromEntries(
  SPENDING_CATEGORY_DEFINITIONS.map(category => [category.key, [...category.catalogTokens]]),
) as Record<SpendingCategory, string[]>

export function spendingCategoryDefinition(key: SpendingCategory) {
  return SPENDING_CATEGORY_BY_KEY[key]
}

export function isSpendingCategory(key: string): key is SpendingCategory {
  return key in SPENDING_CATEGORY_BY_KEY
}
