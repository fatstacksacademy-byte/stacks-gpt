import { NextRequest, NextResponse } from "next/server"
import { stripe, updateSubscriptionStatus } from "../../../../lib/stripe"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const subscription = event.data.object as any

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await updateSubscriptionStatus(
        subscription.customer as string,
        subscription.status,
        subscription.id,
        new Date(subscription.current_period_end * 1000).toISOString(),
      )
      break

    case "customer.subscription.deleted":
      await updateSubscriptionStatus(
        subscription.customer as string,
        "cancelled",
        subscription.id,
      )
      break

    case "invoice.payment_failed":
      await updateSubscriptionStatus(
        subscription.customer as string,
        "past_due",
      )
      break
  }

  return NextResponse.json({ received: true })
}
