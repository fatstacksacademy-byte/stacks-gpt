import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import type { DetectedSchema } from "@/lib/spreadsheetImport"

export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"
const MAX_SAMPLE_ROWS = 5

const ALLOWED_EMAILS = new Set([
  "booth.nathaniel@gmail.com",
  "fatstacksacademy@gmail.com",
])

const SYSTEM_PROMPT = [
  "You inspect a spreadsheet's column headers and a few sample rows, then identify which columns hold:",
  "account name, account type (checking/savings/credit card), opened date, closed date, balance, status, notes.",
  "Return ONLY a JSON object with the exact column header names from the input (case-sensitive), or null if not present.",
  "Be conservative: if uncertain, return null. Confidence is 0.0-1.0 based on how clear the headers + sample data are.",
].join(" ")

type RequestBody = {
  headers: string[]
  sample_rows: Record<string, string>[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (!user.email || !ALLOWED_EMAILS.has(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Matcher not configured" }, { status: 500 })
  }

  const body = (await req.json().catch(() => ({}))) as RequestBody
  const headers = Array.isArray(body.headers) ? body.headers.slice(0, 50) : []
  const sampleRows = Array.isArray(body.sample_rows) ? body.sample_rows.slice(0, MAX_SAMPLE_ROWS) : []
  if (headers.length === 0) return NextResponse.json({ error: "No headers provided" }, { status: 400 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const userMsg = buildPrompt(headers, sampleRows)

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    })
  } catch (e) {
    console.error("[detect-schema] anthropic error:", e)
    return NextResponse.json({ error: "Schema detector unreachable" }, { status: 502 })
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim()

  const cleaned = extractJson(text)
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(cleaned)
  } catch {
    console.warn("[detect-schema] parse failed:", text.slice(0, 300))
    return NextResponse.json({ error: "Schema result was not valid JSON" }, { status: 502 })
  }

  const schema: DetectedSchema = {
    account_name_col: validHeader(raw.account_name_col, headers),
    account_type_col: validHeader(raw.account_type_col, headers),
    opened_date_col: validHeader(raw.opened_date_col, headers),
    closed_date_col: validHeader(raw.closed_date_col, headers),
    balance_col: validHeader(raw.balance_col, headers),
    status_col: validHeader(raw.status_col, headers),
    notes_col: validHeader(raw.notes_col, headers),
    confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
  }

  return NextResponse.json({ schema })
}

function validHeader(v: unknown, headers: string[]): string | null {
  if (typeof v !== "string") return null
  return headers.includes(v) ? v : null
}

function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  if (stripped.startsWith("{") || stripped.startsWith("[")) return stripped
  const first = stripped.indexOf("{")
  const last = stripped.lastIndexOf("}")
  if (first >= 0 && last > first) return stripped.slice(first, last + 1)
  return stripped
}

function buildPrompt(headers: string[], rows: Record<string, string>[]): string {
  const headerLine = headers.map(h => `"${h}"`).join(", ")
  const sampleBlock = rows.map((r, i) => {
    const cells = headers.map(h => `${h}: ${JSON.stringify(r[h] ?? "")}`).join("\n  ")
    return `Row ${i + 1}:\n  ${cells}`
  }).join("\n\n")

  return `Headers: ${headerLine}

Sample rows:
${sampleBlock}

Return JSON with these keys (column header name from the input, or null):
{
  "account_name_col": string|null,
  "account_type_col": string|null,
  "opened_date_col": string|null,
  "closed_date_col": string|null,
  "balance_col": string|null,
  "status_col": string|null,
  "notes_col": string|null,
  "confidence": number
}`
}
