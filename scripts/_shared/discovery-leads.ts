/**
 * Durable discovery-lead persistence (Supabase `discovery_leads` table).
 *
 * The discover pipeline used to write leads to a local, gitignored
 * review-queue/leads.json — which meant scheduled (CI) discovery never
 * actually accumulated anything and the admin review UI only worked on one
 * machine. This module is the cross-machine replacement: discover-bonuses
 * and discover-cards upsert their leads here, and /admin/review reads them.
 *
 * Supabase is the source of truth for human-set `status`. Because a CI
 * runner starts with an empty local file, a naive upsert would reset every
 * approved/rejected lead back to "new". So upsert reads the existing status
 * straight from the table and preserves it — the local file never gets a
 * vote on status anymore.
 *
 * Degrades gracefully: with no Supabase env (local dev without keys) or
 * before migration 036 is applied, it logs a warning and no-ops instead of
 * crashing the discover run.
 */
/* eslint-disable no-console */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type DiscoveryLeadKind = "bonus" | "card"

export type DiscoveryLeadInput = {
  /** Dedupe key within a kind (bonus: leadKey hash; card: sha1 of normalized name). */
  lead_key: string
  name: string
  institution?: string | null
  bonus_amount?: number | null
  classification?: string | null
  confidence?: number | null
  source_url?: string | null
  canonical_url?: string | null
  flags?: string[]
  /** Full typed Lead/Proposal object, stored verbatim for the review UI + promote step. */
  payload: unknown
}

export type UpsertResult = { persisted: number; skipped: boolean; reason?: string }

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!_client) _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

// Status values that originate from a human (or the promote step) and must
// survive a re-discovery. Anything else (effectively just "new") is safe to
// overwrite with a fresh "new" on each run.
const HUMAN_STATUSES = new Set(["approved", "rejected", "snoozed", "applied", "dismissed"])

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === "42P01") return true
  const m = (err.message ?? "").toLowerCase()
  return m.includes("does not exist") || m.includes("could not find the table")
}

/**
 * Upsert a batch of leads of one kind, preserving any human-set status that
 * already exists in the table. Returns how many rows were written.
 */
export async function upsertDiscoveryLeads(
  kind: DiscoveryLeadKind,
  rows: DiscoveryLeadInput[],
): Promise<UpsertResult> {
  if (rows.length === 0) return { persisted: 0, skipped: false }

  const client = getClient()
  if (!client) {
    console.warn(
      "[discovery-leads] Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — leads NOT persisted.",
    )
    return { persisted: 0, skipped: true, reason: "no-env" }
  }

  // Pull existing status for this kind so we don't clobber human decisions.
  const { data: existing, error: selErr } = await client
    .from("discovery_leads")
    .select("lead_key,status,decided_by,decided_at,decision_notes,applied_at")
    .eq("kind", kind)

  if (selErr) {
    if (isMissingTable(selErr)) {
      console.warn(
        "[discovery-leads] table discovery_leads not found — apply migrations/036_discovery_leads.sql in the Supabase SQL editor. Leads NOT persisted.",
      )
      return { persisted: 0, skipped: true, reason: "no-table" }
    }
    console.error("[discovery-leads] select existing failed:", selErr.message)
    return { persisted: 0, skipped: true, reason: selErr.message }
  }

  type Prior = {
    status: string
    decided_by: string | null
    decided_at: string | null
    decision_notes: string | null
    applied_at: string | null
  }
  const priorByKey = new Map<string, Prior>()
  for (const r of existing ?? []) priorByKey.set((r as { lead_key: string }).lead_key, r as unknown as Prior)

  const nowIso = new Date().toISOString()
  const upsertRows = rows.map((r) => {
    const prior = priorByKey.get(r.lead_key)
    const keep = prior && HUMAN_STATUSES.has(prior.status)
    return {
      kind,
      lead_key: r.lead_key,
      name: r.name,
      institution: r.institution ?? null,
      bonus_amount: r.bonus_amount ?? null,
      classification: r.classification ?? null,
      confidence: r.confidence ?? null,
      source_url: r.source_url ?? null,
      canonical_url: r.canonical_url ?? null,
      flags: r.flags ?? [],
      payload: r.payload,
      status: keep ? prior!.status : "new",
      decided_by: keep ? prior!.decided_by : null,
      decided_at: keep ? prior!.decided_at : null,
      decision_notes: keep ? prior!.decision_notes : null,
      applied_at: keep ? prior!.applied_at : null,
      updated_at: nowIso,
    }
  })

  // Chunk to keep payloads well under PostgREST limits on large runs.
  let persisted = 0
  const CHUNK = 200
  for (let i = 0; i < upsertRows.length; i += CHUNK) {
    const chunk = upsertRows.slice(i, i + CHUNK)
    const { error } = await client
      .from("discovery_leads")
      .upsert(chunk, { onConflict: "kind,lead_key" })
    if (error) {
      if (isMissingTable(error)) {
        console.warn(
          "[discovery-leads] table discovery_leads not found — apply migrations/036_discovery_leads.sql. Leads NOT persisted.",
        )
        return { persisted, skipped: true, reason: "no-table" }
      }
      console.error("[discovery-leads] upsert failed:", error.message)
      return { persisted, skipped: true, reason: error.message }
    }
    persisted += chunk.length
  }

  return { persisted, skipped: false }
}

export type DiscoveryLeadRow = {
  id: string
  lead_key: string
  kind: DiscoveryLeadKind
  name: string
  institution: string | null
  bonus_amount: number | null
  classification: string | null
  confidence: number | null
  source_url: string | null
  canonical_url: string | null
  flags: string[]
  payload: unknown
  status: string
  decided_by: string | null
  decided_at: string | null
  decision_notes: string | null
  applied_at: string | null
  discovered_at: string
}

/** Approved-but-not-yet-applied leads of one kind — what the promote step consumes. */
export async function loadApprovedLeads(kind: DiscoveryLeadKind): Promise<DiscoveryLeadRow[]> {
  const client = getClient()
  if (!client) {
    console.warn("[discovery-leads] Supabase env not set — no approved leads loaded.")
    return []
  }
  const { data, error } = await client
    .from("discovery_leads")
    .select("*")
    .eq("kind", kind)
    .eq("status", "approved")
    .is("applied_at", null)
    .order("discovered_at", { ascending: true })
  if (error) {
    if (isMissingTable(error)) {
      console.warn("[discovery-leads] table not found — apply migrations/036_discovery_leads.sql.")
      return []
    }
    console.error("[discovery-leads] loadApprovedLeads failed:", error.message)
    return []
  }
  return (data ?? []) as DiscoveryLeadRow[]
}

/** Unreviewed leads of one kind, cleanest-first — what the pre-triage step scans. */
export async function loadPendingLeads(kind: DiscoveryLeadKind): Promise<DiscoveryLeadRow[]> {
  const client = getClient()
  if (!client) return []
  const { data, error } = await client
    .from("discovery_leads")
    .select("*")
    .eq("kind", kind)
    .eq("status", "new")
    .order("confidence", { ascending: false, nullsFirst: false })
    .order("discovered_at", { ascending: false })
  if (error) {
    if (!isMissingTable(error)) console.error("[discovery-leads] loadPendingLeads failed:", error.message)
    return []
  }
  return (data ?? []) as DiscoveryLeadRow[]
}

/** Record the promote step's disposition of a lead back onto its row. */
export async function stampLeadDisposition(
  kind: DiscoveryLeadKind,
  leadKey: string,
  disp: {
    status: "applied" | "dismissed" | "snoozed"
    decided_by?: string
    decision_notes?: string | null
  },
): Promise<void> {
  const client = getClient()
  if (!client) return
  const nowIso = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: disp.status,
    decided_by: disp.decided_by ?? "promote-approved-leads",
    decided_at: nowIso,
    decision_notes: disp.decision_notes ?? null,
    updated_at: nowIso,
  }
  if (disp.status === "applied") patch.applied_at = nowIso
  const { error } = await client
    .from("discovery_leads")
    .update(patch)
    .eq("kind", kind)
    .eq("lead_key", leadKey)
  if (error) console.error(`[discovery-leads] stamp ${leadKey} failed:`, error.message)
}
