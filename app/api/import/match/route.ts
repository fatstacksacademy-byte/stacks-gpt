import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  buildCatalogFlat,
  cheapPrefilter,
  heuristicMatch,
  HEURISTIC_ACCEPT_THRESHOLD,
  HEURISTIC_MARGIN_THRESHOLD,
  type ImportRow,
  type MatchCandidate,
  type MatchedRow,
  type CatalogEntryFlat,
} from "@/lib/spreadsheetImport"

export const runtime = "nodejs"

const MODEL = "claude-sonnet-4-6"
const MAX_ROWS = 200
const MAX_CANDIDATES_PER_ROW = 20
const BATCH_SIZE = 15
const MAX_TOKENS_PER_BATCH = 4000

const ALLOWED_EMAILS = new Set([
  "booth.nathaniel@gmail.com",
  "fatstacksacademy@gmail.com",
])

const SYSTEM_PROMPT = [
  "You match user-supplied bank/card account names to entries in a catalog of bonus offers.",
  "Return ONLY valid JSON. Each input row gets one result object.",
  "Account names often include prefixes (P-, B-, nicknames), promo end dates (e.g. '07/2026 0%'),",
  "and abbreviations. Strip those mentally before matching.",
  "When an account_type hint is provided, prefer catalog candidates of that type (checking, savings, credit card).",
  "Prefer the catalog entry whose issuer AND product family align. Return up to 3 candidates with realistic confidences (0.0-1.0).",
  "If no candidate fits well, set top_id to null and explain in unmatched_reason (max 80 chars).",
].join(" ")

type RequestBody = { rows: ImportRow[] }

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
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : []
  if (rows.length === 0) return NextResponse.json({ matches: [] })

  const catalog = buildCatalogFlat()
  const catalogIndex = new Map(catalog.map(c => [c.id, c]))

  type RowState = {
    row: ImportRow
    pool: CatalogEntryFlat[]
    heuristic: ReturnType<typeof heuristicMatch>
    needsLlm: boolean
  }
  const states: RowState[] = rows.map(r => {
    const h = heuristicMatch(r.raw_name, r.account_type, catalog)
    const accepted = !!h && h.confidence >= HEURISTIC_ACCEPT_THRESHOLD && h.margin >= HEURISTIC_MARGIN_THRESHOLD
    return {
      row: r,
      pool: cheapPrefilter(r.raw_name, r.account_type, catalog).slice(0, MAX_CANDIDATES_PER_ROW),
      heuristic: h,
      needsLlm: !accepted,
    }
  })

  const llmRows = states.filter(s => s.needsLlm)
  const heuristicAccepted = states.length - llmRows.length

  const parsed: ModelResult[] = []
  const batchErrors: { batch: number; reason: string; sample?: string }[] = []

  if (llmRows.length > 0) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const batches: RowState[][] = []
    for (let i = 0; i < llmRows.length; i += BATCH_SIZE) batches.push(llmRows.slice(i, i + BATCH_SIZE))

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b].map(s => ({ row: s.row, pool: s.pool }))
      const userMsg = buildPrompt(batch)
      let response
      try {
        response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS_PER_BATCH,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMsg }],
        })
      } catch (e) {
        console.error(`[import/match] batch ${b + 1} anthropic error:`, e)
        batchErrors.push({ batch: b + 1, reason: e instanceof Error ? e.message : "unknown" })
        continue
      }

      const stop = response.stop_reason
      const text = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map(c => c.text).join("").trim()
      const cleaned = extractJson(text)

      let batchParsed: ModelResult[] = []
      try {
        const raw = JSON.parse(cleaned)
        if (Array.isArray(raw)) batchParsed = raw
        else if (raw && Array.isArray(raw.matches)) batchParsed = raw.matches
      } catch {
        console.warn(`[import/match] batch ${b + 1} JSON parse failed (stop=${stop}):`, text.slice(0, 400))
        batchErrors.push({ batch: b + 1, reason: `Invalid JSON (stop_reason=${stop})`, sample: text.slice(0, 200) })
        continue
      }
      parsed.push(...batchParsed)
    }
  }

  const matches: MatchedRow[] = states.map(s => {
    if (!s.needsLlm && s.heuristic) {
      return {
        ...s.row,
        top: s.heuristic.top,
        candidates: s.heuristic.candidates,
      }
    }
    const m = parsed.find(p => p.raw_name === s.row.raw_name)
    if (!m) {
      if (s.heuristic) {
        return {
          ...s.row,
          top: s.heuristic.top,
          candidates: s.heuristic.candidates,
          unmatched_reason: "Below heuristic threshold; AI fallback failed",
        }
      }
      return { ...s.row, top: null, candidates: [], unmatched_reason: "No match" }
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
    return { ...s.row, top, candidates, unmatched_reason: m.unmatched_reason ?? undefined }
  })

  return NextResponse.json({
    matches,
    batch_errors: batchErrors,
    stats: { total: rows.length, heuristic_accepted: heuristicAccepted, llm_resolved: llmRows.length },
  })
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : parseFloat(String(n))
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  if (stripped.startsWith("[") || stripped.startsWith("{")) return stripped
  const firstBracket = stripped.indexOf("[")
  const firstBrace = stripped.indexOf("{")
  const starts = [firstBracket, firstBrace].filter(i => i >= 0)
  if (starts.length === 0) return stripped
  const start = Math.min(...starts)
  const close = stripped[start] === "[" ? "]" : "}"
  const end = stripped.lastIndexOf(close)
  if (end <= start) return stripped
  return stripped.slice(start, end + 1)
}

function buildPrompt(items: { row: ImportRow; pool: CatalogEntryFlat[] }[]): string {
  const blocks = items.map((it, i) => {
    const candList = it.pool.map(c => `  - id="${c.id}" type=${c.type} label="${c.label}"`).join("\n")
    const typeHint = it.row.account_type ? ` (type hint: ${it.row.account_type})` : ""
    return `Row ${i + 1}: "${it.row.raw_name}"${typeHint}\nCandidates:\n${candList || "  (none)"}`
  }).join("\n\n")

  return `Match each row below to its best catalog candidate.

${blocks}

Return JSON: an array of objects, one per row, each with:
- raw_name: the exact input string (verbatim)
- top_id: the catalog id of the best match, or null if no candidate fits
- candidates: array of up to 3 { id, confidence } objects sorted by confidence desc
- unmatched_reason: short string if top_id is null, else null

Only use ids from the candidate lists above. Do not invent ids.`
}
