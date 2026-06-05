import { bonuses } from "./data/bonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"
import { savingsBonuses } from "./data/savingsBonuses"

export type DetectedSchema = {
  account_name_col: string | null
  account_type_col: string | null
  opened_date_col: string | null
  closed_date_col: string | null
  balance_col: string | null
  status_col: string | null
  notes_col: string | null
  confidence: number
}

export type ImportRow = {
  raw_name: string
  account_type?: string | null
  opened_date?: string | null
  closed_date?: string | null
  balance?: number | null
  status?: string | null
  notes?: string | null
}

export type CatalogEntryFlat = {
  id: string
  label: string
  issuer_or_bank: string
  type: "checking" | "savings" | "credit_card"
}

export type MatchCandidate = {
  catalog_id: string
  label: string
  type: "checking" | "savings" | "credit_card"
  confidence: number
}

export type MatchedRow = ImportRow & {
  top: MatchCandidate | null
  candidates: MatchCandidate[]
  unmatched_reason?: string
}

export type ParsedSheet = {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseDelimited(text: string): ParsedSheet {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const delim = detectDelimiter(lines[0])
  const headers = splitDelimited(lines[0], delim).map(s => s.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitDelimited(lines[i], delim)
    if (cells.every(c => c.trim() === "")) continue
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (cells[j] ?? "").trim()
    rows.push(row)
  }
  return { headers, rows }
}

function detectDelimiter(line: string): string {
  const counts = { ",": 0, "\t": 0, ";": 0 }
  let inQ = false
  for (const c of line) {
    if (c === '"') inQ = !inQ
    if (!inQ && (c === "," || c === "\t" || c === ";")) counts[c]++
  }
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t"
  if (counts[";"] > counts[","]) return ";"
  return ","
}

function splitDelimited(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
    if (c === '"') { inQ = !inQ; continue }
    if (c === delim && !inQ) { out.push(cur); cur = ""; continue }
    cur += c
  }
  out.push(cur)
  return out
}

export function applySchema(sheet: ParsedSheet, schema: DetectedSchema): ImportRow[] {
  const out: ImportRow[] = []
  const seen = new Set<string>()
  for (const r of sheet.rows) {
    const name = schema.account_name_col ? r[schema.account_name_col]?.trim() : ""
    if (!name) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push({
      raw_name: name,
      account_type: schema.account_type_col ? cleanField(r[schema.account_type_col]) : null,
      opened_date: schema.opened_date_col ? normalizeDate(r[schema.opened_date_col]) : null,
      closed_date: schema.closed_date_col ? normalizeDate(r[schema.closed_date_col]) : null,
      balance: schema.balance_col ? parseMoney(r[schema.balance_col]) : null,
      status: schema.status_col ? cleanField(r[schema.status_col]) : null,
      notes: schema.notes_col ? cleanField(r[schema.notes_col]) : null,
    })
  }
  return out
}

function cleanField(v: string | undefined): string | null {
  if (!v) return null
  const s = v.trim()
  return s.length === 0 ? null : s
}

function parseMoney(v: string | undefined): number | null {
  if (!v) return null
  const cleaned = v.replace(/[$,\s]/g, "").replace(/[()]/g, "")
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return v.includes("(") ? -n : n
}

function normalizeDate(v: string | undefined): string | null {
  if (!v) return null
  const s = v.trim()
  if (s.length === 0) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s)
  if (us) {
    const mm = us[1].padStart(2, "0")
    const dd = us[2].padStart(2, "0")
    let yy = us[3]
    if (yy.length === 2) yy = (parseInt(yy, 10) > 70 ? "19" : "20") + yy
    return `${yy}-${mm}-${dd}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return null
}

export function buildCatalogFlat(): CatalogEntryFlat[] {
  const out: CatalogEntryFlat[] = []
  for (const b of bonuses) {
    if (b.expired) continue
    out.push({
      id: b.id,
      label: `${b.bank_name} (${b.product_type ?? "checking"})`,
      issuer_or_bank: b.bank_name ?? "",
      type: "checking",
    })
  }
  for (const s of savingsBonuses) {
    if (s.expired) continue
    out.push({
      id: s.id,
      label: `${s.bank_name} (savings)`,
      issuer_or_bank: s.bank_name ?? "",
      type: "savings",
    })
  }
  for (const c of creditCardBonuses) {
    if (c.expired) continue
    out.push({
      id: c.id,
      label: `${c.card_name} (${c.issuer})`,
      issuer_or_bank: c.issuer ?? "",
      type: "credit_card",
    })
  }
  return out
}

export function normalizeAccountName(raw: string): string {
  let s = raw.toLowerCase()
  s = s.replace(/^[pb]-\s*/i, "")
  s = s.replace(/\d{1,2}\/\d{2,4}/g, "")
  s = s.replace(/\b0%\b/g, "")
  s = s.replace(/\b(credit card|checking|savings|cc|biz|business|personal)\b/g, "")
  s = s.replace(/\s+/g, " ").trim()
  return s
}

const STOPWORDS = new Set(["the", "of", "and", "or", "a", "an"])

const ABBREV_EXPANSIONS: Record<string, string[]> = {
  fu: ["freedom unlimited"],
  csp: ["sapphire preferred"],
  csr: ["sapphire reserve"],
  bbc: ["blue business cash"],
  bbp: ["blue business plus"],
  bce: ["blue cash everyday"],
  bcp: ["blue cash preferred"],
  ihg: ["ihg"],
  usb: ["us bank"],
  wf: ["wells fargo"],
  boa: ["bank of america"],
  cfu: ["chase freedom unlimited"],
  cff: ["chase freedom flex"],
  ink: ["ink business"],
}

function tokenize(s: string): string[] {
  const norm = normalizeAccountName(s)
  const raw = norm.split(/\s+/).filter(t => t.length >= 2 && !STOPWORDS.has(t))
  const out: string[] = []
  for (const t of raw) {
    out.push(t)
    if (ABBREV_EXPANSIONS[t]) out.push(...ABBREV_EXPANSIONS[t].flatMap(x => x.split(" ")))
  }
  return out
}

function bigramSet(s: string): Set<string> {
  const clean = s.toLowerCase().replace(/[^a-z0-9]+/g, "")
  const out = new Set<string>()
  for (let i = 0; i < clean.length - 1; i++) out.add(clean.slice(i, i + 2))
  return out
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersect = 0
  for (const g of a) if (b.has(g)) intersect++
  return (2 * intersect) / (a.size + b.size)
}

export function cheapPrefilter(rawName: string, accountType: string | null | undefined, catalog: CatalogEntryFlat[]): CatalogEntryFlat[] {
  const tokens = tokenize(rawName)
  const typeHint = (accountType ?? "").toLowerCase()
  const isCC = /credit|card|cc/.test(typeHint)
  const isSavings = /saving/.test(typeHint)
  const isChecking = /check/.test(typeHint)

  const scored = catalog.map(c => {
    const hay = (c.label + " " + c.issuer_or_bank).toLowerCase()
    let hits = 0
    for (const t of tokens) if (hay.includes(t)) hits++
    let typeBoost = 0
    if (isCC && c.type === "credit_card") typeBoost = 2
    else if (isSavings && c.type === "savings") typeBoost = 2
    else if (isChecking && c.type === "checking") typeBoost = 2
    return { c, score: hits + typeBoost }
  })
  scored.sort((a, b) => b.score - a.score)
  const withHits = scored.filter(s => s.score > 0)
  const top = withHits.length >= 5 ? withHits : scored
  return top.slice(0, 25).map(s => s.c)
}

export type HeuristicMatchResult = {
  top: MatchCandidate
  candidates: MatchCandidate[]
  confidence: number
  margin: number
}

export function heuristicMatch(
  rawName: string,
  accountType: string | null | undefined,
  catalog: CatalogEntryFlat[],
): HeuristicMatchResult | null {
  const pool = cheapPrefilter(rawName, accountType, catalog)
  if (pool.length === 0) return null
  const queryGrams = bigramSet(normalizeAccountName(rawName) + " " + (accountType ?? ""))
  const queryTokens = new Set(tokenize(rawName))
  const typeHint = (accountType ?? "").toLowerCase()
  const isCC = /credit|card|cc/.test(typeHint)
  const isSavings = /saving/.test(typeHint)
  const isChecking = /check/.test(typeHint)

  const scored = pool.map(c => {
    const labelGrams = bigramSet(c.label + " " + c.issuer_or_bank)
    const diceScore = dice(queryGrams, labelGrams)
    let tokenScore = 0
    for (const t of queryTokens) {
      const hay = (c.label + " " + c.issuer_or_bank).toLowerCase()
      if (hay.includes(t)) tokenScore += 1
    }
    tokenScore = queryTokens.size > 0 ? tokenScore / queryTokens.size : 0
    let typeBoost = 0
    if (isCC && c.type === "credit_card") typeBoost = 0.15
    else if (isSavings && c.type === "savings") typeBoost = 0.15
    else if (isChecking && c.type === "checking") typeBoost = 0.15
    else if (typeHint && c.type === "credit_card" && !isCC) typeBoost = -0.1
    const confidence = Math.min(1, 0.55 * diceScore + 0.35 * tokenScore + typeBoost)
    return { entry: c, confidence }
  })
  scored.sort((a, b) => b.confidence - a.confidence)
  const top = scored[0]
  const second = scored[1]
  if (!top) return null
  const margin = top.confidence - (second?.confidence ?? 0)
  const candidates: MatchCandidate[] = scored.slice(0, 3).map(s => ({
    catalog_id: s.entry.id,
    label: s.entry.label,
    type: s.entry.type,
    confidence: Math.round(s.confidence * 100) / 100,
  }))
  return {
    top: candidates[0],
    candidates,
    confidence: top.confidence,
    margin,
  }
}

export const HEURISTIC_ACCEPT_THRESHOLD = 0.78
export const HEURISTIC_MARGIN_THRESHOLD = 0.08

export type SchemaDetectionResult = {
  schema: DetectedSchema
  matched_headers: string[]
}

type SchemaStringField = Exclude<keyof DetectedSchema, "confidence">

const HEADER_PATTERNS: { field: SchemaStringField; patterns: RegExp[] }[] = [
  { field: "account_name_col", patterns: [/^account$/i, /^account[\s_]*name$/i, /^bank[\s_]*name$/i, /^bank$/i, /^card[\s_]*name$/i, /^card$/i, /^institution/i, /^name$/i, /^account[\s_]*nickname$/i, /^description$/i] },
  { field: "account_type_col", patterns: [/^type$/i, /^account[\s_]*type$/i, /^product[\s_]*type$/i, /^product$/i, /^category$/i, /^kind$/i] },
  { field: "opened_date_col", patterns: [/^opened$/i, /^date[\s_]*opened$/i, /^opened[\s_]*on$/i, /^opened[\s_]*date$/i, /^open[\s_]*date$/i, /^start[\s_]*date$/i, /^origination[\s_]*date$/i, /^created$/i] },
  { field: "closed_date_col", patterns: [/^closed$/i, /^date[\s_]*closed$/i, /^closed[\s_]*on$/i, /^closed[\s_]*date$/i, /^close[\s_]*date$/i, /^end[\s_]*date$/i, /^terminated[\s_]*on$/i] },
  { field: "balance_col", patterns: [/^balance$/i, /^current[\s_]*balance$/i, /^amount$/i, /^current[\s_]*amount$/i, /^value$/i] },
  { field: "status_col", patterns: [/^status$/i, /^state$/i, /^condition$/i] },
  { field: "notes_col", patterns: [/^notes?$/i, /^comments?$/i, /^memo$/i, /^description$/i, /^remarks?$/i] },
]

export function detectSchemaHeuristic(sheet: ParsedSheet): SchemaDetectionResult {
  const schema: DetectedSchema = {
    account_name_col: null,
    account_type_col: null,
    opened_date_col: null,
    closed_date_col: null,
    balance_col: null,
    status_col: null,
    notes_col: null,
    confidence: 0,
  }
  const matched: string[] = []
  for (const { field, patterns } of HEADER_PATTERNS) {
    for (const h of sheet.headers) {
      if (patterns.some(rx => rx.test(h.trim()))) {
        if (!schema[field]) {
          schema[field] = h
          matched.push(h)
          break
        }
      }
    }
  }
  if (!schema.account_name_col) {
    const cand = sheet.headers.find(h => /name|account|bank|card|institution/i.test(h))
    if (cand) { schema.account_name_col = cand; matched.push(cand) }
  }
  if (!schema.opened_date_col && sheet.rows.length > 0) {
    for (const h of sheet.headers) {
      const looksLikeDate = sheet.rows.slice(0, 3).some(r => /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(r[h] ?? ""))
      if (looksLikeDate && /open|start|date/i.test(h) && !schema.closed_date_col) {
        schema.opened_date_col = h
        matched.push(h)
        break
      }
    }
  }
  const requiredCount = schema.account_name_col ? 1 : 0
  const optionalCount = ["account_type_col", "opened_date_col", "closed_date_col", "balance_col", "status_col"].filter(k => schema[k as keyof DetectedSchema] !== null).length
  schema.confidence = schema.account_name_col ? Math.min(1, 0.5 + 0.1 * optionalCount + 0.3 * requiredCount) : 0.2
  return { schema, matched_headers: matched }
}
