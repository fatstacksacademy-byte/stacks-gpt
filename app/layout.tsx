import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import AnalyticsGate from "./components/AnalyticsGate"
import ToastHost from "./components/ToastHost"
import PostHogProvider from "./components/PostHogProvider"
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar"
import FloatingPushButton from "./components/FloatingPushButton"
import InstallButton from "./components/InstallButton"

// Read the GA4 measurement ID from env so the site stays untracked in dev/CI
// and lights up automatically once NEXT_PUBLIC_GA_ID is set in production.
// Format: "G-XXXXXXXXXX". @next/third-parties handles SPA route-change pings
// for us; no extra wiring needed.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

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
  // PWA — iOS "Add to Home Screen" affordance + standalone behavior.
  // The web manifest at app/manifest.ts drives Android.
  appleWebApp: {
    capable: true,
    title: "Stacks OS",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#0d7c5f",
  width: "device-width",
  initialScale: 1,
  // viewportFit: "cover" lets PWA content extend behind the iOS notch +
  // home indicator when launched from the home screen.
  viewportFit: "cover",
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

// Root layout is intentionally Supabase-free so the build can prerender
// public pages (/offline, /blog, etc.) without env vars. Routes whose pages
// call useProfile() wrap themselves with <AuthBoundary> in their own layout.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        {children}
        <ToastHost />
        <ServiceWorkerRegistrar />
        <FloatingPushButton />
        <InstallButton />
      </body>
      {GA_ID && <AnalyticsGate gaId={GA_ID} />}
    </html>
  )
}