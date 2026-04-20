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
import {
  getOwnedAccounts,
  addOwnedAccount,
  updateOwnedAccount,
  deleteOwnedAccount,
  OwnedAccount,
  OwnedAccountType,
  OWNED_ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
} from "../../../lib/ownedAccounts"
import { getSpendingProfile, SpendingProfile, DEFAULT_SPENDING_PROFILE } from "../../../lib/spendingProfile"
import { getSavingsProfile, type SavingsProfile } from "../../../lib/savingsProfile"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"
import { recommendApyMoves, recommendCards, Recommendation } from "../../../lib/baseRecommendations"
import { runBaseOptimizer, type BaseOpportunity } from "../../../lib/baseOptimizer"

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

const money = (n: number) => `$${Math.round(n).toLocaleString()}`

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
  const [accounts, setAccounts] = useState<OwnedAccount[]>([])
  const [spendProfile, setSpendProfile] = useState<SpendingProfile | null>(null)
  const [savingsProfile, setSavingsProfile] = useState<SavingsProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [cardRows, acctRows, profile, savings] = await Promise.all([
      getOwnedCards(userId),
      getOwnedAccounts(userId),
      getSpendingProfile(userId),
      getSavingsProfile(userId),
    ])
    setCards(cardRows.filter(c => c.status !== "canceled"))
    setAccounts(acctRows)
    setSpendProfile(profile ?? { user_id: userId, ...DEFAULT_SPENDING_PROFILE, updated_at: "" })
    setSavingsProfile(savings)
    setLoading(false)
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleRoleChange(cardId: string, next: RoleOrUnassigned) {
    const role = next === "unassigned" ? null : next
    await updateOwnedCard(cardId, { role })
    await loadData()
  }

  // ─── Chase 5/24 counter ──────────────────────────────────────
  const chase524 = useMemo(() => {
    const windowMonths = 24
    const personalOpens = cards.filter(c => {
      if (!c.opened_date) return false
      const months = monthsAgo(c.opened_date)
      if (months == null || months >= windowMonths) return false
      const catalog = catalogLookup(c.card_name)
      return catalog?.card_type !== "business"
    })
    return personalOpens.length
  }, [cards])

  const cardsByRole = useMemo(() => {
    const groups: Record<RoleOrUnassigned, OwnedCard[]> = {
      "unassigned": [], "sub-in-progress": [], "daily-driver": [],
      "sock-drawer": [], "retention-pending": [], "downgrade-candidate": [],
    }
    for (const c of cards) groups[c.role ?? "unassigned"].push(c)
    return groups
  }, [cards])

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!spendProfile) return []
    const apy = recommendApyMoves(accounts)
    const card = recommendCards(spendProfile.category_spend ?? {}, cards, creditCardBonuses)
    return [...apy, ...card]
  }, [accounts, cards, spendProfile])

  const optimizerOpportunities = useMemo<BaseOpportunity[]>(() => {
    return runBaseOptimizer({
      accounts,
      savingsProfile,
      spendingProfile: spendProfile,
    })
  }, [accounts, savingsProfile, spendProfile])

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
            Your full financial inventory — cards, accounts, balances, issuer standing. Spending is for chasing new bonuses; this is everything you&apos;re holding once the chase is done.
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#999", fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            <SnapshotPanel accounts={accounts} cards={cards} />
            <StandingPanel count524={chase524} />
            <BaseOptimizerPanel opps={optimizerOpportunities} />
            <RecommendationsPanel recs={recommendations} />
            <AccountsPanel accounts={accounts} userId={userId} onChange={loadData} />

            <div style={{ marginTop: 28, marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: 0, letterSpacing: "-0.01em" }}>Card inventory</h2>
            </div>

            {cards.length === 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>No cards tracked yet.</div>
                <a href="/stacksos/spending" style={{ fontSize: 12, color: "#0d7c5f", fontWeight: 700, textDecoration: "none" }}>
                  Add cards in Spending →
                </a>
              </div>
            ) : (
              ROLE_ORDER.map(role => {
                const group = cardsByRole[role]
                if (role !== "unassigned" && group.length === 0) return null
                return (
                  <div key={role} style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: 0, letterSpacing: "-0.01em" }}>
                        {ROLE_LABELS[role]}
                      </h3>
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
                          <InventoryCardRow key={c.id} card={c} onRoleChange={next => handleRoleChange(c.id, next)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Snapshot — totals across accounts and cards
// ─────────────────────────────────────────────────────────────────────────
function SnapshotPanel({ accounts, cards }: { accounts: OwnedAccount[]; cards: OwnedCard[] }) {
  const totalsByType = useMemo(() => {
    const out: Record<OwnedAccountType, number> = { checking: 0, savings: 0, brokerage: 0 }
    for (const a of accounts) out[a.account_type] += a.current_balance
    return out
  }, [accounts])
  const total = totalsByType.checking + totalsByType.savings + totalsByType.brokerage
  const annualAF = useMemo(() => cards.reduce((s, c) => s + (c.annual_fee ?? 0), 0), [cards])

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
        Snapshot
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 11, color: "#999" }}>Net cash + brokerage</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0d7c5f", letterSpacing: "-0.02em" }}>{money(total)}</div>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {(Object.keys(totalsByType) as OwnedAccountType[]).map(type => (
            <div key={type}>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>{ACCOUNT_TYPE_LABELS[type]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: totalsByType[type] > 0 ? "#111" : "#bbb" }}>{money(totalsByType[type])}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Annual card fees</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: annualAF > 0 ? "#d97706" : "#bbb" }}>{money(annualAF)}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Recommendations — APY moves + card acquisitions
// ─────────────────────────────────────────────────────────────────────────
function RecommendationsPanel({ recs }: { recs: Recommendation[] }) {
  if (recs.length === 0) return null
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 12 }}>
        Suggestions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recs.slice(0, 5).map(r => {
          const tone = r.kind === "apy-move" ? "#0d7c5f" : "#2563eb"
          const bg = r.kind === "apy-move" ? "#e6f5f0" : "#eff6ff"
          const label = r.kind === "apy-move" ? "APY MOVE" : "CARD"
          return (
            <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#fafafa", borderRadius: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: tone, background: bg, padding: "3px 8px", borderRadius: 99, letterSpacing: "0.05em", flexShrink: 0, marginTop: 2 }}>
                {label}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{r.detail}</div>
              </div>
              {r.cta && (
                <a href={r.cta.href} target={r.cta.href.startsWith("http") ? "_blank" : undefined} rel="noopener"
                  style={{ fontSize: 11, color: tone, fontWeight: 700, textDecoration: "none", flexShrink: 0, alignSelf: "center" }}>
                  {r.cta.label} →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Standing — Chase 5/24 (extensible to other issuer rules later)
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
// Accounts panel — Savings / Checking / Brokerage CRUD
// ─────────────────────────────────────────────────────────────────────────
function AccountsPanel({ accounts, userId, onChange }: {
  accounts: OwnedAccount[]
  userId: string
  onChange: () => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    institution: "",
    account_type: "savings" as OwnedAccountType,
    nickname: "",
    current_balance: "",
    apy: "",
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState("")
  const [editApy, setEditApy] = useState("")

  async function handleAdd() {
    if (!form.institution.trim()) return
    await addOwnedAccount(userId, {
      institution: form.institution.trim(),
      account_type: form.account_type,
      nickname: form.nickname.trim() || null,
      current_balance: Number(form.current_balance) || 0,
      apy: form.apy ? Number(form.apy) / 100 : null,
    })
    setForm({ institution: "", account_type: "savings", nickname: "", current_balance: "", apy: "" })
    setAdding(false)
    await onChange()
  }

  async function handleSaveEdit(id: string) {
    await updateOwnedAccount(id, {
      current_balance: Number(editBalance) || 0,
      apy: editApy ? Number(editApy) / 100 : null,
    })
    setEditingId(null)
    await onChange()
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this account?")) return
    await deleteOwnedAccount(id)
    await onChange()
  }

  const grouped = useMemo(() => {
    const out: Record<OwnedAccountType, OwnedAccount[]> = { checking: [], savings: [], brokerage: [] }
    for (const a of accounts) out[a.account_type].push(a)
    return out
  }, [accounts])

  const inputStyle: React.CSSProperties = { padding: "7px 10px", fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 6, background: "#fff", color: "#111" }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
          Accounts
        </div>
        <button onClick={() => setAdding(!adding)}
          style={{ fontSize: 11, fontWeight: 700, color: "#0d7c5f", background: "#e6f5f0", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
          {adding ? "Cancel" : "+ Add account"}
        </button>
      </div>

      {adding && (
        <div style={{ background: "#fafafa", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
          <input placeholder="Institution" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} style={inputStyle} />
          <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value as OwnedAccountType })} style={inputStyle}>
            {OWNED_ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
          </select>
          <input placeholder="Nickname (optional)" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Balance ($)" value={form.current_balance} onChange={e => setForm({ ...form, current_balance: e.target.value })} style={inputStyle} />
          <input type="number" step="0.01" placeholder="APY (%)" value={form.apy} onChange={e => setForm({ ...form, apy: e.target.value })} style={inputStyle} />
          <button onClick={handleAdd} disabled={!form.institution.trim()}
            style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, background: form.institution.trim() ? "#0d7c5f" : "#ccc", color: "#fff", border: "none", borderRadius: 6, cursor: form.institution.trim() ? "pointer" : "not-allowed" }}>
            Add
          </button>
        </div>
      )}

      {accounts.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "#bbb", padding: "14px 16px", border: "1px dashed #e8e8e8", borderRadius: 10, textAlign: "center" }}>
          No accounts yet. Add savings, checking, and brokerage to see your full snapshot.
        </div>
      )}

      {OWNED_ACCOUNT_TYPES.map(type => {
        const list = grouped[type]
        if (list.length === 0) return null
        return (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 6 }}>{ACCOUNT_TYPE_LABELS[type]}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map(a => {
                const isEditing = editingId === a.id
                return (
                  <div key={a.id} style={{ background: "#fafafa", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                        {a.institution}
                        {a.nickname && <span style={{ fontWeight: 400, color: "#999", marginLeft: 6 }}>· {a.nickname}</span>}
                      </div>
                    </div>
                    {isEditing ? (
                      <>
                        <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} style={{ ...inputStyle, width: 110 }} placeholder="Balance" />
                        <input type="number" step="0.01" value={editApy} onChange={e => setEditApy(e.target.value)} style={{ ...inputStyle, width: 90 }} placeholder="APY %" />
                        <button onClick={() => handleSaveEdit(a.id)} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#0d7c5f", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ fontSize: 11, color: "#999", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#111", minWidth: 100, textAlign: "right" }}>{money(a.current_balance)}</div>
                        <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, minWidth: 70, textAlign: "right" }}>
                          {a.apy != null ? `${(a.apy * 100).toFixed(2)}% APY` : "—"}
                        </div>
                        <button onClick={() => { setEditingId(a.id); setEditBalance(String(a.current_balance)); setEditApy(a.apy != null ? String(a.apy * 100) : "") }}
                          style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(a.id)}
                          style={{ fontSize: 11, color: "#ccc", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
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

// ─────────────────────────────────────────────────────────────────────────
// Base Optimizer — static "you could earn $X more" list
// ─────────────────────────────────────────────────────────────────────────
function BaseOptimizerPanel({ opps }: { opps: BaseOpportunity[] }) {
  if (opps.length === 0) return null
  const kindColor: Record<BaseOpportunity["kind"], { fg: string; bg: string; label: string }> = {
    "savings-rate":  { fg: "#0d7c5f", bg: "#e6f5f0", label: "SAVINGS" },
    "checking-fee":  { fg: "#d97706", bg: "#fef3c7", label: "FEE" },
    "card-category": { fg: "#2563eb", bg: "#eff6ff", label: "CARD" },
  }
  const totalImpact = opps.reduce((s, o) => s + o.annualImpact, 0)

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Base Optimizer
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
            Static "set and forget" opportunities based on what you already have.
          </div>
        </div>
        {totalImpact > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase" }}>Potential gain</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0d7c5f" }}>
              ${totalImpact.toLocaleString()}/yr
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opps.map(o => {
          const c = kindColor[o.kind]
          return (
            <div key={o.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#fafafa", borderRadius: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: c.fg, background: c.bg, padding: "3px 8px", borderRadius: 99, letterSpacing: "0.05em", flexShrink: 0, marginTop: 2 }}>
                {c.label}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{o.title}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 3, lineHeight: 1.5 }}>{o.detail}</div>
              </div>
              <a href={o.cta.href}
                style={{ fontSize: 11, color: c.fg, fontWeight: 700, textDecoration: "none", flexShrink: 0, alignSelf: "center" }}>
                {o.cta.label} →
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
