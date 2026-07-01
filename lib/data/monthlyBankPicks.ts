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

/**
 * A quick "also worth knowing" nod — a bonus we mention in one line but don't
 * give a full ranked card (e.g. an offer that's expiring or was covered
 * recently). Rendered as a compact row under the picks.
 */
export type MonthlyHonorableMention = {
  /** Must match an id in lib/data/bonuses.ts or lib/data/savingsBonuses.ts. */
  bonusId: string
  /** One-sentence note in Nathaniel's voice. */
  note: string
}

/**
 * An optional highlighted "the move this month" box shown above the picks —
 * for a cross-pick strategy that doesn't belong to any single card (e.g.
 * "use Ally as your Bank of America direct deposit").
 */
export type MonthlyStrategyCallout = {
  title: string
  body: string
  /** Optional related-reading link (e.g. the "what counts as direct deposit" guide). */
  link?: { href: string; label: string }
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
  /** Ranked picks (#1 first). 3-6 entries works with the layout. */
  picks: MonthlyBankPick[]
  /**
   * Optional cross-pick strategy box. Authored in this TS file only — the
   * /admin/blog-posts editor does NOT manage it, so the month's page.tsx
   * overlays it from static after the DB read (an admin save that only writes
   * the core fields can't silently drop it). See app/blog/best-bank-bonuses-july-2026/page.tsx.
   */
  strategyCallout?: MonthlyStrategyCallout
  /** Optional one-line "also worth a look" nods. Same static-overlay caveat as strategyCallout. */
  honorableMentions?: MonthlyHonorableMention[]
}

export const monthlyBankPicks: MonthlyBankPicks[] = [
  {
    monthSlug: "july-2026",
    monthLabel: "July 2026",
    publishedDate: "2026-07-01",
    // videoId added after the companion video is uploaded (via /admin/blog-posts).
    intro:
      "These are the bank bonuses I'm prioritizing for July 2026 — ranked by how much you actually pocket, how simple the requirement is, and how confident I am the offer is still standing when you go to open the account. The theme this month is pairing accounts: the two Ally offers below aren't just their own free money — an ACH push from Ally is one of the most reliable ways to trigger Bank of America's direct-deposit requirement, so one account can do double duty. And move fast on Wells Fargo Business — it dies July 7.",
    strategyCallout: {
      title: "This month's move: use Ally as your Bank of America direct deposit",
      body:
        "Bank of America's bonus needs “direct deposits,” and the fine print says transfers from another bank don't count — but in practice an ACH push from Ally reliably triggers it (Doctor of Credit has 30+ confirmed data points). So the play is simple: open Ally Savings and/or Ally Invest, collect their own bonuses, then push money from Ally into Bank of America to satisfy BofA's requirement. One funding rail, three bonuses. It's a community-tested method, not something BofA promises in writing — so if you have real payroll, route that too, and don't close the account before the bonus posts.",
      link: { href: "/blog/what-counts-as-direct-deposit", label: "What actually counts as a direct deposit →" },
    },
    picks: [
      {
        bonusId: "four-leaf-fcu-550-checking-2026",
        takeaway:
          "Do this one first — before you open anything else. FourLeaf (formerly Bethpage) is ChexSystems-sensitive, and the data points show it cares mostly about how many accounts you've opened in the last month; zero or one is ideal, so apply while your recent-account count is still clean. Here's the part the four-leaf write-ups gloss over: the $350 only needs ONE qualifying $500+ direct deposit within 90 days — one paycheck and you're paid. The other $200 is a separate, two-year play: +$100 at 12 consecutive months and +$100 at 24, and if you miss a single month you forfeit both. Only real payroll/pension/gov deposits count (ACH pushes are hit-or-miss), so grab the easy $350, then decide on the $200 — it's a great low-effort hold if you can split your payroll (one paycheck/month here, the rest chasing other bonuses) or if you're parked in a Chex cooldown anyway. Just mind the opportunity cost of tying up a recurring-DD rail, and note it's once-per-lifetime.",
      },
      {
        bonusId: "bank-of-america-500-tiered-checking-2026",
        takeaway:
          "Bank of America is the anchor of this month's stack: nationwide and among the least ChexSystems-sensitive of the big banks. The bonus scales — $100 at $2,000 in deposits, $300 at $5,000, $500 at $10,000 — and most people should target the $100–$300 tiers, which you can hit with ACH pushes from the Ally accounts below.",
      },
      {
        bonusId: "ally-savings-referral-2026",
        takeaway:
          "The easiest $100 on the list, and the one to open first of the two Ally accounts: it makes you an existing Ally customer (which unlocks the Invest bonus below) and gives you the ACH rail to push a “direct deposit” into Bank of America. Set up a $20+/month recurring transfer into Ally Online Savings for three months and the bonus posts — see the strategy note above.",
      },
      {
        bonusId: "ally-invest-brokerage-2026",
        takeaway:
          "A flat $200 for moving $1,000 into an Ally Invest self-directed account is a 20% return in 90 days — one of the best bonus-to-deposit ratios anywhere. Two catches: it's only for existing Ally Bank customers who've never had Ally Invest (so open the Ally Savings account above first), and the full $200 requires funding from a NON-Ally account — pushing money over from your Ally Savings only pays $100. Fund this one from an outside bank.",
      },
      {
        bonusId: "wells-fargo-initiate-business-400-2026",
        takeaway:
          "Expires July 7 — the fastest-dying offer here. Wells Fargo's Initiate Business Checking pays $400 just for keeping a $2,500 balance from day 30 to day 60: no direct deposit, no debit transactions. Deposit $25,000 instead and it jumps to $825. You don't need an LLC — a sole proprietorship qualifies.",
      },
      {
        bonusId: "capital-one-360-savings-2026",
        takeaway:
          "The Discover angle makes this my idle-cash pick of the month: Capital One just finished absorbing Discover, so it's the bank everyone's watching right now — and its 360 Performance Savings is quietly running one of the biggest deposit bonuses out there. Fund net-new money with promo code BONUS1500 and hold it 90 days: $300 at $20,000, $750 at $50,000, or a full $1,500 at $100,000. It's nationwide, needs no business, no debit transactions, and no direct deposit — just cash you park and leave. One catch: you're excluded if you've held an eligible Capital One savings account since January 1, 2024.",
      },
    ],
    honorableMentions: [
      {
        bonusId: "amex-rewards-checking-300-2026",
        note:
          "Covered it last week, and it dies July 30 — but if you already carry an Amex card, $7,500 in direct deposits over 90 days nets a quick $300. It isn't always available, so grab it if it fits. Full details and link in the description.",
      },
    ],
  },
  {
    monthSlug: "june-2026",
    monthLabel: "June 2026",
    publishedDate: "2026-06-09",
    videoId: "qMrSAef3f3Q",
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
