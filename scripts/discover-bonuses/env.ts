/**
 * Env + constants for the bot. UA is configurable so you can rotate or match
 * whatever's on the /bot landing page.
 */

export const UA =
  process.env.BONUS_BOT_UA ||
  "StackOS-BonusBot/1.0 (+https://fatstacksacademy.com/bot)"

export const DEFAULT_THROTTLE_SECONDS = Number(
  process.env.BONUS_BOT_THROTTLE_SECONDS ?? 1.5,
)

/** Reddit is strict — require a non-default UA and a longer throttle */
export const REDDIT_THROTTLE_SECONDS = Number(
  process.env.BONUS_BOT_REDDIT_THROTTLE_SECONDS ?? 2.0,
)

export const MAX_CLAUDE_CALLS = Number(
  process.env.BONUS_BOT_MAX_CLAUDE_CALLS ?? 20,
)
