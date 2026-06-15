/**
 * Shared types for the YouTube affiliate-link sync system.
 *
 * The mental model mirrors the website: a single canonical registry of
 * affiliate/referral links is the source of truth, and video descriptions
 * are kept in sync *from* that registry. See registry.ts.
 */

/** One affiliate/referral program the system knows how to recognize + keep current. */
export interface LinkProgram {
  /** Stable key, e.g. "chase-business-referral", "amex-blue-business-plus". */
  key: string
  /** Human label shown in reports. */
  label: string
  issuer?: string
  /**
   * The current canonical link. Every matching link in a description should
   * point here. Empty string means "we don't have a live link right now"
   * (common for Amex right after a link rotates) — the system flags these
   * for you to paste a fresh one instead of rewriting anything.
   */
  currentUrl: string
  /**
   * Known *prior* URLs for THIS exact program. A description link that equals
   * one of these is unambiguously stale and is safe to auto-rewrite to
   * currentUrl. Keep appending old links here as you rotate them.
   */
  aliases?: string[]
  /**
   * Recognizes links that belong to this program's domain/shape but are
   * neither currentUrl nor a known alias. These are surfaced for REVIEW, not
   * auto-rewritten — because the same domain can host multiple products
   * (e.g. referyourchasecard.com is used for both business and personal cards).
   */
  domainMatch?: RegExp
  /**
   * Disambiguates same-domain programs. When set, a domainMatch hit only
   * counts as this program if one of these keywords appears near the link in
   * the description (same line / nearby). Lowercased, matched case-insensitively.
   */
  contextKeywords?: string[]
  /**
   * Substrings that, if found in the *fetched destination page*, mean the link
   * is dead/expired even though it returned HTTP 200. This is how we catch
   * Amex referral links, which expire to a "no longer available" page.
   */
  expiredFingerprints?: string[]
  /**
   * True for programs whose links rotate and can only be regenerated from your
   * own account (Amex refer-a-friend). The system never fabricates these — it
   * flags them so you paste a fresh link into the registry.
   */
  rotates?: boolean
  notes?: string
}

/** A single URL found inside a video description, with where it sat. */
export interface FoundLink {
  url: string
  /** The text on the same line / immediately around the link (for context matching). */
  context: string
}

export type LinkStatus =
  | "current" // matches the program's currentUrl — nothing to do
  | "stale" // matches a known alias — safe auto-rewrite to currentUrl
  | "review" // recognized program/domain but unknown specific URL — needs your eyes
  | "dead" // destination resolves to an expired/invalid page (live check)
  | "needs-current" // matched a program whose currentUrl is empty — paste a fresh link
  | "orphan" // looks like an affiliate link but matches no known program
  | "ignore" // ordinary content link — not affiliate-shaped

/** Verdict for one found link after classification (+ optional live check). */
export interface LinkVerdict {
  link: FoundLink
  status: LinkStatus
  programKey?: string
  /** When auto-fixable, the URL this link should become. */
  target?: string
  /** True only when the rewrite is safe to apply without human confirmation. */
  autoFixable: boolean
  reason: string
}

/** One video's worth of analysis. */
export interface VideoVerdict {
  videoId: string
  title: string
  url: string
  verdicts: LinkVerdict[]
  /** Description with all autoFixable rewrites applied (computed, not yet pushed). */
  proposedDescription?: string
  /** True if proposedDescription differs from the live description. */
  changed: boolean
}

/** Minimal video shape we pull from / push to the YouTube API. */
export interface YouTubeVideo {
  videoId: string
  title: string
  description: string
  categoryId: string
}
