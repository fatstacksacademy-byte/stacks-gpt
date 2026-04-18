import { redirect } from "next/navigation"
import { createClient } from "../../lib/supabase/server"
import { hasActiveSubscription } from "../../lib/stripe"
import {
  getOrCreateProfile,
  listSideHustles,
  listActiveCooks,
  computeHeadlineStats,
  listStreetWins,
} from "../../lib/stackhouse/queries"
import StackhouseClient from "./_components/StackhouseClient"

export const dynamic = "force-dynamic"

export default async function StackhousePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")

  const [profile, sideHustles, activeCooks, stats, streetWins] = await Promise.all([
    getOrCreateProfile(user.id),
    listSideHustles(user.id),
    listActiveCooks(user.id),
    computeHeadlineStats(user.id),
    listStreetWins(user.id),
  ])

  const debugEnabled =
    (process.env.NEXT_PUBLIC_STACKHOUSE_DEBUG ?? "") === "1"

  return (
    <StackhouseClient
      userEmail={user.email ?? ""}
      userId={user.id}
      initialProfile={profile}
      initialSideHustles={sideHustles}
      activeCooks={activeCooks}
      stats={stats}
      streetWins={streetWins}
      debugEnabled={debugEnabled}
    />
  )
}
