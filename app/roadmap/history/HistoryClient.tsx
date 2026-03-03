"use client"

import React, { useEffect, useState, useCallback } from "react"
import { bonuses as allBonuses } from "../../../lib/data/bonuses"
import { getCompletedBonuses, deleteCompletedBonus } from "../../../lib/completedBonuses"
import { fmtShortDate, CompletedBonus } from "../../../lib/churn"

function money(n: number | null | undefined) { return n == null ? "\u2014" : `$${n.toLocaleString()}` }

export default function HistoryClient({ userId }: { userId: string }) {
  const [records, setRecords] = useState<CompletedBonus[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const data = await getCompletedBonuses(userId)
    setRecords(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function handleDelete(recordId: string) {
    setDeleting(recordId)
    await deleteCompletedBonus(recordId)
    setConfirmId(null)
    await loadRecords()
    setDeleting(null)
  }

  const activeRecords = records.filter(r => !r.closed_date)
  const closedRecords = records.filter(r => r.closed_date)
    .sort((a, b) => new Date(b.closed_date!).getTime() - new Date(a.closed_date!).getTime())

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8" }}>
      {/* Top Bar */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 900, margin: "0 auto" }}>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>Stacks OS</span>
        <a href="/roadmap" style={{ fontSize: 13, color: "#555", textDecoration: "none", border: "1px solid #222", borderRadius: 6, padding: "5px 14px" }}>\u2190 Back to dashboard</a>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 80px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Bonus History</h1>
        <p style={{ fontSize: 14, color: "#555", margin: "0 0 32px" }}>
          All your tracked bonuses. You can remove any record here.
        </p>

        {loading && <div style={{ color: "#555", fontSize: 14 }}>Loading...</div>}

        {!loading && records.length === 0 && (
          <div style={{ color: "#555", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
            No bonus records yet. Start a bonus from the <a href="/roadmap" style={{ color: "#34d399", textDecoration: "none" }}>dashboard</a>.
          </div>
        )}

        {/* Active Bonuses */}
        {activeRecords.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 14px" }}>
              In Progress <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>({activeRecords.length})</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeRecords.map(r => {
                const bonus = allBonuses.find(b => b.id === r.bonus_id)
                const isConfirming = confirmId === r.id
                const isDeleting = deleting === r.id
                return (
                  <div key={r.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", background: "#111", borderRadius: 10, border: "1px solid #1a1a1a",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                        {bonus?.bank_name ?? r.bonus_id}
                      </div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                        Opened {fmtShortDate(r.opened_date)}
                        {bonus && <span> \u00b7 {money(bonus.bonus_amount)} bonus</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 2 }}>In progress</div>
                    </div>
                    <div>
                      {isConfirming ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#ef4444" }}>Delete?</span>
                          <button onClick={() => handleDelete(r.id)} disabled={isDeleting}
                            style={{ ...deleteConfirmBtn, opacity: isDeleting ? 0.5 : 1 }}>
                            {isDeleting ? "..." : "Yes"}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={deleteCancelBtn}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} style={deleteBtn}>Remove</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Bonuses */}
        {closedRecords.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: "0 0 14px" }}>
              Completed <span style={{ fontSize: 12, color: "#555", fontWeight: 400 }}>({closedRecords.length})</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {closedRecords.map(r => {
                const bonus = allBonuses.find(b => b.id === r.bonus_id)
                const received = r.actual_amount ?? bonus?.bonus_amount ?? 0
                const isConfirming = confirmId === r.id
                const isDeleting = deleting === r.id
                return (
                  <div key={r.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 18px", background: "#111", borderRadius: 10, border: "1px solid #1a1a1a",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
                            {bonus?.bank_name ?? r.bonus_id}
                          </div>
                          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                            Opened {fmtShortDate(r.opened_date)} \u00b7 Closed {fmtShortDate(r.closed_date!)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", marginLeft: 16 }}>
                          {r.bonus_received ? (
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>{money(received)}</div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#555" }}>No bonus received</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginLeft: 16 }}>
                      {isConfirming ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "#ef4444" }}>Delete?</span>
                          <button onClick={() => handleDelete(r.id)} disabled={isDeleting}
                            style={{ ...deleteConfirmBtn, opacity: isDeleting ? 0.5 : 1 }}>
                            {isDeleting ? "..." : "Yes"}
                          </button>
                          <button onClick={() => setConfirmId(null)} style={deleteCancelBtn}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} style={deleteBtn}>Remove</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const deleteBtn: React.CSSProperties = {
  fontSize: 12, color: "#555", background: "none", border: "1px solid #222",
  borderRadius: 6, padding: "5px 12px", cursor: "pointer",
}
const deleteConfirmBtn: React.CSSProperties = {
  fontSize: 12, color: "#fff", background: "#ef4444", border: "none",
  borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600,
}
const deleteCancelBtn: React.CSSProperties = {
  fontSize: 12, color: "#888", background: "none", border: "1px solid #333",
  borderRadius: 6, padding: "5px 12px", cursor: "pointer",
}
