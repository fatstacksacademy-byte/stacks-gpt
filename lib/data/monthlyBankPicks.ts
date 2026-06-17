/**
 * Monthly "Best Bank Bonuses of [Month]" picks — the companion blog data
 * for Nathaniel's monthly YouTube video. Each entry generates one blog post
 * at /blog/best-bank-bonuses-{monthSlug} via app/blog/components/MonthlyBankBonuses.tsx.
 *
 * To publish a new month:
 *   1. Add a new entry to `monthlyBankPicks` below (most recent first).
 *   2. Create app/blog/best-bank-bonuses-{monthSlug}/page.tsx (copy June as a template).
 *   3. Sitemap picks it up automatically.
 */

export type MonthlyBankPick = {
  /** Must match an id in lib/data/bonuses.ts (checking) or lib/data/savingsBonuses.ts (savings). */
  bonusId: string
  /** One-line "why I picked it" in Nathaniel's voice. Shown on the card. */
  takeaway: string
}

export type MonthlyBankPicks = {
  /** URL suffix, e.g. "june-2026" → /blog/best-bank-bonuses-june-2026. Lowercase, hyphenated. */
  monthSlug: string
  /** Display label, e.g. "June 2026". */
  monthLabel: string
  /** ISO publish date (YYYY-MM-DD). */
  publishedDate: string
  /** YouTube video ID for the embedded companion video, if uploaded. */
  videoId?: string
  /** 1-3 sentence intro shown above the picks. */
  intro: string
  /** Ranked picks (#1 first). 3-4 entries works best with the layout. */
  picks: MonthlyBankPick[]
}

export const monthlyBankPicks: MonthlyBankPicks[] = [
  {
    monthSlug: "june-2026",
    monthLabel: "June 2026",
    publishedDate: "2026-06-09",
    videoId: "vOTY5ppIdGc",
    intro:
      "These are the four bank account bonuses I'm prioritizing this month — ranked by bonus value, simplicity of the direct-deposit requirement, and how confident I am the offer sticks around past July.",
    picks: [
      {
        bonusId: "bank-of-america-500-tiered-checking-2026",
        takeaway:
          "Bank of America takes the top slot because it's the rare big-bank bonus that's genuinely easy: available nationwide, a straightforward direct-deposit requirement, and among the least ChexSystems-sensitive of the major banks — the safest first bonus if you're just getting started.",
      },
      {
        bonusId: "wintrust-500-checking-2026",
        takeaway:
          "Wintrust is the best dollar-for-dollar value on this list — a full $500 for a modest deposit requirement — but it's Midwest-regional, so confirm your state is eligible before you get attached to it.",
      },
      {
        bonusId: "us-bank-smartly-checking-450-2026",
        takeaway:
          "US Bank Smartly has the cleanest direct-deposit requirement of the group and the bonus posts fast — but move quickly, because it's one of the first offers in this batch to expire.",
      },
      {
        bonusId: "chase-total-checking-400-2026",
        takeaway:
          "Chase is still the best starter bonus for most people: a single $1,000 direct deposit clears it, the payout is fast, and the monthly fee waives with light activity — the lowest-friction way to bank your first $400.",
      },
    ],
  },
]

export function getMonthlyPicks(slug: string): MonthlyBankPicks | undefined {
  return monthlyBankPicks.find((m) => m.monthSlug === slug)
}

/** Other months, newest first (excludes the passed slug). */
export function getPreviousMonths(currentSlug: string): MonthlyBankPicks[] {
  return monthlyBankPicks
    .filter((m) => m.monthSlug !== currentSlug)
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1))
}
