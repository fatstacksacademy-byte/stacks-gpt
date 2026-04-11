import type { Metadata } from "next"

const BASE = "https://fatstacksacademy.com"

export const metadata: Metadata = {
  title: {
    default: "Fat Stacks Academy - Bank Bonus Reviews & Credit Card Offers",
    template: "%s | Fat Stacks Academy",
  },
  description: "Expert reviews of the best bank account bonuses, credit card sign-up offers, and high-yield savings promotions. Requirements, eligibility, and strategy — updated daily.",
  metadataBase: new URL(BASE),
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    type: "website",
    siteName: "Fat Stacks Academy",
    locale: "en_US",
    url: `${BASE}/blog`,
    title: "Fat Stacks Academy - Bank Bonus Reviews & Credit Card Offers",
    description: "Expert reviews of the best bank account bonuses, credit card sign-up offers, and high-yield savings promotions. Updated daily.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fat Stacks Academy - Bank Bonus Reviews",
    description: "Expert reviews of the best bank account bonuses and savings promotions.",
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
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {children}
    </div>
  )
}
