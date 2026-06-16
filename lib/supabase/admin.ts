import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client for server-side writes that must bypass RLS
 * (e.g. anonymous affiliate-click logging). NEVER import into a client component.
 * Returns null if the env isn't configured, so callers can no-op gracefully.
 */
let _admin: ReturnType<typeof createClient> | null = null
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  if (!_admin) {
    _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return _admin
}
