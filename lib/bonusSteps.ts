import type { CompletedBonus } from "./churn"

// ─── New 5-level milestone system ─────────────────────────────────────────────

export type MilestoneKey =
  | "account_opened"
  | "dd_confirmed"
  | "deposit_met"
  | "bonus_posted"
  | "safe_to_close"

export type MilestoneStatus = "completed" | "active" | "upcoming"

export type Milestone = {
  key: MilestoneKey
  level: number
  label: string
  status: MilestoneStatus
  /** Shown beneath the milestone label */
  subtitle: string | null
  /** Calm completion message shown only for the most-recently-completed milestone */
  completionNote: string | null
}

export type DepositProgress = {
  deposited: number
  required: number
}

export type PayCycleProgress = {
  completed: number
  required: number
}

export type MilestoneDetail = {
  currentMilestone: MilestoneKey
  isManualOverride: boolean
  milestones: Milestone[]
  /** Dollar-based deposit progress (null if not applicable) */
  depositProgress: DepositProgress | null
  /** Pay-cycle-based progress (null if not applicable) */
  payCycleProgress: PayCycleProgress | null
  /** Plain-text next action the user should take */
  nextStep: string
  /** Calm celebration message for the latest completed milestone */
  celebrationMessage: string | null
  /** Whether the bonus has posted */
  bonusPosted: boolean
  /** Whether safe-to-close date has been reached */
  safeToClose: boolean
}

// Legacy compat — keep old types around so existing imports don't break
export type BonusStep = "open" | "fund" | "wait" | "close"
export const STEPS: { key: BonusStep; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "fund", label: "Fund" },
  { key: "wait", label: "Wait" },
  { key: "close", label: "Close" },
]
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

const MILESTONE_DEFS: { key: MilestoneKey; level: number; label: string }[] = [
  { key: "account_opened", level: 1, label: "Account Opened" },
  { key: "dd_confirmed", level: 2, label: "Set Up Recurring Direct Deposit" },
  { key: "deposit_met", level: 3, label: "Deposit Requirement Met" },
  { key: "bonus_posted", level: 4, label: "Bonus Posted" },
  { key: "safe_to_close", level: 5, label: "Safe to Close" },
]

const DAYS_PER_PAY: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  semimonthly: 15.2,
  monthly: 30.4,
}

// Map from legacy manual step overrides to new milestones
const LEGACY_STEP_MAP: Record<string, MilestoneKey> = {
  open: "account_opened",
  fund: "dd_confirmed",
  wait: "bonus_posted",
  close: "safe_to_close",
}

// ─── Primary API ──────────────────────────────────────────────────────────────

export function getMilestoneDetail(
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): MilestoneDetail {
  const manualStep = (record as any).current_step as string | null | undefined

  // If already closed, everything complete
  if (record.closed_date) {
    return buildMilestoneDetail("safe_to_close", false, bonus, record, payFrequency, paycheckAmount)
  }

  // Check for legacy manual override and map it
  if (manualStep && manualStep !== "open") {
    const mapped = LEGACY_STEP_MAP[manualStep] ?? (manualStep as MilestoneKey)
    return buildMilestoneDetail(mapped, true, bonus, record, payFrequency, paycheckAmount)
  }

  // Auto-calculate
  const auto = autoCalculateMilestone(bonus, record, payFrequency, paycheckAmount)
  return buildMilestoneDetail(auto, false, bonus, record, payFrequency, paycheckAmount)
}

/** Legacy wrapper — keep old callers working */
export function getBonusStepDetail(
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): StepDetail {
  const detail = getMilestoneDetail(bonus, record, payFrequency, paycheckAmount)
  // Map milestone back to legacy step
  const milestoneToStep: Record<MilestoneKey, BonusStep> = {
    account_opened: "open",
    dd_confirmed: "fund",
    deposit_met: "fund",
    bonus_posted: "wait",
    safe_to_close: "close",
  }
  const currentStep = milestoneToStep[detail.currentMilestone]
  const stepIndex = STEPS.findIndex((s) => s.key === currentStep)

  const steps = STEPS.map((s, i) => {
    let status: "completed" | "active" | "upcoming"
    if (record.closed_date) {
      status = "completed"
    } else if (i < stepIndex) {
      status = "completed"
    } else if (i === stepIndex) {
      status = "active"
    } else {
      status = "upcoming"
    }
    const matching = detail.milestones.find((m) => {
      if (s.key === "open") return m.key === "account_opened"
      if (s.key === "fund") return m.key === "dd_confirmed" || m.key === "deposit_met"
      if (s.key === "wait") return m.key === "bonus_posted"
      if (s.key === "close") return m.key === "safe_to_close"
      return false
    })
    return { ...s, status, subtitle: matching?.subtitle ?? null }
  })

  return { currentStep, isManualOverride: detail.isManualOverride, steps }
}

// ─── Auto-calculation ─────────────────────────────────────────────────────────

function autoCalculateMilestone(
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): MilestoneKey {
  const req = bonus.requirements
  const timeline = bonus.timeline
  const openedDate = new Date(record.opened_date + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceOpen = Math.floor(
    (today.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceOpen < 1) return "account_opened"

  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14

  // First paycheck hasn't landed yet → still waiting for DD confirmation
  if (daysSinceOpen < daysPerPay) return "dd_confirmed"

  // Estimate funding completion
  let depositsNeeded = 1
  if (req?.dd_count_required) {
    depositsNeeded = req.dd_count_required
  } else if (req?.min_direct_deposit_total && paycheckAmount > 0) {
    depositsNeeded = Math.ceil(req.min_direct_deposit_total / paycheckAmount)
  }
  const fundingDays = depositsNeeded * daysPerPay

  if (daysSinceOpen < fundingDays) return "dd_confirmed"

  // Funding complete but bonus hasn't posted yet
  const bonusPostingDays = timeline?.bonus_posting_days_est ?? null
  if (bonusPostingDays !== null) {
    if (daysSinceOpen < bonusPostingDays) return "deposit_met"
  } else {
    const waitBuffer = fundingDays + 30
    if (daysSinceOpen < waitBuffer) return "deposit_met"
  }

  // Check safe-to-close
  const mustRemainOpenDays = timeline?.must_remain_open_days ?? bonusPostingDays ?? null
  if (mustRemainOpenDays !== null && daysSinceOpen >= mustRemainOpenDays) {
    return "safe_to_close"
  }

  // Bonus should have posted but not yet safe to close
  if (mustRemainOpenDays !== null && daysSinceOpen >= (bonusPostingDays ?? mustRemainOpenDays)) {
    return "bonus_posted"
  }

  return "bonus_posted"
}

// ─── Build full detail ────────────────────────────────────────────────────────

function buildMilestoneDetail(
  currentMilestone: MilestoneKey,
  isManualOverride: boolean,
  bonus: any,
  record: CompletedBonus,
  payFrequency: string,
  paycheckAmount: number,
): MilestoneDetail {
  const req = bonus.requirements
  const timeline = bonus.timeline
  const daysPerPay = DAYS_PER_PAY[payFrequency] ?? 14
  const openedDate = new Date(record.opened_date + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceOpen = Math.floor(
    (today.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate deposit numbers
  let depositsNeeded = 1
  let totalRequired = 0
  if (req?.dd_count_required) {
    depositsNeeded = req.dd_count_required
    totalRequired = req.min_direct_deposit_total ?? depositsNeeded * (req.min_direct_deposit_per_deposit ?? paycheckAmount)
  } else if (req?.min_direct_deposit_total) {
    totalRequired = req.min_direct_deposit_total
    depositsNeeded = paycheckAmount > 0 ? Math.ceil(totalRequired / paycheckAmount) : 1
  }

  const depositsSoFar = Math.min(depositsNeeded, Math.max(0, Math.floor(daysSinceOpen / daysPerPay)))
  const depositedSoFar = Math.min(totalRequired, depositsSoFar * paycheckAmount)

  const milestoneIndex = MILESTONE_DEFS.findIndex((m) => m.key === currentMilestone)

  // Determine bonus posted and safe to close flags
  const bonusPosted = milestoneIndex >= 3 // bonus_posted or safe_to_close
  const mustRemainOpenDays = timeline?.must_remain_open_days ?? timeline?.bonus_posting_days_est ?? null
  const safeToClose = milestoneIndex >= 4 || (
    mustRemainOpenDays !== null && daysSinceOpen >= mustRemainOpenDays
  ) || record.closed_date !== null

  // Build milestones
  const milestones: Milestone[] = MILESTONE_DEFS.map((def, i) => {
    let status: MilestoneStatus
    if (record.closed_date) {
      status = "completed"
    } else if (i < milestoneIndex) {
      status = "completed"
    } else if (i === milestoneIndex) {
      status = "active"
    } else {
      status = "upcoming"
    }

    let subtitle: string | null = null
    let completionNote: string | null = null

    switch (def.key) {
      case "account_opened":
        subtitle = `Opened ${fmtCompact(record.opened_date)}`
        if (status === "completed") {
          completionNote = "Account opened successfully."
        }
        break

      case "dd_confirmed":
        if (status === "completed") {
          subtitle = "Recurring DD confirmed with employer"
          completionNote = totalRequired > 0
            ? `Recurring direct deposit confirmed. ${Math.round((depositedSoFar / totalRequired) * 100)}% of deposit requirement met.`
            : "Recurring direct deposit confirmed."
        } else if (status === "active") {
          subtitle = "Route recurring payroll to this account"
        }
        break

      case "deposit_met":
        if (status === "completed") {
          subtitle = totalRequired > 0
            ? `$${totalRequired.toLocaleString()} deposited`
            : "Requirement met"
          completionNote = "Deposit requirement met. Now waiting for bonus to post."
        } else if (status === "active") {
          if (totalRequired > 0) {
            subtitle = `$${depositedSoFar.toLocaleString()} of $${totalRequired.toLocaleString()} deposited`
          } else {
            subtitle = `${depositsSoFar} of ${depositsNeeded} deposits`
          }
        }
        break

      case "bonus_posted":
        if (status === "completed") {
          subtitle = `$${bonus.bonus_amount.toLocaleString()} received`
          completionNote = `$${bonus.bonus_amount.toLocaleString()} bonus posted to your account.`
        } else if (status === "active") {
          const postDays = timeline?.bonus_posting_days_est
          if (postDays) {
            const daysLeft = Math.max(0, postDays - daysSinceOpen)
            subtitle = daysLeft > 0 ? `Estimated ${daysLeft} days remaining` : "Should post soon"
          } else {
            subtitle = "Waiting for bonus to post"
          }
        }
        break

      case "safe_to_close":
        if (record.closed_date) {
          subtitle = `Closed ${fmtCompact(record.closed_date)}`
          completionNote = "Account closed. Bonus complete."
        } else if (status === "active") {
          subtitle = "You can safely close this account"
        } else if (status === "completed") {
          subtitle = "Ready to close"
        }
        break
    }

    return { ...def, status, subtitle, completionNote }
  })

  // Find the most recent completed milestone's celebration message
  let celebrationMessage: string | null = null
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (milestones[i].status === "completed" && milestones[i].completionNote) {
      celebrationMessage = milestones[i].completionNote
      break
    }
  }

  // Deposit progress
  let depositProgress: DepositProgress | null = null
  if (totalRequired > 0 && !bonusPosted) {
    depositProgress = { deposited: depositedSoFar, required: totalRequired }
  }

  // Pay cycle progress
  let payCycleProgress: PayCycleProgress | null = null
  if (depositsNeeded > 1 && !bonusPosted) {
    payCycleProgress = { completed: depositsSoFar, required: depositsNeeded }
  }

  // Next step text
  let nextStep = ""
  switch (currentMilestone) {
    case "account_opened":
      nextStep = "Set up your direct deposit to this account"
      break
    case "dd_confirmed":
      if (totalRequired > 0 && depositedSoFar < totalRequired) {
        const remaining = totalRequired - depositedSoFar
        nextStep = `Continue direct deposits — $${remaining.toLocaleString()} remaining`
      } else if (depositsNeeded > 1 && depositsSoFar < depositsNeeded) {
        nextStep = `Complete ${depositsNeeded - depositsSoFar} more pay cycle${depositsNeeded - depositsSoFar > 1 ? "s" : ""}`
      } else {
        nextStep = "Confirm your next direct deposit"
      }
      break
    case "deposit_met":
      nextStep = "Wait for bonus to post"
      break
    case "bonus_posted":
      if (safeToClose) {
        nextStep = "You can safely close this account now"
      } else if (mustRemainOpenDays !== null) {
        const daysLeft = Math.max(0, mustRemainOpenDays - daysSinceOpen)
        nextStep = `Keep account open for ${daysLeft} more day${daysLeft !== 1 ? "s" : ""}`
      } else {
        nextStep = "Wait for safe-to-close date"
      }
      break
    case "safe_to_close":
      nextStep = "Close the account and move to your next bonus"
      break
  }

  if (record.closed_date) {
    nextStep = "Bonus complete"
  }

  return {
    currentMilestone,
    isManualOverride,
    milestones,
    depositProgress,
    payCycleProgress,
    nextStep,
    celebrationMessage,
    bonusPosted,
    safeToClose,
  }
}

function fmtCompact(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
