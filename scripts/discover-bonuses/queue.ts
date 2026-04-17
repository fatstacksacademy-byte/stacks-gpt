import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Lead } from "./types"

const QUEUE_DIR = join(process.cwd(), "review-queue")
const LEADS_FILE = join(QUEUE_DIR, "leads.json")
const DIGESTS_DIR = join(QUEUE_DIR, "digests")

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

export function loadLeads(): Lead[] {
  if (!existsSync(LEADS_FILE)) return []
  try {
    return JSON.parse(readFileSync(LEADS_FILE, "utf8")) as Lead[]
  } catch {
    return []
  }
}

/** Merge new leads into the existing queue, preserving any human-set statuses. */
export function upsertLeads(existing: Lead[], incoming: Lead[]): Lead[] {
  const byId = new Map<string, Lead>()
  for (const l of existing) byId.set(l.id, l)
  for (const l of incoming) {
    const prior = byId.get(l.id)
    if (!prior) {
      byId.set(l.id, l)
      continue
    }
    // Preserve human-set status + any human-edited fields
    const merged: Lead = {
      ...prior,
      source_urls: Array.from(new Set([...prior.source_urls, ...l.source_urls])),
      flags: Array.from(new Set([...prior.flags, ...l.flags])),
      // refresh enrichment if newly available
      enrichment: l.enrichment.fetched_at ? l.enrichment : prior.enrichment,
      canonical_url: l.canonical_url || prior.canonical_url,
      // Don't overwrite approved/rejected with "new"
      status: prior.status === "new" || prior.status === undefined ? l.status : prior.status,
      confidence: Math.max(prior.confidence, l.confidence),
    }
    byId.set(l.id, merged)
  }
  return Array.from(byId.values())
}

export function writeQueue(leads: Lead[]) {
  ensureDir(QUEUE_DIR)
  writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2))
}

export function writeDigest(newLeads: Lead[]): string {
  ensureDir(DIGESTS_DIR)
  const date = new Date().toISOString().slice(0, 10)
  const path = join(DIGESTS_DIR, `${date}.md`)

  const byClass = new Map<string, Lead[]>()
  for (const l of newLeads) {
    const arr = byClass.get(l.classification) ?? []
    arr.push(l)
    byClass.set(l.classification, arr)
  }

  const out: string[] = []
  out.push(`# Bonus Discovery Digest — ${date}`)
  out.push(``)
  out.push(`New leads this run: **${newLeads.length}**`)
  out.push(``)
  out.push(`## By classification`)
  for (const [cls, items] of byClass) {
    out.push(``)
    out.push(`### ${cls} (${items.length})`)
    out.push(``)
    for (const l of items) {
      const parts = [
        `- **${l.bank}** — ${l.product}`,
        l.bonus_amount !== null ? `$${l.bonus_amount}` : null,
        `confidence ${(l.confidence * 100).toFixed(0)}%`,
        l.canonical_url ? `[bank page](${l.canonical_url})` : null,
      ]
        .filter(Boolean)
        .join(" · ")
      out.push(parts)
      out.push(`  - sources: ${l.source_urls.map((u) => `<${u}>`).join(", ")}`)
      if (l.flags.length > 0) out.push(`  - flags: ${l.flags.join(", ")}`)
      if (l.enrichment.fetched_at) {
        out.push(
          `  - enrichment: fee=${l.enrichment.monthly_fee ?? "?"} dd=${l.enrichment.deposit_requirement ?? "?"} window=${l.enrichment.deposit_window_days ?? "?"} expires=${l.enrichment.expiration ?? "?"}`,
        )
      }
    }
  }
  writeFileSync(path, out.join("\n"))
  return path
}
