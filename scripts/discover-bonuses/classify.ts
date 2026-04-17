import Anthropic from "@anthropic-ai/sdk"
import { MAX_CLAUDE_CALLS } from "./env"
import { log } from "./logger"
import type { Classification, ClassifyResult, RawItem } from "./types"

const KW_CC = [
  "credit card",
  "sign-up bonus",
  "sign up bonus",
  "signup bonus",
  "SUB",
  "welcome offer",
  "welcome bonus",
  "annual fee",
  "points",
  "miles",
  "cash back",
  "cashback",
  "statement credit",
  "chase sapphire",
  "amex",
  "american express",
  "capital one venture",
  "citi premier",
]
const KW_BANK = [
  "checking",
  "savings",
  "direct deposit",
  "direct-deposit",
  "dd ",
  "ach",
  "credit union",
  "money market",
]
const KW_BROKERAGE = [
  "brokerage",
  "schwab",
  "fidelity",
  "e*trade",
  "etrade",
  "moomoo",
  "webull",
  "robinhood",
  "tradestation",
  "transfer bonus",
  "ira bonus",
  "roth ira",
]
const CC_ISSUER_DOMAINS = [
  "creditcards.chase.com",
  "americanexpress.com",
  "amex.com",
  "capitalone.com/credit-cards",
  "citi.com/credit-cards",
  "discover.com",
  "barclaycardus.com",
  "wellsfargo.com/credit-cards",
]

function scoreKeywords(text: string, list: string[]): number {
  const t = text.toLowerCase()
  let hits = 0
  for (const kw of list) if (t.includes(kw)) hits++
  return hits
}

export function heuristicClassify(item: RawItem): ClassifyResult {
  const text = [item.title, ...(item.outbound_urls ?? [])].join(" ").toLowerCase()

  const hasIssuerDomain = item.outbound_urls?.some((u) =>
    CC_ISSUER_DOMAINS.some((d) => u.toLowerCase().includes(d)),
  )

  const s_cc = scoreKeywords(text, KW_CC) + (hasIssuerDomain ? 2 : 0)
  const s_bank = scoreKeywords(text, KW_BANK)
  const s_broker = scoreKeywords(text, KW_BROKERAGE)

  const scores: [Classification, number][] = [
    ["credit_card_bonus", s_cc],
    ["bank_account_bonus", s_bank],
    ["brokerage_bonus", s_broker],
  ]
  scores.sort((a, b) => b[1] - a[1])
  const [top, next] = scores

  if (top[1] === 0) {
    return { classification: "other", confidence: 0.2, via: "heuristic", reason: "no keyword hits" }
  }

  // Confident winner: top > 2x next and top >= 2
  if (top[1] >= 2 && top[1] >= next[1] * 2) {
    return {
      classification: top[0],
      confidence: Math.min(0.95, 0.6 + 0.1 * top[1]),
      via: "heuristic",
      reason: `kw_score top=${top[0]}:${top[1]} next=${next[0]}:${next[1]}`,
    }
  }

  // Weakly tilting: confidence moderate; orchestrator may promote to Claude
  return {
    classification: top[0],
    confidence: 0.5,
    via: "heuristic",
    reason: `close call: ${JSON.stringify(scores)}`,
  }
}

// Claude Haiku fallback, budget-limited
let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set; classify() Haiku fallback disabled")
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

let _callsUsed = 0
export function claudeCallsUsed(): number {
  return _callsUsed
}
export function claudeBudgetRemaining(): number {
  return Math.max(0, MAX_CLAUDE_CALLS - _callsUsed)
}

export async function claudeClassify(item: RawItem): Promise<ClassifyResult> {
  if (_callsUsed >= MAX_CLAUDE_CALLS) {
    return { classification: "other", confidence: 0.3, via: "claude", reason: "budget exhausted" }
  }
  const prompt = [
    `Classify the type of bonus offer. Respond with one token on line 1:`,
    `  BANK_ACCOUNT | CREDIT_CARD | BROKERAGE | OTHER`,
    `Then one short sentence of reasoning.`,
    ``,
    `Title: ${item.title}`,
    `Outbound URLs: ${(item.outbound_urls ?? []).slice(0, 3).join(", ")}`,
  ].join("\n")

  try {
    _callsUsed++
    const r = await client().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: "You classify bonus-offer leads tersely. One verdict token + one sentence.",
      messages: [{ role: "user", content: prompt }],
    })
    const text = r.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
    const first = text.split("\n")[0]?.trim().toUpperCase() ?? ""
    let classification: Classification = "other"
    if (first.startsWith("BANK_ACCOUNT")) classification = "bank_account_bonus"
    else if (first.startsWith("CREDIT_CARD")) classification = "credit_card_bonus"
    else if (first.startsWith("BROKERAGE")) classification = "brokerage_bonus"
    const reason = text.split("\n").slice(1).join(" ").trim().slice(0, 200)
    return { classification, confidence: 0.85, via: "claude", reason }
  } catch (err) {
    log("warn", "classify.claude_error", {
      error: err instanceof Error ? err.message : String(err),
    })
    return { classification: "other", confidence: 0.3, via: "claude", reason: "error" }
  }
}

export async function classify(item: RawItem): Promise<ClassifyResult> {
  const h = heuristicClassify(item)
  if (h.confidence >= 0.7) return h
  // Close call — escalate if budget available
  if (process.env.ANTHROPIC_API_KEY && claudeBudgetRemaining() > 0) {
    return claudeClassify(item)
  }
  return h
}
