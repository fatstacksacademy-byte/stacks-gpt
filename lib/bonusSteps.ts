import type { CompletedBonus } from "./churn"

export type BonusStep = "open" | "fund" | "wait" | "close"

export const STEPS: { key: BonusStep; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "fund", label: "Fund" },
  { key: "wait", label: "Wait" },
  { key: "close", label: "Close" },
]

const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  semimonthly: 15.2,
  monthly: 30.4,
}

export type StepDetail = {
  currentStep: BonusStep
  isManualOverride: boolean
  steps: {
    key: BonusStep
    label: string
    status: "completed" | "active" | "upcoming"
    subtitle: string | null
  }[]
}

/**
 * Calculate the current step for an in-progress bonus.
 * If the record has a manual `current_step` override, use that.
 * Otherwise, auto-calculate based on dates and pay frequency.
 */
export function getBonusStepDetail(
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): StepDetail {
  const manualStep = (record as any).current_step as BonusStep | null | undefined

  // If already closed, everything is done
  if (record.closed_date) {
    return buildStepDetail("close", false, bonus, record, payFrequency, paycheckAmount)
  }

  // If manual override exists, use it
  if (manualStep && manualStep !== "open") {
    return buildStepDetail(manualStep, true, bonus, record, payFrequency, paycheckAmount)
  }

  // Auto-calculate based on dates
  const autoStep = autoCalculateStep(bonus, record, payFrequency, paycheckAmount)
  return buildStepDetail(autoStep, false, bonus, record, payFrequency, paycheckAmount)
}

function autoCalculateStep(
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): BonusStep {
  const req = bonus.requirements
  const timeline = bonus.timeline
  const openedDate = new Date(record.opened_date + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysSinceOpen = Math.floor(
    (today.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceOpen < 1) return "open"

  // Estimate how many days funding takes
  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14
  let fundingDays = daysPerPay // default: at least one pay cycle

  if (req?.dd_count_required) {
    fundingDays = req.dd_count_required * daysPerPay
  } else if (req?.min_direct_deposit_total && paycheckAmount > 0) {
    const depositsNeeded = Math.ceil(req.min_direct_deposit_total / paycheckAmount)
    fundingDays = depositsNeeded * daysPerPay
  }

  // If we haven't passed the estimated funding period, still in "fund" phase
  if (daysSinceOpen < fundingDays) return "fund"

  // After funding, check if we're in the waiting period for bonus to post
  const bonusPostingDays = timeline?.bonus_posting_days_est ?? null
  if (bonusPostingDays !== null) {
    // Wait phase: between funding complete and bonus posting
    if (daysSinceOpen < bonusPostingDays) return "wait"
  } else {
    // No posting estimate — stay in wait for a reasonable period after funding
    const waitBuffer = fundingDays + 30
    if (daysSinceOpen < waitBuffer) return "wait"
  }

  // Past the waiting period — user should close
  return "wait" // stay on wait until user manually closes
}

function buildStepDetail(
  currentStep: BonusStep,
  isManualOverride: boolean,
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): StepDetail {
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep)
  const req = bonus.requirements
  const timeline = bonus.timeline
  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14

  const openedDate = new Date(record.opened_date + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceOpen = Math.floor(
    (today.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate funding info for subtitles
  let depositsNeeded = 1
  let totalRequired = 0
  if (req?.dd_count_required) {
    depositsNeeded = req.dd_count_required
    totalRequired = req.min_direct_deposit_total ?? depositsNeeded * (req.min_direct_deposit_per_deposit ?? paycheckAmount)
  } else if (req?.min_direct_deposit_total) {
    totalRequired = req.min_direct_deposit_total
    depositsNeeded = paycheckAmount > 0 ? Math.ceil(totalRequired / paycheckAmount) : 1
  }

  const fundingDays = depositsNeeded * daysPerPay
  const depositsSoFar = Math.min(depositsNeeded, Math.max(0, Math.floor(daysSinceOpen / daysPerPay)))
  const depositedSoFar = Math.min(totalRequired, depositsSoFar * paycheckAmount)

  const steps = STEPS.map((s, i) => {
    let status: "completed" | "active" | "upcoming"
    if (i < stepIndex) status = "completed"
    else if (i === stepIndex) status = "active"
    else status = "upcoming"

    // For closed bonuses, mark everything completed
    if (record.closed_date) status = "completed"

    let subtitle: string | null = null

    if (s.key === "open") {
      subtitle = `Opened ${fmtCompact(record.opened_date)}`
    } else if (s.key === "fund") {
      if (status === "completed") {
        subtitle = totalRequired > 0 ? `$${totalRequired.toLocaleString()} deposited` : "Complete"
      } else if (status === "active") {
        if (totalRequired > 0) {
          subtitle = `~$${depositedSoFar.toLocaleString()} / $${totalRequired.toLocaleString()}`
        } else {
          subtitle = `~${depositsSoFar} of ${depositsNeeded} deposits`
        }
      }
    } else if (s.key === "wait") {
      if (status === "completed") {
        subtitle = "Bonus posted"
      } else if (status === "active") {
        const postDays = timeline?.bonus_posting_days_est
        if (postDays) {
          const daysLeft = Math.max(0, postDays - daysSinceOpen)
          subtitle = daysLeft > 0 ? `~${daysLeft} days left` : "Should post soon"
        } else {
          subtitle = "Waiting for bonus"
        }
      }
    } else if (s.key === "close") {
      if (record.closed_date) {
        subtitle = `Closed ${fmtCompact(record.closed_date)}`
      } else if (status === "active") {
        subtitle = "Ready to close"
      }
    }

    return { ...s, status, subtitle }
  })

  return { currentStep, isManualOverride, steps }
}

function fmtCompact(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
