import type { Metadata } from "next"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: {
    default: "Fat Stacks Academy Blog - Bank Bonus Strategy & Guides",
    template: "%s | Fat Stacks Academy",
  },
  description: "Original guides on bank bonuses, direct deposit, eligibility, taxes, and building a sustainable churning strategy.",
  metadataBase: new URL(BASE),
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    type: "website",
    siteName: "Fat Stacks Academy",
    locale: "en_US",
    url: `${BASE}/blog`,
    title: "Fat Stacks Academy Blog - Bank Bonus Strategy & Guides",
    description: "Original guides on bank bonuses, direct deposit, eligibility, taxes, and sustainable churning strategy.",
    images: [
      {
        url: `${BASE}/api/og?title=${encodeURIComponent("Bank Bonus Strategy & Guides")}&kind=guide`,
        width: 1200,
        height: 630,
        alt: "Fat Stacks Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fat Stacks Academy Blog - Bank Bonus Strategy & Guides",
    description: "Original guides for finding, completing, and tracking bank bonuses.",
    images: [`${BASE}/api/og?title=${encodeURIComponent("Bank Bonus Strategy & Guides")}&kind=guide`],
  },
  keywords: [
    "bank bonus", "bank account bonus", "checking bonus", "savings bonus",
    "bank sign up bonus", "credit card bonus", "bank promotions",
    "best bank bonuses", "bank bonus review", "checking account bonus 2026",
    "savings account bonus 2026", "high yield savings bonus",
    "direct deposit bonus", "bank bonus requirements",
  ],
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fafafa", minHeight: "100vh", fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {children}
    </div>
  )
}
