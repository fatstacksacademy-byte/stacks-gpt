import { ImageResponse } from "next/og"

// iOS home-screen icon (apple-touch-icon).  iOS requires 180x180 and
// applies its own corner-radius mask, so we leave the background fully
// opaque green and let iOS round the corners.

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
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
          fontSize: 112,
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
