import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import BaseClient from "./BaseClient"
import UpgradeUpsell from "../../components/UpgradeUpsell"
import CheckpointNav from "../../components/CheckpointNav"

export default async function BasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) {
    return (
      <>
        <CheckpointNav />
        <UpgradeUpsell
          feature="Base Bank"
          description="Set up the foundation of your bonus routing — your primary checking that everything else flows through."
          bullets={[
            "Pick your base bank with bonus-ready features",
            "Set up direct deposit routing rules",
            "Track which DD slots are in use across bonuses",
          ]}
          source="base_upsell"
        />
      </>
    )
  }

  return <BaseClient userEmail={user.email!} userId={user.id} />
}
