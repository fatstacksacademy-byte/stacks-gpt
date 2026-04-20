/* eslint-disable no-console */
/**
 * Rich With Points → Stacks OS catalog ingest.
 *
 * RWP's public /credit-cards listing renders ~290 card detail URLs in
 * the rendered DOM. Each detail page (also public, no login required)
 * exposes structured fields: card name, issuer/bank, partner, point
 * system + cpp, annual fee, signup bonus + spend requirement + window,
 * earning structure (rewards tiers with multipliers + categories),
 * card benefits, credits & discounts.
 *
 * The detail page does NOT expose the issuer's affiliate/apply link
 * (RWP keeps that for logged-in users). We leave offer_link empty for
 * net-new cards; the verify:cards cron will then flag them as
 * "no offer_link", and a follow-up pass can fill them via issuer-site
 * search or hand curation.
 *
 * Flags:
 *   --limit=N      only process the first N detail URLs after listing
 *   --dry-run      print proposals to verification-output/rwp-cards-proposed.json
 *                  but do NOT modify creditCardBonuses.ts
 *   --apply        actually append net-new entries to creditCardBonuses.ts
 *                  (default is dry-run unless this flag is present)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import pLimit from "p-limit"
import { fetchPage, closeBrowser, getContext } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus, type RewardsTier } from "../../lib/data/creditCardBonuses"

const args = process.argv.slice(2)
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 0) || 0
const DRY_RUN = args.includes("--dry-run") || !args.includes("--apply")

const ROOT = process.cwd()
const OUT_DIR = join(ROOT, "verification-output")
const CATALOG_PATH = join(ROOT, "lib", "data", "creditCardBonuses.ts")
const LIST_URL = "https://www.richwithpoints.com/credit-cards"
const CONCURRENCY = 4

type RwpCard = {
  detail_url: string
  card_name: string
  issuer: string             // RWP's "Bank" field
  partner: string | null     // RWP's "Partner" field (e.g. "AAA")
  network: string | null     // Visa Signature, Mastercard, etc
  card_type: "personal" | "business"
  point_system: string | null
  cpp_value: number | null
  is_hotel_card: boolean
  annual_fee: number
  bonus_amount: number | null
  bonus_currency: string     // "cash" or "Points" or "miles"
  bonus_raw_text: string | null
  min_spend: number | null
  spend_months: number | null
  rewards: RewardsTier[]
  key_benefits: string[]
}

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 +&]/g, "")
}

function slugifyId(name: string, issuer: string): string {
  const slug = `${issuer}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return `${slug}-rwp`
}

// Map RWP's bank names to our short issuer tokens used elsewhere in the app.
function normalizeIssuer(rwpBank: string, partner: string | null): string {
  const b = rwpBank.toLowerCase()
  // Co-brand: prefer the actual issuer (e.g. Comenity-issued AAA → comenity)
  if (b.includes("chase")) return "chase"
  if (b.includes("american express") || b.includes("amex")) return "amex"
  if (b.includes("capital one")) return "capital-one"
  if (b.includes("citi")) return "citi"
  if (b.includes("wells fargo")) return "wells-fargo"
  if (b.includes("discover")) return "discover"
  if (b.includes("us bank") || b.includes("u.s. bank")) return "us-bank"
  if (b.includes("barclays")) return "barclays"
  if (b.includes("bank of america") || b === "bofa") return "bofa"
  if (b.includes("bilt")) return "bilt"
  if (b.includes("fidelity")) return "fidelity"
  if (b.includes("sofi")) return "sofi"
  if (b.includes("pnc")) return "pnc"
  if (b.includes("comenity")) return "comenity"
  if (b.includes("synchrony")) return "synchrony"
  if (b.includes("td bank")) return "td-bank"
  if (b.includes("first national")) return "fnbo"
  // Fallback: kebab-case the original
  return b.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function isHotelPointSystem(system: string | null): boolean {
  if (!system) return false
  const s = system.toLowerCase()
  return /(hilton|marriott|ihg|hyatt|wyndham|choice|world\s*of\s*hyatt|honors|bonvoy)/i.test(s)
}

function inferBonusCurrency(pointSystem: string | null, bonusText: string | null): string {
  if (!pointSystem) return "cash"
  const s = pointSystem.toLowerCase()
  if (s.includes("cash")) return "cash"
  if (s.includes("miles")) return "miles"
  // Use the brand name as the currency token if recognizable
  if (s.includes("ultimate rewards")) return "Ultimate Rewards"
  if (s.includes("membership rewards")) return "Membership Rewards"
  if (s.includes("thankyou")) return "ThankYou"
  if (s.includes("venture") || s.includes("capital one")) return "Capital One Miles"
  if (s.includes("hilton") || s.includes("honors")) return "Hilton Honors"
  if (s.includes("marriott") || s.includes("bonvoy")) return "Marriott Bonvoy"
  if (s.includes("hyatt")) return "World of Hyatt"
  if (s.includes("ihg")) return "IHG One Rewards"
  if (s.includes("united") && s.includes("mileage")) return "United MileagePlus"
  if (s.includes("aadvantage")) return "AAdvantage"
  if (s.includes("delta") && s.includes("skymiles")) return "SkyMiles"
  return "Points"
}

// ─── Page parsing ───────────────────────────────────────────────────

async function listDetailUrls(): Promise<string[]> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  console.log(`[list] loading ${LIST_URL}`)
  await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 60000 })
  await page.waitForTimeout(2500)

  const urls = await page.evaluate(() => {
    const set = new Set<string>()
    for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/credit-cards/']"))) {
      const href = a.href
      // We want only the per-card detail pages: /credit-cards/<uuid>/<slug>
      const segs = new URL(href).pathname.split("/").filter(Boolean)
      if (segs.length >= 3 && segs[0] === "credit-cards") set.add(href)
    }
    return Array.from(set)
  })
  await page.close()
  console.log(`[list] discovered ${urls.length} card detail URLs`)
  return urls
}

function moneyToNum(s: string): number | null {
  const m = s.replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

function parseRewards(text: string): RewardsTier[] {
  // RWP renders earning structure as repeating blocks like:
  //   "5x"
  //   "points per $1 spent on:"
  //   "Groceries"
  //   "Walmart"
  //   "3x"
  //   "..."
  // We slice the text from "Earning Structure" to the next major section.
  const out: RewardsTier[] = []
  const start = text.indexOf("Earning Structure")
  if (start < 0) return out
  // End at the next major page section. Includes "Similar Cards You Might Like"
  // and footer markers so reward categories don't bleed into nav links.
  const endMarkers = [
    "Card Benefits",
    "Credits & Discounts",
    "Note: Some categories",
    "Similar Cards You Might Like",
    "Privacy Policy",
    "Terms of Service",
  ]
  let end = text.length
  for (const m of endMarkers) {
    const i = text.indexOf(m, start + "Earning Structure".length)
    if (i > 0 && i < end) end = i
  }
  const slice = text.slice(start + "Earning Structure".length, end)

  // Split on multiplier lines like "5x" / "3%" / "1.5x".
  const re = /(\d+(?:\.\d+)?)\s*([x%])/g
  const matches: { idx: number; multiplier: number; unit: "%" | "points" }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(slice)) !== null) {
    matches.push({
      idx: m.index,
      multiplier: parseFloat(m[1]),
      unit: m[2] === "%" ? "%" : "points",
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]
    const next = matches[i + 1]
    const block = slice.slice(cur.idx, next ? next.idx : slice.length)
    // Categories are the lines after "points per $1 spent on:" or "% cash back on:".
    const lines = block.split(/\n+/).map(s => s.trim()).filter(Boolean)
    const headerIdx = lines.findIndex(l => /spent on|cash back on/i.test(l))
    const cats: string[] = []
    if (headerIdx >= 0) {
      for (let j = headerIdx + 1; j < lines.length; j++) {
        const l = lines[j]
        if (/^\d+(?:\.\d+)?\s*[x%]/.test(l)) break  // next tier's multiplier
        if (l.length > 40) continue                  // probably not a category
        cats.push(l.toLowerCase().replace(/\s+/g, "_"))
      }
    }
    if (cats.length > 0) {
      out.push({ categories: cats, multiplier: cur.multiplier, unit: cur.unit })
    }
  }
  return out
}

async function fetchCardDetail(url: string): Promise<RwpCard | { error: string; url: string }> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  try {
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 })
    await page.waitForTimeout(1200)
    if (!res || res.status() >= 400) {
      return { error: `status ${res?.status() ?? 0}`, url }
    }

    // Just extract the raw text + title in the page; do all parsing in node
    // to avoid tsx-transpilation issues with nested functions inside evaluate.
    const raw = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText,
    }))
    const text = raw.text
    const valueAfter = (label: string): string | null => {
      const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\n([^\\n]+)", "i")
      const m = text.match(re)
      return m ? m[1].trim() : null
    }
    // "Signup Bonus" header sits as its own line, after "Network:" / "Type:" rows.
    // The sidebar nav has "Signup Bonuses" which would false-match an indexOf,
    // so anchor the regex to a newline + the bare header (not "Signup Bonuses").
    let bonusHeadline: string | null = null
    let bonusDescription: string | null = null
    const subMatch = text.match(/\nSignup Bonus\n([^\n]*)\n([^\n]*(?:\n[^\n]*){0,3})/)
    if (subMatch) {
      bonusHeadline = subMatch[1].trim() || null
      bonusDescription = (subMatch[2] || "").replace(/\n+/g, " ").trim()
    }
    const kfIdx = text.indexOf("Key Features")
    let keyFeatures: string[] = []
    if (kfIdx >= 0) {
      const after = text.slice(kfIdx + "Key Features".length, kfIdx + 600)
      keyFeatures = after.split(/\n+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5)
      const stopIdx = keyFeatures.findIndex((l: string) => /^Card Details|^Signup Bonus|^Earning Structure/.test(l))
      if (stopIdx >= 0) keyFeatures = keyFeatures.slice(0, stopIdx)
    }
    const data = {
      title: raw.title.replace(/\s*\|.*$/, "").trim(),
      text,
      bonusHeadline,
      bonusDescription,
      keyFeatures,
      annualFee: valueAfter("Annual Fee:"),
      cardType: valueAfter("Card Type:"),
      pointSystem: valueAfter("Point System:"),
      travelValue: valueAfter("Travel Value:"),
      cashValue: valueAfter("Cash Value:"),
      bank: valueAfter("Bank:"),
      partner: valueAfter("Partner:"),
      network: valueAfter("Network:"),
    }

    if (!data.title || !data.bank) {
      return { error: "could not parse card detail (missing title or bank)", url }
    }

    // Annual fee — "None" → 0, "$95" → 95, "$95 (waived first year)" → 95
    let annualFee = 0
    if (data.annualFee && data.annualFee.toLowerCase() !== "none") {
      annualFee = moneyToNum(data.annualFee) ?? 0
    }

    // CPP — "1.0¢ per point" → 0.01, "1.5¢ per point" → 0.015
    const cpp = data.travelValue
      ? (moneyToNum(data.travelValue) ?? 1) / 100
      : data.cashValue
        ? (moneyToNum(data.cashValue) ?? 1) / 100
        : null

    // Bonus amount + currency from headline
    let bonusAmount: number | null = null
    let bonusCurrency = inferBonusCurrency(data.pointSystem, data.bonusHeadline)
    if (data.bonusHeadline) {
      const m = data.bonusHeadline.match(/([\d,]+)/)
      if (m) bonusAmount = Number(m[1].replace(/,/g, ""))
      if (/\bcash\s*back\b/i.test(data.bonusHeadline)) bonusCurrency = "cash"
      if (/\bmiles?\b/i.test(data.bonusHeadline)) bonusCurrency = "miles"
    }

    // Spend req + window from description. RWP wording varies a lot:
    //   "spend $1,000 within the first 90 days"       (AAA)
    //   "after spending $4,000 in the first 3 months" (Citi)
    //   "Spend $6,000 in 6 months"                    (Amex)
    //   "spending $4000 in your first three months"   (Capital One sometimes spells)
    let minSpend: number | null = null
    let spendMonths: number | null = null
    if (data.bonusDescription) {
      const sm = data.bonusDescription.match(/spend\s*\$?\s*([\d,]+)/i)
      if (sm) minSpend = Number(sm[1].replace(/,/g, ""))
      // Match any "(within|in)? (the)? (first|your first)? N (days|months|years)"
      const dm = data.bonusDescription.match(/(?:within|in)\s+(?:the\s+first\s+|your\s+first\s+|first\s+)?(\d+|three|six|twelve)\s*(day|month|year)/i)
      if (dm) {
        const wordToNum: Record<string, number> = { three: 3, six: 6, twelve: 12 }
        const n = wordToNum[dm[1].toLowerCase()] ?? Number(dm[1])
        const unit = dm[2].toLowerCase()
        if (unit.startsWith("day")) spendMonths = Math.round(n / 30)
        else if (unit.startsWith("month")) spendMonths = n
        else if (unit.startsWith("year")) spendMonths = n * 12
      }
    }

    return {
      detail_url: url,
      card_name: data.title,
      issuer: normalizeIssuer(data.bank, data.partner),
      partner: data.partner,
      network: data.network,
      card_type: (data.cardType?.toLowerCase().includes("business") ? "business" : "personal"),
      point_system: data.pointSystem,
      cpp_value: cpp,
      is_hotel_card: isHotelPointSystem(data.pointSystem),
      annual_fee: annualFee,
      bonus_amount: bonusAmount,
      bonus_currency: bonusCurrency,
      bonus_raw_text: data.bonusHeadline ?? null,
      min_spend: minSpend,
      spend_months: spendMonths,
      rewards: parseRewards(data.text),
      key_benefits: data.keyFeatures,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), url }
  } finally {
    await page.close()
  }
}

// ─── Catalog merge ─────────────────────────────────────────────────

function buildCatalogEntry(c: RwpCard): CreditCardBonus {
  return {
    id: slugifyId(c.card_name, c.issuer),
    card_name: c.card_name,
    issuer: c.issuer,
    card_type: c.card_type,
    bonus_amount: c.bonus_amount ?? 0,
    bonus_currency: c.bonus_currency,
    is_hotel_card: c.is_hotel_card,
    cpp_value: c.cpp_value ?? 0.01,
    min_spend: c.min_spend ?? 0,
    spend_months: c.spend_months ?? 3,
    annual_fee: c.annual_fee,
    annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    offer_link: "",  // RWP doesn't expose; verify:cards cron will flag for follow-up
    expired: false,
    key_benefits: c.key_benefits,
    ...(c.rewards.length > 0 ? { rewards: c.rewards } : {}),
  }
}

function renderEntry(e: CreditCardBonus): string {
  const lines: string[] = []
  lines.push("  {")
  lines.push(`    id: ${JSON.stringify(e.id)},`)
  lines.push(`    card_name: ${JSON.stringify(e.card_name)},`)
  lines.push(`    issuer: ${JSON.stringify(e.issuer)},`)
  lines.push(`    card_type: ${JSON.stringify(e.card_type)},`)
  lines.push(`    bonus_amount: ${e.bonus_amount},`)
  lines.push(`    bonus_currency: ${JSON.stringify(e.bonus_currency)},`)
  lines.push(`    is_hotel_card: ${e.is_hotel_card},`)
  lines.push(`    cpp_value: ${e.cpp_value},`)
  lines.push(`    min_spend: ${e.min_spend},`)
  lines.push(`    spend_months: ${e.spend_months},`)
  lines.push(`    annual_fee: ${e.annual_fee},`)
  lines.push(`    annual_fee_waived_first_year: ${e.annual_fee_waived_first_year},`)
  lines.push(`    statement_credits_year1: ${e.statement_credits_year1},`)
  lines.push(`    offer_link: ${JSON.stringify(e.offer_link)},`)
  lines.push(`    expired: ${e.expired},`)
  lines.push(`    key_benefits: ${JSON.stringify(e.key_benefits)},`)
  if (e.rewards && e.rewards.length > 0) {
    lines.push(`    rewards: [`)
    for (const r of e.rewards) {
      lines.push(`      { categories: ${JSON.stringify(r.categories)}, multiplier: ${r.multiplier}, unit: ${JSON.stringify(r.unit ?? "points")} },`)
    }
    lines.push(`    ],`)
  }
  lines.push("  },")
  return lines.join("\n")
}

function appendToCatalog(entries: CreditCardBonus[]): void {
  const src = readFileSync(CATALOG_PATH, "utf8")
  const closeIdx = src.lastIndexOf("]")
  if (closeIdx < 0) throw new Error("could not locate closing ] in catalog")
  const head = src.slice(0, closeIdx)
  const tail = src.slice(closeIdx)
  const block = [
    "",
    "  // ─── INGESTED FROM RICHWITHPOINTS ──────────────────────────────",
    "  // Auto-imported via scripts/ingest-rwp-cards. offer_link is empty",
    "  // because RWP gates the issuer apply URL behind login; the",
    "  // verify:cards cron flags these for follow-up so we can fill them",
    "  // by hand or via issuer-site search later.",
    "",
    ...entries.map(renderEntry),
  ].join("\n") + "\n"
  writeFileSync(CATALOG_PATH, head + block + tail)
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  ensureDir(OUT_DIR)

  const detailUrls = await listDetailUrls()
  let urls = detailUrls
  if (LIMIT > 0) urls = urls.slice(0, LIMIT)

  console.log(`Fetching ${urls.length} detail pages (concurrency ${CONCURRENCY})…`)
  const limit = pLimit(CONCURRENCY)
  const results: (RwpCard | { error: string; url: string })[] = []
  let done = 0
  await Promise.all(
    urls.map(u =>
      limit(async () => {
        const r = await fetchCardDetail(u)
        results.push(r)
        done++
        const tag = "error" in r ? "❌" : "✅"
        const label = "error" in r ? r.error : `${r.card_name} (${r.issuer})`
        console.log(`[${done}/${urls.length}] ${tag} ${label}`)
      }),
    ),
  )
  await closeBrowser()

  const successes = results.filter((r): r is RwpCard => !("error" in r))
  const failures = results.filter((r): r is { error: string; url: string } => "error" in r)

  // Dedupe vs existing catalog by normalized card name.
  const existingNames = new Set(creditCardBonuses.map(c => normalizeName(c.card_name)))
  const newCards = successes.filter(c => !existingNames.has(normalizeName(c.card_name)))
  const duplicates = successes.filter(c => existingNames.has(normalizeName(c.card_name)))

  console.log(``)
  console.log(`Parsed: ${successes.length} | Failed: ${failures.length}`)
  console.log(`Net-new: ${newCards.length} | Already in catalog: ${duplicates.length}`)

  // Always write the proposals file.
  const proposalsPath = join(OUT_DIR, "rwp-cards-proposed.json")
  writeFileSync(proposalsPath, JSON.stringify({ newCards, duplicates: duplicates.map(c => c.card_name), failures }, null, 2))
  console.log(`Proposals written to ${proposalsPath}`)

  if (DRY_RUN) {
    console.log(`(dry-run) Would have appended ${newCards.length} cards. Pass --apply to write to ${CATALOG_PATH}.`)
    return
  }

  if (newCards.length === 0) {
    console.log("Nothing to apply — every parsed card is already in the catalog.")
    return
  }

  const entries = newCards.map(buildCatalogEntry)
  appendToCatalog(entries)
  console.log(`Appended ${entries.length} new entries to ${CATALOG_PATH}`)
}

main().catch(async err => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
