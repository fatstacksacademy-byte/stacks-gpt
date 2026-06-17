import { createClient } from "../../../lib/supabase/server"
import { redirect } from "next/navigation"
import CheckpointNav from "../../components/CheckpointNav"
import CardValueCalculator from "../../components/CardValueCalculator"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"

export default async function CardCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const initialCardId = typeof params.card === "string" ? params.card : undefined

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 48px" }} className="rm-content">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Card Value Calculator</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px", maxWidth: 640, lineHeight: 1.6 }}>
          What&apos;s a card actually worth for your spend? Compare Year 1 vs Year 2 value, with the 0%
          intro-APR float layered in on cards that offer it.
        </p>
        <CardValueCalculator cards={creditCardBonuses} initialCardId={initialCardId} />
      </div>
    </div>
  )
}
