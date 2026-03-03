import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import HistoryClient from "./HistoryClient"

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return <HistoryClient userId={user.id} />
}
