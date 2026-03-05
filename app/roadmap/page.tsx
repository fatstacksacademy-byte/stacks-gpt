import { createClient } from "../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../lib/stripe"
import RoadmapClient from "./RoadmapClient"
import SubscriptionGate from "../components/SubscriptionGate"

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)

  if (!isSubscribed) {
    const params = await searchParams
    if (params.checkout === "success") {
      // Show polling screen while webhook activates subscription
      return (
        <SubscriptionGate isSubscribed={false}>
          <RoadmapClient userEmail={user.email!} userId={user.id} />
        </SubscriptionGate>
      )
    }
    redirect("/onboarding")
  }

  return <RoadmapClient userEmail={user.email!} userId={user.id} />
}
