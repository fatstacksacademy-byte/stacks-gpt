import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ProfileProvider } from "./components/ProfileProvider"
import ToastHost from "./components/ToastHost"
import { createClient } from "../lib/supabase/server"
import { getProfileServer, DEFAULT_PROFILE } from "../lib/profileServer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Fat Stacks Academy — Bank Bonuses, Credit Card Strategy & Stacks OS",
  description: "Earn thousands in bank bonuses and credit card rewards. Free guides, bonus rankings, and Stacks OS — your personal bonus tracking dashboard.",
  metadataBase: new URL("https://fatstacksacademy.com"),
}

// Site-wide structured data. Organization enables the knowledge panel +
// publisher metadata on every indexed page; WebSite enables the sitelinks
// search box in Google SERPs.
const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://fatstacksacademy.com/#organization",
      name: "Fat Stacks Academy",
      url: "https://fatstacksacademy.com",
      logo: {
        "@type": "ImageObject",
        url: "https://fatstacksacademy.com/api/og?title=Fat%20Stacks%20Academy&kind=guide",
        width: 1200,
        height: 630,
      },
      sameAs: [
        "https://www.youtube.com/@nathanielbooth",
      ],
      founder: {
        "@type": "Person",
        name: "Nathaniel Booth",
        url: "https://www.youtube.com/@nathanielbooth",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://fatstacksacademy.com/#website",
      url: "https://fatstacksacademy.com",
      name: "Fat Stacks Academy",
      description: "Bank bonuses, credit card strategy, and Stacks OS.",
      publisher: { "@id": "https://fatstacksacademy.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://fatstacksacademy.com/blog?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "en-US",
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch profile server-side so ProfileProvider hydrates without flicker.
  // If user is not logged in, use guest defaults (no DB write until authenticated).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const serverProfile = user
    ? await getProfileServer(user.id)
    : { user_id: "", ...DEFAULT_PROFILE }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ProfileProvider serverProfile={serverProfile}>
          {children}
        </ProfileProvider>
        <ToastHost />
      </body>
    </html>
  )
}