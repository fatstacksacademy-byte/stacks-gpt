// Fee guidance for a bank bonus — turns the raw fee fields into actionable
// advice: how long to keep the account open to dodge the early-closure fee, and
// how much cash to leave to waive the monthly fee (weighed against the interest
// that cash would earn in a HYSA instead). Pure + deterministic.
//
// Reads the loosely-typed `fees` object shared across the catalog
// (bonuses.ts any[], hawaiiBankBonuses Record, savingsBonuses strict). Every
// field is optional — guidance degrades gracefully and only asserts what the
// data supports (no invented windows or thresholds).

export type BonusFees = {
  monthly_fee?: number | null
  early_closure_fee?: number | null
  early_closure_fee_days?: number | null
  monthly_fee_waiver_balance?: number | null
  monthly_fee_waived?: boolean | null
}

export type FeeGuidanceOpts = {
  /** Account open date (ISO) — lets us compute a concrete "keep open until" date. */
  openDateISO?: string | null
  /** How long you'll keep the account open. Defaults to the early-closure window
   *  (rounded up to months) or 3 months. Drives the monthly-fee total. */
  monthsHeld?: number
  /** Your HYSA APY (decimal, e.g. 0.04) — used to price the opportunity cost of
   *  parking the waiver balance instead of earning interest on it. */
  hysaApy?: number | null
}

export type FeeGuidance = {
  hasGuidance: boolean
  earlyClosureFee: number
  keepOpenDays: number | null
  /** Concrete date to keep the account open until (open + window), if known. */
  keepOpenUntil: string | null
  monthlyFee: number
  monthlyFeeWaived: boolean
  /** Balance that zeroes the monthly fee, when the bank states one. */
  waiverBalance: number | null
  /** Leave this much to skip the monthly fee (null when not applicable). */
  recommendedBalance: number | null
  monthsHeld: number
  /** Monthly fees you'd pay over the hold if you DON'T park the waiver balance. */
  feesIfNoBalance: number
  /** HYSA interest the waiver balance would forgo over the hold (opportunity cost). */
  carryCostIfWaiverBalance: number | null
  /** Short, plain-English lines a UI can render directly. */
  lines: string[]
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const dt = new Date(t)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`
}
const money = (n: number) => `$${Math.round(n).toLocaleString()}`

export function feeGuidance(fees: BonusFees | null | undefined, opts: FeeGuidanceOpts = {}): FeeGuidance {
  const f = fees ?? {}
  const earlyClosureFee = Math.max(0, f.early_closure_fee ?? 0)
  const keepOpenDays = f.early_closure_fee_days != null && f.early_closure_fee_days > 0 ? f.early_closure_fee_days : null
  const monthlyFee = Math.max(0, f.monthly_fee ?? 0)
  const monthlyFeeWaived = !!f.monthly_fee_waived
  const waiverBalance = f.monthly_fee_waiver_balance != null && f.monthly_fee_waiver_balance > 0 ? f.monthly_fee_waiver_balance : null

  const openDateISO = opts.openDateISO && ISO.test(opts.openDateISO) ? opts.openDateISO : null
  const keepOpenUntil = openDateISO && keepOpenDays ? addDaysISO(openDateISO, keepOpenDays) : null

  const monthsHeld = opts.monthsHeld ?? (keepOpenDays ? Math.ceil(keepOpenDays / 30) : 3)
  const feesIfNoBalance = monthlyFeeWaived ? 0 : monthlyFee * monthsHeld
  const carryCostIfWaiverBalance =
    waiverBalance != null && opts.hysaApy != null && opts.hysaApy > 0
      ? waiverBalance * opts.hysaApy * (monthsHeld / 12)
      : null

  // Recommend leaving the waiver balance only when there's a real monthly fee
  // that isn't already waived by holding the bonus, and the bank states a number.
  const recommendedBalance = monthlyFee > 0 && !monthlyFeeWaived && waiverBalance != null ? waiverBalance : null

  const lines: string[] = []

  // Early-closure guidance.
  if (earlyClosureFee > 0) {
    if (keepOpenUntil) {
      lines.push(`Keep the account open until ${keepOpenUntil} (${keepOpenDays} days) to avoid the ${money(earlyClosureFee)} early-closure fee.`)
    } else if (keepOpenDays) {
      lines.push(`Keep the account open ${keepOpenDays} days to avoid the ${money(earlyClosureFee)} early-closure fee.`)
    } else {
      lines.push(`${money(earlyClosureFee)} early-closure fee — the bank doesn't publish the window; keep it open until after the bonus posts to be safe.`)
    }
  }

  // Monthly-fee guidance.
  if (monthlyFee > 0) {
    if (monthlyFeeWaived) {
      lines.push(`The ${money(monthlyFee)}/mo fee is waived while you hold the bonus balance — no extra cash needed.`)
    } else if (recommendedBalance != null) {
      if (carryCostIfWaiverBalance != null && carryCostIfWaiverBalance < feesIfNoBalance) {
        lines.push(`Leave ${money(recommendedBalance)} in the account to waive the ${money(monthlyFee)}/mo fee — cheaper than the ~${money(feesIfNoBalance)} in fees you'd pay over ${monthsHeld} months (parking it costs only ~${money(carryCostIfWaiverBalance)} in forgone HYSA interest).`)
      } else if (carryCostIfWaiverBalance != null) {
        lines.push(`Just pay the ${money(monthlyFee)}/mo fee (~${money(feesIfNoBalance)} over ${monthsHeld} months) — parking ${money(recommendedBalance)} to waive it would cost ~${money(carryCostIfWaiverBalance)} in lost HYSA interest, more than the fee.`)
      } else {
        lines.push(`Leave ${money(recommendedBalance)} to waive the ${money(monthlyFee)}/mo fee, or budget ~${money(feesIfNoBalance)} in fees over ${monthsHeld} months.`)
      }
    } else {
      lines.push(`${money(monthlyFee)}/mo fee — no published balance waiver; budget ~${money(feesIfNoBalance)} over ${monthsHeld} months.`)
    }
  }

  return {
    hasGuidance: earlyClosureFee > 0 || monthlyFee > 0,
    earlyClosureFee, keepOpenDays, keepOpenUntil,
    monthlyFee, monthlyFeeWaived, waiverBalance, recommendedBalance,
    monthsHeld, feesIfNoBalance, carryCostIfWaiverBalance, lines,
  }
}
