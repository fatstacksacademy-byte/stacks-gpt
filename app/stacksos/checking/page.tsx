import { createClient } from "../../../lib/supabase/server"
import { hasActiveSubscription } from "../../../lib/stripe"
import RoadmapClient from "../RoadmapClient"
import SubscriptionGate from "../../components/SubscriptionGate"
import StacksOSLanding from "../StacksOSLanding"

export default async function PaycheckPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <StacksOSLanding loggedInEmail={null} />

  const isSubscribed = await hasActiveSubscription(user.id)

  if (!isSubscribed) {
    const params = await searchParams
    if (params.checkout === "success") {
      return (
        <SubscriptionGate isSubscribed={false}>
          <RoadmapClient userEmail={user.email!} userId={user.id} />
        </SubscriptionGate>
      )
    }
    return <StacksOSLanding loggedInEmail={user.email ?? null} />
  }

  return <RoadmapClient userEmail={user.email!} userId={user.id} />
}
