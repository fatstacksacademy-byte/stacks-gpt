import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import { getProfileServer } from "../../../lib/profileServer"
import UnifiedProfileForm from "../../components/UnifiedProfileForm"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")

  const profile = await getProfileServer(user.id)
  return <UnifiedProfileForm userId={user.id} initialProfile={profile} />
}
