import type { LabelsDict } from "./labels.stackhouse"

/**
 * Clean-mode vocabulary. Same keys, plain wording. Same shape — enforced
 * by the LabelsDict type so any missing key becomes a compile error.
 */
export const labels: LabelsDict = {
  appTitle: "Stackhouse",
  dashboard: "Dashboard",
  level: "Level",
  rank: "Rank",
  xp: "XP",
  xpShort: "XP",
  xpToNext: "XP to next rank",

  class_kingpin: "Level",

  customQuest: "Custom quest",
  customQuestPlural: "Custom quests",
  activeBonus: "Active bonus",
  activeBonusPlural: "Active bonuses",
  bonusCompleted: "Bonus completed",
  dailyQuest: "Daily quest",

  operation: "Overview",
  paycheck: "Paycheck",
  savings: "Savings",
  spending: "Credit cards",
  creditScore: "Credit score",
  modifier: "Modifier",

  bank: "Bank",
  territories: "Banks",
  status_good: "Good standing",
  status_neutral: "Neutral",
  status_warning: "At risk",
  status_banned: "Shut down",

  achievement: "Achievement",
  achievementPlural: "Achievements",

  largeBonus: "Large bonus",
  mediumBonus: "Medium bonus",
  smallBonus: "Small bonus",

  chexRisk: "ChexSystems risk",
  five24: "5/24 status",

  stat_dough_slung: "Total XP",
  stat_jobs_run: "Bonuses completed",
  stat_clean_rate: "Completion rate",
  stat_heat_level: "ChexSystems risk",
  stat_five_24: "5/24 status",

  cta_start_hustle: "New custom quest",
  cta_mark_milestone: "Mark milestone",
  cta_abandon: "Abandon",
  cta_complete: "Mark complete",
  cta_collect_daily: "Collect",

  empty_side_hustles: "No custom quests yet. Create one.",
  empty_active_cooks: "No active bonuses. Start one from the sequencer.",
  empty_street_wins: "No achievements earned yet.",

  welcome_title: "Welcome to Stackhouse",
  welcome_subtitle: "A gamified view of your Stacks OS data.",
  welcome_body:
    "Stackhouse reads your existing bonus tracking and layers rank, XP, and quests on top. Toggle between themed (Stackhouse) and plain (Clean) mode any time.",
  welcome_cta: "Continue",

  mode_label: "Mode",
  mode_stackhouse: "Stackhouse",
  mode_clean: "Clean",
}
