import type { ReactNode } from "react"

// All /admin/* pages are auth-gated client components that build a Supabase
// client at render. Route-segment config is ignored on client-component pages,
// so we force the whole admin segment dynamic from this server layout — that
// keeps the build from prerendering them (and crashing when Supabase env vars
// aren't present in a given Vercel scope).
export const dynamic = "force-dynamic"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children
}
