import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const maxDuration = 60

const MODEL = "claude-sonnet-4-6"
const MAX_TEXT_CHARS = 30000
const FETCH_TIMEOUT_MS = 12000
const PLAYWRIGHT_TIMEOUT_MS = 30000

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
- churnable: true if the page implies the bonus can be earned more than once. Look for phrases like "one bonus per customer per N months", "limit one per N-month period", "previous recipients eligible after N months", or any frequency-bounded restriction. false if the page says "one per lifetime" or "previous recipients ineligible" with no time bound. null only if the page is genuinely silent on repeat eligibility.
- cooldown_months: months you must wait to be eligible again. Pull from the same eligibility language ("one per 24 months" → 24). Integer, null if unspecified or lifetime-restricted.
- lifetime_restricted: true if the page uses lifetime language ("one bonus per lifetime", "limit one ever", "prior recipients permanently ineligible", "available only to new customers who have never had this bonus"). false if there is a finite cooldown. null if silent.
- monthly_fee: monthly maintenance / service fee in USD as integer (null if unspecified or free).
- monthly_fee_waiver_text: one-line description of how to waive the monthly fee (e.g. "Waived with $1,500 daily balance" or "Waived with one direct deposit per month"). Max 120 chars. null if no waiver or no fee.
- early_closure_fee: fee charged if the account is closed before a minimum period (integer USD, null if unspecified or none). Often called "early account closure fee" or "early termination fee".
- notes: one-line summary of any OTHER relevant requirements not covered by the fields above. Max 160 chars. null if nothing useful.

Return strict JSON with exactly these 15 keys.`
}

async function fetchViaPlaywright(url: string): Promise<{ text: string } | null> {
  const mod = await import("../../../scripts/_shared/playwright").catch(err => {
    console.warn("[smart-import] playwright import failed:", err instanceof Error ? err.message : err)
    return null
  })
  if (!mod) return null
  const result = await mod.fetchPage(url, { timeoutMs: PLAYWRIGHT_TIMEOUT_MS })
  if (!result.ok || !result.textContent) return null
  return { text: result.textContent }
}

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
  lifetime_restricted: boolean | null
  monthly_fee: number | null
  monthly_fee_waiver_text: string | null
  early_closure_fee: number | null
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
    lifetime_restricted: bool(r.lifetime_restricted),
    monthly_fee: num(r.monthly_fee),
    monthly_fee_waiver_text: str(r.monthly_fee_waiver_text, 120),
    early_closure_fee: num(r.early_closure_fee),
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

  let text = ""
  let fetchPath: "playwright" | "plain" = "plain"
  try {
    const pw = await fetchViaPlaywright(parsed.toString())
    if (pw && pw.text.length >= 200) {
      text = pw.text.slice(0, MAX_TEXT_CHARS)
      fetchPath = "playwright"
    }
  } catch (e) {
    console.warn("[smart-import] playwright path failed, falling back:", e instanceof Error ? e.message : e)
  }

  if (text.length < 200) {
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
      const html = await resp.text()
      text = htmlToText(html).slice(0, MAX_TEXT_CHARS)
    } catch {
      return NextResponse.json(
        { error: "Couldn't fetch that page. The site may block bots or be slow." },
        { status: 400 },
      )
    }
  }

  if (text.length < 80) {
    return NextResponse.json(
      { error: "That page didn't have enough readable text. Try the bank's plain offer page or a DoC article." },
      { status: 400 },
    )
  }
  console.log(`[smart-import] fetched via ${fetchPath} (${text.length} chars) for ${parsed.hostname}`)

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
