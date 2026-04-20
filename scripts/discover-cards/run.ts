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
// Auto-apply is opt-in. Extraction from issuer pages is brittle (SPAs, tiered
// bonuses, rotating categories), so proposals need human review before they
// land in the catalog. Pass --apply to actually append to creditCardBonuses.ts.
const APPLY = args.includes("--apply")
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 40) || 40

const ROOT = process.cwd()

/**
 * Seed list of major churner-relevant cards. The richwithpoints list page
 * is a SPA with no exposed anchors on the grid, so scraping it directly
 * returned zero leads. Rather than fight the SPA, we seed the scraper with
 * a curated set of well-known cards + their issuer URLs, and let the
 * per-card scraper extract current bonus / spend / rewards from the
 * issuer's live offer page.
 *
 * Add entries here to grow coverage. The scraper dedupes against the live
 * catalog by normalized card name before applying, so re-running is safe.
 */
const SEED_CARDS: { card_name: string; issuer_link: string }[] = [
  // Chase (cards we don't already have)
  { card_name: "Chase Freedom Unlimited", issuer_link: "https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited" },
  { card_name: "Chase Freedom Flex", issuer_link: "https://creditcards.chase.com/cash-back-credit-cards/freedom/flex" },
  { card_name: "Chase Ink Business Cash", issuer_link: "https://creditcards.chase.com/business-credit-cards/ink/business-cash" },
  { card_name: "Chase Ink Business Unlimited", issuer_link: "https://creditcards.chase.com/business-credit-cards/ink/business-unlimited" },
  // Amex
  { card_name: "American Express Gold", issuer_link: "https://www.americanexpress.com/us/credit-cards/card/gold-card/" },
  { card_name: "American Express Green", issuer_link: "https://www.americanexpress.com/us/credit-cards/card/green-card/" },
  { card_name: "American Express Blue Business Plus", issuer_link: "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/amex-blue-business-plus-credit-card/" },
  { card_name: "American Express Business Gold", issuer_link: "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/amex-business-gold-card/" },
  { card_name: "American Express Delta Gold", issuer_link: "https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-gold/" },
  // Capital One
  { card_name: "Capital One Venture", issuer_link: "https://www.capitalone.com/credit-cards/venture/" },
  { card_name: "Capital One Venture X", issuer_link: "https://www.capitalone.com/credit-cards/venture-x/" },
  { card_name: "Capital One Savor", issuer_link: "https://www.capitalone.com/credit-cards/savor/" },
  { card_name: "Capital One SavorOne", issuer_link: "https://www.capitalone.com/credit-cards/savor-one/" },
  // Citi
  { card_name: "Citi Double Cash", issuer_link: "https://www.citi.com/credit-cards/citi-double-cash-credit-card" },
  { card_name: "Citi Strata Premier", issuer_link: "https://www.citi.com/credit-cards/citi-strata-premier-credit-card" },
  // Wells Fargo
  { card_name: "Wells Fargo Active Cash", issuer_link: "https://creditcards.wellsfargo.com/active-cash-credit-card" },
  { card_name: "Wells Fargo Autograph", issuer_link: "https://creditcards.wellsfargo.com/autograph-credit-card" },
  // Discover
  { card_name: "Discover it Cash Back", issuer_link: "https://www.discover.com/credit-cards/cash-back/it-card.html" },
  { card_name: "Discover it Miles", issuer_link: "https://www.discover.com/credit-cards/travel/miles-card.html" },
  // US Bank
  { card_name: "US Bank Altitude Go", issuer_link: "https://www.usbank.com/credit-cards/altitude-go-visa-signature-credit-card.html" },
  { card_name: "US Bank Altitude Connect", issuer_link: "https://www.usbank.com/credit-cards/altitude-connect-visa-signature-credit-card.html" },
  { card_name: "US Bank Cash Plus", issuer_link: "https://www.usbank.com/credit-cards/cash-plus-visa-signature-credit-card.html" },
  // Bilt
  { card_name: "Bilt Mastercard", issuer_link: "https://www.biltrewards.com/card" },
]
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

  // Build leads from the curated seed list (richwithpoints SPA isn't scrapable
  // without auth). Each seed entry already has the issuer URL, so we skip the
  // lead-discovery step and go straight to per-card enrichment.
  const leads: Lead[] = SEED_CARDS.map((c) => ({
    source: "richwithpoints",
    source_url: "seed://curated",
    card_name: c.card_name,
    issuer_link: c.issuer_link,
  }))
  const newLeads = leads.filter((l) => !cardAlreadyInCatalog(l.card_name))
  console.log(
    `[seed] ${leads.length} cards in seed list, ${leads.length - newLeads.length} already in catalog, ${newLeads.length} net-new`,
  )

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

  if (DRY_RUN || !APPLY) {
    console.log(`\nProposals: ${proposals.length}. Review ${join(OUT_DIR, "cards-proposed.md")} and re-run with --apply to append clean entries to the catalog.`)
    return
  }

  // Only append proposals with no extraction flags — anything with a flag
  // (e.g. no_bonus_amount_found, card_name_not_on_page) needs manual review.
  const worthApplying = proposals.filter(
    (p) => p.offer_link && p.bonus_amount !== null && p.min_spend !== null && p.flags.length === 0,
  )
  const entries = worthApplying.map(renderCatalogEntry)
  appendCatalog(entries)

  console.log(``)
  console.log(`Wrote ${proposals.length} proposals to ${join(OUT_DIR, "cards-proposed.json")}`)
  console.log(`Applied ${entries.length} clean entries to ${CATALOG_PATH}`)
  console.log(`Skipped ${proposals.length - entries.length} proposals with extraction flags or missing fields — review cards-proposed.md.`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
