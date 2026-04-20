/**
 * Rich editorial content for credit card blog posts.
 * Keyed by card ID — matches creditCardBonuses.ts ids.
 *
 * Parallel to blogContent.ts (which covers checking/savings bonuses)
 * but with a card-specific schema: rewards strategy, AF justification,
 * transfer partners, etc.
 *
 * Entries are seeded by scripts/generate-blog-content/run.ts which
 * fetches each issuer offer page via Playwright, verifies the link is
 * live, and extracts the bonus/spend/fee numbers used in the summary.
 * The strategy/pros/cons/FAQs are templated from the catalog data so
 * the facts in the post always match the catalog (no drift).
 */

export type CardBlogContent = {
  /** 2-3 sentence editorial summary referencing the verified offer details */
  summary: string
  /** Strategy section — how to hit the spend + maximize rewards + AF math */
  strategy: string
  /** Who this card is best for */
  bestFor: string
  /** Pros list */
  pros: string[]
  /** Cons list */
  cons: string[]
  /** Comparison notes — how this compares to similar cards */
  comparison: string
  /** FAQ pairs for FAQ schema */
  faqs: { q: string; a: string }[]
  /** Related card slugs for cross-linking */
  relatedSlugs: string[]
  /** Provenance: when the offer page was last verified by the generator */
  verifiedAt?: string
  /** The exact offer page URL we verified — useful if it differs from current catalog */
  verifiedUrl?: string
}

export const cardBlogContent: Record<string, CardBlogContent> = {
  "amex-blue-cash-everyday-250": {
    summary: "The Amex Blue Cash Everyday is currently offering $250 after $2,000 in purchases within 6 months. There's no annual fee, which makes the $250 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $250 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $2,000 requirement in 6 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Blue Cash Everyday until you've earned the $250 bonus. Mind your issuer rules: Amex limits each card to one lifetime sign-up bonus per cardholder. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $250 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$250 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "3% at U.S. supermarkets (up to $6k/yr)",
    ],
    cons: [
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's personal lineup, the closest comparison is the American Express Platinum (175,000 Membership Rewards after $8,000/6mo, $895 AF). The Amex Blue Cash Everyday is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Amex Blue Cash Everyday sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $250 after spending $2,000 on purchases within 6 months of account opening." },
      { q: "What's the Amex Blue Cash Everyday annual fee?", a: "There is no annual fee on the Amex Blue Cash Everyday." },
      { q: "How long does the Amex Blue Cash Everyday sign-up bonus take to post?", a: "Once you cross the $2,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-business-platinum-200000-membership-rewards","citi-double-cash-200-cash"],
    verifiedAt: "2026-04-19T22:02:46.412Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/",
  },

  "amex-business-platinum-200k": {
    summary: "The Amex Business Platinum is currently offering 200,000 Membership Rewards after $20,000 in purchases within 3 months. It carries a $895 annual fee, offset by roughly $800 in year-one statement credits. Estimated net year-one value: $1,905 based on a 1¢ per-point valuation.",
    strategy: "To hit the $20,000 requirement in 3 months, you need about $6,667 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Business Platinum until you've earned the 200,000 Membership Rewards bonus. Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Self-employed or sole-proprietor users with at least $6,667/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.",
    pros: [
      "200,000 Membership Rewards sign-up bonus",
      "$800 in year-one statement credits",
      "$600 hotel credit",
      "$200 airline incidental credit",
    ],
    cons: [
      "$895 annual fee",
      "High $20,000 minimum spend can be hard to hit organically",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's business lineup, the closest comparison is the Amex Hilton Business (175,000 Hilton Honors after $8,000/6mo, $195 AF). The Amex Business Platinum is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Amex Business Platinum sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 200,000 Membership Rewards after spending $20,000 on purchases within 3 months of account opening." },
      { q: "What's the Amex Business Platinum annual fee?", a: "The annual fee is $895. It is partially offset by approximately $800 in year-one statement credits." },
      { q: "How long does the Amex Business Platinum sign-up bonus take to post?", a: "Once you cross the $20,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:14.066Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/american-express-business-platinum-credit-card-amex/",
  },

  "amex-hilton-honors-70k": {
    summary: "The Amex Hilton Honors (No Fee) is currently offering 70,000 Hilton Honors after $2,000 in purchases within 6 months. There's no annual fee, which makes the 70,000 Hilton Honors bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $350 based on a 0.5¢ per-point valuation.",
    strategy: "To hit the $2,000 requirement in 6 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Hilton Honors (No Fee) until you've earned the 70,000 Hilton Honors bonus. Mind your issuer rules: Amex limits each card to one lifetime sign-up bonus per cardholder. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a 70,000 Hilton Honors bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "70,000 Hilton Honors sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "1 free night certificate",
    ],
    cons: [
      "Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's personal lineup, the closest comparison is the American Express Platinum (175,000 Membership Rewards after $8,000/6mo, $895 AF). The Amex Hilton Honors (No Fee) is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Amex Hilton Honors (No Fee) sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 70,000 Hilton Honors after spending $2,000 on purchases within 6 months of account opening." },
      { q: "What's the Amex Hilton Honors (No Fee) annual fee?", a: "There is no annual fee on the Amex Hilton Honors (No Fee)." },
      { q: "How are these hotel loyalty points valued?", a: "Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here." },
      { q: "How long does the Amex Hilton Honors (No Fee) sign-up bonus take to post?", a: "Once you cross the $2,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-business-platinum-200000-membership-rewards","citi-double-cash-200-cash"],
    verifiedAt: "2026-04-19T22:02:15.300Z",
    verifiedUrl: "https://www.americanexpress.com/en-us/credit-cards/apply/personal/partner/hil/hilton-honors-credit-card/ep-hil-27292",
  },

  "amex-marriott-bevy-175k": {
    summary: "The Amex Marriott Bonvoy Bevy is currently offering 175,000 Marriott Bonvoy after $5,000 in purchases within 6 months. It carries a $250 annual fee, with no first-year credits to soften it. Estimated net year-one value: $625 based on a 0.5¢ per-point valuation.",
    strategy: "To hit the $5,000 requirement in 6 months, you need about $834 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Marriott Bonvoy Bevy until you've earned the 175,000 Marriott Bonvoy bonus. Mind your issuer rules: Amex limits each card to one lifetime sign-up bonus per cardholder. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Cardholders who can fully use the 175,000 Marriott Bonvoy bonus, the $0 in credits, and any travel benefits — and who'd find the value even after the $250 annual fee.",
    pros: [
      "175,000 Marriott Bonvoy sign-up bonus",
      "Free night cert after $15k annual spend (up to 50k points)",
      "Gold Elite status",
    ],
    cons: [
      "$250 annual fee",
      "High $5,000 minimum spend can be hard to hit organically",
      "Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's personal lineup, the closest comparison is the American Express Platinum (175,000 Membership Rewards after $8,000/6mo, $895 AF). The Amex Marriott Bonvoy Bevy is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Amex Marriott Bonvoy Bevy sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 175,000 Marriott Bonvoy after spending $5,000 on purchases within 6 months of account opening." },
      { q: "What's the Amex Marriott Bonvoy Bevy annual fee?", a: "The annual fee is $250." },
      { q: "How are these hotel loyalty points valued?", a: "Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here." },
      { q: "How long does the Amex Marriott Bonvoy Bevy sign-up bonus take to post?", a: "Once you cross the $5,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-business-platinum-200000-membership-rewards"],
    verifiedAt: "2026-04-19T22:02:35.831Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-bevy/",
  },

  "amex-marriott-brilliant-200k": {
    summary: "The Amex Marriott Bonvoy Brilliant is currently offering 200,000 Marriott Bonvoy after $6,000 in purchases within 6 months. It carries a $650 annual fee, offset by roughly $300 in year-one statement credits. Estimated net year-one value: $650 based on a 0.5¢ per-point valuation.",
    strategy: "To hit the $6,000 requirement in 6 months, you need about $1,000 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Marriott Bonvoy Brilliant until you've earned the 200,000 Marriott Bonvoy bonus. Mind your issuer rules: Amex limits each card to one lifetime sign-up bonus per cardholder. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 200,000 Marriott Bonvoy bonus, the $300 in credits, and any travel benefits — and who'd find the value even after the $650 annual fee.",
    pros: [
      "200,000 Marriott Bonvoy sign-up bonus",
      "$300 in year-one statement credits",
      "Free night cert annually (up to 85k points)",
      "$300 Marriott Bonvoy credit",
    ],
    cons: [
      "$650 annual fee",
      "High $6,000 minimum spend can be hard to hit organically",
      "Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's personal lineup, the closest comparison is the American Express Platinum (175,000 Membership Rewards after $8,000/6mo, $895 AF). The Amex Marriott Bonvoy Brilliant is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Amex Marriott Bonvoy Brilliant sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 200,000 Marriott Bonvoy after spending $6,000 on purchases within 6 months of account opening." },
      { q: "What's the Amex Marriott Bonvoy Brilliant annual fee?", a: "The annual fee is $650. It is partially offset by approximately $300 in year-one statement credits." },
      { q: "How are these hotel loyalty points valued?", a: "Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here." },
      { q: "How long does the Amex Marriott Bonvoy Brilliant sign-up bonus take to post?", a: "Once you cross the $6,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-business-platinum-200000-membership-rewards"],
    verifiedAt: "2026-04-19T22:02:35.829Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/",
  },

  "amex-marriott-business-5nights": {
    summary: "The Amex Marriott Business is currently offering 250,000 Marriott Bonvoy after $9,000 in purchases within 6 months. It carries a $125 annual fee, with no first-year credits to soften it. Estimated net year-one value: $1,125 based on a 0.5¢ per-point valuation.",
    strategy: "To hit the $9,000 requirement in 6 months, you need about $1,500 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Amex Marriott Business until you've earned the 250,000 Marriott Bonvoy bonus. Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Self-employed or sole-proprietor users with at least $1,500/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.",
    pros: [
      "250,000 Marriott Bonvoy sign-up bonus",
      "5 free night certificates (up to 50k points each)",
      "Gold Elite status",
    ],
    cons: [
      "$125 annual fee",
      "High $9,000 minimum spend can be hard to hit organically",
      "Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's business lineup, the closest comparison is the Amex Business Platinum (200,000 Membership Rewards after $20,000/3mo, $895 AF). The Amex Marriott Business is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Amex Marriott Business sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 250,000 Marriott Bonvoy after spending $9,000 on purchases within 6 months of account opening." },
      { q: "What's the Amex Marriott Business annual fee?", a: "The annual fee is $125." },
      { q: "How are these hotel loyalty points valued?", a: "Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here." },
      { q: "How long does the Amex Marriott Business sign-up bonus take to post?", a: "Once you cross the $9,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["american-express-platinum-175000-membership-rewards","amex-business-platinum-200000-membership-rewards","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:02:37.714Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/amex-marriott-bonvoy-business-credit-card/",
  },

  "amex-platinum-175k": {
    summary: "The American Express Platinum is currently offering 175,000 Membership Rewards after $8,000 in purchases within 6 months. It carries a $895 annual fee, offset by roughly $1,200 in year-one statement credits. Estimated net year-one value: $2,055 based on a 1¢ per-point valuation.",
    strategy: "To hit the $8,000 requirement in 6 months, you need about $1,334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the American Express Platinum until you've earned the 175,000 Membership Rewards bonus. Mind your issuer rules: Amex limits each card to one lifetime sign-up bonus per cardholder. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 175,000 Membership Rewards bonus, the $1,200 in credits, and any travel benefits — and who'd find the value even after the $895 annual fee.",
    pros: [
      "175,000 Membership Rewards sign-up bonus",
      "$1,200 in year-one statement credits",
      "$600 hotel credit",
      "$400 Resy dining credit ($100/quarter)",
    ],
    cons: [
      "$895 annual fee",
      "High $8,000 minimum spend can be hard to hit organically",
      "Lifetime once-per-card SUB rule — one shot at this bonus",
    ],
    comparison: "Within Amex's personal lineup, the closest comparison is the Amex Hilton Honors (No Fee) (70,000 Hilton Honors after $2,000/6mo, $0 AF). The American Express Platinum is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current American Express Platinum sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 175,000 Membership Rewards after spending $8,000 on purchases within 6 months of account opening." },
      { q: "What's the American Express Platinum annual fee?", a: "The annual fee is $895. It is partially offset by approximately $1,200 in year-one statement credits." },
      { q: "How long does the American Express Platinum sign-up bonus take to post?", a: "Once you cross the $8,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["amex-business-platinum-200000-membership-rewards","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:14.114Z",
    verifiedUrl: "https://www.americanexpress.com/us/credit-cards/card/platinum/",
  },

  "barclays-jetblue-plus-75k": {
    summary: "The Barclays JetBlue Plus is currently offering 75,000 JetBlue TrueBlue after $1,000 in purchases within 3 months. It carries a $99 annual fee, with no first-year credits to soften it. Estimated net year-one value: $651 based on a 1¢ per-point valuation.",
    strategy: "To hit the $1,000 requirement in 3 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Barclays JetBlue Plus until you've earned the 75,000 JetBlue TrueBlue bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Cardholders who can fully use the 75,000 JetBlue TrueBlue bonus, the $0 in credits, and any travel benefits — and who'd find the value even after the $99 annual fee.",
    pros: [
      "75,000 JetBlue TrueBlue sign-up bonus",
      "Lowest min spend for a premium bonus ($1,000)",
      "6x on JetBlue purchases",
    ],
    cons: [
      "$99 annual fee",
    ],
    comparison: "Within Barclays's personal lineup, the closest comparison is the Barclays Upromise ($300 after $1,000/3mo, $0 AF). The Barclays JetBlue Plus is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Barclays JetBlue Plus sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 75,000 JetBlue TrueBlue after spending $1,000 on purchases within 3 months of account opening." },
      { q: "What's the Barclays JetBlue Plus annual fee?", a: "The annual fee is $99." },
      { q: "How long does the Barclays JetBlue Plus sign-up bonus take to post?", a: "Once you cross the $1,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["barclays-upromise-300-cash","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:03:07.546Z",
    verifiedUrl: "https://cards.barclaycardus.com/banking/cards/jetblue-plus-card/",
  },

  "barclays-upromise-300": {
    summary: "The Barclays Upromise is currently offering $300 after $1,000 in purchases within 3 months. There's no annual fee, which makes the $300 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $300 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,000 requirement in 3 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Barclays Upromise until you've earned the $300 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $300 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$300 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "1.25% cash back on everything",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Barclays's personal lineup, the closest comparison is the Barclays JetBlue Plus (75,000 JetBlue TrueBlue after $1,000/3mo, $99 AF). The Barclays Upromise is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Barclays Upromise sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $300 after spending $1,000 on purchases within 3 months of account opening." },
      { q: "What's the Barclays Upromise annual fee?", a: "There is no annual fee on the Barclays Upromise." },
      { q: "How long does the Barclays Upromise sign-up bonus take to post?", a: "Once you cross the $1,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["barclays-jetblue-plus-75000-jetblue-trueblue","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:03:00.703Z",
    verifiedUrl: "https://cards.barclaycardus.com/banking/cards/upromise-world-mastercard/",
  },

  "bofa-premium-rewards-60k": {
    summary: "The BofA Premium Rewards is currently offering 60,000 BofA points after $4,000 in purchases within 3 months. It carries a $95 annual fee, offset by roughly $100 in year-one statement credits. Estimated net year-one value: $605 based on a 1¢ per-point valuation.",
    strategy: "To hit the $4,000 requirement in 3 months, you need about $1,334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the BofA Premium Rewards until you've earned the 60,000 BofA points bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 60,000 BofA points bonus, the $100 in credits, and any travel benefits — and who'd find the value even after the $95 annual fee.",
    pros: [
      "60,000 BofA points sign-up bonus",
      "$100 in year-one statement credits",
      "$100 annual travel credit",
      "2x on travel and dining",
    ],
    cons: [
      "$95 annual fee",
      "High $4,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Within Bofa's personal lineup, the closest comparison is the BofA Unlimited Cash Rewards ($200 after $1,000/3mo, $0 AF). The BofA Premium Rewards is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current BofA Premium Rewards sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 60,000 BofA points after spending $4,000 on purchases within 3 months of account opening." },
      { q: "What's the BofA Premium Rewards annual fee?", a: "The annual fee is $95. It is partially offset by approximately $100 in year-one statement credits." },
      { q: "How long does the BofA Premium Rewards sign-up bonus take to post?", a: "Once you cross the $4,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["bofa-unlimited-cash-rewards-200-cash","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:02:55.708Z",
    verifiedUrl: "https://www.bankofamerica.com/credit-cards/products/premium-rewards-credit-card/",
  },

  "bofa-unlimited-cash-200": {
    summary: "The BofA Unlimited Cash Rewards is currently offering $200 after $1,000 in purchases within 3 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,000 requirement in 3 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the BofA Unlimited Cash Rewards until you've earned the $200 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "1.5% cash back on everything",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Bofa's personal lineup, the closest comparison is the BofA Premium Rewards (60,000 BofA points after $4,000/3mo, $95 AF). The BofA Unlimited Cash Rewards is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current BofA Unlimited Cash Rewards sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,000 on purchases within 3 months of account opening." },
      { q: "What's the BofA Unlimited Cash Rewards annual fee?", a: "There is no annual fee on the BofA Unlimited Cash Rewards." },
      { q: "How long does the BofA Unlimited Cash Rewards sign-up bonus take to post?", a: "Once you cross the $1,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["bofa-premium-rewards-60000-bofa-points","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:56.343Z",
    verifiedUrl: "https://www.bankofamerica.com/credit-cards/products/unlimited-cash-back-credit-card/",
  },

  "capital-one-spark-cash-1000": {
    summary: "The Capital One Spark Cash is currently offering $1,000 after $10,000 in purchases within 3 months. It carries a $95 annual fee (waived in year one), with no first-year credits to soften it. Estimated net year-one value: $905 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $10,000 requirement in 3 months, you need about $3,334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Capital One Spark Cash until you've earned the $1,000 bonus. Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Self-employed or sole-proprietor users with at least $3,334/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.",
    pros: [
      "$1,000 sign-up bonus",
      "Year-one annual fee waived ($95 thereafter)",
      "Annual fee waived first year",
      "2% cash back on every purchase",
    ],
    cons: [
      "$95 annual fee from year two onward",
      "High $10,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Within Capital-one's business lineup, the closest comparison is the Capital One Spark Cash Select ($750 after $6,000/3mo, $0 AF). The Capital One Spark Cash is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Capital One Spark Cash sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $1,000 after spending $10,000 on purchases within 3 months of account opening." },
      { q: "What's the Capital One Spark Cash annual fee?", a: "The annual fee is $95, waived for the first year." },
      { q: "How long does the Capital One Spark Cash sign-up bonus take to post?", a: "Once you cross the $10,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["capital-one-venture-75000-capital-one-miles","capital-one-spark-cash-select-750-cash","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:02:51.182Z",
    verifiedUrl: "https://www.capitalone.com/small-business/credit-cards/spark-cash/",
  },

  "capital-one-spark-cash-select-750": {
    summary: "The Capital One Spark Cash Select is currently offering $750 after $6,000 in purchases within 3 months. There's no annual fee, which makes the $750 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $750 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $6,000 requirement in 3 months, you need about $2,000 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Capital One Spark Cash Select until you've earned the $750 bonus. Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Self-employed or sole-proprietor users with at least $2,000/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.",
    pros: [
      "$750 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "1.5% cash back on every purchase",
    ],
    cons: [
      "High $6,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Within Capital-one's business lineup, the closest comparison is the Capital One Spark Cash ($1,000 after $10,000/3mo, $95 AF). The Capital One Spark Cash Select is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Capital One Spark Cash Select sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $750 after spending $6,000 on purchases within 3 months of account opening." },
      { q: "What's the Capital One Spark Cash Select annual fee?", a: "There is no annual fee on the Capital One Spark Cash Select." },
      { q: "How long does the Capital One Spark Cash Select sign-up bonus take to post?", a: "Once you cross the $6,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["capital-one-venture-75000-capital-one-miles","capital-one-spark-cash-1000-cash","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:51.049Z",
    verifiedUrl: "https://www.capitalone.com/small-business/credit-cards/spark-cash-select/",
  },

  "capital-one-venture-75k": {
    summary: "The Capital One Venture is currently offering 75,000 Capital One miles after $4,000 in purchases within 3 months. It carries a $95 annual fee, offset by roughly $250 in year-one statement credits. Estimated net year-one value: $905 based on a 1¢ per-point valuation.",
    strategy: "To hit the $4,000 requirement in 3 months, you need about $1,334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Capital One Venture until you've earned the 75,000 Capital One miles bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 75,000 Capital One miles bonus, the $250 in credits, and any travel benefits — and who'd find the value even after the $95 annual fee.",
    pros: [
      "75,000 Capital One miles sign-up bonus",
      "$250 in year-one statement credits",
      "$250 Capital One Travel credit (year 1)",
      "2x miles on every purchase",
    ],
    cons: [
      "$95 annual fee",
      "High $4,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Among Capital-one personal cards in our catalog, the Capital One Venture is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.",
    faqs: [
      { q: "What's the current Capital One Venture sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 75,000 Capital One miles after spending $4,000 on purchases within 3 months of account opening." },
      { q: "What's the Capital One Venture annual fee?", a: "The annual fee is $95. It is partially offset by approximately $250 in year-one statement credits." },
      { q: "How long does the Capital One Venture sign-up bonus take to post?", a: "Once you cross the $4,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["capital-one-spark-cash-select-750-cash","capital-one-spark-cash-1000-cash","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:02:48.873Z",
    verifiedUrl: "https://www.capitalone.com/credit-cards/venture/",
  },

  "chase-ink-business-preferred-100k": {
    summary: "The Chase Ink Business Preferred is currently offering 100,000 Ultimate Rewards after $8,000 in purchases within 3 months. It carries a $95 annual fee, with no first-year credits to soften it. Estimated net year-one value: $905 based on a 1¢ per-point valuation.",
    strategy: "To hit the $8,000 requirement in 3 months, you need about $2,667 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Chase Ink Business Preferred until you've earned the 100,000 Ultimate Rewards bonus. Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Self-employed or sole-proprietor users with at least $2,667/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.",
    pros: [
      "100,000 Ultimate Rewards sign-up bonus",
      "3x on travel, shipping, internet, phone, advertising",
      "Points transfer to airline/hotel partners",
    ],
    cons: [
      "$95 annual fee",
      "High $8,000 minimum spend can be hard to hit organically",
      "Subject to Chase 5/24 — counts against your personal card velocity",
    ],
    comparison: "Among Chase business cards in our catalog, the Chase Ink Business Preferred is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.",
    faqs: [
      { q: "What's the current Chase Ink Business Preferred sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 100,000 Ultimate Rewards after spending $8,000 on purchases within 3 months of account opening." },
      { q: "What's the Chase Ink Business Preferred annual fee?", a: "The annual fee is $95." },
      { q: "Does the Chase 5/24 rule apply to this card?", a: "Chase business cards count *against* 5/24 (i.e. they will deny you if you're over 5/24), but they do not *add to* your 5/24 count once approved. So a successful approval here doesn't burn a personal-card slot." },
      { q: "How long does the Chase Ink Business Preferred sign-up bonus take to post?", a: "Once you cross the $8,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["chase-sapphire-reserve-125000-ultimate-rewards","chase-ihg-rewards-premier-175000-ihg-rewards","amex-marriott-business-250000-marriott-bonvoy"],
    verifiedAt: "2026-04-19T22:02:02.692Z",
    verifiedUrl: "https://creditcards.chase.com/business-credit-cards/ink/business-preferred",
  },

  "chase-sapphire-reserve-125k": {
    summary: "The Chase Sapphire Reserve is currently offering 125,000 Ultimate Rewards after $6,000 in purchases within 3 months. It carries a $795 annual fee, offset by roughly $300 in year-one statement credits. Estimated net year-one value: $755 based on a 1¢ per-point valuation.",
    strategy: "To hit the $6,000 requirement in 3 months, you need about $2,000 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Chase Sapphire Reserve until you've earned the 125,000 Ultimate Rewards bonus. Mind your issuer rules: Chase will deny this if you've opened 5+ personal cards in the last 24 months. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 125,000 Ultimate Rewards bonus, the $300 in credits, and any travel benefits — and who'd find the value even after the $795 annual fee.",
    pros: [
      "125,000 Ultimate Rewards sign-up bonus",
      "$300 in year-one statement credits",
      "$300 annual travel credit",
      "$300 dining credit (Sapphire Reserve Tables)",
    ],
    cons: [
      "$795 annual fee",
      "High $6,000 minimum spend can be hard to hit organically",
      "Subject to Chase 5/24 — counts against your personal card velocity",
    ],
    comparison: "Within Chase's personal lineup, the closest comparison is the Chase IHG Rewards Premier (175,000 IHG Rewards after $5,000/3mo, $99 AF). The Chase Sapphire Reserve is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Chase Sapphire Reserve sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 125,000 Ultimate Rewards after spending $6,000 on purchases within 3 months of account opening." },
      { q: "What's the Chase Sapphire Reserve annual fee?", a: "The annual fee is $795. It is partially offset by approximately $300 in year-one statement credits." },
      { q: "Does the Chase 5/24 rule apply to this card?", a: "Yes. If you've opened five or more personal credit cards in the last 24 months, Chase will auto-deny this application regardless of credit score." },
      { q: "How long does the Chase Sapphire Reserve sign-up bonus take to post?", a: "Once you cross the $6,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["chase-ink-business-preferred-100000-ultimate-rewards","chase-ihg-rewards-premier-175000-ihg-rewards"],
    verifiedAt: "2026-04-19T22:02:03.651Z",
    verifiedUrl: "https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve",
  },

  "chase-united-explorer-85k": {
    summary: "The Chase United Explorer is currently offering 85,000 United MileagePlus after $3,000 in purchases within 3 months. It carries a $150 annual fee (waived in year one), with no first-year credits to soften it. Estimated net year-one value: $700 based on a 1¢ per-point valuation.",
    strategy: "To hit the $3,000 requirement in 3 months, you need about $1,000 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Chase United Explorer until you've earned the 85,000 United MileagePlus bonus. Mind your issuer rules: Chase will deny this if you've opened 5+ personal cards in the last 24 months. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Cardholders who can fully use the 85,000 United MileagePlus bonus, the $0 in credits, and any travel benefits — and who'd find the value even after the $150 annual fee.",
    pros: [
      "85,000 United MileagePlus sign-up bonus",
      "Year-one annual fee waived ($150 thereafter)",
      "Annual fee waived first year",
      "$120 Global Entry/TSA PreCheck credit",
    ],
    cons: [
      "$150 annual fee from year two onward",
      "Subject to Chase 5/24 — counts against your personal card velocity",
    ],
    comparison: "Within Chase's personal lineup, the closest comparison is the Chase Sapphire Reserve (125,000 Ultimate Rewards after $6,000/3mo, $795 AF). The Chase United Explorer is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Chase United Explorer sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 85,000 United MileagePlus after spending $3,000 on purchases within 3 months of account opening." },
      { q: "What's the Chase United Explorer annual fee?", a: "The annual fee is $150, waived for the first year." },
      { q: "Does the Chase 5/24 rule apply to this card?", a: "Yes. If you've opened five or more personal credit cards in the last 24 months, Chase will auto-deny this application regardless of credit score." },
      { q: "How long does the Chase United Explorer sign-up bonus take to post?", a: "Once you cross the $3,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["chase-sapphire-reserve-125000-ultimate-rewards","chase-ink-business-preferred-100000-ultimate-rewards","amex-hilton-surpass-130000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:01.962Z",
    verifiedUrl: "https://www.theexplorercard.com/united-rewards-cards/explorer-card",
  },

  "citi-custom-cash-200": {
    summary: "The Citi Custom Cash is currently offering $200 after $1,500 in purchases within 6 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,500 requirement in 6 months, you need about $250 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Citi Custom Cash until you've earned the $200 bonus. Mind your issuer rules: Citi enforces an 8/65 rule plus 24-/48-month bonus restrictions on the same family. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "5% on top spending category (up to $500/month)",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Citi's personal lineup, the closest comparison is the Citi Strata Elite (100,000 ThankYou Points after $6,000/3mo, $595 AF). The Citi Custom Cash is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Citi Custom Cash sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,500 on purchases within 6 months of account opening." },
      { q: "What's the Citi Custom Cash annual fee?", a: "There is no annual fee on the Citi Custom Cash." },
      { q: "How long does the Citi Custom Cash sign-up bonus take to post?", a: "Once you cross the $1,500 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["citi-strata-elite-100000-thankyou-points","citi-double-cash-200-cash","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:56.901Z",
    verifiedUrl: "https://www.citi.com/credit-cards/citi-custom-cash-credit-card?pdp=new_cc",
  },

  "citi-double-cash-200": {
    summary: "The Citi Double Cash is currently offering $200 after $1,500 in purchases within 6 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,500 requirement in 6 months, you need about $250 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Citi Double Cash until you've earned the $200 bonus. Mind your issuer rules: Citi enforces an 8/65 rule plus 24-/48-month bonus restrictions on the same family. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "2% on everything (1% on purchase + 1% on payment)",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Citi's personal lineup, the closest comparison is the Citi Strata Elite (100,000 ThankYou Points after $6,000/3mo, $595 AF). The Citi Double Cash is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Citi Double Cash sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,500 on purchases within 6 months of account opening." },
      { q: "What's the Citi Double Cash annual fee?", a: "There is no annual fee on the Citi Double Cash." },
      { q: "How long does the Citi Double Cash sign-up bonus take to post?", a: "Once you cross the $1,500 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["citi-strata-elite-100000-thankyou-points","citi-custom-cash-200-cash","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:48.101Z",
    verifiedUrl: "https://www.citi.com/credit-cards/citi-double-cash-credit-card",
  },

  "citi-strata-elite-100k": {
    summary: "The Citi Strata Elite is currently offering 100,000 ThankYou Points after $6,000 in purchases within 3 months. It carries a $595 annual fee, offset by roughly $500 in year-one statement credits. Estimated net year-one value: $905 based on a 1¢ per-point valuation.",
    strategy: "To hit the $6,000 requirement in 3 months, you need about $2,000 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Citi Strata Elite until you've earned the 100,000 ThankYou Points bonus. Mind your issuer rules: Citi enforces an 8/65 rule plus 24-/48-month bonus restrictions on the same family. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 100,000 ThankYou Points bonus, the $500 in credits, and any travel benefits — and who'd find the value even after the $595 annual fee.",
    pros: [
      "100,000 ThankYou Points sign-up bonus",
      "$500 in year-one statement credits",
      "$300 annual hotel credit",
      "$200 annual Splurge credit",
    ],
    cons: [
      "$595 annual fee",
      "High $6,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Within Citi's personal lineup, the closest comparison is the Citi Double Cash ($200 after $1,500/6mo, $0 AF). The Citi Strata Elite is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Citi Strata Elite sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 100,000 ThankYou Points after spending $6,000 on purchases within 3 months of account opening." },
      { q: "What's the Citi Strata Elite annual fee?", a: "The annual fee is $595. It is partially offset by approximately $500 in year-one statement credits." },
      { q: "How long does the Citi Strata Elite sign-up bonus take to post?", a: "Once you cross the $6,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["citi-double-cash-200-cash","citi-custom-cash-200-cash","amex-hilton-aspire-175000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:46.761Z",
    verifiedUrl: "https://www.citi.com/credit-cards/citi-strata-elite-credit-card",
  },

  "discover-it-100-double": {
    summary: "The Discover it Cash Back is currently offering $100 after $0 in purchases within 1 months. There's no annual fee, which makes the $100 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $100 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $0 requirement in 1 months, you need about $0 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Discover it Cash Back until you've earned the $100 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $100 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$100 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "$100 referral bonus",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Among Discover personal cards in our catalog, the Discover it Cash Back is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.",
    faqs: [
      { q: "What's the current Discover it Cash Back sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $100 after spending $0 on purchases within 1 months of account opening." },
      { q: "What's the Discover it Cash Back annual fee?", a: "There is no annual fee on the Discover it Cash Back." },
      { q: "How long does the Discover it Cash Back sign-up bonus take to post?", a: "Once you cross the $0 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:03:18.538Z",
    verifiedUrl: "https://www.discover.com/credit-cards/cash-back/it-card.html",
  },

  "sofi-credit-card-200": {
    summary: "The SoFi Credit Card is currently offering $200 after $1,500 in purchases within 3 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,500 requirement in 3 months, you need about $500 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the SoFi Credit Card until you've earned the $200 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "2% cash back on everything",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Among Sofi personal cards in our catalog, the SoFi Credit Card is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.",
    faqs: [
      { q: "What's the current SoFi Credit Card sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,500 on purchases within 3 months of account opening." },
      { q: "What's the SoFi Credit Card annual fee?", a: "There is no annual fee on the SoFi Credit Card." },
      { q: "How long does the SoFi Credit Card sign-up bonus take to post?", a: "Once you cross the $1,500 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:03:13.373Z",
    verifiedUrl: "https://www.sofi.com/credit-card/",
  },

  "usb-altitude-connect-300": {
    summary: "The U.S. Bank Altitude Connect is currently offering $300 after $1,000 in purchases within 3 months. There's no annual fee, which makes the $300 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $300 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,000 requirement in 3 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the U.S. Bank Altitude Connect until you've earned the $300 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $300 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$300 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "4x on travel and gas, 2x on dining/streaming/groceries",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Us-bank's personal lineup, the closest comparison is the U.S. Bank Cash+ ($200 after $1,000/3mo, $0 AF). The U.S. Bank Altitude Connect is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current U.S. Bank Altitude Connect sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $300 after spending $1,000 on purchases within 3 months of account opening." },
      { q: "What's the U.S. Bank Altitude Connect annual fee?", a: "There is no annual fee on the U.S. Bank Altitude Connect." },
      { q: "How long does the U.S. Bank Altitude Connect sign-up bonus take to post?", a: "Once you cross the $1,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["u-s-bank-cash-200-cash","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:03:10.034Z",
    verifiedUrl: "https://www.usbank.com/credit-cards/altitude-connect-visa-signature-credit-card.html",
  },

  "usb-cash-plus-200": {
    summary: "The U.S. Bank Cash+ is currently offering $200 after $1,000 in purchases within 3 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,000 requirement in 3 months, you need about $334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the U.S. Bank Cash+ until you've earned the $200 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "5% on 2 categories you choose (up to $2k/quarter)",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Us-bank's personal lineup, the closest comparison is the U.S. Bank Altitude Connect ($300 after $1,000/3mo, $0 AF). The U.S. Bank Cash+ is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current U.S. Bank Cash+ sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,000 on purchases within 3 months of account opening." },
      { q: "What's the U.S. Bank Cash+ annual fee?", a: "There is no annual fee on the U.S. Bank Cash+." },
      { q: "How long does the U.S. Bank Cash+ sign-up bonus take to post?", a: "Once you cross the $1,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["u-s-bank-altitude-connect-300-cash","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:03:11.008Z",
    verifiedUrl: "https://www.usbank.com/credit-cards/cash-plus-visa-signature-credit-card.html",
  },

  "wf-active-cash-200": {
    summary: "The Wells Fargo Active Cash is currently offering $200 after $1,500 in purchases within 6 months. There's no annual fee, which makes the $200 bonus close to pure profit if you can hit the spend organically. Estimated net year-one value: $200 based on a 100.0¢ per-point valuation.",
    strategy: "To hit the $1,500 requirement in 6 months, you need about $250 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Wells Fargo Active Cash until you've earned the $200 bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.",
    bestFor: "Anyone with steady monthly spend who wants a $200 bonus with no annual-fee drag and no requirement to \"make the math work\" on a fee.",
    pros: [
      "$200 sign-up bonus",
      "$0 annual fee",
      "No annual fee",
      "2% cash back on everything",
    ],
    cons: [
      "Issuer may change SUB or requirements at any time — verify before applying",
    ],
    comparison: "Within Wells-fargo's personal lineup, the closest comparison is the Wells Fargo Autograph Journey (60,000 Wells Fargo Rewards after $4,000/3mo, $95 AF). The Wells Fargo Active Cash is the right pick when you value a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card.",
    faqs: [
      { q: "What's the current Wells Fargo Active Cash sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is $200 after spending $1,500 on purchases within 6 months of account opening." },
      { q: "What's the Wells Fargo Active Cash annual fee?", a: "There is no annual fee on the Wells Fargo Active Cash." },
      { q: "How long does the Wells Fargo Active Cash sign-up bonus take to post?", a: "Once you cross the $1,500 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["wells-fargo-autograph-journey-60000-wells-fargo-rewards","amex-hilton-honors-no-fee-70000-hilton-honors"],
    verifiedAt: "2026-04-19T22:02:59.376Z",
    verifiedUrl: "https://creditcards.wellsfargo.com/active-cash-credit-card/?sub_channel=WEB&vendor_code=WF&lp_cx_nm=CXNAME_CSMPD_CG",
  },

  "wf-autograph-journey-60k": {
    summary: "The Wells Fargo Autograph Journey is currently offering 60,000 Wells Fargo Rewards after $4,000 in purchases within 3 months. It carries a $95 annual fee, offset by roughly $50 in year-one statement credits. Estimated net year-one value: $555 based on a 1¢ per-point valuation.",
    strategy: "To hit the $4,000 requirement in 3 months, you need about $1,334 per month in organic spend on this card. Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the Wells Fargo Autograph Journey until you've earned the 60,000 Wells Fargo Rewards bonus. Mind your issuer rules: check the issuer's velocity rules before applying. Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.",
    bestFor: "Cardholders who can fully use the 60,000 Wells Fargo Rewards bonus, the $50 in credits, and any travel benefits — and who'd find the value even after the $95 annual fee.",
    pros: [
      "60,000 Wells Fargo Rewards sign-up bonus",
      "$50 in year-one statement credits",
      "$50 annual airline credit",
      "5x on hotels, 4x on airlines, 3x on dining",
    ],
    cons: [
      "$95 annual fee",
      "High $4,000 minimum spend can be hard to hit organically",
    ],
    comparison: "Within Wells-fargo's personal lineup, the closest comparison is the Wells Fargo Active Cash ($200 after $1,500/6mo, $0 AF). The Wells Fargo Autograph Journey is the right pick when you value premium benefits and credits over a no-fee structure.",
    faqs: [
      { q: "What's the current Wells Fargo Autograph Journey sign-up bonus?", a: "As verified directly from the issuer offer page, the current bonus is 60,000 Wells Fargo Rewards after spending $4,000 on purchases within 3 months of account opening." },
      { q: "What's the Wells Fargo Autograph Journey annual fee?", a: "The annual fee is $95. It is partially offset by approximately $50 in year-one statement credits." },
      { q: "How long does the Wells Fargo Autograph Journey sign-up bonus take to post?", a: "Once you cross the $4,000 spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline." },
    ],
    relatedSlugs: ["wells-fargo-active-cash-200-cash","chase-ink-business-preferred-100000-ultimate-rewards"],
    verifiedAt: "2026-04-19T22:02:59.386Z",
    verifiedUrl: "https://creditcards.wellsfargo.com/autograph-journey-visa-credit-card/?sub_channel=WEB&vendor_code=WF&lp_cx_nm=CXNAME_CSMPD_CG",
  },
}
