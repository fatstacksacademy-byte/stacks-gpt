"use client"

// Catches errors thrown in the root layout itself (before the regular
// error.tsx boundary mounts). Has to render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#fafafa", padding: 20,
        }}>
          <div style={{
            maxWidth: 480, width: "100%", background: "#fff", border: "1px solid #e8e8e8",
            borderRadius: 14, padding: 28,
          }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>
              Something went wrong.
            </h1>
            <p style={{ fontSize: 14, color: "#555", margin: 0, lineHeight: 1.5 }}>
              Try reloading. If it persists, email{" "}
              <a href="mailto:fatstacksacademy@gmail.com" style={{ color: "#0d7c5f", fontWeight: 600 }}>
                fatstacksacademy@gmail.com
              </a>.
            </p>
            {error.digest && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 14, fontFamily: "ui-monospace, monospace" }}>
                Reference: {error.digest}
              </div>
            )}
            <button
              onClick={reset}
              style={{
                marginTop: 18, fontSize: 14, fontWeight: 700, color: "#fff",
                background: "#0d7c5f", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
