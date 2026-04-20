"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import PortfolioCard from "../components/PortfolioCard"
import StartedBonusesList, { type StartedBonus } from "../components/StartedBonusesList"
import CheckpointNav from "../components/CheckpointNav"
import WelcomeWizard from "../components/WelcomeWizard"
import { runSequencer, type SequencedBonus, type SequencerResult } from "../../lib/sequencer"
import { runSavingsSequencer } from "../../lib/savingsSequencer"
import { sequenceCards, DEFAULT_MAX_CARDS_PER_YEAR } from "../../lib/ccSequencer"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import { bonuses } from "../../lib/data/bonuses"
import type { UserProfile, IncomeSource } from "../../lib/profileTypes"
import { getSavingsProfile, type SavingsProfile } from "../../lib/savingsProfile"
import { getSpendingProfile, type SpendingProfile } from "../../lib/spendingProfile"
import { getCompletedBonuses } from "../../lib/completedBonuses"
import { getCustomBonuses, type CustomBonus } from "../../lib/customBonuses"
import { getOwnedCards, type OwnedCard } from "../../lib/ownedCards"
import { getSavingsEntries, type SavingsEntry } from "../../lib/savingsEntries"
import type { CompletedBonus } from "../../lib/churn"

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

const NON_ACTIVE_CUSTOM_STEPS = new Set(["pending", "kept_open", "skipped", "bonus_posted"])

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
  const [completedRecords, setCompletedRecords] = useState<CompletedBonus[]>([])
  const [customBonuses, setCustomBonuses] = useState<CustomBonus[]>([])
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([])
  const [savingsEntries, setSavingsEntries] = useState<SavingsEntry[]>([])
  const [showWizard, setShowWizard] = useState(false)

  const loadData = useCallback(() => {
    getSavingsProfile(userId).then(setSavingsProfile).catch(() => setSavingsProfile(null))
    getSpendingProfile(userId).then(setSpendingProfile).catch(() => setSpendingProfile(null))
    getCompletedBonuses(userId).then(setCompletedRecords).catch(() => setCompletedRecords([]))
    getCustomBonuses(userId).then(setCustomBonuses).catch(() => setCustomBonuses([]))
    getOwnedCards(userId).then(setOwnedCards).catch(() => setOwnedCards([]))
    getSavingsEntries(userId).then(setSavingsEntries).catch(() => setSavingsEntries([]))
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onboarded =
      typeof window !== "undefined" && localStorage.getItem("stacks:onboarded") === "1"
    const hasCompletedOnboarding = !!initialProfile.state
    if (!onboarded && !hasCompletedOnboarding) setShowWizard(true)
  }, [initialProfile])

  // ─── 12-month projections (per-module) ────────────────────────────
  const paycheckProjection = useMemo(() => {
    const result: SequencerResult = runSequencer({
      slots: profile.dd_slots,
      payFrequency: profile.pay_frequency,
      paycheckAmount: profile.paycheck_amount,
      incomeSources: getIncomeSources(profile),
      userState: profile.state,
    })
    const allBonuses: SequencedBonus[] = result.slots
      .flat()
      .filter((e) => e.type === "bonus") as SequencedBonus[]
    const bonuses12mo = allBonuses.filter((b) => b.start_week * 7 <= 365)
    const total = bonuses12mo.reduce((s, b) => s + (b.net_bonus ?? b.bonus_amount ?? 0), 0)
    const items = [...bonuses12mo]
      .sort((a, b) => (b.net_bonus ?? b.bonus_amount ?? 0) - (a.net_bonus ?? a.bonus_amount ?? 0))
      .map((b) => ({ label: b.bank_name, amount: b.net_bonus ?? b.bonus_amount ?? 0 }))
    return { total, monthlyIncome: Math.round(getTotalMonthlyIncome(profile)), items }
  }, [profile])

  const savingsProjection = useMemo(() => {
    if (!savingsProfile) return { total: 0, items: [] as { label: string; amount: number }[] }
    const balance = savingsProfile.current_balance ?? 0
    if (balance <= 0) return { total: 0, items: [] }
    const result = runSavingsSequencer({
      availableBalance: balance,
      userState: profile.state,
      currentHysaApy: savingsProfile.current_apy ?? 0,
    })
    const items = [...(result.entries ?? [])]
      .sort((a, b) => (b.total_earnings ?? 0) - (a.total_earnings ?? 0))
      .map((e) => ({ label: e.bank_name, amount: Math.round(e.total_earnings ?? 0) }))
    return { total: Math.round(result.total_earnings ?? 0), items }
  }, [savingsProfile, profile.state])

  const spendingProjection = useMemo(() => {
    const monthlySpend = spendingProfile?.monthly_spend ?? 0
    if (monthlySpend <= 0) return { total: 0, items: [] as { label: string; amount: number }[] }
    // Mirror the Spending tab's controls: pace from localStorage,
    // rewards mode from localStorage, per-currency overrides from
    // spending_profile. So the dashboard's spending projection always
    // matches what the user sees inside Spending.
    let pace = DEFAULT_MAX_CARDS_PER_YEAR
    let useTravel = false
    if (typeof window !== "undefined") {
      const v = Number(localStorage.getItem("stacks_cc_pace") ?? "")
      if (Number.isFinite(v) && v > 0) pace = v
      useTravel = localStorage.getItem("stacks_cc_rewards_mode") === "travel"
    }
    const overrides = spendingProfile?.cpp_overrides ?? null
    const sequenced = sequenceCards(creditCardBonuses, monthlySpend, profile.state ?? null, pace, useTravel, overrides)
    const year1List = sequenced.filter((s) => s.cumulative_months <= 12)
    const year1 = year1List.reduce((sum, s) => sum + s.net_value, 0)
    const items = [...year1List]
      .sort((a, b) => b.net_value - a.net_value)
      .map((s) => ({ label: s.card.card_name, amount: Math.round(s.net_value) }))
    return { total: Math.round(year1), items }
  }, [spendingProfile, profile.state])

  const portfolio12mo =
    paycheckProjection.total + savingsProjection.total + spendingProjection.total

  // ─── Started bonuses across all 4 sources ─────────────────────────
  const startedBonuses = useMemo<StartedBonus[]>(() => {
    const out: StartedBonus[] = []

    // 1) Paycheck checking bonuses: completed_bonuses WHERE closed_date IS NULL
    for (const r of completedRecords) {
      if (r.closed_date) continue
      const b = bonuses.find((x) => (x as { id?: string }).id === r.bonus_id)
      if (!b) continue
      out.push({
        module: "paycheck",
        name: (b as { bank_name?: string }).bank_name ?? r.bonus_id,
        amount: r.actual_amount ?? (b as { bonus_amount?: number }).bonus_amount ?? 0,
        started_date: r.opened_date,
        href: "/stacksos/paycheck",
      })
    }

    // 2) Paycheck custom bonuses: in-progress ones (same filter RoadmapClient uses)
    for (const c of customBonuses) {
      if (c.closed_date) continue
      if (c.current_step && NON_ACTIVE_CUSTOM_STEPS.has(c.current_step)) continue
      out.push({
        module: "paycheck",
        name: c.bank_name,
        amount: c.actual_amount ?? c.bonus_amount,
        started_date: c.opened_date,
        nextStep: c.current_step ?? null,
        href: "/stacksos/paycheck",
      })
    }

    // 3) Spending cards: status === "active"
    for (const c of ownedCards) {
      if (c.status !== "active") continue
      out.push({
        module: "spending",
        name: c.card_name,
        amount: c.expected_value ?? c.signup_bonus_value ?? 0,
        started_date: c.opened_date,
        nextStep: c.spend_deadline ? `Spend deadline ${c.spend_deadline}` : null,
        href: "/stacksos/spending",
      })
    }

    // 4) Savings entries: status === "active"
    for (const e of savingsEntries) {
      if (e.status !== "active") continue
      out.push({
        module: "savings",
        name: e.institution_name,
        amount: e.expected_total_value ?? e.bonus_amount ?? 0,
        started_date: e.opened_date,
        nextStep: e.deadline ? `Deadline ${e.deadline}` : null,
        href: "/stacksos/savings",
      })
    }

    // Sort newest-first by start date.
    return out.sort((a, b) => (b.started_date || "").localeCompare(a.started_date || ""))
  }, [completedRecords, customBonuses, ownedCards, savingsEntries])

  // ─── Lifetime earned (completed across all modules) ───────────────
  // Mirror the per-module logic so the dashboard number matches what each
  // tab shows. Key subtlety: a bonus counts as "earned" the moment it
  // posts (bonus_received = true) — the account may still be open. Also
  // custom bonuses in "kept_open" / "bonus_posted" steps count even
  // without a closed_date.
  const lifetimeEarned = useMemo(() => {
    let sum = 0

    // Checking bonuses: r.bonus_received === true (closed_date not required)
    for (const r of completedRecords) {
      if (!r.bonus_received) continue
      const b = bonuses.find((x) => (x as { id?: string }).id === r.bonus_id)
      const fallback = b ? ((b as { bonus_amount?: number }).bonus_amount ?? 0) : 0
      sum += r.actual_amount ?? fallback
    }

    // Custom bonuses: closed+received OR still-open with a "posted" step
    for (const c of customBonuses) {
      const closedAndReceived = c.closed_date && c.bonus_received
      const keptOpenPosted = !c.closed_date && (c.current_step === "kept_open" || c.current_step === "bonus_posted")
      if (closedAndReceived || keptOpenPosted) {
        sum += c.actual_amount ?? c.bonus_amount
      }
    }

    // Spending cards: status === "completed"
    for (const c of ownedCards) {
      if (c.status === "completed") {
        sum += c.actual_value ?? c.expected_value ?? 0
      }
    }

    // Savings entries: status === "completed"
    for (const e of savingsEntries) {
      if (e.status === "completed") {
        sum += e.actual_value ?? e.expected_total_value ?? 0
      }
    }

    return Math.round(sum)
  }, [completedRecords, customBonuses, ownedCards, savingsEntries])

  // In-progress total = sum of expected amounts for started bonuses.
  const inProgressValue = useMemo(
    () => Math.round(startedBonuses.reduce((s, b) => s + b.amount, 0)),
    [startedBonuses],
  )

  return (
    <>
      {showWizard && (
        <WelcomeWizard
          userId={userId}
          initialProfile={profile}
          onComplete={() => {
            setShowWizard(false)
            loadData()
          }}
        />
      )}
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px" }} className="hub-inner">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#111" }}>Dashboard</h1>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2, overflowWrap: "anywhere" }}>
              {userEmail}
            </div>
          </div>
          <a
            href="/stacksos/profile"
            style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600, flexShrink: 0 }}
          >
            Edit profile →
          </a>
        </div>

        <PortfolioCard
          total={portfolio12mo}
          lifetimeEarned={lifetimeEarned}
          inProgress={inProgressValue}
          breakdown={[
            { label: "Paycheck", amount: paycheckProjection.total, href: "/stacksos/paycheck", items: paycheckProjection.items },
            { label: "Spending", amount: spendingProjection.total, href: "/stacksos/spending", items: spendingProjection.items },
            { label: "Savings", amount: savingsProjection.total, href: "/stacksos/savings", items: savingsProjection.items },
          ]}
        />

        <StartedBonusesList bonuses={startedBonuses} />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
          <a
            href="/stacksos/history"
            style={{
              fontSize: 13, color: "#666", textDecoration: "none",
              padding: "8px 14px", border: "1px solid #e8e8e8", borderRadius: 8,
            }}
          >
            Completed bonuses →
          </a>
          <a
            href="/stacksos/taxes"
            style={{
              fontSize: 13, color: "#666", textDecoration: "none",
              padding: "8px 14px", border: "1px solid #e8e8e8", borderRadius: 8,
            }}
          >
            Tax summary →
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hub-inner { padding: 16px 14px 48px !important; }
        }
        @media (max-width: 520px) {
          .hub-inner h1 { font-size: 20px !important; }
        }
      `}</style>
    </>
  )
}
