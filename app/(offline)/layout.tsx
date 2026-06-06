import type { Metadata, Viewport } from "next"
import "../globals.css"

// Standalone layout for the offline page so it can render at build time
// WITHOUT pulling in the root layout's Supabase call.  Used by the service
// worker as the fallback when network is unavailable.
//
// Kept intentionally minimal: no providers, no analytics, no fonts beyond
// system defaults — the page must work without any runtime dependencies.

export const metadata: Metadata = {
  title: "You're offline — Stacks OS",
}

export const viewport: Viewport = {
  themeColor: "#0d7c5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fafafa" }}>{children}</body>
    </html>
  )
}
