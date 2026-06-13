import type { BonusRecord, Extracted, FieldResult } from "./types"

// Exact match for numbers; tolerant on minor variance; flag mismatch if distant
function compareNumber(
  field: string,
  stored: number | null | undefined,
  extracted: number | null,
  snippet: string | null,
): FieldResult {
  if (extracted === null || extracted === undefined) {
    return { field, status: "missing", stored: stored ?? null, extracted: null }
  }
  if (stored === null || stored === undefined) {
    return {
      field,
      status: "ambiguous",
      stored: stored ?? null,
      extracted,
      snippet: snippet ?? undefined,
    }
  }
  if (stored === extracted) {
    return { field, status: "match", stored, extracted }
  }
  if (
    snippet &&
    ((field === "min_direct_deposit_total" && /(?:monthly maintenance fee|fee can be waived|waive the fee|waived by)/i.test(snippet)) ||
      (field === "monthly_fee" && /(?:fee can be waived|fee waived|no monthly fee with)/i.test(snippet)) ||
      (field === "deposit_window_days" && /(?:closed|closing|after account opening,? and the bonus)/i.test(snippet)))
  ) {
    return { field, status: "ambiguous", stored, extracted, snippet }
  }
  // Close enough for DD totals (wording like "$2,000+" vs "$2,500"): within 20% -> ambiguous
  const ratio = Math.abs(stored - extracted) / Math.max(stored, extracted)
  if (ratio < 0.2 && field !== "bonus_amount") {
    return {
      field,
      status: "ambiguous",
      stored,
      extracted,
      snippet: snippet ?? undefined,
    }
  }
  // Bonus amount mismatch w/ plausible value -> ambiguous (might be tier talk)
  if (field === "bonus_amount" && extracted >= stored * 0.5 && extracted <= stored * 2) {
    return {
      field,
      status: "ambiguous",
      stored,
      extracted,
      snippet: snippet ?? undefined,
    }
  }
  return {
    field,
    status: "mismatch",
    stored,
    extracted,
    confidence: "high",
    snippet: snippet ?? undefined,
  }
}

export function compareRecord(
  record: BonusRecord,
  extracted: Extracted,
): FieldResult[] {
  const results: FieldResult[] = []

  const bonusResult = compareNumber(
    "bonus_amount",
    record.bonus_amount ?? null,
    extracted.bonusAmount ?? null,
    extracted.rawSnippets.bonusAmount,
  )
  if (
    bonusResult.status === "mismatch" &&
    record.tiers?.some((tier) => tier.bonus === extracted.bonusAmount)
  ) {
    results.push({ ...bonusResult, status: "ambiguous" })
  } else {
    results.push(bonusResult)
  }

  const directDepositResult = compareNumber(
    "min_direct_deposit_total",
    record.requirements?.min_direct_deposit_total ?? null,
    extracted.minDirectDepositTotal ?? null,
    extracted.rawSnippets.minDirectDepositTotal,
  )
  if (
    directDepositResult.status === "mismatch" &&
    record.tiers?.some((tier) => tier.min_dd_total === extracted.minDirectDepositTotal)
  ) {
    results.push({ ...directDepositResult, status: "ambiguous" })
  } else {
    results.push(directDepositResult)
  }
  results.push(
    compareNumber(
      "deposit_window_days",
      record.requirements?.deposit_window_days ?? null,
      extracted.depositWindowDays ?? null,
      extracted.rawSnippets.depositWindowDays,
    ),
  )
  results.push(
    compareNumber(
      "monthly_fee",
      record.fees?.monthly_fee ?? null,
      extracted.monthlyFee ?? null,
      extracted.rawSnippets.monthlyFee,
    ),
  )

  return results
}
