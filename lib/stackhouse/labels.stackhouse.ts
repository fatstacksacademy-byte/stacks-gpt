/**
 * Stackhouse vocabulary dictionary — themed crime-syndicate labels.
 *
 * Every user-facing string in the /stackhouse section must come from either
 * this file or labels.clean.ts. Never hardcode strings in components.
 *
 * Light crime drama (Ocean's Eleven / The Wire), not actual criminality —
 * we're slinging dough, not anything else.
 */
export const labels = {
  // Core vocabulary
  appTitle: "The Stackhouse",
  dashboard: "Stackhouse",
  level: "Purity",
  rank: "Rank",
  xp: "Dough slung",
  xpShort: "Dough",
  xpToNext: "Dough to next rank",

  // Characters + ranks
  class_kingpin: "Kingpin",

  // Quests
  customQuest: "Side hustle",
  customQuestPlural: "Side hustles",
  activeBonus: "Active cook",
  activeBonusPlural: "Active cooks",
  bonusCompleted: "Job run",
  dailyQuest: "Daily round",

  // Operation (phase 2, still referenced by stubs)
  operation: "The operation",
  paycheck: "Front",
  savings: "Stash",
  spending: "Lab",
  creditScore: "Rep",
  modifier: "Modifier",

  // Territories
  bank: "Territory",
  territories: "Territories",
  status_good: "Family",
  status_neutral: "Neutral",
  status_warning: "Hot",
  status_banned: "Burned",

  // Achievements
  achievement: "Street win",
  achievementPlural: "Street wins",

  // Bonus size tiers
  largeBonus: "Big score",
  mediumBonus: "Earner",
  smallBonus: "Slow cook",

  // Risk
  chexRisk: "Heat level",
  five24: "5/24 heat",

  // Stat strip
  stat_dough_slung: "Dough slung",
  stat_jobs_run: "Jobs run",
  stat_clean_rate: "Clean rate",
  stat_heat_level: "Heat level",
  stat_five_24: "5/24 heat",

  // CTAs
  cta_start_hustle: "New side hustle",
  cta_mark_milestone: "Mark milestone",
  cta_abandon: "Walk away",
  cta_complete: "Close the book",
  cta_collect_daily: "Collect round",

  // Empty states
  empty_side_hustles: "No side hustles running. Draft one up.",
  empty_active_cooks: "No cooks in the oven. Start a bonus from the sequencer.",
  empty_street_wins: "No street wins yet — close a job to earn your first.",

  // Welcome
  welcome_title: "Welcome to The Stackhouse",
  welcome_subtitle:
    "Your bonus tracking, styled. Stacks OS data — new paint.",
  welcome_body:
    "Bonuses are cooks. Banks are territories. Credit cards are lab equipment. Your rank climbs as you sling more dough. Flip the mode toggle any time to see the plain version.",
  welcome_cta: "Let's go",

  // Mode toggle
  mode_label: "Mode",
  mode_stackhouse: "Stackhouse",
  mode_clean: "Clean",
}

// Widen each value to plain string so labels.clean.ts can populate the same
// shape with different wording. Without this, the `as const` below would
// make each value a literal type and clean labels would fail to assign.
export type LabelsDict = { [K in keyof typeof labels]: string }
