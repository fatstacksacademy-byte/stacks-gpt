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

function parseVerdict(text: string): Verdict | null {
  // Strip markdown code fences Haiku sometimes wraps the JSON in.
  const cleaned = text.replace(/```(?:json)?/gi, "")
  const m = cleaned.match(/\{[\s\S]*\}/) // greedy: if JSON was truncated (no closing brace) this fails → null → retry
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>
    const decision = o.decision === "approve" || o.decision === "dismiss" ? o.decision : "escalate"
    const confidence = o.confidence === "high" || o.confidence === "medium" ? o.confidence : "low"
    return {
      decision,
      confidence,
      reason: typeof o.reason === "string" ? o.reason.slice(0, 280) : "",
      corrected_value: (o.corrected_value as Verdict["corrected_value"]) ?? undefined,
    }
  } catch {
    return null
  }
}

async function ask(system: string, user: string): Promise<Verdict> {
  // max_tokens 800 (was 400 — verbose reasons truncated the JSON, the #1 cause
  // of bogus "escalate"); retry once with a stricter format nudge before giving up.
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await client().messages.create({
      model: MODEL,
      max_tokens: 800,
      system:
        attempt === 0
          ? system
          : `${system} Respond with ONLY the JSON object — no prose, no markdown fences — and keep "reason" to one short sentence.`,
      messages: [{ role: "user", content: user }],
    })
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
    const v = parseVerdict(text)
    if (v) return v
  }
  return { decision: "escalate", confidence: "low", reason: "unparseable model JSON after retry" }
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
    `Return JSON: {"decision":"approve|dismiss|escalate","confidence":"high|medium|low","reason":"one sentence"}`,
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
    `Return JSON: {"decision":"approve|dismiss|escalate","confidence":"high|medium|low","reason":"one sentence","corrected_value":<value or null>}`,
  ].join("\n")
  return ask(system, user)
}
