export default function NotFound() {
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={badge}>404</div>
        <h1 style={title}>Page not found.</h1>
        <p style={sub}>
          The page you&apos;re looking for moved or never existed.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <a href="/stacksos" style={primaryBtn}>Back to dashboard</a>
          <a href="/" style={secondaryBtn}>Home</a>
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
  borderRadius: 14, padding: "28px 28px", textAlign: "center",
}
const badge: React.CSSProperties = {
  display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
  color: "#525252", background: "#f3f4f6", padding: "3px 9px", borderRadius: 99, marginBottom: 14,
}
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }
const sub: React.CSSProperties = { fontSize: 14, color: "#555", margin: 0, lineHeight: 1.5 }
const primaryBtn: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: "#fff", background: "#0d7c5f", border: "none",
  borderRadius: 8, padding: "10px 18px", cursor: "pointer", textDecoration: "none",
}
const secondaryBtn: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: "#333", background: "#fff", border: "1px solid #e0e0e0",
  borderRadius: 8, padding: "10px 18px", cursor: "pointer", textDecoration: "none",
}
