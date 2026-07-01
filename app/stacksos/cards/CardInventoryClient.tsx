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
  updateCardAccount,
  type CardAccount,
} from "../../../lib/cardAccounts"
import type { CardAccountDraft } from "../../../lib/creditReportImport"
import {
  evaluateAllIssuers, VERDICT_RANK,
  type HeldCard, type IssuerEligibility, type Verdict,
} from "../../../lib/issuerRules"
import { getCreditProfile, upsertCreditProfile, type CreditProfile } from "../../../lib/creditProfile"
import { createClient } from "../../../lib/supabase/client"

// ----------------------------------------------------------------------------
// Shared style constants (matching the codebase aesthetic — see DebtClient)
// ----------------------------------------------------------------------------

const cardBox: React.CSSProperties = {
  background: "#161922",
  border: "1px solid #23262e",
  borderRadius: 12,
  padding: 24,
  marginBottom: 16,
}

const label: React.CSSProperties = {
  fontSize: 11, color: "#6b7280", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6,
}

const primaryBtn: React.CSSProperties = {
  background: "#0d9668", color: "#fff", border: "none", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
}

const secondaryBtn: React.CSSProperties = {
  background: "#161922", color: "#9aa1ad", border: "1px solid #2a2e38", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#6b7280", border: "1px solid #23262e", borderRadius: 6,
  padding: "6px 12px", fontSize: 12, cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#0f1219", color: "#ffffff",
  border: "1px solid #2a2e38", borderRadius: 6, width: "100%",
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", fontSize: 13, background: "#0f1219", color: "#ffffff",
  border: "1px solid #2a2e38", borderRadius: 6, width: "100%",
}

const fieldLabel: React.CSSProperties = { fontSize: 11, color: "#9aa1ad", marginBottom: 4, display: "block" }
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 4 }
const muted: React.CSSProperties = { fontSize: 12, color: "#6b7280", lineHeight: 1.5 }

const ACCENT = "#34d399"
const AMBER = "#f59e0b"
const RED = "#f87171"

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
  const bg = severity === "critical" ? "rgba(220,38,38,0.12)" : severity === "warn" ? "#1c160a" : "#0f1219"
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
  const [profile, setProfile] = useState<CreditProfile | null>(null)

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
        const [rows, prof] = await Promise.all([getCardAccounts(uid), getCreditProfile(uid)])
        if (cancelled) return
        setCards(rows)
        setProfile(prof)
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

  async function refreshProfile() {
    if (!userId) return
    setProfile(await getCreditProfile(userId))
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
            {userEmail ? <> Signed in as <b style={{ color: "#cdd2db" }}>{userEmail}</b>.</> : null}
          </div>
        </div>

        <Five24Hero cards={cards} asOf={effectiveAsOf} />

        <ApprovalMatrix cards={cards} profile={profile} asOf={effectiveAsOf} />

        <CreditProfilePanel userId={userId} profile={profile} onSaved={refreshProfile} />

        <ImportSection userId={userId} onSaved={refresh} />

        <AddManualSection userId={userId} onSaved={refresh} />

        <InventoryList cards={cards} onChanged={refresh} />

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
  const badgeBg = under ? "rgba(13,150,104,0.14)" : status.count >= 5 ? "rgba(220,38,38,0.12)" : "#1c160a"
  const badgeText = under
    ? "Under 5/24 — Chase approvals likely"
    : "At 5/24 — most Chase cards will be declined"

  return (
    <div style={{ ...cardBox, borderColor: `${badgeColor}55` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", minWidth: 120 }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: badgeColor, lineHeight: 1 }}>
            {status.count} <span style={{ fontSize: 24, color: "#6b7280", fontWeight: 700 }}>/ 24</span>
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
          <div style={{ fontSize: 14, color: "#cdd2db", marginTop: 10 }}>
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
                    fontSize: 13, padding: "8px 12px", border: "1px solid #23262e", borderRadius: 8,
                  }}
                >
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>
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
          style={{ fontSize: 13, color: "#cdd2db" }}
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
    <div style={{ padding: 16, border: `1px solid ${openInvalid ? `${RED}44` : `${ACCENT}44`}`, borderRadius: 8, background: openInvalid ? "rgba(220,38,38,0.12)" : "#0f1219" }}>
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
          <input style={{ ...inputStyle, borderColor: openInvalid ? RED : "#2a2e38" }} type="date" value={draft.open_date} onChange={e => onChange({ open_date: e.target.value })} />
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
        <div style={{ marginTop: 14, padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#0f1219" }}>
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

function InventoryList({ cards, onChanged }: { cards: CardAccount[]; onChanged: () => Promise<void> }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...cards].sort((a, b) => (a.open_date < b.open_date ? 1 : a.open_date > b.open_date ? -1 : 0)),
    [cards],
  )

  async function remove(id: string) {
    setDeletingId(id)
    try {
      const ok = await deleteCardAccount(id)
      if (ok) await onChanged()
    } finally {
      setDeletingId(null)
    }
  }

  // Tri-state welcome-bonus history: "" unknown / "yes" earned / "no" not earned.
  async function setBonus(id: string, value: string) {
    setSavingId(id)
    try {
      const bonus_earned = value === "yes" ? true : value === "no" ? false : null
      const ok = await updateCardAccount(id, { bonus_earned })
      if (ok) await onChanged()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Your card inventory</h3>
      <div style={{ ...muted, marginTop: 2, marginBottom: 8 }}>
        Marking whether you <b>earned the welcome bonus</b> powers the lifetime-bonus rules (Amex pays each bonus once
        ever; Citi/Chase families lock for 48 months).
      </div>
      {sorted.length === 0 ? (
        <div style={{ ...muted, marginTop: 8 }}>No cards yet — import a credit report or add one manually.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {sorted.map(c => (
            <div
              key={c.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #23262e", borderRadius: 8, gap: 12, flexWrap: "wrap" }}
            >
              <div style={{ minWidth: 180, flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 14 }}>
                  {cardTitle(c)}{" "}
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: c.card_type === "business" ? "#6b7280" : ACCENT,
                    background: c.card_type === "business" ? "#0f1219" : "rgba(13,150,104,0.14)", borderRadius: 999, padding: "2px 8px", marginLeft: 4,
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <label style={{ ...fieldLabel, marginBottom: 2 }}>Welcome bonus</label>
                  <select
                    style={{ ...selectStyle, width: "auto", padding: "5px 8px", fontSize: 12, opacity: savingId === c.id ? 0.6 : 1 }}
                    disabled={savingId === c.id}
                    value={c.bonus_earned === true ? "yes" : c.bonus_earned === false ? "no" : ""}
                    onChange={e => void setBonus(c.id, e.target.value)}
                  >
                    <option value="">Unknown</option>
                    <option value="yes">Earned</option>
                    <option value="no">Not earned</option>
                  </select>
                </div>
                <button
                  style={{ ...ghostBtn, color: RED, opacity: deletingId === c.id ? 0.6 : 1 }}
                  disabled={deletingId === c.id}
                  onClick={() => void remove(c.id)}
                >
                  {deletingId === c.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Approval-odds matrix (lib/issuerRules) — verdict per issuer with reasons
// and a "*" when more info would sharpen it.
// ----------------------------------------------------------------------------

const VERDICT_STYLE: Record<Verdict, { label: string; color: string; bg: string }> = {
  clear: { label: "Clear", color: ACCENT, bg: "rgba(13,150,104,0.14)" },
  caution: { label: "Caution", color: AMBER, bg: "#1c160a" },
  deny: { label: "Auto-deny", color: RED, bg: "rgba(220,38,38,0.12)" },
  unknown: { label: "Unknown", color: "#6b7280", bg: "#0f1219" },
}

function toHeldCards(cards: CardAccount[]): HeldCard[] {
  return cards.map(c => ({
    id: c.id, issuer: c.issuer, product_name: c.product_name, catalog_card_id: c.catalog_card_id,
    card_type: c.card_type, open_date: c.open_date, closed_date: c.closed_date, bonus_earned: c.bonus_earned,
  }))
}

function ApprovalMatrix({ cards, profile, asOf }: { cards: CardAccount[]; profile: CreditProfile | null; asOf: string }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo<IssuerEligibility[]>(
    () =>
      evaluateAllIssuers(toHeldCards(cards), profile, asOf).sort(
        (a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || a.label.localeCompare(b.label),
      ),
    [cards, profile, asOf],
  )

  return (
    <div style={cardBox}>
      <h3 style={sectionTitle}>Approval-odds matrix</h3>
      <div style={{ ...muted, marginTop: 2, marginBottom: 12 }}>
        Your held cards + open dates run against each issuer&rsquo;s application rules. A{" "}
        <b style={{ color: AMBER }}>*</b> means we could sharpen the call with a little more info — tap a row to see what.
      </div>

      {/* legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        {(Object.keys(VERDICT_STYLE) as Verdict[]).map(v => (
          <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#9aa1ad" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: VERDICT_STYLE[v].color, display: "inline-block" }} />
            {VERDICT_STYLE[v].label}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map(row => {
          const vs = VERDICT_STYLE[row.verdict]
          const isOpen = expanded === row.issuer
          const needsMore = row.needsInfo.length > 0
          const topReason = row.reasons[0]
          return (
            <div key={row.issuer} style={{ border: `1px solid ${vs.color}33`, borderRadius: 8, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(isOpen ? null : row.issuer)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  padding: "10px 12px", background: isOpen ? vs.bg : "#161922", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 700, color: "#ffffff", fontSize: 14, minWidth: 150, flexShrink: 0 }}>{row.label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: vs.color, background: vs.bg,
                  border: `1px solid ${vs.color}44`, borderRadius: 999, padding: "3px 10px", flexShrink: 0,
                }}>
                  {vs.label}{needsMore && <sup style={{ color: AMBER, fontWeight: 800, marginLeft: 1 }}>*</sup>}
                </span>
                <span style={{ ...muted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {topReason ? topReason.text : ""}
                </span>
                <span style={{ color: "#6b7280", fontSize: 12, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div style={{ padding: "4px 12px 14px", background: vs.bg }}>
                  {row.nextEligibleDate && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: vs.color, margin: "6px 0 10px" }}>
                      Eligible again ~{row.nextEligibleDate}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {row.reasons.map((r, i) => {
                      const c = r.severity === "deny" ? RED : r.severity === "caution" ? AMBER : "#6b7280"
                      return (
                        <div key={i} style={{ fontSize: 13, color: "#cdd2db", display: "flex", gap: 8 }}>
                          <span style={{ color: c, fontWeight: 700, flexShrink: 0 }}>
                            {r.severity === "deny" ? "⛔" : r.severity === "caution" ? "⚠" : "ℹ"}
                          </span>
                          <span><b style={{ color: c }}>{r.rule}:</b> {r.text}</span>
                        </div>
                      )
                    })}
                  </div>
                  {needsMore && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "#161922", border: `1px dashed ${AMBER}66`, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                        * Add this to sharpen the call
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                        {row.needsInfo.map((n, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: "#cdd2db", lineHeight: 1.45 }}>{n.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ ...muted, marginTop: 14, lineHeight: 1.6 }}>
        Verdicts combine hard issuer velocity rules (5/24, 2/90, 7/12, 1/65…) with your credit profile. We deliberately
        don&rsquo;t fake a precise approval percentage — issuers don&rsquo;t publish odds. Estimates only.
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Credit profile panel — the soft inputs (score / inquiries / utilization /
// income) that feed the matrix and clear the "*".
// ----------------------------------------------------------------------------

function CreditProfilePanel({ userId, profile, onSaved }: { userId: string | null; profile: CreditProfile | null; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Partial<CreditProfile>>({})

  // Sync the editable draft whenever the saved profile loads/changes.
  useEffect(() => {
    setDraft({
      score: profile?.score ?? null,
      hard_inquiries_6mo: profile?.hard_inquiries_6mo ?? null,
      utilization_pct: profile?.utilization_pct ?? null,
      annual_income: profile?.annual_income ?? null,
    })
  }, [profile])

  const filled = [profile?.score, profile?.hard_inquiries_6mo, profile?.utilization_pct, profile?.annual_income]
    .filter(v => v != null).length

  async function save() {
    if (!userId) return
    setSaving(true)
    try {
      await upsertCreditProfile({ user_id: userId, ...draft })
      await onSaved()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const set = (patch: Partial<CreditProfile>) => setDraft(prev => ({ ...prev, ...patch }))

  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ ...sectionTitle, marginBottom: 2 }}>Credit profile</h3>
          <div style={muted}>
            {filled === 0
              ? "Add your score, inquiries, utilization, and income to sharpen every verdict above."
              : `${filled}/4 added — the matrix above uses these to refine each issuer.`}
          </div>
        </div>
        <button style={secondaryBtn} onClick={() => setOpen(o => !o)}>{open ? "Close" : filled === 0 ? "Add details" : "Edit"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 14, padding: 16, border: `1px solid ${ACCENT}44`, borderRadius: 8, background: "#0f1219" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div>
              <label style={fieldLabel}>Credit score</label>
              <input style={inputStyle} type="number" placeholder="740" value={draft.score ?? ""} onChange={e => set({ score: num(e.target.value) })} />
            </div>
            <div>
              <label style={fieldLabel}>Hard inquiries (last 6 mo)</label>
              <input style={inputStyle} type="number" placeholder="2" value={draft.hard_inquiries_6mo ?? ""} onChange={e => set({ hard_inquiries_6mo: num(e.target.value) })} />
            </div>
            <div>
              <label style={fieldLabel}>Utilization %</label>
              <input style={inputStyle} type="number" placeholder="8" value={draft.utilization_pct ?? ""} onChange={e => set({ utilization_pct: num(e.target.value) })} />
            </div>
            <div>
              <label style={fieldLabel}>Annual income ($)</label>
              <input style={inputStyle} type="number" placeholder="85000" value={draft.annual_income ?? ""} onChange={e => set({ annual_income: num(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? "default" : "pointer" }} disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save profile"}
            </button>
            <button style={secondaryBtn} onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
          </div>
          <div style={{ ...muted, marginTop: 10 }}>
            Find these on Credit Karma or your issuer&rsquo;s app. Stored privately to your account — used only to refine the matrix.
          </div>
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
    <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "#0f1219", border: "1px solid #23262e" }}>
      <div style={{ fontSize: 12.5, color: "#9aa1ad", lineHeight: 1.6 }}>
        <b>Educational tool, not credit or financial advice.</b> 5/24 and approval rules are issuer-controlled and
        change without notice. Estimates only.
      </div>
    </div>
  )
}
