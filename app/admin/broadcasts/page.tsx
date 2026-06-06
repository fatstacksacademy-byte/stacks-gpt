"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Broadcast = {
  id: string
  subject: string
  status: "draft" | "sending" | "sent" | "failed"
  segment_filter: { segment?: string }
  total_recipients: number
  total_sent: number
  total_failed: number
  created_at: string
  sent_at: string | null
  // Enriched by the list API from broadcast_sends webhook events.
  delivered?: number
  opens?: number
  clicks?: number
  bounces?: number
}

function pct(n: number, d: number): string {
  if (!d) return "—"
  return `${((n / d) * 100).toFixed(1)}%`
}

const SEGMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Everyone (newsletter opted-in)" },
  { value: "current", label: "Current Stacks OS customers" },
  { value: "lead", label: "Leads (no account yet)" },
  { value: "former", label: "Former customers" },
]

const CHANNEL_OPTIONS: { value: "newsletter" | "product"; label: string; help: string }[] = [
  { value: "newsletter", label: "Newsletter", help: "Marketing list — only contacts who opted in via signup" },
  { value: "product", label: "Product announcement", help: "Current + former Stacks OS users with product-news opt-in (default on)" },
]

export default function BroadcastsAdminPage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)

  const [subject, setSubject] = useState("")
  const [textBody, setTextBody] = useState("")
  const [segment, setSegment] = useState("all")
  const [channel, setChannel] = useState<"newsletter" | "product">("newsletter")
  const [segmentCount, setSegmentCount] = useState<number | null>(null)

  const [past, setPast] = useState<Broadcast[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [supabase])

  useEffect(() => {
    if (!authed) return
    loadPast()
  }, [authed])

  useEffect(() => {
    if (!authed) return
    fetch(`/api/admin/broadcasts?action=segment-count&segment=${segment}&channel=${channel}`)
      .then(r => r.json())
      .then(d => setSegmentCount(typeof d.count === "number" ? d.count : null))
      .catch(() => setSegmentCount(null))
  }, [segment, channel, authed])

  async function loadPast() {
    const r = await fetch("/api/admin/broadcasts?action=list")
    const d = await r.json()
    if (Array.isArray(d.broadcasts)) setPast(d.broadcasts)
  }

  function textToHtml(text: string): string {
    // MVP renderer: paragraphs from blank lines, autolink URLs, inline bold.
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
    const withLinks = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0d7c5f;">$1</a>')
    const withBold = withLinks.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    const paragraphs = withBold.split(/\n\n+/).map(p => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`).join("\n")
    return paragraphs
  }

  async function handleSendTest() {
    if (!subject || !textBody) { setMsg("Subject and body required"); return }
    setBusy(true); setMsg(null)
    const htmlBody = textToHtml(textBody)
    const r = await fetch("/api/admin/broadcasts?action=send-test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, htmlBody, textBody }),
    })
    const d = await r.json()
    setBusy(false)
    setMsg(r.ok ? "Test sent to your inbox" : `Test failed: ${d.error}`)
  }

  async function handleSendReal() {
    if (!subject || !textBody) { setMsg("Subject and body required"); return }
    const confirmed = window.confirm(
      `Send "${subject}" to ${segmentCount ?? "?"} recipients (${segment})? This cannot be undone.`,
    )
    if (!confirmed) return

    setBusy(true); setMsg(null)
    const htmlBody = textToHtml(textBody)

    const createRes = await fetch("/api/admin/broadcasts?action=create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, htmlBody, textBody, segment, channel }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.broadcast?.id) {
      setBusy(false); setMsg(`Create failed: ${createData.error}`); return
    }

    const sendRes = await fetch("/api/admin/broadcasts?action=send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcastId: createData.broadcast.id }),
    })
    const sendData = await sendRes.json()
    setBusy(false)
    if (sendRes.ok) {
      setMsg(`Sent: ${sendData.result.total_sent} / failed: ${sendData.result.total_failed} / total: ${sendData.result.total_recipients}`)
      setSubject(""); setTextBody("")
      loadPast()
    } else {
      setMsg(`Send failed: ${sendData.error}`)
    }
  }

  if (authed === null) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#888" }}>Loading…</div>
  if (!authed) return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#b91c1c" }}>Not authorized.</div>

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, sans-serif" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", color: "#111" }}>Broadcasts</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "0 0 32px" }}>
          Send a one-off email to a segment of your contact list.
        </p>

        {/* Composer */}
        <section style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: 24, marginBottom: 32 }}>
          <label style={lbl}>Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="June bonus refresh + 4 new offers"
            style={inp}
          />

          <label style={lbl}>Body (plain text — blank line = paragraph, **bold**, URLs auto-link)</label>
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder={"Hey —\n\nWe just refreshed the bank bonus list at https://fatstacksacademy.com/bonuses with **15 new offers** this month.\n\nTop picks:\n- BMO $600\n- HSBC $5,000 (Premier)\n- Chase combo $900\n\nReply if you want me to look at a specific bonus.\n\n— Nathaniel"}
            rows={14}
            style={{ ...inp, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ ...lbl, marginTop: 0 }}>Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as "newsletter" | "product")} style={inp}>
                {CHANNEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                {CHANNEL_OPTIONS.find(o => o.value === channel)?.help}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label style={{ ...lbl, marginTop: 0 }}>Audience</label>
              <select value={segment} onChange={(e) => setSegment(e.target.value)} style={inp}>
                {SEGMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                {segmentCount === null ? "Counting…" : `${segmentCount} recipient${segmentCount === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={handleSendTest} disabled={busy} style={btnSecondary}>
              {busy ? "..." : "Send test to me"}
            </button>
            <button onClick={handleSendReal} disabled={busy} style={btnPrimary}>
              {busy ? "Sending…" : `Send to ${segmentCount ?? "?"}`}
            </button>
          </div>

          {msg && (
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 8,
              background: msg.startsWith("Sent") || msg.startsWith("Test sent") ? "#e6f5f0" : "#fee2e2",
              color: msg.startsWith("Sent") || msg.startsWith("Test sent") ? "#0d7c5f" : "#b91c1c",
              fontSize: 13, fontWeight: 600,
            }}>{msg}</div>
          )}
        </section>

        {/* History */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Past broadcasts</h2>
          {past.length === 0 ? (
            <div style={{ fontSize: 14, color: "#888", padding: 16, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10 }}>
              No broadcasts sent yet.
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Subject", "Status", "Sent", "Opens", "Clicks", "Bounces", "Date", ""].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {past.map(b => {
                    const delivered = b.delivered ?? b.total_sent ?? 0
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                        <td style={{ ...td, maxWidth: 280 }}>
                          <div style={{ fontWeight: 600, color: "#111" }}>{b.subject}</div>
                          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{b.segment_filter?.segment ?? "—"}</div>
                        </td>
                        <td style={{ ...td, color: b.status === "sent" ? "#0d7c5f" : b.status === "failed" ? "#b91c1c" : "#888", fontWeight: 600 }}>
                          {b.status}
                        </td>
                        <td style={td}>
                          <div>{b.total_sent}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>of {b.total_recipients}</div>
                        </td>
                        <td style={td}>
                          <div style={{ color: "#0d7c5f", fontWeight: 600 }}>{b.opens ?? 0}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{pct(b.opens ?? 0, delivered)}</div>
                        </td>
                        <td style={td}>
                          <div style={{ color: "#0d7c5f", fontWeight: 600 }}>{b.clicks ?? 0}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{pct(b.clicks ?? 0, delivered)} CTR</div>
                        </td>
                        <td style={{ ...td, color: (b.bounces ?? 0) > 0 ? "#b91c1c" : "#888" }}>
                          {b.bounces ?? b.total_failed ?? 0}
                        </td>
                        <td style={{ ...td, color: "#888" }}>
                          {b.sent_at ? new Date(b.sent_at).toLocaleString() : new Date(b.created_at).toLocaleString()}
                        </td>
                        <td style={td}>
                          <Link href={`/admin/broadcasts/${b.id}`} style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 600, textDecoration: "none" }}>
                            Details →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, color: "#666",
  marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
}

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 14, background: "#fff",
  color: "#111", border: "1px solid #e0e0e0", borderRadius: 8, outline: "none",
  fontFamily: "inherit",
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 22px", fontSize: 14, fontWeight: 700,
  background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  padding: "10px 18px", fontSize: 13, fontWeight: 600,
  background: "#fff", color: "#0d7c5f", border: "1px solid #0d7c5f", borderRadius: 8, cursor: "pointer",
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700,
  color: "#888", textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: "1px solid #e8e8e8", whiteSpace: "nowrap",
}

const td: React.CSSProperties = { padding: "10px 14px", color: "#111", verticalAlign: "top" }
