import type { Extracted } from "./types"

// Each regex returns {value, snippet} so we can pass context to Claude later
type R<T> = { value: T | null; snippet: string | null }

function firstMatch(text: string, re: RegExp): R<string> {
  const m = text.match(re)
  if (!m) return { value: null, snippet: null }
  const idx = m.index ?? 0
  const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
  return { value: m[1] ?? m[0], snippet }
}

function cleanDollars(v: string | null): number | null {
  if (!v) return null
  const n = Number(v.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : null
}

// Phrases that commonly precede dollar amounts on bank pages but are NOT
// bonus amounts — FDIC insurance limits, loan caps, interest accrual caps,
// debit/ATM reward caps, total-deposit thresholds. If the match snippet is
// near any of these, reject the candidate.
const NON_BONUS_PHRASES = [
  /home\s+equity/i,
  /loans?\s+up\s+to/i,
  /mortgage/i,
  /FDIC[-\s]*insured/i,
  /NCUA[-\s]*insured/i,
  /per\s+(?:monthly\s+)?statement/i,
  /per\s+month(?!ly\s+fee)/i,
  /ATM\s+(?:fee|rebate|reimbursement)/i,
  /surcharge[-\s]*free/i,
  /deposit\s+up\s+to/i,
  /balance(?:s)?\s+up\s+to/i,
  /APY\s+(?:on\s+balances?\s+)?up\s+to/i, // "Earn 2.00% APY up to $25,000"
  /dividend(?:s)?\s+up\s+to/i,
  /rewards?\s+up\s+to/i,
  /protection\s+up\s+to/i,
  /credit\s+limit/i,
  /in\s+interest(?:\s+during)?/i,
  /overdraft/i,
]

// A plausible bonus amount: ≥ $25 (smallest common promo), ≤ $25,000 (cap
// above HSBC Premier's ~$7k top tier), divisible by 25 (real promos are
// always round: $100/$250/$325/$500/$750/$1000/$1500/$2000). Footnote-bleed
// values like $5001, $7451, $2001 reliably fail the divisibility check.
function isPlausibleBonusAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) return false
  if (amount < 25 || amount > 25000) return false
  return amount % 25 === 0
}

function isInNonBonusContext(snippet: string | null): boolean {
  if (!snippet) return false
  return NON_BONUS_PHRASES.some((re) => re.test(snippet))
}

// Bonus amount — walk every match across every pattern, drop non-plausible /
// non-bonus-context hits, then return the LARGEST remaining candidate. On
// multi-tier pages the small tier almost always appears first (and previously
// won by walk-order), but the catalog stores the top tier — so first-match
// systematically extracted the wrong number. Largest-match aligns with the
// stored "top tier" convention.
export function extractBonusAmount(text: string): R<number> {
  const patterns = [
    /(?:earn|get|receive|up\s+to|bonus(?:\s+of)?)\s+\$(\d{2,4}(?:,\d{3})?)/i,
    /\$(\d{2,4}(?:,\d{3})?)\s+(?:checking\s+)?(?:cash\s+)?bonus/i,
    /\$(\d{2,4}(?:,\d{3})?)\s+welcome/i,
  ]
  const candidates: Array<{ value: number; snippet: string }> = []
  for (const re of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const idx = m.index
      const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
      const value = cleanDollars(m[1] ?? null)
      if (value === null) continue
      if (!isPlausibleBonusAmount(value)) continue
      if (isInNonBonusContext(snippet)) continue
      candidates.push({ value, snippet })
    }
  }
  if (candidates.length === 0) return { value: null, snippet: null }
  // Largest plausible match — tier pages list ascending or non-monotonic,
  // and the stored value is the headline tier.
  candidates.sort((a, b) => b.value - a.value)
  return { value: candidates[0].value, snippet: candidates[0].snippet }
}

// Direct deposit threshold — tiered offer pages list multiple DD requirements
// (e.g. $3k DD → $200 bonus, $8k DD → $450 bonus). The catalog stores the
// headline tier's threshold, so return the LARGEST plausible value, not the
// first. Cap at $100k to reject footnote-bleed numbers.
export function extractMinDirectDeposit(text: string): R<number> {
  const patterns = [
    /\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?in\s+(?:qualifying\s+)?direct\s+deposits?/i,
    /direct\s+deposits?(?:\s+totaling)?\s+(?:of\s+)?\$(\d[\d,]{2,6})/i,
    /(?:receive|with)\s+(?:a\s+)?direct\s+deposit(?:s)?\s+of\s+\$(\d[\d,]{2,6})/i,
    /minimum\s+(?:cumulative\s+)?direct\s+deposit\s+of\s+\$(\d[\d,]{2,6})/i,
  ]
  const candidates: Array<{ value: number; snippet: string }> = []
  for (const re of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const idx = m.index
      const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
      const value = cleanDollars(m[1] ?? null)
      if (value === null) continue
      if (value < 100 || value > 100_000) continue
      candidates.push({ value, snippet })
    }
  }
  if (candidates.length === 0) return { value: null, snippet: null }
  candidates.sort((a, b) => b.value - a.value)
  return { value: candidates[0].value, snippet: candidates[0].snippet }
}

// Deposit window — pages sometimes list multiple ("fund within 10 days" AND
// "direct deposits within 90 days of opening"). The catalog stores the actual
// qualification deadline (the larger window), so return the LARGEST plausible.
// Cap at 365 days to reject footnote noise.
export function extractDepositWindowDays(text: string): R<number> {
  const patterns: Array<[RegExp, (m: RegExpExecArray) => number]> = [
    [/within\s+(\d{1,3})\s+days/i, (m) => Number(m[1])],
    [/within\s+(\d{1,2})\s+months/i, (m) => Number(m[1]) * 30],
    [/in\s+the\s+first\s+(\d{1,3})\s+days/i, (m) => Number(m[1])],
    [/(\d{1,3})-day\s+(?:qualification|funding)/i, (m) => Number(m[1])],
  ]
  const candidates: Array<{ value: number; snippet: string }> = []
  for (const [re, fn] of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const idx = m.index
      const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
      const value = fn(m)
      if (!Number.isFinite(value) || value <= 0 || value > 365) continue
      candidates.push({ value, snippet })
    }
  }
  if (candidates.length === 0) return { value: null, snippet: null }
  candidates.sort((a, b) => b.value - a.value)
  return { value: candidates[0].value, snippet: candidates[0].snippet }
}

// Phrases that, when they appear within ~80 chars AFTER "no monthly fee",
// indicate the $0 fee is conditional. Bank pages overwhelmingly write
// "no monthly fee with one of the following", "no fee when you...", etc.
// The unconditional fee is whatever the page lists as the structural charge.
const CONDITIONAL_FEE_FOLLOWERS = [
  /\s+with\s+/i,
  /\s+when\s+/i,
  /\s+if\s+/i,
  /\s+provided\s+/i,
  /\s+as\s+long\s+as/i,
  /\s+(?:waiv(?:ed|able))/i,
  /\s+by\s+(?:maintaining|having|enrolling)/i,
  /\s+(?:upon|after)\s+(?:opening|enrollment)/i,
]

function isConditionalNoFee(text: string, matchIdx: number, matchLen: number): boolean {
  const tail = text.slice(matchIdx + matchLen, matchIdx + matchLen + 80)
  return CONDITIONAL_FEE_FOLLOWERS.some((re) => re.test(tail))
}

// Phrases that, when they appear within ~30 chars BEFORE a "$X monthly fee"
// match, mean the $X is a balance threshold for waiving the fee, not the fee
// itself. (BMO bug: "Average Collected Balance needed to waive monthly
// maintenance fee $100 $1,500 …" — the $100 is a waiver threshold.)
function isFeeMatchActuallyAWaiver(text: string, matchIdx: number): boolean {
  const lead = text.slice(Math.max(0, matchIdx - 60), matchIdx).toLowerCase()
  if (/\bwaive[d]?\b/.test(lead)) return true
  if (/\bbalance\s+needed\b/.test(lead)) return true
  if (/\bminimum\s+(?:balance|deposit)\b/.test(lead)) return true
  return false
}

export function extractMonthlyFee(text: string): R<number> {
  // Two pattern classes. Only the "fee-then-$" class is vulnerable to the
  // waiver-threshold ambiguity ("waive monthly fee $100 $1,500..." where $100
  // is the threshold, not the fee). "$X monthly fee" patterns are always the
  // fee itself even when nearby text mentions "waive".
  const dollarBeforePatterns = [
    /\$(\d{1,3}(?:\.\d{2})?)\s+monthly\s+(?:service\s+|maintenance\s+)?fee/i,
  ]
  const dollarAfterPatterns = [
    /monthly\s+(?:service\s+|maintenance\s+)?fee(?:\s+of)?\s+\$(\d{1,3}(?:\.\d{2})?)/i,
    // "Monthly Service Fee1 $15" — Chase-style header with footnote between fee word and price.
    /monthly\s+(?:service\s+|maintenance\s+)?fee[^\n$]{0,6}\$(\d{1,3}(?:\.\d{2})?)/i,
  ]
  const candidates: Array<{ value: number; snippet: string }> = []
  function pushMatches(re: RegExp, applyWaiverFilter: boolean) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const idx = m.index
      const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
      const value = cleanDollars(m[1] ?? null)
      if (value === null) continue
      // Real monthly maintenance fees top out around $35. A "$150/$300/$500
      // monthly fee" is almost always a misread of a neighboring funding-cap /
      // minimum-balance column in a comparison table — the exact bug that once
      // wrote a $500 fee into lib/data. Drop implausible values outright.
      if (value > 50) continue
      if (applyWaiverFilter && isFeeMatchActuallyAWaiver(text, idx)) continue
      candidates.push({ value, snippet })
    }
  }
  // Apply the waiver/threshold filter to BOTH pattern classes. The "$X monthly
  // fee" (dollar-before) class was previously trusted unconditionally, but it
  // also catches "...needed to waive monthly maintenance fee $100..." style
  // threshold columns, so it needs the same lead-text guard.
  for (const re of dollarBeforePatterns) pushMatches(re, true)
  for (const re of dollarAfterPatterns) pushMatches(re, true)

  // Then check "no monthly fee" — but only treat it as authoritative $0 if it
  // ISN'T immediately followed by a conditional clause. If conditional + we
  // have a dollar candidate, prefer the dollar value (it's the unconditional fee).
  const noFeeRe = /no\s+monthly\s+(service\s+|maintenance\s+)?fee/gi
  let noFeeMatch: RegExpExecArray | null
  while ((noFeeMatch = noFeeRe.exec(text)) !== null) {
    const idx = noFeeMatch.index
    const snippet = text.slice(Math.max(0, idx - 60), idx + 120)
    if (!isConditionalNoFee(text, idx, noFeeMatch[0].length)) {
      // Unconditional — $0 wins unless we already have a non-zero candidate
      // that the regex above caught on the same page (sometimes "no monthly fee
      // for the first year, then $12/mo" — keep the structural fee).
      if (candidates.length === 0) return { value: 0, snippet }
      // Mixed signal: log $0 as a candidate, then fall through to selection.
      candidates.push({ value: 0, snippet })
    }
    // If conditional, skip — we want the structural fee, not the waiver.
  }

  // Canonical "Monthly fee(s): None / $0 / N/A" phrasing — the word order
  // differs from "no monthly fee" so the loop above misses it. Only treat as an
  // authoritative $0 when no positive fee candidate survived above.
  if (candidates.length === 0) {
    const zeroRe = /monthly\s+(?:service\s+|maintenance\s+)?fees?\s*[:\-]?\s*(?:none|n\/?a|\$?0(?:\.00)?)\b/i
    const zm = zeroRe.exec(text)
    if (zm) {
      const idx = zm.index
      return { value: 0, snippet: text.slice(Math.max(0, idx - 40), idx + 80) }
    }
  }

  if (candidates.length === 0) return { value: null, snippet: null }
  // Prefer the largest fee if there are multiple — captures the unwaived rate
  // and avoids picking the $0 waiver branch.
  candidates.sort((a, b) => b.value - a.value)
  return { value: candidates[0].value, snippet: candidates[0].snippet }
}

export function extractExpirationDate(text: string): R<string> {
  const re =
    /(?:offer\s+)?expires?\s+(?:on\s+)?(?:[a-z]+\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i
  return firstMatch(text, re)
}

export function hasExpiredText(text: string): boolean {
  return (
    /this\s+offer\s+(?:has\s+)?expired/i.test(text) ||
    /no\s+longer\s+available/i.test(text) ||
    /promotion\s+has\s+ended/i.test(text)
  )
}

export function extract(text: string): Extracted {
  const bonus = extractBonusAmount(text)
  const dd = extractMinDirectDeposit(text)
  const window = extractDepositWindowDays(text)
  const fee = extractMonthlyFee(text)
  const exp = extractExpirationDate(text)

  return {
    bonusAmount: bonus.value,
    minDirectDepositTotal: dd.value,
    depositWindowDays: window.value,
    monthlyFee: fee.value,
    expiredText: hasExpiredText(text),
    expiresDate: exp.value,
    rawSnippets: {
      bonusAmount: bonus.snippet,
      minDirectDepositTotal: dd.snippet,
      depositWindowDays: window.snippet,
      monthlyFee: fee.snippet,
      expiresDate: exp.snippet,
    },
  }
}
