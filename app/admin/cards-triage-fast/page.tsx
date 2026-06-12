"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * /admin/cards-triage-fast — high-velocity triage for verify:cards
 * proposed edits.
 *
 * Design goals (vs the older /admin/card-triage which is comprehensive
 * but one-edit-at-a-time):
 *   - Group every proposed edit on a single card into ONE decision card,
 *     so a card with 3 mismatches is decided in one keystroke, not three.
 *   - Keyboard-only flow: A / D / S / U / arrows. Mouse is the fallback.
 *   - Bulk-by-pattern: a top-bar button "Dismiss all 35 redirected_to_generic"
 *     wipes a whole class of false positives at once. The biggest source
 *     of triage fatigue is the same SPA/anti-bot signal repeating across
 *     dozens of cards we know are real.
 *   - Visual snippet evidence + a one-click URL override box per card.
 *
 * Same Supabase backend as the v1 page (`card_verifications`,
 * `card_verification_decisions`, `card_url_overrides`); the API endpoints
 * are unchanged — this is purely a UI rewrite for speed.
 */

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

const FIELD_LABELS: Record<string, string> = {
  bonus_amount: "Welcome Bonus",
  min_spend: "Min Spend ($)",
  spend_months: "Spend Window (mo)",
  annual_fee: "Annual Fee ($)",
  "expired or offer_link": "Page-level flag",
}

function fieldLabel(path: string): string {
  return FIELD_LABELS[path] ?? path.replace(/_/g, " ")
}

function renderValue(path: string, value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") {
    if (path === "min_spend" || path === "annual_fee") return `$${value.toLocaleString()}`
    if (path === "bonus_amount") return value.toLocaleString()
    return String(value)
  }
  if (typeof value === "string") return value
  return JSON.stringify(value)
}

function fingerprint(s: string | null | undefined): string | null {
  if (!s) return null
  const normalized = s.toLowerCase().replace(/\s+/g, " ").trim()
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).slice(0, 16)
}

// Classify the source of an edit so we can color/sort. The verifier
// emits three flavors: regex (~95% accurate), page-signal (a flag like
// "redirected_to_generic" — high false-positive on SPAs), and Claude
// (LLM-inferred, lowest accuracy on busy pages).
type Source = "regex" | "page-signal" | "claude" | "other"
function sourceOf(reason: string): Source {
  if (/Page signal/i.test(reason)) return "page-signal"
  if (/Claude:/i.test(reason)) return "claude"
  if (/regex/i.test(reason)) return "regex"
  return "other"
}

const SOURCE_PALETTE: Record<Source, { bg: string; fg: string; border: string; label: string }> = {
  regex: { bg: "#e8f4ea", fg: "#1f6b34", border: "#cbe4d2", label: "regex" },
  "page-signal": { bg: "#fdf3e0", fg: "#8a5a00", border: "#f0dba8", label: "page" },
  claude: { bg: "#ebe6fb", fg: "#4a3590", border: "#d5cbf0", label: "AI" },
  other: { bg: "#eee", fg: "#555", border: "#ddd", label: "other" },
}

type CardGroup = {
  card_id: string
  card_name: string
  issuer: string | null
  url: string | null
  page_signal: string
  current_override_url: string | null
  edits: QueueEntry[]
}

function groupByCard(queue: QueueEntry[]): CardGroup[] {
  const map = new Map<string, CardGroup>()
  for (const q of queue) {
    const g = map.get(q.card_id) ?? {
      card_id: q.card_id,
      card_name: q.card_name,
      issuer: q.issuer,
      url: q.url,
      page_signal: q.page_signal,
      current_override_url: q.current_override_url,
      edits: [] as QueueEntry[],
    }
    g.edits.push(q)
    map.set(q.card_id, g)
  }
  return Array.from(map.values())
}

type OverrideRow = {
  id: string
  card_id: string
  override_url: string
  previous_url: string | null
  discovery_method: string
  created_at: string
}

export default function FastTriagePage() {
  const supabase = createClient()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [decidedCardIds, setDecidedCardIds] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState(0)
  const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all")
  const [hidePageSignal, setHidePageSignal] = useState(false)
  const [search, setSearch] = useState("")
  const [urlOverrideOpen, setUrlOverrideOpen] = useState(false)
  const [urlOverrideValue, setUrlOverrideValue] = useState("")
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
      setDecidedCardIds(new Set())
      setCursor(0)
    } else {
      setError("Failed to load triage queue.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) load()
  }, [authed, load])

  // Filter pipeline: search → source filter → hide-page-signal toggle.
  const filtered = useMemo(() => {
    return queue.filter((q) => {
      if (hidePageSignal && sourceOf(q.reason) === "page-signal") return false
      if (sourceFilter !== "all" && sourceOf(q.reason) !== sourceFilter) return false
      if (search) {
        const needle = search.toLowerCase()
        if (
          !q.card_name.toLowerCase().includes(needle) &&
          !(q.issuer ?? "").toLowerCase().includes(needle) &&
          !q.field_path.toLowerCase().includes(needle)
        ) {
          return false
        }
      }
      return true
    })
  }, [queue, sourceFilter, hidePageSignal, search])

  const grouped = useMemo(() => groupByCard(filtered), [filtered])
  const remaining = useMemo(() => grouped.filter((g) => !decidedCardIds.has(g.card_id)), [grouped, decidedCardIds])
  const current = remaining[cursor]
  const totalGrouped = grouped.length
  const decidedCount = decidedCardIds.size
  const progress = totalGrouped > 0 ? Math.round((decidedCount / totalGrouped) * 100) : 0

  // Bucket counts by source so the top bar can show "Dismiss all 35 page-signal".
  const sourceCounts = useMemo(() => {
    const c: Record<Source, number> = { regex: 0, "page-signal": 0, claude: 0, other: 0 }
    for (const g of remaining) {
      for (const e of g.edits) {
        c[sourceOf(e.reason)]++
      }
    }
    return c
  }, [remaining])

  // Bulk-dismiss a whole source bucket. Used to one-click clear the
  // 25-50 false-positive page-signal flags from SPA/anti-bot pages.
  const bulkDismiss = useCallback(async (source: Source) => {
    if (busy) return
    setBusy(true)
    const targets = filtered.filter((q) => sourceOf(q.reason) === source)
    let ok = 0
    let fail = 0
    for (const q of targets) {
      try {
        const res = await fetch("/api/admin?action=card-triage-decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_id: q.card_id,
            field_path: q.field_path,
            verdict: "dismissed",
            from_value: q.from_value,
            to_value: q.to_value,
            snippet_fingerprint: fingerprint(q.snippet),
            notes: `bulk-dismiss ${source}`,
          }),
        })
        if (res.ok) ok++
        else fail++
      } catch {
        fail++
      }
    }
    const dismissedCardIds = new Set(targets.map((t) => t.card_id))
    setDecidedCardIds((prev) => {
      const next = new Set(prev)
      for (const id of dismissedCardIds) next.add(id)
      return next
    })
    setSuccessMsg(`Bulk-dismissed ${ok} edits (${source}${fail ? `, ${fail} failed` : ""}).`)
    setTimeout(() => setSuccessMsg(null), 3000)
    setBusy(false)
  }, [filtered, busy])

  // Decide one edit. Caller is responsible for marking the card decided
  // once all its edits are processed (this fn just records the verdict).
  const decideEdit = useCallback(async (q: QueueEntry, verdict: Verdict) => {
    const res = await fetch("/api/admin?action=card-triage-decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: q.card_id,
        field_path: q.field_path,
        verdict,
        from_value: q.from_value,
        to_value: q.to_value,
        snippet_fingerprint: fingerprint(q.snippet),
      }),
    })
    return res.ok
  }, [])

  // Decide ALL edits on the current card with the same verdict + advance.
  const decideCurrentCard = useCallback(async (verdict: Verdict) => {
    if (!current || busy) return
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const e of current.edits) {
      const success = await decideEdit(e, verdict)
      if (success) ok++
      else fail++
    }
    if (ok > 0) {
      setDecidedCardIds((prev) => new Set(prev).add(current.card_id))
      // Cursor stays at same index — remaining[] shrinks underneath it
      // so the NEXT card slides into view.
    }
    if (fail > 0) {
      setError(`${fail} edit(s) failed to record.`)
      setTimeout(() => setError(null), 4000)
    }
    setBusy(false)
  }, [current, busy, decideEdit])

  // Decide a SINGLE edit (e.g. user wants to accept one mismatch but
  // dismiss the others on the same card).
  const decideOneEdit = useCallback(async (q: QueueEntry, verdict: Verdict) => {
    if (busy) return
    setBusy(true)
    const success = await decideEdit(q, verdict)
    if (success) {
      // Optimistic: remove this edit from queue. If it was the LAST
      // edit on the card, also mark the card decided.
      setQueue((prev) => prev.filter((x) => !(x.card_id === q.card_id && x.field_path === q.field_path)))
      // If no more edits on the card, mark decided.
      const remainingOnCard = filtered.filter((x) => x.card_id === q.card_id && !(x.card_id === q.card_id && x.field_path === q.field_path))
      if (remainingOnCard.length === 0) {
        setDecidedCardIds((prev) => new Set(prev).add(q.card_id))
      }
    }
    setBusy(false)
  }, [decideEdit, busy, filtered])

  // URL override — common follow-up when a page-signal flag fires.
  const submitUrlOverride = useCallback(async () => {
    if (!current || !urlOverrideValue.trim()) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin?action=card-url-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: current.card_id,
          override_url: urlOverrideValue.trim(),
          discovery_method: "fast-triage",
        }),
      })
      if (res.ok) {
        setSuccessMsg(`URL override saved for ${current.card_name}.`)
        // Also dismiss the page-signal edit since the new URL is the fix.
        for (const e of current.edits) {
          if (e.field_path === "expired or offer_link") {
            await decideEdit(e, "dismissed")
          }
        }
        setDecidedCardIds((prev) => new Set(prev).add(current.card_id))
        setUrlOverrideOpen(false)
        setUrlOverrideValue("")
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        setError("URL override failed.")
      }
    } catch {
      setError("URL override failed.")
    }
    setBusy(false)
  }, [current, urlOverrideValue, decideEdit])

  // Keyboard shortcuts. Skipped when a text input has focus (so search
  // bar typing isn't interpreted as A/D/S commands).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        if (e.key === "Escape") (target as HTMLInputElement).blur()
        return
      }
      if (urlOverrideOpen) {
        if (e.key === "Escape") {
          e.preventDefault()
          setUrlOverrideOpen(false)
        }
        return
      }
      if (busy || !current) return
      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault()
          decideCurrentCard("approved")
          break
        case "d":
          e.preventDefault()
          decideCurrentCard("dismissed")
          break
        case "s":
          e.preventDefault()
          decideCurrentCard("snoozed")
          break
        case "u":
          e.preventDefault()
          setUrlOverrideOpen(true)
          setUrlOverrideValue(current.url ?? "")
          break
        case "j":
        case "arrowdown":
          e.preventDefault()
          setCursor((c) => Math.min(c + 1, remaining.length - 1))
          break
        case "k":
        case "arrowup":
          e.preventDefault()
          setCursor((c) => Math.max(c - 1, 0))
          break
        case "/":
          e.preventDefault()
          ;(document.getElementById("triage-search") as HTMLInputElement | null)?.focus()
          break
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [current, remaining.length, decideCurrentCard, busy, urlOverrideOpen])

  // Scroll the active card into view as the cursor advances.
  useEffect(() => {
    if (!current) return
    const el = cardRefs.current.get(current.card_id)
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [current])

  if (authed === null) {
    return <div style={shellStyle}>Authenticating…</div>
  }
  if (authed === false) {
    return <div style={shellStyle}>Not authorized. Sign in as the admin email.</div>
  }

  return (
    <div style={shellStyle}>
      <Header
        progress={progress}
        decided={decidedCount}
        total={totalGrouped}
        remaining={remaining.length}
        lastRunAt={lastRunAt}
        onReload={load}
        loading={loading}
      />

      <FilterBar
        search={search}
        setSearch={setSearch}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        hidePageSignal={hidePageSignal}
        setHidePageSignal={setHidePageSignal}
        sourceCounts={sourceCounts}
        onBulkDismiss={bulkDismiss}
        busy={busy}
      />

      {error && <Banner kind="error">{error}</Banner>}
      {successMsg && <Banner kind="success">{successMsg}</Banner>}

      {loading && <div style={{ padding: 24, color: "#999" }}>Loading queue…</div>}

      {!loading && remaining.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", color: "#666" }}>
          {totalGrouped === 0
            ? "Triage queue is empty. Run `npm run verify:cards -- --persist` to populate."
            : "All cards triaged for this run. Click reload to fetch a new run."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {remaining.map((g, i) => (
          <div
            key={g.card_id}
            ref={(el) => {
              if (el) cardRefs.current.set(g.card_id, el)
            }}
            style={{
              border: i === cursor ? "2px solid #0d7c5f" : "1px solid #e8e8e8",
              background: "#fff",
              borderRadius: 14,
              padding: 18,
              boxShadow: i === cursor ? "0 4px 16px rgba(13, 124, 95, 0.12)" : "none",
              transition: "border-color 120ms, box-shadow 120ms",
            }}
            onClick={() => setCursor(i)}
          >
            <DecisionCard
              group={g}
              isActive={i === cursor}
              onDecideOne={decideOneEdit}
              busy={busy}
            />
          </div>
        ))}
      </div>

      {urlOverrideOpen && current && (
        <UrlOverrideModal
          card={current}
          value={urlOverrideValue}
          onChange={setUrlOverrideValue}
          onClose={() => setUrlOverrideOpen(false)}
          onSubmit={submitUrlOverride}
          busy={busy}
        />
      )}

      <KeyboardLegend />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────

const shellStyle: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "32px 24px 96px",
  color: "#111",
  fontFamily: "system-ui, -apple-system, sans-serif",
}

function Header({ progress, decided, total, remaining, lastRunAt, onReload, loading }: {
  progress: number
  decided: number
  total: number
  remaining: number
  lastRunAt: string | null
  onReload: () => void
  loading: boolean
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
          Cards Triage (fast)
        </h1>
        <button
          onClick={onReload}
          disabled={loading}
          style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer" }}
        >
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
        {lastRunAt ? `Last verify:cards run · ${new Date(lastRunAt).toLocaleString()}` : "No run yet"}
        {total > 0 && ` · ${decided} of ${total} decided · ${remaining} remaining`}
      </div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: 6, width: `${progress}%`, background: "#0d7c5f", transition: "width 150ms" }} />
      </div>
    </div>
  )
}

function FilterBar({
  search, setSearch,
  sourceFilter, setSourceFilter,
  hidePageSignal, setHidePageSignal,
  sourceCounts,
  onBulkDismiss,
  busy,
}: {
  search: string
  setSearch: (v: string) => void
  sourceFilter: "all" | Source
  setSourceFilter: (v: "all" | Source) => void
  hidePageSignal: boolean
  setHidePageSignal: (v: boolean) => void
  sourceCounts: Record<Source, number>
  onBulkDismiss: (s: Source) => void
  busy: boolean
}) {
  return (
    <div style={{ marginBottom: 18, padding: 14, background: "#f8f8f8", borderRadius: 10, border: "1px solid #eee" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          id="triage-search"
          type="search"
          placeholder="Filter by card name, issuer, field…  ( / focuses )"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 280px", padding: "7px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff" }}
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as "all" | Source)}
          style={{ padding: "7px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, background: "#fff" }}
        >
          <option value="all">All sources</option>
          <option value="regex">Regex ({sourceCounts.regex})</option>
          <option value="page-signal">Page signal ({sourceCounts["page-signal"]})</option>
          <option value="claude">AI ({sourceCounts.claude})</option>
        </select>
        <label style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={hidePageSignal}
            onChange={(e) => setHidePageSignal(e.target.checked)}
          />
          Hide page-signal (often false-positive on SPA/anti-bot)
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(["regex", "page-signal", "claude"] as const).map((s) => {
          if (sourceCounts[s] === 0) return null
          const p = SOURCE_PALETTE[s]
          return (
            <button
              key={s}
              disabled={busy}
              onClick={() => {
                if (confirm(`Dismiss all ${sourceCounts[s]} ${s} edits? This marks them rejected in Supabase.`)) {
                  onBulkDismiss(s)
                }
              }}
              style={{
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                background: p.bg,
                color: p.fg,
                border: `1px solid ${p.border}`,
                borderRadius: 6,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Dismiss all {sourceCounts[s]} {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DecisionCard({
  group, isActive, onDecideOne, busy,
}: {
  group: CardGroup
  isActive: boolean
  onDecideOne: (e: QueueEntry, v: Verdict) => Promise<void>
  busy: boolean
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{group.card_name}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            {group.issuer && <span>{group.issuer} · </span>}
            <span style={{ color: signalColor(group.page_signal) }}>{group.page_signal}</span>
          </div>
          {group.url && (
            <a href={group.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#0d7c5f", textDecoration: "none", wordBreak: "break-all" }}>
              {group.url}
            </a>
          )}
          {group.current_override_url && (
            <div style={{ fontSize: 11, color: "#8a5a00", marginTop: 4 }}>
              ↳ override: <a href={group.current_override_url} target="_blank" rel="noopener noreferrer" style={{ color: "#8a5a00" }}>{group.current_override_url}</a>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>
          {group.edits.length} edit{group.edits.length > 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {group.edits.map((e, i) => (
          <EditRow key={`${e.card_id}-${e.field_path}`} edit={e} index={i + 1} onDecide={onDecideOne} busy={busy} />
        ))}
      </div>

      {isActive && (
        <div style={{ display: "flex", gap: 6, fontSize: 11, color: "#666" }}>
          <Kbd>A</Kbd> approve all
          <Kbd>D</Kbd> dismiss all
          <Kbd>S</Kbd> snooze
          {group.page_signal !== "ok" && (
            <>
              <Kbd>U</Kbd> URL override
            </>
          )}
          <Kbd>J</Kbd>/<Kbd>K</Kbd> nav
        </div>
      )}
    </>
  )
}

function EditRow({
  edit, index, onDecide, busy,
}: {
  edit: QueueEntry
  index: number
  onDecide: (e: QueueEntry, v: Verdict) => Promise<void>
  busy: boolean
}) {
  const src = sourceOf(edit.reason)
  const palette = SOURCE_PALETTE[src]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fafafa", border: "1px solid #eee", borderRadius: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#bbb", width: 14 }}>{index}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, color: "#444" }}>{fieldLabel(edit.field_path)}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {palette.label}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 3 }}>
          <span style={{ color: "#aa3232" }}>{renderValue(edit.field_path, edit.from_value)}</span>
          <span style={{ color: "#999", margin: "0 6px" }}>→</span>
          <span style={{ color: "#0d7c5f", fontWeight: 600 }}>{renderValue(edit.field_path, edit.to_value)}</span>
        </div>
        <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{edit.reason}</div>
        {edit.snippet && (
          <div style={{ fontSize: 10, color: "#666", marginTop: 4, padding: "4px 6px", background: "#fff", border: "1px solid #eee", borderRadius: 4, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>
            {edit.snippet.slice(0, 220)}
            {edit.snippet.length > 220 && "…"}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button disabled={busy} onClick={() => onDecide(edit, "approved")} style={btnTinyStyle("#0d7c5f", "#fff")}>✓</button>
        <button disabled={busy} onClick={() => onDecide(edit, "dismissed")} style={btnTinyStyle("#aa3232", "#fff")}>✗</button>
        <button disabled={busy} onClick={() => onDecide(edit, "snoozed")} style={btnTinyStyle("#888", "#fff")}>~</button>
      </div>
    </div>
  )
}

function btnTinyStyle(bg: string, fg: string): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    fontSize: 13,
    fontWeight: 700,
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ padding: "1px 5px", background: "#fff", border: "1px solid #ddd", borderBottom: "2px solid #ccc", borderRadius: 3, fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#333" }}>
      {children}
    </kbd>
  )
}

function signalColor(signal: string): string {
  if (signal === "ok") return "#1f6b34"
  if (signal === "card_name_mismatch") return "#aa3232"
  if (signal === "redirected_to_generic") return "#8a5a00"
  if (signal === "no_fields_extracted") return "#666"
  if (signal === "offer_dead") return "#aa3232"
  if (signal === "fetch_error") return "#aa3232"
  return "#444"
}

function Banner({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const palette = kind === "error"
    ? { bg: "#fcecec", fg: "#aa3232", border: "#f0c4c4" }
    : { bg: "#eafaf3", fg: "#0d6e51", border: "#cae8db" }
  return (
    <div style={{ padding: "10px 14px", background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
      {children}
    </div>
  )
}

function UrlOverrideModal({
  card, value, onChange, onClose, onSubmit, busy,
}: {
  card: CardGroup
  value: string
  onChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
  busy: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 22, width: "min(560px, 90vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Set URL override for {card.card_name}</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
          Verifier couldn't read the offer page. Paste the correct one and the next verify run will use it.
        </div>
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit()
            if (e.key === "Escape") onClose()
          }}
          style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, marginBottom: 14, fontFamily: "ui-monospace, monospace" }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 14px", fontSize: 13, background: "#eee", border: "none", borderRadius: 6, cursor: "pointer" }}>
            Cancel
          </button>
          <button disabled={busy || !value.trim()} onClick={onSubmit} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 700, background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 6, cursor: busy ? "wait" : "pointer" }}>
            Save override
          </button>
        </div>
      </div>
    </div>
  )
}

function KeyboardLegend() {
  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, background: "rgba(255,255,255,0.96)", border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#555", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
      <Kbd>A</Kbd> approve · <Kbd>D</Kbd> dismiss · <Kbd>S</Kbd> snooze · <Kbd>U</Kbd> URL fix · <Kbd>J</Kbd>/<Kbd>K</Kbd> nav · <Kbd>/</Kbd> search
    </div>
  )
}
