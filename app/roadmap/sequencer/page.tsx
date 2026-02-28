import { redirect } from "next/navigation"
import { createClient } from "../../../lib/supabase/server"
import SequencerClient from "./SequencerClient"

export default async function SequencerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/roadmap" style={backLink}>← Back to Roadmap</a>
      </div>

      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Paycheck Slot Sequencer</h1>
      <p style={{ color: "#555", marginBottom: 28, fontSize: 15 }}>
        Tell us your setup. We&apos;ll sequence which bonuses to run in each slot, in what order,
        and show you your projected yield — sorted by dollars earned per week.
      </p>

      <SequencerClient />
    </div>
  )
}

const backLink: React.CSSProperties = {
  fontSize: 13,
  color: "#555",
  textDecoration: "none",
}