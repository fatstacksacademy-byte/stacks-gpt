/* eslint-disable no-console */
/**
 * Cross-reference discovered leads against the live blog data
 * (bonuses.ts + savingsBonuses.ts + creditCardBonuses.ts) and print
 * which leads are already published vs net-new.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { bonuses } from "../../lib/data/bonuses"
import { savingsBonuses } from "../../lib/data/savingsBonuses"
import { creditCardBonuses } from "../../lib/data/creditCardBonuses"
import { normalizeBankName, normalizeProductName } from "./dedupe"
import type { Lead } from "./types"

type Existing = {
  kind: "checking" | "savings" | "credit_card"
  id: string
  bank: string
  product: string
  amount: number
  normKey: string
}

function buildIndex(): Existing[] {
  const out: Existing[] = []
  for (const b of bonuses as Array<Record<string, unknown>>) {
    if (b.expired) continue
    const bank = String(b.bank_name ?? "")
    const product = String(b.bank_name ?? "") + " checking"
    const amount = Number(b.bonus_amount ?? 0)
    out.push({
      kind: "checking",
      id: String(b.id),
      bank,
      product,
      amount,
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
      normKey: normalizeBankName(bank) + " " + normalizeProductName(product),
    })
  }
  return out
}

function matchLead(lead: Lead, index: Existing[]): Existing[] {
  const leadBankNorm = normalizeBankName(lead.bank)
  const leadProductNorm = normalizeProductName(lead.product)
  if (!leadBankNorm || leadBankNorm === "unknown") return []

  const hits: { e: Existing; score: number }[] = []
  for (const e of index) {
    // Skip cross-kind mismatches (except "other" leads, which get compared everywhere)
    if (lead.classification === "bank_account_bonus" && e.kind === "credit_card") continue
    if (lead.classification === "credit_card_bonus" && e.kind !== "credit_card") continue

    let score = 0
    // Bank match
    if (e.normKey.includes(leadBankNorm) || leadBankNorm.includes(e.normKey.split(" ")[0] ?? "")) {
      score += 3
    }
    // Product overlap (for credit cards mainly)
    if (e.kind === "credit_card") {
      for (const tok of leadProductNorm.split(" ")) {
        if (tok.length >= 4 && e.normKey.includes(tok)) score += 2
      }
    }
    // Amount match (within 20%)
    if (lead.bonus_amount && e.amount > 0) {
      const ratio = Math.abs(lead.bonus_amount - e.amount) / Math.max(lead.bonus_amount, e.amount)
      if (ratio < 0.2) score += 2
    }
    if (score >= 3) hits.push({ e, score })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, 3).map((h) => h.e)
}

function main() {
  const leadsPath = join(process.cwd(), "review-queue", "leads.json")
  const leads = JSON.parse(readFileSync(leadsPath, "utf8")) as Lead[]
  const index = buildIndex()

  console.log(
    `Comparing ${leads.length} discovered leads against ${index.length} published bonuses (non-expired):`,
  )
  console.log(
    `  checking=${index.filter((e) => e.kind === "checking").length} savings=${index.filter((e) => e.kind === "savings").length} credit_card=${index.filter((e) => e.kind === "credit_card").length}`,
  )
  console.log(``)

  let alreadyOnBlog = 0
  let netNew = 0
  const netNewList: Lead[] = []
  const overlaps: { lead: Lead; matches: Existing[] }[] = []

  for (const lead of leads) {
    const matches = matchLead(lead, index)
    if (matches.length > 0) {
      alreadyOnBlog++
      overlaps.push({ lead, matches })
    } else {
      netNew++
      netNewList.push(lead)
    }
  }

  console.log(`## Already on blog: ${alreadyOnBlog}`)
  for (const { lead, matches } of overlaps) {
    const amt = lead.bonus_amount !== null ? `$${lead.bonus_amount}` : "?"
    console.log(`  • "${lead.bank}" / ${lead.product} (${amt})`)
    for (const m of matches) {
      console.log(`      ↳ matches ${m.kind}: ${m.id}`)
    }
  }
  console.log(``)

  console.log(`## Net-new candidates: ${netNew}`)
  for (const lead of netNewList) {
    const amt = lead.bonus_amount !== null ? `$${lead.bonus_amount}` : "?"
    const cls = lead.classification.replace("_bonus", "")
    const canon = lead.canonical_url ? ` → ${lead.canonical_url}` : ""
    console.log(`  • [${cls}] "${lead.bank}" / ${lead.product} (${amt}, conf ${(lead.confidence * 100).toFixed(0)}%)${canon}`)
  }
}

main()
