import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import { hasActiveSubscription } from "../../../lib/stripe"
import TaxesClient from "./TaxesClient"
import UpgradeUpsell from "../../components/UpgradeUpsell"
import CheckpointNav from "../../components/CheckpointNav"

export default async function TaxesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const isSubscribed = await hasActiveSubscription(user.id)
  if (!isSubscribed) {
    return (
      <>
        <CheckpointNav />
        <UpgradeUpsell
          feature="Tax Summary"
          description="See exactly which bonuses are taxable, when each 1099 lands, and how much to set aside."
          bullets={[
            "Per-bonus 1099-INT / 1099-MISC tracking",
            "Annual tax-set-aside calculator",
            "Export-ready summary for your accountant",
          ]}
          source="taxes_upsell"
        />
      </>
    )
  }

  return <TaxesClient userEmail={user.email!} userId={user.id} />
}
