export type CompletedBonus = {
  id: string
  user_id: string
  bonus_id: string
  opened_date: string
  closed_date: string | null
  bonus_received: boolean
  actual_amount: number | null
  current_step: string | null
  /** User flagged the record via "Already had" but skipped entering dates.
   *  Cooldown math should exclude or warn on these since we can't trust the
   *  close date (null or unreliable). */
  incomplete_info?: boolean
  created_at?: string
  updated_at?: string
}

export type ChurnStatus =
  | { status: "available" }
  | { status: "in_progress"; opened_date: string; record_id: string }
  | { status: "in_cooldown"; available_date: string; days_remaining: number; closed_date: string }
  | { status: "lifetime" }
  | { status: "incomplete_info"; record_id: string }

export function getChurnStatus(
  bonusId: string,
  cooldownMonths: number | null,
  completedRecords: CompletedBonus[]
): ChurnStatus {
  const records = completedRecords.filter((r) => r.bonus_id === bonusId)
  if (records.length === 0) return { status: "available" }

  // Records the user flagged as "Already had" without entering dates.
  // We can't trust them for cooldown math (no close date to measure from),
  // but we also can't safely show the bonus as available — the user told
  // us they opened it at some point. Surface its own status so UI can prompt
  // the user to fill in dates. Only use this signal if there's no other
  // real record for this bonus (a proper in-progress / cooldown record
  // takes priority).
  const realRecords = records.filter((r) => !r.incomplete_info)
  const incompleteRecord = records.find((r) => r.incomplete_info)
  if (realRecords.length === 0 && incompleteRecord) {
    return { status: "incomplete_info", record_id: incompleteRecord.id }
  }

  // From here on, we work only with real (non-incomplete) records for
  // cooldown math — incomplete ones can't be trusted to have dates.
  // Still in progress — no close date yet
  const inProgress = realRecords.find((r) => !r.closed_date)
  if (inProgress) {
    return { status: "in_progress", opened_date: inProgress.opened_date, record_id: inProgress.id }
  }

  // Lifetime = never available again once completed
  if (cooldownMonths === null) {
    return { status: "lifetime" }
  }

  // Find most recently closed
  const sorted = [...realRecords]
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
