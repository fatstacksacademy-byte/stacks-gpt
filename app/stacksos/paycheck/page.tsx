import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import RoadmapClient from "../RoadmapClient"
import SubscriptionGate from "../../components/SubscriptionGate"

export default async function PaycheckPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)
  const params = await searchParams

  // Post-checkout polling window: wait for the webhook to flip the subscription.
  if (!isSubscribed && params.checkout === "success") {
    return (
      <SubscriptionGate isSubscribed={false}>
        <RoadmapClient userEmail={user.email!} userId={user.id} isPaid={false} />
      </SubscriptionGate>
    )
  }

  return <RoadmapClient userEmail={user.email!} userId={user.id} isPaid={isSubscribed} />
}
