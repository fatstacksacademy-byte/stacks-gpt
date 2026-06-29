/**
 * Auto-triage adjudicator — the judgment layer.
 *
 * Given a queue item (a new discovery lead OR a verify mismatch) plus the live
 * offer-page text, Claude returns a structured verdict:
 *   - dismiss  : false positive / not a real SUB / expired / extractor misread.
 *                Safe — never changes the catalog, just clears the queue.
 *   - approve  : real + the page confirms it. For a mismatch it carries the
 *                corrected value. Flows into the daily review PR.
 *   - escalate : genuinely ambiguous or the page didn't help — leave for a human.
 *
 * Conservative by design: the bar for "approve" is high (page must clearly
 * confirm), the bar for "dismiss" only needs clear evidence it's noise, and
 * anything uncertain becomes "escalate". The catalog gate stays credible.
 */
import Anthropic from "@anthropic-ai/sdk"

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set — auto-triage cannot run.")
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

// Haiku is the default (cheap, high-volume). The conservative thresholds + the
// daily-PR checkpoint are the real safety net, not the model tier. Override with
// AUTO_TRIAGE_MODEL (e.g. a Sonnet id) if you want stronger judgment on approves.
const MODEL = process.env.AUTO_TRIAGE_MODEL || "claude-haiku-4-5-20251001"

export type Verdict = {
  decision: "approve" | "dismiss" | "escalate"
  confidence: "high" | "medium" | "low"
  reason: string
  /** For mismatch approves: the value the catalog should hold (per the page). */
  corrected_value?: string | number | boolean | null
}

// Forced structured output. tool_choice makes the model return its verdict as a
// schema-validated tool call, so "unparseable JSON" is impossible (it was the #1
// cause of bogus escalations — text JSON kept truncating / wrapping in prose).
const VERDICT_TOOL: Anthropic.Tool = {
  name: "record_verdict",
  description: "Record your adjudication verdict for this item.",
  input_schema: {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["approve", "dismiss", "escalate"] },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      reason: { type: "string", description: "One short sentence." },
      corrected_value: {
        description: "For an approve: the page-confirmed correct value. Otherwise null.",
      },
    },
    required: ["decision", "confidence", "reason"],
  },
}

async function ask(system: string, user: string): Promise<Verdict> {
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    tools: [VERDICT_TOOL],
    tool_choice: { type: "tool", name: "record_verdict" },
    messages: [{ role: "user", content: user }],
  })
  const tu = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
  if (!tu) return { decision: "escalate", confidence: "low", reason: "no tool_use in model response" }
  const o = tu.input as Record<string, unknown>
  const decision = o.decision === "approve" || o.decision === "dismiss" ? o.decision : "escalate"
  const confidence = o.confidence === "high" || o.confidence === "medium" ? o.confidence : "low"
  return {
    decision,
    confidence,
    reason: typeof o.reason === "string" ? o.reason.slice(0, 280) : "",
    corrected_value: (o.corrected_value as Verdict["corrected_value"]) ?? undefined,
  }
}

const PAGE_CAP = 6000 // chars of page text we feed the model

/** Adjudicate a NEW discovery lead: is this a real, current signup bonus to add? */
export async function adjudicateLead(input: {
  kind: "bonus" | "card"
  institution: string | null
  name: string
  bonus_amount: number | null
  classification: string | null
  pageOk: boolean
  pageText: string
  finalUrl: string
}): Promise<Verdict> {
  const system =
    "You vet leads for a bank/credit-card/brokerage SIGNUP-BONUS catalog. You are strict: only real, currently-available account-opening or card-signup bonuses belong. Reject Amex Offers, shopping/gift-card deals, rewards-portal promos, news roundups, and anything expired or unconfirmed by the page. Respond with ONLY a JSON object."
  const user = [
    `Candidate ${input.kind} lead:`,
    `  institution: ${input.institution ?? "?"}`,
    `  product: ${input.name}`,
    `  parsed amount: ${input.bonus_amount ?? "?"}`,
    `  classification: ${input.classification ?? "?"}`,
    `  page fetch ok: ${input.pageOk} (final URL: ${input.finalUrl})`,
    ``,
    `OFFER PAGE TEXT (truncated):`,
    `"""${input.pageText.slice(0, PAGE_CAP)}"""`,
    ``,
    `Decide:`,
    `- "approve" ONLY if the page confirms a real, current signup/account-opening bonus worth cataloging.`,
    `- "dismiss" if it's not a signup bonus (Amex Offer, gift-card/shopping deal, portal, news), is expired, or the page doesn't confirm a genuine bonus.`,
    `- "escalate" if the page didn't load usefully or it's genuinely ambiguous.`,
    `Call record_verdict with your decision, confidence, and a one-sentence reason.`,
  ].join("\n")
  return ask(system, user)
}

/** Adjudicate a verify MISMATCH: is the stored value wrong, or did the extractor misread? */
export async function adjudicateMismatch(input: {
  name: string
  field: string
  stored: unknown
  extracted: unknown
  pageOk: boolean
  pageText: string
  finalUrl: string
}): Promise<Verdict> {
  const system =
    "You audit a bank/credit-card bonus catalog against issuer offer pages. A 'mismatch' means our stored value differs from what a scraper read. Scrapers frequently misread (wrong tier, wrong card, generic page). Only approve a change when the PAGE CLEARLY shows our stored value is wrong AND you can state the correct value. Respond with ONLY a JSON object."
  const user = [
    `Catalog item: ${input.name}`,
    `Field: ${input.field}`,
    `Our stored value: ${JSON.stringify(input.stored)}`,
    `Scraper extracted: ${JSON.stringify(input.extracted)}`,
    `Page fetch ok: ${input.pageOk} (final URL: ${input.finalUrl})`,
    ``,
    `OFFER PAGE TEXT (truncated):`,
    `"""${input.pageText.slice(0, PAGE_CAP)}"""`,
    ``,
    `Decide:`,
    `- "approve" ONLY if the page clearly shows the stored value is WRONG. You MUST put the page-confirmed correct value in corrected_value, and it MUST differ from our stored value.`,
    `- "dismiss" if the scraper misread, OR the page confirms our stored value is already correct, OR the page shows a different card/tier, OR the field isn't really on this page.`,
    `- "escalate" if the page didn't load usefully or it's genuinely ambiguous.`,
    `CRITICAL: if your reasoning concludes the stored value is already correct, you MUST choose "dismiss", never "approve". Approve means "change the catalog".`,
    `Call record_verdict with your decision, confidence, a one-sentence reason, and (for approve) corrected_value.`,
  ].join("\n")
  return ask(system, user)
}
