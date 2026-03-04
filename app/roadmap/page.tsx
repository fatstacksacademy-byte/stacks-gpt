import { createClient } from "../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../lib/stripe"
import RoadmapClient from "./RoadmapClient"
import SubscriptionGate from "../components/SubscriptionGate"

export default async function RoadmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)

  return (
    <SubscriptionGate isSubscribed={isSubscribed}>
      <RoadmapClient userEmail={user.email!} userId={user.id} />
    </SubscriptionGate>
  )
}
