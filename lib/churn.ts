export type CompletedBonus = {
  id: string
  user_id: string
  bonus_id: string
  opened_date: string
  closed_date: string | null
  bonus_received: boolean
  created_at?: string
  updated_at?: string
}

export type ChurnStatus =
  | { status: "available" }
  | { status: "in_progress"; opened_date: string; record_id: string }
  | { status: "in_cooldown"; available_date: string; days_remaining: number; closed_date: string }
  | { status: "lifetime" }

export function getChurnStatus(
  bonusId: string,
  cooldownMonths: number | null,
  completedRecords: CompletedBonus[]
): ChurnStatus {
  const records = completedRecords.filter((r) => r.bonus_id === bonusId)
  if (records.length === 0) return { status: "available" }

  // Still in progress — no close date yet
  const inProgress = records.find((r) => !r.closed_date)
  if (inProgress) {
    return { status: "in_progress", opened_date: inProgress.opened_date, record_id: inProgress.id }
  }

  // Lifetime = never available again once completed
  if (cooldownMonths === null) {
    return { status: "lifetime" }
  }

  // Find most recently closed
  const sorted = [...records]
    .filter((r) => r.closed_date)
    .sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime())

  const mostRecent = sorted[0]
  if (!mostRecent?.closed_date) return { status: "available" }

  const closedDate = new Date(mostRecent.closed_date + "T00:00:00")
  const availableDate = new Date(closedDate)
  availableDate.setMonth(availableDate.getMonth() + cooldownMonths)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (availableDate <= today) return { status: "available" }

  const daysRemaining = Math.ceil(
    (availableDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    status: "in_cooldown",
    available_date: availableDate.toISOString().split("T")[0],
    days_remaining: daysRemaining,
    closed_date: mostRecent.closed_date,
  }
}

export function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
