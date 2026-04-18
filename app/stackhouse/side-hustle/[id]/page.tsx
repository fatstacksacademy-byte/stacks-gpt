import { redirect, notFound } from "next/navigation"
import { createClient } from "../../../../lib/supabase/server"
import { hasActiveSubscription } from "../../../../lib/stripe"
import SideHustleForm from "../_components/SideHustleForm"
import type { SideHustle } from "../../../../lib/stackhouse/types"

export default async function EditSideHustlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) redirect("/onboarding")

  const { id } = await params
  const { data } = await supabase
    .from("stackhouse_side_hustles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!data) notFound()

  return <SideHustleForm mode="edit" hustle={data as SideHustle} />
}
