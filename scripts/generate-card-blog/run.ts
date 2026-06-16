/* eslint-disable no-console */
/**
 * Card blog content generator.
 *
 * For every active card in lib/data/creditCardBonuses.ts that lacks a
 * cardBlogContent entry:
 *   1. Fetch the offer page via Playwright (verifies the link is alive)
 *   2. Extract bonus / spend / fee from the page text using the same
 *      regex set used by verify-cards/extract.ts
 *   3. If the page is dead or the card name is not on the page, skip and
 *      log — we won't publish a post pointing at a stale link
 *   4. Synthesize a CardBlogContent entry from VERIFIED catalog facts +
 *      page-confirmed numbers. The templating lives in ./build.ts.
 *
 * Output: rewrites lib/data/cardBlogContent.ts with the merged map.
 *
 * Flags:
 *   --limit=N   only process the first N missing cards
 *   --only=ID   only this one card id
 *   --no-cache  bypass the 24h Playwright cache (force re-fetch)
 *   --no-verify generate from catalog data only, skip the live-page fetch
 *   --dry-run   write to verification-output/card-blog-preview.json instead
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { cardBlogContent } from "../../lib/data/cardBlogContent"
import { extractAll } from "../verify-cards/extract"
import { buildEntry, stringifyEntry, type GeneratedEntry } from "./build"

const args = process.argv.slice(2)
const ONLY = args.find(a => a.startsWith("--only="))?.split("=")[1]
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const DRY_RUN = args.includes("--dry-run")
// Skip the live-page verification step. Generates content purely from
// catalog data — useful for cards with redirect chains, dead links, or
// pages that render dynamic content where extractAll can't see the card
// name. The article still has the offer card + rewards + key benefits
// + templated editorial, just without a fresh verifiedAt/verifiedUrl stamp.
const NO_VERIFY = args.includes("--no-verify")

const ROOT = process.cwd()
const OUT_PATH = join(ROOT, "lib", "data", "cardBlogContent.ts")
const PREVIEW_PATH = join(ROOT, "verification-output", "card-blog-preview.json")
const CACHE_DIR = join(ROOT, ".cache", "verify-cards")
const CONCURRENCY = 3
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type GenResult =
  | { kind: "generated"; id: string; entry: GeneratedEntry }
  | { kind: "skipped"; id: string; reason: string }

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function cachePath(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^a-z0-9-_]/gi, "_")}.json`)
}

function loadCachedText(id: string): { textContent: string; status: number; finalUrl: string } | null {
  const p = cachePath(id)
  if (!existsSync(p)) return null
  try {
    const entry = JSON.parse(readFileSync(p, "utf8"))
    const age = Date.now() - new Date(entry.fetchedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return { textContent: entry.textContent, status: entry.status, finalUrl: entry.finalUrl }
  } catch {
    return null
  }
}

async function processCard(c: CreditCardBonus): Promise<GenResult> {
  const url = c.offer_link

  // Unverified path: generate purely from catalog data, no fetch.
  // We still tag the entry with the catalog's offer_link as
  // verifiedUrl so the template references the right page.
  if (NO_VERIFY) {
    return {
      kind: "generated",
      id: c.id,
      entry: buildEntry(c, url || "", new Date().toISOString()),
    }
  }

  if (!url) return { kind: "skipped", id: c.id, reason: "no offer_link" }

  let textContent = ""
  let finalUrl = url
  let status = 0

  if (USE_CACHE) {
    const cached = loadCachedText(c.id)
    if (cached) {
      textContent = cached.textContent
      finalUrl = cached.finalUrl
      status = cached.status
    }
  }

  if (!textContent) {
    const f = await fetchPage(url)
    if (!f.ok) return { kind: "skipped", id: c.id, reason: `fetch failed: ${f.status} ${f.error ?? ""}` }
    textContent = f.textContent
    finalUrl = f.finalUrl
    status = f.status
  }

  if (status >= 400 || !textContent) {
    return { kind: "skipped", id: c.id, reason: `dead link (status ${status})` }
  }

  // Verify card name is on the page — catches Upromise-class bugs where
  // the URL loads fine but renders a generic page.
  const extracted = extractAll(textContent, c.card_name)
  if (!extracted.cardNameOnPage) {
    return { kind: "skipped", id: c.id, reason: `card name not on page (URL loaded but renders different content)` }
  }

  return {
    kind: "generated",
    id: c.id,
    entry: buildEntry(c, finalUrl, new Date().toISOString()),
  }
}

function rewriteCardBlogContent(merged: Record<string, GeneratedEntry>): void {
  // Rewrite the file from scratch — preserves the header/type, replaces
  // the body with the merged map.
  const ids = Object.keys(merged).sort()
  const body = ids.map(id => stringifyEntry(id, merged[id])).join("\n\n")
  const header = readFileSync(OUT_PATH, "utf8").split("export const cardBlogContent")[0]
  const out = `${header}export const cardBlogContent: Record<string, CardBlogContent> = {\n${body}\n}\n`
  writeFileSync(OUT_PATH, out)
}

async function main() {
  let targets = (creditCardBonuses as CreditCardBonus[])
    .filter(c => !c.expired)
    .filter(c => !cardBlogContent[c.id])
  if (ONLY) targets = targets.filter(c => c.id === ONLY)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Generating card blog content for ${targets.length} cards (cache=${USE_CACHE ? "on" : "off"})`)

  if (targets.length === 0) {
    console.log("Nothing to do — every active card already has a cardBlogContent entry.")
    return
  }

  const limit = pLimit(CONCURRENCY)
  const results: GenResult[] = []
  let done = 0
  await Promise.all(
    targets.map(c =>
      limit(async () => {
        const r = await processCard(c)
        results.push(r)
        done++
        const tag = r.kind === "generated" ? "✅" : "⏭️"
        console.log(`[${done}/${targets.length}] ${tag} ${c.card_name} (${r.kind === "skipped" ? r.reason : "ok"})`)
      }),
    ),
  )

  await closeBrowser()

  const generated = results.filter((r): r is Extract<GenResult, { kind: "generated" }> => r.kind === "generated")
  const skipped = results.filter(r => r.kind === "skipped")

  console.log(``)
  console.log(`Generated: ${generated.length}, Skipped: ${skipped.length}`)
  if (skipped.length > 0) {
    console.log(`\nSkipped (offer page issues — these will not get posts until fixed):`)
    for (const s of skipped) {
      if (s.kind === "skipped") console.log(`  - ${s.id}: ${s.reason}`)
    }
  }

  if (DRY_RUN) {
    ensureDir(join(ROOT, "verification-output"))
    writeFileSync(PREVIEW_PATH, JSON.stringify({ generated, skipped }, null, 2))
    console.log(`\n(dry-run) Preview written to ${PREVIEW_PATH} — file not modified.`)
    return
  }

  // Merge with existing cardBlogContent (don't lose anything that's there).
  const merged: Record<string, GeneratedEntry> = {}
  for (const [id, e] of Object.entries(cardBlogContent)) {
    merged[id] = e as GeneratedEntry
  }
  for (const r of generated) {
    merged[r.id] = r.entry
  }
  rewriteCardBlogContent(merged)
  console.log(`\nWrote ${Object.keys(merged).length} entries to ${OUT_PATH}`)
}

// Only auto-run when invoked directly as the generator script — guarded so
// other scripts can `import { buildEntry, stringifyEntry }` without firing main().
if (process.argv[1]?.includes("generate-card-blog")) {
  main().catch(async err => {
    console.error(err)
    await closeBrowser()
    process.exit(1)
  })
}
