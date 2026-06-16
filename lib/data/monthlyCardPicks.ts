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
          "The Sapphire Preferred is an easy #1 right now — Chase just pushed it to a best-ever 100,000 Ultimate Rewards points for the same $95 fee, and UR is the most flexible transferable currency for most people (Hyatt, United, and cash all in play).",
      },
      {
        cardId: "amex-gold-100k",
        takeaway:
          "The Amex Gold pairs a 100,000 Membership Rewards bonus with the best everyday dining and grocery earning of any card — just run the $325 annual fee math against the credits and remember Amex's once-per-lifetime bonus rule before you apply.",
      },
      {
        cardId: "capital-one-venture-x-75k",
        takeaway:
          "Venture X is the premium pick that pays for itself: 75,000 miles plus Priority Pass and Capital One lounge access, and a $300 annual travel credit that — with the 10,000 anniversary miles — more than covers the $395 fee.",
      },
      {
        cardId: "chase-ink-business-preferred-100k",
        takeaway:
          "Ink Business Preferred is the 5/24 cheat code — 100,000 Ultimate Rewards for business spend that won't add to your personal 5/24 count, so you can run it right alongside a personal-card chase.",
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
