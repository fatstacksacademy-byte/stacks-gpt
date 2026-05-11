/**
 * Shared regex extractors for bank-promo pages.
 * Used by both verify-bonuses (compare against stored) and discover-bonuses (enrich lead).
 */

export type ExtractedFields = {
  bonusAmount: number | null
  minDirectDepositTotal: number | null
  depositWindowDays: number | null
  monthlyFee: number | null
  expiredText: boolean
  expiresDate: string | null
  snippets: Record<string, string | null>
}

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
  /per\s+month(?!ly\s+fee)/i, // "$25 per month" but not "per monthly fee"
  /ATM\s+(?:fee|rebate|reimbursement)/i,
  /surcharge[-\s]*free/i,
  /deposit\s+up\s+to/i, // "Deposit up to $200,000" — that's a cap, not a bonus
  /balance(?:s)?\s+up\s+to/i, // "Earn X% APY up to $25,000"
  /protection\s+up\s+to/i,
  /credit\s+limit/i,
  /in\s+interest(?:\s+during)?/i, // "earn up to $7451 in interest"
  /cash\s+back(?:\s+up\s+to)?/i,
  /overdraft/i,
]

// A plausible bonus amount: ≥ $25 (smallest common promo), ≤ $25,000
// (largest real-world bank bonus is HSBC Premier at ~$7k; cap generously),
// and divisible by 25. Real promos are always round: $100, $250, $300, $325,
// $400, $500, $750, $1000, $1500, $2000, $2500, etc. Footnote-bleed amounts
// like $5001, $7451, $2001 are reliably rejected by the divisibility check.
function isPlausibleBonusAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) return false
  if (amount < 25 || amount > 25000) return false
  return amount % 25 === 0
}

function isInNonBonusContext(snippet: string | null): boolean {
  if (!snippet) return false
  return NON_BONUS_PHRASES.some((re) => re.test(snippet))
}

export function extractBonusAmount(text: string): R<number> {
  const patterns = [
    /(?:earn|get|receive|up\s+to|bonus(?:\s+of)?)\s+\$(\d{2,4}(?:,\d{3})?)/i,
    /\$(\d{2,4}(?:,\d{3})?)\s+(?:checking\s+)?(?:cash\s+)?bonus/i,
    /\$(\d{2,4}(?:,\d{3})?)\s+welcome/i,
  ]
  // Collect every candidate match in the document, then keep the first that
  // passes plausibility + context checks. A single regex .match() only returns
  // the earliest match, so we'd stop at the first noise-y amount on the page.
  const candidates: Array<{ value: number; snippet: string }> = []
  for (const re of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const idx = m.index
      const snippet = text.slice(Math.max(0, idx - 80), Math.min(text.length, idx + 160))
      const value = cleanDollars(m[1] ?? null)
      if (value === null) continue
      candidates.push({ value, snippet })
    }
  }
  for (const c of candidates) {
    if (!isPlausibleBonusAmount(c.value)) continue
    if (isInNonBonusContext(c.snippet)) continue
    return { value: c.value, snippet: c.snippet }
  }
  return { value: null, snippet: null }
}

export function extractMinDirectDeposit(text: string): R<number> {
  const patterns = [
    /\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?in\s+(?:qualifying\s+)?direct\s+deposits?/i,
    /direct\s+deposits?(?:\s+totaling)?\s+(?:of\s+)?\$(\d[\d,]{2,6})/i,
    /(?:receive|with)\s+(?:a\s+)?direct\s+deposit(?:s)?\s+of\s+\$(\d[\d,]{2,6})/i,
    /minimum\s+(?:cumulative\s+)?direct\s+deposit\s+of\s+\$(\d[\d,]{2,6})/i,
  ]
  for (const re of patterns) {
    const r = firstMatch(text, re)
    if (r.value) return { value: cleanDollars(r.value), snippet: r.snippet }
  }
  return { value: null, snippet: null }
}

export function extractDepositWindowDays(text: string): R<number> {
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => number]> = [
    [/within\s+(\d{1,3})\s+days/i, (m) => Number(m[1])],
    [/within\s+(\d{1,2})\s+months/i, (m) => Number(m[1]) * 30],
    [/in\s+the\s+first\s+(\d{1,3})\s+days/i, (m) => Number(m[1])],
    [/(\d{1,3})-day\s+(?:qualification|funding)/i, (m) => Number(m[1])],
  ]
  for (const [re, fn] of patterns) {
    const m = text.match(re)
    if (m) {
      const idx = m.index ?? 0
      const snippet = text.slice(Math.max(0, idx - 80), idx + 160)
      return { value: fn(m), snippet }
    }
  }
  return { value: null, snippet: null }
}

export function extractMonthlyFee(text: string): R<number> {
  if (/no\s+monthly\s+(service\s+|maintenance\s+)?fee/i.test(text)) {
    const m = text.match(/no\s+monthly\s+(service\s+|maintenance\s+)?fee/i)
    const idx = m?.index ?? 0
    return { value: 0, snippet: text.slice(Math.max(0, idx - 60), idx + 120) }
  }
  const patterns = [
    /\$(\d{1,3})(?:\.\d{2})?\s+monthly\s+(?:service\s+|maintenance\s+)?fee/i,
    /monthly\s+(?:service\s+|maintenance\s+)?fee(?:\s+of)?\s+\$(\d{1,3})/i,
  ]
  for (const re of patterns) {
    const r = firstMatch(text, re)
    if (r.value) return { value: cleanDollars(r.value), snippet: r.snippet }
  }
  return { value: null, snippet: null }
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

// US state codes / names for extracting state availability from free text
const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
]

export function extractStates(text: string): string[] {
  if (/nationwide|all\s+50\s+states|available\s+in\s+all\s+states/i.test(text)) {
    return ["Nationwide (U.S.)"]
  }
  const found = new Set<string>()
  // 2-letter codes appearing in obvious state list contexts (comma-separated or in a "states" phrase)
  const listRe = /(?:states?\s*(?:allowed|eligible|available|restricted to|:)?\s*)((?:[A-Z]{2}[,\s]+){2,}[A-Z]{2})/i
  const m = text.match(listRe)
  if (m) {
    for (const code of m[1].split(/[^A-Z]+/)) {
      if (STATE_CODES.includes(code)) found.add(code)
    }
  }
  return Array.from(found)
}

export function extractAll(text: string): ExtractedFields {
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
    snippets: {
      bonusAmount: bonus.snippet,
      minDirectDepositTotal: dd.snippet,
      depositWindowDays: window.snippet,
      monthlyFee: fee.snippet,
      expiresDate: exp.snippet,
    },
  }
}
