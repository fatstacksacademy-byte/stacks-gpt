import { lookupUserByToken, unsubscribeAllByToken } from "../../lib/email/preferences"

/**
 * Unsubscribe lands here from email footers + the List-Unsubscribe
 * header. We auto-process the token on GET — no login required —
 * because RFC 8058 one-click expects the URL itself to be the action.
 * The page then shows a confirmation.
 */

export const dynamic = "force-dynamic"

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let status: "missing" | "unknown" | "done" | "error" = "missing"

  if (token) {
    const prefs = await lookupUserByToken(token)
    if (!prefs) {
      status = "unknown"
    } else {
      const ok = await unsubscribeAllByToken(token)
      status = ok ? "done" : "error"
    }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={title}>
          {status === "done" && "You're unsubscribed."}
          {status === "missing" && "Missing token."}
          {status === "unknown" && "We couldn't find that token."}
          {status === "error" && "Something went wrong."}
        </h1>
        <p style={sub}>
          {status === "done" && "You won't get any more reminder or digest emails from Stacks OS. You can turn them back on in your profile."}
          {status === "missing" && "This page expects a ?token= query parameter from your email footer."}
          {status === "unknown" && "The link may have expired or been tampered with. Email fatstacksacademy@gmail.com if you need help."}
          {status === "error" && "Couldn't update your preferences. Email fatstacksacademy@gmail.com and we'll handle it."}
        </p>
        <a href="/stacksos" style={btn}>Open Stacks OS</a>
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
