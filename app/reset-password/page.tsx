"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  // The Supabase client returns a stable singleton from this helper, but
  // using useState's lazy initializer keeps the reference identity stable
  // across renders without relying on that — the auth-state subscription
  // below would otherwise tear down and re-attach on every render.
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [ready, setReady] = useState(false)
  // Set to true if no session materialises after our fallback window —
  // we surface a "looks like the link expired" message instead of
  // leaving the user on "Verifying…" forever.
  const [linkProblem, setLinkProblem] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")

  useEffect(() => {
    let cancelled = false

    // The PKCE flow has the session exchanged server-side via
    // /auth/callback, so by the time we land here the session is
    // already in the cookie. The implicit-flow path (hash fragment)
    // is also handled — Supabase's client auto-detects on init and
    // emits SIGNED_IN.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setReady(true)
          setLinkProblem(false)
        }
      },
    )

    // Fallback poll at 3s for slow clients.
    const earlyTimeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session) setReady(true)
      })
    }, 3000)

    // Final fallback at 6s: if we still have no session, surface a
    // visible "expired or invalid link" message with a way to request
    // another reset email — much better than the "Verifying…" spinner
    // running forever.
    const lateTimeout = setTimeout(() => {
      if (cancelled) return
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (!session) setLinkProblem(true)
      })
    }, 6000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(earlyTimeout)
      clearTimeout(lateTimeout)
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsError(false)
    setMessage("")

    if (password !== confirm) {
      setIsError(true)
      setMessage("Passwords don't match.")
      return
    }

    if (password.length < 6) {
      setIsError(true)
      setMessage("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setIsError(true)
      setMessage(error.message)
    } else {
      setMessage("Password updated! Redirecting...")
      setTimeout(() => {
        router.push("/stacksos")
        router.refresh()
      }, 1500)
    }
  }

  // Send another reset email from the expired-link fallback. We reuse
  // the same callback redirect strategy as /login so this stays in sync.
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendEmail.includes("@")) return
    setResendStatus("loading")
    const callbackUrl = `${window.location.origin}/auth/callback?type=recovery&next=/stacksos`
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: callbackUrl,
    })
    setResendStatus(error ? "error" : "sent")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col gap-4 w-80 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold">Stacks OS</h1>
          <p className="text-sm text-gray-500">Set a new password</p>
        </div>

        {!ready && !linkProblem && (
          <p className="text-sm text-gray-500">Verifying reset link...</p>
        )}

        {linkProblem && (
          <div className="flex flex-col gap-3">
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong className="font-semibold">This reset link looks expired or invalid.</strong>
              <br />
              Reset links expire about an hour after they&apos;re sent and can only be used once. Send yourself a fresh one below.
            </div>
            {resendStatus === "sent" ? (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                Sent! Check your email for the new reset link.
              </div>
            ) : (
              <form onSubmit={handleResend} className="flex flex-col gap-2">
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="submit"
                  disabled={resendStatus === "loading"}
                  className="bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {resendStatus === "loading" ? "Sending…" : "Send another reset link"}
                </button>
                {resendStatus === "error" && (
                  <p className="text-xs text-red-500">Could not send. Double-check the email address and try again.</p>
                )}
              </form>
            )}
            <a href="/login" className="text-xs text-gray-500 underline">
              Back to sign in
            </a>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {message && (
              <p className={`text-sm ${isError ? "text-red-500" : "text-green-600"}`}>
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
