import { createClient } from "../../lib/supabase/server"
import { hasActiveSubscription } from "../../lib/stripe"
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

  const isSubscribed = await hasActiveSubscription(user.id)

  if (!isSubscribed) {
    const params = await searchParams
    if (params.checkout === "success") {
      const profile = await getProfileServer(user.id)
      return (
        <SubscriptionGate isSubscribed={false}>
          <HubClient userEmail={user.email!} userId={user.id} initialProfile={profile} />
        </SubscriptionGate>
      )
    }
    return <StacksOSLanding loggedInEmail={user.email ?? null} />
  }

  const profile = await getProfileServer(user.id)
  return <HubClient userEmail={user.email!} userId={user.id} initialProfile={profile} />
}
