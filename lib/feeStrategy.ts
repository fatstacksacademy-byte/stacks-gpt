/**
 * Fee-strategy calculator for fee-bearing checking bonuses.
 *
 * A bonus with a monthly maintenance fee has up to four ways to handle it, and
 * the right one is frequently counterintuitive:
 *
 *   A. PAY      — eat the fee for the keep-open window, then close.
 *   B. WAIVE via balance — park the waiver minimum so the fee is $0, at the
 *                 cost of the HYSA interest that cash would otherwise earn.
 *   C. WAIVE via DD — route a qualifying direct deposit each cycle ($0 cost if
 *                 you're already routing enough).
 *   D. CLOSE EARLY — close once the bonus posts, skipping later fees but paying
 *                 an early-closure fee (and only if that doesn't claw the bonus
 *                 back).
 *
 * The classic trap: parking a big balance to dodge a small fee LOSES money once
 * your HYSA pays more than the fee. Park-vs-pay break-even balance:
 *
 *   waiver_balance  <  monthly_fee × 12 / (hysaApy − accountApy)
 *
 * e.g. a $15/mo fee at a 4.5% HYSA → park only if the waiver is under $4,000.
 *
 * All math is pure/deterministic so it unit-tests cleanly and is safe in the
 * workflow harness. Money is left unrounded; callers round at the edge.
 */

export type FeeWaiver = {
  /** Average/combined balance that waives the fee. */
  minBalance?: number | null
  /** Qualifying direct deposit per statement cycle that waives the fee. */
  ddPerCycle?: number | null
}

export type FeeStrategyKind = "no_fee" | "waive_dd" | "waive_balance" | "pay" | "close_early"

export type FeeStrategyOption = {
  kind: FeeStrategyKind
  label: string
  /** Total drag over the hold: fees + opportunity cost + early-closure fee. */
  cost: number
  /** bonusAmount − cost. */
  net: number
  /** Whether this play is actually achievable for the user. */
  available: boolean
  note: string
}

export type FeeStrategyInput = {
  bonusAmount: number
  monthlyFee: number
  waiver?: FeeWaiver | null
  /** Qualifying DD/cycle the user will route anyway (e.g. their monthly pay). */
  userDdPerCycle?: number | null
  /** Months you must keep the account open (the keep-open window). */
  monthsOpen: number
  /** Months until the bonus posts. */
  bonusPostsMonths: number
  earlyClosureFee?: number | null
  /** Does closing early forfeit the bonus? Conservative default: true (so the
   *  close-early play is only offered when a row is explicitly flagged safe). */
  earlyClosureClawback?: boolean
  /** Opportunity-cost rate — the user's HYSA APY (decimal, 4.5% → 0.045). */
  hysaApy: number
  /** What parked cash earns at this bank (decimal). Default 0 (checking). */
  accountApy?: number
}

export type FeeStrategyResult = {
  /** Available plays first (cheapest → priciest), then any unavailable ones. */
  options: FeeStrategyOption[]
  best: FeeStrategyOption
  bestNet: number
  /** What the planner should treat as this bonus's fee drag. */
  bestCost: number
  recommendation: string
  /** Park-vs-pay break-even balance (park to waive only wins below this). */
  breakEvenBalance: number | null
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`

/**
 * Best-effort parse of a free-text fee-waiver string into structured thresholds.
 * Conservative: only lifts clear dollar amounts. Returns {} when nothing parses,
 * which the engine treats as "no waiver" (→ pay or close-early only).
 *
 *   "$15/month, waived with a $6,000 combined balance OR $2,000+ direct deposit"
 *      → { minBalance: 6000, ddPerCycle: 2000 }
 */
export function parseFeeWaiver(text: string | null | undefined): FeeWaiver {
  if (!text) return {}
  const out: FeeWaiver = {}
  const dd = text.match(/\$\s?([\d,]+)\+?\s*(?:in\s+)?(?:qualifying\s+)?(?:monthly\s+)?(?:direct deposit|dd\b|ach deposit)/i)
  if (dd) {
    const n = parseInt(dd[1].replace(/,/g, ""), 10)
    if (Number.isFinite(n) && n > 0) out.ddPerCycle = n
  }
  const bal = text.match(/\$\s?([\d,]+)\+?\s*(?:combined |minimum |average |daily |total |monthly )*balance/i)
    || text.match(/balance of \$\s?([\d,]+)/i)
  if (bal) {
    const n = parseInt(bal[1].replace(/,/g, ""), 10)
    if (Number.isFinite(n) && n > 0) out.minBalance = n
  }
  return out
}

export function analyzeFeeStrategy(input: FeeStrategyInput): FeeStrategyResult {
  const bonus = input.bonusAmount
  const fee = Math.max(0, input.monthlyFee || 0)
  const monthsOpen = Math.max(0, input.monthsOpen || 0)
  const postsMonths = Math.max(0, Math.min(input.bonusPostsMonths || 0, monthsOpen || Infinity))
  const hysa = Math.max(0, input.hysaApy || 0)
  const acct = Math.max(0, input.accountApy ?? 0)
  const spread = Math.max(0, hysa - acct)

  // No fee → nothing to strategize.
  if (fee === 0) {
    const opt: FeeStrategyOption = { kind: "no_fee", label: "No monthly fee", cost: 0, net: bonus, available: true, note: "No monthly maintenance fee — keep the full bonus." }
    return { options: [opt], best: opt, bestNet: bonus, bestCost: 0, recommendation: opt.note, breakEvenBalance: null }
  }

  const options: FeeStrategyOption[] = []

  // A — pay the fee through the keep-open window.
  const payCost = fee * monthsOpen
  options.push({
    kind: "pay", label: "Pay the fee", cost: payCost, net: bonus - payCost, available: true,
    note: `Pay $${fee}/mo for ${monthsOpen} mo (~${money(payCost)}), close after the keep-open window.`,
  })

  // C — waive via direct deposit (only counted when the user actually routes enough).
  const wDd = input.waiver?.ddPerCycle ?? null
  if (wDd != null && wDd > 0) {
    const achievable = (input.userDdPerCycle ?? 0) >= wDd
    // wDd === 1 is the "any qualifying DD waives the fee" sentinel (no $ threshold).
    const ddLabel = wDd <= 1 ? "a qualifying direct deposit" : `${money(wDd)}+/cycle in DD`
    options.push({
      kind: "waive_dd", label: "Waive via direct deposit",
      cost: achievable ? 0 : payCost, net: achievable ? bonus : bonus - payCost, available: achievable,
      note: achievable
        ? `Route ${ddLabel} (you already do) — fee waived, full ${money(bonus)}.`
        : `Routing ${ddLabel} would waive the fee, but that's more than this bonus needs.`,
    })
  }

  // B — waive by parking the minimum balance (opportunity cost).
  const wBal = input.waiver?.minBalance ?? null
  let breakEvenBalance: number | null = null
  if (wBal != null && wBal > 0) {
    const oppCost = (wBal * spread / 12) * monthsOpen
    breakEvenBalance = spread > 0 ? (fee * 12) / spread : null
    options.push({
      kind: "waive_balance", label: "Waive via balance", cost: oppCost, net: bonus - oppCost, available: true,
      note: spread > 0
        ? `Park ${money(wBal)} to waive the fee — but that forgoes ~${money(oppCost)} of HYSA interest over ${monthsOpen} mo.`
        : `Park ${money(wBal)} to waive the fee (no opportunity cost at your current HYSA rate).`,
    })
  }

  // D — close early after the bonus posts (only when known not to claw back).
  if (input.earlyClosureClawback === false) {
    const ecf = Math.max(0, input.earlyClosureFee ?? 0)
    const closeCost = fee * postsMonths + ecf
    options.push({
      kind: "close_early", label: "Close early", cost: closeCost, net: bonus - closeCost, available: true,
      note: `Close ~month ${postsMonths.toFixed(1)} once the bonus posts: ~${money(fee * postsMonths)} fees + ${money(ecf)} early-closure fee.`,
    })
  }

  const available = options.filter(o => o.available).sort((a, b) => a.cost - b.cost)
  const best = available[0] ?? options[0]
  const display = [...available, ...options.filter(o => !o.available)]

  return {
    options: display,
    best,
    bestNet: best.net,
    bestCost: best.cost,
    recommendation: buildRecommendation(best, breakEvenBalance, wBal),
    breakEvenBalance,
  }
}

function buildRecommendation(best: FeeStrategyOption, breakEven: number | null, waiverBalance: number | null): string {
  const parkTrap =
    breakEven != null && waiverBalance != null && waiverBalance > breakEven && best.kind !== "waive_balance"
      ? ` Don't park ${money(waiverBalance)} to dodge the fee — it costs more than the fee below ~${money(breakEven)}.`
      : ""
  return `${best.note}${parkTrap}`
}
