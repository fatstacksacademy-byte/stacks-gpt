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
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { fetchPage, closeBrowser } from "../_shared/playwright"
import { upsertDiscoveryLeads, type DiscoveryLeadInput } from "../_shared/discovery-leads"
import {
  type Proposal,
  normalizeName,
  cardLeadKey,
  cardAlreadyInCatalog,
  renderCatalogEntry,
  appendCardEntries,
} from "./catalog-entry"
import {
  extractAll,
  extractRewardsTiers,
  type ExtractedRewardsTier,
} from "../verify-cards/extract"
import { scrapeAllIssuerIndexes, type IssuerLead } from "./issuer-index"

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
// Auto-apply is opt-in. Extraction from issuer pages is brittle (SPAs, tiered
// bonuses, rotating categories), so proposals need human review before they
// land in the catalog. Pass --apply to actually append to creditCardBonuses.ts.
const APPLY = args.includes("--apply")
const LIMIT = Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? 40) || 40
// Issuer-index scraping is opt-in for now since markup changes at chase.com /
// americanexpress.com can produce zero results without warning. Pass
// --skip-issuer-indexes to fall back to the curated SEED_CARDS list only.
const SKIP_ISSUER_INDEXES = args.includes("--skip-issuer-indexes")

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
  // Business cards — Chase business cards come through the issuer-index pass
  // dynamically; Amex/Cap1/US Bank business pages are bot-blocked SPAs, so seed
  // the high-value ones. Already-cataloged names dedupe out harmlessly.
  { card_name: "Chase Ink Business Premier", issuer_link: "https://creditcards.chase.com/business-credit-cards/ink/premier" },
  { card_name: "American Express Blue Business Cash", issuer_link: "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/blue-business-cash-credit-card/" },
  { card_name: "Capital One Spark Cash Plus", issuer_link: "https://www.capitalone.com/small-business/credit-cards/spark-cash-plus/" },
  { card_name: "Capital One Spark Miles", issuer_link: "https://www.capitalone.com/small-business/credit-cards/spark-miles/" },
  { card_name: "U.S. Bank Business Triple Cash Rewards", issuer_link: "https://www.usbank.com/business-banking/business-credit-cards/business-triple-cash-rewards-visa-business-card.html" },
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

// Proposal, normalizeName, cardLeadKey, cardAlreadyInCatalog, renderCatalogEntry
// and appendCardEntries now live in ./catalog-entry (shared with the promote step).

/** Map a card Proposal to the cross-machine discovery_leads row shape. */
function cardProposalToRow(p: Proposal): DiscoveryLeadInput {
  return {
    lead_key: cardLeadKey(p.card_name),
    name: p.card_name,
    institution: p.issuer,
    bonus_amount: p.bonus_amount,
    classification: "credit_card_bonus",
    // Cards have no native confidence score — derive a coarse one from flags
    // so the review queue can sort cleanest-first.
    confidence: p.flags.length === 0 ? 0.8 : 0.4,
    source_url: p.source_lead_url,
    canonical_url: p.offer_link,
    flags: p.flags,
    payload: p,
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
      intro_apr: null,
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
      intro_apr: null,
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
    intro_apr: ex.introApr
      ? {
          purchase_apr_months: ex.introApr.purchaseAprMonths,
          bt_apr_months: ex.introApr.btAprMonths,
          bt_fee_pct: ex.introApr.btFeePct,
          go_to_apr_low: ex.introApr.goToAprLow,
          go_to_apr_high: ex.introApr.goToAprHigh,
        }
      : null,
    rewards,
    source_lead_url: lead.source_url,
    flags: ex.flags,
  }
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
}

// ─────────────────────────── main ───────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  // Two lead sources:
  //   - Curated SEED_CARDS list (hand-maintained; one row per known card)
  //   - Issuer-index scrapers (Chase + Amex public "all cards" pages)
  // Both feed into the same dedup + per-card enrichment pipeline.
  const seedLeads: Lead[] = SEED_CARDS.map((c) => ({
    source: "richwithpoints",
    source_url: "seed://curated",
    card_name: c.card_name,
    issuer_link: c.issuer_link,
  }))

  let issuerLeads: Lead[] = []
  if (!SKIP_ISSUER_INDEXES) {
    const indexed: IssuerLead[] = await scrapeAllIssuerIndexes(UA)
    console.log(`[issuer-index] scraped ${indexed.length} candidates from issuer pages`)
    issuerLeads = indexed.map((l) => ({
      source: "richwithpoints" as const,
      source_url: l.source_url,
      card_name: l.card_name,
      issuer_link: l.issuer_link,
    }))
  }

  // Merge + per-name dedupe BEFORE catalog dedupe so we don't double-process
  // a card that's in both the seed list and an issuer index.
  const seenNames = new Set<string>()
  const leads: Lead[] = []
  for (const l of [...seedLeads, ...issuerLeads]) {
    const k = normalizeName(l.card_name)
    if (!k || seenNames.has(k)) continue
    seenNames.add(k)
    leads.push(l)
  }
  console.log(`[merge] ${seedLeads.length} seed + ${issuerLeads.length} issuer-index → ${leads.length} unique leads`)
  const newLeads = leads.filter((l) => !cardAlreadyInCatalog(l.card_name))
  console.log(
    `[catalog-dedup] ${leads.length} unique leads, ${leads.length - newLeads.length} already in catalog, ${newLeads.length} net-new`,
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

  // Persist proposals to the cross-machine review queue (Supabase). This is the
  // human-gated path: cards land in /admin/review for approval rather than
  // auto-appending to the catalog. (--apply still force-appends, for local use.)
  let cardPersist = { persisted: 0, skipped: false as boolean }
  if (!DRY_RUN) {
    cardPersist = await upsertDiscoveryLeads("card", proposals.map(cardProposalToRow))
  }

  await closeBrowser()

  if (DRY_RUN || !APPLY) {
    if (!DRY_RUN) {
      console.log(
        cardPersist.skipped
          ? `\nSupabase discovery_leads: SKIPPED (see warning above)`
          : `\nSupabase discovery_leads: persisted ${cardPersist.persisted} card lead(s) for review at /admin/review`,
      )
    }
    console.log(`Proposals: ${proposals.length}. Review them in /admin/review (or ${join(OUT_DIR, "cards-proposed.md")}); re-run with --apply to force-append clean entries to the catalog.`)
    return
  }

  // Two acceptance shapes:
  //   1. Classic SUB card — bonus + min_spend extracted cleanly, no flags.
  //   2. 0% APR card — intro_apr block extracted. These often have no
  //      welcome bonus, so the SUB-extraction flags are expected and not
  //      disqualifying. The audience for these is debt carriers / large-
  //      purchase planners, not points chasers.
  // In both cases we require an offer_link and that the page actually
  // mentioned the card (no card_name_not_on_page flag).
  const worthApplying = proposals.filter((p) => {
    if (!p.offer_link) return false
    if (p.flags.includes("card_name_not_on_page")) return false
    if (p.flags.some((f) => f.startsWith("issuer_fetch_failed"))) return false
    const isCleanSub =
      p.bonus_amount !== null &&
      p.min_spend !== null &&
      // Only "no_X_found" flags are present (no harder signals like
      // card_name_not_on_page).
      p.flags.every((f) => f.startsWith("no_"))
    const isClean0Apr =
      p.intro_apr !== null &&
      (p.intro_apr.purchase_apr_months !== null ||
        p.intro_apr.bt_apr_months !== null) &&
      p.flags.every((f) => f.startsWith("no_"))
    return isCleanSub || isClean0Apr
  })
  const entries = worthApplying.map(renderCatalogEntry)
  appendCardEntries(entries)

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
