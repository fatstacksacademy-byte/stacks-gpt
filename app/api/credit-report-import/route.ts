import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hasBetaAccess } from "@/lib/betaAccess"
import { normalizeCreditReport } from "@/lib/creditReportImport"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-sonnet-4-6"
const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB — credit reports run long
const ALLOWED_TYPES: Record<string, "document" | "image"> = {
  "application/pdf": "document",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
}

// Privacy: we extract only what 5/24 / churning need. The prompt forbids SSNs,
// account numbers, addresses, and DOBs, and the file is held in memory only.
const SYSTEM_PROMPT = [
  "You extract the credit-card tradelines from a consumer credit report (PDF or image).",
  "Return ONLY valid JSON matching the schema the user provides — no prose, no markdown fences.",
  "Use null for any field you cannot confidently read. Dates are ISO YYYY-MM-DD. Dollar amounts are plain USD numbers.",
  "NEVER output Social Security numbers, full or partial account numbers, addresses, phone numbers, dates of birth, or any other personally identifying information.",
].join(" ")

const SCHEMA_INSTRUCTIONS = `Extract every TRADELINE (account) from this credit report. Return JSON:

{
  "tradelines": [
    {
      "issuer": string|null,            // e.g. "Chase", "Capital One", "American Express"
      "product_name": string|null,      // e.g. "Sapphire Preferred", "Quicksilver" (NO account numbers)
      "account_category": string|null,  // one of: "credit_card","charge_card","loan","mortgage","auto","student","other"
      "open_date": string|null,         // ISO date the account was opened
      "closed_date": string|null,       // ISO date if closed, else null
      "credit_limit": number|null,      // credit limit / high credit, USD
      "status": string|null,            // "open" or "closed"
      "business": true|false|null       // true if it is a business card
    }
  ]
}

Include ALL accounts you can see, including closed ones (closed cards still
matter for 5/24). Set account_category accurately so loans/mortgages can be
filtered out. Return strict JSON with the "tradelines" array only.`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  if (!hasBetaAccess("cards", user.email)) {
    return NextResponse.json({ error: "Not enabled for this account." }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Credit-report import is not configured on this server." }, { status: 500 })
  }

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get("file")
    if (f instanceof File) file = f
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: "Attach your credit report (PDF or image)." }, { status: 400 })

  const kind = ALLOWED_TYPES[file.type]
  if (!kind) {
    return NextResponse.json({ error: "Unsupported file type. Upload a PDF, PNG, JPEG, WebP, or GIF." }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 20 MB)." }, { status: 400 })
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
  const fileBlock: Anthropic.ContentBlockParam =
    kind === "document"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
            data: base64,
          },
        }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let result
  try {
    result = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: SCHEMA_INSTRUCTIONS }] }],
    })
  } catch (e) {
    console.error("[credit-report-import] anthropic error:", e)
    return NextResponse.json(
      { error: "Extractor was unreachable — add cards manually for now." },
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
    console.warn("[credit-report-import] could not parse JSON:", out.slice(0, 400))
    return NextResponse.json(
      { error: "Couldn't read that report — try a clearer export, or add cards manually." },
      { status: 502 },
    )
  }

  const { cards, warnings, tradelinesFound, skippedNonCard } = normalizeCreditReport(parsed)
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "No credit cards with an open date were found in that report.", warnings },
      { status: 422 },
    )
  }

  return NextResponse.json({ cards, warnings, tradelinesFound, skippedNonCard })
}
