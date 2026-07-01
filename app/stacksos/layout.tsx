import type { ReactNode } from "react"
import { createClient } from "../../lib/supabase/server"
import AuthBoundary from "../components/AuthBoundary"
import BottomNav from "../components/BottomNav"

export default async function StacksOSLayout({ children }: { children: ReactNode }) {
  // The mobile bottom nav is app chrome — only show it to signed-in users. When
  // logged out, /stacksos renders the marketing landing, which shouldn't carry
  // the app's tab bar. getSession reads the cookie (no network round-trip), so
  // this is a cheap UI gate.
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <AuthBoundary>
      {children}
      {session ? <BottomNav /> : null}
    </AuthBoundary>
  )
}
