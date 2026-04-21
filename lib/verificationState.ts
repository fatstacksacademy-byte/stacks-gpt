import { createClient } from "./supabase/client"

export type VerificationConfidence = "high" | "medium" | "low"

export type VerificationState = {
  catalog_id: string
  catalog_kind: "card" | "checking" | "savings"
  verified_at: string
  verification_source: string
  confidence: VerificationConfidence
  mismatch_count: number
  page_signal: string | null
}

/**
 * Fetch the full catalog freshness map from Supabase. One round-trip pulls
 * every verified item regardless of kind — keyed by catalog_id for O(1)
 * lookups in UI render paths.
 *
 * Safe to call from logged-out contexts (RLS select policy is public).
 */
export async function getVerificationStateMap(): Promise<
  Map<string, VerificationState>
> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("catalog_verification_state")
    .select(
      "catalog_id, catalog_kind, verified_at, verification_source, confidence, mismatch_count, page_signal",
    )
  if (error) {
    console.error("[verificationState] fetch failed:", error.message)
    return new Map()
  }
  const map = new Map<string, VerificationState>()
  for (const row of (data ?? []) as VerificationState[]) {
    map.set(row.catalog_id, row)
  }
  return map
}

/**
 * Human-readable freshness string: "just now" / "4h ago" / "3d ago".
 * Tight output for badge UI — no "ago" suffix beyond the unit.
 */
export function formatFreshness(verifiedAt: string, now: number = Date.now()): string {
  const ms = now - new Date(verifiedAt).getTime()
  if (ms < 0) return "just now"
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/**
 * Stacks OS freshness tiers: combines confidence + recency into a single
 * badge tone so the UI doesn't have to juggle two dimensions.
 *
 *   fresh  — confidence high, verified within 7 days
 *   stale  — confidence high but >7 days, or medium regardless
 *   warn   — confidence low, or never verified
 */
export type FreshnessTier = "fresh" | "stale" | "warn"

export function freshnessTier(
  state: VerificationState | undefined,
  now: number = Date.now(),
): FreshnessTier {
  if (!state) return "warn"
  const ageDays = (now - new Date(state.verified_at).getTime()) / 86_400_000
  if (state.confidence === "low") return "warn"
  if (state.confidence === "high" && ageDays <= 7) return "fresh"
  return "stale"
}
