import { createClient } from "./supabase/client"

export type SpendingCard = {
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
  source_type: string
  canonical_offer_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const SPENDING_CATEGORIES = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "utilities",
  "online_shopping",
  "other",
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
}

export async function getSpendingCards(userId: string): Promise<SpendingCard[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spending_cards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) { console.error("getSpendingCards error:", error); return [] }
  return data ?? []
}

export async function addSpendingCard(
  userId: string,
  card: Partial<Omit<SpendingCard, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<SpendingCard | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spending_cards")
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
      notes: card.notes ?? null,
    })
    .select()
    .single()
  if (error) { console.error("addSpendingCard error:", error); return null }
  return data
}

export async function updateSpendingCard(
  id: string,
  updates: Partial<Omit<SpendingCard, "id" | "user_id" | "created_at">>
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("spending_cards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) { console.error("updateSpendingCard error:", error); return false }
  return true
}

export async function deleteSpendingCard(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("spending_cards")
    .delete()
    .eq("id", id)
  if (error) { console.error("deleteSpendingCard error:", error); return false }
  return true
}
