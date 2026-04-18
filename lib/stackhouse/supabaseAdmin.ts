import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client. Bypasses RLS, so ONLY import this from
 * server-side route handlers that have already authenticated the user via
 * the regular server client (lib/supabase/server.ts).
 *
 * Used for:
 *   - Inserting into stackhouse_xp_events (client RLS denies writes)
 *   - Inserting into stackhouse_street_wins (same)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY env var. If absent, throws on first use
 * so the failure is loud and fast instead of silently denying XP.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set")
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not set. Required for Stackhouse XP-event writes. Add it to .env.local and Vercel env.",
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
