import Anthropic from "@anthropic-ai/sdk"
import type { FieldResult } from "./types"

let _client: Anthropic | null = null
function client(): Anthropic {
  if (_client) return _client
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Tier 3 (ambiguous-field escalation) cannot run.",
    )
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

const MODEL = "claude-haiku-4-5-20251001" // small/fast, judgment-tier only

export type Escalation = {
  field: string
  verdict: "same_meaning" | "different" | "unclear"
  rationale: string
}

export async function escalate(
  bank: string,
  field: string,
  stored: unknown,
  extracted: unknown,
  snippet: string,
): Promise<Escalation> {
  const userMsg = [
    `Bank: ${bank}`,
    `Field: ${field}`,
    `Stored value: ${JSON.stringify(stored)}`,
    `Extracted from bank page: ${JSON.stringify(extracted)}`,
    `Page context (~240 chars around the extracted value):`,
    `"${snippet}"`,
    ``,
    `Are these two values equivalent in meaning for a reader shopping for this bonus?`,
    `Respond with ONE of these exact tokens on the first line:`,
    `  SAME_MEANING   (wording drift but same offer)`,
    `  DIFFERENT      (offer genuinely changed)`,
    `  UNCLEAR        (not enough context to decide)`,
    `Then 1 short sentence of rationale.`,
  ].join("\n")

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 200,
    system:
      "You audit bank-bonus data. You answer tersely with a verdict token and a single rationale sentence.",
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

export function needsEscalation(r: FieldResult): boolean {
  return r.status === "ambiguous"
}
