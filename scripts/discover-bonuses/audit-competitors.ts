/* eslint-disable no-console */
/**
 * One-shot audit: pull every visible offer from bankrewards.io and every
 * bonus-relevant post from profitablecontent.com's sitemap, then cross-
 * reference against our 3 live data files (bonuses.ts, savingsBonuses.ts,
 * creditCardBonuses.ts) to surface what's missing.
 *
 * This script does NOT store article bodies from either source — we only
 * extract lead metadata (bank name, product type, bonus amount, offer URL).
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"
import { XMLParser } from "fast-xml-parser"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import { normalizeBankName } from "./dedupe"
import { UA, DEFAULT_THROTTLE_SECONDS } from "./env"

type CompetitorOffer = {
  source: "bankrewards" | "profitablecontent"
  bank: string
  product_type?: string
  bonus_amount: number | null
  bonus_text: string
  url: string
  availability?: string
  requirement?: string
  monthly_fee?: string
  /** sitemap lastmod (profitablecontent) or null */
  last_modified?: string | null
}

const OUT_DIR = join(process.cwd(), "verification-output")

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ───────────────────────── bankrewards.io ─────────────────────────

async function pullBankRewards(): Promise<CompetitorOffer[]> {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
    viewport: { width: 1280, height: 1800 },
  })
  const page = await ctx.newPage()

  const paths: { path: string; kind: string }[] = [
    { path: "/banks", kind: "checking" },
    { path: "/brokerages", kind: "brokerage" },
    { path: "/cards", kind: "credit_card" },
    { path: "/highInterestAccounts", kind: "savings" },
    { path: "/businessAccounts", kind: "business_bank" },
  ]

  const allOffers: CompetitorOffer[] = []

  for (const { path, kind } of paths) {
    const url = "https://www.bankrewards.io" + path
    console.log(`[bankrewards] fetching ${path} (${kind})`)
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(5000)

      // Scroll to trigger any lazy-loaded offers
      for (let i = 0; i < 12; i++) {
        await page.evaluate(() => window.scrollBy(0, 2000))
        await page.waitForTimeout(900)
      }

      // Parse every offer card by finding anchors to /bank/<id>
      const cards = await page.evaluate(() => {
        const results: {
          href: string
          bank: string
          text: string
        }[] = []
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('a[href*="/bank/"]'),
        )
        for (const a of anchors) {
          // Walk up to find the card container
          let card: Element | null = a
          for (let i = 0; i < 6 && card; i++) {
            const t = card.textContent ?? ""
            if (/BONUS|HOW TO GET|MONTHLY FEE|MILES|APY|How to Get|bonus/i.test(t)) break
            card = card.parentElement
          }
          if (!card) continue
          const text = (card as HTMLElement).innerText.replace(/\s+/g, " ").trim()
          // Bank name is the h3 / first line
          const bankEl =
            card.querySelector("h1, h2, h3, h4") || card.querySelector("p") || null
          const bank = bankEl?.textContent?.trim() ?? text.split(/\s/)[0] ?? ""
          results.push({ href: a.href, bank, text })
        }
        // Dedupe by href
        const seen = new Set<string>()
        return results.filter((r) => {
          if (seen.has(r.href)) return false
          seen.add(r.href)
          return true
        })
      })

      console.log(`  found ${cards.length} offer cards`)

      for (const c of cards) {
        const amt = parseBonusAmount(c.text)
        const availability = (c.text.match(/Availability:\s*([^A-Z]*?(?=View Offer|Details|$))/i) ?? [])[1]?.trim()
        const fee = (c.text.match(/MONTHLY FEE\s*([^\n]+?)(?=\sAvailability|\sView|\sDetails|$)/i) ?? [])[1]?.trim()
        const reqMatch = c.text.match(/HOW(?:\s*TO\s*GET)?\s*([^\n]+?)(?=\s(?:MONTHLY FEE|APY|MILES|FEE|Availability)|$)/i)
        const req = reqMatch?.[1]?.trim()
        allOffers.push({
          source: "bankrewards",
          bank: c.bank || "Unknown",
          product_type: kind,
          bonus_amount: amt,
          bonus_text: c.text.slice(0, 240),
          url: c.href,
          availability,
          requirement: req,
          monthly_fee: fee,
        })
      }
      // Polite gap before next category
      await sleep(DEFAULT_THROTTLE_SECONDS * 1000)
    } catch (err) {
      console.warn(
        `[bankrewards] failed on ${path}:`,
        err instanceof Error ? err.message : String(err),
      )
    }
  }

  await browser.close()
  return allOffers
}

function parseBonusAmount(text: string): number | null {
  // Prefer an explicit "BONUS\s*$X" pattern
  const m1 = text.match(/BONUS\s*(?:Up\s*to\s*)?\$(\d[\d,]{1,6})/i)
  if (m1) return Number(m1[1].replace(/,/g, ""))
  // Fall back to any $amount in the first 180 chars
  const m2 = text.slice(0, 180).match(/\$(\d[\d,]{1,6})/)
  if (m2) return Number(m2[1].replace(/,/g, ""))
  return null
}

// ─────────────────────── profitablecontent.com ───────────────────────

async function pullProfitableContent(): Promise<CompetitorOffer[]> {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true })
  const sitemapUrl = "https://www.profitablecontent.com/post-sitemap.xml"
  console.log(`[profitablecontent] fetching ${sitemapUrl}`)
  const r = await fetch(sitemapUrl, {
    headers: { "User-Agent": UA, Accept: "application/xml" },
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) {
    console.warn(`[profitablecontent] sitemap fetch failed: ${r.status}`)
    return []
  }
  const xml = await r.text()
  const parsed = parser.parse(xml) as {
    urlset?: { url?: { loc?: string; lastmod?: string } | { loc?: string; lastmod?: string }[] }
  }
  const urls = Array.isArray(parsed.urlset?.url)
    ? parsed.urlset.url
    : parsed.urlset?.url
      ? [parsed.urlset.url]
      : []
  console.log(`[profitablecontent] ${urls.length} total posts in sitemap`)

  const offers: CompetitorOffer[] = []
  for (const u of urls) {
    if (!u.loc) continue
    const slug = u.loc.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "")
    // Bonus-relevant: the slug must mention bonus/promo/offer OR contain $-like amount patterns
    const isRelevant =
      /(bonus|promo|offer|checking|savings|signup|sign-up|welcome|points|miles|referral)/i.test(slug)
    if (!isRelevant) continue
    // Skip meta/navigation slugs
    if (/^(about|contact|privacy|terms|author|category|tag)/i.test(slug)) continue

    const amount = parseAmountFromSlug(slug)
    const bank = parseBankFromSlug(slug)
    offers.push({
      source: "profitablecontent",
      bank,
      product_type: guessTypeFromSlug(slug),
      bonus_amount: amount,
      bonus_text: slug,
      url: u.loc,
      last_modified: u.lastmod ?? null,
    })
  }
  console.log(`[profitablecontent] ${offers.length} bonus-relevant posts (pre-freshness-filter)`)
  return offers
}

/** Keep only posts updated within the last N months (current offers, not archive). */
function filterFresh(offers: CompetitorOffer[], monthsBack = 12): CompetitorOffer[] {
  const cutoff = Date.now() - monthsBack * 30.44 * 86400 * 1000
  return offers.filter((o) => {
    if (o.source !== "profitablecontent") return true
    if (!o.last_modified) return false
    const t = Date.parse(o.last_modified)
    if (isNaN(t)) return false
    return t >= cutoff
  })
}

function parseAmountFromSlug(slug: string): number | null {
  // Match patterns like "-500-bonus", "-60000-points", "125k-offer"
  const m1 = slug.match(/(\d{2,5})k\b/i)
  if (m1) return Number(m1[1]) * 1000
  const m2 = slug.match(/(?:^|-)(\d{2,6})(?:-(?:bonus|offer|points|miles|cash|welcome|signup|sign-up))/i)
  if (m2) return Number(m2[1])
  return null
}

function parseBankFromSlug(slug: string): string {
  // First 2-3 words of the slug typically identify the bank/issuer
  const parts = slug.split(/-/).slice(0, 3)
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
    .replace(/\s+\d.*/, "") // strip trailing number
    .trim()
}

function guessTypeFromSlug(slug: string): string {
  const s = slug.toLowerCase()
  if (/checking/.test(s)) return "checking"
  if (/savings|brokerage|hysa|high-yield/.test(s)) return "savings"
  if (/credit-card|sapphire|venture|amex|platinum|preferred|reserve|points|miles|signup|sign-up/.test(s))
    return "credit_card"
  return "unknown"
}

// ────────────────────── Match against our data ──────────────────────

type OurIndex = {
  kind: "checking" | "savings" | "credit_card"
  id: string
  bank: string
  product: string
  amount: number
  normKey: string
}

function buildOurIndex(): OurIndex[] {
  const out: OurIndex[] = []
  for (const b of bonuses as Array<Record<string, unknown>>) {
    if (b.expired) continue
    const bank = String(b.bank_name ?? "")
    out.push({
      kind: "checking",
      id: String(b.id),
      bank,
      product: bank + " checking",
      amount: Number(b.bonus_amount ?? 0),
      normKey: normalizeBankName(bank),
    })
  }
  for (const s of savingsBonuses as Array<Record<string, unknown>>) {
    if (s.expired) continue
    const bank = String(s.bank_name ?? "")
    out.push({
      kind: "savings",
      id: String(s.id),
      bank,
      product: bank + " savings",
      amount: 0,
      normKey: normalizeBankName(bank),
    })
  }
  for (const c of creditCardBonuses as Array<Record<string, unknown>>) {
    if (c.expired) continue
    const bank = String(c.issuer ?? "")
    const product = String(c.card_name ?? "")
    out.push({
      kind: "credit_card",
      id: String(c.id),
      bank,
      product,
      amount: Number(c.bonus_amount ?? 0),
      normKey: normalizeBankName(bank) + " " + normalizeBankName(product),
    })
  }
  return out
}

function findMatch(offer: CompetitorOffer, index: OurIndex[]): OurIndex | null {
  const offerBankNorm = normalizeBankName(offer.bank)
  if (!offerBankNorm) return null
  // Restrict to the product_type for cleaner matching (we bucket bankrewards offers already)
  let candidates = index
  if (offer.product_type === "credit_card") {
    candidates = candidates.filter((c) => c.kind === "credit_card")
  } else if (offer.product_type === "checking" || offer.product_type === "business_bank") {
    candidates = candidates.filter((c) => c.kind === "checking")
  } else if (offer.product_type === "savings" || offer.product_type === "brokerage") {
    candidates = candidates.filter((c) => c.kind === "savings")
  }

  const aTokens = offerBankNorm.split(" ").filter((t) => t.length >= 3)

  // Tiered matching — pick the first threshold that fires.
  // Tier A: any 4+ char token appears in a candidate's norm key.
  // Tier B: token-level substring overlap (handles "Vally" vs. "Valley").
  for (const c of candidates) {
    const bTokens = c.normKey.split(" ").filter((t) => t.length >= 3)
    // A: exact token containment
    if (aTokens.some((t) => t.length >= 4 && bTokens.includes(t))) return c
    // B: any offer token is a substring of any candidate token (or vice versa)
    for (const at of aTokens) {
      for (const bt of bTokens) {
        if (at.length >= 4 && bt.length >= 4 && (at.includes(bt) || bt.includes(at))) return c
      }
    }
    // C: whole-string containment fallback
    if (
      offerBankNorm.length >= 5 &&
      (c.normKey.includes(offerBankNorm) || offerBankNorm.includes(c.normKey))
    ) {
      return c
    }
  }
  return null
}

// ──────────────────────────── Main ────────────────────────────

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  const [br, pcRaw] = await Promise.all([pullBankRewards(), pullProfitableContent()])
  const pc = filterFresh(pcRaw, 12)
  console.log(
    `[profitablecontent] ${pc.length} posts after 12-month freshness filter (from ${pcRaw.length})`,
  )
  const all = [...br, ...pc]
  console.log(
    `\nTotal competitor offers considered: ${all.length} (bankrewards=${br.length}, profitablecontent=${pc.length})`,
  )

  const ourIndex = buildOurIndex()
  console.log(
    `Our non-expired inventory: ${ourIndex.length} (checking=${ourIndex.filter((e) => e.kind === "checking").length}, savings=${ourIndex.filter((e) => e.kind === "savings").length}, credit_card=${ourIndex.filter((e) => e.kind === "credit_card").length})`,
  )

  type Row = CompetitorOffer & { our_match: OurIndex | null }
  const rows: Row[] = all.map((o) => ({ ...o, our_match: findMatch(o, ourIndex) }))

  const missing = rows.filter((r) => !r.our_match)
  const matched = rows.filter((r) => !!r.our_match)

  // Save full raw dump
  writeFileSync(join(OUT_DIR, "competitor-offers.json"), JSON.stringify(rows, null, 2))

  // Markdown report
  const md: string[] = []
  md.push(`# Competitor Bonus Audit`)
  md.push(``)
  md.push(`Generated: ${new Date().toISOString()}`)
  md.push(``)
  md.push(`## Summary`)
  md.push(``)
  md.push(`- Total competitor offers: **${all.length}**`)
  md.push(`  - bankrewards.io: ${br.length}`)
  md.push(`  - profitablecontent.com: ${pc.length}`)
  md.push(`- Our non-expired inventory: ${ourIndex.length}`)
  md.push(`- ✅ Matched (already on our site): **${matched.length}**`)
  md.push(`- 🆕 Missing from our site: **${missing.length}**`)
  md.push(``)
  md.push(`> Matching is fuzzy (bank-name tokens + product type). Review the missing list for false positives before adding any entries.`)
  md.push(``)

  const missingByType: Record<string, Row[]> = {}
  for (const m of missing) {
    const k = m.product_type ?? "unknown"
    ;(missingByType[k] ||= []).push(m)
  }

  for (const [type, items] of Object.entries(missingByType)) {
    md.push(`## Missing: ${type} (${items.length})`)
    md.push(``)
    md.push(`| Bank | Amount | Requirement | Monthly fee | Source | Updated | Link |`)
    md.push(`|---|---|---|---|---|---|---|`)
    for (const it of items.slice(0, 300)) {
      const amt = it.bonus_amount ? "$" + it.bonus_amount.toLocaleString() : "—"
      const req = (it.requirement || "").slice(0, 60)
      const fee = (it.monthly_fee || "").slice(0, 40)
      const updated = it.last_modified ? it.last_modified.slice(0, 10) : ""
      md.push(
        `| ${escapeMd(it.bank)} | ${amt} | ${escapeMd(req)} | ${escapeMd(fee)} | ${it.source} | ${updated} | ${it.url} |`,
      )
    }
    if (items.length > 300) md.push(`| ... | ${items.length - 300} more in competitor-offers.json | | | | | |`)
    md.push(``)
  }

  writeFileSync(join(OUT_DIR, "competitor-audit.md"), md.join("\n"))
  console.log(``)
  console.log(`Report: ${join(OUT_DIR, "competitor-audit.md")}`)
  console.log(`Raw: ${join(OUT_DIR, "competitor-offers.json")}`)
  console.log(``)
  console.log(`Matched: ${matched.length} / Missing: ${missing.length}`)
}

function escapeMd(s: string | undefined): string {
  if (!s) return ""
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
