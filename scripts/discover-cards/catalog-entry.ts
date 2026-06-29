/**
 * Shared card-catalog rendering.
 *
 * Used by BOTH discover-cards (proposal output / opt-in auto-apply) and the
 * promote step (turning an APPROVED card lead into a catalog row). One source
 * of truth so both paths emit identical CreditCardBonus entries.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { join } from "node:path"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"
import type { ExtractedRewardsTier } from "../verify-cards/extract"

const CATALOG_PATH = join(process.cwd(), "lib", "data", "creditCardBonuses.ts")

export type Proposal = {
  card_name: string
  issuer: string
  offer_link: string
  bonus_amount: number | null
  bonus_currency: string | null
  bonus_unit: string | null
  min_spend: number | null
  spend_months: number | null
  annual_fee: number | null
  intro_apr: {
    purchase_apr_months: number | null
    bt_apr_months: number | null
    bt_fee_pct: number | null
    go_to_apr_low: number | null
    go_to_apr_high: number | null
  } | null
  rewards: ExtractedRewardsTier[]
  source_lead_url: string
  flags: string[]
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/®|™|©/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Stable dedupe key for a card lead (sha1 of the normalized card name). */
export function cardLeadKey(cardName: string): string {
  return createHash("sha1").update(normalizeName(cardName)).digest("hex").slice(0, 12)
}

export function cardAlreadyInCatalog(cardName: string): boolean {
  const norm = normalizeName(cardName)
  if (!norm) return true
  for (const c of creditCardBonuses as CreditCardBonus[]) {
    const existing = normalizeName(c.card_name)
    if (!existing) continue
    if (existing === norm) return true
    // Directional match only: a candidate is a dupe when its name is contained
    // in an existing one (handles "Chase Sapphire" vs "Chase Sapphire Preferred").
    // We deliberately do NOT match the reverse direction, which would wrongly
    // drop longer/new variants like "Capital One Venture X" against "Capital One Venture".
    if (norm.length >= 12 && existing.includes(norm)) return true
  }
  return false
}

/** Render the intro_apr sub-object, or "" if the extractor found no intro offer. */
function renderIntroAprBlock(intro: Proposal["intro_apr"]): string {
  if (!intro) return ""
  const parts: string[] = []
  if (intro.purchase_apr_months !== null) parts.push(`purchase_apr_months: ${intro.purchase_apr_months}`)
  if (intro.bt_apr_months !== null) parts.push(`bt_apr_months: ${intro.bt_apr_months}`)
  if (intro.bt_fee_pct !== null) parts.push(`bt_fee_pct: ${intro.bt_fee_pct}`)
  if (intro.go_to_apr_low !== null) parts.push(`go_to_apr_low: ${intro.go_to_apr_low}`)
  if (intro.go_to_apr_high !== null) parts.push(`go_to_apr_high: ${intro.go_to_apr_high}`)
  if (parts.length === 0) return ""
  return `\n    intro_apr: { ${parts.join(", ")} },`
}

/**
 * Render a CreditCardBonus entry from a Proposal. Fields we couldn't extract
 * get null/defaults that a human can calibrate later — we don't invent data.
 */
export function renderCatalogEntry(p: Proposal): string {
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
    expired: false,${renderIntroAprBlock(p.intro_apr)}
    key_benefits: [${p.rewards.map((r) => JSON.stringify(`${r.multiplier}${r.unit === "%" ? "%" : "x"} ${r.categories.join("/")}`)).join(", ")}],${rewards}
    // Auto-imported from ${p.source_lead_url} — verify before relying on: ${p.flags.join(", ") || "clean"}
  },`
}

/** Append rendered card entries before the closing bracket of creditCardBonuses.ts. */
export function appendCardEntries(entries: string[]): void {
  if (entries.length === 0) return
  const src = readFileSync(CATALOG_PATH, "utf8")
  const lastClose = src.lastIndexOf("]")
  if (lastClose < 0) throw new Error("couldn't find catalog closing bracket")
  const before = src.slice(0, lastClose)
  const after = src.slice(lastClose)
  const block =
    "\n\n  // ─── AUTO-IMPORTED — discover-cards pipeline ──────────────────\n  // These entries came from the discover-cards scraper (approved in /admin/review).\n  // Fields are conservative (null/defaults where the regex couldn't extract a\n  // value). Review and calibrate before treating as trusted data.\n" +
    entries.join("\n")
  writeFileSync(CATALOG_PATH, before + block + "\n" + after)
}
