import { createClient } from "./supabase/client"

export const OWNED_CARD_ROLES = [
  "sub-in-progress",
  "daily-driver",
  "sock-drawer",
  "retention-pending",
  "downgrade-candidate",
] as const

export type OwnedCardRole = (typeof OWNED_CARD_ROLES)[number]

export type OwnedCard = {
  id: string
  user_id: string
  card_name: string
  issuer: string | null
  signup_bonus_value: number | null
  annual_fee: number
  spend_requirement: number | null
  spend_deadline: string | null
  opened_date: string | null
  category_multipliers: Record<string, number>
  expected_value: number | null
  actual_value: number | null
  status: "planned" | "active" | "completed" | "canceled"
  role: OwnedCardRole | null
  source_type: string
  canonical_offer_id: string | null
  notes: string | null
  /** User said "already have" but skipped entering dates. Exclude from any
   *  logic that depends on opened_date / closed_date (cooldown, lifetime earnings). */
  incomplete_info: boolean
  created_at: string
  updated_at: string
}

// Top-of-form, always-visible categories (legacy 7).
export const SPENDING_CATEGORIES_PRIMARY = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "utilities",
  "online_shopping",
  "other",
] as const

// Behind a "More categories" expander. Tokens match creditCardBonuses.ts
// rewards tier vocabulary directly (cell_phone_internet maps to two tokens —
// see lib/categoryGaps.ts SPENDING_TO_CATALOG_TOKENS).
export const SPENDING_CATEGORIES_EXTRA = [
  "streaming_services",
  "ridesharing",
  "transit",
  "drug_stores",
  "ev_charging",
  "cell_phone_internet",
  "home_improvement",
  "wholesale_clubs",
  "amazon",
  "hotels_direct",
  "flights_direct",
] as const

// Combined list — kept exported as SPENDING_CATEGORIES for back-compat with
// existing call sites (the per-card-multipliers form, etc.).
export const SPENDING_CATEGORIES = [
  ...SPENDING_CATEGORIES_PRIMARY,
  ...SPENDING_CATEGORIES_EXTRA,
] as const

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<SpendingCategory, string> = {
  dining: "Dining",
  groceries: "Groceries",
  gas: "Gas",
  travel: "Travel",
  utilities: "Utilities",
  online_shopping: "Online Shopping",
  other: "Other",
  streaming_services: "Streaming Services",
  ridesharing: "Ridesharing",
  transit: "Transit",
  drug_stores: "Drug Stores",
  ev_charging: "EV Charging",
  cell_phone_internet: "Cell / Internet",
  home_improvement: "Home Improvement",
  wholesale_clubs: "Wholesale Clubs",
  amazon: "Amazon",
  hotels_direct: "Hotels (direct)",
  flights_direct: "Flights (direct)",
}

export async function getOwnedCards(userId: string): Promise<OwnedCard[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("owned_cards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { console.error("getOwnedCards error:", error); return [] }
  return data ?? []
}

export async function addOwnedCard(
  userId: string,
  card: Partial<Omit<OwnedCard, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<OwnedCard | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("owned_cards")
    .insert({
      user_id: userId,
      card_name: card.card_name ?? "",
      issuer: card.issuer ?? null,
      signup_bonus_value: card.signup_bonus_value ?? null,
      annual_fee: card.annual_fee ?? 0,
      spend_requirement: card.spend_requirement ?? null,
      spend_deadline: card.spend_deadline ?? null,
      opened_date: card.opened_date ?? null,
      category_multipliers: card.category_multipliers ?? {},
      expected_value: card.expected_value ?? null,
      actual_value: card.actual_value ?? null,
      status: card.status ?? "planned",
      role: card.role ?? null,
      notes: card.notes ?? null,
      incomplete_info: card.incomplete_info ?? false,
    })
    .select()
    .single()
  if (error) { console.error("addOwnedCard error:", error); return null }
  return data
}

export async function updateOwnedCard(
  id: string,
  updates: Partial<Omit<OwnedCard, "id" | "user_id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("owned_cards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) { console.error("updateOwnedCard error:", error); return false }
  return true
}

export async function deleteOwnedCard(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("owned_cards")
    .delete()
    .eq("id", id)
  if (error) { console.error("deleteOwnedCard error:", error); return false }
  return true
}
