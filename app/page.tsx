import type { Metadata } from "next"
import HomeClient from "./HomeClient"

const BASE = "https://fatstacksacademy.com"
const OG_TITLE = "Bank bonuses, credit card rewards, and the strategy behind it all."

export const metadata: Metadata = {
  title: "Fat Stacks Academy — Bank Bonuses, Credit Card Strategy & Stacks OS",
  description:
    "Earn thousands in bank bonuses and credit card rewards. Free guides, bonus rankings, and Stacks OS — your personal bonus tracking dashboard.",
  alternates: { canonical: BASE },
  openGraph: {
    type: "website",
    siteName: "Fat Stacks Academy",
    locale: "en_US",
    url: BASE,
    title: "Fat Stacks Academy — Bank Bonuses & Credit Card Strategy",
    description:
      "Earn thousands in bank bonuses and credit card rewards. Free guides, bonus rankings, and Stacks OS — your personal bonus tracking dashboard.",
    images: [
      {
        url: `${BASE}/api/og?title=${encodeURIComponent(OG_TITLE)}&kind=guide`,
        width: 1200,
        height: 630,
        alt: "Fat Stacks Academy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fat Stacks Academy — Bank Bonuses & Credit Card Strategy",
    description:
      "Earn thousands in bank bonuses and credit card rewards. Free guides, bonus rankings, and Stacks OS.",
    images: [`${BASE}/api/og?title=${encodeURIComponent(OG_TITLE)}&kind=guide`],
  },
}

export default function HomePage() {
  return <HomeClient />
}
