import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/stacksos/", "/onboarding", "/reset-password", "/admin"],
      },
    ],
    sitemap: "https://fatstacksacademy.com/sitemap.xml",
  }
}
