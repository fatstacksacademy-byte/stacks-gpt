/**
 * Monthly "Best Credit Cards of [Month]" picks — companion blog data
 * for Nathaniel's monthly YouTube video. Each entry generates one blog post
 * at /blog/best-credit-cards-{monthSlug} via app/blog/components/MonthlyCardBonuses.tsx.
 *
 * To publish a new month:
 *   1. Add a new entry to `monthlyCardPicks` below (most recent first).
 *   2. Create app/blog/best-credit-cards-{monthSlug}/page.tsx (copy June as a template).
 *   3. Sitemap picks it up automatically.
 */

export type MonthlyCardPick = {
  /** Must match an id in lib/data/creditCardBonuses.ts. */
  cardId: string
  /** One-line "why I picked it" in Nathaniel's voice. Shown on the card. */
  takeaway: string
}

export type MonthlyCardPicks = {
  /** URL suffix, e.g. "june-2026" → /blog/best-credit-cards-june-2026. Lowercase, hyphenated. */
  monthSlug: string
  /** Display label, e.g. "June 2026". */
  monthLabel: string
  /** ISO publish date (YYYY-MM-DD). */
  publishedDate: string
  /** YouTube video ID for the embedded companion video, if uploaded. */
  videoId?: string
  /** 1-3 sentence intro shown above the picks. */
  intro: string
  /** Ranked picks (#1 first). 3-5 entries works best. */
  picks: MonthlyCardPick[]
}

export const monthlyCardPicks: MonthlyCardPicks[] = [
  {
    monthSlug: "june-2026",
    monthLabel: "June 2026",
    publishedDate: "2026-06-09",
    intro:
      "These are the credit cards I'm recommending this month — chosen for their signup bonus value, reasonable spend requirements, and how well they fit someone who's already optimizing bank bonuses on the side.",
    picks: [
      {
        cardId: "chase-sapphire-preferred-75k",
        takeaway:
          "TODO: Why CSP earns the top slot — 75K UR points, $95 annual fee, and UR points are the most flexible transferable currency for most people.",
      },
      {
        cardId: "amex-gold-100k",
        takeaway:
          "TODO: One-line pitch for Amex Gold — 100K MR points, dining/grocery earning, but watch the $325 annual fee and Amex approval rules.",
      },
      {
        cardId: "capital-one-venture-x-75k",
        takeaway:
          "TODO: Venture X pitch — 75K miles, lounge access, annual travel credit that more than offsets the $395 fee.",
      },
      {
        cardId: "chase-ink-business-preferred-100k",
        takeaway:
          "TODO: Ink Preferred pitch — 100K UR points for business spend, doesn't count toward 5/24 on personal side.",
      },
    ],
  },
]

export function getMonthlyCardPicks(slug: string): MonthlyCardPicks | undefined {
  return monthlyCardPicks.find((m) => m.monthSlug === slug)
}

/** Other months, newest first (excludes the passed slug). */
export function getPreviousCardMonths(currentSlug: string): MonthlyCardPicks[] {
  return monthlyCardPicks
    .filter((m) => m.monthSlug !== currentSlug)
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1))
}
