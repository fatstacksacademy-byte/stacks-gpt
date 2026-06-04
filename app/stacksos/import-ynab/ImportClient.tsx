"use client"

import React, { useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import {
  parseAccountsFromRegisterCsv,
  parseAccountsList,
  type YnabAccount,
  type MatchedAccount,
  type MatchCandidate,
} from "../../../lib/ynabImport"
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

type Row = {
  account: YnabAccount
  match: MatchedAccount
  selected_id: string | "skip"
  opened_date: string
  status: "pending" | "saving" | "saved" | "error"
  error?: string
}

const todayStr = () => new Date().toISOString().split("T")[0]

export default function ImportClient({ userId }: { userId: string }) {
  const [accountsText, setAccountsText] = useState("")
  const [parsedAccounts, setParsedAccounts] = useState<YnabAccount[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [phase, setPhase] = useState<"input" | "matching" | "review" | "committing" | "done">("input")
  const [error, setError] = useState<string | null>(null)

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(text => {
      const fromCsv = parseAccountsFromRegisterCsv(text)
      if (fromCsv.length > 0) {
        setParsedAccounts(fromCsv)
        setAccountsText(fromCsv.map(a => a.raw_name).join("\n"))
      } else {
        const fromLines = parseAccountsList(text)
        setParsedAccounts(fromLines)
        setAccountsText(fromLines.map(a => a.raw_name).join("\n"))
      }
    })
  }

  function parseFromText() {
    const list = parseAccountsList(accountsText)
    setParsedAccounts(list)
  }

  async function runMatch() {
    if (parsedAccounts.length === 0) {
      parseFromText()
    }
    const accounts = parsedAccounts.length > 0 ? parsedAccounts : parseAccountsList(accountsText)
    if (accounts.length === 0) {
      setError("Add at least one account name first.")
      return
    }
    setError(null)
    setPhase("matching")
    try {
      const resp = await fetch("/api/ynab-import/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        setError(j.error ?? `Match failed (${resp.status})`)
        setPhase("input")
        return
      }
      const { matches } = (await resp.json()) as { matches: MatchedAccount[] }
      const initialRows: Row[] = matches.map(m => ({
        account: { raw_name: m.raw_name, account_type: m.account_type, balance: m.balance },
        match: m,
        selected_id: m.top?.catalog_id ?? "skip",
        opened_date: todayStr(),
        status: "pending",
      }))
      setRows(initialRows)
      setPhase("review")
    } catch (e) {
      console.error(e)
      setError("Network error contacting matcher.")
      setPhase("input")
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
        await writeMatch(userId, candidate, r.opened_date)
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>YNAB Account Import</h1>
        <p style={{ color: "#666", marginBottom: 24, lineHeight: 1.5 }}>
          Upload your YNAB Register.csv (or paste account names), let Claude match each one to a catalog entry,
          then confirm opened-on dates and commit. Writes to your existing completed bonuses, owned cards, and savings entries.
        </p>

        {phase === "input" && (
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Option 1: Upload Register.csv</div>
              <input type="file" accept=".csv,text/csv" onChange={onFileSelected} style={{ fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={label}>Option 2: Paste account names (one per line)</div>
              <textarea
                value={accountsText}
                onChange={e => { setAccountsText(e.target.value); setParsedAccounts([]) }}
                rows={10}
                style={{ ...input, fontFamily: "monospace", fontSize: 12 }}
                placeholder={"P- Amex BBC 2 07/2026 0%\nB- Chase Ink Cash 09/26 0%\n..."}
              />
            </div>
            {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
              {parsedAccounts.length > 0
                ? `Parsed ${parsedAccounts.length} account${parsedAccounts.length === 1 ? "" : "s"} from CSV.`
                : `${accountsText.split(/\r?\n/).filter(l => l.trim()).length} lines in paste box.`}
            </div>
            <button style={primary} onClick={runMatch}>Match accounts</button>
          </div>
        )}

        {phase === "matching" && (
          <div style={card}>
            <div style={{ fontSize: 14 }}>Matching… (Claude is reading {parsedAccounts.length || accountsText.split(/\r?\n/).filter(l => l.trim()).length} accounts against the catalog.)</div>
          </div>
        )}

        {(phase === "review" || phase === "committing" || phase === "done") && (
          <>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Review {rows.length} match{rows.length === 1 ? "" : "es"}</h3>
                <div style={{ fontSize: 12, color: "#666" }}>
                  Matched: {rows.filter(r => r.match.top).length} ·
                  Low confidence: {rows.filter(r => r.match.top && r.match.top.confidence < 0.7).length} ·
                  Unmatched: {rows.filter(r => !r.match.top).length}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 1fr 100px", gap: 12, fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
                <div>YNAB name</div><div>Match</div><div>Conf</div><div>Opened</div><div>Status</div>
              </div>

              {rows.map((r, i) => (
                <RowEditor key={i} row={r} onChange={p => updateRow(i, p)} disabled={phase !== "review"} />
              ))}

              {phase === "review" && (
                <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                  <button style={primary} onClick={commitAll}>Commit {rows.filter(r => r.selected_id !== "skip").length} to profile</button>
                  <button style={secondary} onClick={() => { setPhase("input"); setRows([]) }}>Back</button>
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
          </>
        )}
      </div>
    </>
  )
}

function RowEditor({ row, onChange, disabled }: { row: Row; onChange: (p: Partial<Row>) => void; disabled: boolean }) {
  const candidateOptions: { id: string | "skip"; label: string; conf: number }[] = [
    { id: "skip", label: "Skip this account", conf: 0 },
    ...row.match.candidates.map(c => ({ id: c.catalog_id, label: `${c.label}`, conf: c.confidence })),
  ]
  const conf = row.selected_id === "skip"
    ? null
    : row.match.candidates.find(c => c.catalog_id === row.selected_id)?.confidence ?? row.match.top?.confidence ?? null
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 80px 1fr 100px", gap: 12, padding: "10px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13, alignItems: "center" }}>
      <div style={{ color: "#111", fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>{row.account.raw_name}</div>
      <select
        value={row.selected_id}
        onChange={e => onChange({ selected_id: e.target.value })}
        style={{ ...input, padding: "6px 8px", fontSize: 12 }}
        disabled={disabled}
      >
        {candidateOptions.map(o => (
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
      <div style={{ fontSize: 11, color: row.status === "saved" ? "#0d7c5f" : row.status === "error" ? "#dc2626" : row.status === "saving" ? "#2563eb" : "#999" }}>
        {row.status === "saved" ? "✓ saved" : row.status === "error" ? `✗ ${row.error ?? "error"}` : row.status === "saving" ? "saving…" : "pending"}
      </div>
    </div>
  )
}

async function writeMatch(userId: string, candidate: MatchCandidate, openedDate: string): Promise<void> {
  if (candidate.type === "credit_card") {
    const result = await addOwnedCard(userId, {
      card_name: candidate.label,
      opened_date: openedDate,
      status: "active",
      notes: `Imported from YNAB. Catalog id: ${candidate.catalog_id}`,
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
      status: "active",
      notes: "Imported from YNAB",
    })
    if (!result) throw new Error("Insert failed")
    return
  }
  const result = await markBonusAlreadyHad(userId, candidate.catalog_id, {
    opened_date: openedDate,
    closed_date: null,
    bonus_received: false,
    actual_amount: null,
    incomplete_info: false,
  })
  if (!result) throw new Error("Insert failed")
}
