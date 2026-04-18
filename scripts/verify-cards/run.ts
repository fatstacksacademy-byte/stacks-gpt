/* eslint-disable no-console */
/**
 * Credit-card bonus verifier. Parallel to scripts/verify-bonuses/run.ts but
 * targets CreditCardBonus records and uses CC-specific extractors.
 *
 * For every non-expired card in lib/data/creditCardBonuses.ts:
 *  1. Fetch `offer_link` via shared Playwright helper
 *  2. Flag dead links (4xx, redirects to generic cards homepage)
 *  3. Extract bonus amount, min spend, spend months, annual fee
 *  4. Compare against stored catalog values
 *  5. Sanity-check that the card name appears on the page (catches the
 *     "Upromise offer_link pointed to upromise.com's generic page" kind
 *     of bug where the URL loads fine but isn't the right card)
 *
 * Writes `verification-output/cards-report.md` + `cards-proposed-edits.json`.
 * Cache in `.cache/verify-cards/` for fast re-runs.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { extractAll, type CardExtracted } from "./extract"

const args = process.argv.slice(2)
function flag(name: string): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1]
}
const ONLY = flag("only")
const LIMIT = Number(flag("limit") ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const INCLUDE_EXPIRED = args.includes("--include-expired")

const OUT_DIR = join(process.cwd(), "verification-output")
const CACHE_DIR = join(process.cwd(), ".cache", "verify-cards")
const CONCURRENCY = 3
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CardPageSignal =
  | "ok"
  | "offer_dead"
  | "redirected_to_generic"
  | "card_name_mismatch"
  | "fetch_error"

type FieldResult = {
  field: "bonus_amount" | "min_spend" | "spend_months" | "annual_fee"
  stored: unknown
  extracted: unknown
  status: "match" | "mismatch" | "missing"
}

type CardResult = {
  id: string
  card_name: string
  issuer: string
  url: string
  finalUrl: string
  status: number
  pageSignal: CardPageSignal
  error?: string
  fields: FieldResult[]
  extracted: CardExtracted | null
  cacheHit: boolean
  verifiedAt: string
}

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function cacheKey(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^a-z0-9-_]/gi, "_")}.json`)
}

function loadCached(
  id: string,
): { url: string; textContent: string; finalUrl: string; status: number; fetchedAt: string } | null {
  const p = cacheKey(id)
  if (!existsSync(p)) return null
  try {
    const entry = JSON.parse(readFileSync(p, "utf8"))
    const age = Date.now() - new Date(entry.fetchedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

function saveCache(id: string, entry: { url: string; textContent: string; finalUrl: string; status: number; fetchedAt: string }) {
  ensureDir(CACHE_DIR)
  writeFileSync(cacheKey(id), JSON.stringify(entry, null, 2))
}

function compareCard(card: CreditCardBonus, extracted: CardExtracted): FieldResult[] {
  const out: FieldResult[] = []

  // Bonus amount — with a 10% tolerance (points totals often round)
  if (extracted.bonusAmount === null) {
    out.push({ field: "bonus_amount", stored: card.bonus_amount, extracted: null, status: "missing" })
  } else if (card.bonus_amount === extracted.bonusAmount) {
    out.push({ field: "bonus_amount", stored: card.bonus_amount, extracted: extracted.bonusAmount, status: "match" })
  } else {
    const ratio = Math.abs(card.bonus_amount - extracted.bonusAmount) / Math.max(card.bonus_amount, extracted.bonusAmount)
    out.push({
      field: "bonus_amount",
      stored: card.bonus_amount,
      extracted: extracted.bonusAmount,
      status: ratio < 0.1 ? "match" : "mismatch",
    })
  }

  // Min spend
  if (extracted.minSpend === null) {
    out.push({ field: "min_spend", stored: card.min_spend, extracted: null, status: "missing" })
  } else {
    out.push({
      field: "min_spend",
      stored: card.min_spend,
      extracted: extracted.minSpend,
      status: card.min_spend === extracted.minSpend ? "match" : "mismatch",
    })
  }

  // Spend months
  if (extracted.spendMonths === null) {
    out.push({ field: "spend_months", stored: card.spend_months, extracted: null, status: "missing" })
  } else {
    out.push({
      field: "spend_months",
      stored: card.spend_months,
      extracted: extracted.spendMonths,
      status: card.spend_months === extracted.spendMonths ? "match" : "mismatch",
    })
  }

  // Annual fee
  if (extracted.annualFee === null) {
    out.push({ field: "annual_fee", stored: card.annual_fee, extracted: null, status: "missing" })
  } else {
    out.push({
      field: "annual_fee",
      stored: card.annual_fee,
      extracted: extracted.annualFee,
      status: card.annual_fee === extracted.annualFee ? "match" : "mismatch",
    })
  }

  return out
}

async function verifyCard(card: CreditCardBonus): Promise<CardResult> {
  const verifiedAt = new Date().toISOString()
  const url = card.offer_link ?? ""
  if (!url) {
    return {
      id: card.id, card_name: card.card_name, issuer: card.issuer,
      url: "", finalUrl: "", status: 0, pageSignal: "fetch_error",
      error: "no offer_link", fields: [], extracted: null,
      cacheHit: false, verifiedAt,
    }
  }

  // Cache
  const cached = USE_CACHE ? loadCached(card.id) : null
  let textContent: string, finalUrl: string, status: number, errorMsg: string | undefined
  let cacheHit = false

  if (cached && cached.url === url) {
    textContent = cached.textContent
    finalUrl = cached.finalUrl
    status = cached.status
    cacheHit = true
  } else {
    const f = await fetchPage(url)
    textContent = f.textContent
    finalUrl = f.finalUrl
    status = f.status
    errorMsg = f.error
    if (f.ok && textContent) {
      saveCache(card.id, { url, textContent, finalUrl, status, fetchedAt: f.fetchedAt })
    }
  }

  // Classify page signal
  let pageSignal: CardPageSignal = "ok"
  if (errorMsg) {
    pageSignal = "fetch_error"
  } else if (status === 404 || status === 410) {
    pageSignal = "offer_dead"
  } else if (status === 0) {
    pageSignal = "fetch_error"
  } else {
    // Redirected to a clearly-generic URL (issuer's card catalog homepage)?
    try {
      const orig = new URL(url).pathname
      const final = new URL(finalUrl).pathname
      const genericPaths = ["/", "/credit-cards", "/credit-cards/", "/cards", "/cards/"]
      if (orig.length > 3 && genericPaths.includes(final)) {
        pageSignal = "redirected_to_generic"
      }
    } catch {}
  }

  const extracted = pageSignal === "fetch_error" || pageSignal === "offer_dead" ? null : extractAll(textContent, card.card_name)

  // Promote "card_name_not_on_page" to a page-level signal — this is the
  // exact class of bug that hit Upromise (URL resolves 200 but is some
  // other page entirely).
  if (extracted && !extracted.cardNameOnPage && pageSignal === "ok") {
    pageSignal = "card_name_mismatch"
  }

  const fields = extracted ? compareCard(card, extracted) : []
  return {
    id: card.id, card_name: card.card_name, issuer: card.issuer,
    url, finalUrl, status, pageSignal, error: errorMsg,
    fields, extracted, cacheHit, verifiedAt,
  }
}

function buildProposedEdits(results: CardResult[]): { id: string; path: string; from: unknown; to: unknown; reason: string }[] {
  const edits: { id: string; path: string; from: unknown; to: unknown; reason: string }[] = []
  for (const r of results) {
    if (r.pageSignal === "offer_dead" || r.pageSignal === "redirected_to_generic" || r.pageSignal === "card_name_mismatch") {
      edits.push({
        id: r.id, path: "expired or offer_link",
        from: false, to: true,
        reason: `Page signal: ${r.pageSignal}${r.error ? ` (${r.error})` : ""}. Verify + update offer_link or mark expired.`,
      })
    }
    for (const f of r.fields) {
      if (f.status === "mismatch") {
        edits.push({
          id: r.id, path: f.field,
          from: f.stored, to: f.extracted,
          reason: "regex mismatch — human review",
        })
      }
    }
  }
  return edits
}

function buildReport(results: CardResult[], edits: ReturnType<typeof buildProposedEdits>): string {
  const total = results.length
  const ok = results.filter((r) => r.pageSignal === "ok" && r.fields.every((f) => f.status === "match")).length
  const mismatch = results.filter((r) => r.pageSignal === "ok" && r.fields.some((f) => f.status === "mismatch")).length
  const dead = results.filter((r) => r.pageSignal === "offer_dead").length
  const redirected = results.filter((r) => r.pageSignal === "redirected_to_generic").length
  const wrongPage = results.filter((r) => r.pageSignal === "card_name_mismatch").length
  const fetchErrors = results.filter((r) => r.pageSignal === "fetch_error").length

  const out: string[] = []
  out.push(`# Credit Card Bonus Verification`)
  out.push(``)
  out.push(`Generated: ${new Date().toISOString()}`)
  out.push(``)
  out.push(`## Summary`)
  out.push(``)
  out.push(`- Total verified: **${total}**`)
  out.push(`- ✅ OK: ${ok}`)
  out.push(`- ⚠️ Field mismatch: ${mismatch}`)
  out.push(`- 🪦 Dead link (4xx): ${dead}`)
  out.push(`- ↪️ Redirected to generic cards page: ${redirected}`)
  out.push(`- 🚩 Wrong page (card name not found): ${wrongPage}`)
  out.push(`- 🚨 Fetch error: ${fetchErrors}`)
  out.push(`- 📝 Proposed edits: **${edits.length}**`)
  out.push(``)
  out.push(`## Issues by card`)
  out.push(``)
  for (const r of results) {
    const hasIssue = r.pageSignal !== "ok" || r.fields.some((f) => f.status !== "match" && f.status !== "missing")
    if (!hasIssue) continue
    out.push(`### ${r.card_name} (\`${r.id}\`)`)
    out.push(``)
    out.push(`- URL: ${r.url}`)
    out.push(`- Status: ${r.status}${r.finalUrl && r.finalUrl !== r.url ? ` (redirected to ${r.finalUrl})` : ""}`)
    out.push(`- Page signal: **${r.pageSignal}**${r.error ? ` — ${r.error}` : ""}`)
    for (const f of r.fields) {
      if (f.status === "match" || f.status === "missing") continue
      out.push(`- **${f.field}**: stored \`${JSON.stringify(f.stored)}\` vs extracted \`${JSON.stringify(f.extracted)}\``)
    }
    if (r.extracted?.flags?.length) {
      out.push(`- Flags: ${r.extracted.flags.join(", ")}`)
    }
    out.push(``)
  }
  return out.join("\n")
}

async function main() {
  let targets: CreditCardBonus[] = creditCardBonuses as CreditCardBonus[]
  if (!INCLUDE_EXPIRED) targets = targets.filter((c) => !c.expired)
  if (ONLY) targets = targets.filter((c) => c.id === ONLY)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Verifying ${targets.length} credit card bonuses (cache=${USE_CACHE ? "on" : "off"})`)

  const limit = pLimit(CONCURRENCY)
  const results: CardResult[] = []
  let done = 0

  await Promise.all(
    targets.map((c) =>
      limit(async () => {
        const r = await verifyCard(c)
        results.push(r)
        done++
        const tag =
          r.pageSignal === "ok"
            ? r.fields.some((f) => f.status === "mismatch")
              ? "⚠️"
              : "✅"
            : r.pageSignal === "offer_dead" || r.pageSignal === "redirected_to_generic" || r.pageSignal === "card_name_mismatch"
              ? "🚩"
              : "🚨"
        console.log(`[${done}/${targets.length}] ${tag} ${r.card_name} (${r.pageSignal})${r.cacheHit ? " ·cached" : ""}`)
      }),
    ),
  )

  await closeBrowser()

  const edits = buildProposedEdits(results)
  ensureDir(OUT_DIR)
  writeFileSync(join(OUT_DIR, "cards-results.json"), JSON.stringify(results, null, 2))
  writeFileSync(join(OUT_DIR, "cards-proposed-edits.json"), JSON.stringify(edits, null, 2))
  writeFileSync(join(OUT_DIR, "cards-report.md"), buildReport(results, edits))

  console.log(``)
  console.log(`Done. Report: ${join(OUT_DIR, "cards-report.md")}`)
  const summary = {
    total: results.length,
    ok: results.filter((r) => r.pageSignal === "ok" && r.fields.every((f) => f.status === "match")).length,
    mismatch: results.filter((r) => r.pageSignal === "ok" && r.fields.some((f) => f.status === "mismatch")).length,
    dead: results.filter((r) => r.pageSignal === "offer_dead").length,
    redirected: results.filter((r) => r.pageSignal === "redirected_to_generic").length,
    wrongPage: results.filter((r) => r.pageSignal === "card_name_mismatch").length,
    fetchErrors: results.filter((r) => r.pageSignal === "fetch_error").length,
  }
  console.log(`Summary:`, summary, `| proposed edits: ${edits.length}`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
