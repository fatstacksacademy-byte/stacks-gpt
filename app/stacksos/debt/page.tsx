import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import DebtClient from "./DebtClient"

const ALLOWED_EMAILS = new Set([
  "booth.nathaniel@gmail.com",
  "fatstacksacademy@gmail.com",
])

export default async function DebtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (!user.email || !ALLOWED_EMAILS.has(user.email.toLowerCase())) redirect("/stacksos")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")
  return <DebtClient />
}
