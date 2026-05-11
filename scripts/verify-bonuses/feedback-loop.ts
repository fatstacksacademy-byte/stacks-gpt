/**
 * Feedback loop: pull admin decisions and URL overrides from Supabase before
 * each verify run, so the pipeline can:
 *
 *   - Substitute manually-found URLs for bonuses where the catalog URL is
 *     wrong (bonus_url_overrides table)
 *   - Suppress proposed edits that the admin already dismissed, when the
 *     underlying page snippet hasn't changed (verification_decisions table)
 *   - Suppress proposed edits that match a prior 'approved' verdict — the
 *     change has been acknowledged; no need to re-flag every run
 *
 * If Supabase env vars aren't set, every function is a no-op so the pipeline
 * still runs (just without feedback-loop benefits).
 *
 * Snippet fingerprint matches the algorithm in app/admin/triage/page.tsx so a
 * dismissal recorded from the UI lines up with what we compute server-side.
 */
import { createClient } from "@supabase/supabase-js"

export type Decision = {
  bonus_id: string
  field_path: string
  verdict: "approved" | "dismissed" | "snoozed"
  from_value: unknown
  to_value: unknown
  snippet_fingerprint: string | null
}

export type UrlOverride = {
  bonus_id: string
  override_url: string
  previous_url: string | null
}

export type FeedbackState = {
  overrides: Map<string, UrlOverride>
  // Map<"bonus_id|field_path", Decision[]> — multiple verdicts possible per pair
  decisions: Map<string, Decision[]>
}

export const EMPTY_STATE: FeedbackState = {
  overrides: new Map(),
  decisions: new Map(),
}

export async function loadFeedbackState(): Promise<FeedbackState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.log("[feedback] Supabase env not set — skipping decisions/overrides")
    return EMPTY_STATE
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const [{ data: overrideRows, error: oErr }, { data: decisionRows, error: dErr }] = await Promise.all([
    supabase.from("bonus_url_overrides").select("bonus_id, override_url, previous_url").eq("is_active", true),
    supabase.from("verification_decisions").select("bonus_id, field_path, verdict, from_value, to_value, snippet_fingerprint"),
  ])
  if (oErr) console.warn("[feedback] overrides query failed:", oErr.message)
  if (dErr) console.warn("[feedback] decisions query failed:", dErr.message)

  const overrides = new Map<string, UrlOverride>()
  for (const r of overrideRows ?? []) overrides.set(r.bonus_id, r as UrlOverride)

  const decisions = new Map<string, Decision[]>()
  for (const d of decisionRows ?? []) {
    const k = `${d.bonus_id}|${d.field_path}`
    const arr = decisions.get(k) ?? []
    arr.push(d as Decision)
    decisions.set(k, arr)
  }

  console.log(`[feedback] loaded ${overrides.size} URL override(s), ${decisionRows?.length ?? 0} decision(s)`)
  return { overrides, decisions }
}

/** Returns the URL the verify pipeline should fetch for this bonus. */
export function resolveUrl(state: FeedbackState, bonusId: string, defaultUrl: string): string {
  const o = state.overrides.get(bonusId)
  if (!o) return defaultUrl
  console.log(`[feedback] override for ${bonusId}: ${defaultUrl} → ${o.override_url}`)
  return o.override_url
}

/**
 * Should this proposed edit be suppressed based on prior admin decisions?
 *
 * Rules:
 *   - If a prior 'dismissed' verdict exists AND the snippet fingerprint
 *     matches → suppress (page hasn't changed, regex still wrong)
 *   - If a prior 'approved' verdict exists AND the to_value matches → suppress
 *     (admin already accepted this change; until they apply the patch the
 *     stored value lags, but we shouldn't keep flagging the same gap)
 *   - Otherwise → keep the edit (snoozed, or new fingerprint, or stale value)
 */
export function shouldSuppressEdit(
  state: FeedbackState,
  bonusId: string,
  fieldPath: string,
  edit: { from: unknown; to: unknown },
  currentSnippet: string | null,
): { suppress: boolean; reason?: string } {
  const decisions = state.decisions.get(`${bonusId}|${fieldPath}`)
  if (!decisions || decisions.length === 0) return { suppress: false }

  const fp = fingerprint(currentSnippet)
  for (const d of decisions) {
    if (d.verdict === "dismissed") {
      if (d.snippet_fingerprint && fp && d.snippet_fingerprint === fp) {
        return { suppress: true, reason: `prior dismissal (snippet unchanged)` }
      }
      // No fingerprint stored or page changed — surface the edit again so
      // the admin can re-evaluate.
      continue
    }
    if (d.verdict === "approved") {
      // If the page is still proposing the same target value, treat as
      // already-acknowledged and don't keep nagging.
      if (deepEqual(d.to_value, edit.to)) {
        return { suppress: true, reason: `prior approval (to_value unchanged)` }
      }
    }
    // 'snoozed' explicitly re-surfaces.
  }
  return { suppress: false }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === "number" && typeof b === "number") return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Same algorithm as app/admin/triage/page.tsx → fingerprint(). Lowercase +
 * collapse whitespace, then a 64-bit polynomial hash truncated to 16 hex chars.
 */
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
