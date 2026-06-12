import type { Metadata } from "next"
import { redirect } from "next/navigation"
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

/**
 * Belt-and-suspenders for password recovery: if Supabase falls back to
 * its Site URL (https://fatstacksacademy.com) instead of honoring our
 * configured redirectTo, the recovery code lands HERE — on the
 * homepage — and would otherwise auto-exchange as a normal sign-in
 * with no password form ever appearing. Detecting `?code=` + a
 * recovery hint and forwarding to /auth/callback keeps the flow
 * working regardless of how Supabase resolves the redirect.
 *
 * We forward on:
 *   - `?code=…` + `?type=recovery`      (our login redirectTo if Supabase honored it)
 *   - `?code=…` + standalone `?token_hash=…` recovery params
 *   - hash fragments aren't readable server-side; the client-side
 *     /reset-password page handles those.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const code = typeof params.code === "string" ? params.code : null
  const type = typeof params.type === "string" ? params.type : null
  const token_hash = typeof params.token_hash === "string" ? params.token_hash : null

  if (code && (type === "recovery" || token_hash)) {
    // Forward to the existing callback handler, preserving every param
    // Supabase appended (state, etc.). The callback exchanges the code
    // server-side and routes recovery sessions to /reset-password.
    const forward = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === "string") forward.set(k, v)
    }
    if (!forward.get("type")) forward.set("type", "recovery")
    redirect(`/auth/callback?${forward.toString()}`)
  }

  return <HomeClient />
}
