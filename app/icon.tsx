import { ImageResponse } from "next/og"

// Programmatic app icon. Next.js renders this to a 512x512 PNG at build
// time and serves it at /icon (and at various sizes via Next's icon
// pipeline).  Used by the web app manifest + browser favicon.
//
// Visual: brand-green square with rounded corners + bold "$" mark in
// off-white.  Keeps the icon recognizable at small sizes.

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d7c5f",
          color: "#fafafa",
          fontWeight: 900,
          fontSize: 320,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
          lineHeight: 1,
        }}
      >
        $
      </div>
    ),
    size,
  )
}
