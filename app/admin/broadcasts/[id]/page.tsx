"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Broadcast = {
  id: string
  subject: string
  status: string
  channel?: string
  segment_filter: { segment?: string }
  total_recipients: number
  total_sent: number
  total_failed: number
  created_at: string
  sent_at: string | null
  html_body: string
  text_body: string
}

type Recipient = {
  email: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  error: string | null
}

type Stats = { total: number; delivered: number; opens: number; clicks: number; bounces: number }

function pct(n: number, d: number): string {
  if (!d) return "—"
  return `${((n / d) * 100).toFixed(1)}%`
}

type RecipientFilter = "all" | "opened" | "clicked" | "bounced" | "not-opened"

export default function BroadcastDetailPage() {
  const params = useParams<{ id: string }>()
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<RecipientFilter>("all")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [supabase])

  useEffect(() => {
    if (!authed || !params.id) return
    fetch(`/api/admin/broadcasts?action=detail&id=${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErr(d.error); return }
        setBroadcast(d.broadcast)
        setRecipients(d.recipients ?? [])
        setStats(d.stats ?? null)
      })
      .catch(e => setErr(String(e)))
  }, [authed, params.id])

  if (authed === null) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#888" }}>Loading…</div>
  if (!authed) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>Not authorized.</div>
  if (err) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>Error: {err}</div>
  if (!broadcast || !stats) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#888" }}>Loading broadcast…</div>

  const filtered = recipients.filter(r => {
    if (filter === "opened") return r.opened_at
    if (filter === "clicked") return r.clicked_at
    if (filter === "bounced") return r.error
    if (filter === "not-opened") return r.sent_at && !r.opened_at && !r.error
    return true
  })

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, sans-serif" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
        <Link href="/admin/broadcasts" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none", fontWeight: 600 }}>← All broadcasts</Link>

        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "16px 0 4px", color: "#111", letterSpacing: "-0.02em" }}>
          {broadcast.subject}
        </h1>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>
          {broadcast.channel ?? "newsletter"} · {broadcast.segment_filter?.segment ?? "—"} · sent {broadcast.sent_at ? new Date(broadcast.sent_at).toLocaleString() : "(not sent)"}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 32 }}>
          <StatCard label="Recipients" value={stats.total} />
          <StatCard label="Delivered" value={stats.delivered} sub={pct(stats.delivered, stats.total)} />
          <StatCard label="Opens" value={stats.opens} sub={pct(stats.opens, stats.delivered)} highlight />
          <StatCard label="Clicks" value={stats.clicks} sub={`${pct(stats.clicks, stats.delivered)} CTR`} highlight />
          <StatCard label="Bounces" value={stats.bounces} danger />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {([
            { key: "all", label: `All (${stats.total})` },
            { key: "opened", label: `Opened (${stats.opens})` },
            { key: "clicked", label: `Clicked (${stats.clicks})` },
            { key: "not-opened", label: `Delivered, not opened (${Math.max(0, stats.delivered - stats.opens)})` },
            { key: "bounced", label: `Bounced (${stats.bounces})` },
          ] as { key: RecipientFilter; label: string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600,
              background: filter === f.key ? "#0d7c5f" : "#fff",
              color: filter === f.key ? "#fff" : "#444",
              border: `1px solid ${filter === f.key ? "#0d7c5f" : "#e0e0e0"}`,
              borderRadius: 99, cursor: "pointer",
            }}>{f.label}</button>
          ))}
        </div>

        {/* Recipient table */}
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Email", "Sent", "Opened", "Clicked", "Status"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#888", padding: "24px" }}>No recipients match this filter</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ ...td, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>{r.email}</td>
                  <td style={{ ...td, color: "#888", fontSize: 12 }}>{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</td>
                  <td style={{ ...td, color: r.opened_at ? "#0d7c5f" : "#ccc", fontSize: 12, fontWeight: r.opened_at ? 600 : 400 }}>
                    {r.opened_at ? new Date(r.opened_at).toLocaleString() : "—"}
                  </td>
                  <td style={{ ...td, color: r.clicked_at ? "#0d7c5f" : "#ccc", fontSize: 12, fontWeight: r.clicked_at ? 600 : 400 }}>
                    {r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "—"}
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {r.error ? <span style={{ color: "#b91c1c" }}>{r.error.slice(0, 40)}{r.error.length > 40 ? "…" : ""}</span>
                      : r.clicked_at ? <span style={{ color: "#0d7c5f" }}>Clicked</span>
                      : r.opened_at ? <span style={{ color: "#0d7c5f" }}>Opened</span>
                      : r.sent_at ? <span style={{ color: "#888" }}>Delivered</span>
                      : <span style={{ color: "#aaa" }}>Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Email body preview */}
        <details style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px" }}>
          <summary style={{ fontSize: 14, fontWeight: 700, color: "#111", cursor: "pointer" }}>What you sent</summary>
          <div style={{ marginTop: 16, padding: 16, background: "#fafafa", borderRadius: 8, fontSize: 13, color: "#444", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, monospace" }}>
            <strong>Subject:</strong> {broadcast.subject}{"\n\n"}
            {broadcast.text_body}
          </div>
        </details>
      </main>
    </div>
  )
}

function StatCard({ label, value, sub, highlight, danger }: { label: string; value: number; sub?: string; highlight?: boolean; danger?: boolean }) {
  const color = danger ? "#b91c1c" : highlight ? "#0d7c5f" : "#111"
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color, opacity: 0.7, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
      <div style={{ fontSize: 11, color: "#888", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700,
  color: "#888", textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap",
}

const td: React.CSSProperties = { padding: "10px 14px", color: "#111", verticalAlign: "top" }
