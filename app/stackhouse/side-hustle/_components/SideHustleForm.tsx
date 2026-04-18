"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lora, IBM_Plex_Mono } from "next/font/google"
import "../../stackhouse.css"
import type { Milestone, SideHustle } from "../../../../lib/stackhouse/types"

// Local font scoping: this page is nested under /stackhouse/side-hustle/...
// so it inherits the layout.tsx fonts, but we reference the same CSS file
// to stay within the .stackhouse-root class system.
const _lora = Lora({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-stackhouse-serif", display: "swap" })
const _plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-stackhouse-mono", display: "swap" })

type Mode = "new" | "edit"

type LocalMilestone = {
  id: string
  threshold: string
  xp_reward: string
  label: string
  completed_at: string | null
}

function uid(): string {
  return "m_" + Math.random().toString(36).slice(2, 10)
}

function toLocal(m: Milestone): LocalMilestone {
  return {
    id: m.id,
    threshold: String(m.threshold),
    xp_reward: String(m.xp_reward),
    label: m.label,
    completed_at: m.completed_at,
  }
}

export default function SideHustleForm({
  mode,
  hustle,
}: {
  mode: Mode
  hustle?: SideHustle
}) {
  const router = useRouter()
  const [title, setTitle] = useState(hustle?.title ?? "")
  const [target, setTarget] = useState(String(hustle?.target_amount ?? ""))
  const [xpReward, setXpReward] = useState(String(hustle?.xp_reward ?? 100))
  const [notes, setNotes] = useState(hustle?.notes ?? "")
  const [status, setStatus] = useState<SideHustle["status"]>(hustle?.status ?? "active")
  const [milestones, setMilestones] = useState<LocalMilestone[]>(
    hustle?.milestones?.length
      ? hustle.milestones.map(toLocal)
      : [
          { id: uid(), threshold: "250", xp_reward: "50", label: "First quarter", completed_at: null },
          { id: uid(), threshold: "500", xp_reward: "75", label: "Halfway", completed_at: null },
          { id: uid(), threshold: "1000", xp_reward: "100", label: "Done", completed_at: null },
        ],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addMilestone() {
    setMilestones([
      ...milestones,
      { id: uid(), threshold: "0", xp_reward: "50", label: "Milestone", completed_at: null },
    ])
  }

  function updateMilestone(id: string, patch: Partial<LocalMilestone>) {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function removeMilestone(id: string) {
    setMilestones(milestones.filter((m) => m.id !== id))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const payload = {
      title: title.trim(),
      target_amount: Number(target),
      xp_reward: Number(xpReward) || 0,
      status,
      notes: notes.trim() || null,
      milestones: milestones
        .filter((m) => m.label.trim().length > 0)
        .map((m) => ({
          id: m.id,
          threshold: Number(m.threshold) || 0,
          xp_reward: Number(m.xp_reward) || 0,
          label: m.label.trim(),
          completed_at: m.completed_at,
        })),
    }

    if (!payload.title || !Number.isFinite(payload.target_amount) || payload.target_amount <= 0) {
      setError("Title and a positive target amount are required.")
      setBusy(false)
      return
    }

    try {
      const url =
        mode === "new"
          ? "/stackhouse/api/side-hustles"
          : `/stackhouse/api/side-hustles/${hustle!.id}`
      const res = await fetch(url, {
        method: mode === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "new" ? payload : { action: "update", ...payload }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push("/stackhouse")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!hustle) return
    if (!confirm("Walk away from this hustle? (cannot be undone)")) return
    setBusy(true)
    try {
      const res = await fetch(`/stackhouse/api/side-hustles/${hustle.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      router.push("/stackhouse")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className={`${_lora.variable} ${_plex.variable}`}>
      <div className="stackhouse-root mode-stackhouse" style={{ minHeight: "100vh" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 28px 80px" }}>
          <a
            href="/stackhouse"
            style={{ fontSize: 12, color: "var(--sh-text-muted)" }}
          >
            ← Back to Stackhouse
          </a>

          <h1
            className="sh-numeric"
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: "var(--sh-text-primary)",
              margin: "12px 0 4px",
            }}
          >
            {mode === "new" ? "New side hustle" : "Edit side hustle"}
          </h1>
          <div className="sh-eyebrow">User-defined quest · milestones × XP</div>

          <form onSubmit={onSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Churn three Chase cards this quarter"
                style={inputStyle}
                required
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Target amount ($)">
                <input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="1500"
                  style={inputStyle}
                  min={0}
                  required
                />
              </Field>
              <Field label="Completion XP bonus">
                <input
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  placeholder="100"
                  style={inputStyle}
                  min={0}
                />
              </Field>
            </div>

            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, fontFamily: "var(--sh-font-serif)" }}
              />
            </Field>

            {mode === "edit" && (
              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SideHustle["status"])}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </Field>
            )}

            <div>
              <div className="sh-eyebrow" style={{ marginBottom: 8 }}>
                Milestones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {milestones.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 80px auto",
                      gap: 8,
                      alignItems: "center",
                      padding: 8,
                      border: "1px solid var(--sh-divider)",
                      borderRadius: "var(--sh-radius)",
                    }}
                  >
                    <input
                      value={m.label}
                      onChange={(e) => updateMilestone(m.id, { label: e.target.value })}
                      placeholder={`Milestone ${i + 1}`}
                      style={{ ...inputStyle, padding: "6px 8px" }}
                    />
                    <input
                      type="number"
                      value={m.threshold}
                      onChange={(e) => updateMilestone(m.id, { threshold: e.target.value })}
                      placeholder="threshold"
                      style={{ ...inputStyle, padding: "6px 8px" }}
                    />
                    <input
                      type="number"
                      value={m.xp_reward}
                      onChange={(e) => updateMilestone(m.id, { xp_reward: e.target.value })}
                      placeholder="xp"
                      style={{ ...inputStyle, padding: "6px 8px" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      style={{
                        padding: "6px 10px",
                        fontSize: 11,
                        color: "var(--sh-text-muted)",
                        background: "transparent",
                        border: "1px solid var(--sh-divider)",
                        borderRadius: "var(--sh-radius)",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addMilestone}
                style={{
                  marginTop: 10,
                  padding: "6px 12px",
                  fontSize: 11,
                  color: "var(--sh-amber)",
                  background: "transparent",
                  border: "1px solid var(--sh-amber)",
                  borderRadius: "var(--sh-radius)",
                  cursor: "pointer",
                }}
              >
                + Milestone
              </button>
            </div>

            {error && (
              <div style={{ color: "var(--sh-red)", fontSize: 13 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "var(--sh-font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "var(--sh-amber)",
                  color: "#1a1816",
                  border: "none",
                  borderRadius: "var(--sh-radius)",
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {mode === "new" ? "Create hustle" : "Save"}
              </button>
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={busy}
                  style={{
                    padding: "10px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--sh-font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background: "transparent",
                    color: "var(--sh-red)",
                    border: "1px solid var(--sh-red)",
                    borderRadius: "var(--sh-radius)",
                    cursor: "pointer",
                  }}
                >
                  Walk away
                </button>
              )}
              <a
                href="/stackhouse"
                style={{
                  marginLeft: "auto",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--sh-text-muted)",
                  alignSelf: "center",
                }}
              >
                Cancel
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  background: "var(--sh-bg-card-elev)",
  color: "var(--sh-text-primary)",
  border: "1px solid var(--sh-divider)",
  borderRadius: "var(--sh-radius)",
  fontFamily: "var(--sh-font-mono)",
  boxSizing: "border-box",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div className="sh-eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </label>
  )
}
