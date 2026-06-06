import { createAdminClient } from "@/lib/stackhouse/supabaseAdmin"

/**
 * Newsletter unsubscribe handler. Flips contacts.newsletter_opted_in
 * to false for the token's owner. Mirrors the user-based /unsubscribe
 * page (for transactional reminders) but acts on contacts, not
 * email_preferences, so leads who never created an account can opt
 * out too.
 *
 * One-click per RFC 8058 — the URL itself is the action, no login.
 */

export const dynamic = "force-dynamic"

type UnsubChannel = "newsletter" | "product"

async function unsubscribeByToken(
  token: string,
  channel: UnsubChannel,
): Promise<{ ok: boolean; email?: string }> {
  const sb = createAdminClient()
  const { data: contact } = await sb
    .from("contacts")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle()
  if (!contact) return { ok: false }

  const col = channel === "product" ? "product_announcements_opted_in" : "newsletter_opted_in"
  const { error } = await sb
    .from("contacts")
    .update({ [col]: false, updated_at: new Date().toISOString() })
    .eq("id", contact.id)
  if (error) return { ok: false, email: contact.email }

  return { ok: true, email: contact.email }
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; channel?: string }>
}) {
  const { token, channel: channelRaw } = await searchParams
  const channel: UnsubChannel = channelRaw === "product" ? "product" : "newsletter"

  let status: "missing" | "unknown" | "preview" | "done" | "error" = "missing"
  let email: string | undefined

  if (token === "preview") {
    status = "preview"
  } else if (token) {
    const result = await unsubscribeByToken(token, channel)
    if (!result.ok && !result.email) status = "unknown"
    else if (!result.ok) { status = "error"; email = result.email }
    else { status = "done"; email = result.email }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={title}>
          {status === "done" && "You're unsubscribed"}
          {status === "preview" && "Preview link"}
          {status === "missing" && "Missing token"}
          {status === "unknown" && "Link not found"}
          {status === "error" && "Something went wrong"}
        </h1>
        <p style={sub}>
          {status === "done" && (
            <>
              We won&apos;t send any more {channel === "product" ? "product update" : "newsletter"} emails to <strong>{email}</strong>.
              You can re-subscribe anytime by signing up again on the bonus pages.
            </>
          )}
          {status === "preview" && "This is a test/preview link. No action taken."}
          {status === "missing" && "This page expects a ?token= query parameter from your email footer."}
          {status === "unknown" && "The link may have expired or been tampered with. Email fatstacksacademy@gmail.com if you need help."}
          {status === "error" && "Couldn't update your preferences. Email fatstacksacademy@gmail.com and we'll handle it."}
        </p>
        <a href="/bonuses" style={btn}>Browse current bonuses</a>
      </div>
    </div>
  )
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#fafafa", padding: 20, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}
const card: React.CSSProperties = {
  maxWidth: 480, width: "100%", background: "#fff", border: "1px solid #e8e8e8",
  borderRadius: 14, padding: "28px 28px", textAlign: "center",
}
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }
const sub: React.CSSProperties = { fontSize: 14, color: "#555", margin: "0 0 18px", lineHeight: 1.5 }
const btn: React.CSSProperties = {
  display: "inline-block", fontSize: 14, fontWeight: 700, color: "#fff",
  background: "#0d7c5f", border: "none", borderRadius: 8, padding: "10px 18px",
  textDecoration: "none",
}
