"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
  const params = new URLSearchParams(window.location.search)

  // If callback already exchanged the token and flagged recovery, just check for a session
  if (params.get("recovery") === "true") {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
  }

  // Also listen for the event in case it does fire (e.g. implicit flow)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setReady(true)
    }
  })

  return () => subscription.unsubscribe()
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
        router.push("/roadmap")
        router.refresh()
      }, 1500)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col gap-4 w-80 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold">Stacks GPT</h1>
          <p className="text-sm text-gray-500">Set a new password</p>
        </div>

        {!ready ? (
          <p className="text-sm text-gray-500">Verifying reset link...</p>
        ) : (
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
