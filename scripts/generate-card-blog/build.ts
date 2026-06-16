/* eslint-disable no-console */
/**
 * Pure templating for card blog content — no Playwright, no I/O.
 *
 * Extracted from run.ts so other tooling (e.g. the drift re-sync that keeps
 * cardBlogContent prose in lockstep with the structured catalog) can reuse
 * buildEntry() and stringifyEntry() without dragging in the browser-fetch deps.
 */
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

export type GeneratedEntry = {
  summary: string
  strategy: string
  bestFor: string
  pros: string[]
  cons: string[]
  comparison: string
  faqs: { q: string; a: string }[]
  relatedSlugs: string[]
  verifiedAt: string
  verifiedUrl: string
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

function bonusLabel(c: CreditCardBonus): string {
  return c.bonus_currency === "cash"
    ? `$${c.bonus_amount.toLocaleString()}`
    : `${c.bonus_amount.toLocaleString()} ${c.bonus_currency}`
}

function approxSubValue(c: CreditCardBonus): number {
  return c.bonus_currency === "cash"
    ? c.bonus_amount
    : Math.round(c.bonus_amount * (c.cpp_value ?? 0.01))
}

// Reward category keys in the catalog are machine slugs (gas_stations,
// airfare_(portal), all_other). Render them as human copy so pros lists
// don't leak raw keys like "5x on gas_stations".
const CATEGORY_LABELS: Record<string, string> = {
  all_other: "all other purchases",
  everything_else: "all other purchases",
  "specified_store(s)": "select stores",
  ev_charging: "EV charging",
  gas_stations: "gas stations",
  monthly_categories: "monthly bonus categories",
  quarterly_categories: "rotating quarterly categories",
  selected_categories: "select categories",
  streaming_services: "streaming services",
  toll_fees: "tolls",
  special: "select purchases",
  capital_one_travel_hotels: "hotels booked via Capital One Travel",
  capital_one_travel_rental_cars: "rental cars via Capital One Travel",
}
function humanizeCategory(key: string): string {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key]
  return key.replace(/_\(portal\)/g, " (travel portal)").replace(/_/g, " ")
}
function humanizeCategories(cats: string[]): string {
  return cats.map(humanizeCategory).join(", ")
}
// A cash-back card earns a percentage; a points card earns a multiplier.
function rewardUnit(c: CreditCardBonus, unit: string | undefined): string {
  return unit === "%" || c.bonus_currency === "cash" ? "%" : "x"
}

function pickRelatedSlugs(c: CreditCardBonus): string[] {
  // Pick 2-3 other cards that overlap on issuer or share a top reward category.
  const sameIssuer = creditCardBonuses
    .filter(o => o.id !== c.id && !o.expired && o.issuer === c.issuer)
    .slice(0, 2)
  const out = new Set<string>(sameIssuer.map(o => slugifyForCard(o)))
  // Add one same-AF-band card from a different issuer for context.
  const counterpart = creditCardBonuses
    .find(o => o.id !== c.id && !o.expired && o.issuer !== c.issuer && Math.abs((o.annual_fee ?? 0) - (c.annual_fee ?? 0)) < 50)
  if (counterpart) out.add(slugifyForCard(counterpart))
  return Array.from(out).slice(0, 3)
}

function slugifyForCard(c: CreditCardBonus): string {
  return `${c.card_name}-${c.bonus_amount}-${c.bonus_currency}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function buildEntry(c: CreditCardBonus, verifiedUrl: string, verifiedAt: string): GeneratedEntry {
  const sub = bonusLabel(c)
  const subValue = approxSubValue(c)
  const netY1 = subValue + (c.statement_credits_year1 ?? 0) - (c.annual_fee ?? 0)
  const issuerCap = c.issuer.charAt(0).toUpperCase() + c.issuer.slice(1)
  const isBusiness = c.card_type === "business"
  const hasAF = (c.annual_fee ?? 0) > 0
  const hasCredits = (c.statement_credits_year1 ?? 0) > 0
  const monthlySpend = Math.ceil(c.min_spend / Math.max(1, c.spend_months))

  const summary = [
    `The ${c.card_name} is currently offering ${sub} after ${fmtMoney(c.min_spend)} in purchases within ${c.spend_months} months.`,
    hasAF
      ? `It carries a $${c.annual_fee} annual fee${c.annual_fee_waived_first_year ? " (waived in year one)" : ""}, ${hasCredits ? `offset by roughly $${(c.statement_credits_year1 ?? 0).toLocaleString()} in year-one statement credits` : "with no first-year credits to soften it"}.`
      : `There's no annual fee, which makes the ${sub} bonus close to pure profit if you can hit the spend organically.`,
    c.bonus_currency === "cash"
      ? `Estimated net year-one value: ${fmtMoney(netY1)} — the bonus is cash back, valued at face.`
      : `Estimated net year-one value: ${fmtMoney(netY1)} based on a ${(c.cpp_value ?? 0.01) === 0.01 ? "1¢" : `${((c.cpp_value ?? 0.01) * 100).toFixed(1)}¢`} per-point valuation.`,
  ].join(" ")

  const strategy = [
    `To hit the ${fmtMoney(c.min_spend)} requirement in ${c.spend_months} months, you need about ${fmtMoney(monthlySpend)} per month in organic spend on this card.`,
    `Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the ${c.card_name} until you've earned the ${sub} bonus.`,
    isBusiness
      ? "Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase."
      : `Mind your issuer rules: ${c.issuer === "chase" ? "Chase will deny this if you've opened 5+ personal cards in the last 24 months" : c.issuer === "amex" ? "Amex limits each card to one lifetime sign-up bonus per cardholder" : c.issuer === "capital one" ? "Capital One typically allows only one new personal card every 6 months" : c.issuer === "citi" ? "Citi enforces an 8/65 rule plus 24-/48-month bonus restrictions on the same family" : "check the issuer's velocity rules before applying"}.`,
    hasCredits
      ? `Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.`
      : hasAF
        ? `Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.`
        : `With no annual fee there's nothing to cancel for — keep it open after the bonus posts so the account keeps aging your average credit history.`,
  ].join(" ")

  const bestFor = isBusiness
    ? `Self-employed or sole-proprietor users with at least ${fmtMoney(monthlySpend)}/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.`
    : hasAF
      ? `Cardholders who can fully use the ${sub} bonus, the ${fmtMoney(c.statement_credits_year1 ?? 0)} in credits, and any travel benefits — and who'd find the value even after the $${c.annual_fee} annual fee.`
      : `Anyone with steady monthly spend who wants a ${sub} bonus with no annual-fee drag and no requirement to "make the math work" on a fee.`

  const pros: string[] = []
  pros.push(`${sub} sign-up bonus`)
  if (!hasAF) pros.push("$0 annual fee")
  else if (c.annual_fee_waived_first_year) pros.push(`Year-one annual fee waived ($${c.annual_fee} thereafter)`)
  if (hasCredits) pros.push(`${fmtMoney(c.statement_credits_year1 ?? 0)} in year-one statement credits`)
  if (c.rewards && c.rewards.length > 0) {
    const top = [...c.rewards].sort((a, b) => b.multiplier - a.multiplier)[0]
    pros.push(`${top.multiplier}${rewardUnit(c, top.unit)} on ${humanizeCategories(top.categories)}`)
  }
  if (c.key_benefits && c.key_benefits.length > 0) {
    for (const kb of c.key_benefits.slice(0, 2)) pros.push(kb)
  }

  const cons: string[] = []
  if (hasAF) cons.push(`$${c.annual_fee} annual fee${c.annual_fee_waived_first_year ? " from year two onward" : ""}`)
  if (c.min_spend >= 4000) cons.push(`High ${fmtMoney(c.min_spend)} minimum spend can be hard to hit organically`)
  if (c.is_hotel_card) cons.push("Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies")
  if (c.issuer === "chase") cons.push(isBusiness
    ? "Chase 5/24 applies to approval (you'll be denied if over 5/24) — but once approved it does not add to your 5/24 count"
    : "Subject to Chase 5/24 — both counts against and adds to your personal card velocity")
  if (c.issuer === "amex") cons.push("Lifetime once-per-card SUB rule — one shot at this bonus")
  if (cons.length === 0) cons.push("Issuer may change SUB or requirements at any time — verify before applying")

  const comparison = (() => {
    const peers = creditCardBonuses
      .filter(o => o.id !== c.id && o.card_name !== c.card_name && !o.expired && o.issuer === c.issuer && o.card_type === c.card_type)
    if (peers.length === 0) {
      return `Among ${issuerCap} ${isBusiness ? "business" : "personal"} cards in our catalog, the ${c.card_name} is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.`
    }
    const peer = peers[0]
    return `Within ${issuerCap}'s ${isBusiness ? "business" : "personal"} lineup, the closest comparison is the ${peer.card_name} (${bonusLabel(peer)} after ${fmtMoney(peer.min_spend)}/${peer.spend_months}mo, $${peer.annual_fee} AF). The ${c.card_name} is the right pick when you value ${hasAF ? "premium benefits and credits over a no-fee structure" : "a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card"}.`
  })()

  const faqs: { q: string; a: string }[] = []
  faqs.push({
    q: `What's the current ${c.card_name} sign-up bonus?`,
    a: `The current bonus is ${sub} after spending ${fmtMoney(c.min_spend)} on purchases within ${c.spend_months} months of account opening. Offers change often — confirm the live terms on the issuer's page before applying.`,
  })
  faqs.push({
    q: `What's the ${c.card_name} annual fee?`,
    a: hasAF
      ? `The annual fee is $${c.annual_fee}${c.annual_fee_waived_first_year ? ", waived for the first year" : ""}.${hasCredits ? ` It is partially offset by approximately $${(c.statement_credits_year1 ?? 0).toLocaleString()} in year-one statement credits.` : ""}`
      : `There is no annual fee on the ${c.card_name}.`,
  })
  if (c.issuer === "chase") {
    faqs.push({
      q: "Does the Chase 5/24 rule apply to this card?",
      a: isBusiness
        ? `Chase business cards count *against* 5/24 (i.e. they will deny you if you're over 5/24), but they do not *add to* your 5/24 count once approved. So a successful approval here doesn't burn a personal-card slot.`
        : `Yes. If you've opened five or more personal credit cards in the last 24 months, Chase will auto-deny this application regardless of credit score.`,
    })
  }
  if (c.is_hotel_card) {
    faqs.push({
      q: "How are these hotel loyalty points valued?",
      a: `Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here.`,
    })
  }
  faqs.push({
    q: `How long does the ${c.card_name} sign-up bonus take to post?`,
    a: `Once you cross the ${fmtMoney(c.min_spend)} spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline.`,
  })

  return {
    summary,
    strategy,
    bestFor,
    pros,
    cons,
    comparison,
    faqs,
    relatedSlugs: pickRelatedSlugs(c),
    verifiedAt,
    verifiedUrl,
  }
}

export function stringifyEntry(id: string, e: GeneratedEntry): string {
  // Hand-formatted to match the look of the existing cardBlogContent.ts file.
  const lines: string[] = []
  lines.push(`  ${JSON.stringify(id)}: {`)
  lines.push(`    summary: ${JSON.stringify(e.summary)},`)
  lines.push(`    strategy: ${JSON.stringify(e.strategy)},`)
  lines.push(`    bestFor: ${JSON.stringify(e.bestFor)},`)
  lines.push(`    pros: [`)
  for (const p of e.pros) lines.push(`      ${JSON.stringify(p)},`)
  lines.push(`    ],`)
  lines.push(`    cons: [`)
  for (const c of e.cons) lines.push(`      ${JSON.stringify(c)},`)
  lines.push(`    ],`)
  lines.push(`    comparison: ${JSON.stringify(e.comparison)},`)
  lines.push(`    faqs: [`)
  for (const f of e.faqs) {
    lines.push(`      { q: ${JSON.stringify(f.q)}, a: ${JSON.stringify(f.a)} },`)
  }
  lines.push(`    ],`)
  lines.push(`    relatedSlugs: ${JSON.stringify(e.relatedSlugs)},`)
  lines.push(`    verifiedAt: ${JSON.stringify(e.verifiedAt)},`)
  lines.push(`    verifiedUrl: ${JSON.stringify(e.verifiedUrl)},`)
  lines.push(`  },`)
  return lines.join("\n")
}
