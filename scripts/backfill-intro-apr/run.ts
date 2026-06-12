/* eslint-disable no-console */
/**
 * Backfill 0% intro APR data onto existing credit-card catalog entries.
 *
 * Most cards in lib/data/creditCardBonuses.ts predate the extractIntroApr()
 * pipeline, so even cards that advertise a long 0% intro period have an
 * empty intro_apr field. This script:
 *   1. Iterates every non-expired card without intro_apr already set
 *   2. Reuses the verify-cards page cache when available, or fetches
 *      via the shared Playwright helper otherwise
 *   3. Runs extractIntroApr() against the page text
 *   4. Writes a proposal JSON listing every match
 *   5. With --apply, patches lib/data/creditCardBonuses.ts so each
 *      matched card gets a populated intro_apr block
 *
 * Safety: dry-run by default. The patcher only inserts intro_apr when
 * none exists today; it never overwrites a hand-curated block.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { extractIntroApr, type ExtractedIntroApr } from "../verify-cards/extract"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const SKIP_FETCH = args.includes("--cache-only")

const ROOT = process.cwd()
const CACHE_DIR = join(ROOT, ".cache", "verify-cards")
const OUT_DIR = join(ROOT, "verification-output")
const CATALOG_PATH = join(ROOT, "lib", "data", "creditCardBonuses.ts")
const UA = process.env.BONUS_BOT_UA || "StackOS-BonusBot/1.0 (+https://fatstacksacademy.com/bot)"

function cacheKey(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^a-z0-9-_]/gi, "_")}.json`)
}

function loadCached(id: string): { textContent: string } | null {
  const p = cacheKey(id)
  if (!existsSync(p)) return null
  try {
    const entry = JSON.parse(readFileSync(p, "utf8"))
    if (typeof entry.textContent === "string" && entry.textContent.length > 200) {
      return { textContent: entry.textContent }
    }
  } catch {}
  return null
}

type Proposal = {
  id: string
  card_name: string
  offer_link: string
  intro_apr: ExtractedIntroApr
  source: "cache" | "fetch"
}

async function gatherPageText(card: CreditCardBonus): Promise<{ text: string; source: "cache" | "fetch" } | null> {
  const cached = loadCached(card.id)
  if (cached) return { text: cached.textContent, source: "cache" }
  if (SKIP_FETCH) return null
  if (!card.offer_link) return null
  const r = await fetchPage(card.offer_link, { userAgent: UA })
  if (!r.ok) return null
  return { text: r.textContent, source: "fetch" }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const candidates = (creditCardBonuses as CreditCardBonus[]).filter(
    (c) => !c.expired && !c.intro_apr && c.offer_link,
  )
  const targets = LIMIT > 0 ? candidates.slice(0, LIMIT) : candidates
  console.log(
    `Backfill intro_apr: ${candidates.length} catalog cards have no intro_apr yet (scanning ${targets.length}, source=${SKIP_FETCH ? "cache-only" : "cache+fetch"}, apply=${APPLY}).`,
  )

  const proposals: Proposal[] = []
  let cacheHits = 0
  let fetches = 0
  let extracted = 0
  for (let i = 0; i < targets.length; i++) {
    const card = targets[i]
    const got = await gatherPageText(card)
    if (!got) continue
    if (got.source === "cache") cacheHits++
    else fetches++
    const r = extractIntroApr(got.text)
    if (!r.intro) continue
    if (
      r.intro.purchaseAprMonths === null &&
      r.intro.btAprMonths === null
    ) {
      continue
    }
    extracted++
    proposals.push({
      id: card.id,
      card_name: card.card_name,
      offer_link: card.offer_link,
      intro_apr: r.intro,
      source: got.source,
    })
    const tag = [
      r.intro.purchaseAprMonths !== null ? `${r.intro.purchaseAprMonths}mo purchases` : null,
      r.intro.btAprMonths !== null ? `${r.intro.btAprMonths}mo BT` : null,
      r.intro.btFeePct !== null ? `${r.intro.btFeePct}% BT fee` : null,
    ]
      .filter(Boolean)
      .join(" / ")
    console.log(`  [${i + 1}/${targets.length}] ${card.card_name} → ${tag}`)
  }

  writeFileSync(
    join(OUT_DIR, "intro-apr-proposed.json"),
    JSON.stringify(proposals, null, 2),
  )
  console.log(
    `\nScanned ${targets.length} cards (cache=${cacheHits}, fetch=${fetches}), extracted intro_apr on ${extracted}.`,
  )
  console.log(`Proposals written to ${join(OUT_DIR, "intro-apr-proposed.json")}.`)

  if (!APPLY) {
    console.log(`Re-run with --apply to patch lib/data/creditCardBonuses.ts.`)
    return
  }

  // Patcher: for each proposal, locate the catalog entry by id and
  // insert an intro_apr block immediately after the card_name line.
  // We do NOT overwrite existing intro_apr — the filter above already
  // excluded those, but we also gate here defensively.
  let src = readFileSync(CATALOG_PATH, "utf8")
  let patched = 0
  for (const p of proposals) {
    const idPattern = `id: "${p.id}",`
    const idIdx = src.indexOf(idPattern)
    if (idIdx < 0) {
      console.warn(`[patch] could not find ${p.id} in catalog — skipping.`)
      continue
    }
    // Look ahead within the entry block (up to next `},\n`).
    const entryEnd = src.indexOf("\n  },", idIdx)
    if (entryEnd < 0) {
      console.warn(`[patch] could not locate entry end for ${p.id}.`)
      continue
    }
    const entryBlock = src.slice(idIdx, entryEnd)
    if (/intro_apr\s*:/.test(entryBlock)) {
      // Hand-curated or already populated by a prior run — skip.
      continue
    }
    const parts: string[] = []
    if (p.intro_apr.purchaseAprMonths !== null) parts.push(`purchase_apr_months: ${p.intro_apr.purchaseAprMonths}`)
    if (p.intro_apr.btAprMonths !== null) parts.push(`bt_apr_months: ${p.intro_apr.btAprMonths}`)
    if (p.intro_apr.btFeePct !== null) parts.push(`bt_fee_pct: ${p.intro_apr.btFeePct}`)
    if (p.intro_apr.goToAprLow !== null) parts.push(`go_to_apr_low: ${p.intro_apr.goToAprLow}`)
    if (p.intro_apr.goToAprHigh !== null) parts.push(`go_to_apr_high: ${p.intro_apr.goToAprHigh}`)
    if (parts.length === 0) continue
    const block = `\n    intro_apr: { ${parts.join(", ")} },`
    // Insert right before the entry's closing `\n  },`.
    src = src.slice(0, entryEnd) + block + src.slice(entryEnd)
    patched++
  }
  writeFileSync(CATALOG_PATH, src)
  console.log(`Patched ${patched} catalog entries with intro_apr.`)
}

main()
  .catch(async (err) => {
    console.error(err)
    await closeBrowser()
    process.exit(1)
  })
  .finally(async () => {
    await closeBrowser()
  })
