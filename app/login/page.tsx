"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setIsError(false)

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://stacks-gpt-squn.vercel.app/reset-password",
      })
      setLoading(false)
      if (error) { setIsError(true); setMessage(error.message) }
      else setMessage("Check your email for a password reset link.")
      return
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) { setIsError(true); setMessage(error.message) }
      else { router.push("/roadmap"); router.refresh() }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) { setIsError(true); setMessage(error.message) }
      else setMessage("Account created! Sign in below.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold">Stacks OS</h1>
          <p className="text-sm text-gray-500">
            {mode === "signin" && "Sign in to your account"}
            {mode === "signup" && "Create an account"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input type="email" placeholder="you@email.com" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black" />
        </div>

        {mode !== "forgot" && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">Password</label>
              {mode === "signin" && (
                <button type="button" onClick={() => { setMode("forgot"); setMessage("") }}
                  className="text-xs text-gray-500 hover:text-black underline">
                  Forgot password?
                </button>
              )}
            </div>
            <input type="password" placeholder="••••••••" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black" />
          </div>
        )}

        <button type="submit" disabled={loading}
          className="bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1">
          {loading ? "..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
        </button>

        {message && <p className={`text-sm ${isError ? "text-red-500" : "text-green-600"}`}>{message}</p>}

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 text-center">
            {mode === "forgot" ? (
              <>Remember it? <button type="button" onClick={() => { setMode("signin"); setMessage("") }} className="underline text-gray-700 hover:text-black">Sign in</button></>
            ) : mode === "signin" ? (
              <>Don&apos;t have an account? <button type="button" onClick={() => { setMode("signup"); setMessage("") }} className="underline text-gray-700 hover:text-black">Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => { setMode("signin"); setMessage("") }} className="underline text-gray-700 hover:text-black">Sign in</button></>
            )}
          </p>
        </div>
      </form>
    </div>
  )
}
