/**
 * 0% intro-APR finder logic.
 *
 * A different lens on the same catalog: instead of "which card pays the most",
 * this answers "which card buys me the most interest-free runway" — for people
 * carrying a balance (balance transfer) or planning a big purchase.
 *
 * Cards carry intro terms in `CreditCardBonus.intro_apr`, which is sparse today
 * (fields are scaffolded, not yet populated). Everything here degrades to an
 * empty result set when no card has data, so the UI can ship now and light up
 * as the data is filled in.
 */
import type { CreditCardBonus, IntroApr } from "./creditCardBonuses"

export type IntroAprMode = "balance_transfer" | "purchases"

/** Does this card have a usable intro-APR offer for the given lens? */
export function hasIntroApr(card: CreditCardBonus, mode: IntroAprMode): boolean {
  const a = card.intro_apr
  if (!a) return false
  return mode === "balance_transfer"
    ? (a.bt_apr_months ?? 0) > 0
    : (a.purchase_apr_months ?? 0) > 0
}

/** The headline intro length (months) for the chosen lens. */
export function introMonths(a: IntroApr, mode: IntroAprMode): number {
  return (mode === "balance_transfer" ? a.bt_apr_months : a.purchase_apr_months) ?? 0
}

/**
 * Cost of moving `balance` dollars onto this card and riding the 0% window:
 * just the upfront balance-transfer fee (intro APR is 0% by definition). Used
 * to rank BT cards — a longer 0% window with a small fee beats a short one.
 * Returns null for purchase-only cards / when no BT terms exist.
 */
export function balanceTransferCost(card: CreditCardBonus, balance: number): number | null {
  const a = card.intro_apr
  if (!a || (a.bt_apr_months ?? 0) <= 0) return null
  const feePct = a.bt_fee_pct ?? 0
  return Math.round(balance * (feePct / 100))
}

/**
 * Rank cards for an intro-APR use case.
 *  - balance_transfer: longest 0% window first; ties broken by lowest BT fee.
 *  - purchases:        longest 0% purchase window first; ties by lower go-to APR.
 */
export function rankByIntroApr(cards: CreditCardBonus[], mode: IntroAprMode): CreditCardBonus[] {
  return cards
    .filter(c => !c.expired && hasIntroApr(c, mode))
    .sort((a, b) => {
      const am = introMonths(a.intro_apr!, mode)
      const bm = introMonths(b.intro_apr!, mode)
      if (am !== bm) return bm - am
      if (mode === "balance_transfer") {
        return (a.intro_apr!.bt_fee_pct ?? 0) - (b.intro_apr!.bt_fee_pct ?? 0)
      }
      return (a.intro_apr!.go_to_apr_low ?? Infinity) - (b.intro_apr!.go_to_apr_low ?? Infinity)
    })
}

/** Human-readable summary of a card's intro terms, e.g. "21mo BT · 3% fee · then 17.99–28.49% APR". */
export function introAprSummary(card: CreditCardBonus, mode: IntroAprMode): string {
  const a = card.intro_apr
  if (!a) return "No intro APR"
  // Tail: post-intro variable APR range. Load-bearing for the debt
  // payoff decision — knowing the runway length without knowing the
  // post-intro rate is half the picture.
  const goTo = goToAprTail(a)
  if (mode === "balance_transfer") {
    const m = a.bt_apr_months ?? 0
    if (!m) return "No balance-transfer offer"
    const fee = a.bt_fee_pct != null ? ` · ${a.bt_fee_pct}% fee` : ""
    return `${m}mo 0% on transfers${fee}${goTo}`
  }
  const m = a.purchase_apr_months ?? 0
  if (!m) return "No purchase-APR offer"
  return `${m}mo 0% on purchases${goTo}`
}

function goToAprTail(a: IntroApr): string {
  const lo = a.go_to_apr_low
  const hi = a.go_to_apr_high
  if (lo == null && hi == null) return ""
  if (lo != null && hi != null && lo !== hi) return ` · then ${lo}–${hi}% APR`
  const rate = (hi ?? lo) as number
  return ` · then ${rate}% APR`
}
