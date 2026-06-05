import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { importBonusInterestsForUser } from "@/lib/bonusInterestImport"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/stacksos"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type !== "recovery") {
        try {
          const { data } = await supabase.auth.getUser()
          if (data.user?.email && data.user.id) {
            await importBonusInterestsForUser(data.user.id, data.user.email)
          }
        } catch (e) {
          console.error("[auth/callback] bonus-interest import failed:", e)
        }
      }
      const redirectTo = type === "recovery" ? "/reset-password?recovery=true" : next
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}