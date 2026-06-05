"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

// One flat queue entry per proposed edit. Shape matches the API response.
type QueueEntry = {
  card_id: string
  card_name: string
  issuer: string | null
  url: string | null
  page_signal: string
  field_path: string
  from_value: unknown
  to_value: unknown
  reason: string
  snippet: string | null
  current_override_url: string | null
}

type Verdict = "approved" | "dismissed" | "snoozed"

// Field paths that hold numeric values. Drives the Modify form's input type.
const NUMERIC_FIELDS = new Set<string>([
  "bonus_amount",
  "min_spend",
  "spend_months",
  "annual_fee",
])

// Field paths that hold booleans (the dead/redirected/missing flag).
const BOOLEAN_FIELDS = new Set<string>(["expired or offer_link"])

type OverrideRow = {
  id: string
  card_id: string
  override_url: string
  previous_url: string | null
  discovery_method: string
  created_at: string
}

const FIELD_LABELS: Record<string, string> = {
  "bonus_amount": "Welcome Bonus",
  "min_spend": "Minimum Spend ($)",
  "spend_months": "Spend Window (months)",
  "annual_fee": "Annual Fee ($)",
  "expired or offer_link": "Page issue — verify offer_link or mark expired",
}

function fieldLabel(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path]
  const leaf = path.split(".").pop() ?? path
  return leaf.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// Render any JSON-ish value as a short, readable string. Card fields:
//   bonus_amount  → number (could be points or dollars — show comma-separated)
//   min_spend     → dollar value
//   annual_fee    → dollar value
//   spend_months  → plain integer
function renderValue(path: string, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") {
    if (path === "min_spend" || path === "annual_fee") return `$${value.toLocaleString()}`
    if (path === "bonus_amount") return value.toLocaleString()
    return String(value)
  }
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

// Cheap deterministic fingerprint: lowercase, strip whitespace, take first 16
// chars of a simple polynomial hash. Good enough to tell "page changed" vs
// "page unchanged" — not a security primitive.
function fingerprint(s: string | null | undefined): string | null {
  if (!s) return null
  const normalized = s.toLowerCase().replace(/\s+/g, " ").trim()
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).slice(0, 16)
}

// Highlight the first dollar amount in the snippet so the eye lands on the
// number we're arguing about. We render the snippet as <pre> with three spans;
// the highlight span gets a yellow background.
function highlightSnippet(snippet: string): React.ReactNode {
  const re = /\$\s?[\d,]+(?:\.\d+)?/
  const m = snippet.match(re)
  if (!m || m.index === undefined) return snippet
  const before = snippet.slice(0, m.index)
  const hit = m[0]
  const after = snippet.slice(m.index + hit.length)
  return (
    <>
      {before}
      <span style={{ background: "#fde68a", fontWeight: 700, padding: "0 2px", borderRadius: 3 }}>{hit}</span>
      {after}
    </>
  )
}

export default function TriagePage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [stats, setStats] = useState({ approved: 0, dismissed: 0, skipped: 0 })
  const [decidedKeys, setDecidedKeys] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter UI — hidden behind a toggle on mobile.
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [fieldFilter, setFieldFilter] = useState<string>("all")

  // Found-URL workflow.
  const [urlFormOpen, setUrlFormOpen] = useState(false)
  const [urlFormFocusKey, setUrlFormFocusKey] = useState(0)
  const [overrides, setOverrides] = useState<OverrideRow[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Report-flag-issue workflow (Reject path — captures lesson, dismisses flag).
  const [reportFormOpen, setReportFormOpen] = useState(false)
  const [reportFormFocusKey, setReportFormFocusKey] = useState(0)

  // Modify workflow — admin supplies the correct value + lesson; approves with that value.
  const [modifyFormOpen, setModifyFormOpen] = useState(false)
  const [modifyFormFocusKey, setModifyFormFocusKey] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(data.user?.email === "booth.nathaniel@gmail.com")
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/admin?action=card-triage-queue")
    if (res.ok) {
      const data = await res.json()
      setQueue(data.queue ?? [])
      setLastRunAt(data.last_run_at ?? null)
      setCursor(0)
    } else {
      setError("Failed to load triage queue.")
    }
    setLoading(false)
  }, [])

  const loadOverrides = useCallback(async () => {
    const res = await fetch("/api/admin?action=card-url-overrides")
    if (res.ok) {
      const data = await res.json()
      setOverrides(data.overrides ?? [])
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    load()
    loadOverrides()
  }, [authed, load, loadOverrides])

  // Available field paths for the filter dropdown — derived from the queue.
  const availableFields = useMemo(() => {
    const set = new Set<string>()
    for (const q of queue) set.add(q.field_path)
    return Array.from(set).sort()
  }, [queue])

  // Filtered queue + remaining (un-decided in this session) subset. We keep
  // decided entries in the array so they stay addressable but skip them when
  // navigating prev/next.
  const filteredQueue = useMemo(() => {
    return queue.filter((q) => {
      if (search && !q.card_name.toLowerCase().includes(search.toLowerCase())) return false
      if (fieldFilter !== "all" && q.field_path !== fieldFilter) return false
      // (consensus UI was bonus-specific; card pages don't have a DoC sister source)
      return true
    })
  }, [queue, search, fieldFilter])

  const remaining = useMemo(
    () => filteredQueue.filter((q) => !decidedKeys.has(`${q.card_id}::${q.field_path}`)),
    [filteredQueue, decidedKeys],
  )

  // Clamp cursor to the available filtered set. When the filter shrinks the
  // queue past the cursor we reset back to start.
  useEffect(() => {
    if (cursor >= filteredQueue.length) setCursor(0)
  }, [filteredQueue.length, cursor])

  // Whenever the active card changes, collapse the URL form so the admin
  // doesn't carry stale form state from one bonus to the next.
  useEffect(() => {
    setUrlFormOpen(false)
    setReportFormOpen(false)
    setModifyFormOpen(false)
  }, [cursor])

  const current = filteredQueue[cursor]
  const currentKey = current ? `${current.card_id}::${current.field_path}` : null
  const currentDecided = currentKey ? decidedKeys.has(currentKey) : false

  // Move to the next entry that the admin hasn't yet acted on. Falls back
  // to "any next" if all are decided so the UI doesn't dead-end.
  const advance = useCallback(() => {
    if (filteredQueue.length === 0) return
    for (let step = 1; step <= filteredQueue.length; step++) {
      const idx = (cursor + step) % filteredQueue.length
      const k = `${filteredQueue[idx].card_id}::${filteredQueue[idx].field_path}`
      if (!decidedKeys.has(k)) {
        setCursor(idx)
        return
      }
    }
    setCursor((cursor + 1) % filteredQueue.length)
  }, [cursor, filteredQueue, decidedKeys])

  const goPrev = useCallback(() => {
    if (filteredQueue.length === 0) return
    setCursor((c) => (c - 1 + filteredQueue.length) % filteredQueue.length)
  }, [filteredQueue.length])

  const goNext = useCallback(() => {
    if (filteredQueue.length === 0) return
    setCursor((c) => (c + 1) % filteredQueue.length)
  }, [filteredQueue.length])

  const decide = useCallback(
    async (verdict: Verdict) => {
      if (!current || busy) return
      setBusy(true)
      setError(null)
      const res = await fetch("/api/admin?action=card-triage-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          field_path: current.field_path,
          verdict,
          from_value: current.from_value,
          to_value: current.to_value,
          snippet_fingerprint: fingerprint(current.snippet),
        }),
      })
      if (res.ok) {
        const key = `${current.card_id}::${current.field_path}`
        setDecidedKeys((prev) => new Set(prev).add(key))
        setStats((s) => ({
          approved: s.approved + (verdict === "approved" ? 1 : 0),
          dismissed: s.dismissed + (verdict === "dismissed" ? 1 : 0),
          skipped: s.skipped + (verdict === "snoozed" ? 1 : 0),
        }))
        // Defer the cursor advance one tick so React applies the decided
        // state before advance() reads it.
        setTimeout(() => advance(), 0)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Failed to record decision.")
      }
      setBusy(false)
    },
    [current, busy, advance],
  )

  // Submit a flag-issue report for the current card. The API also writes
  // a parallel "dismissed" decision so the flag leaves the queue.
  const submitFlagReport = useCallback(
    async (input: { issue_category: string; issue_description: string; suggested_fix: string }) => {
      if (!current || busy) return { ok: false, error: "no current card" as string }
      setBusy(true)
      setError(null)
      const res = await fetch("/api/admin?action=card-report-flag-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          field_path: current.field_path,
          from_value: current.from_value,
          to_value: current.to_value,
          url: current.url,
          page_signal: current.page_signal,
          snippet: current.snippet,
          snippet_fingerprint: fingerprint(current.snippet),
          issue_category: input.issue_category,
          issue_description: input.issue_description,
          suggested_fix: input.suggested_fix,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const err = body.error ?? "Failed to save report."
        setError(err)
        setBusy(false)
        return { ok: false, error: err }
      }
      const body = await res.json()
      const key = `${current.card_id}::${current.field_path}`
      setDecidedKeys((prev) => new Set(prev).add(key))
      setStats((s) => ({ ...s, dismissed: s.dismissed + (body.dismissed ? 1 : 0) }))
      setReportFormOpen(false)
      setSuccessMsg("Flag issue reported. Dismissed and saved for heuristic review.")
      setTimeout(() => setSuccessMsg(null), 2200)
      setTimeout(() => advance(), 0)
      setBusy(false)
      return { ok: true, error: null }
    },
    [current, busy, advance],
  )

  // Submit a Modify decision: admin supplies the correct value + lesson.
  // Server writes the flag_issue_reports row (with corrected_value) and a
  // parallel verification_decisions row with verdict='approved' and
  // to_value=corrected_value — so the existing bulk-apply pipeline patches
  // the catalog to the admin's value, not the verifier's extract.
  const submitModify = useCallback(
    async (input: {
      corrected_value: unknown
      issue_category: string
      issue_description: string
      suggested_fix: string
    }) => {
      if (!current || busy) return { ok: false, error: "no current card" as string }
      setBusy(true)
      setError(null)
      const res = await fetch("/api/admin?action=card-triage-modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          field_path: current.field_path,
          from_value: current.from_value,
          to_value: current.to_value,
          corrected_value: input.corrected_value,
          url: current.url,
          page_signal: current.page_signal,
          snippet: current.snippet,
          snippet_fingerprint: fingerprint(current.snippet),
          issue_category: input.issue_category,
          issue_description: input.issue_description,
          suggested_fix: input.suggested_fix,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const err = body.error ?? "Failed to save modification."
        setError(err)
        setBusy(false)
        return { ok: false, error: err }
      }
      const key = `${current.card_id}::${current.field_path}`
      setDecidedKeys((prev) => new Set(prev).add(key))
      setStats((s) => ({ ...s, approved: s.approved + 1 }))
      setModifyFormOpen(false)
      setSuccessMsg("Modification saved. Catalog will be patched to your value on next apply run.")
      setTimeout(() => setSuccessMsg(null), 2200)
      setTimeout(() => advance(), 0)
      setBusy(false)
      return { ok: true, error: null }
    },
    [current, busy, advance],
  )

  // Submit a found-URL override for the current card. Records the override,
  // also writes a parallel "snoozed" decision so the same edit doesn't
  // immediately reappear before the verify pipeline re-runs.
  const submitUrlOverride = useCallback(
    async (override_url: string, discovery_method: string) => {
      if (!current || busy) return { ok: false, error: "no current card" as string }
      setBusy(true)
      setError(null)
      const overrideRes = await fetch("/api/admin?action=card-url-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          override_url,
          previous_url: current.url,
          discovery_method,
        }),
      })
      if (!overrideRes.ok) {
        const body = await overrideRes.json().catch(() => ({}))
        const err = body.error ?? "Failed to save URL override."
        setError(err)
        setBusy(false)
        return { ok: false, error: err }
      }

      // Parallel snooze so this edit doesn't re-surface until the next
      // verify run (which will pick up the new URL).
      await fetch("/api/admin?action=card-triage-decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          field_path: current.field_path,
          verdict: "snoozed",
          from_value: current.from_value,
          to_value: current.to_value,
          snippet_fingerprint: fingerprint(current.snippet),
          notes: "URL replaced — re-verify with new URL",
        }),
      })

      const key = `${current.card_id}::${current.field_path}`
      setDecidedKeys((prev) => new Set(prev).add(key))
      setStats((s) => ({ ...s, skipped: s.skipped + 1 }))
      setUrlFormOpen(false)
      setSuccessMsg("URL override saved. Will be used on next verify run.")
      // Refresh overrides list so the audit footer reflects the new entry.
      loadOverrides()
      // Fade the toast after ~2s.
      setTimeout(() => setSuccessMsg(null), 2200)
      // Advance to next card on the next tick.
      setTimeout(() => advance(), 0)
      setBusy(false)
      return { ok: true, error: null }
    },
    [current, busy, advance, loadOverrides],
  )

  // Keyboard shortcuts: A approve, D reject (opens form), M modify (opens form),
  // S skip, U URL override, arrows for navigation.
  useEffect(() => {
    if (!authed) return
    function onKey(e: KeyboardEvent) {
      // Skip if the user is typing into the search box.
      const target = e.target as HTMLElement
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return
      if (e.key === "a" || e.key === "A") { e.preventDefault(); decide("approved") }
      else if (e.key === "d" || e.key === "D") {
        e.preventDefault()
        setReportFormOpen(true)
        setReportFormFocusKey((k) => k + 1)
      }
      else if (e.key === "m" || e.key === "M") {
        e.preventDefault()
        setModifyFormOpen(true)
        setModifyFormFocusKey((k) => k + 1)
      }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); decide("snoozed") }
      else if (e.key === "u" || e.key === "U") {
        e.preventDefault()
        setUrlFormOpen(true)
        // Bump focus key so the form re-focuses its URL input.
        setUrlFormFocusKey((k) => k + 1)
      }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev() }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [authed, decide, goPrev, goNext])

  if (authed === null) return <div style={{ padding: 40, color: "#999" }}>Checking access...</div>
  if (!authed) return <div style={{ padding: 40, color: "#ef4444", fontWeight: 600 }}>Unauthorized. Admin access only.</div>

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #e8e8e8", background: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <a href="/stacksos" style={{ fontSize: 18, fontWeight: 700, color: "#111", textDecoration: "none" }}>Stacks OS</a>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99 }}>ADMIN</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", padding: "2px 8px", borderRadius: 99 }}>CARD TRIAGE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#999" }}>
            Run {lastRunAt ? new Date(lastRunAt).toLocaleString() : "—"}
          </span>
          <a href="/admin" style={{ fontSize: 13, color: "#0d7c5f", textDecoration: "none" }}>&larr; back to admin</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>

        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          <StatTile label="In Queue" value={remaining.length} color="#111" />
          <StatTile label="Approved" value={stats.approved} color="#0d7c5f" />
          <StatTile label="Dismissed" value={stats.dismissed} color="#ef4444" />
          <StatTile label="Skipped" value={stats.skipped} color="#666" />
        </div>

        {/* Filter bar */}
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 0.4 }}>Filters</div>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#555", background: "#f5f5f5", border: "1px solid #e8e8e8", borderRadius: 6, cursor: "pointer" }}
            >
              {filterOpen ? "hide" : "show"}
            </button>
          </div>
          {filterOpen && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                placeholder="Search by bank name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "8px 10px", fontSize: 13, border: "1px solid #e8e8e8", borderRadius: 6, background: "#fafafa" }}
              />
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                style={{ padding: "8px 10px", fontSize: 13, border: "1px solid #e8e8e8", borderRadius: 6, background: "#fafafa" }}
              >
                <option value="all">All field types</option>
                {availableFields.map((f) => (
                  <option key={f} value={f}>{fieldLabel(f)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            style={{
              background: "#e6f5f0",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              transition: "opacity 200ms ease-out",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Main card */}
        {loading ? (
          <div style={{ color: "#999", padding: 24 }}>Loading queue…</div>
        ) : remaining.length === 0 ? (
          <EmptyState />
        ) : !current ? (
          <EmptyState />
        ) : (
          <TriageCard
            entry={current}
            cursor={cursor}
            total={filteredQueue.length}
            decided={currentDecided}
            busy={busy}
            onApprove={() => decide("approved")}
            onSkip={() => decide("snoozed")}
            onPrev={goPrev}
            onNext={goNext}
            urlFormOpen={urlFormOpen}
            urlFormFocusKey={urlFormFocusKey}
            onOpenUrlForm={() => { setUrlFormOpen(true); setUrlFormFocusKey((k) => k + 1) }}
            onCancelUrlForm={() => setUrlFormOpen(false)}
            onSubmitUrlOverride={submitUrlOverride}
            reportFormOpen={reportFormOpen}
            reportFormFocusKey={reportFormFocusKey}
            onOpenReportForm={() => { setReportFormOpen(true); setReportFormFocusKey((k) => k + 1) }}
            onCancelReportForm={() => setReportFormOpen(false)}
            onSubmitFlagReport={submitFlagReport}
            modifyFormOpen={modifyFormOpen}
            modifyFormFocusKey={modifyFormFocusKey}
            onOpenModifyForm={() => { setModifyFormOpen(true); setModifyFormFocusKey((k) => k + 1) }}
            onCancelModifyForm={() => setModifyFormOpen(false)}
            onSubmitModify={submitModify}
          />
        )}

        {/* Recent URL overrides — collapsed by default. */}
        <RecentOverrides overrides={overrides} />
      </div>
    </div>
  )
}

function RecentOverrides({ overrides }: { overrides: OverrideRow[] }) {
  const recent = overrides.slice(0, 10)
  return (
    <details style={{ marginTop: 20, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "10px 12px" }}>
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#111", listStyle: "revert" }}>
        Recent URL overrides ({overrides.length})
      </summary>
      {recent.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "#999" }}>No overrides recorded yet.</div>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {recent.map((o) => (
            <div
              key={o.id}
              style={{
                background: "#fafafa",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                color: "#333",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", color: "#7c3aed", fontWeight: 700 }}>{o.card_id}</span>
                <span style={{ color: "#bbb" }}>·</span>
                <span style={{ color: "#999", fontSize: 11 }}>{new Date(o.created_at).toLocaleString()}</span>
              </div>
              <a
                href={o.override_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#3b82f6", wordBreak: "break-all", fontSize: 12 }}
              >
                {o.override_url}
              </a>
              <div style={{ color: "#666", fontStyle: "italic" }}>
                {o.discovery_method.length > 140 ? o.discovery_method.slice(0, 140) + "…" : o.discovery_method}
              </div>
            </div>
          ))}
        </div>
      )}
    </details>
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

function EmptyState() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 8 }}>Queue empty.</div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Run the verifier to populate the next batch:
      </div>
      <code style={{ display: "inline-block", background: "#f5f5f5", border: "1px solid #e8e8e8", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#111" }}>
        npx tsx scripts/verify-cards/run.ts --persist
      </code>
    </div>
  )
}

function TriageCard({
  entry, cursor, total, decided, busy, onApprove, onSkip, onPrev, onNext,
  urlFormOpen, urlFormFocusKey, onOpenUrlForm, onCancelUrlForm, onSubmitUrlOverride,
  reportFormOpen, reportFormFocusKey, onOpenReportForm, onCancelReportForm, onSubmitFlagReport,
  modifyFormOpen, modifyFormFocusKey, onOpenModifyForm, onCancelModifyForm, onSubmitModify,
}: {
  entry: QueueEntry
  cursor: number
  total: number
  decided: boolean
  busy: boolean
  onApprove: () => void
  onSkip: () => void
  onPrev: () => void
  onNext: () => void
  urlFormOpen: boolean
  urlFormFocusKey: number
  onOpenUrlForm: () => void
  onCancelUrlForm: () => void
  onSubmitUrlOverride: (override_url: string, discovery_method: string) => Promise<{ ok: boolean; error: string | null }>
  reportFormOpen: boolean
  reportFormFocusKey: number
  onOpenReportForm: () => void
  onCancelReportForm: () => void
  onSubmitFlagReport: (input: { issue_category: string; issue_description: string; suggested_fix: string }) => Promise<{ ok: boolean; error: string | null }>
  modifyFormOpen: boolean
  modifyFormFocusKey: number
  onOpenModifyForm: () => void
  onCancelModifyForm: () => void
  onSubmitModify: (input: { corrected_value: unknown; issue_category: string; issue_description: string; suggested_fix: string }) => Promise<{ ok: boolean; error: string | null }>
}) {
  const buttonBase: React.CSSProperties = {
    flex: 1,
    minHeight: 48,
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    borderRadius: 8,
    cursor: busy ? "wait" : "pointer",
    padding: "10px 12px",
    opacity: busy ? 0.6 : 1,
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Top row: position, navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#999" }}>
        <span>{cursor + 1} / {total}</span>
        {decided && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99 }}>
            decided this session
          </span>
        )}
      </div>

      {/* Bonus identity */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{entry.card_name}</div>
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 4, fontFamily: "monospace" }}>{entry.card_id}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2563eb", wordBreak: "break-all" }}>
              {entry.url}
            </a>
          )}
        </div>
      </div>

      {/* Field path */}
      <div>
        <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>Field</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{fieldLabel(entry.field_path)}</div>
        <div style={{ fontSize: 11, color: "#999", fontFamily: "monospace", marginTop: 2 }}>{entry.field_path}</div>
      </div>

      {/* Stored vs Extracted side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>Stored</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#b91c1c", marginTop: 4, wordBreak: "break-word" }}>
            {renderValue(entry.field_path, entry.from_value)}
          </div>
        </div>
        <div style={{ background: "#f0faf5", border: "1px solid #a7f3d0", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>Extracted</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0d7c5f", marginTop: 4, wordBreak: "break-word" }}>
            {renderValue(entry.field_path, entry.to_value)}
          </div>
        </div>
      </div>

      {/* Snippet */}
      {entry.snippet && (
        <div>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 4 }}>Page Snippet</div>
          <pre style={{
            background: "#fafafa",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            color: "#333",
            lineHeight: 1.5,
            margin: 0,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}>
            {highlightSnippet(entry.snippet)}
          </pre>
        </div>
      )}

      {/* Page signal + issuer */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {entry.issuer && (
          <span style={{ fontSize: 11, color: "#666", background: "#f5f5f5", padding: "2px 8px", borderRadius: 99 }}>
            issuer: {entry.issuer}
          </span>
        )}
        <span style={{ fontSize: 11, color: "#666", background: "#f5f5f5", padding: "2px 8px", borderRadius: 99 }}>
          signal: {entry.page_signal}
        </span>
      </div>

      {/* Reason */}
      <div style={{ fontSize: 12, color: "#555", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px 10px" }}>
        <span style={{ fontWeight: 700, color: "#92400e" }}>Reason: </span>
        {entry.reason}
      </div>

      {/* Existing override badge — shows when this bonus already has an active override. */}
      {entry.current_override_url && !urlFormOpen && (
        <div
          onClick={onOpenUrlForm}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenUrlForm() } }}
          style={{
            cursor: "pointer",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 12,
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
          aria-label="URL override active — click to edit"
        >
          <span aria-hidden style={{ fontWeight: 700 }}>🔗 Override active:</span>
          <span style={{ wordBreak: "break-all" }}>{entry.current_override_url}</span>
        </div>
      )}

      {/* Primary action buttons: Approve / Reject / Modify.
          Approve = stored is wrong, accept extracted as the catalog value.
          Reject  = extracted is wrong, stored stays, admin writes a lesson.
          Modify  = both are wrong, admin enters the correct value + lesson. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onApprove}
          disabled={busy}
          aria-label="Approve — accept extracted (A)"
          style={{ ...buttonBase, background: "#0d7c5f", color: "#fff" }}
        >
          ✅ Approve
          <span style={{ display: "block", fontSize: 10, fontWeight: 500, opacity: 0.85 }}>A · accept extracted</span>
        </button>
        <button
          onClick={onOpenReportForm}
          disabled={busy || reportFormOpen}
          aria-label="Reject — extracted is wrong (D)"
          style={{ ...buttonBase, background: "#fee2e2", color: "#991b1b", opacity: busy || reportFormOpen ? 0.6 : 1 }}
        >
          ❌ Reject
          <span style={{ display: "block", fontSize: 10, fontWeight: 500, opacity: 0.85 }}>D · keep stored + teach</span>
        </button>
        <button
          onClick={onOpenModifyForm}
          disabled={busy || modifyFormOpen}
          aria-label="Modify — supply correct value (M)"
          style={{ ...buttonBase, background: "#ede9fe", color: "#5b21b6", opacity: busy || modifyFormOpen ? 0.6 : 1 }}
        >
          ✏️ Modify
          <span style={{ display: "block", fontSize: 10, fontWeight: 500, opacity: 0.85 }}>M · correct value + teach</span>
        </button>
      </div>

      {/* Secondary actions: Skip + Found URL. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={onSkip}
          disabled={busy}
          aria-label="Skip — decide later (S)"
          style={{
            flex: 1,
            minWidth: 160,
            minHeight: 44,
            fontSize: 13,
            fontWeight: 700,
            color: "#555",
            background: "#fff",
            border: "1px solid #d4d4d4",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.5 : 1,
          }}
        >
          ⏭ Skip
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, opacity: 0.85, marginLeft: 6 }}>S</span>
        </button>
        <button
          onClick={onOpenUrlForm}
          disabled={busy || urlFormOpen}
          aria-label="Found a better URL (U)"
          style={{
            flex: 1,
            minWidth: 160,
            minHeight: 44,
            fontSize: 13,
            fontWeight: 700,
            color: "#3b82f6",
            background: "#fff",
            border: "1px solid #3b82f6",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: busy || urlFormOpen ? "not-allowed" : "pointer",
            opacity: busy || urlFormOpen ? 0.5 : 1,
          }}
        >
          🔗 Found URL
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 500, opacity: 0.85, marginLeft: 6 }}>U</span>
        </button>
      </div>

      {/* Inline URL override form. */}
      {urlFormOpen && (
        <UrlOverrideForm
          key={urlFormFocusKey}
          initialUrl={entry.current_override_url ?? ""}
          busy={busy}
          onCancel={onCancelUrlForm}
          onSubmit={onSubmitUrlOverride}
        />
      )}

      {/* Inline flag-issue report form (Reject path). */}
      {reportFormOpen && (
        <FlagIssueReportForm
          key={reportFormFocusKey}
          busy={busy}
          onCancel={onCancelReportForm}
          onSubmit={onSubmitFlagReport}
        />
      )}

      {/* Inline modify form — correct value + lesson. */}
      {modifyFormOpen && (
        <ModifyForm
          key={modifyFormFocusKey}
          fieldPath={entry.field_path}
          storedValue={entry.from_value}
          extractedValue={entry.to_value}
          busy={busy}
          onCancel={onCancelModifyForm}
          onSubmit={onSubmitModify}
        />
      )}

      {/* Prev / next */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <button
          onClick={onPrev}
          aria-label="Previous (Left arrow)"
          style={{ flex: 1, minHeight: 44, fontSize: 13, fontWeight: 600, color: "#555", background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer" }}
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          aria-label="Next (Right arrow)"
          style={{ flex: 1, minHeight: 44, fontSize: 13, fontWeight: 600, color: "#555", background: "#fafafa", border: "1px solid #e8e8e8", borderRadius: 8, cursor: "pointer" }}
        >
          Next →
        </button>
      </div>

      <div style={{ fontSize: 10, color: "#bbb", textAlign: "center" }}>
        Keyboard: A approve · D reject (+teach) · M modify (+correct value +teach) · S skip · U found URL · ← → navigate
      </div>
    </div>
  )
}

const ISSUE_CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: "regex_false_positive", label: "Regex false positive", hint: "Pipeline matched a number that wasn't the bonus value (e.g. credit card APR, ATM fee, account count)." },
  { value: "wrong_page", label: "Wrong page fetched", hint: "URL hit a homepage / generic offer hub / stale page instead of the actual offer terms." },
  { value: "tier_mismatch", label: "Tier mismatch", hint: "Page lists multiple tiers; pipeline grabbed the wrong tier's number for the stored bonus." },
  { value: "conditional_value", label: "Conditional value", hint: "Extracted value is real but conditional (e.g. $0 fee only with DD, only under age 25)." },
  { value: "snippet_too_narrow", label: "Snippet too narrow", hint: "Snippet doesn't contain enough context to judge — pipeline should grab a wider window." },
  { value: "expired_misread", label: "Expired-flag misread", hint: "Pipeline thinks the offer expired but it's still live (or vice versa)." },
  { value: "other", label: "Other", hint: "" },
]

function FlagIssueReportForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  onCancel: () => void
  onSubmit: (input: { issue_category: string; issue_description: string; suggested_fix: string }) => Promise<{ ok: boolean; error: string | null }>
}) {
  const [category, setCategory] = useState<string>("regex_false_positive")
  const [issue, setIssue] = useState("")
  const [fix, setFix] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const issueRef = React.useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    issueRef.current?.focus()
  }, [])

  const selectedHint = ISSUE_CATEGORIES.find((c) => c.value === category)?.hint ?? ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (issue.trim().length < 20) {
      setLocalError("Describe the issue (at least 20 characters).")
      return
    }
    if (fix.trim().length < 20) {
      setLocalError("Describe the suggested fix (at least 20 characters).")
      return
    }
    setSubmitting(true)
    const res = await onSubmit({
      issue_category: category,
      issue_description: issue.trim(),
      suggested_fix: fix.trim(),
    })
    setSubmitting(false)
    if (!res.ok) setLocalError(res.error ?? "Failed to save.")
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    background: "#fafafa",
    color: "#111",
    boxSizing: "border-box",
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
        width: "100%",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
        Reject this flag — keep stored value, teach the verifier
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="report-category" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Issue category
        </label>
        <select
          id="report-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting || busy}
          style={inputBase}
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {selectedHint && (
          <div style={{ fontSize: 11, color: "#92400e", fontStyle: "italic" }}>{selectedHint}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="report-issue" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          What is this flag wrongly producing?
        </label>
        <textarea
          id="report-issue"
          ref={issueRef}
          required
          minLength={20}
          rows={4}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="e.g. Pipeline pulled $25,000 from the 'high yield checking' rate cap, not the bonus amount. The page advertises 4.50% APY up to $25,000 — that's the rate cap, not a bonus."
          disabled={submitting || busy}
          style={{ ...inputBase, fontFamily: "inherit", lineHeight: 1.4, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="report-fix" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          How should the pipeline avoid this next time?
        </label>
        <textarea
          id="report-fix"
          required
          minLength={20}
          rows={4}
          value={fix}
          onChange={(e) => setFix(e.target.value)}
          placeholder="e.g. Require 'bonus' or 'cash bonus' within ~80 chars of the matched dollar amount. Reject matches inside 'up to $X,XXX' phrasing when followed by 'APY' or 'rate'."
          disabled={submitting || busy}
          style={{ ...inputBase, fontFamily: "inherit", lineHeight: 1.4, resize: "vertical" }}
        />
        <div style={{ fontSize: 11, color: "#999" }}>
          Min 20 chars each. These notes train auto-triage-remaining.ts and the regex extractor.
        </div>
      </div>

      {localError && (
        <div style={{ fontSize: 12, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px" }}>
          {localError}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px" }}>
        Stored value stays. Lesson is saved and shown to the verifier on the next run.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting || busy}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "#b45309",
            border: "none",
            borderRadius: 8,
            cursor: submitting || busy ? "wait" : "pointer",
            opacity: submitting || busy ? 0.7 : 1,
          }}
        >
          {submitting ? "Saving…" : "Reject + save lesson"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#555",
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Parse the typed value into the JSON shape the API expects, based on field path.
function parseCorrectedValue(
  fieldPath: string,
  raw: string,
): { value: unknown; error: string | null } {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { value: undefined, error: "Enter the correct value." }

  if (BOOLEAN_FIELDS.has(fieldPath)) {
    if (/^(true|yes|1)$/i.test(trimmed)) return { value: true, error: null }
    if (/^(false|no|0)$/i.test(trimmed)) return { value: false, error: null }
    return { value: undefined, error: "Enter true or false." }
  }

  if (NUMERIC_FIELDS.has(fieldPath)) {
    const cleaned = trimmed.replace(/[$,\s]/g, "")
    const n = Number(cleaned)
    if (!Number.isFinite(n)) return { value: undefined, error: "Enter a valid number." }
    if (n < 0) return { value: undefined, error: "Value must be ≥ 0." }
    return { value: n, error: null }
  }

  return { value: trimmed, error: null }
}

function ModifyForm({
  fieldPath,
  storedValue,
  extractedValue,
  busy,
  onCancel,
  onSubmit,
}: {
  fieldPath: string
  storedValue: unknown
  extractedValue: unknown
  busy: boolean
  onCancel: () => void
  onSubmit: (input: {
    corrected_value: unknown
    issue_category: string
    issue_description: string
    suggested_fix: string
  }) => Promise<{ ok: boolean; error: string | null }>
}) {
  const [valueText, setValueText] = useState("")
  const [category, setCategory] = useState<string>("tier_mismatch")
  const [issue, setIssue] = useState("")
  const [fix, setFix] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const valueRef = React.useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    valueRef.current?.focus()
  }, [])

  const selectedHint = ISSUE_CATEGORIES.find((c) => c.value === category)?.hint ?? ""
  const isNumeric = NUMERIC_FIELDS.has(fieldPath)
  const isBoolean = BOOLEAN_FIELDS.has(fieldPath)
  const valueLabel = isBoolean
    ? "Correct value (true / false)"
    : isNumeric
      ? "Correct value (number)"
      : "Correct value"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    const parsed = parseCorrectedValue(fieldPath, valueText)
    if (parsed.error || parsed.value === undefined) {
      setLocalError(parsed.error ?? "Invalid value.")
      return
    }
    if (issue.trim().length < 20) {
      setLocalError("Describe what the verifier got wrong (at least 20 characters).")
      return
    }
    if (fix.trim().length < 20) {
      setLocalError("Describe how the verifier should find it next time (at least 20 characters).")
      return
    }
    setSubmitting(true)
    const res = await onSubmit({
      corrected_value: parsed.value,
      issue_category: category,
      issue_description: issue.trim(),
      suggested_fix: fix.trim(),
    })
    setSubmitting(false)
    if (!res.ok) setLocalError(res.error ?? "Failed to save.")
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    background: "#fafafa",
    color: "#111",
    boxSizing: "border-box",
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#f5f3ff",
        border: "1px solid #c4b5fd",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
        width: "100%",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>
        Modify — supply the correct value + teach the verifier
      </div>

      <div style={{ fontSize: 11, color: "#6b21a8" }}>
        Stored: <code>{JSON.stringify(storedValue)}</code> · Verifier extracted:{" "}
        <code>{JSON.stringify(extractedValue)}</code>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="modify-value" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {valueLabel}
        </label>
        <input
          id="modify-value"
          ref={valueRef}
          type="text"
          inputMode={isNumeric ? "decimal" : undefined}
          required
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          placeholder={isBoolean ? "true" : isNumeric ? "e.g. 500" : "e.g. correct text"}
          disabled={submitting || busy}
          style={inputBase}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="modify-category" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Issue category
        </label>
        <select
          id="modify-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting || busy}
          style={inputBase}
        >
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {selectedHint && (
          <div style={{ fontSize: 11, color: "#6b21a8", fontStyle: "italic" }}>{selectedHint}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="modify-issue" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          What did the verifier do wrong?
        </label>
        <textarea
          id="modify-issue"
          required
          minLength={20}
          rows={3}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="e.g. Picked up the $400 first tier instead of the $1,200 top tier. Page lists tiers in ascending order."
          disabled={submitting || busy}
          style={{ ...inputBase, fontFamily: "inherit", lineHeight: 1.4, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="modify-fix" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          How should the verifier find the right value next time?
        </label>
        <textarea
          id="modify-fix"
          required
          minLength={20}
          rows={3}
          value={fix}
          onChange={(e) => setFix(e.target.value)}
          placeholder="e.g. On tier pages, return the LARGEST plausible bonus amount, not the first match. Anchor to 'top tier' / 'maximum bonus' wording."
          disabled={submitting || busy}
          style={{ ...inputBase, fontFamily: "inherit", lineHeight: 1.4, resize: "vertical" }}
        />
        <div style={{ fontSize: 11, color: "#999" }}>
          Min 20 chars each. The next verify run shows the lesson to Claude when re-checking this field.
        </div>
      </div>

      {localError && (
        <div style={{ fontSize: 12, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px" }}>
          {localError}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 6, padding: "6px 10px" }}>
        Catalog will be patched to your value on the next bulk-apply run.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting || busy}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "#5b21b6",
            border: "none",
            borderRadius: 8,
            cursor: submitting || busy ? "wait" : "pointer",
            opacity: submitting || busy ? 0.7 : 1,
          }}
        >
          {submitting ? "Saving…" : "Modify + save lesson"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#555",
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function UrlOverrideForm({
  initialUrl,
  busy,
  onCancel,
  onSubmit,
}: {
  initialUrl: string
  busy: boolean
  onCancel: () => void
  onSubmit: (override_url: string, discovery_method: string) => Promise<{ ok: boolean; error: string | null }>
}) {
  const [url, setUrl] = useState(initialUrl)
  const [discovery, setDiscovery] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const urlInputRef = React.useRef<HTMLInputElement | null>(null)

  // Focus the URL field on mount (covers both keyboard-U and click-trigger).
  useEffect(() => {
    urlInputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Client-side validation that mirrors the API.
    let parsed: URL | null = null
    try {
      parsed = new URL(url.trim())
    } catch {
      setLocalError("Enter a valid URL (including https://).")
      return
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setLocalError("URL must start with http:// or https://.")
      return
    }
    if (discovery.trim().length < 10) {
      setLocalError("Describe how you found it (at least 10 characters).")
      return
    }

    setSubmitting(true)
    const res = await onSubmit(url.trim(), discovery.trim())
    setSubmitting(false)
    if (!res.ok) {
      setLocalError(res.error ?? "Failed to save.")
    }
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    background: "#fafafa",
    color: "#111",
    boxSizing: "border-box",
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#f8fafc",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
        width: "100%",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af" }}>
        Record a better URL for this bonus
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="override-url" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          New URL
        </label>
        <input
          id="override-url"
          ref={urlInputRef}
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.bank.com/checking/offer-page"
          disabled={submitting || busy}
          style={inputBase}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label htmlFor="override-discovery" style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
          How you found it
        </label>
        <textarea
          id="override-discovery"
          required
          minLength={10}
          rows={4}
          value={discovery}
          onChange={(e) => setDiscovery(e.target.value)}
          placeholder="Googled '<bank name> $<amount> checking bonus 2026' — DoC's article was result #2 and linked to the actual bank page footer."
          disabled={submitting || busy}
          style={{ ...inputBase, fontFamily: "inherit", lineHeight: 1.4, resize: "vertical" }}
        />
        <div style={{ fontSize: 11, color: "#999" }}>
          Min 10 chars. Be specific — these notes train the find-offer-links script.
        </div>
      </div>

      {localError && (
        <div style={{ fontSize: 12, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px" }}>
          {localError}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting || busy}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            background: "#0d7c5f",
            border: "none",
            borderRadius: 8,
            cursor: submitting || busy ? "wait" : "pointer",
            opacity: submitting || busy ? 0.7 : 1,
          }}
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            flex: 1,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            color: "#555",
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
