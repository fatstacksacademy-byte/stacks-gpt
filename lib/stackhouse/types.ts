export type StackhouseMode = "stackhouse" | "clean"

export type StackhouseProfile = {
  user_id: string
  class: string
  current_xp: number
  rank: number
  purity_pct: number
  action_points: number
  preferences: { mode: StackhouseMode } & Record<string, unknown>
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export type Milestone = {
  id: string
  threshold: number
  xp_reward: number
  label: string
  completed_at: string | null
}

export type SideHustle = {
  id: string
  user_id: string
  title: string
  target_amount: number
  milestones: Milestone[]
  xp_reward: number
  status: "active" | "completed" | "abandoned"
  notes: string | null
  created_at: string
  updated_at: string
}

export type XpEvent = {
  id: string
  user_id: string
  source_type:
    | "cook_completion"
    | "milestone_hit"
    | "side_hustle_complete"
    | "daily_round"
    | "street_win"
    | "admin_adjust"
  source_id: string | null
  amount: number
  note: string | null
  occurred_at: string
}

export type ActiveCook = {
  record_id: string
  bonus_id: string
  bank_name: string
  bonus_amount: number
  opened_date: string
  deposit_progress: number // $ logged toward min_direct_deposit_total
  deposit_required: number | null
  days_elapsed: number
  window_days: number | null
  xp_reward: number // computed at read-time: tierXpFor(bonus_amount)
}

export type StreetWin = {
  id: string
  user_id: string
  achievement_key: string
  earned_at: string
  source_context: Record<string, unknown> | null
}

export type AchievementDefinition = {
  key: string
  title_stackhouse: string
  title_clean: string
  description_stackhouse: string | null
  description_clean: string | null
  xp_reward: number
  tier: "bronze" | "silver" | "gold" | "centurion" | null
  unlock_criteria: Record<string, unknown>
  sort_order: number
}
