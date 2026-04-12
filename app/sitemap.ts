import type { MetadataRoute } from "next"
import { blogPosts } from "../lib/data/blogPosts"

const BASE = "https://fatstacksacademy.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/blog/best-bank-account-bonuses-2026`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/blog/best-checking-bonuses-2026`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/blog/best-savings-bonuses-2026`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/blog/what-counts-as-direct-deposit`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/blog/bank-bonus-tax-guide-2026`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/blog/chexsystems-guide-bank-bonuses`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
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
