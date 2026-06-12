/* eslint-disable no-console */
/**
 * Annotate cards with credit_score_required where we have high
 * confidence from the existing catalog data alone — no page fetches
 * needed.
 *
 * Rules (intentionally conservative):
 *   annual_fee >= 395 OR cpp_value >= 0.02       → "excellent" (premium)
 *   id contains "secured" or "rebuild"           → "poor"
 *   issuer == "navy federal" + nrewards card     → "good"
 *   id contains "student" or card_name "Student" → "fair"
 *
 * Everything else stays unannotated. Manual review fills the middle.
 *
 * Dry-run by default. --apply to write to creditCardBonuses.ts.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { creditCardBonuses, type CreditCardBonus } from "../../lib/data/creditCardBonuses"

const APPLY = process.argv.includes("--apply")
const CATALOG_PATH = join(process.cwd(), "lib", "data", "creditCardBonuses.ts")

type Tier = NonNullable<CreditCardBonus["credit_score_required"]>

function inferTier(card: CreditCardBonus): Tier | null {
  if (card.credit_score_required) return null
  const idLower = card.id.toLowerCase()
  const nameLower = card.card_name.toLowerCase()
  // Conservative — only the categories where the catalog data alone
  // gives a confident signal. Middle-of-the-road cards stay unannotated
  // until a human reviewer (or a future page-fact extractor) fills them.
  if (/secured|rebuild/.test(idLower) || /secured|rebuild/.test(nameLower)) return "poor"
  if (/student/.test(idLower) || /student/.test(nameLower)) return "fair"
  // Premium-only: $395+ annual fee strongly correlates with "excellent
  // credit required" across every major issuer. Below that line is
  // genuinely a mix of "good" and "excellent" — don't guess.
  if (card.annual_fee >= 395) return "excellent"
  return null
}

function main() {
  const targets: Array<{ card: CreditCardBonus; tier: Tier }> = []
  for (const c of creditCardBonuses as CreditCardBonus[]) {
    if (c.expired) continue
    const tier = inferTier(c)
    if (tier) targets.push({ card: c, tier })
  }
  console.log(`Inferred credit_score_required for ${targets.length} cards (apply=${APPLY}).`)
  const byTier: Record<Tier, number> = { excellent: 0, good: 0, fair: 0, poor: 0 }
  for (const t of targets) byTier[t.tier]++
  console.log(`  excellent=${byTier.excellent} good=${byTier.good} fair=${byTier.fair} poor=${byTier.poor}`)

  if (!APPLY) {
    for (const t of targets.slice(0, 12)) {
      console.log(`  [${t.tier}] ${t.card.card_name}`)
    }
    console.log(`Re-run with --apply to patch the catalog.`)
    return
  }

  let src = readFileSync(CATALOG_PATH, "utf8")
  let patched = 0
  for (const t of targets) {
    const idPattern = `id: "${t.card.id}",`
    const idIdx = src.indexOf(idPattern)
    if (idIdx < 0) continue
    const entryEnd = src.indexOf("\n  },", idIdx)
    if (entryEnd < 0) continue
    const entryBlock = src.slice(idIdx, entryEnd)
    if (/credit_score_required\s*:/.test(entryBlock)) continue
    const insertion = `\n    credit_score_required: "${t.tier}",`
    src = src.slice(0, entryEnd) + insertion + src.slice(entryEnd)
    patched++
  }
  writeFileSync(CATALOG_PATH, src)
  console.log(`Patched ${patched} catalog entries with credit_score_required.`)
}

main()
