"use client"

import { useState } from "react"
import { useCatalogUnlock } from "./useCatalogUnlock"
import type { BizBonusRow } from "../../lib/data/bonusCategories"

/**
 * Business-bonus list with a soft email gate. Nationwide offers (anyone can
 * open) render free so the page still ranks; the state-restricted "local &
 * regional" finds — the highest-APY ones, like a credit union paying ~52% —
 * unlock with an email via the shared useCatalogUnlock() hook (one unlock
 * applies across the whole site and lands the lead in `contacts`).
 *
 * Rows are computed on the server from the catalog (toBizBonusRows), so the
 * list stays current automatically as offers change.
 */
export default function BusinessBonusUnlock({
  freeRows,
  gatedRows,
  source = "business_bonuses",
}: {
  freeRows: BizBonusRow[]
  gatedRows: BizBonusRow[]
  source?: string
}) {
  const { unlocked, unlocking, error, unlock } = useCatalogUnlock()
  const [email, setEmail] = useState("")

  const topGatedApy = gatedRows.length ? Math.max(...gatedRows.map(r => r.effApy)) : 0

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await unlock(email, { source })
  }

  return (
    <div>
      <BonusTable rows={freeRows} startRank={1} />

      {gatedRows.length > 0 && !unlocked && (
        <div
          style={{
            marginTop: 16,
            background: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)",
            border: "1px solid #a7f3d0",
            borderRadius: 14,
            padding: "26px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#111", letterSpacing: "-0.01em", marginBottom: 6 }}>
            Unlock {gatedRows.length} more local &amp; regional business bonuses
          </div>
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.55, margin: "0 auto 16px", maxWidth: 480 }}>
            These are state and credit-union offers you won&apos;t find on the big aggregators —
            {topGatedApy >= 30 ? ` including one that works out to about ${topGatedApy}% effective APY.` : " the highest-paying ones on the board."}{" "}
            Drop your email to unlock them all — free, one time.
          </p>
          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 440, margin: "0 auto" }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email address"
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                padding: "12px 14px",
                fontSize: 14,
                border: "1px solid #cbe8da",
                borderRadius: 10,
                background: "#fff",
                color: "#111",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={unlocking}
              style={{
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                background: "#0d7c5f",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: unlocking ? "default" : "pointer",
                opacity: unlocking ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {unlocking ? "Unlocking…" : "Unlock the full list"}
            </button>
          </form>
          {error && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 10 }}>{error}</div>}
          <div style={{ fontSize: 13, color: "#555", marginTop: 12, lineHeight: 1.5, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
            Unlocking also subscribes you to the free weekly bonus newsletter — unsubscribe anytime.
          </div>
        </div>
      )}

      {gatedRows.length > 0 && unlocked && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0d7c5f", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
            Local &amp; regional business bonuses
          </div>
          <BonusTable rows={gatedRows} startRank={freeRows.length + 1} regional />
        </div>
      )}
    </div>
  )
}

function BonusTable({ rows, startRank, regional = false }: { rows: BizBonusRow[]; startRank: number; regional?: boolean }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #f0f0f0", borderRadius: 10, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
        <thead>
          <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
            {["#", "Bank", "Deposit", "Bonus", "Effective APY", "Notes"].map(h => (
              <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 ? "#fafafa" : "#fff", borderBottom: "1px solid #f5f5f5" }}>
              <td style={{ padding: "11px 14px", color: "#aaa", fontWeight: 700 }}>{startRank + i}</td>
              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>
                {r.bank}
                {regional && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#0d7c5f", background: "#e6f5f0", padding: "2px 6px", borderRadius: 99 }}>LOCAL</span>}
              </td>
              <td style={{ padding: "11px 14px", color: "#555" }}>${r.deposit.toLocaleString()}</td>
              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#0d7c5f" }}>${r.bonus.toLocaleString()}</td>
              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111" }}>~{r.effApy}%</td>
              <td style={{ padding: "11px 14px", color: "#777" }}>
                {r.monthlyFee === 0 ? "No monthly fee. " : r.monthlyFee != null ? `$${r.monthlyFee}/mo fee. ` : ""}
                {r.blurb}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
