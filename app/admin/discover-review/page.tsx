"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type Enrichment = {
  fetched_at?: string | null
  deposit_requirement?: number | null
  direct_deposit_required?: boolean | null
  deposit_window_days?: number | null
  expiration?: string | null
  states?: string[] | null
  terms_url?: string | null
  monthly_fee?: number | null
}

type Lead = {
  id: string
  bank: string
  product: string
  bonus_amount: number | null
  classification: "credit_card_bonus" | "bank_account_bonus" | "other" | string
  confidence: number
  discovered_at: string
  source_urls: string[]
  canonical_url: string | null
  enrichment: Enrichment
  flags: string[]
  outbound_candidates: string[]
  status: "new" | "approved" | "dismissed" | "snoozed"
  first_seen_via: string
  decided_at?: string
  decided_by?: string | null
}

type StatusFilter = "open" | "all" | "approved" | "dismissed" | "snoozed" | "new"
type ClassificationFilter = "all" | "credit_card_bonus" | "bank_account_bonus" | "other"

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  credit_card_bonus: { label: "Credit Card", color: "#5b21b6", bg: "#ede9fe" },
  bank_account_bonus: { label: "Bank Bonus", color: "#0d7c5f", bg: "#e6f5f0" },
  other: { label: "Other / news", color: "#92400e", bg: "#fef3c7" },
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "new", color: "#1e40af", bg: "#dbeafe" },
  approved: { label: "approved", color: "#065f46", bg: "#d1fae5" },
  dismissed: { label: "dismissed", color: "#991b1b", bg: "#fee2e2" },
  snoozed: { label: "snoozed", color: "#5b21b6", bg: "#ede9fe" },
}

function formatBonus(amount: number | null): string {
  if (amount === null || amount === undefined) return "—"
  return `$${amount.toLocaleString()}`
}

function formatConfidence(c: number): string {
  // confidence is stored as 0-1.
  return `${Math.round(c * 100)}%`
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function DiscoverReviewPage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open")
  const [classFilter, setClassFilter] = useState<ClassificationFilter>("all")
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [drafterRunning, setDrafterRunning] = useState(false)
  const [drafterResult, setDrafterResult] = useState<{ count: number; files: string[] } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/admin?action=discover-queue")
    if (res.ok) {
      const data = await res.json()
      setLeads(data.leads ?? [])
    } else {
      setError("Failed to load discover queue.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    load()
  }, [authed, load])

  const runDrafter = useCallback(async () => {
    setDrafterRunning(true)
    setError(null)
    setDrafterResult(null)
    const res = await fetch("/api/admin?action=run-apply-approved", { method: "POST" })
    const body = await res.json().catch(() => ({}))
    setDrafterRunning(false)
    if (!res.ok || !body.ok) {
      setError(body.error ?? `Drafter exited ${body.exitCode}. ${body.stderr ?? ""}`.slice(0, 240))
      return
    }
    setDrafterResult({ count: body.appliedCount ?? 0, files: body.draftFiles ?? [] })
    setSuccessMsg(`Drafted ${body.appliedCount ?? 0} approved lead(s).`)
    setTimeout(() => setSuccessMsg(null), 2400)
  }, [])

  const decide = useCallback(
    async (lead: Lead, status: "approved" | "dismissed" | "snoozed" | "new") => {
      if (busyId) return
      setBusyId(lead.id)
      setError(null)
      const res = await fetch("/api/admin?action=discover-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status }),
      })
      if (res.ok) {
        // Patch locally so we don't refetch — fast.
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status, decided_at: new Date().toISOString() } : l)))
        setSuccessMsg(`Marked ${status}.`)
        setTimeout(() => setSuccessMsg(null), 1600)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Failed to update lead.")
      }
      setBusyId(null)
    },
    [busyId],
  )

  // Counts by status — drives the filter pills.
  const statusCounts = useMemo(() => {
    const c = { all: leads.length, new: 0, approved: 0, dismissed: 0, snoozed: 0, open: 0 }
    for (const l of leads) {
      c[l.status] = (c[l.status] ?? 0) + 1
      if (l.status === "new") c.open++
    }
    return c
  }, [leads])

  // Filtered + sorted list.
  const visible = useMemo(() => {
    const lower = search.toLowerCase().trim()
    const filtered = leads.filter((l) => {
      // Status filter. "open" = new only — approved leads are done from the
      // admin's perspective (waiting on the drafter, not on you). Switch to
      // the "Approved" pill to see what's queued for --apply-approved.
      if (statusFilter === "open") {
        if (l.status !== "new") return false
      } else if (statusFilter !== "all" && l.status !== statusFilter) return false
      // Classification filter.
      if (classFilter !== "all" && l.classification !== classFilter) return false
      // Search.
      if (lower) {
        const hay = `${l.product} ${l.bank}`.toLowerCase()
        if (!hay.includes(lower)) return false
      }
      return true
    })
    // Sort: approved first, then new, then snoozed, then dismissed; within each
    // group, highest-confidence first, then most-recent.
    const statusRank: Record<string, number> = { approved: 0, new: 1, snoozed: 2, dismissed: 3 }
    return filtered.sort((a, b) => {
      const sa = statusRank[a.status] ?? 4
      const sb = statusRank[b.status] ?? 4
      if (sa !== sb) return sa - sb
      if (a.confidence !== b.confidence) return b.confidence - a.confidence
      return new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
    })
  }, [leads, search, statusFilter, classFilter])

  if (authed === null) return <div style={{ padding: 40, color: "#999" }}>Checking access...</div>
  if (!authed) return <div style={{ padding: 40, color: "#ef4444", fontWeight: 600 }}>Unauthorized. Admin access only.</div>

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #e8e8e8", background: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, color: "#111", textDecoration: "none" }}>Stacks OS</a>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99 }}>ADMIN</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", padding: "2px 8px", borderRadius: 99 }}>DISCOVER REVIEW</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#999" }}>
            {statusCounts.all} leads total
          </span>
          <a href="/admin" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none" }}>&larr; back to admin</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          <StatTile label="To triage (new)" value={statusCounts.open} color="#1e40af" />
          <StatTile label="Approved (drafts pending)" value={statusCounts.approved} color="#065f46" />
          <StatTile label="Dismissed" value={statusCounts.dismissed} color="#991b1b" />
          <StatTile label="Snoozed" value={statusCounts.snoozed} color="#5b21b6" />
        </div>

        {/* Draft generator */}
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#333" }}>
            <span style={{ fontWeight: 700 }}>{statusCounts.approved}</span> approved lead{statusCounts.approved === 1 ? "" : "s"} ready to draft into <code style={{ background: "#f5f5f5", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>lib/data/*.draft.ts</code>.
          </div>
          <button
            onClick={runDrafter}
            disabled={drafterRunning || statusCounts.approved === 0}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              background: statusCounts.approved === 0 ? "#bbb" : "#0d7c5f",
              border: "none",
              borderRadius: 6,
              cursor: drafterRunning || statusCounts.approved === 0 ? "not-allowed" : "pointer",
              opacity: drafterRunning ? 0.7 : 1,
            }}
          >
            {drafterRunning ? "Drafting…" : `⚙ Run drafter`}
          </button>
        </div>
        {drafterResult && (
          <div style={{ background: "#e6f5f0", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Drafted {drafterResult.count} lead{drafterResult.count === 1 ? "" : "s"}. Review + hand-copy into the live data file.
            </div>
            {drafterResult.files.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {drafterResult.files.map((f) => (
                  <li key={f} style={{ fontFamily: "monospace", fontSize: 11 }}>{f}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontStyle: "italic", color: "#065f46" }}>(no draft files were written)</div>
            )}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            placeholder="Search bank or product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 13, border: "1px solid #e8e8e8", borderRadius: 6, background: "#fafafa" }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterPill label={`To triage (${statusCounts.open})`} active={statusFilter === "open"} onClick={() => setStatusFilter("open")} />
            <FilterPill label={`New (${statusCounts.new})`} active={statusFilter === "new"} onClick={() => setStatusFilter("new")} />
            <FilterPill label={`Approved (${statusCounts.approved})`} active={statusFilter === "approved"} onClick={() => setStatusFilter("approved")} />
            <FilterPill label={`Dismissed (${statusCounts.dismissed})`} active={statusFilter === "dismissed"} onClick={() => setStatusFilter("dismissed")} />
            <FilterPill label={`Snoozed (${statusCounts.snoozed})`} active={statusFilter === "snoozed"} onClick={() => setStatusFilter("snoozed")} />
            <FilterPill label={`All (${statusCounts.all})`} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <FilterPill label="All kinds" active={classFilter === "all"} onClick={() => setClassFilter("all")} small />
            <FilterPill label="Credit Card" active={classFilter === "credit_card_bonus"} onClick={() => setClassFilter("credit_card_bonus")} small />
            <FilterPill label="Bank Bonus" active={classFilter === "bank_account_bonus"} onClick={() => setClassFilter("bank_account_bonus")} small />
            <FilterPill label="Other / news" active={classFilter === "other"} onClick={() => setClassFilter("other")} small />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13 }}>{error}</div>
        )}
        {successMsg && (
          <div role="status" style={{ background: "#e6f5f0", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        {loading ? (
          <div style={{ color: "#999", padding: 24 }}>Loading queue…</div>
        ) : visible.length === 0 ? (
          <EmptyState statusFilter={statusFilter} totalCount={statusCounts.all} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map((lead) => (
              <LeadCard key={lead.id} lead={lead} busy={busyId === lead.id} onDecide={(s) => decide(lead, s)} />
            ))}
          </div>
        )}

        {/* Footer help */}
        <div style={{ marginTop: 24, fontSize: 11, color: "#999", textAlign: "center" }}>
          After approving leads here, run <code style={{ background: "#f5f5f5", padding: "1px 4px", borderRadius: 3 }}>npm run discover:bonuses -- --apply-approved</code> in your terminal to generate draft catalog entries.
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function FilterPill({ label, active, onClick, small = false }: { label: string; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "4px 10px" : "6px 12px",
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        color: active ? "#fff" : "#555",
        background: active ? "#0d7c5f" : "#fafafa",
        border: `1px solid ${active ? "#0d7c5f" : "#e8e8e8"}`,
        borderRadius: 99,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )
}

function EmptyState({ statusFilter, totalCount }: { statusFilter: StatusFilter; totalCount: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>
        {totalCount === 0 ? "No leads in the queue." : "No leads match this filter."}
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        {totalCount === 0
          ? "Run discover to pull fresh leads:"
          : statusFilter === "open"
            ? "All open leads are triaged. Nice."
            : "Try a different status or kind."}
      </div>
      {totalCount === 0 && (
        <code style={{ display: "inline-block", background: "#f5f5f5", border: "1px solid #e8e8e8", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#111" }}>
          npm run discover:bonuses
        </code>
      )}
    </div>
  )
}

function LeadCard({ lead, busy, onDecide }: { lead: Lead; busy: boolean; onDecide: (status: "approved" | "dismissed" | "snoozed" | "new") => void }) {
  const cls = CLASSIFICATION_LABELS[lead.classification] ?? CLASSIFICATION_LABELS.other
  const st = STATUS_LABELS[lead.status] ?? STATUS_LABELS.new
  const isDismissed = lead.status === "dismissed"

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderLeft: `4px solid ${cls.color}`,
        borderRadius: 8,
        padding: "12px 14px",
        opacity: isDismissed ? 0.55 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Top row: classification, status, confidence, date */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: cls.color, background: cls.bg, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {cls.label}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: st.color, background: st.bg, padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {st.label}
        </span>
        <span style={{ fontSize: 11, color: "#666" }}>conf {formatConfidence(lead.confidence)}</span>
        <span style={{ fontSize: 11, color: "#999" }}>· {shortDate(lead.discovered_at)}</span>
        {lead.flags?.length > 0 && (
          <span
            title="Discover-pipeline metadata — not a result of any click"
            style={{ fontSize: 10, color: "#666", background: "#f5f5f5", padding: "2px 6px", borderRadius: 99, border: "1px solid #e8e8e8" }}
          >
            {lead.flags.map((f) => f.replace(/_/g, " ")).join(" · ")}
          </span>
        )}
      </div>

      {/* Headline */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", lineHeight: 1.3 }}>{lead.product}</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
          <span style={{ fontWeight: 600 }}>{lead.bank}</span>
          {lead.bonus_amount !== null && <span> · {formatBonus(lead.bonus_amount)}</span>}
        </div>
      </div>

      {/* Enrichment / signals */}
      <div style={{ fontSize: 11, color: "#555", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {lead.enrichment?.deposit_requirement && <span>DD ${lead.enrichment.deposit_requirement.toLocaleString()}</span>}
        {lead.enrichment?.deposit_window_days && <span>window {lead.enrichment.deposit_window_days}d</span>}
        {lead.enrichment?.monthly_fee !== null && lead.enrichment?.monthly_fee !== undefined && <span>fee ${lead.enrichment.monthly_fee}</span>}
        {lead.enrichment?.expiration && <span>expires {lead.enrichment.expiration}</span>}
        {lead.enrichment?.states && lead.enrichment.states.length > 0 && <span>states: {lead.enrichment.states.join(", ")}</span>}
        {!lead.enrichment?.deposit_requirement && !lead.enrichment?.monthly_fee && !lead.enrichment?.expiration && (
          <span style={{ color: "#999", fontStyle: "italic" }}>no enrichment data</span>
        )}
      </div>

      {/* Links */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
        {lead.canonical_url && (
          <a href={lead.canonical_url} target="_blank" rel="noreferrer" style={{ color: "#0d7c5f", wordBreak: "break-all" }}>
            🏦 bank page: {lead.canonical_url}
          </a>
        )}
        {lead.source_urls?.map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" style={{ color: "#2563eb", wordBreak: "break-all" }}>
            📰 source: {u}
          </a>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <ActionButton
          label="✅ Approve"
          color="#fff"
          bg="#0d7c5f"
          active={lead.status === "approved"}
          disabled={busy}
          onClick={() => onDecide("approved")}
        />
        <ActionButton
          label="❌ Dismiss"
          color="#991b1b"
          bg="#fee2e2"
          active={lead.status === "dismissed"}
          disabled={busy}
          onClick={() => onDecide("dismissed")}
        />
        <ActionButton
          label="⏭ Snooze"
          color="#5b21b6"
          bg="#ede9fe"
          active={lead.status === "snoozed"}
          disabled={busy}
          onClick={() => onDecide("snoozed")}
        />
        {lead.status !== "new" && (
          <ActionButton
            label="↩ Reset to new"
            color="#555"
            bg="#fafafa"
            active={false}
            disabled={busy}
            onClick={() => onDecide("new")}
          />
        )}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  color,
  bg,
  active,
  disabled,
  onClick,
}: {
  label: string
  color: string
  bg: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${active ? color : "transparent"}`,
        borderRadius: 6,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : active ? 1 : 0.85,
        outline: active ? `2px solid ${color}` : "none",
        outlineOffset: active ? 1 : 0,
      }}
    >
      {label}
    </button>
  )
}
