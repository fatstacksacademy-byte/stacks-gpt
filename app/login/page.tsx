"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for the magic link.")
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Login to Stacks GPT</h1>

        <input
          type="email"
          placeholder="you@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white p-2 rounded"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </form>
    </div>
  )
}