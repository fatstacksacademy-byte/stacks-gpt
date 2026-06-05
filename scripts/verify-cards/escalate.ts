/**
 * Card escalation — mirror of scripts/verify-bonuses/escalate.ts.
 *
 * verify-cards/run.ts didn't have escalation before. Adding it now so
 * mismatches can be judged by Claude with the admin's prior lesson (if
 * any) injected into the prompt as ground-truth context.
 */
import Anthropic from "@anthropic-ai/sdk"

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Card escalation cannot run.")
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const MODEL = "claude-haiku-4-5-20251001"

export type Escalation = {
  field: string
  verdict: "same_meaning" | "different" | "unclear"
  rationale: string
}

export type AdminHint = {
  issue_category: string
  issue_description: string
  suggested_fix: string
  corrected_value: unknown | null
}

export async function escalateCard(
  card_name: string,
  field: string,
  stored: unknown,
  extracted: unknown,
  snippet: string,
  adminHint?: AdminHint | null,
): Promise<Escalation> {
  const hintLines = adminHint
    ? [
        ``,
        `ADMIN LESSON (from a prior triage decision on this same card + field):`,
        `  Category: ${adminHint.issue_category}`,
        `  What the verifier did wrong: ${adminHint.issue_description}`,
        `  How to find the right value: ${adminHint.suggested_fix}`,
        adminHint.corrected_value !== null && adminHint.corrected_value !== undefined
          ? `  Admin-supplied correct value: ${JSON.stringify(adminHint.corrected_value)}`
          : `  (Admin did not supply a correct value — the stored value is correct.)`,
        `Use this lesson to judge whether the freshly-extracted value is right.`,
      ]
    : []

  const userMsg = [
    `Credit card: ${card_name}`,
    `Field: ${field}`,
    `Stored value: ${JSON.stringify(stored)}`,
    `Extracted from issuer page: ${JSON.stringify(extracted)}`,
    `Page context (~240 chars around the extracted value):`,
    `"${snippet}"`,
    ...hintLines,
    ``,
    `Are these two values equivalent in meaning for a reader shopping for this card's welcome bonus?`,
    `Respond with ONE of these exact tokens on the first line:`,
    `  SAME_MEANING   (wording drift but same offer)`,
    `  DIFFERENT      (offer genuinely changed)`,
    `  UNCLEAR        (not enough context to decide)`,
    `Then 1 short sentence of rationale.`,
  ].join("\n")

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 200,
    system: "You audit credit card welcome-bonus data. You answer tersely with a verdict token and a single rationale sentence.",
    messages: [{ role: "user", content: userMsg }],
  })

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim()

  const firstLine = text.split("\n")[0]?.trim().toUpperCase() ?? ""
  let verdict: Escalation["verdict"] = "unclear"
  if (firstLine.startsWith("SAME_MEANING")) verdict = "same_meaning"
  else if (firstLine.startsWith("DIFFERENT")) verdict = "different"

  const rationale = text.split("\n").slice(1).join(" ").trim().slice(0, 240)
  return { field, verdict, rationale }
}
