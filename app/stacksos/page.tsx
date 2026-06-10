import { createClient } from "../../lib/supabase/server"
import { hasActiveSubscription, getSubscriptionStatus } from "../../lib/stripe"
import { getProfileServer } from "../../lib/profileServer"
import HubClient from "./HubClient"
import StacksOSLanding from "./StacksOSLanding"
import SubscriptionGate from "../components/SubscriptionGate"

export default async function StacksOSPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → marketing landing
  if (!user) return <StacksOSLanding loggedInEmail={null} />

  const [profile, subscriptionStatus, isSubscribed] = await Promise.all([
    getProfileServer(user.id),
    getSubscriptionStatus(user.id),
    hasActiveSubscription(user.id),
  ])

  // Returning from successful Stripe checkout — show the post-payment polling
  // gate until the webhook flips the subscription to active.
  const params = await searchParams
  if (!isSubscribed && params.checkout === "success") {
    return (
      <SubscriptionGate isSubscribed={false}>
        <HubClient userEmail={user.email!} userId={user.id} initialProfile={profile} subscriptionStatus={null} isPaid={false} />
      </SubscriptionGate>
    )
  }

  return (
    <HubClient
      userEmail={user.email!}
      userId={user.id}
      initialProfile={profile}
      subscriptionStatus={subscriptionStatus}
      isPaid={isSubscribed}
    />
  )
}
