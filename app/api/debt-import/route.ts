import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasBetaAccess } from "@/lib/betaAccess"
import { normalizeStatementExtraction } from "@/lib/debtStatementImport"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-sonnet-4-6"
const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_TYPES: Record<string, "document" | "image"> = {
  "application/pdf": "document",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
}

// Privacy: we never ask for or store account numbers / SSNs, and the uploaded
// file is held only in memory for the single extraction call.
const SYSTEM_PROMPT = [
  "You extract credit-card debt details from a cardholder's monthly statement (PDF or image).",
  "Return ONLY valid JSON matching the schema the user provides — no prose, no markdown fences.",
  "Use null for any field you cannot confidently read. Dollar amounts are plain numbers in USD.",
  "APR fields are PERCENTS as written on the statement (e.g. 24.99, not 0.2499).",
  "Dates are ISO YYYY-MM-DD.",
  "NEVER include account numbers, card numbers, names, addresses, or any personally identifying information in your output.",
].join(" ")

const SCHEMA_INSTRUCTIONS = `Read the attached statement and return JSON of this exact shape:

{
  "accounts": [
    {
      "issuer": string|null,                 // e.g. "Chase", "Citi", "American Express"
      "product_name": string|null,           // e.g. "Freedom Unlimited" (no card numbers)
      "statement_balance": number|null,      // the new/statement balance owed, USD
      "purchase_apr_pct": number|null,       // the standard purchase APR as a percent, e.g. 24.99
      "minimum_payment_due": number|null,    // minimum payment due, USD
      "credit_limit": number|null,           // total credit limit, USD
      "promo_apr_pct": number|null,          // promotional/intro APR percent if any (often 0)
      "promo_balance": number|null,          // the portion of the balance under the promo APR, USD
      "promo_expiration": string|null,       // ISO date the promo APR ends (YYYY-MM-DD)
      "post_promo_apr_pct": number|null      // APR after the promo ends, percent
    }
  ]
}

Most statements describe ONE card → one account. If the document clearly covers
multiple cards, return one object per card. If there is no promotional balance,
leave the promo_* fields null. Return strict JSON with the "accounts" array only.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (!hasBetaAccess("debt", user.email)) {
    return NextResponse.json({ error: "Not enabled for this account." }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Statement import is not configured on this server." }, { status: 500 })
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get("file")
    if (f instanceof File) file = f
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: "Attach a statement file (PDF or image)." }, { status: 400 })

  const mediaType = file.type
  const kind = ALLOWED_TYPES[mediaType]
  if (!kind) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, PNG, JPEG, WebP, or GIF." },
      { status: 400 },
    )
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 15 MB)." }, { status: 400 })
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")

  const fileBlock: Anthropic.ContentBlockParam =
    kind === "document"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
            data: base64,
          },
        }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let result
  try {
    result = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: SCHEMA_INSTRUCTIONS }] }],
    })
  } catch (e) {
    console.error("[debt-import] anthropic error:", e)
    return NextResponse.json(
      { error: "Extractor was unreachable — enter the card manually for now." },
      { status: 502 },
    )
  }

  const out = result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim()

  const cleaned = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.warn("[debt-import] could not parse JSON:", out.slice(0, 400))
    return NextResponse.json(
      { error: "Couldn't read the statement — try a clearer scan, or enter the card manually." },
      { status: 502 },
    )
  }

  const idPrefix = `import-${Date.now().toString(36)}`
  const { debts, warnings, accountsFound } = normalizeStatementExtraction(parsed, idPrefix)

  if (debts.length === 0) {
    return NextResponse.json(
      { error: "No usable card balances were found in that file.", warnings },
      { status: 422 },
    )
  }

  return NextResponse.json({ debts, warnings, accountsFound })
}
