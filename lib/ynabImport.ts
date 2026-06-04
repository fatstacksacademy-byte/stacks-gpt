import { bonuses } from "./data/bonuses"
import { creditCardBonuses } from "./data/creditCardBonuses"
import { savingsBonuses } from "./data/savingsBonuses"

export type YnabAccount = {
  raw_name: string
  account_type?: string
  balance?: number
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

export type MatchedAccount = {
  raw_name: string
  account_type?: string
  balance?: number
  top: MatchCandidate | null
  candidates: MatchCandidate[]
  unmatched_reason?: string
}

export function parseAccountsFromRegisterCsv(csv: string): YnabAccount[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = splitCsvLine(lines[0]).map(s => s.toLowerCase().trim())
  const accountCol = header.findIndex(h => h === "account")
  if (accountCol < 0) return []
  const seen = new Map<string, YnabAccount>()
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const name = cells[accountCol]?.trim()
    if (!name) continue
    if (!seen.has(name)) seen.set(name, { raw_name: name })
  }
  return Array.from(seen.values())
}

export function parseAccountsList(text: string): YnabAccount[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(raw_name => ({ raw_name }))
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
    if (c === '"') { inQ = !inQ; continue }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue }
    cur += c
  }
  out.push(cur)
  return out
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

export function cheapPrefilter(account: YnabAccount, catalog: CatalogEntryFlat[]): CatalogEntryFlat[] {
  const norm = normalizeAccountName(account.raw_name)
  const tokens = norm.split(/\s+/).filter(t => t.length >= 3 && !STOPWORDS.has(t))
  if (tokens.length === 0) return catalog.slice(0, 50)
  const scored = catalog.map(c => {
    const hay = (c.label + " " + c.issuer_or_bank).toLowerCase()
    let hits = 0
    for (const t of tokens) if (hay.includes(t)) hits++
    return { c, hits }
  })
  scored.sort((a, b) => b.hits - a.hits)
  const withHits = scored.filter(s => s.hits > 0)
  const top = withHits.length >= 5 ? withHits : scored
  return top.slice(0, 30).map(s => s.c)
}
