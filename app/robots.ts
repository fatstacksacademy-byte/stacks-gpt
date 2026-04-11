import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/roadmap/", "/onboarding", "/reset-password"],
      },
    ],
    sitemap: "https://fatstacksacademy.com/sitemap.xml",
  }
}
