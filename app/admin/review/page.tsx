"use client"

/**
 * /admin/review — the single front door for everything awaiting your sign-off.
 *
 * Why this page exists: review was split across /admin/discover-review,
 * /admin/triage and /admin/card-triage, with no at-a-glance count anywhere —
 * so "nothing nudged me and I didn't know there was anything to check" turned
 * the human gate into "never happens." This page surfaces all three counts up
 * top, lets you clear discovery leads inline, and deep-links to the full
 * triage screens for verify flags.
 *
 * All three queues are Supabase-backed, so this works in production.
 */
import React, { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type Lead = {
  id: string
  kind: "bonus" | "card"
  bank: string | null
  product: string | null
  bonus_amount: number | null
  classification: string | null
  confidence: number | null
  status: "new" | "approved" | "dismissed" | "snoozed"
  canonical_url: string | null
  source_urls: string[]
  flags: string[]
  discovered_at: string
}

const STATUS_BG: Record<string, { color: string; bg: string }> = {
  new: { color: "#1e40af", bg: "#dbeafe" },
  approved: { color: "#065f46", bg: "#d1fae5" },
  dismissed: { color: "#991b1b", bg: "#fee2e2" },
  snoozed: { color: "#5b21b6", bg: "#ede9fe" },
}

function fmtBonus(amount: number | null, kind: string): string {
  if (amount === null || amount === undefined) return "—"
  // Card bonuses are often points; bonus accounts are dollars. We don't have
  // currency here, so show a bare number for cards and $ for bank bonuses.
  return kind === "card" ? amount.toLocaleString() : `$${amount.toLocaleString()}`
}

export default function ReviewHubPage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [bonusFlags, setBonusFlags] = useState<number>(0)
  const [cardFlags, setCardFlags] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [q, t, c] = await Promise.all([
        fetch("/api/admin?action=discover-queue").then((r) => r.json()),
        fetch("/api/admin?action=triage-queue").then((r) => r.json()),
        fetch("/api/admin?action=card-triage-queue").then((r) => r.json()),
      ])
      setLeads(q.leads ?? [])
      setBonusFlags((t.queue ?? []).length)
      setCardFlags((c.queue ?? []).length)
    } catch {
      setError("Failed to load one or more queues.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    load()
  }, [authed, load])

  const decide = useCallback(
    async (id: string, status: "approved" | "dismissed" | "snoozed") => {
      setBusyId(id)
      const res = await fetch("/api/admin?action=discover-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      setBusyId(null)
      if (res.ok) {
        // optimistic: update in place so the count + list reflect the decision
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
      } else {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? "decision failed")
      }
    },
    [],
  )

  const pendingLeads = leads.filter((l) => l.status === "new")
  const approvedLeads = leads.filter((l) => l.status === "approved")
  const total = pendingLeads.length + bonusFlags + cardFlags

  if (authed === null) return <main style={{ padding: 40 }}>Checking access…</main>
  if (!authed) return <main style={{ padding: 40 }}>Not authorized.</main>

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Review</h1>
        <button onClick={load} disabled={loading} style={btnGhost}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p style={{ color: "#555", marginTop: 6 }}>
        {total === 0
          ? "All clear — nothing waiting on you. 🎉"
          : `${total} item${total === 1 ? "" : "s"} need your sign-off. Nothing reaches the catalog until you approve it here.`}
      </p>
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {/* Count cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "20px 0 28px" }}>
        <StatCard n={pendingLeads.length} label="Discovery leads" sub={`${approvedLeads.length} approved, queued`} href="#leads" tone="#0d7c5f" />
        <StatCard n={bonusFlags} label="Bonus verify flags" sub="mismatches & dead offers" href="/admin/triage" tone="#1d4ed8" />
        <StatCard n={cardFlags} label="Card verify flags" sub="mismatches & dead offers" href="/admin/card-triage" tone="#5b21b6" />
      </div>

      {/* Inline lead review */}
      <h2 id="leads" style={{ fontSize: 20, marginBottom: 4 }}>Discovery leads</h2>
      <p style={{ color: "#777", fontSize: 13, marginTop: 0 }}>
        New bonuses & cards found by the pipeline. Approve → promoted to the catalog on the next run.{" "}
        <a href="/admin/discover-review" style={{ color: "#0d7c5f" }}>Full discover view →</a>
      </p>

      {pendingLeads.length === 0 ? (
        <p style={{ color: "#888", padding: "16px 0" }}>No new leads to review.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingLeads.map((l) => (
            <div key={l.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={pill(l.kind === "card" ? "#5b21b6" : "#0d7c5f")}>{l.kind}</span>
                    <strong style={{ fontSize: 15 }}>{l.bank || "—"}</strong>
                    <span style={{ color: "#444" }}>{l.product || "—"}</span>
                  </div>
                  <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                    {fmtBonus(l.bonus_amount, l.kind)}
                    {l.confidence != null && ` · ${Math.round(l.confidence * 100)}% conf`}
                    {l.canonical_url && (
                      <>
                        {" · "}
                        <a href={l.canonical_url} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>offer page</a>
                      </>
                    )}
                    {l.flags?.length > 0 && <span style={{ color: "#b45309" }}> · ⚠ {l.flags.join(", ")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexShrink: 0 }}>
                  <button onClick={() => decide(l.id, "approved")} disabled={busyId === l.id} style={btn("#065f46")}>Approve</button>
                  <button onClick={() => decide(l.id, "snoozed")} disabled={busyId === l.id} style={btn("#6b7280")}>Snooze</button>
                  <button onClick={() => decide(l.id, "dismissed")} disabled={busyId === l.id} style={btn("#991b1b")}>Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function StatCard({ n, label, sub, href, tone }: { n: number; label: string; sub: string; href: string; tone: string }) {
  return (
    <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: n > 0 ? "#fff" : "#fafafa", borderLeft: `4px solid ${tone}` }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: n > 0 ? tone : "#9ca3af" }}>{n}</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "#888", fontSize: 12 }}>{sub}</div>
      </div>
    </a>
  )
}

const card: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fff" }
const btnGhost: React.CSSProperties = { border: "1px solid #d1d5db", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }
function btn(color: string): React.CSSProperties {
  return { background: color, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13 }
}
function pill(color: string): React.CSSProperties {
  return { background: color, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }
}
