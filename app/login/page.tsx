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
  const [mode, setMode] = useState<"signin" | "signup">("signin")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setIsError(false)

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        router.push("/roadmap")
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        setMessage("Account created! Check your email to confirm, then sign in.")
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-80 bg-white p-8 rounded-lg shadow-sm border border-gray-200"
      >
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-2xl font-bold">Stacks GPT</h1>
          <p className="text-sm text-gray-500">
            {mode === "signin" ? "Sign in to your account" : "Create an account"}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Password</label>
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

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white p-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
        >
          {loading
            ? mode === "signin"
              ? "Signing in..."
              : "Creating account..."
            : mode === "signin"
            ? "Sign In"
            : "Create Account"}
        </button>

        {message && (
          <p className={`text-sm ${isError ? "text-red-500" : "text-green-600"}`}>
            {message}
          </p>
        )}

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 text-center">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin")
                setMessage("")
              }}
              className="underline text-gray-700 hover:text-black"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
