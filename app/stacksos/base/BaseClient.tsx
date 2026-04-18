"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import CheckpointNav from "../../components/CheckpointNav"
import {
  getOwnedCards,
  updateOwnedCard,
  OwnedCard,
  OwnedCardRole,
  OWNED_CARD_ROLES,
} from "../../../lib/ownedCards"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"

type RoleOrUnassigned = OwnedCardRole | "unassigned"

const ROLE_LABELS: Record<RoleOrUnassigned, string> = {
  "unassigned": "Unassigned",
  "sub-in-progress": "SUB in progress",
  "daily-driver": "Daily drivers",
  "sock-drawer": "Sock drawer",
  "retention-pending": "Retention pending",
  "downgrade-candidate": "Downgrade candidates",
}

const ROLE_DESCRIPTIONS: Record<RoleOrUnassigned, string> = {
  "unassigned": "Assign a role to see these in your steady-state setup.",
  "sub-in-progress": "Actively working a signup bonus — tracked in Spending.",
  "daily-driver": "Cards you use regularly for category or base earn.",
  "sock-drawer": "Kept open for credit age / limit, rarely swiped.",
  "retention-pending": "Annual fee hits soon — call for a retention offer.",
  "downgrade-candidate": "AF not worth it — downgrade to no-fee version.",
}

const ROLE_COLORS: Record<RoleOrUnassigned, { fg: string; bg: string }> = {
  "unassigned": { fg: "#999", bg: "#f5f5f5" },
  "sub-in-progress": { fg: "#2563eb", bg: "#eff6ff" },
  "daily-driver": { fg: "#0d7c5f", bg: "#e6f5f0" },
  "sock-drawer": { fg: "#6b7280", bg: "#f3f4f6" },
  "retention-pending": { fg: "#d97706", bg: "#fef3c7" },
  "downgrade-candidate": { fg: "#7c3aed", bg: "#ede9fe" },
}

const ROLE_ORDER: RoleOrUnassigned[] = [
  "unassigned",
  "sub-in-progress",
  "daily-driver",
  "sock-drawer",
  "retention-pending",
  "downgrade-candidate",
]

function monthsAgo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const then = new Date(dateStr + "T00:00:00")
  const now = new Date()
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
}

function catalogLookup(name: string) {
  const needle = name.trim().toLowerCase()
  return creditCardBonuses.find(c => c.card_name.toLowerCase() === needle)
    ?? creditCardBonuses.find(c => c.card_name.toLowerCase().includes(needle) || needle.includes(c.card_name.toLowerCase()))
    ?? null
}

export default function BaseClient({ userEmail, userId }: { userEmail: string; userId: string }) {
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const rows = await getOwnedCards(userId)
    setCards(rows.filter(c => c.status !== "canceled"))
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleRoleChange(cardId: string, next: RoleOrUnassigned) {
    const role = next === "unassigned" ? null : next
    await updateOwnedCard(cardId, { role })
    await loadData()
  }

  // ─── Chase 5/24 counter ──────────────────────────────────────
  // Counts personal cards from any issuer opened in the last 24 months.
  // Business cards (Chase Ink, Amex biz) typically don't count toward 5/24.
  const chase524 = useMemo(() => {
    const windowMonths = 24
    const personalOpens = cards.filter(c => {
      if (!c.opened_date) return false
      const months = monthsAgo(c.opened_date)
      if (months == null || months >= windowMonths) return false
      const catalog = catalogLookup(c.card_name)
      // If we can't look it up, assume personal (conservative — overcounts).
      return catalog?.card_type !== "business"
    })
    return { count: personalOpens.length, opens: personalOpens }
  }, [cards])

  const cardsByRole = useMemo(() => {
    const groups: Record<RoleOrUnassigned, OwnedCard[]> = {
      "unassigned": [],
      "sub-in-progress": [],
      "daily-driver": [],
      "sock-drawer": [],
      "retention-pending": [],
      "downgrade-candidate": [],
    }
    for (const c of cards) {
      const key: RoleOrUnassigned = c.role ?? "unassigned"
      groups[key].push(c)
    }
    return groups
  }, [cards])

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <CheckpointNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            {userEmail}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "4px 0 6px", letterSpacing: "-0.02em" }}>Base</h1>
          <div style={{ fontSize: 13, color: "#666", maxWidth: 680 }}>
            Your standing inventory — cards you own, the role each plays, and your issuer standing. Spending is for chasing new bonuses; this is everything you&apos;re holding once the chase is done.
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#999", fontSize: 13 }}>Loading…</div>
        ) : cards.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#555", fontWeight: 600, marginBottom: 6 }}>No cards tracked yet.</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 14 }}>Add cards in Spending to populate your base.</div>
            <a href="/stacksos/spending" style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>
              Go to Spending →
            </a>
          </div>
        ) : (
          <>
            <StandingPanel count524={chase524.count} />

            {ROLE_ORDER.map(role => {
              const group = cardsByRole[role]
              if (role !== "unassigned" && group.length === 0) return null
              return (
                <div key={role} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0, letterSpacing: "-0.01em" }}>
                      {ROLE_LABELS[role]}
                    </h2>
                    <span style={{ fontSize: 11, color: "#999" }}>{group.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>{ROLE_DESCRIPTIONS[role]}</div>
                  {group.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#bbb", padding: "10px 14px", border: "1px dashed #e8e8e8", borderRadius: 10 }}>
                      Everything has a role — nice.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {group.map(c => (
                        <InventoryCardRow
                          key={c.id}
                          card={c}
                          onRoleChange={next => handleRoleChange(c.id, next)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function StandingPanel({ count524 }: { count524: number }) {
  const tone = count524 < 5 ? "#0d7c5f" : "#dc2626"
  const bg = count524 < 5 ? "#e6f5f0" : "#fee2e2"
  const note = count524 < 5
    ? `${5 - count524} Chase slot${5 - count524 !== 1 ? "s" : ""} open.`
    : "Over 5/24 — Chase personal cards will auto-deny."
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 10 }}>
        Issuer standing
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ background: bg, color: tone, borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 18, minWidth: 60, textAlign: "center" }}>
          {count524} / 5
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>Chase 5/24</div>
          <div style={{ fontSize: 12, color: tone, marginTop: 2 }}>{note}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>Personal cards opened in the last 24 months across all issuers.</div>
        </div>
      </div>
    </div>
  )
}

function InventoryCardRow({ card, onRoleChange }: {
  card: OwnedCard
  onRoleChange: (role: RoleOrUnassigned) => void
}) {
  const role: RoleOrUnassigned = card.role ?? "unassigned"
  const roleColor = ROLE_COLORS[role]
  const opened = card.opened_date ? new Date(card.opened_date + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short" }) : null
  const months = monthsAgo(card.opened_date)

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{card.card_name}</span>
          {card.issuer && <span style={{ fontSize: 11, color: "#999" }}>{card.issuer}</span>}
        </div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {opened && <span>Opened {opened}{months != null ? ` · ${months}mo` : ""}</span>}
          {(card.annual_fee ?? 0) > 0 && <span>AF ${card.annual_fee}</span>}
        </div>
      </div>
      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 700, color: roleColor.fg, background: roleColor.bg, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {ROLE_LABELS[role]}
      </span>
      <select
        value={role}
        onChange={e => onRoleChange(e.target.value as RoleOrUnassigned)}
        style={{ padding: "6px 10px", fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", color: "#111", cursor: "pointer" }}
      >
        <option value="unassigned">Unassigned</option>
        {OWNED_CARD_ROLES.map(r => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
    </div>
  )
}
