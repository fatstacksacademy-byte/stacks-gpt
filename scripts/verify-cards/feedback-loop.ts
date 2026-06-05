/**
 * Card feedback loop — mirror of scripts/verify-bonuses/feedback-loop.ts.
 *
 * Pulls admin decisions, URL overrides, and reject/modify lessons from
 * Supabase before each verify-cards run, so the pipeline can:
 *
 *   - Substitute the admin's manually-found offer URL for cards where
 *     the catalog offer_link is wrong (card_url_overrides table)
 *   - Suppress proposed edits the admin already approved or dismissed
 *     for an unchanged page snippet (card_verification_decisions)
 *   - Surface the admin's "what the verifier did wrong + how to find
 *     the right value" lesson to Claude during escalation
 *     (card_flag_issue_reports)
 *
 * No-op when Supabase env vars are missing — the verifier still runs,
 * just without feedback benefits.
 */
import { createClient } from "@supabase/supabase-js"

export type Decision = {
  card_id: string
  field_path: string
  verdict: "approved" | "dismissed" | "snoozed"
  from_value: unknown
  to_value: unknown
  snippet_fingerprint: string | null
}

export type UrlOverride = {
  card_id: string
  override_url: string
  previous_url: string | null
}

export type Hint = {
  card_id: string
  field_path: string
  issue_category: string
  issue_description: string
  suggested_fix: string
  corrected_value: unknown | null
  reported_at: string
}

export type FeedbackState = {
  overrides: Map<string, UrlOverride>
  decisions: Map<string, Decision[]>
  hints: Map<string, Hint[]>
}

export const EMPTY_STATE: FeedbackState = {
  overrides: new Map(),
  decisions: new Map(),
  hints: new Map(),
}

export async function loadFeedbackState(): Promise<FeedbackState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log("[feedback] Supabase env not set — skipping decisions/overrides/hints")
    return EMPTY_STATE
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const [
    { data: overrideRows, error: oErr },
    { data: decisionRows, error: dErr },
    { data: hintRows, error: hErr },
  ] = await Promise.all([
    supabase
      .from("card_url_overrides")
      .select("card_id, override_url, previous_url")
      .eq("is_active", true),
    supabase
      .from("card_verification_decisions")
      .select("card_id, field_path, verdict, from_value, to_value, snippet_fingerprint"),
    supabase
      .from("card_flag_issue_reports")
      .select("card_id, field_path, issue_category, issue_description, suggested_fix, corrected_value, reported_at")
      .eq("resolved", false)
      .order("reported_at", { ascending: false }),
  ])
  if (oErr) console.warn("[feedback] card overrides query failed:", oErr.message)
  if (dErr) console.warn("[feedback] card decisions query failed:", dErr.message)
  if (hErr) console.warn("[feedback] card hints query failed:", hErr.message)

  const overrides = new Map<string, UrlOverride>()
  for (const r of overrideRows ?? []) overrides.set(r.card_id, r as UrlOverride)

  const decisions = new Map<string, Decision[]>()
  for (const d of decisionRows ?? []) {
    const k = `${d.card_id}|${d.field_path}`
    const arr = decisions.get(k) ?? []
    arr.push(d as Decision)
    decisions.set(k, arr)
  }

  const hints = new Map<string, Hint[]>()
  for (const h of hintRows ?? []) {
    const k = `${h.card_id}|${h.field_path}`
    const arr = hints.get(k) ?? []
    arr.push(h as Hint)
    hints.set(k, arr)
  }

  console.log(
    `[feedback] loaded ${overrides.size} URL override(s), ${decisionRows?.length ?? 0} decision(s), ${hintRows?.length ?? 0} admin hint(s)`,
  )
  return { overrides, decisions, hints }
}

export function resolveUrl(state: FeedbackState, cardId: string, defaultUrl: string): string {
  const o = state.overrides.get(cardId)
  if (!o) return defaultUrl
  console.log(`[feedback] override for ${cardId}: ${defaultUrl} → ${o.override_url}`)
  return o.override_url
}

export function shouldSuppressEdit(
  state: FeedbackState,
  cardId: string,
  fieldPath: string,
  edit: { from: unknown; to: unknown },
  currentSnippet: string | null,
): { suppress: boolean; reason?: string } {
  const decisions = state.decisions.get(`${cardId}|${fieldPath}`)
  if (!decisions || decisions.length === 0) return { suppress: false }

  const fp = fingerprint(currentSnippet)
  for (const d of decisions) {
    if (d.verdict === "dismissed") {
      if (d.snippet_fingerprint && fp && d.snippet_fingerprint === fp) {
        return { suppress: true, reason: `prior dismissal (snippet unchanged)` }
      }
      continue
    }
    if (d.verdict === "approved") {
      if (deepEqual(d.to_value, edit.to)) {
        return { suppress: true, reason: `prior approval (to_value unchanged)` }
      }
    }
  }
  return { suppress: false }
}

export function getHint(state: FeedbackState, cardId: string, fieldPath: string): Hint | null {
  const arr = state.hints.get(`${cardId}|${fieldPath}`)
  if (!arr || arr.length === 0) return null
  return arr[0]
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === "number" && typeof b === "number") return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Same algorithm as the bonus feedback-loop + app/admin/triage UI. */
export function fingerprint(s: string | null | undefined): string | null {
  if (!s) return null
  const normalized = s.toLowerCase().replace(/\s+/g, " ").trim()
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).slice(0, 16)
}
