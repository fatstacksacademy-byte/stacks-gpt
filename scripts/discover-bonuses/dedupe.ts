import { createHash } from "node:crypto"
import type { Lead, RawItem } from "./types"

/**
 * Normalize a bank name for matching: lowercase, drop corporate suffixes,
 * drop punctuation, collapse whitespace.
 */
export function normalizeBankName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/\b(credit\s+union|federal\s+credit\s+union|fcu|bank|bancorp|bancshares|nat(?:ional)?|n\.a\.|&amp;|&|inc\.?|corporation|corp\.?|company|co\.?)\b/gi, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Normalize a product name — similar, plus remove dollar-amount fragments. */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\$[\d,]+/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Try to pull bank/product/amount hints out of the raw item's title. */
export function hintFromTitle(title: string): {
  bonus_amount: number | null
  bank: string | null
  product: string | null
} {
  const amountMatch = title.match(/\$(\d{1,3}(?:,\d{3})*|\d+)(?:,\d{3})*\s*(?:[kK])?/)
  let bonus_amount: number | null = null
  if (amountMatch) {
    const raw = amountMatch[1].replace(/,/g, "")
    let n = Number(raw)
    if (/k$/i.test(amountMatch[0])) n *= 1000
    if (Number.isFinite(n)) bonus_amount = n
  }

  // Crude: take 1st capitalized multi-word phrase as "bank"
  const bankMatch = title.match(/\b([A-Z][A-Za-z&]+(?:\s+[A-Z][A-Za-z&]+){0,3})\b/)
  const bank = bankMatch?.[1] ?? null

  // Product hint: "checking", "savings", "Sapphire Preferred", etc.
  const prodMatch = title.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+\s+(?:Checking|Savings|Card|Preferred|Reserve))\b/)
  const product = prodMatch?.[1] ?? null

  return { bonus_amount, bank, product }
}

export function leadKey(bank: string, product: string, amount: number | null): string {
  const bucket =
    amount === null ? "x" : String(Math.round(amount / 25) * 25) // bucket to nearest $25
  const raw = [normalizeBankName(bank), normalizeProductName(product), bucket].join("|")
  return createHash("sha1").update(raw).digest("hex").slice(0, 12)
}

export function dedupe(leads: Lead[]): Lead[] {
  const byKey = new Map<string, Lead>()
  for (const l of leads) {
    const existing = byKey.get(l.id)
    if (!existing) {
      byKey.set(l.id, l)
      continue
    }
    // Merge: union source_urls, prefer earliest discovered_at, prefer enriched record
    existing.source_urls = Array.from(
      new Set([...existing.source_urls, ...l.source_urls]),
    )
    if (new Date(l.discovered_at) < new Date(existing.discovered_at)) {
      existing.discovered_at = l.discovered_at
    }
    // If l has enrichment and existing doesn't, copy it
    if (!existing.enrichment.fetched_at && l.enrichment.fetched_at) {
      existing.enrichment = l.enrichment
      existing.canonical_url = l.canonical_url
    }
    existing.flags = Array.from(new Set([...existing.flags, ...l.flags]))
    existing.outbound_candidates = Array.from(
      new Set([...(existing.outbound_candidates ?? []), ...(l.outbound_candidates ?? [])]),
    )
  }
  return Array.from(byKey.values())
}

export function rawToLead(
  item: RawItem,
  classification: Lead["classification"],
  confidence: number,
): Lead {
  const h = hintFromTitle(item.title)
  const bank = h.bank ?? "unknown"
  const product = h.product ?? item.title.slice(0, 60)
  const amount = h.bonus_amount
  return {
    id: leadKey(bank, product, amount),
    bank,
    product,
    bonus_amount: amount,
    classification,
    confidence,
    discovered_at: new Date().toISOString(),
    source_urls: [item.source_url],
    canonical_url: null,
    enrichment: {
      fetched_at: null,
      deposit_requirement: null,
      direct_deposit_required: null,
      deposit_window_days: null,
      expiration: null,
      states: [],
      terms_url: null,
      monthly_fee: null,
    },
    flags: [],
    outbound_candidates: item.outbound_urls ?? [],
    status: "new",
    first_seen_via: item.source_kind,
  }
}
