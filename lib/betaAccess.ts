// Centralized beta-feature access control.
//
// Replaces per-page hardcoded `ALLOWED_EMAILS` sets. The source of truth is an
// environment variable so beta testers can be added/removed without editing
// code. Note: changing a Vercel env var generally requires a new deployment to
// take effect — so this is "no code change", NOT "instant". If access must
// change instantly (add/revoke a tester live), back this with a Supabase
// beta-access table and query it here instead of reading env.
//
// A small built-in default keeps the owner's accounts working when no env
// override is set (local dev, first deploy).
//
// Server-only: reads process.env. Do not import into client components.

export type BetaFeature = "debt" | "cards"

// Fallback allowlist when no env override is configured for a feature.
const DEFAULT_ALLOWLIST: Record<BetaFeature, string[]> = {
  debt: ["booth.nathaniel@gmail.com", "fatstacksacademy@gmail.com"],
  cards: ["booth.nathaniel@gmail.com", "fatstacksacademy@gmail.com"],
}

function parseEmails(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(/[\s,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * The effective allowlist for a feature: built-in defaults merged with env.
 *
 * Env vars (both honored, merged):
 *   STACKS_BETA_EMAILS              — applies to every beta feature
 *   STACKS_BETA_<FEATURE>_EMAILS    — feature-specific (e.g. STACKS_BETA_DEBT_EMAILS)
 *
 * Each may be a comma / space / semicolon separated list of emails.
 */
export function betaAllowlist(feature: BetaFeature): Set<string> {
  const globalEmails = parseEmails(process.env.STACKS_BETA_EMAILS)
  const featureEmails = parseEmails(process.env[`STACKS_BETA_${feature.toUpperCase()}_EMAILS`])
  return new Set(
    [...DEFAULT_ALLOWLIST[feature], ...globalEmails, ...featureEmails].map(e => e.toLowerCase()),
  )
}

/** True when `email` may access the given beta feature. */
export function hasBetaAccess(feature: BetaFeature, email: string | null | undefined): boolean {
  if (!email) return false
  return betaAllowlist(feature).has(email.toLowerCase())
}
