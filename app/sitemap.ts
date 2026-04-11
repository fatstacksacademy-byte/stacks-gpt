import type { MetadataRoute } from "next"
import { blogPosts } from "../lib/data/blogPosts"

const BASE = "https://fatstacksacademy.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ]

  const blogPages: MetadataRoute.Sitemap = blogPosts.map(post => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...staticPages, ...blogPages]
}
