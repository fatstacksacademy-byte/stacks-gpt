/* eslint-disable no-console */
/**
 * Phase 3 — DoC fetch + Claude entry generator. Combines the enrichment and
 * entry-generation steps into a single Claude call so we get one round-trip per
 * lead instead of two.
 *
 * Pipeline per lead:
 *   1. Fetch the DoC source URL via Playwright (reuses .cache/discover-bonuses)
 *   2. Call Sonnet 4.5 with: lead metadata + DoC page text + all three schema
 *      snippets + two example entries (one savings-style, one bonus-style)
 *   3. Claude returns either:
 *        { dismiss_reason: "expired" | "prepaid" | "out_of_scope" | "thin_data", note: ... }
 *      or:
 *        { target_file: "bonuses.ts" | "savingsBonuses.ts" | "creditCardBonuses.ts",
 *          entry: <full JSON conforming to schema>, mechanic: <inferred mechanic> }
 *   4. We validate the JSON shape and surface to the orchestrator
 */
import { readFileSync, existsSync } from "node:fs"
import Anthropic from "@anthropic-ai/sdk"
import { fetchPage } from "../_shared/playwright"
import type { Lead } from "./dedup"

const MODEL = "claude-sonnet-4-5"
const MAX_TOKENS = 4096

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set")
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export type EnrichmentResult =
  | {
      kind: "entry"
      target_file: "bonuses.ts" | "savingsBonuses.ts" | "creditCardBonuses.ts"
      entry: Record<string, unknown>
      mechanic: "dd_driven" | "balance_hold" | "card_sub" | "debit_spend"
      verifiedUrl: string
    }
  | {
      kind: "dismiss"
      reason: "expired" | "prepaid_or_out_of_scope" | "thin_data" | "fetch_failed" | "claude_unparseable"
      note: string
    }

const SCHEMAS_AND_EXAMPLES_SYSTEM = `You audit bank-account and credit-card bonus offers, then either generate a complete catalog entry conforming to one of three TypeScript schemas, OR dismiss the lead with a structured reason if it isn't catalogable.

Three target files:

bonuses.ts (DD-driven bank checking bonuses):
{
  "id": "kebab-case-slug-${"\${year}"}",
  "bank_name": "...",
  "product_type": "checking",
  "bonus_amount": number,
  "cooldown_months": number | null,
  "requirements": {
    "direct_deposit_required": boolean,
    "min_direct_deposit_total": number | null,
    "min_direct_deposit_per_deposit": number | null,
    "dd_count_required": number | null,
    "deposit_window_days": number | null,
    "holding_period_days": number | null,
    "min_opening_deposit": number | null,
    "min_balance": number | null,
    "debit_transactions_required": number | null,
    "billpay_required": boolean | null,
    "other_requirements_text": "..."
  },
  "fees": { "monthly_fee": number, "monthly_fee_waiver_text": "...", "early_closure_fee": number },
  "screening": { "chex_sensitive": "low" | "medium" | "high", "hard_pull": boolean, "soft_pull": boolean, "screening_notes": "..." },
  "eligibility": { "state_restricted": boolean, "states_allowed": [...], "states_excluded": [...], "lifetime_language": boolean, "eligibility_notes": "..." },
  "timeline": { "bonus_posting_days_est": number | null, "must_remain_open_days": number | null },
  "source_links": [bank_url, doc_url],
  "raw_excerpt": "1-2 sentences",
  "missing_fields": []
}

savingsBonuses.ts (balance-hold mechanic — even on "checking" accounts when the hold dominates):
{
  "id": "kebab-case-slug",
  "bank_name": "...",
  "product_type": "savings",
  "base_apy": number,  // decimal e.g. 0.036 = 3.6%
  "funding_window_days": number,
  "maintenance_days": number,
  "total_hold_days": number,
  "tiers": [{"min_deposit": number, "bonus_amount": number}, ...],
  "cooldown_months": number | null,
  "fees": {"monthly_fee": number, "early_closure_fee": number},
  "eligibility": { "state_restricted": boolean, "states_allowed": [...], "lifetime_language": boolean, "eligibility_notes": "..." },
  "source_links": [...],
  "raw_excerpt": "...",
  "business"?: boolean,
  "brokerage"?: boolean,
  "notes"?: "..."
}

creditCardBonuses.ts (credit card SUB):
{
  "id": "kebab-case-slug",
  "card_name": "...",
  "issuer": "chase" | "amex" | "capital-one" | "citi" | "bofa" | "wells-fargo" | "barclays" | "us-bank" | "usaa-bank" | "discover" | "synchrony" | ...,
  "card_type": "personal" | "business",
  "bonus_amount": number,
  "bonus_currency": "cash" | "points" | "miles" | "...",
  "is_hotel_card": boolean,
  "cpp_value": number,  // 0.01 for cash, ~0.018 for transferable, 0.005 for hotel
  "min_spend": number,
  "spend_months": number,
  "annual_fee": number,
  "annual_fee_waived_first_year": boolean,
  "statement_credits_year1": number,
  "offer_link": "...",
  "expired": false,
  "key_benefits": [...],
  "rewards"?: [{"categories": [...], "multiplier": number, "unit": "points" | "%" | "miles" | "cashback"}, ...]
}

Mechanic picker rule (CRITICAL):
- If the bonus is driven by a balance hold (deposit $X, maintain for N days, get bonus) → savingsBonuses.ts, even if the account is technically "checking". Example: Chase Total Checking $900 (requires $15k held 90 days) → savings file.
- If the bonus is driven by recurring direct deposits with no significant balance hold → bonuses.ts.
- If the bonus is on a credit card (min_spend / spend_months / annual_fee) → creditCardBonuses.ts.
- If the bonus is debit-spend-driven on a checking account (e.g. $25/month for 12 months of $300 spend) → bonuses.ts with direct_deposit_required: false.

Dismissal reasons (return { dismiss_reason, note } if any apply):
- "expired": offer's stated expiration date is past, or the page says "expired" / "no longer available" / "ended".
- "prepaid_or_out_of_scope": the product is a prepaid card platform (Netspend, etc.), not a real bank account or proper credit card.
- "thin_data": the DoC page is too sparse to fill the schema with confidence. Better to defer to human triage than generate a low-quality entry.

Editorial judgment rules:
- chex_sensitive: Chase is "low" (no Chex pull). Bank of America, Wells Fargo, Citi are "medium". Most credit unions are "medium" to "high".
- cooldown_months: if the offer terms say "once per X months" or "every Y years", set accordingly. Default null.
- lifetime_language: true if "one bonus per lifetime" / "ever held this account" appears.
- raw_excerpt: 1-2 sentences summarizing the offer — drop the most informative facts.
- source_links: ALWAYS include both the bank URL (lead.canonical_url if present) AND the DoC URL (lead.source_urls[0]).
- For credit unions: if membership eligibility paths are unclear, include "missing_fields": ["membership eligibility path"] (bonuses.ts only).

Output format:
- Return ONLY valid JSON, no prose, no markdown fences.
- For an entry, the top-level shape is:
  { "decision": "entry", "target_file": "...", "mechanic": "...", "entry": {...} }
- For a dismissal:
  { "decision": "dismiss", "dismiss_reason": "...", "note": "..." }
`

function buildUserMessage(lead: Lead, docPageText: string, today: string): string {
  return [
    `Today's date: ${today}`,
    `Lead metadata:`,
    `  bank: ${lead.bank}`,
    `  product headline: ${lead.product}`,
    `  bonus_amount: ${lead.bonus_amount ?? "null"}`,
    `  classification: ${lead.classification}`,
    `  canonical_url (bank's own page): ${lead.canonical_url ?? "(none)"}`,
    `  source_urls: ${JSON.stringify(lead.source_urls)}`,
    ``,
    `Doctor of Credit page text (first ~6000 chars):`,
    `"""`,
    docPageText.slice(0, 6000),
    `"""`,
    ``,
    `Apply the mechanic picker rule, generate a complete catalog entry OR a structured dismissal. Output JSON only.`,
  ].join("\n")
}

export async function enrichLead(lead: Lead): Promise<EnrichmentResult> {
  const docUrl = lead.source_urls?.[0]
  if (!docUrl) {
    return { kind: "dismiss", reason: "fetch_failed", note: "Lead has no source URL." }
  }
  // Try discover-bonuses cache first.
  const cachePath = `/Users/nathaniel/stacks-gpt/.cache/discover-bonuses/${docUrl.replace(/[^a-z0-9-_]/gi, "_")}.json`
  let pageText = ""
  if (existsSync(cachePath)) {
    try {
      const c = JSON.parse(readFileSync(cachePath, "utf8"))
      pageText = c.textContent ?? ""
    } catch {}
  }
  if (!pageText) {
    try {
      const f = await fetchPage(docUrl)
      if (!f.ok || !f.textContent) {
        return { kind: "dismiss", reason: "fetch_failed", note: `DoC fetch failed: ${f.status} ${f.error ?? ""}` }
      }
      pageText = f.textContent
    } catch (err) {
      return {
        kind: "dismiss",
        reason: "fetch_failed",
        note: `DoC fetch threw: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const userMsg = buildUserMessage(lead, pageText, today)

  let raw: string
  try {
    const resp = await client().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SCHEMAS_AND_EXAMPLES_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    })
    raw = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim()
  } catch (err) {
    return {
      kind: "dismiss",
      reason: "claude_unparseable",
      note: `Claude call failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // Strip accidental code fences.
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "")
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      kind: "dismiss",
      reason: "claude_unparseable",
      note: `Claude returned non-JSON: ${raw.slice(0, 200)}`,
    }
  }

  if (parsed.decision === "dismiss") {
    const r = parsed.dismiss_reason
    const allowed = ["expired", "prepaid_or_out_of_scope", "thin_data"] as const
    if (!allowed.includes(r)) {
      return { kind: "dismiss", reason: "thin_data", note: `Unknown dismiss_reason: ${r}. Original note: ${parsed.note ?? ""}` }
    }
    return { kind: "dismiss", reason: r, note: parsed.note ?? "" }
  }

  if (parsed.decision === "entry") {
    const target = parsed.target_file
    if (target !== "bonuses.ts" && target !== "savingsBonuses.ts" && target !== "creditCardBonuses.ts") {
      return { kind: "dismiss", reason: "claude_unparseable", note: `Unknown target_file: ${target}` }
    }
    if (!parsed.entry || typeof parsed.entry !== "object") {
      return { kind: "dismiss", reason: "claude_unparseable", note: "Missing entry object." }
    }
    const mech = parsed.mechanic
    const validMechs = ["dd_driven", "balance_hold", "card_sub", "debit_spend"] as const
    if (!validMechs.includes(mech)) {
      return { kind: "dismiss", reason: "claude_unparseable", note: `Unknown mechanic: ${mech}` }
    }
    return {
      kind: "entry",
      target_file: target,
      entry: parsed.entry,
      mechanic: mech,
      verifiedUrl: docUrl,
    }
  }

  return {
    kind: "dismiss",
    reason: "claude_unparseable",
    note: `Top-level decision missing. Raw: ${raw.slice(0, 200)}`,
  }
}
