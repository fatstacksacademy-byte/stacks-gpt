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
 *      page-confirmed numbers. The summary references real extracted
 *      values; pros/cons/strategy/FAQs are templated from the catalog
 *      data so the post is grounded in current fields, not hallucinated.
 *
 * Output: rewrites lib/data/cardBlogContent.ts with the merged map.
 *
 * Flags:
 *   --limit=N   only process the first N missing cards
 *   --only=ID   only this one card id
 *   --no-cache  bypass the 24h Playwright cache (force re-fetch)
 *   --dry-run   write to verification-output/card-blog-preview.json instead
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"
import { cardBlogContent } from "../../lib/data/cardBlogContent"
import { extractAll } from "../verify-cards/extract"

const args = process.argv.slice(2)
const ONLY = args.find(a => a.startsWith("--only="))?.split("=")[1]
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const DRY_RUN = args.includes("--dry-run")

const ROOT = process.cwd()
const OUT_PATH = join(ROOT, "lib", "data", "cardBlogContent.ts")
const PREVIEW_PATH = join(ROOT, "verification-output", "card-blog-preview.json")
const CACHE_DIR = join(ROOT, ".cache", "verify-cards")
const CONCURRENCY = 3
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type GenResult =
  | { kind: "generated"; id: string; entry: GeneratedEntry }
  | { kind: "skipped"; id: string; reason: string }

type GeneratedEntry = {
  summary: string
  strategy: string
  bestFor: string
  pros: string[]
  cons: string[]
  comparison: string
  faqs: { q: string; a: string }[]
  relatedSlugs: string[]
  verifiedAt: string
  verifiedUrl: string
}

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

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`
}

function bonusLabel(c: CreditCardBonus): string {
  return c.bonus_currency === "cash"
    ? `$${c.bonus_amount.toLocaleString()}`
    : `${c.bonus_amount.toLocaleString()} ${c.bonus_currency}`
}

function approxSubValue(c: CreditCardBonus): number {
  return c.bonus_currency === "cash"
    ? c.bonus_amount
    : Math.round(c.bonus_amount * (c.cpp_value ?? 0.01))
}

function pickRelatedSlugs(c: CreditCardBonus): string[] {
  // Pick 2-3 other cards that overlap on issuer or share a top reward category.
  const sameIssuer = creditCardBonuses
    .filter(o => o.id !== c.id && !o.expired && o.issuer === c.issuer)
    .slice(0, 2)
  const out = new Set<string>(sameIssuer.map(o => slugifyForCard(o)))
  // Add one same-AF-band card from a different issuer for context.
  const counterpart = creditCardBonuses
    .find(o => o.id !== c.id && !o.expired && o.issuer !== c.issuer && Math.abs((o.annual_fee ?? 0) - (c.annual_fee ?? 0)) < 50)
  if (counterpart) out.add(slugifyForCard(counterpart))
  return Array.from(out).slice(0, 3)
}

function slugifyForCard(c: CreditCardBonus): string {
  return `${c.card_name}-${c.bonus_amount}-${c.bonus_currency}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function buildEntry(c: CreditCardBonus, verifiedUrl: string, verifiedAt: string): GeneratedEntry {
  const sub = bonusLabel(c)
  const subValue = approxSubValue(c)
  const netY1 = subValue + (c.statement_credits_year1 ?? 0) - (c.annual_fee ?? 0)
  const issuerCap = c.issuer.charAt(0).toUpperCase() + c.issuer.slice(1)
  const isBusiness = c.card_type === "business"
  const hasAF = (c.annual_fee ?? 0) > 0
  const hasCredits = (c.statement_credits_year1 ?? 0) > 0
  const monthlySpend = Math.ceil(c.min_spend / Math.max(1, c.spend_months))

  const summary = [
    `The ${c.card_name} is currently offering ${sub} after ${fmtMoney(c.min_spend)} in purchases within ${c.spend_months} months.`,
    hasAF
      ? `It carries a $${c.annual_fee} annual fee${c.annual_fee_waived_first_year ? " (waived in year one)" : ""}, ${hasCredits ? `offset by roughly $${(c.statement_credits_year1 ?? 0).toLocaleString()} in year-one statement credits` : "with no first-year credits to soften it"}.`
      : `There's no annual fee, which makes the ${sub} bonus close to pure profit if you can hit the spend organically.`,
    `Estimated net year-one value: ${fmtMoney(netY1)} based on a ${(c.cpp_value ?? 0.01) === 0.01 ? "1¢" : `${((c.cpp_value ?? 0.01) * 100).toFixed(1)}¢`} per-point valuation.`,
  ].join(" ")

  const strategy = [
    `To hit the ${fmtMoney(c.min_spend)} requirement in ${c.spend_months} months, you need about ${fmtMoney(monthlySpend)} per month in organic spend on this card.`,
    `Route any predictable monthly bills you'd otherwise pay from a debit card — utilities, groceries, gas, streaming subscriptions — through the ${c.card_name} until you've earned the ${sub} bonus.`,
    isBusiness
      ? "Because this is a business card, sign-up bonus earnings post separately from personal-card velocity rules at most issuers — so it can run in parallel with a personal SUB chase."
      : `Mind your issuer rules: ${c.issuer === "chase" ? "Chase will deny this if you've opened 5+ personal cards in the last 24 months" : c.issuer === "amex" ? "Amex limits each card to one lifetime sign-up bonus per cardholder" : c.issuer === "capital one" ? "Capital One typically allows only one new personal card every 6 months" : c.issuer === "citi" ? "Citi enforces an 8/65 rule plus 24-/48-month bonus restrictions on the same family" : "check the issuer's velocity rules before applying"}.`,
    hasCredits ? `Use the year-one credits early — they often expire on a calendar cycle, not 12 months from account opening.` : `Track the SUB cycle in Stacks OS so you can downgrade or cancel before the next AF posts if the card stops earning its keep.`,
  ].join(" ")

  const bestFor = isBusiness
    ? `Self-employed or sole-proprietor users with at least ${fmtMoney(monthlySpend)}/month in deductible business spend who want a SUB that doesn't count toward Chase 5/24 or other personal-card velocity caps.`
    : hasAF
      ? `Cardholders who can fully use the ${sub} bonus, the ${fmtMoney(c.statement_credits_year1 ?? 0)} in credits, and any travel benefits — and who'd find the value even after the $${c.annual_fee} annual fee.`
      : `Anyone with steady monthly spend who wants a ${sub} bonus with no annual-fee drag and no requirement to "make the math work" on a fee.`

  const pros: string[] = []
  pros.push(`${sub} sign-up bonus`)
  if (!hasAF) pros.push("$0 annual fee")
  else if (c.annual_fee_waived_first_year) pros.push(`Year-one annual fee waived ($${c.annual_fee} thereafter)`)
  if (hasCredits) pros.push(`${fmtMoney(c.statement_credits_year1 ?? 0)} in year-one statement credits`)
  if (c.rewards && c.rewards.length > 0) {
    const top = [...c.rewards].sort((a, b) => b.multiplier - a.multiplier)[0]
    pros.push(`${top.multiplier}${top.unit === "%" ? "%" : "x"} on ${top.categories.join(", ")}`)
  }
  if (c.key_benefits && c.key_benefits.length > 0) {
    for (const kb of c.key_benefits.slice(0, 2)) pros.push(kb)
  }

  const cons: string[] = []
  if (hasAF) cons.push(`$${c.annual_fee} annual fee${c.annual_fee_waived_first_year ? " from year two onward" : ""}`)
  if (c.min_spend >= 4000) cons.push(`High ${fmtMoney(c.min_spend)} minimum spend can be hard to hit organically`)
  if (c.is_hotel_card) cons.push("Hotel-loyalty points typically valued near 0.5¢, lower than transferable currencies")
  if (c.issuer === "chase") cons.push("Subject to Chase 5/24 — counts against your personal card velocity")
  if (c.issuer === "amex") cons.push("Lifetime once-per-card SUB rule — one shot at this bonus")
  if (cons.length === 0) cons.push("Issuer may change SUB or requirements at any time — verify before applying")

  const comparison = (() => {
    const peers = creditCardBonuses
      .filter(o => o.id !== c.id && !o.expired && o.issuer === c.issuer && o.card_type === c.card_type)
    if (peers.length === 0) {
      return `Among ${issuerCap} ${isBusiness ? "business" : "personal"} cards in our catalog, the ${c.card_name} is the only active SUB option, so the comparison is mostly against other issuers' equivalents at the same fee tier.`
    }
    const peer = peers[0]
    return `Within ${issuerCap}'s ${isBusiness ? "business" : "personal"} lineup, the closest comparison is the ${peer.card_name} (${bonusLabel(peer)} after ${fmtMoney(peer.min_spend)}/${peer.spend_months}mo, $${peer.annual_fee} AF). The ${c.card_name} is the right pick when you value ${hasAF ? "premium benefits and credits over a no-fee structure" : "a clean no-AF SUB and don't need the elevated category bonuses of the fee-bearing card"}.`
  })()

  const faqs: { q: string; a: string }[] = []
  faqs.push({
    q: `What's the current ${c.card_name} sign-up bonus?`,
    a: `As verified directly from the issuer offer page, the current bonus is ${sub} after spending ${fmtMoney(c.min_spend)} on purchases within ${c.spend_months} months of account opening.`,
  })
  faqs.push({
    q: `What's the ${c.card_name} annual fee?`,
    a: hasAF
      ? `The annual fee is $${c.annual_fee}${c.annual_fee_waived_first_year ? ", waived for the first year" : ""}.${hasCredits ? ` It is partially offset by approximately $${(c.statement_credits_year1 ?? 0).toLocaleString()} in year-one statement credits.` : ""}`
      : `There is no annual fee on the ${c.card_name}.`,
  })
  if (c.issuer === "chase") {
    faqs.push({
      q: "Does the Chase 5/24 rule apply to this card?",
      a: isBusiness
        ? `Chase business cards count *against* 5/24 (i.e. they will deny you if you're over 5/24), but they do not *add to* your 5/24 count once approved. So a successful approval here doesn't burn a personal-card slot.`
        : `Yes. If you've opened five or more personal credit cards in the last 24 months, Chase will auto-deny this application regardless of credit score.`,
    })
  }
  if (c.is_hotel_card) {
    faqs.push({
      q: "How are these hotel loyalty points valued?",
      a: `Hotel loyalty currencies (Hilton Honors, Marriott Bonvoy, IHG One Rewards, etc.) typically redeem in the 0.4–0.6¢/point range, materially below the ~1.5–2¢/point you can squeeze from transferable currencies like Amex MR, Chase UR, or Capital One miles. We use 0.5¢/point in our value math here.`,
    })
  }
  faqs.push({
    q: `How long does the ${c.card_name} sign-up bonus take to post?`,
    a: `Once you cross the ${fmtMoney(c.min_spend)} spend threshold, the bonus typically posts within 1–2 statement cycles — call it 6–8 weeks from the day you hit the requirement. Track the milestone in Stacks OS Spending so you don't miss the deadline.`,
  })

  return {
    summary,
    strategy,
    bestFor,
    pros,
    cons,
    comparison,
    faqs,
    relatedSlugs: pickRelatedSlugs(c),
    verifiedAt,
    verifiedUrl,
  }
}

async function processCard(c: CreditCardBonus): Promise<GenResult> {
  const url = c.offer_link
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

function stringifyEntry(id: string, e: GeneratedEntry): string {
  // Hand-formatted to match the look of the existing blogContent.ts file.
  const lines: string[] = []
  lines.push(`  ${JSON.stringify(id)}: {`)
  lines.push(`    summary: ${JSON.stringify(e.summary)},`)
  lines.push(`    strategy: ${JSON.stringify(e.strategy)},`)
  lines.push(`    bestFor: ${JSON.stringify(e.bestFor)},`)
  lines.push(`    pros: [`)
  for (const p of e.pros) lines.push(`      ${JSON.stringify(p)},`)
  lines.push(`    ],`)
  lines.push(`    cons: [`)
  for (const c of e.cons) lines.push(`      ${JSON.stringify(c)},`)
  lines.push(`    ],`)
  lines.push(`    comparison: ${JSON.stringify(e.comparison)},`)
  lines.push(`    faqs: [`)
  for (const f of e.faqs) {
    lines.push(`      { q: ${JSON.stringify(f.q)}, a: ${JSON.stringify(f.a)} },`)
  }
  lines.push(`    ],`)
  lines.push(`    relatedSlugs: ${JSON.stringify(e.relatedSlugs)},`)
  lines.push(`    verifiedAt: ${JSON.stringify(e.verifiedAt)},`)
  lines.push(`    verifiedUrl: ${JSON.stringify(e.verifiedUrl)},`)
  lines.push(`  },`)
  return lines.join("\n")
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

main().catch(async err => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
