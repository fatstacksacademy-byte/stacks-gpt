import type { MetadataRoute } from "next"

/**
 * Web app manifest — drives the "Add to Home Screen" install flow on
 * mobile + desktop browsers. Next.js serves this at /manifest.webmanifest.
 *
 * brand colors:
 *   primary green #0d7c5f — matches the existing Stacks OS UI
 *   background #fafafa — the off-white the hub uses
 *
 * display: "standalone" makes the installed app open without browser chrome.
 * scope + start_url anchor the installed app to the Stacks OS hub so users
 * land in their dashboard instead of the marketing homepage.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stacks OS — Fat Stacks Academy",
    short_name: "Stacks OS",
    description:
      "Track bank bonuses, sequence credit card sign-ups, and earn thousands in rewards. Personal bonus tracking dashboard from Fat Stacks Academy.",
    start_url: "/stacksos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#0d7c5f",
    categories: ["finance", "productivity", "lifestyle"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
