"use client"

import { useEffect, useMemo, useState } from "react"
import PortfolioCard from "../components/PortfolioCard"
import ModuleSummaryCard from "../components/ModuleSummaryCard"
import CombosStrip from "../components/CombosStrip"
import CheckpointNav from "../components/CheckpointNav"
import WelcomeWizard from "../components/WelcomeWizard"
import { runSequencer, type SequencedBonus, type SequencerResult } from "../../lib/sequencer"
import { runSavingsSequencer } from "../../lib/savingsSequencer"
import { sequenceCards } from "../../lib/ccSequencer"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import type { UserProfile, IncomeSource } from "../../lib/profileTypes"
import { getSavingsProfile, type SavingsProfile } from "../../lib/savingsProfile"
import { getSpendingProfile, type SpendingProfile } from "../../lib/spendingProfile"

const PAYS_PER_MONTH: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
}
function getIncomeSources(p: UserProfile): IncomeSource[] {
  const sources: IncomeSource[] = [
    { pay_frequency: p.pay_frequency, paycheck_amount: p.paycheck_amount },
  ]
  if (p.income_2_frequency && p.income_2_amount && p.income_2_amount > 0) {
    sources.push({ pay_frequency: p.income_2_frequency, paycheck_amount: p.income_2_amount })
  }
  if (p.income_3_frequency && p.income_3_amount && p.income_3_amount > 0) {
    sources.push({ pay_frequency: p.income_3_frequency, paycheck_amount: p.income_3_amount })
  }
  return sources
}
function getTotalMonthlyIncome(p: UserProfile): number {
  return getIncomeSources(p).reduce((total, s) => {
    return total + s.paycheck_amount * (PAYS_PER_MONTH[s.pay_frequency] ?? 2.17)
  }, 0)
}

export default function HubClient({
  userEmail,
  userId,
  initialProfile,
}: {
  userEmail: string
  userId: string
  initialProfile: UserProfile
}) {
  const [profile] = useState<UserProfile>(initialProfile)
  const [savingsProfile, setSavingsProfile] = useState<SavingsProfile | null>(null)
  const [spendingProfile, setSpendingProfile] = useState<SpendingProfile | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    getSavingsProfile(userId).then(setSavingsProfile).catch(() => setSavingsProfile(null))
    getSpendingProfile(userId).then(setSpendingProfile).catch(() => setSpendingProfile(null))
  }, [userId])

  useEffect(() => {
    // First-visit wizard: show if the user hasn't completed onboarding AND
    // hasn't already filled in their state + paycheck (covers users who were
    // onboarded before the wizard existed).
    const onboarded = typeof window !== "undefined" && localStorage.getItem("stacks:onboarded") === "1"
    const looksLikeDefaultProfile =
      !initialProfile.state || initialProfile.paycheck_amount === 1000 || initialProfile.paycheck_amount === 1500
    if (!onboarded && looksLikeDefaultProfile) setShowWizard(true)
  }, [initialProfile])

  // ─── Paycheck projection (12 months) ─────────────────────────────
  const paycheckProjection = useMemo(() => {
    const result: SequencerResult = runSequencer({
      slots: profile.dd_slots,
      payFrequency: profile.pay_frequency,
      paycheckAmount: profile.paycheck_amount,
      incomeSources: getIncomeSources(profile),
      userState: profile.state,
    })
    // SequencerResult.slots is SlotEntry[][] — flatten + filter to bonuses.
    const allBonuses: SequencedBonus[] = result.slots
      .flat()
      .filter((e) => e.type === "bonus") as SequencedBonus[]
    // Use start_week to decide 12-month vs later
    const bonuses12mo = allBonuses.filter((b) => b.start_week * 7 <= 365)
    const total = bonuses12mo.reduce((s, b) => s + (b.net_bonus ?? b.bonus_amount ?? 0), 0)
    const next = bonuses12mo[0]
    return {
      total,
      nextAction: next
        ? `${next.bank_name} — $${(next.bonus_amount ?? 0).toLocaleString()}`
        : null,
      monthlyIncome: Math.round(getTotalMonthlyIncome(profile)),
    }
  }, [profile])

  // ─── Savings projection (one rotation, annualized) ────────────────
  const savingsProjection = useMemo(() => {
    if (!savingsProfile) return { total: 0, nextAction: null as string | null, balance: 0 }
    const balance = savingsProfile.current_balance ?? 0
    if (balance <= 0) return { total: 0, nextAction: null, balance: 0 }
    const result = runSavingsSequencer({
      availableBalance: balance,
      userState: profile.state,
      currentHysaApy: savingsProfile.current_apy ?? 0,
    })
    const total = Math.round(result.total_earnings ?? 0)
    const first = result.entries?.[0]
    return {
      total,
      nextAction: first
        ? `${first.bank_name} — ~$${Math.round(first.total_earnings).toLocaleString()} earnings`
        : null,
      balance,
    }
  }, [savingsProfile, profile.state])

  // ─── Spending / CC projection (year 1 net value, top 1-2 cards) ───
  const spendingProjection = useMemo(() => {
    const monthlySpend = spendingProfile?.monthly_spend ?? 0
    if (monthlySpend <= 0) return { total: 0, nextAction: null as string | null, monthlySpend: 0 }
    const sequenced = sequenceCards(creditCardBonuses, monthlySpend)
    // Rough year-1 projection: sum net_value of cards whose cumulative_months fit in 12 months
    const year1 = sequenced
      .filter((s) => s.cumulative_months <= 12)
      .reduce((sum, s) => sum + s.net_value, 0)
    const first = sequenced[0]
    return {
      total: Math.round(year1),
      nextAction: first
        ? `${first.card.card_name} — $${Math.round(first.net_value).toLocaleString()} net value`
        : null,
      monthlySpend,
    }
  }, [spendingProfile])

  const portfolio12mo =
    paycheckProjection.total + savingsProjection.total + spendingProjection.total

  const needsSavingsProfile = !savingsProfile || !savingsProfile.current_balance
  const needsSpendingProfile = !spendingProfile || !spendingProfile.monthly_spend

  return (
    <>
      {showWizard && (
        <WelcomeWizard
          userId={userId}
          initialProfile={profile}
          onComplete={() => {
            setShowWizard(false)
            // Refresh savings + spending profiles so the hub cards update
            getSavingsProfile(userId).then(setSavingsProfile).catch(() => {})
            getSpendingProfile(userId).then(setSpendingProfile).catch(() => {})
          }}
        />
      )}
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px" }} className="hub-inner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111" }}>
              Dashboard
            </h1>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              {userEmail}
            </div>
          </div>
          <a
            href="/stacksos/profile"
            style={{
              fontSize: 13,
              color: "#0d7c5f",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Edit profile →
          </a>
        </div>

        <PortfolioCard
          total={portfolio12mo}
          subtitle="Across paycheck, spending, and savings — based on your current profile"
          breakdown={[
            { label: "Paycheck", amount: paycheckProjection.total, href: "/stacksos/paycheck" },
            { label: "Spending", amount: spendingProjection.total, href: "/stacksos/spending" },
            { label: "Savings", amount: savingsProjection.total, href: "/stacksos/savings" },
          ]}
        />

        <CombosStrip />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <ModuleSummaryCard
            title="Paycheck sequencer"
            tagline="Bonuses sequenced across your direct-deposit slots"
            href="/stacksos/paycheck"
            stats={[
              { label: "12-mo projection", value: `$${paycheckProjection.total.toLocaleString()}` },
              { label: "Monthly income", value: `$${paycheckProjection.monthlyIncome.toLocaleString()}` },
              { label: "DD slots", value: String(profile.dd_slots) },
            ]}
            nextAction={paycheckProjection.nextAction ?? "Set up your first DD slot"}
            ctaLabel="Open paycheck strategy"
          />

          <ModuleSummaryCard
            title="Spending"
            tagline="Credit card sign-up bonuses ranked by return on spend"
            href="/stacksos/spending"
            badge="Beta"
            stats={
              needsSpendingProfile
                ? [{ label: "Status", value: "Not set up" }]
                : [
                    { label: "Year-1 projection", value: `$${spendingProjection.total.toLocaleString()}` },
                    { label: "Monthly spend", value: `$${spendingProjection.monthlySpend.toLocaleString()}` },
                  ]
            }
            nextAction={
              needsSpendingProfile
                ? "Add your monthly spend to unlock the sequencer"
                : (spendingProjection.nextAction ?? undefined)
            }
            ctaLabel="Open spending strategy"
          />

          <ModuleSummaryCard
            title="Savings"
            tagline="High-yield savings & brokerage cash bonuses"
            href="/stacksos/savings"
            badge="Beta"
            stats={
              needsSavingsProfile
                ? [{ label: "Status", value: "Not set up" }]
                : [
                    { label: "Rotation projection", value: `$${savingsProjection.total.toLocaleString()}` },
                    { label: "Balance", value: `$${savingsProjection.balance.toLocaleString()}` },
                  ]
            }
            nextAction={
              needsSavingsProfile
                ? "Add your current balance to unlock the sequencer"
                : (savingsProjection.nextAction ?? undefined)
            }
            ctaLabel="Open savings strategy"
          />
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <a
            href="/stacksos/history"
            style={{
              fontSize: 13,
              color: "#666",
              textDecoration: "none",
              padding: "8px 14px",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
            }}
          >
            Completed bonuses →
          </a>
          <a
            href="/stacksos/taxes"
            style={{
              fontSize: 13,
              color: "#666",
              textDecoration: "none",
              padding: "8px 14px",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
            }}
          >
            Tax summary →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hub-inner { padding: 16px 16px 48px !important; }
        }
      `}</style>
    </>
  )
}
