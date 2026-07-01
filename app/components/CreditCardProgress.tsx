"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getDeposits,
  addDeposit,
  deleteDeposit,
  type BonusDeposit,
} from "../../lib/deposits"
import GoalProgressBar from "./GoalProgressBar"

/**
 * Spend-progress tracker for a single credit card bonus. Reuses the existing
 * bonus_deposits table (no schema migration) — each logged purchase is stored
 * with bonus_id = the owned_cards row ID.
 *
 * Shown inside CardRow (SpendingClient) when a card is status=active.
 */
export default function CreditCardProgress({
  userId,
  cardId,
  spendRequirement,
  spendDeadline,
  openedDate,
}: {
  userId: string
  cardId: string
  spendRequirement: number | null
  spendDeadline: string | null
  openedDate: string | null
}) {
  const [purchases, setPurchases] = useState<BonusDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [amount, setAmount] = useState<string>("")
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await getDeposits(userId)
    // Filter to this card's purchases only (shared table, keyed by bonus_id)
    setPurchases(all.filter((d) => d.bonus_id === cardId))
    setLoading(false)
  }, [userId, cardId])

  useEffect(() => {
    load()
  }, [load])

  const spentToDate = purchases.reduce((sum, p) => sum + p.amount, 0)
  const pct =
    spendRequirement && spendRequirement > 0
      ? Math.min(100, (spentToDate / spendRequirement) * 100)
      : 0
  const remaining = spendRequirement ? Math.max(0, spendRequirement - spentToDate) : 0

  const daysRemaining = spendDeadline
    ? Math.ceil((new Date(spendDeadline).getTime() - Date.now()) / 86400000)
    : null

  async function handleAdd() {
    const amt = Number(amount.replace(/[^\d.]/g, ""))
    if (!amt || amt <= 0) return
    setSubmitting(true)
    await addDeposit(userId, cardId, amt, date)
    setAmount("")
    setDate(new Date().toISOString().slice(0, 10))
    await load()
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    await deleteDeposit(id)
    await load()
  }

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px dashed #23262e",
      }}
    >
      {/* ── Progress bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: "#9aa1ad", fontWeight: 600 }}>
          Spend progress
          {spendRequirement && (
            <span style={{ fontWeight: 400, color: "#9aa1ad", marginLeft: 6 }}>
              ${spentToDate.toLocaleString()} of ${spendRequirement.toLocaleString()}
            </span>
          )}
        </div>
        {daysRemaining !== null && (
          <div
            style={{
              fontSize: 10,
              color: daysRemaining < 14 ? "#f59e0b" : daysRemaining < 30 ? "#9aa1ad" : "#9aa1ad",
              fontWeight: daysRemaining < 14 ? 600 : 400,
            }}
          >
            {daysRemaining > 0 ? `${daysRemaining}d left` : `${Math.abs(daysRemaining)}d past deadline`}
          </div>
        )}
      </div>
      {spendRequirement && spendRequirement > 0 && (
        <div style={{ marginBottom: 8 }}>
          <GoalProgressBar
            current={spentToDate}
            target={spendRequirement}
            accent="#2563eb"
            label="of spend"
            dark
          />
        </div>
      )}

      {pct >= 100 && spendRequirement && (
        <div
          style={{
            background: "rgba(13,150,104,0.12)",
            color: "#34d399",
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 6,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          ✓ Spend requirement hit — mark this card complete when the bonus posts.
        </div>
      )}

      {remaining > 0 && daysRemaining !== null && daysRemaining > 0 && spendRequirement && (
        <div style={{ fontSize: 11, color: "#9aa1ad", marginBottom: 8 }}>
          ${remaining.toLocaleString()} remaining · ~$
          {Math.ceil(remaining / Math.max(1, daysRemaining)).toLocaleString()}/day to hit it in time
        </div>
      )}

      {/* ── Quick add purchase ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: 11,
          color: "#34d399",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {expanded ? "− Hide purchase log" : "+ Log a purchase"}
        {!expanded && purchases.length > 0 && (
          <span style={{ color: "#6b7280", marginLeft: 6, fontWeight: 400 }}>
            ({purchases.length})
          </span>
        )}
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 80 }}>
              <span
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 12,
                  color: "#9aa1ad",
                }}
              >
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                style={{
                  width: "100%",
                  padding: "6px 8px 6px 20px",
                  fontSize: 12,
                  background: "#0f1219",
                  color: "#fff",
                  border: "1px solid #2a2e38",
                  borderRadius: 6,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <input
              type="date"
              value={date}
              max={openedDate ? undefined : new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: "6px 8px",
                fontSize: 12,
                background: "#0f1219",
                color: "#fff",
                colorScheme: "dark",
                border: "1px solid #2a2e38",
                borderRadius: 6,
                flex: "0 0 auto",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !amount}
              style={{
                fontSize: 11,
                padding: "6px 10px",
                background: "#0d9668",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: submitting || !amount ? "not-allowed" : "pointer",
                opacity: submitting || !amount ? 0.5 : 1,
              }}
            >
              Add
            </button>
          </div>

          {loading ? (
            <div style={{ fontSize: 11, color: "#6b7280" }}>Loading…</div>
          ) : purchases.length === 0 ? (
            <div style={{ fontSize: 11, color: "#6b7280" }}>No purchases logged yet.</div>
          ) : (
            <div style={{ maxHeight: 140, overflowY: "auto" }}>
              {purchases
                .slice()
                .sort((a, b) => b.deposit_date.localeCompare(a.deposit_date))
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      padding: "4px 0",
                      borderBottom: "1px solid #23262e",
                    }}
                  >
                    <div style={{ color: "#9aa1ad" }}>{p.deposit_date}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ color: "#ffffff", fontWeight: 600 }}>
                        ${p.amount.toLocaleString()}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                        }}
                        aria-label="Delete purchase"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
