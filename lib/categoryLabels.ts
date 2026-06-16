/**
 * Human-readable labels for reward-category slugs used in creditCardBonuses.ts.
 * The catalog stores machine keys (gas_stations, airfare_(portal), aa_com_hotels);
 * this renders them as clean copy on card pages and in generated prose.
 */
const CATEGORY_LABELS: Record<string, string> = {
  everything_else: "all other purchases",
  all_other: "all other purchases",
  gas_stations: "gas stations",
  "airfare_(portal)": "airfare (travel portal)",
  "hotels_(portal)": "hotels (travel portal)",
  "car_rentals_(portal)": "car rentals (travel portal)",
  "cruises_(portal)": "cruises (travel portal)",
  "travel_(portal)": "travel (travel portal)",
  "vacation_rentals_(portal)": "vacation rentals (travel portal)",
  ev_charging: "EV charging",
  streaming_services: "streaming services",
  "specified_store(s)": "select stores",
  car_rentals: "car rentals",
  cell_phone_carriers: "cell phone bills",
  toll_fees: "tolls",
  office_supplies: "office supplies",
  wholesale_clubs: "wholesale clubs",
  internet_and_cable: "internet & cable",
  drug_stores: "drugstores",
  selected_categories: "select categories",
  selected_everyday_category: "a selected everyday category",
  air_travel: "air travel",
  home_improvement_stores: "home improvement stores",
  home_improvement: "home improvement",
  quarterly_categories: "rotating quarterly categories",
  rotating_categories: "rotating categories",
  monthly_categories: "monthly bonus categories",
  daily_categories: "daily categories",
  select_live_entertainment: "select live entertainment",
  capital_one_travel_hotels: "hotels via Capital One Travel",
  capital_one_travel_rental_cars: "rental cars via Capital One Travel",
  capital_one_travel_flights: "flights via Capital One Travel",
  capital_one_entertainment: "Capital One Entertainment",
  large_purchases: "large purchases",
  digital_wallet_payments: "digital wallet payments",
  movie_theaters: "movie theaters",
  "sports_&_recreation": "sports & recreation",
  department_stores: "department stores",
  "1st_highest_spend_category": "your top spend category",
  "2nd_highest_spend_category": "your 2nd-highest spend category",
  "marketing_/_advertising": "marketing & advertising",
  "auto_parts_&_service": "auto parts & service",
  pet_care: "pet care",
  "self-care_/_spa_services": "self-care & spa",
  fitness_memberships: "fitness memberships",
  american_airlines: "American Airlines",
  online_retail: "online retail",
  "sam's_club": "Sam's Club",
  whole_foods: "Whole Foods",
  citi_travel: "Citi Travel",
  aa_com_hotels: "AA.com hotels",
  aa_com_rental_cars: "AA.com rental cars",
  ihg_hotels: "IHG hotels",
  online_grocery: "online groceries",
  groceries_online: "online groceries",
  chase_travel_portal: "Chase Travel",
  us_supermarkets: "U.S. supermarkets",
  foreign_purchases: "foreign purchases",
  health_wellness: "health & wellness",
  flowers_and_gardens: "flowers & gardens",
}

export function humanizeCategory(key: string): string {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key]
  return key
    .replace(/_\(portal\)/g, " (travel portal)")
    .replace(/_/g, " ")
    .replace(/\bev\b/gi, "EV")
}

export function humanizeCategories(cats: string[]): string {
  return (cats || []).map(humanizeCategory).join(", ")
}
