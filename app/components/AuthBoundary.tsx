import type { ReactNode } from "react"
import { createClient } from "../../lib/supabase/server"
import { getProfileServer, DEFAULT_PROFILE, type UserProfile } from "../../lib/profileServer"
import { ProfileProvider } from "./ProfileProvider"

// Server component that fetches the current user + their profile and hydrates
// ProfileProvider so child Client Components can read it without flicker.
//
// Wrap any route layout whose pages call useProfile(). Keeping this off the
// root layout means /offline, /blog, and other public pages render with no
// Supabase round-trip — and the build's prerender step doesn't depend on
// Supabase env vars being present, which would otherwise break Vercel builds.
//
// Tolerates missing env vars / Supabase failures by falling back to
// DEFAULT_PROFILE so a transient outage degrades to "looks like guest" rather
// than a 500.
export default async function AuthBoundary({ children }: { children: ReactNode }) {
  let serverProfile: UserProfile = { user_id: "", ...DEFAULT_PROFILE }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) serverProfile = await getProfileServer(user.id)
  } catch {
    // fall through with guest defaults
  }
  return <ProfileProvider serverProfile={serverProfile}>{children}</ProfileProvider>
}
