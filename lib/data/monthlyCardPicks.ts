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

/** A long-form sub-section rendered under a card (earning, how-to-apply, categories…). */
export type CardSection = {
  /** Short bold subheading, e.g. "What it earns" or "How to apply as a business". */
  heading: string
  /** Body paragraphs. */
  paras?: string[]
  /** Optional bullet list (category lists, step lists). */
  bullets?: string[]
}

export type MonthlyCardPick = {
  /** Must match an id in lib/data/creditCardBonuses.ts. */
  cardId: string
  /** One-line "why I picked it" in Nathaniel's voice. Shown on the card. */
  takeaway: string
  /** Optional long-form breakdown rendered under the card's summary stats. */
  sections?: CardSection[]
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
    publishedDate: "2026-06-16",
    intro:
      "This month is all about elevated bonuses and life after Citi Custom Cash. Chase pushed both no-fee Ink business cards AND the Sapphire Preferred to best-ever 100,000-point offers, and three of my picks are built specifically to replace the 5% category spending you lost when Custom Cash went away. Here's exactly what to spend, what each card earns, and how to qualify.",
    picks: [
      {
        cardId: "chase-chase-ink-business-cash-rwp",
        takeaway:
          "This is my #1 this month: 100k Ultimate Rewards is the best bonus this card has ever offered, and with Citi Custom Cash gone, the 5% at office supply stores — gift cards included — is the cleanest way left to get 5% on almost anything.",
        sections: [
          {
            heading: "The 100k offer & what to spend",
            paras: [
              "Both no-fee Ink cards just jumped from the usual 75,000 points to a best-ever 100,000 Ultimate Rewards points. To earn it you spend $8,000 on purchases in the first 4 months. That's a higher hurdle than the old $6,000 offers, but the payoff is the biggest these cards have ever paid. No annual fee, ever.",
              "100,000 UR is worth $1,000 as straight cash, but if you pool the points with a Sapphire Preferred/Reserve or Ink Preferred and transfer to airline and hotel partners, the same points are routinely worth $1,700+ toward travel.",
            ],
          },
          {
            heading: "What it earns",
            paras: [
              "The Ink Business Cash is a category card. The headline rate is 5% — and that's the whole reason it's on this list.",
            ],
            bullets: [
              "5% back at office supply stores and on internet, cable & phone services — on the first $25,000 in combined spend each account anniversary year",
              "2% back at gas stations and restaurants — on the first $25,000 in combined spend each year",
              "1% on everything else, unlimited",
            ],
          },
          {
            heading: "The 5% office-supply play (your Citi Custom Cash replacement)",
            paras: [
              "Office supply stores like Staples and Office Depot/OfficeMax sell third-party gift cards — Amazon, Home Depot, Airbnb, even Visa/Mastercard. Buy those gift cards on the Ink Cash and you're effectively earning 5% on whatever you'd have bought elsewhere. With the $25,000 annual cap, that's up to $1,250 back (125,000 UR) a year from this category alone.",
              "Now that Citi Custom Cash is gone, this is one of the few clean ways left to manufacture 5% back on a wide range of spending.",
            ],
          },
          {
            heading: "Why it's a business card — and how to apply",
            paras: [
              "You do not need an LLC or a registered company. A sole proprietorship qualifies, and that covers side hustles, gig work, reselling, freelancing, and content creation. On the application you select 'Sole Proprietor,' use your own legal name as the business name, and enter your SSN as the Tax ID (an EIN is optional). If the business is brand new with no income yet, $0 revenue is acceptable — Chase approves new sole props all the time.",
            ],
          },
          {
            heading: "Approval rules (these changed in late 2025)",
            paras: [
              "Two things to know. First, the old '24 months since your last bonus' rule is gone — Chase's current terms say the bonus isn't available if you've ever had this card or any other no-annual-fee Chase business card. In practice the two no-fee Ink cards (Cash and Unlimited) now share a single lifetime bonus, so you generally get one between them, not one each.",
              "Second, you should be under 5/24 (fewer than five new personal cards in the past 24 months) to be approved — but once you have it, this business card does not report to your personal credit and won't add to your 5/24 count. That's why Ink cards are the smart cards to grab before you start a personal-card run.",
            ],
          },
        ],
      },
      {
        cardId: "chase-chase-ink-business-unlimited-rwp",
        takeaway:
          "Same record 100k bonus, but flat 1.5% on everything — grab this one if you want a no-think catch-all in the Chase ecosystem. Just know the two no-fee Ink cards now share a single lifetime bonus, so you're choosing, not collecting both.",
        sections: [
          {
            heading: "The 100k offer & what to spend",
            paras: [
              "Identical elevated offer to the Ink Cash: 100,000 Ultimate Rewards points after $8,000 in spend over the first 4 months, no annual fee. Also a best-ever bonus for this card.",
            ],
          },
          {
            heading: "What it earns",
            paras: [
              "There are no categories to track — it's a flat, unlimited 1.5% (1.5x UR) on every purchase. Think of the Ink Unlimited as the catch-all that earns transferable points on the spend that doesn't fit the Ink Cash's 5%/2% categories.",
            ],
          },
          {
            heading: "Cash vs. Unlimited — pick one",
            paras: [
              "Because the no-fee Ink family now shares a single lifetime bonus, you typically won't collect both 100k bonuses at once. If most of your spend is gift cards / office supply / utilities, take the Ink Cash for the 5%. If you want a simple high-floor catch-all, take the Unlimited. Same $0 fee, same 12-month 0% intro APR on purchases, same business application as the Ink Cash.",
            ],
          },
        ],
      },
      {
        cardId: "chase-sapphire-preferred-75k",
        takeaway:
          "Chase just pushed the Sapphire Preferred to a best-ever 100k and quietly overhauled the card — doubled hotel credit, a new Global Entry credit, and a year of Apple TV+. For $95, it's still the most flexible points card most people should own.",
        sections: [
          {
            heading: "The 100k offer & what to spend",
            paras: [
              "The Sapphire Preferred is offering 100,000 Ultimate Rewards points after $5,000 in spend in the first 3 months. The annual fee is $95 and is not waived. This is only the third time in the card's history it has hit 100k — the standard offer is 60,000–75,000 — so it's a genuine high-water mark.",
            ],
          },
          {
            heading: "What it earns (refreshed June 15, 2026)",
            bullets: [
              "5x on travel booked through Chase Travel",
              "3x on dining, online groceries, select streaming, and — new — gas & EV charging and vacation rentals (Airbnb, Vrbo)",
              "2x on all other travel",
              "1x on everything else",
            ],
          },
          {
            heading: "New credits & changes (what's different now)",
            paras: [
              "Chase refreshed the card on June 15, 2026, and a few things in older write-ups are now out of date. What's new and better:",
            ],
            bullets: [
              "Annual hotel credit doubled from $50 to $100 (book & prepay through Chase Travel)",
              "New $120 Global Entry / TSA PreCheck / NEXUS credit, once every 4 years",
              "One year of Apple TV+ free (must activate by Dec 31, 2026)",
              "Removed for new applicants: the 10% anniversary points bonus is gone",
              "Also note: the old flat 25%-more (1.25¢) value on Chase Travel was replaced by 'Points Boost' back in October 2025 — base portal value is now 1¢, with higher value on select premium travel",
            ],
          },
          {
            heading: "Eligibility (rules changed January 2026)",
            paras: [
              "Standard 5/24 applies — if you've opened five or more personal cards in the last 24 months, you'll be declined. But the old 48-month Sapphire rule is gone: as of January 2026 it's once-per-lifetime per card, and you can now hold the Sapphire Preferred and Sapphire Reserve at the same time and still earn each card's bonus once.",
            ],
          },
        ],
      },
      {
        cardId: "bofa-bank-of-america-customized-cash-rewards-rwp",
        takeaway:
          "I just got this one and picked online shopping — the new-cardholder boost makes your category 6% for a full year, which is exactly the kind of thing that softens the loss of Citi Custom Cash.",
        sections: [
          {
            heading: "The $200 bonus & what to spend",
            paras: [
              "$200 online cash rewards bonus after $1,000 in purchases in the first 90 days. No annual fee.",
            ],
          },
          {
            heading: "The 6% first-year boost — and every category you can choose",
            paras: [
              "This is why the card is on the list right now. New cardholders get a +3% boost on their chosen 3% category for the first 12 months, so your pick effectively earns 6% all year. You choose one category (and you can change it once per calendar month):",
            ],
            bullets: [
              "Gas & EV charging stations",
              "Online shopping (includes cable, internet, phone plans & streaming)",
              "Dining",
              "Travel",
              "Drug stores / pharmacies",
              "Home improvement & furnishings",
            ],
          },
          {
            heading: "How the cap works",
            paras: [
              "The 6% (your choice category) and the automatic 2% at grocery stores and wholesale clubs share one combined $2,500-per-quarter cap; everything above that, and all other spend, earns 1%. So the boost is rich but bounded — plan your category around where you'll actually spend that $2,500 a quarter. I chose online shopping.",
            ],
          },
          {
            heading: "0% intro APR",
            paras: [
              "0% intro APR for 15 billing cycles on purchases and on balance transfers made in the first 60 days. (If you carry balances at Bank of America via Preferred Rewards, note that program was renamed BofA Rewards and re-tiered in May 2026 — the top 75% boost now requires $1M+ in balances, so don't assume the old Platinum Honors math.)",
            ],
          },
        ],
      },
      {
        cardId: "usb-cash-plus-200",
        takeaway:
          "If you're going through Custom Cash withdrawal, this is the methadone: you pick your own two 5% categories every quarter, and the bonus just bumped up to an elevated $250.",
        sections: [
          {
            heading: "The $250 bonus & what to spend",
            paras: [
              "$250 cash back after $1,000 in eligible purchases in the first 90 days — up from $200, and the best offer this card runs. No annual fee.",
            ],
          },
          {
            heading: "How the 5% works + the full category list",
            paras: [
              "This is the most flexible 5% card on the market: each quarter you choose TWO 5% categories and earn 5% on the first $2,000 in combined spend across them (then 1%), plus ONE 2% everyday category that's unlimited. You must re-enroll every quarter or everything drops to 1%. The twelve 5% categories to choose from:",
            ],
            bullets: [
              "TV, Internet & Streaming Services",
              "Cell Phone Providers",
              "Fast Food",
              "Department Stores",
              "Electronics Stores",
              "Furniture Stores",
              "Movie Theaters",
              "Sporting Goods Stores",
              "Ground Transportation",
              "Select Clothing Stores",
              "Gyms / Fitness Centers",
              "Home Utilities",
            ],
          },
          {
            heading: "The 2% everyday category (pick one)",
            bullets: [
              "Gas & EV charging stations",
              "Grocery stores",
              "Restaurants",
            ],
          },
          {
            heading: "How to use it effectively (Custom Cash therapy)",
            paras: [
              "The power move versus Citi Custom Cash is that you control the categories. Pick TV/Internet/Streaming or Cell Phone Providers when you have large bills to pay directly, and you can hit the $2,000 quarterly cap fast — that's $100 back per quarter, $400 a year, at 5%. (Heads up: third-party gift cards bought through PayPal, Google Play, Amazon or iTunes often code as 1%, so pay providers directly when you can.) It also carries 0% intro APR for 15 billing cycles on purchases and balance transfers.",
            ],
          },
        ],
      },
      {
        cardId: "usaa-bank-eagle-adapt-200",
        takeaway:
          "Brand-new USAA card I just picked up — a flat 3% across eight everyday categories makes it a killer catch-all for veterans who don't have a Robinhood Gold card, plus 15 months of 0% APR to boot.",
        sections: [
          {
            heading: "What it is & who it's for",
            paras: [
              "The Eagle Adapt is a new 2026 cash-back card from USAA, so it requires USAA membership — generally active military, veterans, and their eligible family members. For a no-annual-fee card it bundles an unusually full package: a sign-up bonus, a long 0% intro APR, and broad 3% earning.",
            ],
          },
          {
            heading: "The 3% catch-all categories",
            paras: [
              "This is the reason it's here. You earn 3% cash back on the first $3,000 in combined purchases each quarter across eight everyday categories, then 1% after the cap (and 1% on everything else). If you don't have a Robinhood Gold card, this is one of the strongest 'one card for most spending' options out there. The eight 3% categories:",
            ],
            bullets: [
              "Groceries",
              "Dining / restaurants",
              "Gas & EV charging stations",
              "Travel",
              "Transit",
              "Home improvement & home furnishings",
              "Health & wellness",
              "Live entertainment & streaming services",
            ],
          },
          {
            heading: "$200 bonus + 0% intro APR",
            paras: [
              "$200 cash back after $1,000 in purchases in the first 90 days — generous by USAA standards. And the part I love: 0% intro APR for 15 months on both purchases and balance transfers. No annual fee. (One honest caveat: the balance-transfer fee is 5%, which eats into the 0% BT appeal, and the 3% is capped at $3,000/quarter before dropping to 1%.)",
            ],
          },
        ],
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
