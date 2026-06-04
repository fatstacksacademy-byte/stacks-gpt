"use client"

import React, { useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import {
  parseDelimited,
  applySchema,
  type ParsedSheet,
  type DetectedSchema,
  type ImportRow,
  type MatchedRow,
  type MatchCandidate,
} from "../../../lib/spreadsheetImport"
import { markBonusAlreadyHad } from "../../../lib/completedBonuses"
import { addOwnedCard } from "../../../lib/ownedCards"
import { addSavingsEntry } from "../../../lib/savingsEntries"

const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: 24, marginBottom: 16,
}
const label: React.CSSProperties = {
  fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
}
const primary: React.CSSProperties = {
  background: "#0d7c5f", color: "#fff", border: "none", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
}
const secondary: React.CSSProperties = {
  background: "#fff", color: "#666", border: "1px solid #e0e0e0", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer",
}
const input: React.CSSProperties = {
  padding: "8px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 6, width: "100%",
}

type Phase = "upload" | "detecting" | "schema_review" | "matching" | "review" | "committing" | "done"

type Row = {
  data: ImportRow
  match: MatchedRow
  selected_id: string | "skip"
  opened_date: string
  closed_date: string
  status: "pending" | "saving" | "saved" | "error"
  error?: string
}

const todayStr = () => new Date().toISOString().split("T")[0]

export default function ImportClient({ userId }: { userId: string }) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [pastedText, setPastedText] = useState("")
  const [schema, setSchema] = useState<DetectedSchema | null>(null)
  const [phase, setPhase] = useState<Phase>("upload")
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(text => {
      const parsed = parseDelimited(text)
      if (parsed.headers.length === 0) {
        setError("Could not read columns from that file. Try a CSV with headers in row 1.")
        return
      }
      setSheet(parsed)
      setPastedText("")
      setError(null)
    })
  }

  function parseFromPaste() {
    const parsed = parseDelimited(pastedText)
    if (parsed.headers.length === 0) {
      setError("Paste needs headers in the first line.")
      return
    }
    setSheet(parsed)
    setError(null)
  }

  async function runDetect() {
    if (!sheet) { setError("Upload or paste a sheet first."); return }
    setPhase("detecting")
    setError(null)
    try {
      const resp = await fetch("/api/import/detect-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: sheet.headers, sample_rows: sheet.rows.slice(0, 5) }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setError(j.error ?? `Schema detect failed (${resp.status})`)
        setPhase("upload")
        return
      }
      const { schema: s } = (await resp.json()) as { schema: DetectedSchema }
      setSchema(s)
      setPhase("schema_review")
    } catch (e) {
      console.error(e)
      setError("Network error contacting schema detector.")
      setPhase("upload")
    }
  }

  async function runMatch() {
    if (!sheet || !schema) return
    if (!schema.account_name_col) {
      setError("Pick which column is the account name.")
      return
    }
    const importRows = applySchema(sheet, schema)
    if (importRows.length === 0) {
      setError("No rows had a non-empty account name.")
      return
    }
    setPhase("matching")
    setError(null)
    try {
      const resp = await fetch("/api/import/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setError(j.error ?? `Match failed (${resp.status})`)
        setPhase("schema_review")
        return
      }
      const { matches } = (await resp.json()) as { matches: MatchedRow[] }
      const initial: Row[] = matches.map(m => ({
        data: { raw_name: m.raw_name, account_type: m.account_type, opened_date: m.opened_date, closed_date: m.closed_date, balance: m.balance, status: m.status, notes: m.notes },
        match: m,
        selected_id: m.top?.catalog_id ?? "skip",
        opened_date: m.opened_date ?? todayStr(),
        closed_date: m.closed_date ?? "",
        status: "pending",
      }))
      setRows(initial)
      setPhase("review")
    } catch (e) {
      console.error(e)
      setError("Network error contacting matcher.")
      setPhase("schema_review")
    }
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  async function commitAll() {
    setPhase("committing")
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (r.selected_id === "skip" || r.status === "saved") continue
      updateRow(i, { status: "saving" })
      const candidate = r.match.candidates.find(c => c.catalog_id === r.selected_id) ?? r.match.top
      if (!candidate) { updateRow(i, { status: "error", error: "No candidate" }); continue }
      try {
        await writeMatch(userId, candidate, r.opened_date, r.closed_date || null)
        updateRow(i, { status: "saved" })
      } catch (e) {
        console.error(e)
        updateRow(i, { status: "error", error: e instanceof Error ? e.message : "Save failed" })
      }
    }
    setPhase("done")
  }

  return (
    <>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 48px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Account Import</h1>
        <p style={{ color: "#666", marginBottom: 24, lineHeight: 1.5 }}>
          Upload a CSV (or paste delimited text) of your accounts. Claude detects which columns mean what,
          matches each account to a catalog entry, then you confirm dates and commit to your profile.
        </p>

        {phase === "upload" && (
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Option 1: Upload CSV / TSV</div>
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={onFileSelected} style={{ fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Option 2: Paste delimited text (headers in first line)</div>
              <textarea
                value={pastedText}
                onChange={e => { setPastedText(e.target.value); setSheet(null) }}
                rows={8}
                style={{ ...input, fontFamily: "monospace", fontSize: 12 }}
                placeholder={"Account,Type,Opened,Balance\nChase Sapphire Preferred,credit card,2024-03-12,-2340\nAlly Savings,savings,2022-09-01,15000"}
              />
              {pastedText && !sheet && (
                <button style={{ ...secondary, marginTop: 8 }} onClick={parseFromPaste}>Parse paste</button>
              )}
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {sheet && (
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                Parsed {sheet.rows.length} row{sheet.rows.length === 1 ? "" : "s"} across {sheet.headers.length} columns.
              </div>
            )}
            <button style={primary} onClick={runDetect} disabled={!sheet}>Detect schema</button>
          </div>
        )}

        {phase === "detecting" && (
          <div style={card}>
            <div style={{ fontSize: 14 }}>Detecting columns…</div>
          </div>
        )}

        {phase === "schema_review" && schema && sheet && (
          <SchemaReview
            sheet={sheet}
            schema={schema}
            onChange={s => setSchema(s)}
            onConfirm={runMatch}
            onBack={() => setPhase("upload")}
            error={error}
          />
        )}

        {phase === "matching" && (
          <div style={card}>
            <div style={{ fontSize: 14 }}>Matching against catalog… (this can take 15-30 seconds for large lists)</div>
          </div>
        )}

        {(phase === "review" || phase === "committing" || phase === "done") && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Review {rows.length} match{rows.length === 1 ? "" : "es"}</h3>
              <div style={{ fontSize: 12, color: "#666" }}>
                Matched: {rows.filter(r => r.match.top).length} ·
                Low confidence: {rows.filter(r => r.match.top && r.match.top.confidence < 0.7).length} ·
                Unmatched: {rows.filter(r => !r.match.top).length}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 60px 100px 100px 90px", gap: 10, fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
              <div>Source name</div><div>Match</div><div>Conf</div><div>Opened</div><div>Closed</div><div>Status</div>
            </div>

            {rows.map((r, i) => (
              <RowEditor key={i} row={r} onChange={p => updateRow(i, p)} disabled={phase !== "review"} />
            ))}

            {phase === "review" && (
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button style={primary} onClick={commitAll}>Commit {rows.filter(r => r.selected_id !== "skip").length} to profile</button>
                <button style={secondary} onClick={() => { setPhase("upload"); setRows([]) }}>Back</button>
              </div>
            )}

            {phase === "done" && (
              <div style={{ marginTop: 16, padding: 16, background: "#f0f9f4", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, color: "#0d7c5f", marginBottom: 4 }}>
                  Done. Saved {rows.filter(r => r.status === "saved").length} of {rows.filter(r => r.selected_id !== "skip").length}.
                </div>
                {rows.filter(r => r.status === "error").length > 0 && (
                  <div style={{ fontSize: 12, color: "#9a3412" }}>
                    {rows.filter(r => r.status === "error").length} failed. See per-row status above.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function SchemaReview({ sheet, schema, onChange, onConfirm, onBack, error }: {
  sheet: ParsedSheet
  schema: DetectedSchema
  onChange: (s: DetectedSchema) => void
  onConfirm: () => void
  onBack: () => void
  error: string | null
}) {
  const fields: { key: keyof DetectedSchema; label: string; required?: boolean }[] = [
    { key: "account_name_col", label: "Account name", required: true },
    { key: "account_type_col", label: "Account type" },
    { key: "opened_date_col", label: "Opened date" },
    { key: "closed_date_col", label: "Closed date" },
    { key: "balance_col", label: "Balance" },
    { key: "status_col", label: "Status" },
    { key: "notes_col", label: "Notes" },
  ]
  const confColor = schema.confidence >= 0.7 ? "#0d7c5f" : schema.confidence >= 0.4 ? "#d97706" : "#dc2626"
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Column mapping</h3>
        <div style={{ fontSize: 12, color: confColor }}>
          Detector confidence: {Math.round(schema.confidence * 100)}%
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
        {fields.map(f => (
          <React.Fragment key={f.key}>
            <div style={{ fontSize: 13, color: "#666", alignSelf: "center" }}>
              {f.label}{f.required ? <span style={{ color: "#dc2626" }}> *</span> : null}
            </div>
            <select
              value={(schema[f.key] as string | null) ?? ""}
              onChange={e => onChange({ ...schema, [f.key]: e.target.value || null })}
              style={input}
            >
              <option value="">— none —</option>
              {sheet.headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={label}>Preview (first 3 rows)</div>
        <div style={{ overflowX: "auto", border: "1px solid #f0f0f0", borderRadius: 6 }}>
          <table style={{ fontSize: 11, borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {sheet.headers.map(h => (
                  <th key={h} style={{ padding: 6, textAlign: "left", background: "#fafafa", borderBottom: "1px solid #f0f0f0", color: Object.values(schema).includes(h) ? "#0d7c5f" : "#666", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.slice(0, 3).map((r, i) => (
                <tr key={i}>
                  {sheet.headers.map(h => (
                    <td key={h} style={{ padding: 6, borderBottom: "1px solid #f5f5f5", color: "#333" }}>{r[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 12 }}>
        <button style={primary} onClick={onConfirm}>Match accounts</button>
        <button style={secondary} onClick={onBack}>Back</button>
      </div>
    </div>
  )
}

function RowEditor({ row, onChange, disabled }: { row: Row; onChange: (p: Partial<Row>) => void; disabled: boolean }) {
  const options: { id: string | "skip"; label: string; conf: number }[] = [
    { id: "skip", label: "Skip this row", conf: 0 },
    ...row.match.candidates.map(c => ({ id: c.catalog_id, label: c.label, conf: c.confidence })),
  ]
  const conf = row.selected_id === "skip"
    ? null
    : row.match.candidates.find(c => c.catalog_id === row.selected_id)?.confidence ?? row.match.top?.confidence ?? null
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 60px 100px 100px 90px", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13, alignItems: "center" }}>
      <div style={{ color: "#111", fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>
        {row.data.raw_name}
        {row.data.account_type && <div style={{ color: "#999", fontSize: 10, fontWeight: 400 }}>{row.data.account_type}</div>}
      </div>
      <select
        value={row.selected_id}
        onChange={e => onChange({ selected_id: e.target.value })}
        style={{ ...input, padding: "6px 8px", fontSize: 12 }}
        disabled={disabled}
      >
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.id === "skip" ? o.label : `${o.label} (${Math.round(o.conf * 100)}%)`}
          </option>
        ))}
      </select>
      <div style={{ fontSize: 12, color: conf == null ? "#999" : conf >= 0.7 ? "#0d7c5f" : "#d97706" }}>
        {conf == null ? "n/a" : `${Math.round(conf * 100)}%`}
      </div>
      <input
        type="date"
        value={row.opened_date}
        onChange={e => onChange({ opened_date: e.target.value })}
        style={{ ...input, padding: "6px 8px", fontSize: 12 }}
        disabled={disabled || row.selected_id === "skip"}
      />
      <input
        type="date"
        value={row.closed_date}
        onChange={e => onChange({ closed_date: e.target.value })}
        style={{ ...input, padding: "6px 8px", fontSize: 12 }}
        disabled={disabled || row.selected_id === "skip"}
      />
      <div style={{ fontSize: 11, color: row.status === "saved" ? "#0d7c5f" : row.status === "error" ? "#dc2626" : row.status === "saving" ? "#2563eb" : "#999" }}>
        {row.status === "saved" ? "✓ saved" : row.status === "error" ? `✗ ${row.error ?? "error"}` : row.status === "saving" ? "saving…" : "pending"}
      </div>
    </div>
  )
}

async function writeMatch(userId: string, candidate: MatchCandidate, openedDate: string, closedDate: string | null): Promise<void> {
  if (candidate.type === "credit_card") {
    const result = await addOwnedCard(userId, {
      card_name: candidate.label,
      opened_date: openedDate,
      status: closedDate ? "completed" : "active",
      notes: `Imported. Catalog id: ${candidate.catalog_id}${closedDate ? ` · closed ${closedDate}` : ""}`,
    })
    if (!result) throw new Error("Insert failed")
    return
  }
  if (candidate.type === "savings") {
    const result = await addSavingsEntry(userId, {
      institution_name: candidate.label,
      bonus_name: candidate.catalog_id,
      bonus_amount: null,
      deposit_required: null,
      holding_period_days: null,
      offer_apy: null,
      promo_apy: null,
      estimated_yield: null,
      expected_total_value: null,
      actual_value: null,
      opened_date: openedDate,
      deadline: null,
      status: closedDate ? "completed" : "active",
      notes: closedDate ? `Imported. Closed ${closedDate}.` : "Imported.",
    })
    if (!result) throw new Error("Insert failed")
    return
  }
  const result = await markBonusAlreadyHad(userId, candidate.catalog_id, {
    opened_date: openedDate,
    closed_date: closedDate,
    bonus_received: !!closedDate,
    actual_amount: null,
    incomplete_info: false,
  })
  if (!result) throw new Error("Insert failed")
}
