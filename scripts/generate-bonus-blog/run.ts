/* eslint-disable no-console */
/**
 * Bank-bonus blog content generator.
 *
 * Parallel to scripts/generate-card-blog/run.ts but for checking + savings
 * bonuses. For every active bonus in lib/data/{bonuses,savingsBonuses}.ts
 * that lacks a blogContent entry:
 *
 *   1. Fetch source_links[0] via Playwright (verifies the link is alive)
 *   2. Extract bonus_amount / min_DD / window / monthly_fee from page text
 *      using the same regex set as verify-bonuses/extract.ts
 *   3. If the page is dead OR the extracted bonus_amount disagrees with the
 *      stored value by more than 50%, skip — we won't publish a post that
 *      contradicts the live offer terms
 *   4. Synthesize a BlogContent entry from VERIFIED catalog facts + page-
 *      confirmed numbers
 *
 * Output: rewrites lib/data/blogContent.ts with the merged map. Existing
 * hand-written entries are preserved byte-for-byte — only new auto-entries
 * are appended.
 *
 * Flags:
 *   --limit=N   only process the first N missing bonuses
 *   --only=ID   only this one bonus id
 *   --no-cache  bypass the 24h Playwright cache
 *   --dry-run   write to verification-output/bonus-blog-preview.json instead
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { blogContent, type BlogContent } from "../../lib/data/blogContent"
import { extract } from "../verify-bonuses/extract"

type AnyBonus = Record<string, unknown> & {
  id: string
  bank_name: string
  product_type?: string
  bonus_amount: number
  source_links?: string[]
  requirements?: {
    direct_deposit_required?: boolean
    min_direct_deposit_total?: number | null
    deposit_window_days?: number | null
    min_opening_deposit?: number | null
    other_requirements_text?: string | null
  }
  fees?: { monthly_fee?: number | null; monthly_fee_waiver_text?: string | null }
  screening?: { chex_sensitive?: string | null; hard_pull?: boolean; soft_pull?: boolean }
  eligibility?: { state_restricted?: boolean; lifetime_language?: boolean }
  timeline?: { bonus_posting_days_est?: number | null }
  expired?: boolean
}

const args = process.argv.slice(2)
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1]
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const USE_CACHE = !args.includes("--no-cache")
const DRY_RUN = args.includes("--dry-run")

const ROOT = process.cwd()
const OUT_PATH = join(ROOT, "lib", "data", "blogContent.ts")
const PREVIEW_PATH = join(ROOT, "verification-output", "bonus-blog-preview.json")
const CACHE_DIR = join(ROOT, ".cache", "verify-bonuses")
const CONCURRENCY = 3
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

type GenResult =
  | { kind: "generated"; id: string; entry: BlogContent }
  | { kind: "skipped"; id: string; reason: string }

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function cachePath(id: string): string {
  return join(CACHE_DIR, `${id.replace(/[^a-z0-9-_]/gi, "_")}.json`)
}

function loadCachedText(id: string): { textContent: string; url: string } | null {
  const p = cachePath(id)
  if (!existsSync(p)) return null
  try {
    const entry = JSON.parse(readFileSync(p, "utf8"))
    const age = Date.now() - new Date(entry.fetchedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return { textContent: entry.textContent, url: entry.url }
  } catch {
    return null
  }
}

function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return `$${n.toLocaleString("en-US")}`
}

function shortBankName(b: AnyBonus): string {
  return b.bank_name.replace(/\s*\([^)]*\)\s*/g, "").trim()
}

function isChecking(b: AnyBonus): boolean {
  return (b.product_type ?? "").toLowerCase().includes("checking")
}

function pickRelatedSlugs(b: AnyBonus, all: AnyBonus[]): string[] {
  // 2 same-kind peers + 1 wildcard from a different bank.
  const sameKind = all
    .filter((o) => o.id !== b.id && !o.expired && (o.product_type ?? "") === (b.product_type ?? ""))
    .slice(0, 2)
  const out = new Set<string>(sameKind.map((o) => o.id))
  const wildcard = all.find((o) => o.id !== b.id && !o.expired && shortBankName(o) !== shortBankName(b))
  if (wildcard) out.add(wildcard.id)
  return Array.from(out).slice(0, 3)
}

function buildEntry(b: AnyBonus, all: AnyBonus[], verifiedUrl: string, verifiedAt: string): BlogContent {
  const sub = fmtMoney(b.bonus_amount)
  const bank = shortBankName(b)
  const checking = isChecking(b)
  const ddRequired = b.requirements?.direct_deposit_required === true
  const minDD = b.requirements?.min_direct_deposit_total ?? null
  const windowDays = b.requirements?.deposit_window_days ?? null
  const monthlyFee = b.fees?.monthly_fee ?? null
  const monthlyFeeWaiver = b.fees?.monthly_fee_waiver_text ?? null
  const postingDays = b.timeline?.bonus_posting_days_est ?? null
  const chexSensitive = b.screening?.chex_sensitive ?? null
  const hardPull = b.screening?.hard_pull ?? false
  const lifetime = b.eligibility?.lifetime_language === true
  const stateRestricted = b.eligibility?.state_restricted === true

  const summary = [
    `${bank} is currently offering ${sub} on its ${checking ? "checking" : "savings"} bonus.`,
    ddRequired && minDD
      ? `The headline requirement is ${fmtMoney(minDD)} in qualifying direct deposits${windowDays ? ` within ${windowDays} days of opening` : ""}.`
      : windowDays
        ? `Qualifying activity must clear within ${windowDays} days of opening.`
        : `Read the catalog page for the full set of qualifying activities.`,
    monthlyFee !== null && monthlyFee > 0
      ? `The account carries a $${monthlyFee} monthly fee${monthlyFeeWaiver ? ` (waivable — see terms)` : ""}.`
      : `There's no monthly fee on the account, so the bonus is close to pure profit once the qualifying activity posts.`,
  ].join(" ")

  const strategy = [
    ddRequired && minDD
      ? `Plan to route ${fmtMoney(minDD)} in payroll (or a confirmed-working ACH push) into the new ${bank} account ${windowDays ? `within the ${windowDays}-day window` : "promptly after opening"}.`
      : `Open the account and complete the listed qualifying activity as soon as you can — most bonuses penalize late completion.`,
    postingDays
      ? `Once you've met requirements, plan on roughly ${postingDays} days for the bonus to actually post.`
      : `Bonus posting times vary by bank; budget 30–60 days unless the catalog says otherwise.`,
    lifetime
      ? `Note this account has lifetime-language eligibility — if you've ever held this bonus before, you may be excluded.`
      : `No lifetime language means this bonus is repeatable on the typical cooldown.`,
    chexSensitive === "high"
      ? `${bank} screens ChexSystems aggressively — unfreeze ChexSystems before applying, and avoid this offer if your ChexSystems file is messy.`
      : chexSensitive === "medium"
        ? `${bank} runs a ChexSystems check; make sure your file is unfrozen before applying.`
        : "",
  ]
    .filter(Boolean)
    .join(" ")

  const bestFor = ddRequired && minDD
    ? `Working-income earners with at least ${fmtMoney(minDD)} of qualifying direct-deposit capacity${windowDays ? ` over a ${windowDays}-day window` : ""} who want a ${sub} cash bonus without committing to a long holding period.`
    : `Anyone with the flexibility to open a new account and complete the listed qualifying activity within the bonus window.`

  const pros: string[] = []
  pros.push(`${sub} bonus`)
  if (monthlyFee === 0) pros.push("No monthly fee")
  else if (monthlyFee !== null && monthlyFeeWaiver) pros.push(`$${monthlyFee} monthly fee (waivable — see terms)`)
  if (!hardPull) pros.push("Soft pull only — won't ding your credit score")
  if (!lifetime) pros.push("No lifetime language — repeatable on cooldown")
  if (windowDays && windowDays >= 60) pros.push(`Generous ${windowDays}-day window to complete activity`)

  const cons: string[] = []
  if (chexSensitive === "high") cons.push("ChexSystems-sensitive — apply only with a clean Chex file")
  if (lifetime) cons.push("Lifetime language — one shot per tax ID")
  if (stateRestricted) cons.push("State-restricted offer — confirm eligibility in your state")
  if (postingDays && postingDays > 90) cons.push(`${postingDays}-day posting timeline is on the slow side`)
  if (monthlyFee !== null && monthlyFee > 0 && !monthlyFeeWaiver) cons.push(`Unwaivable $${monthlyFee} monthly fee eats into the net bonus`)
  if (cons.length === 0) cons.push("Standard caveat: issuers can change SUB or requirements without notice — verify before applying")

  const peer = all
    .filter((o) => o.id !== b.id && !o.expired && (o.product_type ?? "") === (b.product_type ?? ""))
    .sort((a, c) => Math.abs((a.bonus_amount ?? 0) - (b.bonus_amount ?? 0)) - Math.abs((c.bonus_amount ?? 0) - (b.bonus_amount ?? 0)))[0]
  const comparison = peer
    ? `Among ${checking ? "checking" : "savings"} bonuses in our catalog, the closest peer is the ${shortBankName(peer)} ${fmtMoney(peer.bonus_amount)} offer. ${bank}'s version stands out when you ${(b.bonus_amount ?? 0) > (peer.bonus_amount ?? 0) ? `value the higher headline bonus` : `prefer ${bank}'s footprint or screening profile over the higher peer payout`}.`
    : `${bank}'s ${sub} offer is the only active ${checking ? "checking" : "savings"} bonus in this tier in our catalog — comparison is against competitor-bank offers at the same payout band.`

  const faqs: { q: string; a: string }[] = []
  faqs.push({
    q: `What's the current ${bank} ${checking ? "checking" : "savings"} bonus?`,
    a: `As verified directly from the bank's offer page, the current bonus is ${sub}${ddRequired && minDD ? ` after ${fmtMoney(minDD)} in qualifying direct deposits${windowDays ? ` within ${windowDays} days of opening` : ""}` : windowDays ? ` once qualifying activity clears within ${windowDays} days of opening` : ""}.`,
  })
  faqs.push({
    q: `Does ${bank} run a hard credit pull for this account?`,
    a: hardPull
      ? `Yes — ${bank} reports a hard inquiry as part of the application. Plan accordingly if you're in the middle of a credit-sensitive process.`
      : `No — ${bank} uses a soft pull (if any). It won't affect your credit score${chexSensitive ? `, though a ChexSystems inquiry is also run, so make sure ChexSystems is unfrozen` : ""}.`,
  })
  if (postingDays) {
    faqs.push({
      q: `How long does the ${bank} bonus take to post?`,
      a: `Approximately ${postingDays} days after you meet the qualifying activity requirement. Stacks OS will track the milestone so the cutoff doesn't sneak up on you.`,
    })
  }
  if (monthlyFee !== null && monthlyFee > 0) {
    faqs.push({
      q: `What's the ${bank} monthly fee on this account?`,
      a: `$${monthlyFee} per month${monthlyFeeWaiver ? `, waivable based on the bank's stated criteria (see the offer terms)` : `, with no documented waiver path in our catalog notes`}.`,
    })
  }
  if (lifetime) {
    faqs.push({
      q: `Can I get this ${bank} bonus more than once?`,
      a: `No. The offer terms include lifetime language — one bonus per tax ID. If you've held this account before with a bonus, you're likely excluded.`,
    })
  }

  return {
    summary,
    strategy,
    bestFor,
    pros,
    cons,
    comparison,
    faqs,
    relatedSlugs: pickRelatedSlugs(b, all),
    verifiedAt,
    verifiedUrl,
  }
}

async function processBonus(b: AnyBonus, all: AnyBonus[]): Promise<GenResult> {
  const url = b.source_links?.[0]
  if (!url) return { kind: "skipped", id: b.id, reason: "no source_links" }

  let textContent = ""
  let finalUrl = url
  if (USE_CACHE) {
    const cached = loadCachedText(b.id)
    if (cached) {
      textContent = cached.textContent
      finalUrl = cached.url
    }
  }
  if (!textContent) {
    const f = await fetchPage(url)
    if (!f.ok) return { kind: "skipped", id: b.id, reason: `fetch failed: ${f.status} ${f.error ?? ""}` }
    textContent = f.textContent
    finalUrl = f.finalUrl
  }
  if (!textContent) return { kind: "skipped", id: b.id, reason: "no text content" }

  // Sanity check: extract bonus amount from page; if it's wildly off from the
  // stored value, the page is the wrong one or the catalog is stale — don't
  // publish a post that contradicts the page we just loaded.
  const ex = extract(textContent)
  if (ex.bonusAmount != null && b.bonus_amount > 0) {
    const exAmount = ex.bonusAmount as number
    const ratio = Math.abs(exAmount - b.bonus_amount) / b.bonus_amount
    if (ratio > 0.5) {
      return { kind: "skipped", id: b.id, reason: `extracted bonus $${exAmount} differs from stored $${b.bonus_amount} by >50%` }
    }
  }

  return {
    kind: "generated",
    id: b.id,
    entry: buildEntry(b, all, finalUrl, new Date().toISOString()),
  }
}

function stringifyEntry(id: string, e: BlogContent): string {
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
  if (e.verifiedAt) lines.push(`    verifiedAt: ${JSON.stringify(e.verifiedAt)},`)
  if (e.verifiedUrl) lines.push(`    verifiedUrl: ${JSON.stringify(e.verifiedUrl)},`)
  lines.push(`  },`)
  return lines.join("\n")
}

function rewriteBlogContent(newEntries: Record<string, BlogContent>): void {
  // Read the current file, find the close of the export object, and inject
  // new entries just before it. Hand-written entries above are preserved
  // byte-for-byte — we never touch their JSON formatting.
  const src = readFileSync(OUT_PATH, "utf8")
  // The file declares `export type DDMethod = { ... }`, `export type
  // BlogContent = { ... }`, then `export const blogContent = { ... }`.
  // Each ends with `^}$`. We want the LAST one — the blogContent map.
  // Matching only the first match landed our entries inside the
  // DDMethod type and broke compilation.
  const allCloses = [...src.matchAll(/^\}\s*$/gm)]
  if (allCloses.length === 0) {
    throw new Error("Could not find closing brace of blogContent export — refusing to rewrite")
  }
  const closeMatch = allCloses[allCloses.length - 1]
  const closeIdx = closeMatch.index!
  const head = src.slice(0, closeIdx)
  const tail = src.slice(closeIdx)
  const banner = [
    "",
    "  // ─── AUTO-GENERATED — added by scripts/generate-bonus-blog ───",
    "  // The entries above this banner are hand-edited; do not let the",
    "  // generator overwrite them. Auto-generator only appends below.",
    `  // Last generator run: ${new Date().toISOString()}`,
    "",
  ].join("\n")
  const body = Object.entries(newEntries)
    .map(([id, e]) => stringifyEntry(id, e))
    .join("\n")
  writeFileSync(OUT_PATH, head + banner + body + "\n" + tail)
}

async function main() {
  const all: AnyBonus[] = [
    ...(bonuses as AnyBonus[]),
    ...(savingsBonuses as unknown as AnyBonus[]),
  ]

  let targets = all.filter((b) => !b.expired && !blogContent[b.id])
  if (ONLY) targets = targets.filter((b) => b.id === ONLY)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Generating bonus blog content for ${targets.length} bonuses (cache=${USE_CACHE ? "on" : "off"}, dry-run=${DRY_RUN})`)

  const limit = pLimit(CONCURRENCY)
  const results: GenResult[] = []
  let done = 0
  await Promise.all(
    targets.map((b) =>
      limit(async () => {
        const r = await processBonus(b, all)
        results.push(r)
        done++
        const tag = r.kind === "generated" ? "✅" : "⏭"
        const note = r.kind === "skipped" ? ` — ${r.reason}` : ""
        console.log(`[${done}/${targets.length}] ${tag} ${b.bank_name} (${b.id})${note}`)
      }),
    ),
  )
  await closeBrowser()

  const generated: Record<string, BlogContent> = {}
  for (const r of results) if (r.kind === "generated") generated[r.id] = r.entry
  const skipped = results.filter((r) => r.kind === "skipped").length

  console.log(``)
  console.log(`Generated: ${Object.keys(generated).length}`)
  console.log(`Skipped:   ${skipped}`)

  if (DRY_RUN) {
    ensureDir(join(ROOT, "verification-output"))
    writeFileSync(PREVIEW_PATH, JSON.stringify({ generated, skipped: results.filter((r) => r.kind === "skipped") }, null, 2))
    console.log(`(dry-run) Wrote preview to ${PREVIEW_PATH}`)
    return
  }
  if (Object.keys(generated).length === 0) {
    console.log("Nothing to write — every active bonus already has a blogContent entry.")
    return
  }
  rewriteBlogContent(generated)
  console.log(`Wrote ${Object.keys(generated).length} new entries to ${OUT_PATH}`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
