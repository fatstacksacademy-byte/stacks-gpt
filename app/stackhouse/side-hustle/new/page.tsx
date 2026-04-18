import { redirect } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { hasActiveSubscription } from "../../../../lib/stripe"
import SideHustleForm from "../_components/SideHustleForm"

export default async function NewSideHustlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")

  return <SideHustleForm mode="new" />
}
