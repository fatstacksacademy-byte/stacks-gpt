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
  /** Intro 0% APR terms — populated when the page advertises one. */
  introApr: ExtractedIntroApr | null
  /** Whether the card name appears on the page at all. False = suspicious. */
  cardNameOnPage: boolean
  /**
   * Page advertises a free-night / anniversary-night certificate. These cards
   * store a SYNTHETIC bonus_amount (e.g. 250,000 = value of multiple free
   * nights) while the page only shows a lower per-night points cap. Never
   * auto-propose downgrading the stored value for these — route to a human.
   */
  freeNight: boolean
  /** Raw snippets for each match so callers can display context. */
  snippets: {
    bonusAmount: string | null
    minSpend: string | null
    annualFee: string | null
    introApr: string | null
  }
  /** Flags discovered during extraction. */
  flags: string[]
}

export type ExtractedIntroApr = {
  purchaseAprMonths: number | null
  btAprMonths: number | null
  btFeePct: number | null
  goToAprLow: number | null
  goToAprHigh: number | null
}

function snippet(text: string, idx: number, radius = 100): string {
  return text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + radius))
}

function cleanAmount(raw: string): number | null {
  const n = Number(raw.replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : null
}

// ────────── Bonus amount (points / miles / dollars) ──────────

// Card welcome bonuses are heavily tiered ("60K after $3K in 3mo OR 80K after
// $4K in 6mo"). Catalogs store the HEADLINE tier; first-match systematically
// pulled the worst. We walk every candidate and return the LARGEST plausible.
function isPlausiblePointsBonus(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 1000 && amount <= 500_000
}
function isPlausibleCashBonus(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 50 && amount <= 5000
}

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
    {
      // Branded hotel/airline currencies. ~40 co-brand cards (Hilton, Marriott,
      // Hyatt, IHG, Delta, AA, JetBlue, Southwest, United, Aeroplan, BA Avios…)
      // never matched the generic "points|miles" patterns and silently extracted
      // NOTHING — they showed up as no_fields_extracted instead of being verified.
      re: /\b(?:earn\s+)?(\d{1,3}(?:,\d{3})*)\s+(?:bonus\s+)?(Hilton\s+Honors(?:\s+Bonus)?\s+[Pp]oints|Marriott\s+Bonvoy(?:\s+Bonus)?\s+[Pp]oints|Bonvoy(?:\s+Bonus)?\s+[Pp]oints|World\s+of\s+Hyatt\s+[Pp]oints|Hyatt\s+[Pp]oints|IHG\s+One\s+Rewards(?:\s+Bonus)?\s+[Pp]oints|Choice\s+Privileges(?:\s+Bonus)?\s+[Pp]oints|Wyndham\s+Rewards\s+[Pp]oints|AAdvantage(?:\s+[Bb]onus)?\s+miles|SkyMiles|TrueBlue\s+[Pp]oints|Rapid\s+Rewards\s+(?:Bonus\s+)?[Pp]oints|MileagePlus(?:\s+bonus)?\s+miles|Aeroplan\s+[Pp]oints|Avios)/i,
      amountIdx: 1,
      unitIdx: 2,
    },
  ]
  const pointsCandidates: Array<{ amount: number; unit: string; snippet: string }> = []
  for (const p of pointsPatterns) {
    const globalRe = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const amount = cleanAmount(m[p.amountIdx])
      if (amount === null) continue
      if (!isPlausiblePointsBonus(amount)) continue
      pointsCandidates.push({
        amount,
        unit: m[p.unitIdx].toLowerCase().replace(/\s+/g, " "),
        snippet: snippet(text, m.index),
      })
    }
  }
  if (pointsCandidates.length > 0) {
    pointsCandidates.sort((a, b) => b.amount - a.amount)
    const top = pointsCandidates[0]
    return { amount: top.amount, unit: top.unit, snippet: top.snippet }
  }

  // Cash bonus — "$300 cash back bonus", "earn $200", "$1,000 welcome bonus"
  // Allow any number of digits (with optional comma groups) so $1,000 and
  // $10,000+ don't silently fail. cleanAmount strips commas before parsing.
  const dollarPatterns: RegExp[] = [
    /\bearn\s+\$(\d+(?:,\d{3})*)\s+(?:cash\s+)?(?:back\s+)?bonus/i,
    /\$(\d+(?:,\d{3})*)\s+(?:cash\s+)?(?:back\s+)?(?:welcome\s+)?bonus/i,
    /\bearn\s+\$(\d+(?:,\d{3})*)\s+when\s+you\s+spend/i,
    // Standard Citi/Chase/Discover cash phrasing — "$200 cash back after you
    // spend $1,500", "earn $200 statement credit". 155 cash cards used this
    // wording and extracted nothing before.
    /\$(\d+(?:,\d{3})*)\s+(?:cash\s*back|statement\s+credit)\s+after\s+(?:you\s+)?spend/i,
    /\bearn\s+\$(\d+(?:,\d{3})*)\s+(?:cash\s*back|statement\s+credit)/i,
    /\$(\d+(?:,\d{3})*)\s+back\s+after\s+(?:you\s+)?spend/i,
  ]
  const dollarCandidates: Array<{ amount: number; snippet: string }> = []
  for (const re of dollarPatterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const amount = cleanAmount(m[1])
      if (amount === null) continue
      if (!isPlausibleCashBonus(amount)) continue
      dollarCandidates.push({ amount, snippet: snippet(text, m.index) })
    }
  }
  if (dollarCandidates.length > 0) {
    dollarCandidates.sort((a, b) => b.amount - a.amount)
    const top = dollarCandidates[0]
    return { amount: top.amount, unit: "$", snippet: top.snippet }
  }
  return { amount: null, unit: null, snippet: null }
}

// ────────── Minimum spend + window ──────────

// Cards with tiered welcome bonuses pair each tier with its own spend
// requirement: "$3,000 in 3 months" → 60K, "$4,000 in 6 months" → 80K.
// Catalog stores the spend tied to the HEADLINE bonus, which is usually
// the LARGEST spend requirement on the page. Walk all candidates, keep
// the largest spend (and its paired month window).
export function extractMinSpend(text: string): {
  minSpend: number | null
  spendMonths: number | null
  snippet: string | null
} {
  // Two patterns of windows we accept: "X months" and "X days".
  // BofA / Citi / some Capital One cards use "within the first 90 days"
  // instead of "in 3 months" — convert by dividing by 30 (rounded).
  const monthsPatterns: RegExp[] = [
    /\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?(?:on\s+purchases?\s+)?(?:in|within)\s+(?:the\s+first\s+)?(\d{1,2})\s+months/i,
    /spend\s+\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?(?:on\s+purchases?\s+)?in\s+(?:the\s+first\s+)?(\d{1,2})\s+months/i,
    /after\s+spending\s+\$(\d[\d,]{2,6})\s+(?:in|within)\s+(\d{1,2})\s+months/i,
  ]
  const daysPatterns: RegExp[] = [
    /\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?(?:on\s+purchases?\s+)?(?:in|within)\s+(?:the\s+first\s+)?(\d{2,3})\s+days/i,
    /spend\s+\$(\d[\d,]{2,6})\s+(?:or\s+more\s+)?(?:on\s+purchases?\s+)?(?:in|within)\s+(?:the\s+first\s+)?(\d{2,3})\s+days/i,
  ]
  const candidates: Array<{ spend: number; months: number; snippet: string }> = []
  function pushMatch(spend: number | null, months: number, idx: number) {
    if (spend === null || !Number.isFinite(months)) return
    if (spend < 500 || spend > 50_000) return
    if (months < 1 || months > 18) return
    candidates.push({ spend, months, snippet: snippet(text, idx) })
  }
  for (const re of monthsPatterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      pushMatch(cleanAmount(m[1]), Number(m[2]), m.index)
    }
  }
  for (const re of daysPatterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const days = Number(m[2])
      if (!Number.isFinite(days) || days < 30 || days > 360) continue
      // 90 days → 3 months; 60 → 2; 120 → 4. Round to the nearest month.
      const months = Math.max(1, Math.round(days / 30))
      pushMatch(cleanAmount(m[1]), months, m.index)
    }
  }
  if (candidates.length === 0) return { minSpend: null, spendMonths: null, snippet: null }
  candidates.sort((a, b) => b.spend - a.spend)
  const top = candidates[0]
  return { minSpend: top.spend, spendMonths: top.months, snippet: top.snippet }
}

// ────────── Annual fee ──────────

// "No annual fee" is sometimes conditional ("no annual fee the first year",
// "no annual fee with a Chase deposit account"). When followed by a temporal
// or conditional clause within ~80 chars, the actual fee is whatever the page
// lists structurally — we shouldn't return $0.
const CONDITIONAL_NO_FEE_FOLLOWERS = [
  /\s+(?:the\s+)?first\s+year/i,
  /\s+(?:the\s+)?intro(?:ductory)?\s+(?:period|year)/i,
  /\s+with\s+/i,
  /\s+when\s+/i,
  /\s+if\s+/i,
  /\s+for\s+(?:the\s+first|qualifying|eligible)/i,
  /\s+as\s+long\s+as/i,
]

function isConditionalNoAnnualFee(text: string, idx: number, len: number): boolean {
  const tail = text.slice(idx + len, idx + len + 80)
  return CONDITIONAL_NO_FEE_FOLLOWERS.some((re) => re.test(tail))
}

export function extractAnnualFee(text: string): {
  annualFee: number | null
  snippet: string | null
} {
  // Collect every dollar-fee candidate first.
  const feePatterns: RegExp[] = [
    /\$(\d+(?:,\d{3})*)\s+annual\s+fee/i,
    /annual\s+fee\s*(?:of|:)\s*\$(\d+(?:,\d{3})*)/i,
    /annual\s+fee\s+is\s+\$(\d+(?:,\d{3})*)/i,
  ]
  const candidates: Array<{ amount: number; snippet: string }> = []
  for (const re of feePatterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")
    let m: RegExpExecArray | null
    while ((m = globalRe.exec(text)) !== null) {
      const amount = cleanAmount(m[1])
      if (amount === null) continue
      if (amount > 1000) continue // implausible — likely a balance / cap
      candidates.push({ amount, snippet: snippet(text, m.index) })
    }
  }

  // "$0 annual fee" / "annual fee: $0" are explicit unconditional zeros.
  const explicitZero = text.match(/\$0\s+annual\s+fee|annual\s+fee:\s*\$0/i)
  if (explicitZero && candidates.length === 0) {
    return { annualFee: 0, snippet: snippet(text, explicitZero.index ?? 0) }
  }

  // "No annual fee" — only treat as $0 if not immediately conditional.
  const noFeeRe = /no\s+annual\s+fee/gi
  let nm: RegExpExecArray | null
  while ((nm = noFeeRe.exec(text)) !== null) {
    if (isConditionalNoAnnualFee(text, nm.index, nm[0].length)) continue
    if (candidates.length === 0) return { annualFee: 0, snippet: snippet(text, nm.index) }
    candidates.push({ amount: 0, snippet: snippet(text, nm.index) })
  }

  if (candidates.length === 0) return { annualFee: null, snippet: null }
  // Prefer largest non-zero fee — captures the structural rate over a waiver branch.
  candidates.sort((a, b) => b.amount - a.amount)
  return { annualFee: candidates[0].amount, snippet: candidates[0].snippet }
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

// ────────── 0% Intro APR ──────────

/**
 * Pull intro 0% APR terms from an issuer offer page.
 *
 * Patterns we match (case-insensitive, all whitespace-tolerant):
 *   - "0% intro APR for 15 months on purchases"
 *   - "0% intro APR for the first 21 months from account opening on
 *      balance transfers"
 *   - "0% intro APR on purchases and balance transfers for 15 months"
 *   - "Intro APR: 0% for 18 months"
 *
 * Plus the post-intro variable APR (range or single rate):
 *   - "then a variable APR of 18.24% to 28.24%"
 *   - "after that, your APR will be 19.99% variable"
 *
 * And the balance-transfer fee:
 *   - "intro balance transfer fee of 3% of the amount transferred"
 *   - "5% balance transfer fee"
 *
 * Returns `null` when no recognizable intro term appears — the catalog
 * already treats `intro_apr` as absent in that case.
 */
export function extractIntroApr(text: string): {
  intro: ExtractedIntroApr | null
  snippet: string | null
} {
  const lower = text.toLowerCase()
  // Cheap reject: every meaningful pattern includes "0%".
  if (!/\b0%\s*(?:intro\s*)?apr/i.test(text)) {
    return { intro: null, snippet: null }
  }

  let purchaseAprMonths: number | null = null
  let btAprMonths: number | null = null
  let foundIdx = -1

  // Combined "purchases and balance transfers for X months" — fills both.
  const combinedRe =
    /0%\s*(?:intro\s+)?apr[^.]{0,80}?on\s+purchases\s+and\s+balance\s+transfers[^.]{0,40}?for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?/i
  const combined = combinedRe.exec(text)
  if (combined) {
    purchaseAprMonths = btAprMonths = Number(combined[1])
    foundIdx = combined.index
  }

  // Purchases-only ("for X months on purchases" OR "on purchases for X months").
  if (purchaseAprMonths === null) {
    const re =
      /0%\s*(?:intro\s+)?apr[^.]{0,80}?(?:(?:for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?[^.]{0,40}?on\s+purchases)|(?:on\s+purchases[^.]{0,40}?for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?))/i
    const m = re.exec(text)
    if (m) {
      purchaseAprMonths = Number(m[1] ?? m[2])
      foundIdx = foundIdx < 0 ? m.index : foundIdx
    }
  }

  // BT-only ("for X months on balance transfers" OR "on balance transfers for X months").
  if (btAprMonths === null) {
    const re =
      /0%\s*(?:intro\s+)?apr[^.]{0,80}?(?:(?:for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?[^.]{0,40}?on\s+balance\s+transfers)|(?:on\s+balance\s+transfers[^.]{0,40}?for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?))/i
    const m = re.exec(text)
    if (m) {
      btAprMonths = Number(m[1] ?? m[2])
      foundIdx = foundIdx < 0 ? m.index : foundIdx
    }
  }

  // Generic "0% APR for X months" with no purchases/BT qualifier — assume purchases.
  if (purchaseAprMonths === null && btAprMonths === null) {
    const re = /0%\s*(?:intro\s+)?apr[^.]{0,40}?for\s+(?:the\s+first\s+)?(\d{1,2})\s+months?/i
    const m = re.exec(text)
    if (m) {
      purchaseAprMonths = Number(m[1])
      foundIdx = m.index
    }
  }

  if (purchaseAprMonths === null && btAprMonths === null) {
    return { intro: null, snippet: null }
  }

  // Post-intro "go-to" APR: range or single.
  let goToAprLow: number | null = null
  let goToAprHigh: number | null = null
  const rangeRe =
    /(?:then|after\s+that(?:,)?\s+your\s+apr\s+will\s+be|standard\s+(?:variable\s+)?apr\s+of|variable\s+apr\s+of)\s+(\d{1,2}\.\d{1,2})%\s+(?:to|-|–|—)\s+(\d{1,2}\.\d{1,2})%/i
  const range = rangeRe.exec(text)
  if (range) {
    goToAprLow = Number(range[1])
    goToAprHigh = Number(range[2])
  } else {
    const singleRe =
      /(?:then|after\s+that(?:,)?\s+your\s+apr\s+will\s+be)\s+(?:a\s+)?(?:variable\s+)?(\d{1,2}\.\d{1,2})%/i
    const single = singleRe.exec(text)
    if (single) {
      goToAprLow = goToAprHigh = Number(single[1])
    }
  }

  // Balance-transfer fee — only meaningful when BT intro exists, but we
  // capture it whenever it appears (the field is shared on the type).
  let btFeePct: number | null = null
  const btFeeRe =
    /(?:intro\s+)?balance\s+transfer\s+fee\s+of\s+(\d{1,2}(?:\.\d{1,2})?)%/i
  const btFee = btFeeRe.exec(text)
  if (btFee) {
    btFeePct = Number(btFee[1])
  } else {
    // Lighter pattern: "$5 or 3% of the amount" — capture the percent.
    const alt = /(\d{1,2}(?:\.\d{1,2})?)%\s+balance\s+transfer\s+fee/i.exec(text)
    if (alt) btFeePct = Number(alt[1])
  }

  // Sanity bounds.
  if (purchaseAprMonths !== null && (purchaseAprMonths < 3 || purchaseAprMonths > 24)) {
    purchaseAprMonths = null
  }
  if (btAprMonths !== null && (btAprMonths < 3 || btAprMonths > 24)) {
    btAprMonths = null
  }

  if (purchaseAprMonths === null && btAprMonths === null) {
    return { intro: null, snippet: null }
  }

  const snippetIdx = foundIdx >= 0 ? foundIdx : lower.indexOf("0%")
  return {
    intro: {
      purchaseAprMonths,
      btAprMonths,
      btFeePct,
      goToAprLow,
      goToAprHigh,
    },
    snippet: snippet(text, snippetIdx, 200),
  }
}

export function extractAll(text: string, cardName: string): CardExtracted {
  const bonus = extractBonusAmount(text)
  const spend = extractMinSpend(text)
  const fee = extractAnnualFee(text)
  const intro = extractIntroApr(text)
  const cardNameOnPage = checkCardNameOnPage(text, cardName)
  const freeNight =
    /free\s+night|night\s+award|anniversary\s+night|annual\s+(?:free\s+)?night|category\s+\d\s+(?:free\s+)?night|free\s+(?:weekend\s+)?night\s+certificate/i.test(
      text,
    )

  const flags: string[] = []
  if (!cardNameOnPage) flags.push("card_name_not_on_page")
  if (bonus.amount === null) flags.push("no_bonus_amount_found")
  if (spend.minSpend === null) flags.push("no_spend_requirement_found")
  if (fee.annualFee === null) flags.push("no_annual_fee_found")
  if (freeNight) flags.push("free_night_card")

  return {
    bonusAmount: bonus.amount,
    bonusUnit: bonus.unit,
    minSpend: spend.minSpend,
    spendMonths: spend.spendMonths,
    annualFee: fee.annualFee,
    introApr: intro.intro,
    cardNameOnPage,
    freeNight,
    snippets: {
      bonusAmount: bonus.snippet,
      minSpend: spend.snippet,
      annualFee: fee.snippet,
      introApr: intro.snippet,
    },
    flags,
  }
}
