import "server-only"
import { createHash } from "node:crypto"
import { supabaseAdmin } from "./supabase/admin"

export type ClickInfo = {
  bonusId: string
  servedUrl: string
  linkLabel?: string
  src?: string
  referer?: string
  userAgent?: string
  ip?: string
}

/**
 * Records one affiliate click into the link_clicks registry. Best-effort:
 * swallows all errors and no-ops if the table/env isn't present, so it can
 * never delay or break the /go redirect. Call it inside next/server `after()`.
 */
export async function logClick(info: ClickInfo): Promise<void> {
  const admin = supabaseAdmin()
  if (!admin) return
  const ip_hash = info.ip
    ? createHash("sha256").update(info.ip + (process.env.CLICK_IP_SALT ?? "stacks")).digest("hex").slice(0, 32)
    : null
  try {
    // Untyped client (no generated Database types) — cast so .insert() type-checks.
    await (admin as unknown as { from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<unknown> } })
      .from("link_clicks")
      .insert({
      bonus_id: info.bonusId,
      served_url: info.servedUrl,
      link_label: info.linkLabel ?? null,
      src: info.src ?? null,
      referer: info.referer ?? null,
      user_agent: info.userAgent ?? null,
      ip_hash,
    })
  } catch {
    // best-effort; never surface click-logging failures to the redirect
  }
}
