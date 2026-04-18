/**
 * Credit card offer page extractors. CC terms look nothing like bank-bonus
 * terms, so this is a parallel module to scripts/_shared/extract.ts (which
 * handles checking/savings pages).
 *
 * Returns the first plausible match for each field. Callers should compare
 * against the stored catalog value and surface mismatches, not blindly
 * overwrite.
 */

export type CardExtracted = {
  /** Bonus amount as a number (points, miles, or dollars depending on currency). */
  bonusAmount: number | null
  /** The unit text that came with the amount — "points" / "miles" / "$" / "cash back". */
  bonusUnit: string | null
  /** Minimum spend to earn the bonus, in dollars. */
  minSpend: number | null
  /** Spend window in months. */
  spendMonths: number | null
  /** Annual fee in dollars. 0 if "no annual fee" is stated. */
  annualFee: number | null
  /** Whether the card name appears on the page at all. False = suspicious. */
  cardNameOnPage: boolean
  /** Raw snippets for each match so callers can display context. */
  snippets: {
    bonusAmount: string | null
    minSpend: string | null
    annualFee: string | null
  }
  /** Flags discovered during extraction. */
  flags: string[]
}

function snippet(text: string, idx: number, radius = 100): string {
  return text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + radius))
}

function cleanAmount(raw: string): number | null {
  const n = Number(raw.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : null
}

// ────────── Bonus amount (points / miles / dollars) ──────────

export function extractBonusAmount(text: string): {
  amount: number | null
  unit: string | null
  snippet: string | null
} {
  // Points/miles first — "80,000 bonus points", "earn 125,000 ThankYou Points"
  const pointsPatterns: { re: RegExp; unitIdx: number; amountIdx: number }[] = [
    {
      re: /\b(?:earn\s+)?(\d{1,3}(?:,\d{3})*)\s+(?:bonus\s+)?(points|miles|ThankYou\s+Points|Membership\s+Rewards\s+[Pp]oints|Ultimate\s+Rewards\s+[Pp]oints|Aeroplan\s+points|Avios)/i,
      amountIdx: 1,
      unitIdx: 2,
    },
    {
      re: /\b(?:earn|get|receive)\s+up\s+to\s+(\d{1,3}(?:,\d{3})*)\s+(points|miles)/i,
      amountIdx: 1,
      unitIdx: 2,
    },
  ]
  for (const p of pointsPatterns) {
    const m = text.match(p.re)
    if (m) {
      const idx = m.index ?? 0
      return {
        amount: cleanAmount(m[p.amountIdx]),
        unit: m[p.unitIdx].toLowerCase().replace(/\s+/g, " "),
        snippet: snippet(text, idx),
      }
    }
  }

  // Cash bonus — "$300 cash back bonus", "earn $200"
  const dollarPatterns: RegExp[] = [
    /\bearn\s+\$(\d{2,4}(?:,\d{3})?)\s+(?:cash\s+)?(?:back\s+)?bonus/i,
    /\$(\d{2,4}(?:,\d{3})?)\s+(?:cash\s+)?(?:back\s+)?(?:welcome\s+)?bonus/i,
    /\bearn\s+\$(\d{2,4}(?:,\d{3})?)\s+when\s+you\s+spend/i,
  ]
  for (const re of dollarPatterns) {
    const m = text.match(re)
    if (m) {
      const idx = m.index ?? 0
      return { amount: cleanAmount(m[1]), unit: "$", snippet: snippet(text, idx) }
    }
  }
  return { amount: null, unit: null, snippet: null }
}

// ────────── Minimum spend + window ──────────

export function extractMinSpend(text: string): {
  minSpend: number | null
  spendMonths: number | null
  snippet: string | null
} {
  const patterns: RegExp[] = [
    // "$4,000 in the first 3 months" / "$4,000 on purchases in the first 3 months"
    /\$(\d[\d,]{2,6})\s+(?:on\s+purchases?\s+)?(?:in|within)\s+(?:the\s+first\s+)?(\d{1,2})\s+months/i,
    // "spend $4,000 in 3 months"
    /spend\s+\$(\d[\d,]{2,6})\s+in\s+(?:the\s+first\s+)?(\d{1,2})\s+months/i,
    // "after spending $X within Y months"
    /after\s+spending\s+\$(\d[\d,]{2,6})\s+(?:in|within)\s+(\d{1,2})\s+months/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const idx = m.index ?? 0
      return {
        minSpend: cleanAmount(m[1]),
        spendMonths: Number(m[2]),
        snippet: snippet(text, idx),
      }
    }
  }
  return { minSpend: null, spendMonths: null, snippet: null }
}

// ────────── Annual fee ──────────

export function extractAnnualFee(text: string): {
  annualFee: number | null
  snippet: string | null
} {
  // No annual fee
  const noFeeRe = /no\s+annual\s+fee|\$0\s+annual\s+fee|annual\s+fee:\s*\$0/i
  const noFeeMatch = text.match(noFeeRe)
  if (noFeeMatch) {
    const idx = noFeeMatch.index ?? 0
    return { annualFee: 0, snippet: snippet(text, idx) }
  }

  // $N annual fee / annual fee of $N / annual fee: $N
  const feePatterns: RegExp[] = [
    /\$(\d{1,4})\s+annual\s+fee/i,
    /annual\s+fee\s*(?:of|:)\s*\$(\d{1,4})/i,
    /annual\s+fee\s+is\s+\$(\d{1,4})/i,
  ]
  for (const re of feePatterns) {
    const m = text.match(re)
    if (m) {
      const idx = m.index ?? 0
      return { annualFee: cleanAmount(m[1]), snippet: snippet(text, idx) }
    }
  }
  return { annualFee: null, snippet: null }
}

// ────────── Card name sanity check ──────────

export function checkCardNameOnPage(text: string, cardName: string): boolean {
  // Normalize both sides — strip punctuation, lowercase.
  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
  const normText = normalize(text)
  const normName = normalize(cardName)
  // Need at least two meaningful tokens from the card name to match, to avoid
  // false positives from single-word matches like "Venture" or "Reserve".
  const tokens = normName.split(" ").filter((t) => t.length >= 4)
  if (tokens.length === 0) return normText.includes(normName)
  const hits = tokens.filter((t) => normText.includes(t)).length
  return hits >= Math.min(2, tokens.length)
}

// ────────── Rewards tiers ──────────

export type ExtractedRewardsTier = {
  categories: string[]
  multiplier: number
  unit: "points" | "miles" | "%" | "cashback"
  annual_cap?: number
  note?: string
  raw: string
}

const CATEGORY_TOKENS: Record<string, string> = {
  dining: "dining",
  restaurants: "dining",
  restaurant: "dining",
  grocery: "groceries",
  groceries: "groceries",
  supermarket: "groceries",
  supermarkets: "groceries",
  gas: "gas",
  travel: "travel",
  flights: "travel",
  airfare: "travel",
  hotels: "travel",
  rideshare: "travel",
  uber: "travel",
  lyft: "travel",
  streaming: "streaming",
  "online shopping": "online_shopping",
  everything: "everything_else",
  "all other": "everything_else",
  "other purchases": "everything_else",
}

function normalizeCategory(raw: string): string | null {
  const lc = raw.toLowerCase().trim()
  for (const [k, v] of Object.entries(CATEGORY_TOKENS)) {
    if (lc.includes(k)) return v
  }
  if (/\ball[\s-]*other\b|\bevery\s*thing\b/i.test(raw)) return "everything_else"
  return null
}

/**
 * Extract rewards-earning tiers from an offer page. Captures:
 *   - "3X points on dining"
 *   - "5x Ultimate Rewards on travel"
 *   - "2% cash back on groceries"
 *   - "1x on everything else"
 *
 * Aggressive by design — the spending optimizer will re-score after human review.
 */
export function extractRewardsTiers(text: string): ExtractedRewardsTier[] {
  const results: ExtractedRewardsTier[] = []
  const seen = new Set<string>()

  const multRe = /(\d+(?:\.\d+)?)\s*[xX×]\s+(?:points|miles|[A-Z][A-Za-z ]+?\s+Rewards|total\s+points)?\s*(?:on|in|at|for)\s+([A-Za-z][A-Za-z ,&/-]{2,60}?)(?=[.,;(]|\s+(?:and|when|booked|up\s+to|on\s+the|\())/gi
  let m: RegExpExecArray | null
  while ((m = multRe.exec(text))) {
    const mult = Number(m[1])
    if (!Number.isFinite(mult) || mult < 1 || mult > 20) continue
    const cat = normalizeCategory(m[2])
    if (!cat) continue
    const key = `${mult}:${cat}:pts`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      categories: [cat],
      multiplier: mult,
      unit: /miles/i.test(m[0]) ? "miles" : "points",
      raw: m[0].slice(0, 120),
    })
  }

  const pctRe = /(\d+(?:\.\d+)?)\s*%\s+(?:cash\s+)?back\s+(?:on|in|at|for)\s+([A-Za-z][A-Za-z ,&/-]{2,60}?)(?=[.,;(]|\s+(?:and|when|booked|up\s+to|on\s+the|\())/gi
  while ((m = pctRe.exec(text))) {
    const pct = Number(m[1])
    if (!Number.isFinite(pct) || pct <= 0 || pct > 20) continue
    const cat = normalizeCategory(m[2])
    if (!cat) continue
    const key = `${pct}:${cat}:pct`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      categories: [cat],
      multiplier: pct,
      unit: "%",
      raw: m[0].slice(0, 120),
    })
  }

  return results
}

export function extractAll(text: string, cardName: string): CardExtracted {
  const bonus = extractBonusAmount(text)
  const spend = extractMinSpend(text)
  const fee = extractAnnualFee(text)
  const cardNameOnPage = checkCardNameOnPage(text, cardName)

  const flags: string[] = []
  if (!cardNameOnPage) flags.push("card_name_not_on_page")
  if (bonus.amount === null) flags.push("no_bonus_amount_found")
  if (spend.minSpend === null) flags.push("no_spend_requirement_found")
  if (fee.annualFee === null) flags.push("no_annual_fee_found")

  return {
    bonusAmount: bonus.amount,
    bonusUnit: bonus.unit,
    minSpend: spend.minSpend,
    spendMonths: spend.spendMonths,
    annualFee: fee.annualFee,
    cardNameOnPage,
    snippets: {
      bonusAmount: bonus.snippet,
      minSpend: spend.snippet,
      annualFee: fee.snippet,
    },
    flags,
  }
}
