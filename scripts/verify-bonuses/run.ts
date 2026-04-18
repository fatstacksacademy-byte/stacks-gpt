/* eslint-disable no-console */
import pLimit from "p-limit"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { extract } from "./extract"
import { compareRecord } from "./compare"
import { escalate, needsEscalation } from "./escalate"
import { loadCache, saveCache, isFresh } from "./cache"
import { writeReport } from "./report"
import type {
  BonusRecord,
  VerificationResult,
  ProposedEdit,
  FieldResult,
} from "./types"

// CLI flags: --only=<id>, --limit=<n>, --no-cache, --no-escalate, --include-expired
const args = process.argv.slice(2)
function flag(name: string): string | undefined {
  const found = args.find((a) => a.startsWith(`--${name}=`))
  return found?.split("=")[1]
}
const ONLY = flag("only")
const LIMIT = Number(flag("limit") ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const ESCALATE = !args.includes("--no-escalate")
const INCLUDE_EXPIRED = args.includes("--include-expired")

const CONCURRENCY = 3
const MAX_ESCALATIONS_PER_RUN = 20

// Budget tracker for Claude calls
let escalationBudget = MAX_ESCALATIONS_PER_RUN

async function verifyOne(record: BonusRecord): Promise<VerificationResult> {
  const url = record.source_links?.[0] ?? ""
  const verifiedAt = new Date().toISOString()

  if (!url) {
    return {
      id: record.id,
      bank_name: record.bank_name,
      url: "",
      fetch: { ok: false, status: 0, finalUrl: "", redirected: false, error: "no source_link" },
      fields: [],
      pageSignal: "fetch_error",
      escalations: [],
      verifiedAt,
    }
  }

  // Cache
  const cached = USE_CACHE ? loadCache(record.id) : null
  const fresh = cached && cached.url === url && isFresh(cached)

  let textContent: string
  let fetch: VerificationResult["fetch"]
  let redirected = false
  let finalUrl = url
  let ok = true
  let status = 200

  if (fresh) {
    textContent = cached.textContent
    fetch = { ok: true, status: 200, finalUrl: cached.url, redirected: false }
  } else {
    const f = await fetchPage(url)
    textContent = f.textContent
    ok = f.ok
    status = f.status
    finalUrl = f.finalUrl
    redirected = f.redirected
    fetch = {
      ok: f.ok,
      status: f.status,
      finalUrl: f.finalUrl,
      redirected: f.redirected,
      error: f.error,
    }
    if (f.ok && textContent) {
      saveCache(record.id, {
        url,
        htmlHash: f.htmlHash,
        textContent: f.textContent,
        fetchedAt: f.fetchedAt,
      })
    }
  }

  // Page signals
  let pageSignal: VerificationResult["pageSignal"] = "ok"
  if (!ok) {
    if (status === 404 || status === 410) pageSignal = "offer_dead"
    else pageSignal = "fetch_error"
  } else if (redirected) {
    try {
      const orig = new URL(url).pathname
      const final = new URL(finalUrl).pathname
      if (orig.length > 3 && (final === "/" || final === ""))
        pageSignal = "promo_removed"
    } catch {}
  }

  const extracted = pageSignal === "ok" ? extract(textContent) : null
  if (extracted?.expiredText) pageSignal = "expired_text_on_page"

  let fields: FieldResult[] = []
  if (extracted) fields = compareRecord(record, extracted)

  // If every field came back "missing" AND the stored record has real values
  // to compare against, the page we fetched almost certainly isn't the live
  // offer page (it might be legal T&Cs, a generic product page, or a dead
  // product). Escalate from silent "missing" to a loud page signal.
  if (
    pageSignal === "ok" &&
    fields.length > 0 &&
    fields.every((f) => f.status === "missing") &&
    fields.some((f) => f.stored !== null && f.stored !== undefined)
  ) {
    pageSignal = "no_fields_extracted"
  }

  // Escalate ambiguous fields (budget-limited)
  const escalations: VerificationResult["escalations"] = []
  if (ESCALATE && extracted) {
    for (const f of fields) {
      if (!needsEscalation(f)) continue
      if (escalationBudget <= 0) break
      const snippet = "snippet" in f ? f.snippet ?? "" : ""
      if (!snippet) continue
      try {
        const v = await escalate(
          record.bank_name,
          f.field,
          f.stored,
          f.extracted,
          snippet,
        )
        escalations.push(v)
        escalationBudget--
      } catch (err) {
        console.warn(
          `[escalate] ${record.id}/${f.field} failed:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
  }

  return {
    id: record.id,
    bank_name: record.bank_name,
    url,
    fetch,
    fields,
    pageSignal,
    escalations,
    verifiedAt,
  }
}

// Build proposed edits from mismatches + escalations that say "different"
function buildEdits(results: VerificationResult[]): ProposedEdit[] {
  const edits: ProposedEdit[] = []
  for (const r of results) {
    if (r.pageSignal === "offer_dead" || r.pageSignal === "promo_removed" || r.pageSignal === "expired_text_on_page") {
      edits.push({
        id: r.id,
        path: "expired",
        from: false,
        to: true,
        reason: `Page signal: ${r.pageSignal}${r.fetch.error ? ` (${r.fetch.error})` : ""}`,
      })
      continue
    }
    const escalateMap = new Map(r.escalations.map((e) => [e.field, e]))
    for (const f of r.fields) {
      const path = fieldPath(f.field)
      if (!path) continue
      if (f.status === "mismatch" && "confidence" in f && f.confidence === "high") {
        edits.push({
          id: r.id,
          path,
          from: f.stored,
          to: f.extracted,
          reason: `High-confidence regex mismatch`,
        })
      } else if (f.status === "ambiguous") {
        const ver = escalateMap.get(f.field)
        if (ver?.verdict === "different") {
          edits.push({
            id: r.id,
            path,
            from: f.stored,
            to: f.extracted,
            reason: `Claude: different — ${ver.rationale}`,
          })
        }
      }
    }
  }
  return edits
}

function fieldPath(field: string): string | null {
  switch (field) {
    case "bonus_amount":
      return "bonus_amount"
    case "min_direct_deposit_total":
      return "requirements.min_direct_deposit_total"
    case "deposit_window_days":
      return "requirements.deposit_window_days"
    case "monthly_fee":
      return "fees.monthly_fee"
    default:
      return null
  }
}

async function main() {
  const all: BonusRecord[] = [
    ...(bonuses as BonusRecord[]),
    ...(savingsBonuses as unknown as BonusRecord[]),
  ]

  let targets = all
  if (ONLY) targets = targets.filter((b) => b.id === ONLY)
  if (!INCLUDE_EXPIRED) targets = targets.filter((b) => !b.expired)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(
    `Verifying ${targets.length} bonuses (concurrency=${CONCURRENCY}, cache=${USE_CACHE ? "on" : "off"}, escalate=${ESCALATE ? "on" : "off"})`,
  )

  const limit = pLimit(CONCURRENCY)
  const results: VerificationResult[] = []
  let done = 0

  await Promise.all(
    targets.map((t) =>
      limit(async () => {
        const r = await verifyOne(t)
        results.push(r)
        done++
        const tag =
          r.pageSignal === "ok"
            ? r.fields.some((f) => f.status === "mismatch")
              ? "⚠️"
              : r.fields.some((f) => f.status === "ambiguous")
                ? "❓"
                : "✅"
            : "🚨"
        console.log(`[${done}/${targets.length}] ${tag} ${r.bank_name} (${r.id})`)
      }),
    ),
  )

  await closeBrowser()

  const edits = buildEdits(results)
  const rpt = writeReport(results, edits)
  console.log(``)
  console.log(`Done. Output: ${rpt.outDir}`)
  console.log(`Summary:`, rpt.totals, `| proposed edits: ${rpt.proposedEdits}`)
  console.log(`Claude escalations used: ${MAX_ESCALATIONS_PER_RUN - escalationBudget}/${MAX_ESCALATIONS_PER_RUN}`)
}

main().catch((err) => {
  console.error(err)
  closeBrowser().finally(() => process.exit(1))
})
