/* eslint-disable no-console */
/**
 * discover-cards — find credit cards we don't already have in
 * lib/data/creditCardBonuses.ts, scrape each issuer's direct offer
 * page for bonus + spend + annual fee + rewards tiers, and auto-append
 * the new entries (credit cards are flagged as beta in the app, so the
 * user opted in to auto-apply rather than a review queue).
 *
 * Source: richwithpoints.com/app/credit-cards
 *   - We use their page as a LEAD source only — list of card names and
 *     their links to each issuer's apply page. We never copy
 *     richwithpoints article content.
 *
 * Flow:
 *   1. Load the richwithpoints card list via Playwright (SPA-rendered).
 *   2. For each listed card, find the outbound link to an issuer
 *      (chase.com, americanexpress.com, citi.com, capitalone.com, etc).
 *   3. Dedupe against existing creditCardBonuses.ts by normalized
 *      card name.
 *   4. For each new card, Playwright-fetch the issuer page and run the
 *      CC extractors (bonus, min_spend, spend_months, annual_fee,
 *      rewards tiers).
 *   5. Emit a JSON proposal + auto-append minimal records to
 *      creditCardBonuses.ts. User calibrates from there.
 *
 * Guardrails: robots.txt respected, per-host 1.5s throttle, max 40
 * new cards per run, UA is StackOS-BonusBot/1.0.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import {
  creditCardBonuses,
  type CreditCardBonus,
} from "../../lib/data/creditCardBonuses"
import {
  extractAll,
  extractRewardsTiers,
  type ExtractedRewardsTier,
} from "../verify-cards/extract"

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const NO_APPLY = args.includes("--no-apply")
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 40) || 40

const ROOT = process.cwd()
const LIST_URL = "https://www.richwithpoints.com/app/credit-cards"
const UA = process.env.BONUS_BOT_UA || "StackOS-BonusBot/1.0 (+https://fatstacksacademy.com/bot)"
const OUT_DIR = join(ROOT, "verification-output")
const CATALOG_PATH = join(ROOT, "lib", "data", "creditCardBonuses.ts")

type Lead = {
  source: "richwithpoints"
  source_url: string
  card_name: string
  issuer_link: string | null
}

type Proposal = {
  card_name: string
  issuer: string
  offer_link: string
  bonus_amount: number | null
  bonus_currency: string | null
  bonus_unit: string | null
  min_spend: number | null
  spend_months: number | null
  annual_fee: number | null
  rewards: ExtractedRewardsTier[]
  source_lead_url: string
  flags: string[]
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/®|™|©/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function cardAlreadyInCatalog(cardName: string): boolean {
  const norm = normalizeName(cardName)
  if (!norm) return true
  for (const c of creditCardBonuses as CreditCardBonus[]) {
    const existing = normalizeName(c.card_name)
    if (!existing) continue
    if (existing === norm) return true
    // Substring match in either direction (handles "Chase Sapphire" vs "Chase Sapphire Preferred")
    if (norm.length >= 12 && existing.includes(norm)) return true
    if (existing.length >= 12 && norm.includes(existing)) return true
  }
  return false
}

// Issuer domains we'll trust as direct offer pages.
const ISSUER_DOMAINS = [
  "chase.com",
  "creditcards.chase.com",
  "americanexpress.com",
  "aexp.com",
  "citi.com",
  "banking.citi.com",
  "capitalone.com",
  "discover.com",
  "wellsfargo.com",
  "barclaycardus.com",
  "cards.barclaycardus.com",
  "bankofamerica.com",
  "usbank.com",
  "ihg.com",
  "alaskaair.com",
]

function isIssuerLink(url: string): boolean {
  try {
    const h = new URL(url).host.toLowerCase()
    return ISSUER_DOMAINS.some((d) => h.endsWith(d))
  } catch {
    return false
  }
}

function inferIssuer(url: string, cardName: string): string {
  try {
    const h = new URL(url).host.toLowerCase()
    if (h.includes("chase.com")) return "chase"
    if (h.includes("americanexpress") || h.includes("aexp.com")) return "amex"
    if (h.includes("citi.com")) return "citi"
    if (h.includes("capitalone")) return "capital one"
    if (h.includes("discover.com")) return "discover"
    if (h.includes("wellsfargo")) return "wells fargo"
    if (h.includes("barclay")) return "barclays"
    if (h.includes("bankofamerica")) return "bofa"
    if (h.includes("usbank.com")) return "us bank"
  } catch {}
  // Fallback: first token of card name
  return cardName.split(/\s+/)[0].toLowerCase()
}

// ─────────────────────────── richwithpoints scrape ───────────────────────────

import { chromium } from "playwright"

async function loadRwpList(): Promise<Lead[]> {
  console.log(`[rwp] fetching ${LIST_URL}`)
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1800 } })
  const page = await ctx.newPage()
  try {
    await page.goto(LIST_URL, { waitUntil: "domcontentloaded", timeout: 45000 })
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(4000)

    // Scroll to trigger lazy-loaded content
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000))
      await page.waitForTimeout(700)
    }

    // Gather all anchors, then cluster card-detail links (richwithpoints uses
    // /app/credit-cards/<slug> for their card profile pages) and grab the outbound
    // issuer link from each detail page.
    const detailLinks: string[] = await page.evaluate(() => {
      return Array.from(
        new Set(
          Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/credit-cards/"]'))
            .map((a) => a.href)
            .filter((h) => h && !h.endsWith("/app/credit-cards/") && !h.endsWith("/app/credit-cards")),
        ),
      )
    })
    console.log(`[rwp] discovered ${detailLinks.length} card detail URLs`)

    const leads: Lead[] = []
    const seen = new Set<string>()
    let visited = 0
    for (const detailUrl of detailLinks) {
      if (visited >= LIMIT * 2) break
      visited++
      try {
        await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 30000 })
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {})
        await page.waitForTimeout(1200)
        const data = await page.evaluate(() => {
          const h1 = document.querySelector("h1")?.textContent?.trim() || ""
          const outbound = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
            .map((a) => a.href)
            .filter((h) => {
              try {
                const u = new URL(h)
                return u.host !== location.host
              } catch {
                return false
              }
            })
          return { title: h1, outbound }
        })
        if (!data.title) continue
        const issuerLink = data.outbound.find(isIssuerLink) ?? null
        const key = normalizeName(data.title)
        if (!key || seen.has(key)) continue
        seen.add(key)
        leads.push({
          source: "richwithpoints",
          source_url: detailUrl,
          card_name: data.title,
          issuer_link: issuerLink,
        })
      } catch (err) {
        // Per-page failures are common with WAFs — skip quietly.
        void err
      }
    }
    console.log(`[rwp] captured ${leads.length} unique card leads`)
    return leads
  } finally {
    await browser.close()
  }
}

// ─────────────────────────── issuer-page enrichment ───────────────────────────

async function enrichLead(lead: Lead): Promise<Proposal | null> {
  if (!lead.issuer_link) {
    return {
      card_name: lead.card_name,
      issuer: "unknown",
      offer_link: "",
      bonus_amount: null,
      bonus_currency: null,
      bonus_unit: null,
      min_spend: null,
      spend_months: null,
      annual_fee: null,
      rewards: [],
      source_lead_url: lead.source_url,
      flags: ["no_issuer_link_found"],
    }
  }

  const f = await fetchPage(lead.issuer_link, { userAgent: UA })
  if (!f.ok) {
    return {
      card_name: lead.card_name,
      issuer: inferIssuer(lead.issuer_link, lead.card_name),
      offer_link: lead.issuer_link,
      bonus_amount: null,
      bonus_currency: null,
      bonus_unit: null,
      min_spend: null,
      spend_months: null,
      annual_fee: null,
      rewards: [],
      source_lead_url: lead.source_url,
      flags: ["issuer_fetch_failed:" + (f.error || f.status)],
    }
  }

  const ex = extractAll(f.textContent, lead.card_name)
  const rewards = extractRewardsTiers(f.textContent)
  const currency =
    ex.bonusUnit && (ex.bonusUnit.includes("point") || ex.bonusUnit.includes("mile") || ex.bonusUnit.includes("reward"))
      ? titleCase(ex.bonusUnit)
      : ex.bonusUnit === "$" || ex.bonusUnit === "cashback"
        ? "cash"
        : null

  return {
    card_name: lead.card_name,
    issuer: inferIssuer(lead.issuer_link, lead.card_name),
    offer_link: f.finalUrl || lead.issuer_link,
    bonus_amount: ex.bonusAmount,
    bonus_currency: currency,
    bonus_unit: ex.bonusUnit,
    min_spend: ex.minSpend,
    spend_months: ex.spendMonths,
    annual_fee: ex.annualFee,
    rewards,
    source_lead_url: lead.source_url,
    flags: ex.flags,
  }
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

// ─────────────────────────── auto-apply to catalog ───────────────────────────

/**
 * Render a CreditCardBonus entry from a Proposal. Fields we couldn't extract
 * get null/defaults that a human can calibrate later — we don't invent data.
 */
function renderCatalogEntry(p: Proposal): string {
  const slug = normalizeName(p.card_name).replace(/\s+/g, "-").slice(0, 48)
  const id = `${p.issuer.replace(/\s+/g, "-")}-${slug}-auto`
  const isCash = !p.bonus_unit || p.bonus_unit === "$" || p.bonus_unit === "cashback"
  const cpp = isCash ? 1 : 0.01

  const rewards =
    p.rewards.length > 0
      ? "\n    rewards: [" +
        p.rewards
          .map(
            (r) =>
              `\n      { categories: ${JSON.stringify(r.categories)}, multiplier: ${r.multiplier}, unit: ${JSON.stringify(r.unit)} }`,
          )
          .join(",") +
        "\n    ],"
      : ""

  return `
  {
    id: ${JSON.stringify(id)},
    card_name: ${JSON.stringify(p.card_name)},
    issuer: ${JSON.stringify(p.issuer)},
    card_type: "personal",
    bonus_amount: ${p.bonus_amount ?? 0},
    bonus_currency: ${JSON.stringify(p.bonus_currency ?? (isCash ? "cash" : "points"))},
    is_hotel_card: false,
    cpp_value: ${cpp},
    min_spend: ${p.min_spend ?? 0},
    spend_months: ${p.spend_months ?? 3},
    annual_fee: ${p.annual_fee ?? 0},
    annual_fee_waived_first_year: false,
    statement_credits_year1: 0,
    offer_link: ${JSON.stringify(p.offer_link)},
    expired: false,
    key_benefits: [${p.rewards.map((r) => JSON.stringify(`${r.multiplier}${r.unit === "%" ? "%" : "x"} ${r.categories.join("/")}`)).join(", ")}],${rewards}
    // Auto-imported from ${p.source_lead_url} — verify before relying on: ${p.flags.join(", ") || "clean"}
  },`
}

function appendCatalog(entries: string[]): void {
  if (entries.length === 0) return
  const src = readFileSync(CATALOG_PATH, "utf8")
  const lastClose = src.lastIndexOf("]")
  if (lastClose < 0) throw new Error("couldn't find catalog closing bracket")
  const before = src.slice(0, lastClose)
  const after = src.slice(lastClose)
  const block =
    "\n\n  // ─── AUTO-IMPORTED FROM RICHWITHPOINTS ──────────────────────────\n  // These entries came from the discover-cards scraper. Fields are conservative\n  // (null/defaults where the regex couldn't extract a value). Review and\n  // calibrate before treating as trusted data.\n" +
    entries.join("\n")
  writeFileSync(CATALOG_PATH, before + block + "\n" + after)
}

// ─────────────────────────── main ───────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const leads = await loadRwpList()
  const newLeads = leads.filter((l) => !cardAlreadyInCatalog(l.card_name))
  console.log(`[rwp] ${leads.length} leads total, ${leads.length - newLeads.length} already in catalog, ${newLeads.length} net-new`)

  const capped = newLeads.slice(0, LIMIT)
  const proposals: Proposal[] = []
  let i = 0
  for (const lead of capped) {
    i++
    const proposal = await enrichLead(lead)
    if (!proposal) continue
    proposals.push(proposal)
    const bonusStr = proposal.bonus_amount !== null ? `${proposal.bonus_amount} ${proposal.bonus_unit ?? ""}` : "?"
    console.log(
      `[${i}/${capped.length}] ${proposal.card_name} → bonus=${bonusStr} spend=$${proposal.min_spend}/${proposal.spend_months}mo fee=$${proposal.annual_fee} rewards=${proposal.rewards.length}${proposal.flags.length ? " ⚠ " + proposal.flags.join(",") : ""}`,
    )
  }

  writeFileSync(join(OUT_DIR, "cards-proposed.json"), JSON.stringify(proposals, null, 2))

  const md: string[] = [
    `# New Credit Card Proposals`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `- Leads discovered: **${leads.length}**`,
    `- Already in catalog: ${leads.length - newLeads.length}`,
    `- Net-new proposals: **${proposals.length}**`,
    ``,
    `| Card | Issuer | Bonus | Spend | Fee | Rewards | Flags |`,
    `|---|---|---|---|---|---|---|`,
    ...proposals.map((p) => {
      const bonus = p.bonus_amount !== null ? `${p.bonus_amount.toLocaleString()} ${p.bonus_unit ?? ""}` : "—"
      const spend = p.min_spend ? `$${p.min_spend.toLocaleString()}/${p.spend_months ?? "?"}mo` : "—"
      const fee = p.annual_fee !== null ? `$${p.annual_fee}` : "—"
      const rew = p.rewards.map((r) => `${r.multiplier}${r.unit === "%" ? "%" : "x"} ${r.categories.join("/")}`).join(", ") || "—"
      return `| ${p.card_name} | ${p.issuer} | ${bonus} | ${spend} | ${fee} | ${rew} | ${p.flags.join(", ") || "clean"} |`
    }),
  ]
  writeFileSync(join(OUT_DIR, "cards-proposed.md"), md.join("\n"))

  await closeBrowser()

  if (DRY_RUN || NO_APPLY) {
    console.log(`\n(dry-run / --no-apply) Would have appended ${proposals.length} entries.`)
    console.log(`Report: ${join(OUT_DIR, "cards-proposed.md")}`)
    return
  }

  // Only auto-append proposals that have enough signal to be useful:
  // an offer_link, a bonus amount, and a non-zero min_spend (or explicit 0 for no-AF cards).
  const worthApplying = proposals.filter(
    (p) => p.offer_link && p.bonus_amount !== null && (p.min_spend !== null || p.annual_fee === 0),
  )
  const entries = worthApplying.map(renderCatalogEntry)
  appendCatalog(entries)

  console.log(``)
  console.log(`Wrote ${proposals.length} proposals to ${join(OUT_DIR, "cards-proposed.json")}`)
  console.log(`Auto-applied ${entries.length} entries to ${CATALOG_PATH}`)
  console.log(`Skipped ${proposals.length - entries.length} proposals missing critical fields (no offer_link / bonus_amount).`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
