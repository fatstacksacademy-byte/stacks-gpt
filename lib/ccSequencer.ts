/**
 * Credit card bonus sequencer — orders cards by return on spend.
 *
 * Valuation: 1 cpp for general/airline points, 0.5 cpp for hotel points.
 * Net value = (bonus * cpp) + statement_credits_year1 + benefits - annual_fee
 * Return per month = net_value / months_to_complete
 * months_to_complete = min_spend / monthly_budget (capped at spend_months)
 *
 * Each card now returns a value_breakdown showing the components so the UI
 * can explain *why* a card is recommended (welcome bonus vs benefits vs AF).
 */

import { CreditCardBonus } from "./data/creditCardBonuses"
import { signupBonusValue } from "./data/cardSpendValue"
import { transferKind, travelTransferCpp } from "./data/travelValue"
import { getTravelCpp } from "./travelCpp"
import {
  DEFAULT_BENEFIT_PROFILE,
  valueOfBenefits,
  type UserBenefitProfile,
  type CardBenefit,
} from "./cardBenefits"
import { evaluateIssuer, normalizeIssuer, type HeldCard } from "./issuerRules"

export type ValueBreakdown = {
  welcome_bonus: number       // bonus_amount × cpp
  statement_credits: number   // statement_credits_year1 (existing flat field)
  benefits_value: number      // sum of CardBenefit annualValues the user would use
  annual_fee: number          // negative or 0 if waived year 1
  included_benefits: CardBenefit[]
  excluded_benefits: CardBenefit[]
}

export type SequencedCard = {
  card: CreditCardBonus
  net_value: number
  months_to_complete: number
  return_per_month: number
  return_on_spend: number
  cumulative_value: number
  cumulative_months: number
  value_breakdown: ValueBreakdown
}

export type CardRankingMode = "return_per_month" | "max_bonus" | "return_on_spend"

/** Default cap on credit card applications per year. 4 ≈ one every 90 days,
 *  the rough churning consensus for keeping new-account inquiries under
 *  control without tripping issuer velocity rules. Each card application
 *  also dings the credit score temporarily, so spreading them out matters. */
export const DEFAULT_MAX_CARDS_PER_YEAR = 4

export function sequenceCards(
  cards: CreditCardBonus[],
  monthlyBudget: number,
  userState?: string | null,
  maxCardsPerYear: number = DEFAULT_MAX_CARDS_PER_YEAR,
  /** Travel Mode: when true, use TRAVEL_CPP valuations (with optional
   *  per-currency overrides) instead of the catalog's cash-floor cpp.
   *  Affects net_value + return_per_month only — sort, spacing, and
   *  feasibility math unchanged so Cash Mode is bit-for-bit untouched. */
  useTravelCpp: boolean = false,
  cppOverrides?: Record<string, number> | null,
  /** When false, hide USAA / Navy Federal / AAFES military-only cards. */
  militaryAffiliated: boolean = false,
  /** User benefit usage profile. Drives per-card benefits value math.
   *  Defaults to DEFAULT_BENEFIT_PROFILE if null/undefined. */
  benefitProfile: UserBenefitProfile | null = null,
  /** Ranking lens. Defaults to the legacy return-per-month behavior. */
  rankingMode: CardRankingMode = "return_per_month",
  /** In Travel Mode, optionally keep only cards whose currency reaches this program. */
  targetTravelProgram?: string | null,
  /** Opt-in approval awareness: when the user's held cards are provided, drop
   *  cards from issuers that are a hard "deny" right now (e.g. every Chase card
   *  while you're at 5/24, Amex during a 2/90 window). Omit to leave sequencing
   *  bit-for-bit unchanged — no caller is affected until they pass this. */
  eligibility?: { heldCards: HeldCard[]; asOf: string } | null,
): SequencedCard[] {
  const profile = benefitProfile ?? DEFAULT_BENEFIT_PROFILE

  // Issuers the user is hard-blocked with right now, computed once per distinct
  // catalog issuer (not per card). Empty unless eligibility + held cards given.
  const blockedIssuers = new Set<string>()
  if (eligibility && eligibility.heldCards.length > 0) {
    for (const slug of new Set(cards.map(c => normalizeIssuer(c.issuer)))) {
      if (slug && evaluateIssuer(slug, eligibility.heldCards, null, eligibility.asOf).verdict === "deny") {
        blockedIssuers.add(slug)
      }
    }
  }
  // Exclude cards with no actionable apply link — recommending them would
  // be misleading (the user has nowhere to click). The RWP-imported batch
  // ships with offer_link === "" until issuer URLs are filled in via
  // follow-up; the verify:cards admin queue will surface them.
  //
  // Also respect state_restricted when userState is provided. The CC
  // catalog schema uses a single state_restricted string[] as the
  // allow-list (mirrors checking-bonus filter semantics but with the
  // opposite shape — checking uses eligibility.states_allowed alongside
  // a boolean gate). Card-level state restriction is currently unused
  // in the catalog but wired here so adding region-locked cards later
  // doesn't require an additional code change.
  const available = cards.filter(c => {
    if (c.expired) return false
    if (!c.offer_link || c.offer_link.length === 0) return false
    // Approval gate: skip issuers the user is hard-blocked with (opt-in).
    if (blockedIssuers.size > 0 && blockedIssuers.has(normalizeIssuer(c.issuer))) return false
    // State filter: when no state is set, hide all state-restricted cards
    // (default to nationwide only — picking a state unlocks more, not fewer).
    if (c.state_restricted && c.state_restricted.length > 0) {
      if (!userState) return false
      if (!c.state_restricted.includes(userState)) return false
    }
    // Military-only cards (USAA / Navy Federal / AAFES) — hide unless
    // the user is military-affiliated.
    if (c.military_only === true && !militaryAffiliated) return false
    if (useTravelCpp && targetTravelProgram && transferKind(c, targetTravelProgram) === null) return false
    return true
  })

  // Step 1: filter to feasible cards. A card is infeasible if the user
  // cannot realistically hit its min_spend within the bank's deadline at
  // their monthly budget — recommending Amex Business Platinum ($20k in
  // 3mo) to a $2k/mo spender was the bug here. We allow a small buffer
  // (1.05x) so a card requiring $5,000 in 3 months at exactly $1,667/mo
  // doesn't get knocked out by floating-point noise.
  const FEASIBILITY_BUFFER = 1.05
  const feasible = available.filter(card => {
    if (card.min_spend <= 0) return true
    const monthsNeeded = card.min_spend / monthlyBudget
    return monthsNeeded <= card.spend_months * FEASIBILITY_BUFFER
  })

  const scored = feasible.map(card => {
    // In Travel Mode, swap the per-card cpp for a redemption-ceiling
    // cpp from TRAVEL_CPP, a selected transfer program, or the user's
    // per-currency override. Cash bonus normalization lives in
    // signupBonusValue so legacy catalog rows don't collapse to $2 offers.
    const effective_cpp = useTravelCpp
      ? targetTravelProgram
        ? travelTransferCpp(card, targetTravelProgram)
        : getTravelCpp(card, cppOverrides)
      : card.cpp_value
    const welcome_bonus = signupBonusValue(card, effective_cpp)

    // Per-card benefits value gated by the user's usage profile. Cards
    // not in the registry return [] and contribute 0 — math unchanged.
    const { total: benefits_value, included: included_benefits, excluded: excluded_benefits } =
      valueOfBenefits(card.card_name, profile)

    const annual_fee_charged = card.annual_fee_waived_first_year ? 0 : card.annual_fee
    const net_value = welcome_bonus + card.statement_credits_year1 + benefits_value - annual_fee_charged

    const value_breakdown: ValueBreakdown = {
      welcome_bonus,
      statement_credits: card.statement_credits_year1,
      benefits_value,
      annual_fee: -annual_fee_charged,
      included_benefits,
      excluded_benefits,
    }

    // How many months to hit minimum spend at this budget. Floor at 0.5
    // so an instant-qualify card doesn't divide-by-zero, but no longer
    // cap at card.spend_months — the feasibility filter above already
    // guarantees raw_months <= card.spend_months * 1.05, so capping was
    // hiding the real "you can't actually do this" cases.
    const months_to_complete = Math.max(
      card.min_spend > 0 ? card.min_spend / monthlyBudget : 0.5,
      0.5,
    )

    const return_per_month = months_to_complete > 0
      ? net_value / months_to_complete
      : net_value
    const return_on_spend = card.min_spend > 0
      ? net_value / card.min_spend
      : net_value

    return { card, net_value, months_to_complete, return_per_month, return_on_spend, cumulative_value: 0, cumulative_months: 0, value_breakdown }
  })

  scored.sort((a, b) => {
    if (rankingMode === "max_bonus") {
      return b.value_breakdown.welcome_bonus - a.value_breakdown.welcome_bonus || b.net_value - a.net_value
    }
    if (rankingMode === "return_on_spend") {
      return b.return_on_spend - a.return_on_spend || b.net_value - a.net_value
    }
    return b.return_per_month - a.return_per_month
  })

  // Filter to only positive-value cards
  const positive = scored.filter(s => s.net_value > 0)

  // Build cumulative timeline with application-pace spacing.
  //
  // Each card needs at least `minGapMonths` between its application date
  // and the previous card's application date (12/maxCardsPerYear → e.g.
  // 4 cards/year = 3-month gap). If the previous card needed longer than
  // that gap to complete its min_spend, the next card waits until the
  // previous one is done (so the user isn't juggling two open SUBs).
  //
  //   nextStart = prevStart + max(minGapMonths, prevMonthsToComplete)
  //   completion = nextStart + currentMonthsToComplete
  //
  // cumulative_months therefore = the month at which this card's spend
  // is complete; cumulative_value = total net value through this card.
  // The 12-month projection upstream filters by cumulative_months <= 12,
  // which falls out to ≤ maxCardsPerYear cards by construction.
  const minGapMonths = 12 / Math.max(1, maxCardsPerYear)
  let prevStart = 0
  let prevMonths = 0
  let cumValue = 0
  positive.forEach((s, i) => {
    const startMonth = i === 0 ? 0 : prevStart + Math.max(minGapMonths, prevMonths)
    const completionMonth = startMonth + s.months_to_complete
    cumValue += s.net_value
    s.cumulative_months = Math.round(completionMonth * 10) / 10
    s.cumulative_value = Math.round(cumValue)
    prevStart = startMonth
    prevMonths = s.months_to_complete
  })

  return positive
}

export function formatCurrency(n: number): string {
  return n >= 0
    ? `$${Math.round(n).toLocaleString()}`
    : `-$${Math.round(Math.abs(n)).toLocaleString()}`
}
