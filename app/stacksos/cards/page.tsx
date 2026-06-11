import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import { hasBetaAccess } from "../../../lib/betaAccess"
import CardInventoryClient from "./CardInventoryClient"

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!hasBetaAccess("cards", user.email)) redirect("/stacksos")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")
  return <CardInventoryClient />
}
