import { NextRequest, NextResponse } from "next/server"
import { stripe, updateSubscriptionStatus } from "../../../../lib/stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 401 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 401 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any
        if (session.mode === "subscription") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          const periodEnd = (subscription as any).current_period_end
          await updateSubscriptionStatus(
            session.customer,
            subscription.status,
            subscription.id,
            periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
          )
        }
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any
        const periodEnd = subscription.current_period_end
        await updateSubscriptionStatus(
          subscription.customer,
          subscription.status,
          subscription.id,
          periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
        )
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as any
        if (invoice.subscription) {
          await updateSubscriptionStatus(
            invoice.customer,
            "past_due",
            invoice.subscription,
          )
        }
        break
      }
    }
  } catch (err: any) {
    console.error("Webhook handler error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
