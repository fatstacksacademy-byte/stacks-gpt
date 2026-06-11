"use client"

// Stacks OS — Credit-Card Inventory + Chase 5/24 Tracker (UI)
//
// Educational tool only. Not credit or financial advice. The 5/24 math
// (lib/five24), credit-report import route, and persistence (lib/cardAccounts)
// are tested and owned elsewhere — this file is purely the UI over them.

import React, { useEffect, useMemo, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import { computeFive24, type Five24Status } from "../../../lib/five24"
import {
  getCardAccounts,
  insertCardAccounts,
  deleteCardAccount,
  type CardAccount,
} from "../../../lib/cardAccounts"
import type { CardAccountDraft } from "../../../lib/creditReportImport"
import { createClient } from "../../../lib/supabase/client"

// ----------------------------------------------------------------------------
// Shared style constants (matching the codebase aesthetic — see DebtClient)
// ----------------------------------------------------------------------------

const cardBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
}

const label: React.CSSProperties = {
  fontSize: 11, color: "#999", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6,
}

const primaryBtn: React.CSSProperties = {
  background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
}

const secondaryBtn: React.CSSProperties = {
  background: "#fff", color: "#666", border: "1px solid #e0e0e0", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#999", border: "1px solid #e8e8e8", borderRadius: 6,
  padding: "6px 12px", fontSize: 12, cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111",
  border: "1px solid #e0e0e0", borderRadius: 6, width: "100%",
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#fff", color: "#111",
  border: "1px solid #e0e0e0", borderRadius: 6, width: "100%",
}

const fieldLabel: React.CSSProperties = { fontSize: 11, color: "#777", marginBottom: 4, display: "block" }
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 4 }
const muted: React.CSSProperties = { fontSize: 12, color: "#999", lineHeight: 1.5 }

const ACCENT = "#0d7c5f"
const AMBER = "#b45309"
const RED = "#dc2626"

const MAX_IMPORT_BYTES = 20 * 1024 * 1024 // 20 MB — mirrors the route's limit
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

const todayISO = () => new Date().toISOString().split("T")[0]

function num(v: string): number | null {
  if (v.trim() === "") return null
  const n = parseFloat(v.replace(/[$,\s]/g, ""))
  return Number.isFinite(n) ? n : null
}

function fmtLimit(v: number | null): string {
  if (v == null) return "—"
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function cardTitle(c: { issuer: string; product_name: string | null }): string {
  return [c.issuer, c.product_name].filter(Boolean).join(" ") || "Unknown card"
}

// A small inline notice (warn / error / info severities).
function NoticeBox({ severity, children }: { severity: "critical" | "warn" | "info"; children: React.ReactNode }) {
  const color = severity === "critical" ? RED : severity === "warn" ? AMBER : "#6b7280"
  const bg = severity === "critical" ? "#fef2f2" : severity === "warn" ? "#fffbeb" : "#f9fafb"
  return (
    <div
      style={{
        fontSize: 12.5, lineHeight: 1.45, padding: "8px 10px", borderRadius: 6,
        background: bg, color, border: `1px solid ${color}22`,
      }}
    >
      {children}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Root component
// ----------------------------------------------------------------------------

export default function CardInventoryClient() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [asOf, setAsOf] = useState<string>("")
  const [cards, setCards] = useState<CardAccount[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      setUserEmail(data.user?.email ?? null)
      setAsOf(todayISO())
      if (uid) {
        const rows = await getCardAccounts(uid)
        if (cancelled) return
        setCards(rows)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Re-fetch the inventory from the source of truth.
  async function refresh() {
    if (!userId) return
    const rows = await getCardAccounts(userId)
    setCards(rows)
  }

  if (loading) {
    return (
      <>
        <CheckpointNav />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>Loading…</div>
      </>
    )
  }

  const effectiveAsOf = asOf || todayISO()

  return (
    <>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 64px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Card Inventory &amp; Chase 5/24 Tracker</h1>
          <div style={{ ...muted, marginTop: 4 }}>
            Track every credit card you hold and see where you stand against Chase&rsquo;s 5/24 rule.
            {userEmail ? <> Signed in as <b style={{ color: "#555" }}>{userEmail}</b>.</> : null}
          </div>
        </div>

        <Five24Hero cards={cards} asOf={effectiveAsOf} />

        <ImportSection userId={userId} onSaved={refresh} />

        <AddManualSection userId={userId} onSaved={refresh} />

        <InventoryList cards={cards} onDeleted={refresh} />

        <GuardrailFooter />
      </div>
    </>
  )
}

// ----------------------------------------------------------------------------
// 2. 5/24 status hero
// ----------------------------------------------------------------------------

function Five24Hero({ cards, asOf }: { cards: CardAccount[]; asOf: string }) {
  const [showContributors, setShowContributors] = useState(false)

  const status: Five24Status = useMemo(
    () => computeFive24(
      cards.map(c => ({
        id: c.id,
        issuer: c.issuer,
        product_name: c.product_name,
        card_type: c.card_type,
        open_date: c.open_date,
      })),
      asOf,
    ),
    [cards, asOf],
  )

  const under = status.under_524
  const badgeColor = under ? ACCENT : status.count >= 5 ? RED : AMBER
  const badgeBg = under ? "#ecfdf5" : status.count >= 5 ? "#fef2f2" : "#fffbeb"
  const badgeText = under
    ? "Under 5/24 — Chase approvals likely"
    : "At 5/24 — most Chase cards will be declined"

  return (
    <div style={{ ...cardBox, borderColor: `${badgeColor}55` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: badgeColor, lineHeight: 1 }}>
            {status.count} <span style={{ fontSize: 24, color: "#bbb", fontWeight: 700 }}>/ 24</span>
          </div>
          <div style={{ ...label, marginTop: 6, marginBottom: 0 }}>Personal cards (24 mo)</div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <span style={{
            display: "inline-block", fontSize: 13, fontWeight: 700, color: badgeColor,
            background: badgeBg, border: `1px solid ${badgeColor}44`, borderRadius: 999, padding: "5px 14px",
          }}>
            {badgeText}
          </span>
          <div style={{ fontSize: 14, color: "#333", marginTop: 10 }}>
            {under ? (
              <><b>{status.slots_remaining}</b> personal slot{status.slots_remaining === 1 ? "" : "s"} before 5/24.</>
            ) : (
              <>You&rsquo;re at the limit (0 personal slots remaining).</>
            )}
          </div>
          {!under && status.next_slot_opens && (
            <div style={{ fontSize: 13, color: AMBER, marginTop: 4 }}>
              Your next slot opens <b>{status.next_slot_opens}</b>.
            </div>
          )}
        </div>
      </div>

      {status.contributors.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            style={{ ...ghostBtn, color: ACCENT, borderColor: `${ACCENT}44` }}
            onClick={() => setShowContributors(v => !v)}
          >
            {showContributors ? "Hide" : "Show"} the {status.contributors.length} card{status.contributors.length === 1 ? "" : "s"} counting toward 5/24
          </button>
          {showContributors && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {status.contributors.map((c, i) => (
                <div
                  key={c.id ?? i}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 13, padding: "8px 12px", border: "1px solid #f0f0f0", borderRadius: 8,
                  }}
                >
                  <span style={{ color: "#111", fontWeight: 600 }}>
                    {cardTitle({ issuer: c.issuer ?? "Unknown issuer", product_name: c.product_name ?? null })}
                  </span>
                  <span style={muted}>opened {c.open_date} · counts until {c.falls_off}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ ...muted, marginTop: 16, lineHeight: 1.6 }}>
        5/24 counts personal cards opened in the last 24 months across all issuers. Business cards are excluded
        (they don&rsquo;t report to personal credit). This is an estimate — issuers don&rsquo;t publish their exact rules.
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 3. Import from credit report
// ----------------------------------------------------------------------------

// API response shapes (POST /api/credit-report-import). The route owns this
// contract; we only read it here.
type ImportSuccess = { cards: CardAccountDraft[]; warnings: string[]; tradelinesFound: number; skippedNonCard: number }
type ImportFailure = { error: string; warnings?: string[] }

function ImportSection({ userId, onSaved }: { userId: string | null; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  // Pending review list — null means no review in progress.
  const [review, setReview] = useState<CardAccountDraft[] | null>(null)
  // Bump to force-clear the file input after a successful save/discard.
  const [inputKey, setInputKey] = useState(0)

  function resetTransient() {
    setError(null)
    setWarnings([])
    setReview(null)
  }

  function clearAll() {
    resetTransient()
    setFile(null)
    setInputKey(k => k + 1)
  }

  async function extract(f: File) {
    if (f.size > MAX_IMPORT_BYTES) {
      setReview(null)
      setWarnings([])
      setError("That file is larger than 20 MB. Try a single PDF or a clearer photo.")
      return
    }
    setImporting(true)
    resetTransient()
    try {
      const body = new FormData()
      body.append("file", f)
      const res = await fetch("/api/credit-report-import", { method: "POST", body })
      const data = (await res.json().catch(() => null)) as ImportSuccess | ImportFailure | null
      if (!res.ok || !data) {
        const fail = (data ?? {}) as ImportFailure
        setError(fail.error || "We couldn't read that report. Try a clearer file or add the card manually.")
        setWarnings(Array.isArray(fail.warnings) ? fail.warnings : [])
        return
      }
      const ok = data as ImportSuccess
      setWarnings(Array.isArray(ok.warnings) ? ok.warnings : [])
      if (!ok.cards || ok.cards.length === 0) {
        setError("No usable credit-card accounts with an open date were found. Add the card manually below.")
        return
      }
      setReview(ok.cards)
    } catch {
      setError("Something went wrong uploading that file. Check your connection and try again.")
    } finally {
      setImporting(false)
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setReview(null)
    setError(null)
    setWarnings([])
    if (f) void extract(f) // auto-submit on pick
  }

  function editRow(idx: number, patch: Partial<CardAccountDraft>) {
    setReview(prev => (prev ? prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)) : prev))
  }

  async function saveReviewed() {
    if (!review || review.length === 0 || !userId) return
    setSaving(true)
    try {
      const saved = await insertCardAccounts(userId, review)
      if (saved.length > 0) {
        await onSaved()
        clearAll()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Import from your credit report</h3>
      <div style={{ marginTop: 8, marginBottom: 14 }}>
        <NoticeBox severity="info">
          Upload your credit report (PDF or photo from Credit Karma, annualcreditreport.com, your issuer, etc.).
          We read each card&rsquo;s issuer, product, OPEN DATE, and limit with AI — then YOU review before anything
          is saved. Your file isn&rsquo;t stored, and we never extract account numbers or SSNs.
        </NoticeBox>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          key={inputKey}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={onPick}
          disabled={importing}
          style={{ fontSize: 13, color: "#444" }}
        />
        <button
          style={{ ...secondaryBtn, opacity: importing || !file ? 0.6 : 1, cursor: importing || !file ? "default" : "pointer" }}
          disabled={importing || !file}
          onClick={() => file && void extract(file)}
        >
          {importing ? "Reading your report…" : review ? "Re-extract" : "Extract"}
        </button>
      </div>

      {importing && (
        <div style={{ ...muted, marginTop: 12 }}>Reading your report… this can take a few seconds.</div>
      )}

      {error && (
        <div style={{ marginTop: 12 }}>
          <NoticeBox severity="critical">⛔ {error}</NoticeBox>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {warnings.map((w, i) => (
            <NoticeBox key={i} severity="warn">⚠ {w}</NoticeBox>
          ))}
        </div>
      )}

      {review && review.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...label, color: ACCENT, marginBottom: 8 }}>
            Review {review.length} card{review.length === 1 ? "" : "s"} before saving
          </div>
          <div style={{ ...muted, marginBottom: 12 }}>
            Nothing has been saved yet. Edit anything that looks off, then save. The <b>open date drives 5/24</b> —
            double-check it on every row.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {review.map((d, i) => (
              <ImportReviewRow key={i} draft={d} onChange={patch => editRow(i, patch)} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              disabled={saving}
              onClick={() => void saveReviewed()}
            >
              {saving ? "Saving…" : `Save ${review.length} card${review.length === 1 ? "" : "s"}`}
            </button>
            <button style={ghostBtn} onClick={clearAll} disabled={saving}>Discard</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImportReviewRow({ draft, onChange }: { draft: CardAccountDraft; onChange: (patch: Partial<CardAccountDraft>) => void }) {
  const openInvalid = !ISO_DATE.test(draft.open_date)
  return (
    <div style={{ padding: 16, border: `1px solid ${openInvalid ? `${RED}44` : `${ACCENT}44`}`, borderRadius: 8, background: openInvalid ? "#fef2f2" : "#fafafa" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div>
          <label style={fieldLabel}>Issuer</label>
          <input style={inputStyle} value={draft.issuer} onChange={e => onChange({ issuer: e.target.value })} />
        </div>
        <div>
          <label style={fieldLabel}>Product</label>
          <input style={inputStyle} value={draft.product_name ?? ""} onChange={e => onChange({ product_name: e.target.value || null })} />
        </div>
        <div>
          <label style={fieldLabel}>Type</label>
          <select style={selectStyle} value={draft.card_type} onChange={e => onChange({ card_type: e.target.value as "personal" | "business" })}>
            <option value="personal">Personal (counts toward 5/24)</option>
            <option value="business">Business (excluded)</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Open date</label>
          <input style={{ ...inputStyle, borderColor: openInvalid ? RED : "#e0e0e0" }} type="date" value={draft.open_date} onChange={e => onChange({ open_date: e.target.value })} />
          {openInvalid && <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginTop: 4 }}>Enter the open date — 5/24 needs it.</div>}
        </div>
        <div>
          <label style={fieldLabel}>Credit limit (optional)</label>
          <input style={inputStyle} type="number" value={draft.credit_limit ?? ""} onChange={e => onChange({ credit_limit: num(e.target.value) })} />
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// 5. Add manually
// ----------------------------------------------------------------------------

function emptyDraft(): CardAccountDraft {
  return {
    issuer: "",
    product_name: null,
    card_type: "personal",
    open_date: "",
    closed_date: null,
    credit_limit: null,
    catalog_card_id: null,
    source: "manual",
  }
}

function AddManualSection({ userId, onSaved }: { userId: string | null; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<CardAccountDraft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (patch: Partial<CardAccountDraft>) => setDraft(prev => ({ ...prev, ...patch }))

  function reset() {
    setDraft(emptyDraft())
    setErr(null)
    setOpen(false)
  }

  async function save() {
    if (!userId) return
    if (draft.issuer.trim() === "") { setErr("Enter the issuer."); return }
    if (!ISO_DATE.test(draft.open_date)) { setErr("Enter a valid open date — it drives 5/24."); return }
    setErr(null)
    setSaving(true)
    try {
      const toSave: CardAccountDraft = { ...draft, issuer: draft.issuer.trim(), source: "manual", closed_date: null, catalog_card_id: null }
      const saved = await insertCardAccounts(userId, [toSave])
      if (saved.length > 0) {
        await onSaved()
        reset()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Add a card manually</h3>
        {!open && <button style={secondaryBtn} onClick={() => setOpen(true)}>+ Add card</button>}
      </div>

      {open && (
        <div style={{ marginTop: 14, padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#fafafa" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Issuer</label>
              <input style={inputStyle} value={draft.issuer} placeholder="Chase" onChange={e => set({ issuer: e.target.value })} />
            </div>
            <div>
              <label style={fieldLabel}>Product (optional)</label>
              <input style={inputStyle} value={draft.product_name ?? ""} placeholder="Sapphire Preferred" onChange={e => set({ product_name: e.target.value || null })} />
            </div>
            <div>
              <label style={fieldLabel}>Type</label>
              <select style={selectStyle} value={draft.card_type} onChange={e => set({ card_type: e.target.value as "personal" | "business" })}>
                <option value="personal">Personal (counts toward 5/24)</option>
                <option value="business">Business (excluded)</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Open date</label>
              <input style={inputStyle} type="date" value={draft.open_date} onChange={e => set({ open_date: e.target.value })} />
            </div>
            <div>
              <label style={fieldLabel}>Credit limit (optional)</label>
              <input style={inputStyle} type="number" value={draft.credit_limit ?? ""} onChange={e => set({ credit_limit: num(e.target.value) })} />
            </div>
          </div>
          {err && <div style={{ marginTop: 12 }}><NoticeBox severity="critical">⛔ {err}</NoticeBox></div>}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button
              style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save card"}
            </button>
            <button style={secondaryBtn} onClick={reset} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 4. Inventory list
// ----------------------------------------------------------------------------

function InventoryList({ cards, onDeleted }: { cards: CardAccount[]; onDeleted: () => Promise<void> }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...cards].sort((a, b) => (a.open_date < b.open_date ? 1 : a.open_date > b.open_date ? -1 : 0)),
    [cards],
  )

  async function remove(id: string) {
    setDeletingId(id)
    try {
      const ok = await deleteCardAccount(id)
      if (ok) await onDeleted()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Your card inventory</h3>
      {sorted.length === 0 ? (
        <div style={{ ...muted, marginTop: 8 }}>No cards yet — import a credit report or add one manually.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {sorted.map(c => (
            <div
              key={c.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #f0f0f0", borderRadius: 8, gap: 12, flexWrap: "wrap" }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#111", fontSize: 14 }}>
                  {cardTitle(c)}{" "}
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: c.card_type === "business" ? "#6b7280" : ACCENT,
                    background: c.card_type === "business" ? "#f3f4f6" : "#ecfdf5", borderRadius: 999, padding: "2px 8px", marginLeft: 4,
                  }}>
                    {c.card_type === "business" ? "Business" : "Personal"}
                  </span>
                </div>
                <div style={{ ...muted, marginTop: 2 }}>
                  Opened {c.open_date}
                  {c.closed_date ? ` · closed ${c.closed_date}` : ""}
                  {` · limit ${fmtLimit(c.credit_limit)}`}
                </div>
              </div>
              <button
                style={{ ...ghostBtn, color: RED, opacity: deletingId === c.id ? 0.6 : 1 }}
                disabled={deletingId === c.id}
                onClick={() => void remove(c.id)}
              >
                {deletingId === c.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// 6. Guardrail footer
// ----------------------------------------------------------------------------

function GuardrailFooter() {
  return (
    <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "#f9fafb", border: "1px solid #eee" }}>
      <div style={{ fontSize: 12.5, color: "#777", lineHeight: 1.6 }}>
        <b>Educational tool, not credit or financial advice.</b> 5/24 and approval rules are issuer-controlled and
        change without notice. Estimates only.
      </div>
    </div>
  )
}
