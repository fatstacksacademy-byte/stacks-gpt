import Stripe from "stripe"
import { createClient } from "./supabase/server"

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required")

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
})

// Price IDs — set these in your .env after creating products in Stripe Dashboard
export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,  // $5/mo
  annual: process.env.STRIPE_PRICE_ANNUAL!,     // $50/yr
}

/**
 * Get or create a Stripe customer for a Supabase user.
 * Stores the stripe_customer_id in a `subscriptions` table.
 */
export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single()

  if (data?.stripe_customer_id) return data.stripe_customer_id

  // Create Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  // Upsert into subscriptions table
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: "inactive",
  })

  return customer.id
}

/**
 * Check if a user has an active subscription.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .single()

  return data?.status === "active" || data?.status === "trialing"
}

/**
 * Update subscription status from Stripe webhook event.
 */
export async function updateSubscriptionStatus(
  stripeCustomerId: string,
  status: string,
  subscriptionId?: string,
  currentPeriodEnd?: string,
) {
  const supabase = await createClient()
  await supabase
    .from("subscriptions")
    .update({
      status,
      stripe_subscription_id: subscriptionId,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", stripeCustomerId)
}
