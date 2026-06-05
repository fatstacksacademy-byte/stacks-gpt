/* eslint-disable no-console */
/**
 * Find URL overrides for cards that flagged with a broken page_signal
 * (card_name_mismatch / no_fields_extracted / redirected_to_generic) in
 * the latest verify-cards run.
 *
 * Reuses the issuer-catalog harvester + name fuzzy-matcher from
 * scripts/find-offer-links/run.ts. Key difference: we already have a
 * URL on file — the question is whether the issuer catalog points us
 * at a *different* URL (which would fix the flag). When the harvested
 * URL equals the current URL, the flag is verifier-side (CSP, SPA
 * hydration, card_name regex too strict) and an override won't help.
 *
 * Writes proposals to verification-output/card-url-override-proposals.json
 * by default. Pass --apply to insert card_url_overrides rows in Supabase.
 *
 * Flags:
 *   --apply           insert overrides (default: dry-run JSON only)
 *   --threshold=N     minimum name-similarity score (default 0.7)
 *   --only=ISSUER     restrict to one issuer
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { closeBrowser, getContext } from "../_shared/playwright"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1]
const THRESHOLD = Number(args.find((a) => a.startsWith("--threshold="))?.split("=")[1] ?? 0.7)

const ROOT = process.cwd()
const OUT_DIR = join(ROOT, "verification-output")
const ADMIN_EMAIL = "booth.nathaniel@gmail.com"

// Same issuer configs as scripts/find-offer-links/run.ts. Kept in sync by
// hand — refactor to a shared module if it grows past two consumers.
type IssuerConfig = {
  issuer: string
  catalogUrls: string[]
  hosts: string[]
  pathIncludes?: string[]
  pathExcludes?: string[]
}
const ISSUERS: IssuerConfig[] = [
  {
    issuer: "chase",
    catalogUrls: [
      "https://creditcards.chase.com/all-credit-cards",
      "https://creditcards.chase.com/travel-credit-cards/united",
    ],
    hosts: ["creditcards.chase.com", "www.chase.com"],
    pathIncludes: ["credit-cards/"],
    pathExcludes: ["/compare", "/applynow", "/apply-now"],
  },
  {
    issuer: "amex",
    catalogUrls: [
      "https://www.americanexpress.com/us/credit-cards/all-cards/personal-cards/",
      "https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/",
    ],
    hosts: ["www.americanexpress.com", "americanexpress.com"],
    pathIncludes: ["/credit-cards/card/", "/business-credit-cards/"],
    pathExcludes: ["compare", "/apply", "view-all", "best-business"],
  },
  {
    issuer: "bofa",
    catalogUrls: ["https://www.bankofamerica.com/credit-cards/"],
    hosts: ["www.bankofamerica.com", "bankofamerica.com"],
    pathIncludes: ["/credit-cards/products/"],
    pathExcludes: ["compare"],
  },
  {
    issuer: "barclays",
    catalogUrls: ["https://cards.barclaycardus.com/cards/"],
    hosts: ["cards.barclaycardus.com", "www.barclaycardus.com", "barclaycardus.com"],
    pathIncludes: ["/cards/"],
    pathExcludes: ["compare", "applynow", "apply-now"],
  },
  {
    issuer: "capital-one",
    catalogUrls: [
      "https://www.capitalone.com/credit-cards/cash-back/",
      "https://www.capitalone.com/credit-cards/travel-and-miles/",
      "https://www.capitalone.com/credit-cards/fair-and-building/",
      "https://www.capitalone.com/credit-cards/students/",
      "https://www.capitalone.com/small-business/credit-cards/",
    ],
    hosts: ["www.capitalone.com", "capitalone.com"],
    pathIncludes: ["/credit-cards/"],
    pathExcludes: ["compare", "/tools/", "/guides/", "card-finder", "preapprove", "/get-my-card", "/benefits/", "/faq", "/credit-cards/$", "/lp/", "/refer"],
  },
  {
    issuer: "citi",
    catalogUrls: [
      "https://www.citi.com/credit-cards/rewards-credit-cards",
      "https://www.citi.com/credit-cards/travel-reward-credit-cards",
      "https://www.citi.com/credit-cards/savings-and-cash-back-credit-cards",
      "https://www.citi.com/credit-cards/balance-transfer-credit-cards",
    ],
    hosts: ["www.citi.com", "citi.com", "online.citi.com"],
    pathIncludes: ["/credit-cards/citi-"],
    pathExcludes: ["compare", "all-credit-cards"],
  },
  {
    issuer: "us-bank",
    catalogUrls: ["https://www.usbank.com/credit-cards.html"],
    hosts: ["www.usbank.com", "usbank.com"],
    pathIncludes: ["/credit-cards/"],
    pathExcludes: [
      "compare", "credit-cards.html", "credit-card-insider", "extendpay",
      "buy-now-pay-later", "credit-cards/all-credit-cards",
    ],
  },
]

const NOISE_TOKENS = new Set([
  "card", "credit", "rewards", "the", "and", "with", "a", "an", "for",
  "®", "™", "©", "sm", "visa", "mastercard", "signature", "preferred",
])

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[®™©℠]/g, "")
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, ""))
    .replace(/[^a-z0-9 +&]/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !NOISE_TOKENS.has(t))
}

const ISSUER_TOKENS = new Set([
  "capital", "one", "chase", "citi", "amex", "american", "express",
  "wells", "fargo", "barclays", "bofa", "bank", "us", "discover",
  "synchrony", "fnbo", "truist", "regions",
])

function nameSimilarity(a: string, b: string): number {
  const ta = normalizeTokens(a)
  const tb = normalizeTokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const sa = new Set(ta)
  const sb = new Set(tb)
  let overlap = 0
  let nonIssuerOverlap = 0
  for (const t of sa) {
    if (sb.has(t)) {
      overlap++
      if (!ISSUER_TOKENS.has(t)) nonIssuerOverlap++
    }
  }
  if (nonIssuerOverlap === 0) return 0
  return overlap / Math.min(sa.size, sb.size)
}

type Harvested = { card_name: string; url: string }

async function harvestIssuer(cfg: IssuerConfig): Promise<Harvested[]> {
  const all: Harvested[] = []
  for (const url of cfg.catalogUrls) {
    all.push(...(await harvestSinglePage(cfg, url)))
  }
  const byUrl = new Map<string, string>()
  for (const h of all) {
    const prev = byUrl.get(h.url)
    if (!prev || h.card_name.length > prev.length) byUrl.set(h.url, h.card_name)
  }
  const deduped = Array.from(byUrl.entries()).map(([url, card_name]) => ({ url, card_name }))
  console.log(`[${cfg.issuer}] ${deduped.length} unique candidates`)
  return deduped
}

async function harvestSinglePage(cfg: IssuerConfig, catalogUrl: string): Promise<Harvested[]> {
  const ctx = await getContext()
  const page = await ctx.newPage()
  console.log(`[${cfg.issuer}] loading ${catalogUrl}`)
  try {
    const res = await page.goto(catalogUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    if (!res || res.status() >= 400) {
      console.log(`[${cfg.issuer}]   ${res?.status() ?? 0} — skipping`)
      return []
    }
    await page.waitForTimeout(5000)
    let harvested: Harvested[] = []
    try {
      harvested = await page.evaluate(
        ({ hosts, pathIncludes, pathExcludes }) => {
          const out: { card_name: string; url: string }[] = []
          const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
          for (const a of anchors) {
            let u: URL
            try { u = new URL(a.href) } catch { continue }
            const host = u.host.toLowerCase()
            if (!hosts.some((h) => host === h || host.endsWith("." + h))) continue
            const path = u.pathname.toLowerCase()
            if (pathIncludes && pathIncludes.length > 0 && !pathIncludes.some((p) => path.includes(p))) continue
            if (pathExcludes && pathExcludes.some((p) => path.includes(p))) continue
            let name = (a.innerText || "").trim().replace(/\s+/g, " ")
            if (!name || name.length < 4 || /apply|learn more|compare|see (all|details)|view (all|details)|see if/i.test(name)) {
              let cur: Element | null = a
              for (let i = 0; i < 6 && cur; i++) {
                const heading = cur.querySelector("h1, h2, h3, h4, [class*='title'], [class*='name']")
                if (heading && heading.textContent) {
                  const t = heading.textContent.trim().replace(/\s+/g, " ")
                  if (t && t.length > 4 && !/apply|learn more|compare/i.test(t)) {
                    name = t
                    break
                  }
                }
                cur = cur.parentElement
              }
            }
            if (!name || name.length < 4) continue
            if (/^(home|all (cards|credit)|cards?|credit cards?)$/i.test(name)) continue
            if (/\(\d+\)/.test(name)) continue
            out.push({ card_name: name, url: u.href.split("#")[0] })
          }
          return out
        },
        { hosts: cfg.hosts, pathIncludes: cfg.pathIncludes ?? [], pathExcludes: cfg.pathExcludes ?? [] },
      )
    } catch (evalErr) {
      const msg = evalErr instanceof Error ? evalErr.message : String(evalErr)
      if (!/eval is disabled|Content Security Policy/i.test(msg)) throw evalErr
      const html = await page.content()
      const anchorRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      let m: RegExpExecArray | null
      while ((m = anchorRe.exec(html)) !== null) {
        let href = m[1]
        try {
          const u = new URL(href, catalogUrl)
          href = u.href
          const host = u.host.toLowerCase()
          if (!cfg.hosts.some((h) => host === h || host.endsWith("." + h))) continue
          const path = u.pathname.toLowerCase()
          if (cfg.pathIncludes && cfg.pathIncludes.length > 0 && !cfg.pathIncludes.some((p) => path.includes(p))) continue
          if (cfg.pathExcludes && cfg.pathExcludes.some((p) => path.includes(p))) continue
          const name = m[2]
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim()
          if (!name || name.length < 4) continue
          if (/^(home|all (cards|credit)|cards?|credit cards?)$/i.test(name)) continue
          if (/\(\d+\)/.test(name)) continue
          if (/apply|learn more|compare|see (all|details)|view (all|details)/i.test(name)) continue
          harvested.push({ card_name: name, url: href.split("#")[0] })
        } catch { continue }
      }
      console.log(`[${cfg.issuer}]   used HTML-regex fallback (CSP blocks evaluate)`)
    }
    console.log(`[${cfg.issuer}]   ${harvested.length} from this page`)
    return harvested
  } catch (e) {
    console.log(`[${cfg.issuer}]   error: ${e instanceof Error ? e.message : String(e)}`)
    return []
  } finally {
    await page.close()
  }
}

function urlsEquivalent(a: string, b: string): boolean {
  if (a === b) return true
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    // Strip trailing slash + lowercase host + drop query for the comparison.
    const norm = (u: URL) =>
      `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/$/, "")}`
    return norm(ua) === norm(ub)
  } catch {
    return false
  }
}

type Proposal = {
  card_id: string
  card_name: string
  issuer: string
  page_signal: string
  current_url: string | null
  override_url: string
  match_name: string
  score: number
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  // Pull broken cards from the latest run.
  const { data: latest } = await supabase
    .from("card_verifications")
    .select("run_at")
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latest?.run_at) {
    console.error("No card_verifications rows found.")
    process.exit(1)
  }
  const { data: brokenRows, error: bErr } = await supabase
    .from("card_verifications")
    .select("card_id, card_name, page_signal, url")
    .eq("run_at", latest.run_at)
    .in("page_signal", ["card_name_mismatch", "no_fields_extracted", "redirected_to_generic"])
  if (bErr) {
    console.error("broken-cards query failed:", bErr.message)
    process.exit(1)
  }
  console.log(`Broken-page cards in latest run: ${brokenRows?.length ?? 0}`)

  // Index catalog cards by id so we can look up the catalog issuer.
  const cardById = new Map<string, CreditCardBonus>()
  for (const c of creditCardBonuses) cardById.set(c.id, c)

  // Group broken cards by issuer; drop unknown issuers.
  const brokenByIssuer = new Map<string, typeof brokenRows>()
  for (const r of brokenRows ?? []) {
    const card = cardById.get(r.card_id)
    if (!card) continue
    const arr = brokenByIssuer.get(card.issuer) ?? []
    arr.push(r)
    brokenByIssuer.set(card.issuer, arr)
  }

  // Already-active overrides — don't re-insert.
  const { data: existingOverrides } = await supabase
    .from("card_url_overrides")
    .select("card_id")
    .eq("is_active", true)
  const existingByCard = new Set<string>((existingOverrides ?? []).map((o) => o.card_id))

  const proposals: Proposal[] = []
  const sameUrl: { card_id: string; card_name: string; issuer: string; page_signal: string }[] = []
  const noMatch: { card_id: string; card_name: string; issuer: string; page_signal: string }[] = []
  const skippedExisting: string[] = []

  let issuersToHarvest = ISSUERS
  if (ONLY) issuersToHarvest = issuersToHarvest.filter((i) => i.issuer === ONLY)

  for (const cfg of issuersToHarvest) {
    const targets = brokenByIssuer.get(cfg.issuer) ?? []
    if (targets.length === 0) {
      console.log(`[${cfg.issuer}] 0 broken cards — skipping`)
      continue
    }
    console.log(`[${cfg.issuer}] ${targets.length} broken cards to attempt`)
    const candidates = await harvestIssuer(cfg)
    if (candidates.length === 0) {
      for (const t of targets) noMatch.push({ card_id: t.card_id, card_name: t.card_name, issuer: cfg.issuer, page_signal: t.page_signal })
      continue
    }
    for (const t of targets) {
      if (existingByCard.has(t.card_id)) {
        skippedExisting.push(t.card_id)
        continue
      }
      let best: { c: Harvested; s: number } | null = null
      for (const c of candidates) {
        const s = nameSimilarity(t.card_name, c.card_name)
        if (s >= THRESHOLD && (!best || s > best.s)) best = { c, s }
      }
      if (!best) {
        noMatch.push({ card_id: t.card_id, card_name: t.card_name, issuer: cfg.issuer, page_signal: t.page_signal })
        continue
      }
      const currentUrl = t.url
      if (currentUrl && urlsEquivalent(currentUrl, best.c.url)) {
        sameUrl.push({ card_id: t.card_id, card_name: t.card_name, issuer: cfg.issuer, page_signal: t.page_signal })
        continue
      }
      proposals.push({
        card_id: t.card_id,
        card_name: t.card_name,
        issuer: cfg.issuer,
        page_signal: t.page_signal,
        current_url: currentUrl,
        override_url: best.c.url,
        match_name: best.c.card_name,
        score: best.s,
      })
    }
  }

  await closeBrowser()

  console.log(``)
  console.log(`=== Summary ===`)
  console.log(`Proposed overrides (different URL found): ${proposals.length}`)
  console.log(`Same URL as catalog (override won't help): ${sameUrl.length}`)
  console.log(`No fuzzy match: ${noMatch.length}`)
  console.log(`Skipped (already has active override): ${skippedExisting.length}`)
  console.log(``)

  writeFileSync(
    join(OUT_DIR, "card-url-override-proposals.json"),
    JSON.stringify({ proposals, sameUrl, noMatch, skippedExisting }, null, 2),
  )
  console.log(`Wrote ${join(OUT_DIR, "card-url-override-proposals.json")}`)

  if (!APPLY) {
    console.log(`(dry-run) Pass --apply to insert ${proposals.length} card_url_overrides rows.`)
    return
  }

  let inserted = 0
  for (const p of proposals) {
    // Deactivate any prior active override for this card first.
    const { error: deactErr } = await supabase
      .from("card_url_overrides")
      .update({ is_active: false })
      .eq("card_id", p.card_id)
      .eq("is_active", true)
    if (deactErr) {
      console.error(`  ✗ ${p.card_id} deactivate failed:`, deactErr.message)
      continue
    }
    const discoveryMethod = `Auto-discovered via issuer catalog harvest. Match: "${p.match_name}" (score ${p.score.toFixed(2)}, threshold ${THRESHOLD}). Catalog page: ${p.issuer}. Prior verifier signal: ${p.page_signal}.`
    const { error } = await supabase.from("card_url_overrides").insert({
      card_id: p.card_id,
      override_url: p.override_url,
      previous_url: p.current_url ?? null,
      discovery_method: discoveryMethod,
      is_active: true,
      created_by: ADMIN_EMAIL,
    })
    if (error) {
      console.error(`  ✗ ${p.card_id} insert failed:`, error.message)
      continue
    }
    inserted++
    console.log(`  ✓ ${p.card_id} → ${p.override_url}`)
  }
  console.log(``)
  console.log(`Inserted ${inserted}/${proposals.length} overrides.`)
}

main().catch(async (err) => {
  console.error(err)
  await closeBrowser()
  process.exit(1)
})
