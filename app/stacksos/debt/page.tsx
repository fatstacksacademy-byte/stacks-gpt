import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import { hasBetaAccess } from "../../../lib/betaAccess"
import DebtClient from "./DebtClient"

export default async function DebtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!hasBetaAccess("debt", user.email)) redirect("/stacksos")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")
  return <DebtClient />
}
