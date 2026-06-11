// Statement import — normalization layer.
//
// A credit-card statement is the richest single source for the debt simulator:
// it carries the balance, APR, minimum payment, credit limit, and (sometimes)
// promotional terms. The AI extraction step (app/api/debt-import) returns loose
// JSON; THIS module turns that into validated CreditCardDebt entries.
//
// This file is pure and deterministic so it can be unit-tested without the
// model: percent->decimal conversion, $ parsing, promo-balance splitting, and
// sane-range guards all live here, not in the route.

import { round2, type CreditCardDebt } from "./debtSimulator"

/** Loose per-account shape the model is asked to return (percent-based APRs). */
export type ExtractedStatementAccount = {
  issuer?: unknown
  product_name?: unknown
  statement_balance?: unknown
  purchase_apr_pct?: unknown
  minimum_payment_due?: unknown
  credit_limit?: unknown
  promo_apr_pct?: unknown
  promo_balance?: unknown
  promo_expiration?: unknown
  post_promo_apr_pct?: unknown
}

export type ExtractedStatement = {
  accounts?: unknown
}

export type StatementImportResult = {
  debts: CreditCardDebt[]
  warnings: string[]
  accountsFound: number
}

const MAX_PLAUSIBLE_APR = 0.6 // 60% — above this we treat the value as a misread

function parseUSD(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""))
  if (!Number.isFinite(n)) return null
  return round2(n)
}

/** Convert a percent (24.99) — or an already-decimal rate — to a decimal APR. */
export function percentToDecimal(v: unknown): number | null {
  if (v == null) return null
  let n = typeof v === "number" ? v : parseFloat(String(v).replace(/[%\s]/g, ""))
  if (!Number.isFinite(n) || n < 0) return null
  if (n > 1) n = n / 100 // 24.99 -> 0.2499; 0 stays 0; a true decimal <=1 is left alone
  if (n > MAX_PLAUSIBLE_APR) return null
  return Math.round(n * 1e6) / 1e6
}

function cleanStr(v: unknown, max = 80): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length === 0 ? null : s.slice(0, max)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
function validIsoDate(v: unknown): string | null {
  const s = cleanStr(v, 10)
  if (!s || !ISO_DATE.test(s)) return null
  const [y, m, d] = s.split("-").map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return s
}

/** Minimum payment when the statement didn't surface one (1% floor, $25 min). */
function estimateMinPayment(balance: number): number {
  return Math.max(25, round2(balance * 0.01))
}

function normalizeAccount(
  acc: ExtractedStatementAccount,
  idPrefix: string,
  startIndex: number,
  warnings: string[],
): CreditCardDebt[] {
  const name =
    [cleanStr(acc.issuer, 40), cleanStr(acc.product_name, 60)].filter(Boolean).join(" ") ||
    "Imported card"

  const total = parseUSD(acc.statement_balance)
  if (total == null || total <= 0) {
    warnings.push(`${name}: no positive statement balance found — skipped. Add it manually if needed.`)
    return []
  }

  const purchaseApr = percentToDecimal(acc.purchase_apr_pct)
  const promoApr = percentToDecimal(acc.promo_apr_pct)
  const postPromoApr = percentToDecimal(acc.post_promo_apr_pct)
  const promoExpiry = validIsoDate(acc.promo_expiration)
  const promoBalance = parseUSD(acc.promo_balance)
  const creditLimit = parseUSD(acc.credit_limit)
  const minPayment = parseUSD(acc.minimum_payment_due)

  if (purchaseApr == null && promoApr == null) {
    warnings.push(`${name}: APR couldn't be read — enter it before trusting the projection.`)
  }

  const hasUsablePromo = promoApr != null && promoExpiry != null
  // The post-promo / revolving rate. Fall back to purchase APR, then 0 (flagged
  // above) so the entry is always valid; the review UI highlights apr === 0.
  const revolvingApr = purchaseApr ?? postPromoApr ?? 0

  let idx = startIndex
  const id = () => `${idPrefix}-${idx++}`

  // Case A: a distinct promo sub-balance alongside a revolving balance. Split
  // into two entries so each APR is modeled correctly (the engine treats every
  // entry independently — this is the faithful representation, not a hack).
  if (hasUsablePromo && promoBalance != null && promoBalance > 0 && promoBalance < total - 0.5) {
    const revolvingBalance = round2(total - promoBalance)
    warnings.push(
      `${name}: a ${promoExpiry} promo sub-balance was split from the revolving balance into two entries so each rate is modeled correctly.`,
    )
    return [
      {
        kind: "credit_card",
        id: id(),
        name: `${name} (0% promo)`,
        balance: promoBalance,
        apr: postPromoApr ?? revolvingApr,
        minPayment: minPayment != null ? round2(minPayment / 2) : estimateMinPayment(promoBalance),
        promoApr,
        promoEndsOn: promoExpiry,
        postPromoApr: postPromoApr ?? revolvingApr,
      },
      {
        kind: "credit_card",
        id: id(),
        name,
        balance: revolvingBalance,
        apr: revolvingApr,
        minPayment: minPayment != null ? round2(minPayment / 2) : estimateMinPayment(revolvingBalance),
        creditLimit: creditLimit ?? undefined,
      },
    ]
  }

  // Case B: the whole balance sits under a promo rate.
  if (hasUsablePromo) {
    return [
      {
        kind: "credit_card",
        id: id(),
        name,
        balance: total,
        apr: postPromoApr ?? revolvingApr,
        minPayment: minPayment ?? estimateMinPayment(total),
        creditLimit: creditLimit ?? undefined,
        promoApr,
        promoEndsOn: promoExpiry,
        postPromoApr: postPromoApr ?? revolvingApr,
      },
    ]
  }

  // Case C: plain revolving balance.
  if (minPayment == null) {
    warnings.push(`${name}: minimum payment estimated (1% of balance) — adjust if your statement differs.`)
  }
  return [
    {
      kind: "credit_card",
      id: id(),
      name,
      balance: total,
      apr: revolvingApr,
      minPayment: minPayment ?? estimateMinPayment(total),
      creditLimit: creditLimit ?? undefined,
    },
  ]
}

/**
 * Turn the model's raw extraction into validated CreditCardDebt entries.
 * Deterministic given (raw, idPrefix) — no clocks or randomness here.
 */
export function normalizeStatementExtraction(
  raw: ExtractedStatement | unknown,
  idPrefix = "import",
): StatementImportResult {
  const warnings: string[] = []
  const obj = (raw ?? {}) as ExtractedStatement
  const accountsRaw = Array.isArray(obj.accounts) ? obj.accounts : []

  if (accountsRaw.length === 0) {
    return { debts: [], warnings: ["No credit-card accounts could be read from that file."], accountsFound: 0 }
  }

  const debts: CreditCardDebt[] = []
  for (const a of accountsRaw) {
    if (!a || typeof a !== "object") continue
    const produced = normalizeAccount(a as ExtractedStatementAccount, idPrefix, debts.length, warnings)
    debts.push(...produced)
  }

  return { debts, warnings, accountsFound: accountsRaw.length }
}
