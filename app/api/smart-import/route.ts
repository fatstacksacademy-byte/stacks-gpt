import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"
const MAX_TEXT_CHARS = 30000
const FETCH_TIMEOUT_MS = 12000

// Cached so warm Lambdas reuse the prompt cache hit. Anthropic ephemeral
// cache lives ~5 minutes; the static system prompt benefits whenever the
// same instance handles multiple imports in that window.
const SYSTEM_PROMPT = [
  "You extract bank account sign-up bonus details from a web page.",
  "Return ONLY valid JSON matching the schema the user provides — no prose,",
  "no markdown fences. Use null for fields you cannot confidently determine.",
  "Dollar amounts are integers in USD. Booleans are true/false.",
  "If multiple bonus tiers are described, pick the largest cash bonus tier.",
].join(" ")

function userPrompt(url: string, text: string): string {
  return `Source URL: ${url}

Page content (HTML stripped to readable text):
"""
${text}
"""

Extract these fields:
- bank_name: institution offering the bonus (e.g. "Chase", "SoFi", "US Bank"). Drop product names and dollar amounts.
- bonus_amount: cash bonus in USD as an integer. Largest tier if multiple.
- dd_required: true if direct deposit is required, false if it's a balance-only / debit-spend / other bonus.
- min_dd_total: total DD dollars required across the qualifying window (integer USD, null if unspecified or DD not required).
- min_dd_per_deposit: minimum size of a single qualifying DD (integer USD, null if unspecified).
- dd_count_required: number of qualifying direct deposits required (integer, null if unspecified).
- deposit_window_days: days from account opening to complete DDs (integer, null if unspecified).
- holding_period_days: days the account must remain open after the bonus posts (integer, null if unspecified).
- churnable: true ONLY if the source explicitly says you can earn the bonus again after a cooldown, otherwise false.
- cooldown_months: months you must wait to be eligible again (integer, null if unspecified).
- notes: one-line summary of any other relevant requirements — promo codes, "new customers only", minimum balance, fee waivers. Max 160 chars. null if nothing useful.

Return strict JSON with exactly these 11 keys.`
}

// Minimal HTML→text: drop scripts/styles, replace tags with spaces,
// decode the common entities, collapse whitespace. Good enough for
// passing static content into the LLM; JS-rendered pages will fail
// gracefully (the user can edit fields manually).
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

type Extracted = {
  bank_name: string | null
  bonus_amount: number | null
  dd_required: boolean | null
  min_dd_total: number | null
  min_dd_per_deposit: number | null
  dd_count_required: number | null
  deposit_window_days: number | null
  holding_period_days: number | null
  churnable: boolean | null
  cooldown_months: number | null
  notes: string | null
}

function coerceExtracted(raw: unknown): Extracted | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const num = (v: unknown): number | null => {
    if (v == null) return null
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,]/g, ""))
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const bool = (v: unknown): boolean | null => {
    if (v === true || v === false) return v
    if (v == null) return null
    const s = String(v).toLowerCase()
    if (s === "true" || s === "yes") return true
    if (s === "false" || s === "no") return false
    return null
  }
  const str = (v: unknown, max = 200): string | null => {
    if (v == null) return null
    const s = String(v).trim()
    return s.length === 0 ? null : s.slice(0, max)
  }
  return {
    bank_name: str(r.bank_name, 80),
    bonus_amount: num(r.bonus_amount),
    dd_required: bool(r.dd_required),
    min_dd_total: num(r.min_dd_total),
    min_dd_per_deposit: num(r.min_dd_per_deposit),
    dd_count_required: num(r.dd_count_required),
    deposit_window_days: num(r.deposit_window_days),
    holding_period_days: num(r.holding_period_days),
    churnable: bool(r.churnable),
    cooldown_months: num(r.cooldown_months),
    notes: str(r.notes, 160),
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Smart Import is not configured on this server." }, { status: 500 })
  }

  const body = (await req.json().catch(() => ({}))) as { url?: string }
  const rawUrl = (body.url ?? "").trim()
  if (!rawUrl) return NextResponse.json({ error: "Paste a URL first." }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 })
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 })
  }

  let html: string
  try {
    const ctrl = new AbortController()
    const tmo = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const resp = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StacksOS-SmartImport/1.0; +https://fatstacksacademy.com)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: ctrl.signal,
      redirect: "follow",
    }).finally(() => clearTimeout(tmo))
    if (!resp.ok) {
      return NextResponse.json({ error: `That page returned ${resp.status}.` }, { status: 400 })
    }
    html = await resp.text()
  } catch {
    return NextResponse.json(
      { error: "Couldn't fetch that page — the site may block bots or be slow." },
      { status: 400 },
    )
  }

  const text = htmlToText(html).slice(0, MAX_TEXT_CHARS)
  if (text.length < 80) {
    return NextResponse.json(
      { error: "That page didn't have enough readable text — try the bank's plain offer page or a DoC article." },
      { status: 400 },
    )
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let result
  try {
    result = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt(parsed.toString(), text) }],
    })
  } catch (e) {
    console.error("[smart-import] anthropic error:", e)
    return NextResponse.json(
      { error: "Extractor was unreachable — fill the form manually for now." },
      { status: 502 },
    )
  }

  const out = result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()

  // Strip code fences if the model added them despite instructions.
  const cleaned = out
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(cleaned)
  } catch {
    console.warn("[smart-import] could not parse JSON:", out.slice(0, 400))
    return NextResponse.json(
      { error: "Couldn't read the extracted data — try a different URL." },
      { status: 502 },
    )
  }

  const extracted = coerceExtracted(parsedJson)
  if (!extracted) {
    return NextResponse.json(
      { error: "Couldn't read the extracted data — try a different URL." },
      { status: 502 },
    )
  }

  return NextResponse.json({ extracted, source_url: parsed.toString() })
}
