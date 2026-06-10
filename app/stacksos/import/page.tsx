import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import ImportClient from "./ImportClient"

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return <ImportClient userId={user.id} />
}
