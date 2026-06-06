"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error:", error)
  }, [error])

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={badge}>Something broke</div>
        <h1 style={title}>This page hit an error.</h1>
        <p style={sub}>
          We logged it. Try the button below — if it keeps happening, email{" "}
          <a href="mailto:fatstacksacademy@gmail.com" style={link}>fatstacksacademy@gmail.com</a>{" "}
          and we&apos;ll dig in.
        </p>
        {error.digest && (
          <div style={digest}>Reference: {error.digest}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={reset} style={primaryBtn}>Try again</button>
          <a href="/stacksos" style={secondaryBtn}>Back to dashboard</a>
        </div>
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
  borderRadius: 14, padding: "28px 28px",
}
const badge: React.CSSProperties = {
  display: "inline-block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "#b91c1c", background: "#fee2e2", padding: "3px 9px",
  borderRadius: 99, marginBottom: 14,
}
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }
const sub: React.CSSProperties = { fontSize: 14, color: "#555", margin: 0, lineHeight: 1.5 }
const digest: React.CSSProperties = { fontSize: 11, color: "#999", marginTop: 14, fontFamily: "ui-monospace, monospace" }
const link: React.CSSProperties = { color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }
const primaryBtn: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "#fff", background: "#0d7c5f", border: "none",
  borderRadius: 8, padding: "10px 18px", cursor: "pointer",
}
const secondaryBtn: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: "#333", background: "#fff", border: "1px solid #e0e0e0",
  borderRadius: 8, padding: "10px 18px", cursor: "pointer", textDecoration: "none",
}
