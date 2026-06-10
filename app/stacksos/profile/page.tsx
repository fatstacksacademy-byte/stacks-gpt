import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { getProfileServer } from "../../../lib/profileServer"
import UnifiedProfileForm from "../../components/UnifiedProfileForm"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await getProfileServer(user.id)
  return <UnifiedProfileForm userId={user.id} initialProfile={profile} />
}
