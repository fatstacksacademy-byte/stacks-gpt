import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  buildCatalogFlat,
  cheapPrefilter,
  type YnabAccount,
  type MatchCandidate,
  type MatchedAccount,
  type CatalogEntryFlat,
} from "@/lib/ynabImport"

export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"
const MAX_ACCOUNTS = 80
const MAX_CANDIDATES_PER_ACCOUNT = 30

const ALLOWED_EMAILS = new Set([
  "booth.nathaniel@gmail.com",
  "fatstacksacademy@gmail.com",
])

const SYSTEM_PROMPT = [
  "You match user-supplied bank/card account names to entries in a catalog of bonus offers.",
  "Return ONLY valid JSON. Each input account gets one result object.",
  "The user's account names often include prefixes like 'P-' or 'B-', promo end dates (e.g. '07/2026 0%'),",
  "and abbreviations (e.g. 'BBC', 'BBP', 'FU'). Strip those mentally before matching.",
  "Prefer the catalog entry whose issuer AND product family align. If multiple candidates fit equally,",
  "return the top 3 with realistic confidences (0.0-1.0). If no candidate fits well, set top_id to null",
  "and explain in unmatched_reason (max 80 chars).",
].join(" ")

type RequestBody = {
  accounts: YnabAccount[]
}

type ModelResult = {
  raw_name: string
  top_id: string | null
  candidates: { id: string; confidence: number }[]
  unmatched_reason?: string | null
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
  const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, MAX_ACCOUNTS) : []
  if (accounts.length === 0) return NextResponse.json({ matches: [] })

  const catalog = buildCatalogFlat()
  const catalogIndex = new Map(catalog.map(c => [c.id, c]))

  const perAccountCandidates: { account: YnabAccount; pool: CatalogEntryFlat[] }[] =
    accounts.map(a => ({ account: a, pool: cheapPrefilter(a, catalog).slice(0, MAX_CANDIDATES_PER_ACCOUNT) }))

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userMsg = buildUserPrompt(perAccountCandidates)

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userMsg }],
    })
  } catch (e) {
    console.error("[ynab-import/match] anthropic error:", e)
    return NextResponse.json({ error: "Matcher unreachable, try again" }, { status: 502 })
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim()

  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()

  let parsed: ModelResult[] = []
  try {
    const raw = JSON.parse(cleaned)
    if (Array.isArray(raw)) parsed = raw
    else if (raw && Array.isArray(raw.matches)) parsed = raw.matches
  } catch {
    console.warn("[ynab-import/match] could not parse JSON:", text.slice(0, 400))
    return NextResponse.json({ error: "Match result was not valid JSON" }, { status: 502 })
  }

  const matches: MatchedAccount[] = accounts.map(acc => {
    const m = parsed.find(p => p.raw_name === acc.raw_name)
    if (!m) {
      return { raw_name: acc.raw_name, account_type: acc.account_type, balance: acc.balance, top: null, candidates: [], unmatched_reason: "No model result" }
    }
    const candidates: MatchCandidate[] = (m.candidates ?? [])
      .map(c => {
        const entry = catalogIndex.get(c.id)
        if (!entry) return null
        return { catalog_id: c.id, label: entry.label, type: entry.type, confidence: clamp01(c.confidence) }
      })
      .filter((x): x is MatchCandidate => x !== null)
      .sort((a, b) => b.confidence - a.confidence)
    const top = m.top_id ? candidates.find(c => c.catalog_id === m.top_id) ?? candidates[0] ?? null : null
    return {
      raw_name: acc.raw_name,
      account_type: acc.account_type,
      balance: acc.balance,
      top: top ?? null,
      candidates,
      unmatched_reason: m.unmatched_reason ?? undefined,
    }
  })

  return NextResponse.json({ matches })
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : parseFloat(String(n))
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function buildUserPrompt(items: { account: YnabAccount; pool: CatalogEntryFlat[] }[]): string {
  const blocks = items.map((it, i) => {
    const candList = it.pool.map(c => `  - id="${c.id}" type=${c.type} label="${c.label}"`).join("\n")
    return `Account ${i + 1}: "${it.account.raw_name}"\nCandidates:\n${candList || "  (none)"}`
  }).join("\n\n")

  return `Match each account below to its best catalog candidate.

${blocks}

Return JSON: an array of objects, one per account, each with:
- raw_name: the exact account string from the input
- top_id: the catalog id for the best match, or null if none fit
- candidates: array of up to 3 { id, confidence } objects sorted by confidence desc
- unmatched_reason: string if top_id is null, else null

Only use ids from the candidate lists above. Do not invent ids.`
}
