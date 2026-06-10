import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import SavingsClient from "./SavingsClient"

export default async function SavingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)
  return <SavingsClient userEmail={user.email!} userId={user.id} isPaid={isSubscribed} />
}
