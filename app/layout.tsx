import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ProfileProvider } from "./components/ProfileProvider"
import ProfileBar from "./components/ProfileBar"
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
  title: "Stacks OS",
  description: "Optimize your bank account bonuses",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ProfileProvider serverProfile={serverProfile}>
          <ProfileBar />
          {children}
        </ProfileProvider>
      </body>
    </html>
  )
}