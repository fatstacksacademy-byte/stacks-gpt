export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/supabase/server"
import { stripe, PRICES, getOrCreateCustomer } from "../../../../lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { plan } = await req.json() as { plan: "monthly" | "annual" }
    const priceId = plan === "annual" ? PRICES.annual : PRICES.monthly

    if (!priceId) return NextResponse.json({ error: "Invalid plan" }, { status: 400 })

    const customerId = await getOrCreateCustomer(user.id, user.email!)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/login?checkout=success`,
      cancel_url: `${req.nextUrl.origin}/?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("Checkout error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
