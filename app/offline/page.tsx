// Cached at install time by /public/sw.js and shown when the installed PWA
// can't reach the network.  Kept intentionally minimal — no imports, no
// fetches, no client-side state.
export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#fafafa",
        color: "#111",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: "#0d7c5f",
          color: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 40,
          marginBottom: 20,
        }}
      >
        $
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
        You're offline
      </h1>
      <p style={{ fontSize: 14, color: "#666", margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
        Stacks OS needs an internet connection to load your bonus tracking data.
        Reconnect and try again.
      </p>
    </main>
  )
}
