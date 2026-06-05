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

/**
 * Reddit OAuth (client-credentials / app-only auth).
 *
 * Reddit started 403'ing unauthenticated /.json requests in mid-2025. To pull
 * subreddit feeds again, create a "script" app at https://www.reddit.com/prefs/apps,
 * then set both env vars:
 *
 *   REDDIT_CLIENT_ID      — the alphanumeric string right under your app name
 *   REDDIT_CLIENT_SECRET  — the "secret" field
 *
 * No Reddit user account required (we use client_credentials grant, which is
 * app-only). Rate limit: ~600 requests per 10 minutes, ample for discover runs.
 * If either env var is missing, the reddit puller falls back to the old
 * unauthenticated fetch (which will likely 403).
 */
export const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
export const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET
