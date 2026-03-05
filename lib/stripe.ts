import Stripe from "stripe"
import { createClient } from "./supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
})

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
}

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  if (data?.stripe_customer_id) return data.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: "inactive",
  })

  return customer.id
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .single()

  return data?.status === "active" || data?.status === "trialing"
}

export async function updateSubscriptionStatus(
  stripeCustomerId: string,
  status: string,
  subscriptionId?: string,
  currentPeriodEnd?: string,
) {
  console.log("updateSubscriptionStatus called:", { stripeCustomerId, status, subscriptionId })
  const supabase = createServiceClient()
  const { error, data } = await supabase
    .from("subscriptions")
    .update({
      status,
      stripe_subscription_id: subscriptionId,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", stripeCustomerId)
    .select()

  console.log("updateSubscriptionStatus result:", JSON.stringify({ error, data }))
  if (error) console.error("updateSubscriptionStatus error:", error)
}
